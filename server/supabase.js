const DEFAULT_TABLE = 'forklift_bookings';
const PENDING_STATUS = 'รออนุมัติ';
const RETURNED_STATUS = 'คืนรถแล้ว';

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  return { url, key, table: process.env.SUPABASE_TABLE?.trim() || DEFAULT_TABLE };
}

function headers(key, prefer) {
  return {
    apikey: key,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
    // Legacy service_role keys are JWTs. New sb_secret keys use apikey only.
    ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
  };
}

async function request(query = '', options = {}) {
  const settings = config();
  const table = encodeURIComponent(settings.table);
  const response = await fetch(`${settings.url}/rest/v1/${table}${query}`, {
    method: options.method || 'GET',
    headers: headers(settings.key, options.prefer),
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  if (response.status === 204) return [];
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function setIfPresent(target, key, value) {
  if (value !== undefined && value !== null && value !== '') target[key] = value;
}

function normalizeDate(value) {
  if (!value || value === '-') return undefined;
  const thaiDisplay = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (thaiDisplay) {
    const [, day, month, year, hour, minute] = thaiDisplay;
    return `${year}-${month}-${day}T${hour}:${minute}:00+07:00`;
  }
  return value;
}

function writeRow(data) {
  const row = { synced_at: new Date().toISOString() };
  setIfPresent(row, 'user_id', data.userId);
  setIfPresent(row, 'driver_name', data.driverName);
  setIfPresent(row, 'phone', data.phone);
  setIfPresent(row, 'license_no', data.licenseNo);
  setIfPresent(row, 'cost_center', data.costCenter);
  setIfPresent(row, 'purpose', data.purpose);
  setIfPresent(row, 'start_datetime', normalizeDate(data.startDatetime));
  setIfPresent(row, 'end_datetime', normalizeDate(data.endDatetime));
  setIfPresent(row, 'return_datetime', normalizeDate(data.returnDatetime));
  setIfPresent(row, 'hours_before', data.hoursBefore);
  setIfPresent(row, 'hours_after', data.hoursAfter);
  setIfPresent(row, 'battery_before', data.batteryBefore);
  setIfPresent(row, 'battery_after', data.batteryAfter);
  return row;
}

function toBooking(row) {
  if (!row) return null;
  return {
    bookingId: row.booking_id,
    timestamp: row.created_at,
    userId: row.user_id,
    driverName: row.driver_name,
    phone: row.phone,
    licenseNo: row.license_no,
    costCenter: row.cost_center,
    purpose: row.purpose,
    startDatetime: row.start_datetime,
    endDatetime: row.end_datetime,
    status: row.status,
    bookingStatus: row.status,
    returnDatetime: row.return_datetime,
    hoursBefore: row.hours_before,
    hoursAfter: row.hours_after,
    batteryBefore: row.battery_before,
    batteryAfter: row.battery_after,
    isReturned: row.is_returned,
  };
}

function byBookingId(bookingId) {
  return `?booking_id=eq.${encodeURIComponent(bookingId)}`;
}

export async function createBooking(data) {
  const rows = await request('?select=*', {
    method: 'POST',
    prefer: 'return=representation',
    body: { ...writeRow(data), status: PENDING_STATUS, is_returned: false },
  });
  return toBooking(rows[0]);
}

export async function importBooking(data) {
  const returned = Boolean(normalizeDate(data.returnDatetime)) || data.status === RETURNED_STATUS;
  const body = {
    ...writeRow(data),
    booking_id: data.bookingId,
    status: data.bookingStatus || data.status || PENDING_STATUS,
    is_returned: returned,
  };
  setIfPresent(body, 'created_at', normalizeDate(data.timestamp));
  const rows = await request('?on_conflict=booking_id&select=*', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body,
  });
  return toBooking(rows[0]);
}

export async function getBooking(bookingId) {
  const rows = await request(`${byBookingId(bookingId)}&select=*&limit=1`);
  return toBooking(rows[0]);
}

export async function getLatestBookings(limit = 5) {
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 50);
  const rows = await request(`?select=*&order=is_returned.asc,start_datetime.desc&limit=${safeLimit}`);
  return rows.map(toBooking);
}

export async function updateBooking(data) {
  const rows = await request(`${byBookingId(data.bookingId)}&select=*`, {
    method: 'PATCH', prefer: 'return=representation', body: writeRow(data),
  });
  return toBooking(rows[0]);
}

export async function returnBooking(data) {
  const rows = await request(`${byBookingId(data.bookingId)}&select=*`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      ...writeRow(data),
      return_datetime: data.returnDatetime || new Date().toISOString(),
      status: RETURNED_STATUS,
      is_returned: true,
    },
  });
  return toBooking(rows[0]);
}

export async function decideBooking(bookingId, decision) {
  const status = decision === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ';
  const query = `${byBookingId(bookingId)}&status=eq.${encodeURIComponent(PENDING_STATUS)}&select=*`;
  const rows = await request(query, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { status, approval_decision: decision, synced_at: new Date().toISOString() },
  });
  if (rows[0]) return { booking: toBooking(rows[0]), changed: true };
  return { booking: await getBooking(bookingId), changed: false };
}
