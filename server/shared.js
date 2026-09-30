import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  createBooking, decideBooking, getBooking, getLatestBookings, importBooking, returnBooking, updateBooking,
} from './supabase.js';

export function env(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function equal(a, b) {
  const x = Buffer.from(a || '');
  const y = Buffer.from(b || '');
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signAction(id, action) {
  return createHmac('sha256', env('APPS_SCRIPT_API_SECRET')).update(`${id}:${action}`).digest('hex');
}

async function sheetsRequest(payload) {
  const response = await fetch(env('SCRIPT_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, apiSecret: env('APPS_SCRIPT_API_SECRET') }),
    signal: AbortSignal.timeout(40000),
  });
  if (!response.ok) throw new Error(`Google Sheets request failed (${response.status})`);
  const result = await response.json();
  if (result.status !== 'success') throw new Error(result.message || 'Google Sheets rejected the request');
  return result;
}

async function mirrorToSheets(payload) {
  try {
    await sheetsRequest(payload);
    return 'synced';
  } catch (error) {
    // Supabase is already committed and remains the source of truth.
    console.error('google_sheets_sync_failed', { action: payload.action, bookingId: payload.bookingId, message: error.message });
    return 'failed';
  }
}

async function importLegacyBooking(bookingId) {
  try {
    const result = await sheetsRequest({ action: 'get_booking', bookingId });
    return result.data ? await importBooking(result.data) : null;
  } catch (error) {
    console.warn('legacy_booking_import_failed', { bookingId, message: error.message });
    return null;
  }
}

async function ensureBooking(bookingId) {
  return await getBooking(bookingId) || importLegacyBooking(bookingId);
}

async function latestBookings() {
  let bookings = await getLatestBookings(5);
  if (bookings.length > 0) return bookings;
  try {
    const legacy = await sheetsRequest({ action: 'get' });
    await Promise.all((legacy.data || []).map(importBooking));
    bookings = await getLatestBookings(5);
  } catch (error) {
    console.warn('legacy_bookings_import_failed', { message: error.message });
  }
  return bookings;
}

function success(booking, extra = {}) {
  return { status: 'success', bookingId: booking.bookingId, data: booking, ...extra };
}

export async function storage(payload) {
  if (['get_all_bookings', 'get', 'getAll'].includes(payload.action)) {
    return { status: 'success', data: await latestBookings(), storage: { primary: 'supabase' } };
  }
  if (payload.action === 'get_booking') {
    const booking = await ensureBooking(payload.bookingId);
    return booking ? success(booking) : { status: 'error', message: 'ไม่พบรายการจอง' };
  }
  if (['book', 'book_car'].includes(payload.action)) {
    const booking = await createBooking(payload);
    const sheets = await mirrorToSheets({ ...payload, bookingId: booking.bookingId });
    return success(booking, { notificationData: booking, storage: { primary: 'supabase', googleSheets: sheets } });
  }
  if (payload.action === 'update_booking') {
    if (!await ensureBooking(payload.bookingId)) return { status: 'error', message: 'ไม่พบรายการจอง' };
    const booking = await updateBooking(payload);
    if (!booking) return { status: 'error', message: 'ไม่พบรายการจอง' };
    const sheets = await mirrorToSheets(payload);
    return success(booking, { storage: { primary: 'supabase', googleSheets: sheets } });
  }
  if (['return', 'return_car'].includes(payload.action)) {
    if (!await ensureBooking(payload.bookingId)) return { status: 'error', message: 'ไม่พบรายการจอง' };
    const booking = await returnBooking(payload);
    if (!booking) return { status: 'error', message: 'ไม่พบรายการจอง' };
    const sheets = await mirrorToSheets(payload);
    return success(booking, { notificationData: booking, storage: { primary: 'supabase', googleSheets: sheets } });
  }
  if (payload.action === 'booking_action') {
    if (!['approve', 'reject'].includes(payload.decision)) return { status: 'error', message: 'Invalid decision' };
    if (!await ensureBooking(payload.bookingId)) return { status: 'error', message: 'ไม่พบรายการจอง' };
    const { booking, changed } = await decideBooking(payload.bookingId, payload.decision);
    if (!booking) return { status: 'error', message: 'ไม่พบรายการจอง' };
    const sheets = changed ? await mirrorToSheets(payload) : 'not_needed';
    return success(booking, {
      changed,
      notificationData: changed ? {
        bookingId: booking.bookingId,
        driverName: booking.driverName,
        purpose: booking.purpose,
        statusText: booking.status,
      } : undefined,
      storage: { primary: 'supabase', googleSheets: sheets },
    });
  }
  return { status: 'error', message: 'Unknown action' };
}

export function fail(res, error) {
  console.error('api_error', error.message);
  return res.status(500).json({ status: 'error', message: 'ระบบไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่าและ logs' });
}
