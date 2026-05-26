import { Router } from 'express';
import { z } from 'zod';
import knex from '../db/knex.js';

const router = Router();

const itemCreateSchema = z.object({
  family_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  category: z.enum(['produce', 'meat', 'dairy', 'bakery', 'frozen', 'pantry', 'condiment', 'other']).optional(),
  quantity: z.string().max(100).optional(),
});

const itemUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['produce', 'meat', 'dairy', 'bakery', 'frozen', 'pantry', 'condiment', 'other']).optional(),
  quantity: z.string().max(100).optional().nullable(),
  checked: z.boolean().optional(),
});

// Category labels for Chinese display
const CATEGORY_LABELS: Record<string, string> = {
  produce: '果蔬',
  meat: '肉禽蛋奶',
  dairy: '乳制品',
  bakery: '烘焙',
  frozen: '冷冻',
  pantry: '粮油干货',
  condiment: '调味品',
  other: '其他',
};

// Category order for display
const CATEGORY_ORDER = ['produce', 'meat', 'dairy', 'bakery', 'frozen', 'pantry', 'condiment', 'other'];

// GET /api/v1/shopping?family_id=1
router.get('/', async (req, res) => {
  try {
    const { family_id } = req.query;
    if (!family_id) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    const items = await knex('shopping_items')
      .where('family_id', Number(family_id))
      .orderBy([
        { column: 'checked', order: 'asc' },
        { column: 'category', order: 'asc' },
        { column: 'created_at', order: 'desc' },
      ]);

    // Group by category
    const grouped: Record<string, { label: string; items: any[] }> = {};
    for (const cat of CATEGORY_ORDER) {
      grouped[cat] = { label: CATEGORY_LABELS[cat], items: [] };
    }

    for (const item of items) {
      if (grouped[item.category]) {
        grouped[item.category].items.push(item);
      }
    }

    // Remove empty categories
    const result: Record<string, { label: string; items: any[] }> = {};
    for (const [key, value] of Object.entries(grouped)) {
      if (value.items.length > 0) {
        result[key] = value;
      }
    }

    res.json({ items, grouped: result });
  } catch (err) {
    console.error('GET /shopping error:', err);
    res.status(500).json({ error: 'Failed to fetch shopping items' });
  }
});

// POST /api/v1/shopping
router.post('/', async (req, res) => {
  try {
    const data = itemCreateSchema.parse(req.body);

    // Auto-categorize based on name keywords if not provided
    let category: string = data.category || 'other';
    if (!data.category) {
      category = autoCategorize(data.name);
    }

    const [itemId] = await knex('shopping_items').insert({
      ...data,
      category,
      added_by: (req.session as any)?.userId || null,
    });

    const item = await knex('shopping_items').where('id', itemId).first();
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('POST /shopping error:', err);
    res.status(500).json({ error: 'Failed to create shopping item' });
  }
});

// PATCH /api/v1/shopping/:id/check
router.patch('/:id/check', async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const { checked } = req.body;

    const item = await knex('shopping_items').where('id', itemId).first();
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await knex('shopping_items')
      .where('id', itemId)
      .update({ checked: checked ? 1 : 0 });

    res.json({ id: itemId, checked });
  } catch (err) {
    console.error('PATCH /shopping/:id/check error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// PUT /api/v1/shopping/:id
router.put('/:id', async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const data = itemUpdateSchema.parse(req.body);

    const item = await knex('shopping_items').where('id', itemId).first();
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await knex('shopping_items').where('id', itemId).update(data);

    const updated = await knex('shopping_items').where('id', itemId).first();
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('PUT /shopping/:id error:', err);
    res.status(500).json({ error: 'Failed to update shopping item' });
  }
});

// DELETE /api/v1/shopping/:id
router.delete('/:id', async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    const item = await knex('shopping_items').where('id', itemId).first();
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await knex('shopping_items').where('id', itemId).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /shopping/:id error:', err);
    res.status(500).json({ error: 'Failed to delete shopping item' });
  }
});

// DELETE /api/v1/shopping?checked=1 — bulk delete checked items
router.delete('/', async (req, res) => {
  try {
    const { family_id, checked } = req.query;
    if (!family_id) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    let query = knex('shopping_items')
      .where('family_id', Number(family_id));

    if (checked === '1' || checked === 'true') {
      query = query.where('checked', true);
    }

    await query.delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /shopping error:', err);
    res.status(500).json({ error: 'Failed to delete shopping items' });
  }
});

// Auto-categorize based on keywords
function autoCategorize(name: string): string {
  const lower = name.toLowerCase();
  const keywords: Record<string, string[]> = {
    produce: ['苹果', '香蕉', '橙子', '番茄', '西红柿', '黄瓜', '土豆', '胡萝卜', '白菜', '青菜', '菠菜', '生菜', '茄子', '辣椒', '蒜', '姜', '葱', '洋葱', '蘑菇', '玉米', '南瓜', '西瓜', '葡萄', '草莓', '梨', '桃', '菜'],
    meat: ['猪肉', '牛肉', '羊肉', '鸡肉', '鸡腿', '鸡翅', '排骨', '肉', '鱼', '虾', '蟹', '蛋', '鸡蛋', '鸭蛋'],
    dairy: ['牛奶', '酸奶', '奶酪', '芝士', '黄油', '奶油', '奶'],
    bakery: ['面包', '蛋糕', '饼干', '馒头', '包子', '饺子', '面条', '面粉'],
    frozen: ['冰淇淋', '汤圆', '水饺', '冻', '冰'],
    pantry: ['大米', '小米', '油', '盐', '糖', '酱油', '醋', '米', '面', '粉条', '粉丝', '花生', '核桃', '干果'],
    condiment: ['酱', '蚝油', '料酒', '花椒', '八角', '桂皮', '孜然', '辣椒', '胡椒', '芥末', '蜂蜜'],
  };

  for (const [cat, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (lower.includes(word)) return cat;
    }
  }

  return 'other';
}

export default router;
