import { useEffect, useMemo, useState } from 'react';

interface Member {
  id: number;
  name: string;
  avatar?: string;
}

interface Recipe {
  id: number;
  family_id: number;
  name: string;
  description?: string;
  ingredients: { name: string; amount?: string; unit?: string }[];
  steps?: string;
  prep_time?: number;
  cook_time?: number;
  tags?: string;
  created_at: string;
}

interface MealPlan {
  id: number;
  family_id: number;
  plan_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  recipe_id?: number;
  custom_name?: string;
  notes?: string;
  member_id?: number;
  recipe_name?: string;
  prep_time?: number;
  cook_time?: number;
  member_name?: string;
  member_avatar?: string;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export default function Meals({ familyId, members }: { familyId: number; members: Member[] }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'recipes'>('plan');

  const [planForm, setPlanForm] = useState({
    plan_date: formatDate(new Date()),
    meal_type: 'breakfast' as 'breakfast' | 'lunch' | 'dinner',
    recipe_id: '',
    custom_name: '',
    notes: '',
    member_id: '',
  });

  const [recipeForm, setRecipeForm] = useState({
    name: '',
    description: '',
    ingredients: [] as { name: string; amount?: string; unit?: string }[],
    steps: '',
    prep_time: '',
    cook_time: '',
    tags: '',
  });

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 28; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const weekStr = formatDate(weekStart);

  async function fetchData() {
    setLoading(true);
    try {
      const [plansRes, recipesRes] = await Promise.all([
        fetch(`/api/v1/meals/plans?family_id=${familyId}&week_start=${weekStr}`),
        fetch(`/api/v1/meals/recipes?family_id=${familyId}`),
      ]);
      const plansData = await plansRes.json();
      const recipesData = await recipesRes.json();
      setPlans(plansData.plans || []);
      setRecipes(recipesData.recipes || []);
    } catch (err) {
      console.error('Fetch meals data error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [familyId, weekStr]);

  function openPlanModal(date?: string, type?: 'breakfast' | 'lunch' | 'dinner') {
    setEditingPlan(null);
    setPlanForm({
      plan_date: date || formatDate(new Date()),
      meal_type: type || 'breakfast',
      recipe_id: '',
      custom_name: '',
      notes: '',
      member_id: '',
    });
    setShowPlanModal(true);
  }

  function editPlan(plan: MealPlan) {
    setEditingPlan(plan);
    setPlanForm({
      plan_date: plan.plan_date,
      meal_type: plan.meal_type,
      recipe_id: plan.recipe_id ? String(plan.recipe_id) : '',
      custom_name: plan.custom_name || '',
      notes: plan.notes || '',
      member_id: plan.member_id ? String(plan.member_id) : '',
    });
    setShowPlanModal(true);
  }

  async function savePlan() {
    const body = {
      family_id: familyId,
      plan_date: planForm.plan_date,
      meal_type: planForm.meal_type,
      recipe_id: planForm.recipe_id ? Number(planForm.recipe_id) : null,
      custom_name: planForm.custom_name || null,
      notes: planForm.notes || null,
      member_id: planForm.member_id ? Number(planForm.member_id) : null,
    };

    try {
      if (editingPlan) {
        await fetch(`/api/v1/meals/plans/${editingPlan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/v1/meals/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      setShowPlanModal(false);
      fetchData();
    } catch (err) {
      console.error('Save plan error:', err);
    }
  }

  async function deletePlan(id: number) {
    if (!confirm('确定删除这个餐食计划？')) return;
    try {
      await fetch(`/api/v1/meals/plans/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Delete plan error:', err);
    }
  }

  function openRecipeModal() {
    setEditingRecipe(null);
    setRecipeForm({
      name: '',
      description: '',
      ingredients: [],
      steps: '',
      prep_time: '',
      cook_time: '',
      tags: '',
    });
    setShowRecipeModal(true);
  }

  function editRecipe(recipe: Recipe) {
    setEditingRecipe(recipe);
    setRecipeForm({
      name: recipe.name,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || '',
      prep_time: recipe.prep_time ? String(recipe.prep_time) : '',
      cook_time: recipe.cook_time ? String(recipe.cook_time) : '',
      tags: recipe.tags || '',
    });
    setShowRecipeModal(true);
  }

  async function saveRecipe() {
    const body = {
      family_id: familyId,
      name: recipeForm.name,
      description: recipeForm.description || null,
      ingredients: recipeForm.ingredients,
      steps: recipeForm.steps || null,
      prep_time: recipeForm.prep_time ? Number(recipeForm.prep_time) : null,
      cook_time: recipeForm.cook_time ? Number(recipeForm.cook_time) : null,
      tags: recipeForm.tags || null,
    };

    try {
      if (editingRecipe) {
        await fetch(`/api/v1/meals/recipes/${editingRecipe.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/v1/meals/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      setShowRecipeModal(false);
      fetchData();
    } catch (err) {
      console.error('Save recipe error:', err);
    }
  }

  async function deleteRecipe(id: number) {
    if (!confirm('确定删除这个食谱？')) return;
    try {
      await fetch(`/api/v1/meals/recipes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Delete recipe error:', err);
    }
  }

  async function addRecipeToShopping(recipe: Recipe) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      alert('该食谱没有食材');
      return;
    }
    try {
      for (const ing of recipe.ingredients) {
        await fetch('/api/v1/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: familyId,
            name: ing.name,
            quantity: ing.amount ? `${ing.amount}${ing.unit || ''}` : undefined,
            category: '食材',
          }),
        });
      }
      alert(`已将 ${recipe.ingredients.length} 种食材加入购物清单`);
    } catch (err) {
      console.error('Add to shopping error:', err);
      alert('添加失败');
    }
  }

  function getPlanForDay(dateStr: string, type: string) {
    return plans.find((p) => p.plan_date === dateStr && p.meal_type === type);
  }

  function addIngredient() {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '', unit: '' }],
    }));
  }

  function updateIngredient(index: number, field: string, value: string) {
    setRecipeForm((prev) => {
      const updated = [...prev.ingredients];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, ingredients: updated };
    });
  }

  function removeIngredient(index: number) {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'plan'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          周计划
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'recipes'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          食谱库
        </button>
      </div>

      {activeTab === 'plan' && (
        <div>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                ←
              </button>
              <span className="text-sm font-medium text-gray-700">
                {formatDate(weekStart)} ~ {formatDate(addDays(weekStart, 27))}
              </span>
              <button
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                →
              </button>
            </div>
            <button
              onClick={() => openPlanModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + 添加计划
            </button>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateStr = formatDate(day);
              const isToday = dateStr === formatDate(new Date());
              return (
                <div
                  key={dateStr}
                  className={`bg-white rounded-lg border p-3 min-h-[280px] ${
                    isToday ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'
                  }`}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs text-gray-400">
                      {['一', '二', '三', '四', '五', '六', '日'][day.getDay() === 0 ? 6 : day.getDay() - 1]}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  {(['breakfast', 'lunch', 'dinner'] as const).map((type) => {
                    const plan = getPlanForDay(dateStr, type);
                    return (
                      <div key={type} className="mb-2">
                        <div className="text-[10px] text-gray-400 mb-0.5">
                          {MEAL_ICONS[type]} {MEAL_LABELS[type]}
                        </div>
                        {plan ? (
                          <div
                            className="bg-orange-50 border border-orange-200 rounded p-1.5 cursor-pointer hover:bg-orange-100 text-xs"
                            onClick={() => editPlan(plan)}
                          >
                            <div className="font-medium text-orange-800 truncate">
                              {plan.recipe_name || plan.custom_name || '未命名'}
                            </div>
                            {plan.member_name && (
                              <div className="text-orange-600 mt-0.5">
                                {plan.member_avatar} {plan.member_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openPlanModal(dateStr, type)}
                            className="w-full py-1.5 border border-dashed border-gray-200 rounded text-gray-300 hover:border-gray-300 hover:text-gray-400 text-xs"
                          >
                            + 添加
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">食谱库</h2>
            <button
              onClick={openRecipeModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + 新建食谱
            </button>
          </div>

          {recipes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-2">🍳</p>
              <p>还没有食谱，创建一个吧</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{recipe.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => addRecipeToShopping(recipe)}
                        className="p-1 text-gray-400 hover:text-green-600 text-xs"
                        title="加入购物清单"
                      >
                        🛒
                      </button>
                      <button
                        onClick={() => editRecipe(recipe)}
                        className="p-1 text-gray-400 hover:text-blue-600 text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        className="p-1 text-gray-400 hover:text-red-500 text-xs"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {recipe.description && (
                    <p className="text-sm text-gray-500 mb-2">{recipe.description}</p>
                  )}
                  {(recipe.prep_time || recipe.cook_time) && (
                    <div className="flex gap-3 text-xs text-gray-400 mb-2">
                      {recipe.prep_time && <span>准备 {recipe.prep_time} 分钟</span>}
                      {recipe.cook_time && <span>烹饪 {recipe.cook_time} 分钟</span>}
                    </div>
                  )}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.slice(0, 5).map((ing, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600"
                        >
                          {ing.name}
                        </span>
                      ))}
                      {recipe.ingredients.length > 5 && (
                        <span className="text-xs text-gray-400">+{recipe.ingredients.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingPlan ? '编辑计划' : '添加计划'}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input
                  type="date"
                  value={planForm.plan_date}
                  onChange={(e) => setPlanForm((p) => ({ ...p, plan_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">餐别</label>
                <select
                  value={planForm.meal_type}
                  onChange={(e) =>
                    setPlanForm((p) => ({ ...p, meal_type: e.target.value as 'breakfast' | 'lunch' | 'dinner' }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="breakfast">早餐</option>
                  <option value="lunch">午餐</option>
                  <option value="dinner">晚餐</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">食谱</label>
                <select
                  value={planForm.recipe_id}
                  onChange={(e) => setPlanForm((p) => ({ ...p, recipe_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">选择食谱（可选）</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">自定义名称</label>
                <input
                  type="text"
                  value={planForm.custom_name}
                  onChange={(e) => setPlanForm((p) => ({ ...p, custom_name: e.target.value }))}
                  placeholder="未选择食谱时显示"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                <select
                  value={planForm.member_id}
                  onChange={(e) => setPlanForm((p) => ({ ...p, member_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">选择成员（可选）</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.avatar} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={planForm.notes}
                  onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editingPlan && (
                <button
                  onClick={() => deletePlan(editingPlan.id)}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50"
                >
                  删除
                </button>
              )}
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 ml-auto"
              >
                取消
              </button>
              <button
                onClick={savePlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editingRecipe ? '编辑食谱' : '新建食谱'}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input
                  type="text"
                  value={recipeForm.name}
                  onChange={(e) => setRecipeForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={recipeForm.description}
                  onChange={(e) => setRecipeForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">准备时间（分钟）</label>
                  <input
                    type="number"
                    value={recipeForm.prep_time}
                    onChange={(e) => setRecipeForm((p) => ({ ...p, prep_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">烹饪时间（分钟）</label>
                  <input
                    type="number"
                    value={recipeForm.cook_time}
                    onChange={(e) => setRecipeForm((p) => ({ ...p, cook_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">食材</label>
                {recipeForm.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="名称"
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="用量"
                      value={ing.amount}
                      onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="单位"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeIngredient(i)}
                      className="px-2 text-red-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={addIngredient}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + 添加食材
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">做法步骤</label>
                <textarea
                  value={recipeForm.steps}
                  onChange={(e) => setRecipeForm((p) => ({ ...p, steps: e.target.value }))}
                  rows={4}
                  placeholder="1. ...&#10;2. ..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                <input
                  type="text"
                  value={recipeForm.tags}
                  onChange={(e) => setRecipeForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="家常菜, 快手菜, 素食"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editingRecipe && (
                <button
                  onClick={() => deleteRecipe(editingRecipe.id)}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50"
                >
                  删除
                </button>
              )}
              <button
                onClick={() => setShowRecipeModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 ml-auto"
              >
                取消
              </button>
              <button
                onClick={saveRecipe}
                disabled={!recipeForm.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
