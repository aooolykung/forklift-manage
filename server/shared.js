import { createHmac, timingSafeEqual } from 'node:crypto';

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

export async function storage(payload) {
  const response = await fetch(env('SCRIPT_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, apiSecret: env('APPS_SCRIPT_API_SECRET') }),
    signal: AbortSignal.timeout(40000),
  });
  if (!response.ok) throw new Error('Storage request failed');
  return response.json();
}

export function fail(res, error) {
  console.error('api_error', error.message);
  return res.status(500).json({ status: 'error', message: 'ระบบไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่าและ logs' });
}
