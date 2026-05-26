import { useEffect, useState } from 'react';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

interface Member {
  id: number;
  name: string;
  avatar?: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  points: number;
  assignees: Member[];
}

interface KanbanBoardProps {
  familyId: number;
  members: Member[];
}

const COLUMNS = [
  { id: 'todo' as const, label: '待办', color: 'bg-gray-100' },
  { id: 'doing' as const, label: '进行中', color: 'bg-blue-50' },
  { id: 'done' as const, label: '已完成', color: 'bg-green-50' },
];

const PRIORITY_COLORS = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export default function KanbanBoard({ familyId, members }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/v1/tasks?family_id=${familyId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Polling every 5 seconds
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [familyId]);

  const handleStatusChange = async (taskId: number, newStatus: Task['status']) => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, family_id: familyId }),
      });
      if (res.ok) {
        await fetchTasks();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: number, taskData: any) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        await fetchTasks();
        setEditingTask(null);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const getColumnTasks = (status: Task['status']) =>
    tasks.filter((t) => t.status === status);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">家庭任务看板</h2>
        <button
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + 新建任务
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={`${col.color} rounded-xl p-4 min-h-[400px]`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">{col.label}</h3>
              <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded-full">
                {getColumnTasks(col.id).length}
              </span>
            </div>

            <div className="space-y-3">
              {getColumnTasks(col.id).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onEdit={openEditModal}
                  onDelete={handleDeleteTask}
                  priorityColors={PRIORITY_COLORS}
                  priorityLabels={PRIORITY_LABELS}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
          members={members}
          editingTask={editingTask}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
