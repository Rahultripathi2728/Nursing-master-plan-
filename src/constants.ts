import { Semester, SemesterData } from './types';

export const SEMESTER_DATABASE: Record<number, SemesterData> = {
  [Semester.SEM_1]: {
    semester: Semester.SEM_1,
    subjects: [
      { id: 'eng', name: 'Communicative English', code: 'ENG 101', theoryHours: 40, labHours: 0, clinicalHours: 0, faculty: 'Ms. Anjali' },
      { id: 'anat', name: 'Applied Anatomy', code: 'ANAT 102', theoryHours: 60, labHours: 0, clinicalHours: 0, faculty: 'Dr. Sharma' },
      { id: 'phys', name: 'Applied Physiology', code: 'PHYS 103', theoryHours: 60, labHours: 0, clinicalHours: 0, faculty: 'Dr. Verma' },
      { id: 'soc', name: 'Applied Sociology', code: 'SOC 104', theoryHours: 60, labHours: 0, clinicalHours: 0, faculty: 'Ms. Priya' },
      { id: 'psych', name: 'Applied Psychology', code: 'PSYCH 105', theoryHours: 60, labHours: 0, clinicalHours: 0, faculty: 'Ms. Neha' },
      { id: 'nf1', name: 'Nursing Foundation I', code: 'NF 106', theoryHours: 120, labHours: 80, clinicalHours: 160, faculty: 'Ms. Jyoti' },
    ],
  },
  [Semester.SEM_2]: {
    semester: Semester.SEM_2,
    subjects: [
      { id: 'biochem', name: 'Applied Biochemistry', code: 'BIO 201', theoryHours: 40, labHours: 0, clinicalHours: 0, faculty: 'Dr. Gupta' },
      { id: 'nutri', name: 'Applied Nutrition & Dietetics', code: 'NUT 202', theoryHours: 60, labHours: 0, clinicalHours: 0, faculty: 'Ms. Pooja' },
      { id: 'nf2', name: 'Nursing Foundation II', code: 'NF 203', theoryHours: 120, labHours: 120, clinicalHours: 320, faculty: 'Ms. Chandni' },
      { id: 'info', name: 'Health/Nursing Informatics & Tech', code: 'INFO 204', theoryHours: 40, labHours: 40, clinicalHours: 0, faculty: 'Mr. Rahul' },
    ],
  },
  [Semester.SEM_3]: {
    semester: Semester.SEM_3,
    subjects: [
      { id: 'micro', name: 'Applied Microbiology & Infection Control', code: 'MICRO 301', theoryHours: 40, labHours: 40, clinicalHours: 0, faculty: 'Ms. Shivani' },
      { id: 'pharma1', name: 'Pharmacology I', code: 'PHAR 302', theoryHours: 20, labHours: 0, clinicalHours: 0, faculty: 'Dr. Singh' },
      { id: 'patho1', name: 'Pathology I', code: 'PATH 303', theoryHours: 20, labHours: 0, clinicalHours: 0, faculty: 'Dr. Kapoor' },
      { id: 'ahn1', name: 'Adult Health Nursing I', code: 'AHN 304', theoryHours: 140, labHours: 40, clinicalHours: 480, faculty: 'Ms. Neha' },
    ],
  },
  [Semester.SEM_4]: {
    semester: Semester.SEM_4,
    subjects: [
      { id: 'pharma2', name: 'Pharmacology II', code: 'PHAR 401', theoryHours: 60, labHours: 0, clinicalHours: 0, faculty: 'Dr. Singh' },
      { id: 'patho2', name: 'Pathology II & Genetics', code: 'PATH 402', theoryHours: 20, labHours: 0, clinicalHours: 0, faculty: 'Dr. Kapoor' },
      { id: 'ahn2', name: 'Adult Health Nursing II', code: 'AHN 403', theoryHours: 140, labHours: 40, clinicalHours: 480, faculty: 'Ms. Shivani' },
      { id: 'ethics', name: 'Professionalism & Ethics', code: 'ETH 404', theoryHours: 20, labHours: 0, clinicalHours: 0, faculty: 'Ms. Jyoti' },
    ],
  },
  [Semester.SEM_5]: {
    semester: Semester.SEM_5,
    subjects: [
      { id: 'chn1', name: 'Child Health Nursing I', code: 'CHN 501', theoryHours: 60, labHours: 40, clinicalHours: 160, faculty: 'Ms. Pooja' },
      { id: 'mhn1', name: 'Mental Health Nursing I', code: 'MHN 502', theoryHours: 60, labHours: 0, clinicalHours: 80, faculty: 'Ms. Neha' },
      { id: 'com1', name: 'Community Health Nursing I', code: 'COM 503', theoryHours: 100, labHours: 0, clinicalHours: 160, faculty: 'Ms. Chandni' },
      { id: 'edutech', name: 'Educational Technology', code: 'EDU 504', theoryHours: 40, labHours: 40, clinicalHours: 0, faculty: 'Mr. Amit' },
      { id: 'forensic', name: 'Forensic Nursing', code: 'FOR 505', theoryHours: 20, labHours: 0, clinicalHours: 0, faculty: 'Dr. Dixit' },
    ],
  },
  [Semester.SEM_6]: {
    semester: Semester.SEM_6,
    subjects: [
      { id: 'chn2', name: 'Child Health Nursing II', code: 'CHN 601', theoryHours: 40, labHours: 0, clinicalHours: 80, faculty: 'Ms. Shivani' },
      { id: 'mhn2', name: 'Mental Health Nursing II', code: 'MHN 602', theoryHours: 40, labHours: 0, clinicalHours: 160, faculty: 'Ms. Pooja' },
      { id: 'mgmt', name: 'Nursing Management & Leadership', code: 'MGMT 603', theoryHours: 60, labHours: 0, clinicalHours: 80, faculty: 'Ms. Neha' },
      { id: 'obg1', name: 'Midwifery/OBG I', code: 'OBG 604', theoryHours: 60, labHours: 40, clinicalHours: 240, faculty: 'Ms. Jyoti' },
    ],
  },
  [Semester.SEM_7]: {
    semester: Semester.SEM_7,
    subjects: [
      { id: 'com2', name: 'Community Health Nursing II', code: 'COM 701', theoryHours: 100, labHours: 0, clinicalHours: 160, faculty: 'Ms. Chandni' },
      { id: 'research', name: 'Nursing Research & Stats', code: 'RES 702', theoryHours: 40, labHours: 80, clinicalHours: 0, faculty: 'Dr. Mehta' },
      { id: 'obg2', name: 'Midwifery/OBG II', code: 'OBG 703', theoryHours: 60, labHours: 40, clinicalHours: 320, faculty: 'Ms. Jyoti' },
    ],
  },
  [Semester.SEM_8]: {
    semester: Semester.SEM_8,
    subjects: [
      { id: 'intern', name: 'Internship (Integrated Practice)', code: 'INT 801', theoryHours: 0, labHours: 0, clinicalHours: 1152, faculty: 'Ms. Jyoti' },
    ],
  },
};

