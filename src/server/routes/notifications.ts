import { Router } from 'express';
import knex from '../db/knex.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [dueTasks, upcomingEvents] = await Promise.all([
      knex('tasks')
        .where('family_id', fid)
        .whereNot('status', 'done')
        .whereNotNull('due_date')
        .where('due_date', '<=', today)
        .orderBy('due_date', 'asc')
        .select('id', 'title', 'due_date', 'status'),
      knex('events')
        .where('family_id', fid)
        .where('start_time', '>=', `${today}T00:00:00`)
        .where('start_time', '<', `${tomorrow}T00:00:00`)
        .orderBy('start_time', 'asc')
        .select('id', 'title', 'start_time', 'event_type'),
    ]);

    res.json({
      today,
      due_tasks: dueTasks,
      upcoming_events: upcomingEvents,
      total: dueTasks.length + upcomingEvents.length,
    });
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;
