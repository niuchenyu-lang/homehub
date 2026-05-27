import { useState, useEffect, useCallback } from 'react';

interface Member {
  id: number;
  name: string;
  avatar?: string;
}

interface Category {
  id: number;
  name: string;
  budget_limit: number;
  color: string;
  icon?: string;
  spent?: number;
  remaining?: number;
  percentage?: number;
}

interface Expense {
  id: number;
  amount: number;
  description?: string;
  expense_date: string;
  expense_type: 'expense' | 'income';
  category_id?: number;
  category_name?: string;
  category_color?: string;
  member_id?: number;
  member_name?: string;
  member_avatar?: string;
  payment_method?: string;
}

interface BudgetSummary {
  month: string;
  total_income: number;
  total_expense: number;
  net: number;
  categories: Category[];
}

interface BudgetProps {
  familyId: number;
  members: Member[];
}

const PAYMENT_METHODS = ['现金', '信用卡', '借记卡', '支付宝', '微信支付', '其他'];
const DEFAULT_CATEGORIES = [
  { name: '餐饮', color: '#EF4444', icon: '🍜' },
  { name: '交通', color: '#3B82F6', icon: '🚗' },
  { name: '购物', color: '#8B5CF6', icon: '🛍️' },
  { name: '娱乐', color: '#EC4899', icon: '🎮' },
  { name: '医疗', color: '#10B981', icon: '🏥' },
  { name: '教育', color: '#F59E0B', icon: '📚' },
  { name: '住房', color: '#6B7280', icon: '🏠' },
  { name: '其他', color: '#14B8A6', icon: '📦' },
];

