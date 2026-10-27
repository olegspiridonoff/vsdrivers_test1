import { WeeklyReport } from '../types';
import { generateId } from './id';
import { calculateDriverPayout, getWeekNumber } from './calculations';
import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

export function generateDemoData(): Partial<WeeklyReport>[] {
  const now = new Date();
  const year = now.getFullYear();
  const currentWeek = getWeekNumber(now);
  
  const reports: Partial<WeeklyReport>[] = [];
  
  // Generate 8 weeks of data for driver_1
  for (let w = Math.max(1, currentWeek - 7); w <= currentWeek; w++) {
    reports.push({
      user_id: 'driver_1',
      year,
      week_number: w,
      wheely_gross: 30000 + Math.random() * 20000,
      yandex_gross: 25000 + Math.random() * 15000,
      own_rent_gross: 15000 + Math.random() * 10000,
      hourly_rent_hours: 20 + Math.floor(Math.random() * 20),
      compensations: Math.random() > 0.7 ? Math.floor(Math.random() * 3000) : 0,
      bonuses: Math.random() > 0.5 ? Math.floor(Math.random() * 5000) : 0,
      deductions: Math.random() > 0.6 ? Math.floor(Math.random() * 2000) : 0
    });
  }
  
  // Generate 8 weeks of data for driver_2
  for (let w = Math.max(1, currentWeek - 7); w <= currentWeek; w++) {
    reports.push({
      user_id: 'driver_2',
      year,
      week_number: w,
      wheely_gross: 25000 + Math.random() * 18000,
      yandex_gross: 20000 + Math.random() * 12000,
      own_rent_gross: 10000 + Math.random() * 8000,
      hourly_rent_hours: 15 + Math.floor(Math.random() * 25),
      compensations: Math.random() > 0.8 ? Math.floor(Math.random() * 2000) : 0,
      bonuses: Math.random() > 0.6 ? Math.floor(Math.random() * 3000) : 0,
      deductions: Math.random() > 0.5 ? Math.floor(Math.random() * 1500) : 0
    });
  }
  
  return reports;
}

export function initializeDemoData() {
  const existing = readJSON<WeeklyReport[]>(STORAGE_KEYS.reports, []);
  if (existing.length > 0) return;

  const demoReports = generateDemoData();
  const now = new Date().toISOString();

  const fullReports: WeeklyReport[] = demoReports.map(r => ({
    id: generateId(),
    user_id: r.user_id!,
    year: r.year!,
    week_number: r.week_number!,
    wheely_gross: Math.round(r.wheely_gross!),
    yandex_gross: Math.round(r.yandex_gross!),
    own_rent_gross: Math.round(r.own_rent_gross!),
    hourly_rent_hours: r.hourly_rent_hours!,
    compensations: Math.round(r.compensations!),
    bonuses: Math.round(r.bonuses!),
    deductions: Math.round(r.deductions!),
    total_driver_payout: Math.round(
      calculateDriverPayout({
        wheely_gross: r.wheely_gross!,
        yandex_gross: r.yandex_gross!,
        own_rent_gross: r.own_rent_gross!,
        hourly_rent_hours: r.hourly_rent_hours!,
        compensations: r.compensations!,
        bonuses: r.bonuses!,
        deductions: r.deductions!,
      })
    ),
    created_at: now,
    updated_at: now
  }));

  writeJSON(STORAGE_KEYS.reports, fullReports);
}
