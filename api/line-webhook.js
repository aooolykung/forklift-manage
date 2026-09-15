import { createHmac } from 'node:crypto';
import { env, equal, fail } from '../server/shared.js';
import { decide } from '../server/notifications.js';

export const config = { api: { bodyParser: false } };

function isAuthorizedApprover(event) {
  const targetId = env('LINE_ADMIN_ID');

  // Direct message: the configured target is the approving user.
  if (/^U[0-9a-f]{32}$/i.test(targetId)) {
    return event.source?.userId === targetId;
  }

  // Group message: every member of the configured group can approve.
  if (/^C[0-9a-f]{32}$/i.test(targetId)) {
    return event.source?.type === 'group'
      && event.source.groupId === targetId;
  }

  return false;
}

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
      if (!isAuthorizedApprover(event)) {
        console.warn('line_approval_ignored', {
          sourceType: event.source?.type,
          hasUserId: Boolean(event.source?.userId),
        });
        continue;
      }
      const params = new URLSearchParams(event.postback?.data);
      if (!['approve', 'reject'].includes(params.get('action')) || !/^BK-\d{6}$/.test(params.get('id') || '')) continue;
      const bookingId = params.get('id');
      const decision = params.get('action');
      console.log('line_approval_received', { bookingId, decision, sourceType: event.source?.type });
      const result = await decide(bookingId, decision, event.replyToken);
      console.log('line_approval_result', { bookingId, decision, status: result.status, changed: result.changed });
      if (result.status !== 'success') return res.status(502).end();
    }
    return res.status(200).send('OK');
  } catch (error) { return fail(res, error); }
}
