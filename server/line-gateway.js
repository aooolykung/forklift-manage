import { env } from './shared.js';

function createGatewayRequest(message) {
  return {
    url: `${env('LINE_GATEWAY_URL').replace(/\/+$/, '')}/send`,
    headers: {
      Authorization: `Bearer ${env('LINE_GATEWAY_API_KEY')}`,
    },
    payload: JSON.stringify({
      target: 'engineering',
      message,
    }),
  };
}

export function createGatewayActionRequest(bookingId, driverName, purpose, statusText) {
  const message = [
    'อัปเดตสถานะการจอง forklift',
    `รหัสจอง: ${bookingId}`,
    `ผู้จอง: ${driverName}`,
    `วัตถุประสงค์: ${purpose}`,
    `สถานะ: ${statusText}`,
  ].join('\n');

  return createGatewayRequest(message);
}

export function createGatewayBookingRequest(bookingData) {
  const message = [
    'รายการยืมรถ forklift',
    `รหัสรายการ: ${bookingData.bookingId}`,
    `ผู้ยืม: ${bookingData.driverName}`,
    `วัตถุประสงค์: ${bookingData.purpose}`,
    `เริ่ม: ${bookingData.startDatetime}`,
    `สิ้นสุด: ${bookingData.endDatetime}`,
  ].join('\n');

  return createGatewayRequest(message);
}

export function createGatewayReturnRequest(returnData) {
  const message = [
    '🚗 แจ้งคืนรถสำเร็จ',
    '',
    `รหัสจอง: ${returnData.bookingId}`,
    `ผู้จอง: ${returnData.driverName}`,
    `วัตถุประสงค์: ${returnData.purpose}`,
    `เวลาคืน: ${returnData.returnDatetime}`,
    '-------------------------',
    '',
    `⏱️ ชม. ก่อน/หลัง: ${returnData.hoursBefore} / ${returnData.hoursAfter}`,
    `🔋 แบต ก่อน/หลัง: ${returnData.batteryBefore}% / ${returnData.batteryAfter}%`,
    'สถานะ: คืนรถแล้ว',
  ].join('\n');

  return createGatewayRequest(message);
}
