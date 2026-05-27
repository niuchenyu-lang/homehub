import { useState, useEffect, useCallback } from 'react';
import EventModal from './EventModal';

interface Member {
  id: number;
  name: string;
  avatar?: string;
}

interface CalendarEvent {
  id: number;
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
  member_name?: string;
  member_avatar?: string;
}

interface CalendarProps {
  familyId: number;
  members: Member[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function Calendar({ familyId, members }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const params = new URLSearchParams({
        family_id: String(familyId),
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/v1/events?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Fetch events error:', err);
    } finally {
      setLoading(false);
    }
  }, [familyId, year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  function getEventsForDate(day: number): CalendarEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => {
      const start = new Date(e.start_time);
      const eventDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      return eventDate === dateStr;
    });
  }

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const handleDayClick = (day: number) => {
    setEditingEvent(null);
    setSelectedDate(new Date(year, month, day));
    setModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedDate(undefined);
    setModalOpen(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    try {
      const url = eventData.id ? `/api/v1/events/${eventData.id}` : '/api/v1/events';
      const method = eventData.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error('Failed to save event');
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Save event error:', err);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('确定要删除这个事件吗？')) return;
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete event');
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Delete event error:', err);
      alert('删除失败');
    }
  };

  const calendarDays: { day: number; type: 'prev' | 'current' | 'next' }[] = [];

  // Previous month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, type: 'prev' });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, type: 'current' });
  }
  // Next month padding to fill 6 rows (42 cells)
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, type: 'next' });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-gray-900 min-w-[160px] text-center">
            {year}年{month + 1}月
          </h2>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
          >
            →
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          今天
        </button>
      </div>

      {loading && (
        <div className="text-center py-4 text-gray-400 text-sm">加载中...</div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-gray-50 px-2 py-2 text-center text-sm font-medium text-gray-600">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
        {calendarDays.map((cell, idx) => {
          const dayEvents = cell.type === 'current' ? getEventsForDate(cell.day) : [];
          const today = cell.type === 'current' && isToday(cell.day);

          return (
            <div
              key={idx}
              onClick={() => cell.type === 'current' && handleDayClick(cell.day)}
              className={`bg-white min-h-[100px] p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                cell.type !== 'current' ? 'text-gray-300' : 'text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    today ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  {cell.day}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => handleEventClick(ev, e)}
                    className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: e.color + '20', color: e.color, borderLeft: `3px solid ${e.color}` }}
                    title={e.title}
                  >
                    {e.all_day ? '' : new Date(e.start_time).getHours().toString().padStart(2, '0') + ':' + new Date(e.start_time).getMinutes().toString().padStart(2, '0') + ' '}{e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-400 px-1.5">+{dayEvents.length - 3} 更多</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event count summary */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <span>本月共 {events.length} 个事件</span>
        {events.length > 0 && (
          <div className="flex gap-2">
            {Array.from(new Set(events.map((e) => e.event_type))).map((type) => (
              <span key={type} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                {type === 'personal' ? '个人' : type === 'family' ? '家庭' : type === 'task' ? '任务' : type === 'meal' ? '餐食' : '其他'}
                {' '}
                {events.filter((e) => e.event_type === type).length}
              </span>
            ))}
          </div>
        )}
      </div>

      <EventModal
        event={editingEvent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        members={members}
        familyId={familyId}
        defaultDate={selectedDate}
      />
    </div>
  );
}
