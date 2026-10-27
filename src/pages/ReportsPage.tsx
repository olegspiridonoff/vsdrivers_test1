import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { WeeklyReport } from '../types';
import { Plus } from 'lucide-react';
import ReportForm, { ReportDraft } from '../components/reports/ReportForm';
import ReportList from '../components/reports/ReportList';
import { Alert, SelectInput } from '../components/ui/primitives';

export default function ReportsPage() {
  const { user, users } = useAuth();
  const { reports, addReport, updateReport, deleteReport, getEditLogsByReport } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>(user?.role === 'driver' ? user.id : 'all');
  const [error, setError] = useState('');

  const drivers = useMemo(() => users.filter(u => u.role === 'driver'), [users]);

  const filteredReports = useMemo(() => {
    let filtered: WeeklyReport[] = reports;
    if (user?.role === 'driver') {
      filtered = filtered.filter(r => r.user_id === user.id);
    } else if (selectedDriver !== 'all') {
      filtered = filtered.filter(r => r.user_id === selectedDriver);
    }
    return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports, user, selectedDriver]);

  const handleSave = (data: ReportDraft) => {
    setError('');
    if (editingReport) {
      updateReport(editingReport.id, data, user!.id);
      setEditingReport(null);
    } else {
      const result = addReport(data);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        return;
      }
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Удалить этот отчёт?')) {
      deleteReport(id);
    }
  };

  if (showForm || editingReport) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">
          {editingReport ? 'Редактирование отчёта' : 'Новый отчёт'}
        </h1>
        <Alert kind="error" message={error} />
        <ReportForm
          report={editingReport || undefined}
          userId={editingReport?.user_id || user!.id}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingReport(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Недельные отчёты</h1>
        <div className="flex gap-3">
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <SelectInput
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              className="!w-auto text-sm"
              options={[
                { value: 'all', label: 'Все водители' },
                ...drivers.map(d => ({ value: d.id, label: d.username })),
              ]}
            />
          )}
          {(user?.role === 'driver' || user?.role === 'admin') && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-all">
              <Plus className="w-4 h-4" /> {user.role === 'admin' ? 'Создать отчёт' : 'Новый отчёт'}
            </button>
          )}
        </div>
      </div>

      <ReportList
        reports={filteredReports}
        users={users}
        currentRole={user!.role}
        getLogs={getEditLogsByReport}
        onEdit={setEditingReport}
        onDelete={handleDelete}
      />
    </div>
  );
}

