import { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState<{ status: string; version: string } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'offline', version: 'unknown' }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">HomeHub</h1>
        <p className="text-lg text-gray-600 mb-8">家庭的智能规划中心</p>
        <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            服务状态
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-gray-700">
              {health ? `${health.status} (v${health.version})` : '检查中...'}
            </span>
          </div>
        </div>
        <p className="mt-8 text-sm text-gray-400">
          React 18 + TypeScript + Node.js + SQLite
        </p>
      </div>
    </div>
  );
}

export default App;
