import { useState, useEffect } from 'react';

interface Member {
  id: number;
  name: string;
  avatar?: string;
  color?: string;
}

interface Event {
  id?: number;
  family_id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  all_day?: boolean;
  location?: string | null;
  event_type?: string;
  color?: string;
  member_id?: number | null;
  task_id?: number | null;
  recurrence_rule?: string | null;
}

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (eventId: number) => void;
  members: Member[];
  familyId: number;
  defaultDate?: Date;
}

const EVENT_COLORS = [
  { label: '蓝色', value: '#3B82F6' },
  { label: '绿色', value: '#10B981' },
  { label: '红色', value: '#EF4444' },
  { label: '黄色', value: '#F59E0B' },
  { label: '紫色', value: '#8B5CF6' },
  { label: '粉色', value: '#EC4899' },
  { label: '灰色', value: '#6B7280' },
];

const EVENT_TYPES = [
  { label: '个人', value: 'personal' },
  { label: '家庭', value: 'family' },
  { label: '任务', value: 'task' },
  { label: '餐食', value: 'meal' },
  { label: '其他', value: 'other' },
];

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EventModal({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  members,
  familyId,
  defaultDate,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('family');
  const [color, setColor] = useState('#3B82F6');
  const [memberId, setMemberId] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setStartTime(formatDateTimeLocal(new Date(event.start_time)));
        setEndTime(event.end_time ? formatDateTimeLocal(new Date(event.end_time)) : '');
        setAllDay(event.all_day || false);
        setLocation(event.location || '');
        setEventType(event.event_type || 'family');
        setColor(event.color || '#3B82F6');
        setMemberId(event.member_id || '');
      } else {
        setTitle('');
        setDescription('');
        setStartTime(formatDateTimeLocal(defaultDate || new Date()));
        setEndTime('');
        setAllDay(false);
        setLocation('');
        setEventType('family');
        setColor('#3B82F6');
        setMemberId('');
      }
    }
  }, [isOpen, event, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) return;

    onSave({
      ...(event?.id ? { id: event.id } : {}),
      family_id: familyId,
      title: title.trim(),
      description: description || null,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      all_day: allDay,
      location: location || null,
      event_type: eventType,
      color,
      member_id: memberId || null,
      task_id: null,
      recurrence_rule: null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {event?.id ? '编辑事件' : '新建事件'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="事件标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEventType(t.value)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    eventType === t.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700">全天事件</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? startTime.split('T')[0] : startTime}
                onChange={(e) => setStartTime(allDay ? e.target.value + 'T00:00' : e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? (endTime ? endTime.split('T')[0] : '') : endTime}
                onChange={(e) => setEndTime(allDay && e.target.value ? e.target.value + 'T00:00' : e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">成员</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有人</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.avatar} {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="可选"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">颜色</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c.value ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="可选"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {event?.id && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(event.id!)}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50"
              >
                删除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
