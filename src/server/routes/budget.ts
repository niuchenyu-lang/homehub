import { Router } from 'express';
import { z } from 'zod';
import knex from '../db/knex.js';

const router = Router();

const categoryCreateSchema = z.object({
  family_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  budget_limit: z.number().min(0).default(0),
  color: z.string().max(20).optional().default('#3B82F6'),
  icon: z.string().max(50).optional().nullable(),
});

const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  budget_limit: z.number().min(0).optional(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
});

const expenseCreateSchema = z.object({
  family_id: z.number().int().positive(),
  category_id: z.number().int().positive().optional().nullable(),
  amount: z.number().min(0),
  description: z.string().max(500).optional().nullable(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expense_type: z.enum(['expense', 'income']).optional().default('expense'),
  member_id: z.number().int().positive().optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
});

const expenseUpdateSchema = z.object({
  category_id: z.number().int().positive().optional().nullable(),
  amount: z.number().min(0).optional(),
  description: z.string().max(500).optional().nullable(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expense_type: z.enum(['expense', 'income']).optional(),
  member_id: z.number().int().positive().optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
});

// ─── Categories ───

router.get('/categories', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required' });
    }
    const categories = await knex('budget_categories')
      .where('family_id', fid)
      .orderBy('created_at', 'asc');
    res.json({ categories });
  } catch (err) {
    console.error('GET /budget/categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const data = categoryCreateSchema.parse(req.body);
    const [id] = await knex('budget_categories').insert(data);
    const category = await knex('budget_categories').where('id', id).first();
    res.status(201).json(category);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('POST /budget/categories error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const data = categoryUpdateSchema.parse(req.body);
    const category = await knex('budget_categories').where('id', id).first();
    if (!category) return res.status(404).json({ error: 'Category not found' });
    await knex('budget_categories').where('id', id).update(data);
    res.json(await knex('budget_categories').where('id', id).first());
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('PUT /budget/categories/:id error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const category = await knex('budget_categories').where('id', id).first();
    if (!category) return res.status(404).json({ error: 'Category not found' });
    await knex('budget_categories').where('id', id).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /budget/categories/:id error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ─── Expenses ───

router.get('/expenses', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    const month = req.query.month as string | undefined;
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    let query = knex('expenses')
      .leftJoin('budget_categories', 'expenses.category_id', 'budget_categories.id')
      .leftJoin('members', 'expenses.member_id', 'members.id')
      .where('expenses.family_id', fid)
      .select(
        'expenses.*',
        'budget_categories.name as category_name',
        'budget_categories.color as category_color',
        'members.name as member_name',
        'members.avatar as member_avatar'
      )
      .orderBy('expenses.expense_date', 'desc')
      .orderBy('expenses.created_at', 'desc');

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      query = query.where('expenses.expense_date', 'like', `${month}-%`);
    }

    const expenses = await query;
    res.json({ expenses });
  } catch (err) {
    console.error('GET /budget/expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const data = expenseCreateSchema.parse(req.body);
    const [id] = await knex('expenses').insert(data);
    const expense = await knex('expenses')
      .leftJoin('budget_categories', 'expenses.category_id', 'budget_categories.id')
      .leftJoin('members', 'expenses.member_id', 'members.id')
      .where('expenses.id', id)
      .select('expenses.*', 'budget_categories.name as category_name', 'budget_categories.color as category_color', 'members.name as member_name', 'members.avatar as member_avatar')
      .first();
    res.status(201).json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('POST /budget/expenses error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.put('/expenses/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const data = expenseUpdateSchema.parse(req.body);
    const expense = await knex('expenses').where('id', id).first();
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await knex('expenses').where('id', id).update(data);
    res.json(await knex('expenses')
      .leftJoin('budget_categories', 'expenses.category_id', 'budget_categories.id')
      .leftJoin('members', 'expenses.member_id', 'members.id')
      .where('expenses.id', id)
      .select('expenses.*', 'budget_categories.name as category_name', 'budget_categories.color as category_color', 'members.name as member_name', 'members.avatar as member_avatar')
      .first());
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('PUT /budget/expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const expense = await knex('expenses').where('id', id).first();
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await knex('expenses').where('id', id).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /budget/expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// ─── Summary ───

router.get('/summary', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    const month = req.query.month as string | undefined;
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Get all categories with their budgets
    const categories = await knex('budget_categories')
      .where('family_id', fid)
      .select('id', 'name', 'budget_limit', 'color', 'icon');

    // Get expenses for the month
    const expenses = await knex('expenses')
      .where('family_id', fid)
      .where('expense_date', 'like', `${targetMonth}-%`)
      .select('category_id', 'amount', 'expense_type');

    const totalIncome = expenses
      .filter((e: any) => e.expense_type === 'income')
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const totalExpense = expenses
      .filter((e: any) => e.expense_type === 'expense')
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const categorySummary = categories.map((cat: any) => {
      const spent = expenses
        .filter((e: any) => e.category_id === cat.id && e.expense_type === 'expense')
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      return {
        ...cat,
        spent: Number(spent.toFixed(2)),
        remaining: Number((cat.budget_limit - spent).toFixed(2)),
        percentage: cat.budget_limit > 0 ? Math.min(100, Math.round((spent / cat.budget_limit) * 100)) : 0,
      };
    });

    res.json({
      month: targetMonth,
      total_income: Number(totalIncome.toFixed(2)),
      total_expense: Number(totalExpense.toFixed(2)),
      net: Number((totalIncome - totalExpense).toFixed(2)),
      categories: categorySummary,
    });
  } catch (err) {
    console.error('GET /budget/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