export const CLINICAL_SCHEDULE: Record<number, { start: number, end: number }[]> = {
  [Semester.SEM_1]: [{ start: 19, end: 22 }],
  [Semester.SEM_2]: [{ start: 2, end: 4 }, { start: 10, end: 12 }, { start: 14, end: 17 }, { start: 19, end: 21 }],
  [Semester.SEM_3]: [{ start: 2, end: 4 }, { start: 10, end: 12 }, { start: 14, end: 17 }, { start: 19, end: 21 }],
  [Semester.SEM_4]: [{ start: 2, end: 8 }, { start: 10, end: 12 }, { start: 19, end: 21 }],
  [Semester.SEM_5]: [{ start: 2, end: 8 }, { start: 10, end: 12 }, { start: 19, end: 21 }],
  [Semester.SEM_6]: [{ start: 2, end: 8 }, { start: 10, end: 12 }, { start: 19, end: 22 }],
  [Semester.SEM_7]: [{ start: 2, end: 8 }, { start: 10, end: 12 }, { start: 19, end: 22 }],
  [Semester.SEM_8]: [{ start: 0, end: 22 }],
};

export const SLOT_TIMINGS = [
  { start: '09:00', end: '10:00', type: 'Theory', duration: 60 },
  { start: '10:00', end: '11:00', type: 'Theory', duration: 60 },
  { start: '11:00', end: '12:00', type: 'Theory', duration: 60 },
  { start: '12:00', end: '13:00', type: 'Theory', duration: 60 },
  { start: '13:00', end: '13:30', type: 'Lunch', duration: 30 },
  { start: '13:30', end: '14:30', type: 'Theory/Practical', duration: 60 },
  { start: '14:30', end: '15:30', type: 'Theory/Practical', duration: 60 },
  { start: '15:30', end: '16:30', type: 'Theory/Practical', duration: 60 },
  { start: '16:30', end: '17:30', type: 'Theory/Practical', duration: 60 },
];
