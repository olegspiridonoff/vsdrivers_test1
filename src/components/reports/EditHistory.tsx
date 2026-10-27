import { useState } from 'react';
import { ReportEditLog, User } from '../../types';
import { formatDateTime } from '../../utils/calculations';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  wheely_gross: 'Доход Wheely',
  yandex_gross: 'Доход Яндекс',
  own_rent_gross: 'Собств. аренда',
  hourly_rent_hours: 'Почас. часы',
  compensations: 'Компенсации',
  bonuses: 'Бонусы',
  deductions: 'Вычеты',
  total_driver_payout: 'Итого',
};

export const fieldLabel = (field: string): string => FIELD_LABELS[field] || field;

interface EditHistoryProps {
  logs: ReportEditLog[];
  users: User[];
}

export default function EditHistory({ logs, users }: EditHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-gray-700/50">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 transition-all"
      >
        <span className="flex items-center gap-2">
          <History className="w-4 h-4" />
          {logs.length > 0 ? `История изменений (${logs.length})` : 'История изменений'}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Оригинальная запись</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const editor = users.find(u => u.id === log.changed_by_user_id);
                return (
                  <div key={log.id} className="text-sm p-2 bg-gray-700/20 rounded-lg">
                    <span className="text-gray-500">[{formatDateTime(log.changed_at)}]</span>
                    {' '}
                    <span className="text-blue-400">{editor?.username || 'N/A'}</span>
                    {' '}изменил{' '}
                    <span className="text-amber-400">{fieldLabel(log.field_name)}</span>
                    {' '}
                    <span className="text-red-400">{log.old_value}</span>
                    {' → '}
                    <span className="text-green-400">{log.new_value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
