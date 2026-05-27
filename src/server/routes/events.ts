import { Router } from 'express';
import { z } from 'zod';
import knex from '../db/knex.js';

const router = Router();

const eventCreateSchema = z.object({
  family_id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional().nullable(),
  all_day: z.boolean().optional().default(false),
  location: z.string().max(200).optional().nullable(),
  event_type: z.enum(['personal', 'family', 'task', 'meal', 'other']).optional().default('family'),
  color: z.string().max(20).optional().default('#3B82F6'),
  member_id: z.number().int().positive().optional().nullable(),
  task_id: z.number().int().positive().optional().nullable(),
  recurrence_rule: z.string().max(100).optional().nullable(),
});

const eventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional().nullable(),
  all_day: z.boolean().optional(),
  location: z.string().max(200).optional().nullable(),
  event_type: z.enum(['personal', 'family', 'task', 'meal', 'other']).optional(),
  color: z.string().max(20).optional().nullable(),
  member_id: z.number().int().positive().optional().nullable(),
  task_id: z.number().int().positive().optional().nullable(),
  recurrence_rule: z.string().max(100).optional().nullable(),
});

// GET /api/v1/events?family_id=1&start=2026-05-01&end=2026-05-31
router.get('/', async (req, res) => {
  try {
    const { family_id, start, end, member_id, event_type } = req.query;

    const fid = Number(family_id);
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required and must be a positive integer' });
    }

    let query = knex('events')
      .leftJoin('members', 'events.member_id', 'members.id')
      .where('events.family_id', fid)
      .select(
        'events.*',
        'members.name as member_name',
        'members.avatar as member_avatar'
      );

    if (start) {
      query = query.where('events.start_time', '>=', start as string);
    }
    if (end) {
      query = query.where('events.start_time', '<=', end as string);
    }
    if (member_id) {
      const mid = Number(member_id);
      if (!isNaN(mid) && mid > 0) {
        query = query.where('events.member_id', mid);
      }
    }
    if (event_type) {
      query = query.where('events.event_type', event_type as string);
    }

    const events = await query.orderBy('events.start_time', 'asc');
    res.json({ events });
  } catch (err) {
    console.error('GET /events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/v1/events
router.post('/', async (req, res) => {
  try {
    const data = eventCreateSchema.parse(req.body);
    const [eventId] = await knex('events').insert(data);
    const event = await knex('events')
      .leftJoin('members', 'events.member_id', 'members.id')
      .where('events.id', eventId)
      .select('events.*', 'members.name as member_name', 'members.avatar as member_avatar')
      .first();
    res.status(201).json(event);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('POST /events error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/v1/events/:id
router.put('/:id', async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    const data = eventUpdateSchema.parse(req.body);

    const event = await knex('events').where('id', eventId).first();
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await knex('events').where('id', eventId).update({
      ...data,
      updated_at: knex.fn.now(),
    });

    const updated = await knex('events')
      .leftJoin('members', 'events.member_id', 'members.id')
      .where('events.id', eventId)
      .select('events.*', 'members.name as member_name', 'members.avatar as member_avatar')
      .first();

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('PUT /events/:id error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/v1/events/:id
router.delete('/:id', async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await knex('events').where('id', eventId).first();
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await knex('events').where('id', eventId).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /events/:id error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
