import { useEffect, useState, useRef } from 'react';

interface ShoppingItem {
  id: number;
  name: string;
  category: string;
  quantity?: string;
  checked: boolean;
}

interface GroupedItems {
  [category: string]: {
    label: string;
    items: ShoppingItem[];
  };
}

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

const CATEGORY_ORDER = ['produce', 'meat', 'dairy', 'bakery', 'frozen', 'pantry', 'condiment', 'other'];

interface ShoppingListProps {
  familyId: number;
}

export default function ShoppingList({ familyId }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [grouped, setGrouped] = useState<GroupedItems>({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/v1/shopping?family_id=${familyId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setGrouped(data.grouped || {});
      }
    } catch (err) {
      console.error('Failed to fetch shopping items:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, [familyId]);

  const addItem = async () => {
    if (!newItemName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/shopping', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name: newItemName.trim(),
          quantity: newItemQuantity.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNewItemName('');
        setNewItemQuantity('');
        inputRef.current?.focus();
        await fetchItems();
      }
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCheck = async (itemId: number, checked: boolean) => {
    try {
      const res = await fetch(`/api/v1/shopping/${itemId}/check`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: !checked }),
      });
      if (res.ok) {
        await fetchItems();
      }
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/v1/shopping/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await fetchItems();
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const clearChecked = async () => {
    if (!confirm('清除所有已购物品？')) return;
    try {
      const res = await fetch(`/api/v1/shopping?family_id=${familyId}&checked=1`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await fetchItems();
      }
    } catch (err) {
      console.error('Failed to clear checked items:', err);
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            购物进度 {checkedCount}/{totalCount}
          </span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Add item form */}
      <div className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="添加物品（如：牛奶、鸡蛋）"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={newItemQuantity}
          onChange={(e) => setNewItemQuantity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="数量"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addItem}
          disabled={isLoading || !newItemName.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          添加
        </button>
      </div>

      {/* Category groups */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const group = grouped[cat];
          if (!group || group.items.length === 0) return null;

          const allChecked = group.items.every((i) => i.checked);

          return (
            <div
              key={cat}
              className={`rounded-xl border ${
                allChecked ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-medium text-gray-700">
                  {group.label}
                  <span className="ml-2 text-xs text-gray-400">
                    {group.items.filter((i) => i.checked).length}/{group.items.length}
                  </span>
                </h3>
                {allChecked && (
                  <span className="text-xs text-green-600 font-medium">✓ 完成</span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      item.checked ? 'bg-gray-50' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <button
                      onClick={() => toggleCheck(item.id, item.checked)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.checked
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {item.checked && '✓'}
                    </button>
                    <span
                      className={`flex-1 ${
                        item.checked ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {item.name}
                      {item.quantity && (
                        <span className="ml-1 text-sm text-gray-500">({item.quantity})</span>
                      )}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🛒</p>
          <p>购物清单是空的</p>
          <p className="text-sm mt-1">添加一些物品开始购物吧</p>
        </div>
      )}

      {/* Clear checked button */}
      {checkedCount > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={clearChecked}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            清除 {checkedCount} 个已购物品
          </button>
        </div>
      )}
    </div>
  );
}
