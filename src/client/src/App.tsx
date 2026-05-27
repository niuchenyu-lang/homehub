import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import KanbanBoard from './components/KanbanBoard';
import ShoppingList from './components/ShoppingList';
import Calendar from './components/Calendar';
import Budget from './components/Budget';
import Meals from './components/Meals';

interface Member {
  id: number;
  name: string;
  avatar?: string;
}

type Page = 'tasks' | 'shopping' | 'calendar' | 'meals' | 'budget';

const PATH_TO_PAGE: Record<string, Page> = {
  '/': 'tasks',
  '/tasks': 'tasks',
  '/shopping': 'shopping',
  '/calendar': 'calendar',
  '/meals': 'meals',
  '/budget': 'budget',
};

const PAGE_TO_PATH: Record<Page, string> = {
  tasks: '/tasks',
  shopping: '/shopping',
  calendar: '/calendar',
  meals: '/meals',
  budget: '/budget',
};

function App() {
  const [familyId] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('tasks');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMembers([
      { id: 1, name: '爸爸', avatar: '👨' },
      { id: 2, name: '妈妈', avatar: '👩' },
      { id: 3, name: '哥哥', avatar: '👦' },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const page = PATH_TO_PAGE[location.pathname];
    if (page && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [location.pathname]);

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'tasks', label: '任务', icon: '📋' },
    { id: 'shopping', label: '购物', icon: '🛒' },
    { id: 'calendar', label: '日历', icon: '📅' },
    { id: 'meals', label: '餐食', icon: '🍽️' },
    { id: 'budget', label: '预算', icon: '💰' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">HomeHub</h1>
          <div className="flex items-center gap-2">
            {members.map(m => (
              <span key={m.id} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                <span>{m.avatar}</span>
                <span>{m.name}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                navigate(PAGE_TO_PATH[item.id]);
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                currentPage === item.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {currentPage === 'tasks' && (
          <KanbanBoard familyId={familyId} members={members} />
        )}
        {currentPage === 'shopping' && (
          <ShoppingList familyId={familyId} />
        )}
        {currentPage === 'calendar' && (
          <Calendar familyId={familyId} members={members} />
        )}
        {currentPage === 'meals' && (
          <Meals familyId={familyId} members={members} />
        )}
        {currentPage === 'budget' && (
          <Budget familyId={familyId} members={members} />
        )}
      </main>
    </div>
  );
}

export default App;