export default function Budget({ familyId, members }: BudgetProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    expense_date: new Date().toISOString().slice(0, 10),
    expense_type: 'expense' as 'expense' | 'income',
    category_id: '',
    member_id: '',
    payment_method: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    budget_limit: '',
    color: '#3B82F6',
    icon: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, expensesRes, catRes] = await Promise.all([
        fetch(`/api/v1/budget/summary?family_id=${familyId}&month=${currentMonth}`, { credentials: 'include' }),
        fetch(`/api/v1/budget/expenses?family_id=${familyId}&month=${currentMonth}`, { credentials: 'include' }),
        fetch(`/api/v1/budget/categories?family_id=${familyId}`, { credentials: 'include' }),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (expensesRes.ok) setExpenses((await expensesRes.json()).expenses || []);
      if (catRes.ok) setCategories((await catRes.json()).categories || []);
    } catch (err) {
      console.error('Fetch budget data error:', err);
    } finally {
      setLoading(false);
    }
  }, [familyId, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const initDefaultCategories = async () => {
    if (categories.length > 0) return;
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await fetch('/api/v1/budget/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ family_id: familyId, budget_limit: 1000, ...cat }),
        });
      }
      fetchData();
    } catch (err) {
      console.error('Init categories error:', err);
    }
  };

  useEffect(() => {
    if (categories.length === 0 && !loading) {
      initDefaultCategories();
    }
  }, [categories.length, loading]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.expense_date) return;

    const payload = {
      family_id: familyId,
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
      expense_date: expenseForm.expense_date,
      expense_type: expenseForm.expense_type,
      category_id: expenseForm.category_id ? Number(expenseForm.category_id) : null,
      member_id: expenseForm.member_id ? Number(expenseForm.member_id) : null,
      payment_method: expenseForm.payment_method || null,
    };

    try {
      const url = editingExpense ? `/api/v1/budget/expenses/${editingExpense.id}` : '/api/v1/budget/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowExpenseModal(false);
      setEditingExpense(null);
      resetExpenseForm();
      fetchData();
    } catch (err) {
      console.error('Save expense error:', err);
      alert('保存失败');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('确定删除这条记录？')) return;
    try {
      const res = await fetch(`/api/v1/budget/expenses/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchData();
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.budget_limit) return;

    try {
      const res = await fetch('/api/v1/budget/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          family_id: familyId,
          name: categoryForm.name,
          budget_limit: Number(categoryForm.budget_limit),
          color: categoryForm.color,
          icon: categoryForm.icon || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowCategoryModal(false);
      resetCategoryForm();
      fetchData();
    } catch (err) {
      console.error('Save category error:', err);
      alert('保存失败');
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      amount: '',
      description: '',
      expense_date: new Date().toISOString().slice(0, 10),
      expense_type: 'expense',
      category_id: '',
      member_id: '',
      payment_method: '',
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', budget_limit: '', color: '#3B82F6', icon: '' });
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseForm({
      amount: String(exp.amount),
      description: exp.description || '',
      expense_date: exp.expense_date,
      expense_type: exp.expense_type,
      category_id: exp.category_id ? String(exp.category_id) : '',
      member_id: exp.member_id ? String(exp.member_id) : '',
      payment_method: exp.payment_method || '',
    });
    setShowExpenseModal(true);
  };

  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  const formatMonth = (m: string) => {
    const [y, month] = m.split('-');
    return `${y}年${Number(month)}月`;
  };

  return (
    <div className="space-y-6">
      {/* Month selector & actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50">←</button>
          <h2 className="text-xl font-bold text-gray-900">{formatMonth(currentMonth)}</h2>
          <button onClick={nextMonth} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50">→</button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCategoryModal(true); resetCategoryForm(); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
          >
            + 预算类别
          </button>
          <button
            onClick={() => { setShowExpenseModal(true); setEditingExpense(null); resetExpenseForm(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            + 记一笔
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">加载中...</div>}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">本月收入</div>
            <div className="text-2xl font-bold text-green-600">¥{summary.total_income.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">本月支出</div>
            <div className="text-2xl font-bold text-red-600">¥{summary.total_expense.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">结余</div>
            <div className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{summary.net.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Budget categories */}
      {summary?.categories && summary.categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="font-medium text-gray-900">{cat.name}</span>
                </div>
                <span className="text-sm text-gray-500">¥{cat.spent} / ¥{cat.budget_limit}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                <div
                  className="h-2.5 rounded-full transition-all"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{cat.percentage}%</span>
                <span className={(cat.remaining ?? 0) < 0 ? 'text-red-500' : ''}>
                  剩余 ¥{cat.remaining ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent expenses */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 font-medium text-gray-900">
          收支明细
        </div>
        {expenses.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400">本月暂无记录</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                onClick={() => openEditExpense(exp)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: exp.category_color || '#6B7280' }}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {exp.description || exp.category_name || '未分类'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {exp.expense_date} · {exp.payment_method || '未指定'}
                      {exp.member_name && ` · ${exp.member_avatar || ''} ${exp.member_name}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${exp.expense_type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                    {exp.expense_type === 'income' ? '+' : '-'}¥{Number(exp.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteExpense(exp.id); }}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editingExpense ? '编辑记录' : '记一笔'}</h2>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveExpense} className="px-6 py-4 space-y-4">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setExpenseForm({ ...expenseForm, expense_type: t })}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      expenseForm.expense_type === t
                        ? t === 'income' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {t === 'income' ? '收入' : '支出'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                <select
                  value={expenseForm.category_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未分类</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">成员</label>
                <select
                  value={expenseForm.member_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, member_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未指定</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支付方式</label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未指定</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="可选"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">取消</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">新建预算类别</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveCategory} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：餐饮、交通"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">月度预算</label>
                <input
                  type="number"
                  step="0.01"
                  value={categoryForm.budget_limit}
                  onChange={(e) => setCategoryForm({ ...categoryForm, budget_limit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：🍜"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">颜色</label>
                <div className="flex gap-2">
                  {['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, color: c })}
                      className={`w-8 h-8 rounded-full border-2 ${categoryForm.color === c ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">取消</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
