import { Holiday } from './types';

const FLOATING_HOLIDAYS: Record<number, Holiday[]> = {
  2024: [
    { date: '2024-03-25', name: 'Holi' },
    { date: '2024-03-29', name: 'Good Friday' },
    { date: '2024-04-11', name: 'Eid ul-Fitr' },
    { date: '2024-04-17', name: 'Ram Navami' },
    { date: '2024-04-21', name: 'Mahavir Jayanti' },
    { date: '2024-05-23', name: 'Buddha Purnima' },
    { date: '2024-06-17', name: 'Id-ul-Juha (Bakrid)' },
    { date: '2024-07-17', name: 'Muharram' },
    { date: '2024-08-19', name: 'Raksha Bandhan' },
    { date: '2024-08-26', name: 'Janmashtami' },
    { date: '2024-10-12', name: 'Dussehra' },
    { date: '2024-10-17', name: 'Valmiki Jayanti' },
    { date: '2024-11-01', name: 'Diwali' },
    { date: '2024-11-12', name: 'Igas Bagwal' },
    { date: '2024-11-15', name: 'Guru Nanak Jayanti' },
  ],
  2025: [
    { date: '2025-03-14', name: 'Holi' },
    { date: '2025-03-31', name: 'Eid ul-Fitr' },
    { date: '2025-04-06', name: 'Ram Navami' },
    { date: '2025-04-10', name: 'Mahavir Jayanti' },
    { date: '2025-04-18', name: 'Good Friday' },
    { date: '2025-05-12', name: 'Buddha Purnima' },
    { date: '2025-06-07', name: 'Id-ul-Juha (Bakrid)' },
    { date: '2025-07-06', name: 'Muharram' },
    { date: '2025-08-09', name: 'Raksha Bandhan' },
    { date: '2025-08-16', name: 'Janmashtami' },
    { date: '2025-10-02', name: 'Dussehra' },
    { date: '2025-10-07', name: 'Valmiki Jayanti' },
    { date: '2025-10-20', name: 'Diwali' },
    { date: '2025-10-21', name: 'Govardhan Puja' },
    { date: '2025-10-22', name: 'Bhai Dooj' },
    { date: '2025-10-31', name: 'Igas Bagwal' },
    { date: '2025-11-05', name: 'Guru Nanak Jayanti' },
  ],
  2026: [
    { date: '2026-03-03', name: 'Holi' },
    { date: '2026-03-20', name: 'Eid ul-Fitr' },
    { date: '2026-03-27', name: 'Ram Navami' },
    { date: '2026-03-31', name: 'Mahavir Jayanti' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-01', name: 'Buddha Purnima' },
    { date: '2026-05-27', name: 'Id-ul-Juha (Bakrid)' },
    { date: '2026-06-26', name: 'Muharram' },
    { date: '2026-08-28', name: 'Raksha Bandhan' },
    { date: '2026-09-04', name: 'Janmashtami' },
    { date: '2026-10-19', name: 'Dussehra' },
    { date: '2026-10-26', name: 'Valmiki Jayanti' },
    { date: '2026-11-08', name: 'Diwali' },
    { date: '2026-11-09', name: 'Govardhan Puja' },
    { date: '2026-11-10', name: 'Bhai Dooj' },
    { date: '2026-11-19', name: 'Igas Bagwal' },
    { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
  ],
  2027: [
    { date: '2027-03-10', name: 'Eid ul-Fitr' },
    { date: '2027-03-22', name: 'Holi' },
    { date: '2027-03-26', name: 'Good Friday' },
    { date: '2027-04-15', name: 'Ram Navami' },
    { date: '2027-04-20', name: 'Mahavir Jayanti' },
    { date: '2027-05-17', name: 'Id-ul-Juha (Bakrid)' },
    { date: '2027-05-20', name: 'Buddha Purnima' },
    { date: '2027-06-15', name: 'Muharram' },
    { date: '2027-08-17', name: 'Raksha Bandhan' },
    { date: '2027-08-25', name: 'Janmashtami' },
    { date: '2027-10-09', name: 'Dussehra' },
    { date: '2027-10-15', name: 'Valmiki Jayanti' },
    { date: '2027-10-29', name: 'Diwali' },
    { date: '2027-11-09', name: 'Igas Bagwal' },
    { date: '2027-11-14', name: 'Guru Nanak Jayanti' },
  ],
  2028: [
    { date: '2028-02-28', name: 'Eid ul-Fitr' },
    { date: '2028-03-11', name: 'Holi' },
    { date: '2028-04-04', name: 'Ram Navami' },
    { date: '2028-04-08', name: 'Mahavir Jayanti' },
    { date: '2028-04-14', name: 'Good Friday' },
    { date: '2028-05-08', name: 'Buddha Purnima' },
    { date: '2028-06-05', name: 'Id-ul-Juha (Bakrid)' },
    { date: '2028-07-04', name: 'Muharram' },
    { date: '2028-08-05', name: 'Raksha Bandhan' },
    { date: '2028-08-13', name: 'Janmashtami' },
    { date: '2028-09-28', name: 'Dussehra' },
    { date: '2028-10-03', name: 'Valmiki Jayanti' },
    { date: '2028-10-17', name: 'Diwali' },
    { date: '2028-10-28', name: 'Igas Bagwal' },
    { date: '2028-11-02', name: 'Guru Nanak Jayanti' },
  ],
  2029: [
    { date: '2029-02-16', name: 'Eid ul-Fitr' },
    { date: '2029-02-28', name: 'Holi' },
    { date: '2029-03-24', name: 'Ram Navami' },
    { date: '2029-03-28', name: 'Mahavir Jayanti' },
    { date: '2029-03-30', name: 'Good Friday' },
    { date: '2029-04-28', name: 'Buddha Purnima' },
    { date: '2029-05-25', name: 'Id-ul-Juha (Bakrid)' },
    { date: '2029-06-23', name: 'Muharram' },
    { date: '2029-08-24', name: 'Raksha Bandhan' },
    { date: '2029-09-01', name: 'Janmashtami' },
    { date: '2029-10-17', name: 'Dussehra' },
    { date: '2029-10-22', name: 'Valmiki Jayanti' },
    { date: '2029-11-05', name: 'Diwali' },
    { date: '2029-11-16', name: 'Igas Bagwal' },
    { date: '2029-11-21', name: 'Guru Nanak Jayanti' },
  ],
  2030: [
    { date: '2030-02-06', name: 'Eid ul-Fitr' },
    { date: '2030-03-19', name: 'Holi' },
    { date: '2030-04-12', name: 'Ram Navami' },
    { date: '2030-04-17', name: 'Mahavir Jayanti' },
    { date: '2030-04-19', name: 'Good Friday' },
    { date: '2030-05-17', name: 'Buddha Purnima' },
    { date: '2030-06-14', name: 'Id-ul-Juha (Bakrid)' },
    { date: '2030-07-13', name: 'Muharram' },
    { date: '2030-08-13', name: 'Raksha Bandhan' },
    { date: '2030-08-21', name: 'Janmashtami' },
    { date: '2030-10-06', name: 'Dussehra' },
    { date: '2030-10-11', name: 'Valmiki Jayanti' },
    { date: '2030-10-26', name: 'Diwali' },
    { date: '2030-11-06', name: 'Igas Bagwal' },
    { date: '2030-11-10', name: 'Guru Nanak Jayanti' },
  ]
};

const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'New Year' },
  { month: 1, day: 26, name: 'Republic Day' },
  { month: 4, day: 14, name: 'Ambedkar Jayanti' },
  { month: 5, day: 1, name: 'Labour Day' },
  { month: 7, day: 16, name: 'Harela' },
  { month: 8, day: 15, name: 'Independence Day' },
  { month: 9, day: 5, name: "Teacher's Day" },
  { month: 10, day: 2, name: 'Gandhi Jayanti' },
  { month: 11, day: 24, name: 'Guru Teg Bahadur Martyrdom Day' },
  { month: 12, day: 25, name: 'Christmas' }
];

export const FIXED_HOLIDAYS_NAMES = FIXED_HOLIDAYS.map(h => h.name);

export function generateHolidaysForPeriod(startDateStr: string, endDateStr: string): Holiday[] {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  const generatedHolidays: Holiday[] = [];

  for (let year = startYear; year <= endYear; year++) {
    // Add fixed holidays
    FIXED_HOLIDAYS.forEach(fh => {
      const dateStr = `${year}-${String(fh.month).padStart(2, '0')}-${String(fh.day).padStart(2, '0')}`;
      const dateObj = new Date(dateStr + 'T00:00:00');
      if (dateObj >= start && dateObj <= end) {
        generatedHolidays.push({ date: dateStr, name: fh.name });
      }
    });

    // Add floating holidays
    if (FLOATING_HOLIDAYS[year]) {
      FLOATING_HOLIDAYS[year].forEach(fh => {
        const dateObj = new Date(fh.date + 'T00:00:00');
        if (dateObj >= start && dateObj <= end) {
          generatedHolidays.push(fh);
        }
      });
    }
  }

  // Sort by date
  return generatedHolidays.sort((a, b) => a.date.localeCompare(b.date));
}
