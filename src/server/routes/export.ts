import { Router } from 'express';
import knex from '../db/knex.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    const [
      tasks,
      shoppingItems,
      events,
      budgetCategories,
      expenses,
      recipes,
      mealPlans,
      members,
    ] = await Promise.all([
      knex('tasks').where('family_id', fid).orderBy('created_at', 'desc'),
      knex('shopping_items').where('family_id', fid).orderBy('created_at', 'desc'),
      knex('events').where('family_id', fid).orderBy('start_time', 'desc'),
      knex('budget_categories').where('family_id', fid).orderBy('created_at', 'desc'),
      knex('expenses').where('family_id', fid).orderBy('expense_date', 'desc'),
      knex('recipes').where('family_id', fid).orderBy('created_at', 'desc'),
      knex('meal_plans').where('family_id', fid).orderBy('plan_date', 'desc'),
      knex('members').where('family_id', fid),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      family_id: fid,
      members,
      tasks,
      shopping_items: shoppingItems,
      events,
      budget: {
        categories: budgetCategories,
        expenses,
      },
      meals: {
        recipes: recipes.map((r: any) => ({
          ...r,
          ingredients: r.ingredients ? JSON.parse(r.ingredients) : [],
        })),
        plans: mealPlans,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="homehub-export-${fid}-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('GET /export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
