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

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: number, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  priorityColors: Record<string, string>;
  priorityLabels: Record<string, string>;
}

export default function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  priorityColors,
  priorityLabels,
}: TaskCardProps) {
  const nextStatus: Record<Task['status'], Task['status']> = {
    todo: 'doing',
    doing: 'done',
    done: 'todo',
  };

  const statusLabels: Record<Task['status'], string> = {
    todo: '开始',
    doing: '完成',
    done: '重做',
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `逾期 ${Math.abs(diff)} 天`, color: 'text-red-600' };
    if (diff === 0) return { text: '今天', color: 'text-orange-600' };
    if (diff === 1) return { text: '明天', color: 'text-yellow-600' };
    return { text: `${diff} 天后`, color: 'text-gray-500' };
  };

  const dueInfo = formatDueDate(task.due_date);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
          {priorityLabels[task.priority]}
        </span>
        <span className="text-xs text-gray-400">{task.points} 分</span>
      </div>

      <h4 className="font-medium text-gray-800 mb-1 text-sm">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}

      {dueInfo && (
        <p className={`text-xs mb-2 ${dueInfo.color}`}>{dueInfo.text}</p>
      )}

      {task.assignees.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          {task.assignees.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-xs"
              title={a.name}
            >
              {a.avatar || a.name[0]}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => onStatusChange(task.id, nextStatus[task.status])}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          {statusLabels[task.status]}
        </button>
        <button
          onClick={() => onEdit(task)}
          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
        >
          编辑
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs px-2 py-1 text-red-400 hover:text-red-600 ml-auto"
        >
          删除
        </button>
      </div>
    </div>
  );
}
