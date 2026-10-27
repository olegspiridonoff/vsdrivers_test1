import React, { useState } from 'react';
import { WeeklyReport } from '../../types';
import {
  PAYOUT_RATES,
  calculateDriverPayout,
  getWeekRange,
  getWeekNumber,
  getAvailableYears,
  formatDate,
  formatCurrency,
} from '../../utils/calculations';
import { Field, TextInput, SelectInput } from '../ui/primitives';

/** Данные недельного отчёта без служебных полей (вход для создания/обновления). */
export type ReportDraft = Omit<WeeklyReport, 'id' | 'created_at' | 'updated_at'>;

interface ReportFormProps {
  report?: WeeklyReport;
  userId: string;
  onSave: (data: ReportDraft) => void | Promise<void>;
  onCancel: () => void;
}

const WEEK_OPTIONS = Array.from({ length: 52 }, (_, i) => ({
  value: i + 1,
  label: `Неделя ${i + 1}`,
}));

const YEAR_OPTIONS = getAvailableYears().map(y => ({ value: y, label: String(y) }));

export default function ReportForm({ report, userId, onSave, onCancel }: ReportFormProps) {
  const [year, setYear] = useState<number>(report?.year || new Date().getFullYear());
  const [weekNumber, setWeekNumber] = useState<number>(report?.week_number || getWeekNumber(new Date()));
  const [wheelyGross, setWheelyGross] = useState<number>(report?.wheely_gross || 0);
  const [yandexGross, setYandexGross] = useState<number>(report?.yandex_gross || 0);
  const [ownRentGross, setOwnRentGross] = useState<number>(report?.own_rent_gross || 0);
  const [hourlyRentHours, setHourlyRentHours] = useState<number>(report?.hourly_rent_hours || 0);
  const [compensations, setCompensations] = useState<number>(report?.compensations || 0);
  const [bonuses, setBonuses] = useState<number>(report?.bonuses || 0);
  const [deductions, setDeductions] = useState<number>(report?.deductions || 0);

  const totalPayout = calculateDriverPayout({
    wheely_gross: wheelyGross,
    yandex_gross: yandexGross,
    own_rent_gross: ownRentGross,
    hourly_rent_hours: hourlyRentHours,
    compensations,
    bonuses,
    deductions,
  });

  const weekRange = getWeekRange(year, weekNumber);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      user_id: userId,
      year,
      week_number: weekNumber,
      wheely_gross: wheelyGross,
      yandex_gross: yandexGross,
      own_rent_gross: ownRentGross,
      hourly_rent_hours: hourlyRentHours,
      compensations,
      bonuses,
      deductions,
      total_driver_payout: totalPayout,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30">
        <h3 className="text-white font-medium mb-3">Отчётный период</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Год">
            <SelectInput value={year} onChange={e => setYear(Number(e.target.value))} options={YEAR_OPTIONS} />
          </Field>
          <Field label="Неделя">
            <SelectInput value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} options={WEEK_OPTIONS} />
          </Field>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          {formatDate(weekRange.start)} — {formatDate(weekRange.end)}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-white font-medium">Доходы (грязные)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Field label="Общий доход Wheely (₽)">
              <TextInput type="number" value={wheelyGross} onChange={e => setWheelyGross(Number(e.target.value))} min="0" />
            </Field>
            <p className="text-green-400 text-xs mt-1">
              Водителю: {formatCurrency(wheelyGross * PAYOUT_RATES.wheelyShare)} ({PAYOUT_RATES.wheelyShare * 100}%)
            </p>
          </div>
          <div>
            <Field label="Общий доход Яндекс (₽)">
              <TextInput type="number" value={yandexGross} onChange={e => setYandexGross(Number(e.target.value))} min="0" />
            </Field>
            <p className="text-green-400 text-xs mt-1">
              Водителю: {formatCurrency(yandexGross * PAYOUT_RATES.yandexShare)} ({PAYOUT_RATES.yandexShare * 100}%)
            </p>
          </div>
          <div>
            <Field label="Собственная аренда (₽)">
              <TextInput type="number" value={ownRentGross} onChange={e => setOwnRentGross(Number(e.target.value))} min="0" />
            </Field>
            <p className="text-green-400 text-xs mt-1">
              Водителю: {formatCurrency(ownRentGross * PAYOUT_RATES.ownRentShare)} ({PAYOUT_RATES.ownRentShare * 100}%)
            </p>
          </div>
          <div>
            <Field label="Почасовая аренда (часы)">
              <TextInput type="number" value={hourlyRentHours} onChange={e => setHourlyRentHours(Number(e.target.value))} min="0" />
            </Field>
            <p className="text-green-400 text-xs mt-1">
              Водителю: {formatCurrency(hourlyRentHours * PAYOUT_RATES.hourlyRentRate)} ({PAYOUT_RATES.hourlyRentRate}₽/час)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-white font-medium">Финансовые корректировки</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Компенсации (+)">
            <TextInput type="number" value={compensations} onChange={e => setCompensations(Number(e.target.value))} min="0" />
          </Field>
          <Field label="Бонусы (+)">
            <TextInput type="number" value={bonuses} onChange={e => setBonuses(Number(e.target.value))} min="0" />
          </Field>
          <Field label="Вычеты (-)">
            <TextInput type="number" value={deductions} onChange={e => setDeductions(Number(e.target.value))} min="0" />
          </Field>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-amber-400 font-medium">Итого к выплате водителю:</span>
          <span className="text-2xl font-bold text-white">{formatCurrency(totalPayout)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-xl transition-all">
          {report ? 'Сохранить изменения' : 'Создать отчёт'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all">
          Отмена
        </button>
      </div>
    </form>
  );
}
