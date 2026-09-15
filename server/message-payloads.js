import { env } from "./shared.js";

function createDiscordBookingRequest(bookingData, approveUrl, rejectUrl) {
  var payload = {
    "username": "ระบบจองรถ",
    "avatar_url": "https://cdn-icons-png.flaticon.com/512/3204/3204121.png",
    "embeds": [{
      "title": "📝 ขออนุมัติใช้รถ",
      "color": 16761095, 
      "description": "**รหัสจอง:** " + bookingData.bookingId + "\n" +
                     "**ผู้จอง:** " + bookingData.driverName + "\n" +
                     "**เลขที่ใบอนุญาต:** " + bookingData.licenseNo + "\n" +
                     "**วัตถุประสงค์:** " + bookingData.purpose + "\n" +
                     "**เริ่ม:** " + bookingData.startDatetime + "\n" +
                     "**สิ้นสุด:** " + bookingData.endDatetime + "\n\n" +
                     "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                     "🟢 **[ อนุมัติ ](" + approveUrl + ")**      |      🔴 **[ ไม่อนุมัติ ](" + rejectUrl + ")**"
    }]
  };

  return {
    "url": env("DISCORD_WEBHOOK_URL"),
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
}

function createLineBookingRequest(bookingData) {
  var payload = {
    "to": env("LINE_ADMIN_ID"),
    "messages": [
      {
        "type": "flex",
        "altText": "มีการจองรถใหม่ รอการอนุมัติ (Booking: " + bookingData.bookingId + ")",
        "contents": {
          "type": "bubble",
          "header": {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#FFC107",
            "contents": [
              { "type": "text", "text": "📝 ขออนุมัติใช้รถ", "weight": "bold", "color": "#FFFFFF", "size": "xl" }
            ]
          },
          "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              { "type": "text", "text": "รหัสจอง: " + bookingData.bookingId, "weight": "bold" },
              { "type": "text", "text": "ผู้จอง: " + bookingData.driverName },
              { "type": "text", "text": "เลขที่ใบอนุญาต: " + bookingData.licenseNo },
              { "type": "text", "text": "วัตถุประสงค์: " + bookingData.purpose },
              { "type": "text", "text": "เริ่ม: " + bookingData.startDatetime, "size": "sm", "color": "#666666", "wrap": true },
              { "type": "text", "text": "สิ้นสุด: " + bookingData.endDatetime, "size": "sm", "color": "#666666", "wrap": true }
            ]
          },
          "footer": {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "color": "#28a745",
                "action": { "type": "postback", "label": "อนุมัติ", "data": "action=approve&id=" + bookingData.bookingId }
              },
              {
                "type": "button",
                "style": "primary",
                "color": "#dc3545",
                "action": { "type": "postback", "label": "ไม่อนุมัติ", "data": "action=reject&id=" + bookingData.bookingId }
              }
            ]
          }
        }
      }
    ]
  };

  return {
    "url": "https://api.line.me/v2/bot/message/push",
    "method": "post",
    "headers": { "Authorization": "Bearer " + env("LINE_ACCESS_TOKEN") },
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
}

function createLineReturnRequest(returnData) {
  var messageText = "🚗 แจ้งคืนรถสำเร็จ\n\n" +
                    "รหัสจอง: " + returnData.bookingId + "\n" +
                    "ผู้จอง: " + returnData.driverName + "\n" +
                    "วัตถุประสงค์: " + returnData.purpose + "\n" +
                    "เวลาคืน: " + returnData.returnDatetime + "\n" +
                    "--------------------\n" +
                    "⏱️ ชม. ก่อน/หลัง: " + returnData.hoursBefore + " / " + returnData.hoursAfter + "\n" +
                    "🔋 แบต ก่อน/หลัง: " + returnData.batteryBefore + " % "+" / " + returnData.batteryAfter + " %"+"\n" +
                    "สถานะ: คืนรถแล้ว";

  var payload = {
    "to": env("LINE_ADMIN_ID"),
    "messages": [{ "type": "text", "text": messageText }]
  };

  return {
    "url": "https://api.line.me/v2/bot/message/push",
    "method": "post",
    "headers": { "Authorization": "Bearer " + env("LINE_ACCESS_TOKEN") },
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
}

function createDiscordReturnRequest(returnData) {
  var payload = {
    "username": "ระบบคืนรถ",
    "embeds": [{
      "title": "🚗 แจ้งคืนรถสำเร็จ",
      "color": 3066993, // สีฟ้า/น้ำเงิน
      "description": "**รหัสจอง:** " + returnData.bookingId + "\n" +
                     "**ผู้จอง:** " + returnData.driverName + "\n" +
                     "**วัตถุประสงค์:** " + returnData.purpose + "\n" +
                     "**เวลาคืน:** " + returnData.returnDatetime + "\n\n" +
                     "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                     "⏱️ **ชม. เริ่ม/สิ้นสุด:** " + returnData.hoursBefore + " / " + returnData.hoursAfter + "\n" +
                     "🔋 **แบต เริ่ม/สิ้นสุด:** " + returnData.batteryBefore + " %" + " / " + returnData.batteryAfter + " %" + "\n" +
                     "**สถานะปัจจุบัน:** **คืนรถแล้ว**"
    }]
  };

  return {
    "url": env("DISCORD_WEBHOOK_URL"),
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
}

function createLineReplyRequest(replyToken, bookingId, driverName, purpose, statusText) {
  var messageText = "📢 อัปเดตสถานะการจองรถ\n\n" +
                    "รหัสจอง: " + bookingId + "\n" +
                    "ผู้จอง: " + driverName + "\n" +
                    "วัตถุประสงค์: " + purpose + "\n" +
                    "สถานะ: " + statusText;

  var payload = {
    "replyToken": replyToken,
    "messages": [{ "type": "text", "text": messageText }]
  };

  return {
    "url": "https://api.line.me/v2/bot/message/reply",
    "method": "post",
    "headers": { "Authorization": "Bearer " + env("LINE_ACCESS_TOKEN") },
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
}

function createDiscordActionRequest(bookingId, driverName, purpose, statusText) {
  var color = (statusText === "อนุมัติ") ? 2899536 : 15158332; 
  var payload = {
    "username": "ระบบแจ้งผลการอนุมัติ",
    "embeds": [{
      "title": "📢 อัปเดตสถานะการจองรถ: " + statusText,
      "color": color,
      "description": "**รหัสจอง:** " + bookingId + "\n" +
                     "**ผู้จอง:** " + driverName + "\n" +
                     "**วัตถุประสงค์:** " + purpose + "\n" +
                     "**สถานะปัจจุบัน:** **" + statusText + "**"
    }]
  };

  return {
    "url": env("DISCORD_WEBHOOK_URL"),
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
}

function createLineActionRequest(bookingId, driverName, purpose, statusText) {
  var messageText = "📢 อัปเดตสถานะการจองรถ\n\n" +
                    "รหัสจอง: " + bookingId + "\n" +
                    "ผู้จอง: " + driverName + "\n" +
                    "วัตถุประสงค์: " + purpose + "\n" +
                    "สถานะ: " + statusText;

  var payload = {
    "to": env("LINE_ADMIN_ID"),
    "messages": [{ "type": "text", "text": messageText }]
  };

  return {
    "url": "https://api.line.me/v2/bot/message/push",
    "method": "post",
    "headers": { "Authorization": "Bearer " + env("LINE_ACCESS_TOKEN") },
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
}

export { createDiscordBookingRequest, createLineBookingRequest, createLineReturnRequest, createDiscordReturnRequest, createLineReplyRequest, createDiscordActionRequest, createLineActionRequest };
