import * as payloads from './message-payloads.js';
import { env, signAction, storage } from './shared.js';

export async function send(entries) {
  return Promise.all(entries.map(async ([target, create]) => {
    try {
      const request = create();
      if (target === 'line_forklift_group' && !/^C[0-9a-f]{32}$/i.test(JSON.parse(request.payload).to)) {
        throw new Error('Invalid LINE_FORKLIFT_GROUP_ID');
      }
      const response = await fetch(request.url, {
        method: 'POST', headers: { ...request.headers, 'Content-Type': 'application/json' },
        body: request.payload, signal: AbortSignal.timeout(10000),
      });
      console.log('notification_result', { target, statusCode: response.status, requestId: response.headers.get('x-line-request-id') });
      if (!response.ok) console.error('notification_rejected', { target, body: await response.text() });
      return { target, success: response.ok, statusCode: response.status };
    } catch (error) {
      console.error('notification_error', { target, message: error.message });
      return { target, success: false };
    }
  }));
}

export function bookingNotifications(data) {
  const url = action => `${env('APP_URL').replace(/\/$/, '')}/api/approval?id=${encodeURIComponent(data.bookingId)}&action=${action}&signature=${signAction(data.bookingId, action)}`;
  return send([
    ['line_forklift_group', () => payloads.createLineForkliftBookingRequest(data)],
    ['line_admin', () => payloads.createLineBookingRequest(data)],
    ['discord', () => payloads.createDiscordBookingRequest(data, url('approve'), url('reject'))],
  ]);
}

export function returnNotifications(data) {
  return send([
    ['line_forklift_group', () => payloads.createLineForkliftReturnRequest(data)],
    ['line_admin', () => payloads.createLineReturnRequest(data)],
    ['discord', () => payloads.createDiscordReturnRequest(data)],
  ]);
}

export async function decide(bookingId, decision, replyToken) {
  const result = await storage({ action: 'booking_action', bookingId, decision });
  if (result.status === 'success' && result.changed) {
    const { driverName, purpose, statusText } = result.notificationData;
    result.notifications = await send([
      ['discord', () => payloads.createDiscordActionRequest(bookingId, driverName, purpose, statusText)],
      ['line_admin', () => replyToken
        ? payloads.createLineReplyRequest(replyToken, bookingId, driverName, purpose, statusText)
        : payloads.createLineActionRequest(bookingId, driverName, purpose, statusText)],
    ]);
  }
  return result;
}
