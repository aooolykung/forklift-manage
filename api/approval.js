import { equal, signAction, fail } from '../server/shared.js';
import { decide } from '../server/notifications.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  const { id, action, signature } = req.query;
  if (typeof id !== 'string' || !/^BK-\d{6}$/.test(id) || !['approve', 'reject'].includes(action) || typeof signature !== 'string') return res.status(400).send('Invalid link');
  try {
    if (!equal(signAction(id, action), signature)) return res.status(403).send('Invalid signature');
    const label = action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ';
    // GET แสดงหน้ายืนยัน ป้องกัน link preview เปลี่ยนสถานะเอง
    if (req.method === 'GET') return res.status(200).send(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ยืนยันการจอง</title><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>${label} ${id}</h1><form method="post"><button style="padding:16px;font-size:20px">ยืนยัน${label}</button></form></body></html>`);
    const result = await decide(id, action);
    return res.status(result.status === 'success' ? 200 : 400).send(result.status === 'success' ? (result.changed ? `บันทึก${label} ${id} สำเร็จ` : 'รายการนี้ได้รับการดำเนินการแล้ว') : 'ไม่พบรายการจอง');
  } catch (error) { return fail(res, error); }
}
