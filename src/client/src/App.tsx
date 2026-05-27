import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './mobile.css';
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
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('homehub-dark') === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  useEffect(() => {
    localStorage.setItem('homehub-dark', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!('Notification' in window)) return;
    Notification.requestPermission();

    async function checkNotifications() {
      try {
        const res = await fetch(`/api/v1/notifications?family_id=${familyId}`);
        const data = await res.json();
        setNotifCount(data.total || 0);
        if (data.total > 0 && Notification.permission === 'granted') {
          const items = [...data.due_tasks, ...data.upcoming_events];
          items.slice(0, 3).forEach((item: any, i: number) => {
            setTimeout(() => {
              new Notification('HomeHub 提醒', {
                body: item.title || '今日待办',
                icon: '/favicon.ico',
              });
            }, i * 1000);
          });
        }
      } catch (e) {
        // ignore
      }
    }
    checkNotifications();
    const interval = setInterval(checkNotifications, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [familyId]);

  async function handleExport() {
    try {
      const res = await fetch(`/api/v1/export?family_id=${familyId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `homehub-export-${familyId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败');
    }
  }

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'tasks', label: '任务', icon: '📋' },
    { id: 'shopping', label: '购物', icon: '🛒' },
    { id: 'calendar', label: '日历', icon: '📅' },
    { id: 'meals', label: '餐食', icon: '🍽️' },
    { id: 'budget', label: '预算', icon: '💰' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">HomeHub</h1>
          <div className="flex items-center gap-2">
            {notifCount > 0 && (
              <span className="relative px-2 py-1 bg-red-100 dark:bg-red-900 rounded-full text-xs text-red-600 dark:text-red-300">
                🔔 {notifCount}
              </span>
            )}
            <button
              onClick={handleExport}
              className="hidden md:block p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm"
              title="导出数据"
            >
              💾
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm"
              title={darkMode ? '切换亮色' : '切换暗色'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="hidden md:flex items-center gap-2">
              {members.map(m => (
                <span key={m.id} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm dark:text-gray-200">
                  <span>{m.avatar}</span>
                  <span>{m.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop nav */}
      <nav className="hidden md:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
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
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex justify-around">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                navigate(PAGE_TO_PATH[item.id]);
              }}
              className={`flex flex-col items-center py-2 px-3 text-xs ${
                currentPage === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-20 md:pb-6">
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
