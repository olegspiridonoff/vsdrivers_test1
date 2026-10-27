import { ReportEditLog, Role, User, WeeklyReport } from '../../types';
import { formatDate, formatCurrency, getWeekRange } from '../../utils/calculations';
import { Card, EmptyState } from '../ui/primitives';
import EditHistory from './EditHistory';

interface ReportListProps {
  reports: WeeklyReport[];
  users: User[];
  currentRole: Role;
  getLogs: (reportId: string) => ReportEditLog[];
  onEdit: (report: WeeklyReport) => void;
  onDelete: (id: string) => void;
}

export default function ReportList({ reports, users, currentRole, getLogs, onEdit, onDelete }: ReportListProps) {
  const canEdit = currentRole === 'manager' || currentRole === 'admin';
  const canDelete = currentRole === 'admin';

  if (reports.length === 0) {
    return <EmptyState title="Отчётов не найдено" />;
  }

  return (
    <div className="space-y-4">
      {reports.map(report => {
        const driver = users.find(u => u.id === report.user_id);
        const weekRange = getWeekRange(report.year, report.week_number);

        return (
          <Card key={report.id} className="overflow-hidden">
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">
                      {report.year}, Неделя {report.week_number}
                    </span>
                    {currentRole !== 'driver' && driver && (
                      <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">
                        {driver.username}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm">
                    {formatDate(weekRange.start)} — {formatDate(weekRange.end)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button onClick={() => onEdit(report)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Редактировать">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => onDelete(report.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Удалить">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Wheely (грязн.)</p>
                  <p className="text-white font-medium">{formatCurrency(report.wheely_gross)}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Яндекс (грязн.)</p>
                  <p className="text-white font-medium">{formatCurrency(report.yandex_gross)}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Собств. аренда</p>
                  <p className="text-white font-medium">{formatCurrency(report.own_rent_gross)}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Почас. часы</p>
                  <p className="text-white font-medium">{report.hourly_rent_hours} ч.</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {report.compensations > 0 && <span className="text-green-400">+Комп: {formatCurrency(report.compensations)}</span>}
                {report.bonuses > 0 && <span className="text-green-400">+Бонус: {formatCurrency(report.bonuses)}</span>}
                {report.deductions > 0 && <span className="text-red-400">-Вычет: {formatCurrency(report.deductions)}</span>}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center">
                <span className="text-gray-400">Итого к выплате:</span>
                <span className="text-xl font-bold text-amber-400">{formatCurrency(report.total_driver_payout)}</span>
              </div>
            </div>

            <EditHistory logs={getLogs(report.id)} users={users} />
          </Card>
        );
      })}
    </div>
  );
}
