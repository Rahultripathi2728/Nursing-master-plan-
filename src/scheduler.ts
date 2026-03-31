import { Semester, Holiday, DaySchedule, SlotType, ScheduleStats } from './types';
import { SEMESTER_DATABASE } from './constants';
import sem1Template from './sem1_template.json';
import sem2Template from './sem2_template.json';
import sem3Template from './sem3_template.json';
import sem4Template from './sem4_template.json';
import sem5Template from './sem5_template.json';
import sem6Template from './sem6_template.json';
import sem7Template from './sem7_template.json';
import sem8Template from './sem8_template.json';

export interface TimetablePhase {
  name: string;
  startDate: string;
  endDate: string;
  type: 'Theory' | 'Clinical' | 'Exam' | 'Vacation' | 'MidTerm';
}

export interface MonthlyBlock {
  monthName: string;
  startDate: string;
  endDate: string;
  phases: TimetablePhase[];
  days: DaySchedule[];
  statsAfterMonth: ScheduleStats[];
  workingDays: number;
}

class TemplateAdapter {
  private semesterData: any;
  private startDate: Date;
  private holidays: Set<string>;
  private fullHolidays: Holiday[];
  private semester: Semester;
  private template: any;
  private midTerm1Week?: number;
  private midTerm2Week?: number;

  constructor(
    semester: Semester, 
    startDate: string, 
    holidays: Holiday[], 
    template: any,
    midTerm1Week?: number,
    midTerm2Week?: number
  ) {
    this.semester = semester;
    this.semesterData = SEMESTER_DATABASE[semester];
    // Parse as local date to match App.tsx
    this.startDate = new Date(startDate + 'T00:00:00');
    this.holidays = new Set(holidays.map(h => h.date));
    this.fullHolidays = holidays;
    this.template = template;
    this.midTerm1Week = midTerm1Week;
    this.midTerm2Week = midTerm2Week;
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getAdjustedTemplate(): any[] {
    // 1. Flatten the template into 26 individual weeks
    const flatTemplate: any[] = [];
    this.template.forEach((p: any) => {
      const weekStr = String(p.week);
      let start = 0, end = 0;
      if (weekStr.includes('-')) {
        [start, end] = weekStr.split('-').map(Number);
      } else {
        start = end = Number(weekStr);
      }
      for (let w = start; w <= end; w++) {
        flatTemplate.push({ ...p, week: w });
      }
    });

    // Sort by week just in case
    flatTemplate.sort((a, b) => a.week - b.week);

    // 2. Find actual festival week
    let actualFestivalWeek = -1;
    let vacationName = "Festival Vacation";
    for (let w = 0; w < 26; w++) {
      const weekStart = new Date(this.startDate);
      weekStart.setDate(weekStart.getDate() + (w * 7));
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        weekDates.push(this.formatDate(d));
      }
      const weekHolidays = this.fullHolidays.filter(h => weekDates.includes(h.date));
      const diwali = weekHolidays.find(h => h.name.toLowerCase().includes('diwali'));
      const holi = weekHolidays.find(h => h.name.toLowerCase().includes('holi'));
      if (diwali || holi) {
        actualFestivalWeek = w + 1;
        vacationName = diwali ? 'Diwali Vacation' : 'Holi Vacation';
        break;
      }
    }

    // 3. Identify fixed blocks and flexible blocks
    const mt1Week = this.midTerm1Week || 10;
    const mt2Week = this.midTerm2Week || 19;

    // Create a 26-week array
    const adjusted: any[] = new Array(26).fill(null);
    
    // Find the original MT1, MT2 and Vacation blocks from the template
    const mt1Block = flatTemplate.find(p => p.phase === 'I IA' || p.phase === 'I Mid Term');
    const mt2Block = flatTemplate.find(p => p.phase === 'II IA' || p.phase === 'II Mid Term');
    const vacationBlock = flatTemplate.find(p => p.phase?.toLowerCase().includes('vacation') || p.phase?.toLowerCase().includes('festival'));
    
    // Place MT1 and MT2 at their fixed weeks
    if (mt1Week >= 1 && mt1Week <= 26 && mt1Block) {
      adjusted[mt1Week - 1] = { ...mt1Block, week: mt1Week };
    }
    if (mt2Week >= 1 && mt2Week <= 26 && mt2Block) {
      if (!adjusted[mt2Week - 1]) {
        adjusted[mt2Week - 1] = { ...mt2Block, week: mt2Week };
      }
    }
    
    // Place Vacation at its actual week
    if (actualFestivalWeek !== -1 && actualFestivalWeek >= 1 && actualFestivalWeek <= 26 && vacationBlock) {
      if (!adjusted[actualFestivalWeek - 1]) {
        adjusted[actualFestivalWeek - 1] = { ...vacationBlock, phase: vacationName, week: actualFestivalWeek };
      }
    }

    // Now fill the rest with flexible blocks in order
    const flexibleBlocks = flatTemplate.filter(p => {
      const isMT1 = p.phase === 'I IA' || p.phase === 'I Mid Term';
      const isMT2 = p.phase === 'II IA' || p.phase === 'II Mid Term';
      const isVacation = p.phase?.toLowerCase().includes('vacation') || p.phase?.toLowerCase().includes('festival');
      
      if (isMT1 || isMT2) return false;
      if (isVacation && actualFestivalWeek !== -1) return false; // Fixed by holiday
      return true;
    });

    let flexIdx = 0;
    for (let i = 0; i < 26; i++) {
      if (!adjusted[i]) {
        if (flexIdx < flexibleBlocks.length) {
          adjusted[i] = { ...flexibleBlocks[flexIdx], week: i + 1 };
          flexIdx++;
        } else if (flatTemplate.length > 0) {
          // Fallback
          adjusted[i] = { ...flatTemplate[flatTemplate.length - 1], week: i + 1 };
        } else {
          // Absolute fallback
          adjusted[i] = { phase: 'Theory Block', activities: [], week: i + 1 };
        }
      }
    }

    return adjusted;
  }

