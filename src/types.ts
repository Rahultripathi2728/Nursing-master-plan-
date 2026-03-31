
export enum Semester {
  SEM_1 = 1,
  SEM_2 = 2,
  SEM_3 = 3,
  SEM_4 = 4,
  SEM_5 = 5,
  SEM_6 = 6,
  SEM_7 = 7,
  SEM_8 = 8,
}

export enum SlotType {
  THEORY = 'Theory',
  LAB = 'Lab',
  CLINICAL = 'Clinical',
  TEA_BREAK = 'Tea Break',
  LUNCH = 'Lunch',
  EXAM = 'Exam',
  HOLIDAY = 'Holiday',
  PREP_LEAVE = 'Prep Leave',
  ORIENTATION = 'Orientation',
  THEORY_LAB = 'Theory/Lab',
  THEORY_PRACTICAL = 'Theory/Practical',
  SELF_STUDY = 'Self Study',
  CO_CURRICULAR = 'Co-Curricular',
  CA = 'CA',
  LIVE_CLASS = 'Live Class',
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  theoryHours: number;
  labHours: number;
  clinicalHours: number;
  faculty: string;
}

export interface Slot {
  startTime: string;
  endTime: string;
  type: SlotType;
  subjectId?: string;
  durationMinutes: number;
}

export interface DaySchedule {
  date: string;
  isHoliday: boolean;
  holidayName?: string;
  phaseName?: string;
  slots: Slot[];
}

export interface Holiday {
  date: string;
  name: string;
}

export interface CustomScheduleBlock {
  id: string;
  startDate: string;
  endDate: string;
  type: 'Theory' | 'Lab' | 'Clinical' | 'Co-Curricular' | 'Exam' | 'Vacation' | 'Live Class';
  hoursPerDay: number;
}

export interface SemesterData {
  semester: Semester;
  subjects: Subject[];
}

export interface ScheduleStats {
  subjectId: string;
  subjectName: string;
  totalTheory: number;
  totalLab: number;
  totalClinical: number;
  totalCA?: number;
  remainingTheory: number;
  remainingLab: number;
  remainingClinical: number;
  remainingCA?: number;
  scheduledTheory: number;
  scheduledLab: number;
  scheduledClinical: number;
  scheduledCA?: number;
  scheduledOrientation?: number;
}
