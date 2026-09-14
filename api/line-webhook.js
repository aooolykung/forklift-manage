import { createHmac } from 'node:crypto';
import { env, equal, fail } from '../server/shared.js';
import { decide } from '../server/notifications.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024 * 1024) return res.status(413).end();
      chunks.push(Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks);
    const signature = createHmac('sha256', env('LINE_CHANNEL_SECRET')).update(raw).digest('base64');
    if (!equal(signature, req.headers['x-line-signature'])) return res.status(401).end();
    let body;
    try { body = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).end(); }
    if (!Array.isArray(body.events)) return res.status(400).end();
    for (const event of body.events) {
      if (event.source?.type === 'group') console.log('line_group', { groupId: event.source.groupId });
      if (event.type !== 'postback') continue;
      // ปุ่มอนุมัติส่งให้ LINE Admin เท่านั้น
      if (event.source?.userId !== env('LINE_ADMIN_ID')) continue;
      const params = new URLSearchParams(event.postback?.data);
      if (!['approve', 'reject'].includes(params.get('action')) || !/^BK-\d{6}$/.test(params.get('id') || '')) continue;
      const result = await decide(params.get('id'), params.get('action'), event.replyToken);
      if (result.status !== 'success') return res.status(502).end();
    }
    return res.status(200).send('OK');
  } catch (error) { return fail(res, error); }
}
