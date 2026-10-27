/**
 * Доменные константы расчёта выплат водителя.
 * Единственное место, где задаются проценты агрегаторов и ставка почасовой аренды.
 */
export const PAYOUT_RATES = {
  /** Комиссия водителя с выручки Wheely (доля от «грязных» сборов). */
  wheelyShare: 0.30,
  /** Комиссия водителя с выручки Яндекс.Такси. */
  yandexShare: 0.35,
  /** Доля водителя при работе на собственной аренде. */
  ownRentShare: 0.30,
  /** Ставка почасовой аренды, ₽/час. */
  hourlyRentRate: 500,
} as const;

/** Поля отчёта, участвующие в расчёте выплаты. */
export interface PayoutInput {
  wheely_gross: number;
  yandex_gross: number;
  own_rent_gross: number;
  hourly_rent_hours: number;
  compensations: number;
  bonuses: number;
  deductions: number;
}

/** Разложение выплаты по источникам дохода (для дашбордов и диаграмм). */
export interface PayoutBreakdown {
  wheely: number;
  yandex: number;
  ownRent: number;
  hourlyRent: number;
}

/**
 * Расчёт итоговой выплаты водителю по полям отчёта.
 * Использует единые доменные константы PAYOUT_RATES.
 */
export function calculateDriverPayout(input: PayoutInput): number {
  const { wheelyShare, yandexShare, ownRentShare, hourlyRentRate } = PAYOUT_RATES;
  return (
    input.wheely_gross * wheelyShare +
    input.yandex_gross * yandexShare +
    input.own_rent_gross * ownRentShare +
    input.hourly_rent_hours * hourlyRentRate +
    input.compensations +
    input.bonuses -
    input.deductions
  );
}

/**
 * Селектор: разложение «грязных» сборов отчёта на доли водителя
 * по каждому источнику. Итоговая выплата = сумма breakdown
 * + компенсация + бонусы − вычеты (см. calculateDriverPayout).
 */
export function payoutBySource(report: PayoutInput): PayoutBreakdown {
  const { wheelyShare, yandexShare, ownRentShare, hourlyRentRate } = PAYOUT_RATES;
  return {
    wheely: report.wheely_gross * wheelyShare,
    yandex: report.yandex_gross * yandexShare,
    ownRent: report.own_rent_gross * ownRentShare,
    hourlyRent: report.hourly_rent_hours * hourlyRentRate,
  };
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekRange(year: number, weekNumber: number): { start: Date; end: Date } {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const start = new Date(jan1);
  start.setDate(jan1.getDate() + (weekNumber - 1) * 7 - (dayOfWeek - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

/** Список доступных отчётных годов: текущий ± span (по умолчанию ±2). */
export function getAvailableYears(span = 2): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: span * 2 + 1 }, (_, i) => current - span + i);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount);
}

export function hashPassword(password: string): string {
  // Simple hash for demo (in real PHP app, use password_hash)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hashed_' + Math.abs(hash).toString(36) + '_' + password.length;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function exportToCSV(reports: any[], users: any[], filename: string = 'reports.csv') {
  const headers = ['Водитель', 'Год', 'Неделя', 'Wheely (грязные)', 'Яндекс (грязные)', 'Собств. аренда', 'Почас. часы', 'Компенсации', 'Бонусы', 'Вычеты', 'Итого к выплате'];
  const rows = reports.map(r => {
    const user = users.find(u => u.id === r.user_id);
    return [
      user?.username || 'N/A',
      r.year,
      r.week_number,
      r.wheely_gross,
      r.yandex_gross,
      r.own_rent_gross,
      r.hourly_rent_hours,
      r.compensations,
      r.bonuses,
      r.deductions,
      r.total_driver_payout.toFixed(2)
    ];
  });

  const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
