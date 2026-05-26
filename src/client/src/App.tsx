import { useEffect, useState } from 'react';
import KanbanBoard from './components/KanbanBoard';

interface Member {
  id: number;
  name: string;
  avatar?: string;
}

function App() {
  const [familyId] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: fetch real members from API
    setMembers([
      { id: 1, name: '爸爸', avatar: '👨' },
      { id: 2, name: '妈妈', avatar: '👩' },
      { id: 3, name: '哥哥', avatar: '👦' },
    ]);
    setLoading(false);
  }, []);

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
      <main className="max-w-7xl mx-auto px-6 py-6">
        <KanbanBoard familyId={familyId} members={members} />
      </main>
    </div>
  );
}

export default App;
