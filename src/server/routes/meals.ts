import { Router } from 'express';
import { z } from 'zod';
import knex from '../db/knex.js';

const router = Router();

const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: z.string().optional(),
  unit: z.string().optional(),
});

const recipeCreateSchema = z.object({
  family_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  ingredients: z.array(ingredientSchema).optional().default([]),
  steps: z.string().optional().nullable(),
  prep_time: z.number().int().min(0).optional().nullable(),
  cook_time: z.number().int().min(0).optional().nullable(),
  tags: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

const recipeUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.string().optional().nullable(),
  prep_time: z.number().int().min(0).optional().nullable(),
  cook_time: z.number().int().min(0).optional().nullable(),
  tags: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

const mealPlanCreateSchema = z.object({
  family_id: z.number().int().positive(),
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner']),
  recipe_id: z.number().int().positive().optional().nullable(),
  custom_name: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  member_id: z.number().int().positive().optional().nullable(),
});

const mealPlanUpdateSchema = z.object({
  recipe_id: z.number().int().positive().optional().nullable(),
  custom_name: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  member_id: z.number().int().positive().optional().nullable(),
});

// ─── Recipes ───

router.get('/recipes', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required' });
    }
    const recipes = await knex('recipes')
      .where('family_id', fid)
      .orderBy('created_at', 'desc');
    res.json({ recipes });
  } catch (err) {
    console.error('GET /meals/recipes error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

router.post('/recipes', async (req, res) => {
  try {
    const data = recipeCreateSchema.parse(req.body);
    const [id] = await knex('recipes').insert({
      ...data,
      ingredients: JSON.stringify(data.ingredients),
    });
    const recipe = await knex('recipes').where('id', id).first();
    res.status(201).json({ ...recipe, ingredients: JSON.parse(recipe.ingredients || '[]') });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('POST /meals/recipes error:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

router.put('/recipes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const data = recipeUpdateSchema.parse(req.body);
    const recipe = await knex('recipes').where('id', id).first();
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    const updateData: any = { ...data };
    if (data.ingredients) updateData.ingredients = JSON.stringify(data.ingredients);
    await knex('recipes').where('id', id).update(updateData);
    const updated = await knex('recipes').where('id', id).first();
    res.json({ ...updated, ingredients: JSON.parse(updated.ingredients || '[]') });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('PUT /meals/recipes/:id error:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

router.delete('/recipes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const recipe = await knex('recipes').where('id', id).first();
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    await knex('recipes').where('id', id).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /meals/recipes/:id error:', err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// ─── Meal Plans ───

router.get('/plans', async (req, res) => {
  try {
    const fid = Number(req.query.family_id);
    const weekStart = req.query.week_start as string | undefined;
    if (!fid || isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    let query = knex('meal_plans')
      .leftJoin('recipes', 'meal_plans.recipe_id', 'recipes.id')
      .leftJoin('members', 'meal_plans.member_id', 'members.id')
      .where('meal_plans.family_id', fid)
      .select(
        'meal_plans.*',
        'recipes.name as recipe_name',
        'recipes.ingredients as recipe_ingredients',
        'recipes.prep_time',
        'recipes.cook_time',
        'members.name as member_name',
        'members.avatar as member_avatar'
      )
      .orderBy('meal_plans.plan_date', 'asc')
      .orderByRaw("CASE meal_plans.meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 END");

    if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      query = query.whereBetween('meal_plans.plan_date', [
        weekStart,
        end.toISOString().slice(0, 10),
      ]);
    }

    const plans = await query;
    res.json({
      plans: plans.map((p: any) => ({
        ...p,
        recipe_ingredients: p.recipe_ingredients ? JSON.parse(p.recipe_ingredients) : [],
      })),
    });
  } catch (err) {
    console.error('GET /meals/plans error:', err);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const data = mealPlanCreateSchema.parse(req.body);
    const [id] = await knex('meal_plans').insert(data);
    const plan = await knex('meal_plans')
      .leftJoin('recipes', 'meal_plans.recipe_id', 'recipes.id')
      .leftJoin('members', 'meal_plans.member_id', 'members.id')
      .where('meal_plans.id', id)
      .select('meal_plans.*', 'recipes.name as recipe_name', 'recipes.ingredients as recipe_ingredients', 'recipes.prep_time', 'recipes.cook_time', 'members.name as member_name', 'members.avatar as member_avatar')
      .first();
    res.status(201).json({
      ...plan,
      recipe_ingredients: plan.recipe_ingredients ? JSON.parse(plan.recipe_ingredients) : [],
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('POST /meals/plans error:', err);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const data = mealPlanUpdateSchema.parse(req.body);
    const plan = await knex('meal_plans').where('id', id).first();
    if (!plan) return res.status(404).json({ error: 'Meal plan not found' });
    await knex('meal_plans').where('id', id).update(data);
    const updated = await knex('meal_plans')
      .leftJoin('recipes', 'meal_plans.recipe_id', 'recipes.id')
      .leftJoin('members', 'meal_plans.member_id', 'members.id')
      .where('meal_plans.id', id)
      .select('meal_plans.*', 'recipes.name as recipe_name', 'recipes.ingredients as recipe_ingredients', 'recipes.prep_time', 'recipes.cook_time', 'members.name as member_name', 'members.avatar as member_avatar')
      .first();
    res.json({
      ...updated,
      recipe_ingredients: updated.recipe_ingredients ? JSON.parse(updated.recipe_ingredients) : [],
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('PUT /meals/plans/:id error:', err);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
    const plan = await knex('meal_plans').where('id', id).first();
    if (!plan) return res.status(404).json({ error: 'Meal plan not found' });
    await knex('meal_plans').where('id', id).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /meals/plans/:id error:', err);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

export default router;
