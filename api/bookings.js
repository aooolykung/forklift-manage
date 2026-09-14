import { storage, fail } from '../server/shared.js';
import { bookingNotifications, returnNotifications } from '../server/notifications.js';

const actions = new Set(['book', 'book_car', 'return', 'return_car', 'get_booking', 'update_booking', 'get_all_bookings', 'get', 'getAll']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Use POST' });
  let data;
  try { data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ status: 'error', message: 'Invalid JSON' }); }
  if (!data || !actions.has(data.action)) return res.status(400).json({ status: 'error', message: 'Invalid action' });
  try {
    const result = await storage(data);
    if (result.status === 'success' && result.notificationData) {
      if (['book', 'book_car'].includes(data.action)) result.notifications = await bookingNotifications(result.notificationData);
      if (['return', 'return_car'].includes(data.action)) result.notifications = await returnNotifications(result.notificationData);
    }
    delete result.notificationData;
    return res.status(200).json(result);
  } catch (error) { return fail(res, error); }
}
