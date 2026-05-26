import { Router } from 'express';
import { z } from 'zod';
import knex from '../db/knex.js';

const router = Router();

// Validation schemas
const taskCreateSchema = z.object({
  family_id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().datetime().optional().nullable(),
  assignee_ids: z.array(z.number().int().positive()).optional(),
  points: z.number().int().min(1).max(100).optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().datetime().optional().nullable(),
  assignee_ids: z.array(z.number().int().positive()).optional(),
  points: z.number().int().min(1).max(100).optional(),
});

// Helper: build task with assignees
async function getTaskWithAssignees(taskId: number) {
  const task = await knex('tasks').where('id', taskId).first();
  if (!task) return null;

  const assignees = await knex('task_assignees')
    .join('members', 'task_assignees.member_id', 'members.id')
    .where('task_assignees.task_id', taskId)
    .select('members.id', 'members.name', 'members.avatar', 'members.color');

  return { ...task, assignees };
}

// GET /api/v1/tasks?family_id=1&status=todo
router.get('/', async (req, res) => {
  try {
    const { family_id, status, priority } = req.query;

    const fid = Number(family_id);
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required and must be a positive integer' });
    }

    let query = knex('tasks')
      .where('family_id', fid);

    if (status) query = query.where('status', status as string);
    if (priority) query = query.where('priority', priority as string);

    const tasks = await query
      .orderBy([
        { column: 'status', order: 'asc' },
        { column: 'priority', order: 'desc' },
        { column: 'due_date', order: 'asc' },
      ]);

    // Load assignees for each task
    const taskIds = tasks.map((t: any) => t.id);
    const assignees = await knex('task_assignees')
      .join('members', 'task_assignees.member_id', 'members.id')
      .whereIn('task_assignees.task_id', taskIds)
      .select('task_assignees.task_id', 'members.id', 'members.name', 'members.avatar');

    const assigneeMap = new Map();
    for (const a of assignees) {
      if (!assigneeMap.has(a.task_id)) assigneeMap.set(a.task_id, []);
      assigneeMap.get(a.task_id).push({ id: a.id, name: a.name, avatar: a.avatar });
    }

    const tasksWithAssignees = tasks.map((t: any) => ({
      ...t,
      assignees: assigneeMap.get(t.id) || [],
    }));

    res.json({ tasks: tasksWithAssignees });
  } catch (err) {
    console.error('GET /tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/v1/tasks
router.post('/', async (req, res) => {
  try {
    const data = taskCreateSchema.parse(req.body);
    const { assignee_ids, ...taskData } = data;

    const [taskId] = await knex('tasks').insert({
      ...taskData,
      created_by: (req.session as any)?.userId || null,
    });

    // Insert assignees
    if (assignee_ids && assignee_ids.length > 0) {
      await knex('task_assignees').insert(
        assignee_ids.map((memberId) => ({
          task_id: taskId,
          member_id: memberId,
        }))
      );
    }

    const task = await getTaskWithAssignees(taskId);
    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('POST /tasks error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/v1/tasks/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const statusSchema = z.object({ status: z.enum(['todo', 'doing', 'done']) });
    const { status } = statusSchema.parse(req.body);

    const task = await knex('tasks').where('id', taskId).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If marking as done, record points atomically
    if (status === 'done' && task.status !== 'done') {
      await knex.transaction(async (trx) => {
        // Re-check status inside transaction to prevent race condition
        const currentTask = await trx('tasks').where('id', taskId).first();
        if (currentTask.status === 'done') {
          return; // Already done, another request beat us
        }

        const assignees = await trx('task_assignees')
          .where('task_id', taskId)
          .select('member_id');

        for (const { member_id } of assignees) {
          await trx('chore_logs').insert({
            task_id: taskId,
            member_id,
            points_earned: task.points,
          });
        }

        await trx('tasks')
          .where('id', taskId)
          .update({ status, updated_at: knex.fn.now() });
      });
    } else {
      await knex('tasks')
        .where('id', taskId)
        .update({ status, updated_at: knex.fn.now() });
    }

    const updated = await getTaskWithAssignees(taskId);
    res.json(updated);
  } catch (err) {
    console.error('PATCH /tasks/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// PUT /api/v1/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    const data = taskUpdateSchema.parse(req.body);
    const { assignee_ids, ...taskData } = data;

    const task = await knex('tasks').where('id', taskId).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await knex('tasks')
      .where('id', taskId)
      .update({ ...taskData, updated_at: knex.fn.now() });

    // Update assignees if provided
    if (assignee_ids !== undefined) {
      await knex('task_assignees').where('task_id', taskId).delete();
      if (assignee_ids.length > 0) {
        await knex('task_assignees').insert(
          assignee_ids.map((memberId) => ({
            task_id: taskId,
            member_id: memberId,
          }))
        );
      }
    }

    const updated = await getTaskWithAssignees(taskId);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('PUT /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = await knex('tasks').where('id', taskId).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await knex('tasks').where('id', taskId).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// GET /api/v1/tasks/leaderboard?family_id=1
router.get('/leaderboard', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    if (!req.query.family_id || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required and must be a positive integer' });
    }

    const leaderboard = await knex('chore_logs')
      .join('members', 'chore_logs.member_id', 'members.id')
      .where('members.family_id', fid)
      .select(
        'members.id',
        'members.name',
        'members.avatar',
        knex.raw('SUM(chore_logs.points_earned) as total_points'),
        knex.raw('COUNT(DISTINCT chore_logs.task_id) as tasks_completed')
      )
      .groupBy('members.id', 'members.name', 'members.avatar')
      .orderBy('total_points', 'desc');

    res.json({ leaderboard });
  } catch (err) {
    console.error('GET /tasks/leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