  public generate(): { blocks: MonthlyBlock[], finalStats: ScheduleStats[] } {
    const blocks: MonthlyBlock[] = [];
    const adjustedTemplate = this.getAdjustedTemplate();
    
    let currentDate = new Date(this.startDate);
    let currentMonth = currentDate.getMonth();
    let monthDays: DaySchedule[] = [];
    let workingDaysCount = 0;
    let phases: TimetablePhase[] = [];
    let monthStart = new Date(currentDate);

    const pushMonth = (monthEnd: Date) => {
      if (monthDays.length > 0) {
        blocks.push({
          monthName: monthStart.toLocaleString('default', { month: 'long', year: 'numeric' }),
          startDate: this.formatDate(monthStart),
          endDate: this.formatDate(monthEnd),
          phases: [...phases],
          days: [...monthDays],
          workingDays: workingDaysCount,
          statsAfterMonth: []
        });
      }
      monthDays = [];
      workingDaysCount = 0;
      phases = [];
    };

    // Iterate through 26 weeks
    for (let w = 0; w < 26; w++) {
      const templatePhase = adjustedTemplate[w];
      if (!templatePhase) continue;
      
      const isVacationWeek = templatePhase.phase?.toLowerCase().includes('vacation') || false;
      const vacationName = templatePhase.phase || 'Vacation';

      // Process days of the week
      for (let i = 0; i < 7; i++) {
        const dateStr = this.formatDate(currentDate);
        const dayOfWeek = currentDate.getDay();
        
        if (currentDate.getMonth() !== currentMonth) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          pushMonth(prevDate);
          currentMonth = currentDate.getMonth();
          monthStart = new Date(currentDate);
        }

        // Check if current phase has clinical activities
        const isClinicalPhase = templatePhase?.phase?.toLowerCase().includes('clinical');
        const hasClinical = isClinicalPhase || templatePhase?.activities?.some((act: any) => 
          act.type?.toLowerCase().includes('clinical') || act.type === SlotType.CLINICAL
        );

        // Check if this specific date is a named holiday
        const holiday = this.fullHolidays.find(h => h.date === dateStr);
        
        // If it's a vacation week, all working days are holidays
        const isHoliday = dayOfWeek === 0 || isVacationWeek || (!hasClinical && (dayOfWeek === 6 || this.holidays.has(dateStr)));
        
        let phaseName = templatePhase.phase;
        
        const daySchedule: DaySchedule = {
          date: dateStr,
          isHoliday,
          holidayName: isHoliday ? (holiday?.name || (isVacationWeek ? vacationName : (dayOfWeek === 0 ? 'Sunday' : (dayOfWeek === 6 ? 'Saturday' : 'Holiday')))) : undefined,
          phaseName: phaseName,
          slots: []
        };

        if (!isHoliday && templatePhase) {
          workingDaysCount++;
          let startTimeMins = 9 * 60; // 9:00 AM

          // Assign slots based on template activities
          (templatePhase.activities || []).forEach((act: any) => {
            const durationMins = act.hoursPerDay * 60;
            const startHr = Math.floor(startTimeMins / 60);
            const startMin = startTimeMins % 60;
            const endHr = Math.floor((startTimeMins + durationMins) / 60);
            const endMin = (startTimeMins + durationMins) % 60;

            daySchedule.slots.push({
              startTime: `${String(startHr).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
              endTime: `${String(endHr).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
              type: act.type as SlotType,
              durationMinutes: durationMins
            });
            
            startTimeMins += durationMins;
          });
        } else if (isHoliday) {
           daySchedule.slots.push({
              startTime: '09:00',
              endTime: '17:00',
              type: SlotType.HOLIDAY,
              durationMinutes: 480
           });
        }
        
        monthDays.push(daySchedule);

        if (phases.length === 0 || phases[phases.length - 1].name !== phaseName) {
          phases.push({
            name: phaseName,
            startDate: dateStr,
            endDate: dateStr,
            type: 'Theory'
          });
        } else {
          phases[phases.length - 1].endDate = dateStr;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    pushMonth(currentDate);
    
    // Calculate total hours from all slots
    let totalTheory = 0, totalLab = 0, totalClinical = 0, totalCA = 0, totalOrientation = 0;
    blocks.forEach(b => b.days.forEach(d => d.slots.forEach(s => {
      const hrs = s.durationMinutes / 60;
      if (s.type === SlotType.THEORY) totalTheory += hrs;
      else if (s.type === SlotType.LAB || s.type === SlotType.LIVE_CLASS) totalLab += hrs;
      else if (s.type === SlotType.CLINICAL) totalClinical += hrs;
      else if (s.type === SlotType.CA || s.type === SlotType.CO_CURRICULAR) totalCA += hrs;
      else if (s.type === SlotType.ORIENTATION) totalOrientation += hrs;
    })));

    const totalStipulatedTheory = this.semesterData.subjects.reduce((sum: number, sub: any) => sum + sub.theoryHours, 0);
    const totalStipulatedLab = this.semesterData.subjects.reduce((sum: number, sub: any) => sum + sub.labHours, 0);
    const totalStipulatedClinical = this.semesterData.subjects.reduce((sum: number, sub: any) => sum + sub.clinicalHours, 0);

    let remainingTheory = totalTheory;
    let remainingLab = totalLab;
    let remainingClinical = totalClinical;

    const lastTheoryIdx = this.semesterData.subjects.map((s: any) => s.theoryHours > 0).lastIndexOf(true);
    const lastLabIdx = this.semesterData.subjects.map((s: any) => s.labHours > 0).lastIndexOf(true);
    const lastClinicalIdx = this.semesterData.subjects.map((s: any) => s.clinicalHours > 0).lastIndexOf(true);

    const finalStats = this.semesterData.subjects.map((sub: any, index: number) => {
      let theoryAllocated = totalStipulatedTheory > 0 ? Math.round((sub.theoryHours / totalStipulatedTheory) * totalTheory) : 0;
      if (index === lastTheoryIdx && totalStipulatedTheory > 0) theoryAllocated = remainingTheory;
      remainingTheory -= theoryAllocated;

      let labAllocated = totalStipulatedLab > 0 ? Math.round((sub.labHours / totalStipulatedLab) * totalLab) : 0;
      if (index === lastLabIdx && totalStipulatedLab > 0) labAllocated = remainingLab;
      remainingLab -= labAllocated;

      let clinicalAllocated = totalStipulatedClinical > 0 ? Math.round((sub.clinicalHours / totalStipulatedClinical) * totalClinical) : 0;
      if (index === lastClinicalIdx && totalStipulatedClinical > 0) clinicalAllocated = remainingClinical;
      remainingClinical -= clinicalAllocated;

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        totalTheory: sub.theoryHours,
        totalLab: sub.labHours,
        totalClinical: sub.clinicalHours,
        remainingTheory: Math.max(0, sub.theoryHours - theoryAllocated),
        remainingLab: Math.max(0, sub.labHours - labAllocated),
        remainingClinical: Math.max(0, sub.clinicalHours - clinicalAllocated),
        scheduledTheory: theoryAllocated,
        scheduledLab: labAllocated,
        scheduledClinical: clinicalAllocated,
        scheduledCA: 0,
        scheduledOrientation: 0
      };
    });

    return { blocks, finalStats };
  }
}

export function generateSchedule(
  semester: Semester, 
  startDate: string, 
  customHolidays: Holiday[] = [],
  clinicalMode: boolean = false,
  midTerm1Week?: number,
  midTerm2Week?: number
): { blocks: MonthlyBlock[], finalStats: ScheduleStats[], bottlenecks: ScheduleStats[] } {
  let templateToUse = [];
  if (semester === Semester.SEM_1) templateToUse = sem1Template;
  else if (semester === Semester.SEM_2) templateToUse = sem2Template;
  else if (semester === Semester.SEM_3) templateToUse = sem3Template;
  else if (semester === Semester.SEM_4) templateToUse = sem4Template;
  else if (semester === Semester.SEM_5) templateToUse = sem5Template;
  else if (semester === Semester.SEM_6) templateToUse = sem6Template;
  else if (semester === Semester.SEM_7) templateToUse = sem7Template;
  else if (semester === Semester.SEM_8) templateToUse = sem8Template;
  
  const adapter = new TemplateAdapter(semester, startDate, customHolidays, templateToUse, midTerm1Week, midTerm2Week);
  const { blocks, finalStats } = adapter.generate();
  
  return { 
    blocks, 
    finalStats,
    bottlenecks: []
  };
}
