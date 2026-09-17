import * as payloads from './message-payloads.js';
import {
  createGatewayActionRequest,
  createGatewayBookingRequest,
  createGatewayReturnRequest,
} from './line-gateway.js';
import { env, signAction, storage } from './shared.js';

export async function send(entries) {
  return Promise.all(entries.map(async ([target, create]) => {
    try {
      const request = create();
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

export async function bookingNotifications(data) {
  const url = action => `${env('APP_URL').replace(/\/$/, '')}/api/approval?id=${encodeURIComponent(data.bookingId)}&action=${action}&signature=${signAction(data.bookingId, action)}`;
  return send([
    ['line_admin', () => payloads.createLineBookingRequest(data)],
    ['line_gateway', () => createGatewayBookingRequest(data)],
    ['discord', () => payloads.createDiscordBookingRequest(data, url('approve'), url('reject'))],
  ]);
}

export async function returnNotifications(data) {
  return send([
    ['line_admin', () => payloads.createLineReturnRequest(data)],
    ['line_gateway', () => createGatewayReturnRequest(data)],
    ['discord', () => payloads.createDiscordReturnRequest(data)],
  ]);
}

export async function decide(bookingId, decision, replyToken) {
  const result = await storage({ action: 'booking_action', bookingId, decision });
  if (result.status === 'success' && result.changed) {
    const { driverName, purpose, statusText } = result.notificationData;
    const notifications = [
      ['discord', () => payloads.createDiscordActionRequest(bookingId, driverName, purpose, statusText)],
      ['line_admin', () => replyToken
        ? payloads.createLineReplyRequest(replyToken, bookingId, driverName, purpose, statusText)
        : payloads.createLineActionRequest(bookingId, driverName, purpose, statusText)],
    ];
    if (decision !== 'approve') {
      notifications.push(['line_gateway', () => createGatewayActionRequest(bookingId, driverName, purpose, statusText)]);
    }
    result.notifications = await send(notifications);
  }
  return result;
}
