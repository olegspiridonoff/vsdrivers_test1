import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WeeklyReport, ReportEditLog } from '../types';
import { reportsApi } from '../api';
import type { MutationResult, NewReport } from '../api';

interface DataContextType {
  reports: WeeklyReport[];
  editLogs: ReportEditLog[];
  /** Отчёты и журнал ещё загружаются через API-слой. */
  loading: boolean;
  addReport: (report: NewReport) => Promise<MutationResult>;
  updateReport: (id: string, data: Partial<WeeklyReport>, changedByUserId: string) => Promise<MutationResult>;
  deleteReport: (id: string) => Promise<MutationResult>;
  getReportById: (id: string) => WeeklyReport | undefined;
  getReportsByUser: (userId: string) => WeeklyReport[];
  getEditLogsByReport: (reportId: string) => ReportEditLog[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [editLogs, setEditLogs] = useState<ReportEditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Первичная загрузка через API-слой (mock → localStorage + демо-данные).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, l] = await Promise.all([reportsApi.listReports(), reportsApi.listEditLogs()]);
        if (cancelled) return;
        setReports(r);
        setEditLogs(l);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    const [r, l] = await Promise.all([reportsApi.listReports(), reportsApi.listEditLogs()]);
    setReports(r);
    setEditLogs(l);
  };

  const addReport = async (report: NewReport): Promise<MutationResult> => {
    const result = await reportsApi.addReport(report);
    if (result.success) await refresh();
    return result;
  };

  const updateReport = async (
    id: string,
    data: Partial<WeeklyReport>,
    changedByUserId: string
  ): Promise<MutationResult> => {
    const result = await reportsApi.updateReport(id, data, changedByUserId);
    if (result.success) await refresh();
    return result;
  };

  const deleteReport = async (id: string): Promise<MutationResult> => {
    const result = await reportsApi.deleteReport(id);
    if (result.success) await refresh();
    return result;
  };

  const getReportById = (id: string) => reports.find(r => r.id === id);
  const getReportsByUser = (userId: string) => reports.filter(r => r.user_id === userId);
  const getEditLogsByReport = (reportId: string) => editLogs.filter(l => l.report_id === reportId);

  return (
    <DataContext.Provider value={{
      reports, editLogs, loading, addReport, updateReport, deleteReport,
      getReportById, getReportsByUser, getEditLogsByReport
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
