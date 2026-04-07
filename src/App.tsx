import React, { useState, useMemo, useEffect, Component } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  Download,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Trash2,
  LayoutDashboard,
  Menu,
  LogIn,
  LogOut,
  Cloud,
  GraduationCap,
  Settings,
  CalendarDays,
  Plus,
  Edit2,
  Edit3,
  Save,
  X,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Semester, 
  DaySchedule, 
  ScheduleStats, 
  SlotType,
  Holiday,
  CustomScheduleBlock,
  SemesterData
} from './types';
import { SEMESTER_DATABASE, SLOT_TIMINGS } from './constants';
import { generateSchedule, getDefaultTemplate } from './scheduler';
import { generateHolidaysForPeriod, FIXED_HOLIDAYS_NAMES } from './holidayUtils';

// --- Components ---
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardHeader } from './components/DashboardHeader';
import { getPhaseColor, getSlotColor } from './utils/colors';
import { exportToPDF } from './utils/pdfExport';

export default function App() {
  const [step, setStep] = useState(1);
  const [semesterType, setSemesterType] = useState<'odd' | 'even'>('odd');
  const [startDate, setStartDate] = useState('2025-08-04');
  const [midTerm1Week, setMidTerm1Week] = useState<number>(10);
  const [midTerm2Week, setMidTerm2Week] = useState<number>(19);
  const [isCalculated, setIsCalculated] = useState(false);
  const [semesterData, setSemesterData] = useState<Record<number, SemesterData>>(SEMESTER_DATABASE);
  const [isManagingSubjects, setIsManagingSubjects] = useState(false);
  const [isEditingMasterPlan, setIsEditingMasterPlan] = useState(false);
  const [showSubjectDistribution, setShowSubjectDistribution] = useState(false);
  const [showSubjectSummary, setShowSubjectSummary] = useState(false);
  const [subjectHoursDraft, setSubjectHoursDraft] = useState<Record<number, any[]>>({});
  const [initialSubjectHours, setInitialSubjectHours] = useState<Record<number, any[]>>({});
  const [draftTemplates, setDraftTemplates] = useState<Record<number, any[]>>({});
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Record<number, any[]>>({});
  const [selectedBlock, setSelectedBlock] = useState<{ semester: number, start: number, end: number } | null>(null);

  const handleUpdateSubjectHours = (sem: number, subjectId: string, field: 'theoryHours' | 'labHours' | 'clinicalHours', value: number) => {
    setSemesterData(prev => {
      const newSemData = { ...prev };
      const subjects = [...newSemData[sem].subjects];
      const subIdx = subjects.findIndex(s => s.id === subjectId);
      if (subIdx !== -1) {
        subjects[subIdx] = { ...subjects[subIdx], [field]: value };
        newSemData[sem] = { ...newSemData[sem], subjects };
      }
      return newSemData;
    });
  };

  useEffect(() => {
    if (isEditingMasterPlan) {
      const initialDraft: Record<number, any[]> = {};
      const initialRef: Record<number, any[]> = {};
      semesters.forEach(sem => {
        const stats = getSemesterStats(sem);
        initialRef[sem] = JSON.parse(JSON.stringify(semesterData[sem].subjects));
        initialDraft[sem] = semesterData[sem].subjects.map(sub => {
          const alloc = stats.finalStats.find((s: any) => s.subjectId === sub.id);
          return {
            ...sub,
            theoryHours: alloc ? alloc.scheduledTheory : sub.theoryHours,
            labHours: alloc ? alloc.scheduledLab : sub.labHours,
            clinicalHours: alloc ? alloc.scheduledClinical : sub.clinicalHours,
          };
        });
      });
      setSubjectHoursDraft(initialDraft);
      setInitialSubjectHours(initialRef);
    }
  }, [isEditingMasterPlan]);

  const syncDraftWithGrid = (sem: number) => {
    const stats = getSemesterStats(sem);
    setSubjectHoursDraft(prev => ({
      ...prev,
      [sem]: semesterData[sem].subjects.map(sub => {
        const alloc = stats.finalStats.find((s: any) => s.subjectId === sub.id);
        return {
          ...sub,
          theoryHours: alloc ? alloc.scheduledTheory : sub.theoryHours,
          labHours: alloc ? alloc.scheduledLab : sub.labHours,
          clinicalHours: alloc ? alloc.scheduledClinical : sub.clinicalHours,
        };
      })
    }));
  };

  const handleUpdateDraftHours = (sem: number, subjectId: string, field: 'theoryHours' | 'labHours' | 'clinicalHours', value: number) => {
    setSubjectHoursDraft(prev => {
      const newDraft = { ...prev };
      const subjects = [...(newDraft[sem] || [])];
      const subIdx = subjects.findIndex(s => s.id === subjectId);
      if (subIdx !== -1) {
        subjects[subIdx] = { ...subjects[subIdx], [field]: value };
        newDraft[sem] = subjects;
      }
      return newDraft;
    });
  };

  const balanceDraftHours = (sem: number, field: 'theoryHours' | 'labHours' | 'clinicalHours') => {
    const stats = getSemesterStats(sem);
    if (!stats) return;
    const pool = field === 'theoryHours' ? stats.totalTheory : field === 'labHours' ? stats.totalLab : stats.totalClinical;
    
    setSubjectHoursDraft(prev => {
      const newDraft = { ...prev };
      const subjects = [...(newDraft[sem] || [])];
      const currentSum = subjects.reduce((s, sub) => s + sub[field], 0);
      const diff = pool - currentSum;
      
      if (Math.abs(diff) < 0.1) return prev;

      // Simple distribution: add the difference to the first subject that has hours, 
      // or distribute if user wants "automatic division"
      const perSubject = Math.floor(diff / subjects.length);
      const remainder = diff % subjects.length;

      const updatedSubjects = subjects.map((sub, idx) => ({
        ...sub,
        [field]: Math.max(0, sub[field] + perSubject + (idx === 0 ? remainder : 0))
      }));

      newDraft[sem] = updatedSubjects;
      return newDraft;
    });
  };

  const applySubjectHours = (sem: number) => {
    setSemesterData(prev => ({
      ...prev,
      [sem]: {
        ...prev[sem],
        subjects: subjectHoursDraft[sem]
      }
    }));
    alert(`Subject hours for Semester ${sem} updated successfully.`);
  };

  const [collegeName, setCollegeName] = useState('College of Nursing');
  const [campusName, setCampusName] = useState('University Campus');

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const start = '2025-08-04';
    const d = new Date(start + 'T00:00:00');
    d.setDate(d.getDate() + (26 * 7) - 1);
    const end = d.toISOString().split('T')[0];
    return generateHolidaysForPeriod(start, end);
  });

  // Snap startDate to Monday
  useEffect(() => {
    const d = new Date(startDate + 'T00:00:00');
    if (d.getDay() !== 1) {
      const day = d.getDay();
      const diff = day === 0 ? 1 : 1 - day;
      d.setDate(d.getDate() + diff);
      const newDate = d.toISOString().split('T')[0];
      if (newDate !== startDate) {
        setStartDate(newDate);
      }
    }
  }, [startDate]);

  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [masterPlanFilter, setMasterPlanFilter] = useState<string>('all');

  // Derived Data
  const endDate = useMemo(() => {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + (26 * 7) - 1);
    return d.toISOString().split('T')[0];
  }, [startDate]);

  // Auto-generate holidays when startDate changes
  useEffect(() => {
    const generated = generateHolidaysForPeriod(startDate, endDate);
    setHolidays(prev => {
      // Keep any custom holidays that the user manually added
      const customHolidays = prev.filter(h => !generated.some(gh => gh.date === h.date && gh.name === h.name) && !FIXED_HOLIDAYS_NAMES.includes(h.name));
      
      const newHolidays = [...generated];
      customHolidays.forEach(ch => {
        if (ch.date >= startDate && ch.date <= endDate && !newHolidays.some(nh => nh.date === ch.date)) {
          newHolidays.push(ch);
        }
      });
      return newHolidays.sort((a, b) => a.date.localeCompare(b.date));
    });
  }, [startDate, endDate]);

  // Derived Data
  const semesters = useMemo(() => {
    return semesterType === 'odd' 
      ? [Semester.SEM_1, Semester.SEM_3, Semester.SEM_5, Semester.SEM_7]
      : [Semester.SEM_2, Semester.SEM_4, Semester.SEM_6, Semester.SEM_8];
  }, [semesterType]);

  const autoVacations = useMemo(() => {
    const vacations: Holiday[] = [];
    const start = new Date(startDate + 'T00:00:00');
    
    for (let w = 0; w < 26; w++) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + (w * 7));
      
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        weekDates.push(d.toISOString().split('T')[0]);
      }

      const diwaliDay = holidays.find(h => h.name.toLowerCase().includes('diwali'));
      const holiDay = holidays.find(h => h.name.toLowerCase().includes('holi'));

      const hasDiwali = diwaliDay && weekDates.includes(diwaliDay.date);
      const hasHoli = holiDay && weekDates.includes(holiDay.date);

      if (hasDiwali) {
        vacations.push({ date: weekDates[0], name: 'Diwali Vacation' });
      }
      if (hasHoli) {
        vacations.push({ date: weekDates[0], name: 'Holi Vacation' });
      }
    }
    return vacations;
  }, [startDate, holidays]);

  const filteredHolidays = useMemo(() => {
    const start = startDate;
    const end = endDate;
    return holidays.filter(h => h.date >= start && h.date <= end);
  }, [holidays, startDate, endDate]);

  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const schedules = useMemo(() => {
    setScheduleError(null);
    try {
      return semesters.map(sem => {
        const template = isEditingMasterPlan ? draftTemplates[sem] : customTemplates[sem];
        return generateSchedule(sem, startDate, holidays, true, midTerm1Week, midTerm2Week, semesterData[sem], template);
      });
    } catch (err: any) {
      console.error(err);
      setScheduleError(err.message || "Failed to generate schedule due to impossible constraints.");
      return [];
    }
  }, [startDate, holidays, semesters, midTerm1Week, midTerm2Week, semesterData, customTemplates, draftTemplates, isEditingMasterPlan]);

  const totalWorkingDays = useMemo(() => {
    if (!isCalculated || schedules.length === 0) return 0;
    return schedules[0].blocks.reduce((acc, b) => acc + b.workingDays, 0);
  }, [schedules, isCalculated]);

  const totalWorkingHours = useMemo(() => {
    return totalWorkingDays * 8; // 8 hours per day as per user request
  }, [totalWorkingDays]);

  const getWeekStats = (sIdx: number, wIdx: number) => {
    const sem = semesters[sIdx];
    
    const wStart = new Date(startDate + 'T00:00:00');
    wStart.setDate(wStart.getDate() + (wIdx * 7));
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 6);

    const schedule = schedules[sIdx];
    if (!schedule) return { theory: 0, lab: 0, clinical: 0, ca: 0, exam: 0, orientation: 0, vacation: 0, workingDays: 0, dominantPhase: 'Theory Phase', weekHolidays: [] as string[] };

    const stats = {
      theory: 0, lab: 0, clinical: 0, ca: 0, exam: 0, orientation: 0, vacation: 0,
      workingDays: 0, dominantPhase: 'Theory Phase', weekHolidays: [] as string[]
    };

    const phaseDays: Record<string, number> = {};

    schedule.blocks.forEach(block => {
      block.days.forEach(day => {
        const dDate = new Date(day.date + 'T00:00:00');
        if (dDate >= wStart && dDate <= wEnd) {
          if (!day.isHoliday) {
            stats.workingDays++;
          } else if (day.holidayName && !['Sunday', 'Saturday', 'Theory Phase', 'Clinical Posting'].includes(day.holidayName)) {
            if (!stats.weekHolidays.includes(day.holidayName)) {
              stats.weekHolidays.push(day.holidayName);
            }
          }
          const pName = day.holidayName || day.phaseName || 'Theory Phase';
          if (pName !== 'Sunday' && pName !== 'Saturday') {
            // Count vacation/holiday phases even if they are holidays
            if (!day.isHoliday || pName.toLowerCase().includes('vacation') || pName.toLowerCase().includes('holi') || pName.toLowerCase().includes('diwali')) {
              phaseDays[pName] = (phaseDays[pName] || 0) + 1;
            }
          }
          day.slots.forEach(slot => {
            const hrs = slot.durationMinutes / 60;
            if (slot.type === SlotType.CLINICAL) stats.clinical += hrs;
            else if (slot.type === SlotType.CA || slot.type === SlotType.CO_CURRICULAR) stats.ca += hrs;
            else if (slot.type === SlotType.ORIENTATION) stats.orientation += hrs;
            else if (slot.type === SlotType.LAB) stats.lab += hrs;
            else if (slot.type === SlotType.THEORY) stats.theory += hrs;
            else if (slot.type === SlotType.EXAM) stats.exam += hrs;
            else if (slot.type === SlotType.HOLIDAY || slot.type === SlotType.PREP_LEAVE) stats.vacation += hrs;
          });
        }
      });
    });

    let max = -1;
    for (const [n, c] of Object.entries(phaseDays)) {
      if (c > max) { max = c; stats.dominantPhase = n; }
    }
    return stats;
  };

  const getSemesterStats = (sem: number) => {
    const semSubjects = semesterData[sem].subjects;
    const sIdx = semesters.indexOf(sem);
    
    let totalTheory = 0, totalLab = 0, totalClinical = 0, totalCA = 0, totalOrientation = 0, totalExam = 0, totalVacation = 0;
    
    for (let w = 0; w < 26; w++) {
      const stats = getWeekStats(sIdx, w);
      totalTheory += stats.theory;
      totalLab += stats.lab;
      totalClinical += stats.clinical;
      totalCA += stats.ca;
      totalOrientation += stats.orientation;
      totalExam += stats.exam;
      totalVacation += stats.vacation;
    }

    let finalStats;
    if (schedules[sIdx]) {
      finalStats = schedules[sIdx].finalStats;
    } else {
      const totalStipulatedTheory = semSubjects.reduce((sum, sub) => sum + sub.theoryHours, 0);
      const totalStipulatedLab = semSubjects.reduce((sum, sub) => sum + sub.labHours, 0);
      const totalStipulatedClinical = semSubjects.reduce((sum, sub) => sum + sub.clinicalHours, 0);

      let remainingTheory = totalTheory;
      let remainingLab = totalLab;
      let remainingClinical = totalClinical;

      finalStats = semSubjects.map((sub, index) => {
        const isLast = index === semSubjects.length - 1;

        let theoryAllocated = totalStipulatedTheory > 0 ? Math.round((sub.theoryHours / totalStipulatedTheory) * totalTheory) : 0;
        if (isLast && totalStipulatedTheory > 0) theoryAllocated = remainingTheory;
        remainingTheory -= theoryAllocated;

        let labAllocated = totalStipulatedLab > 0 ? Math.round((sub.labHours / totalStipulatedLab) * totalLab) : 0;
        if (isLast && totalStipulatedLab > 0) labAllocated = remainingLab;
        remainingLab -= labAllocated;

        let clinicalAllocated = totalStipulatedClinical > 0 ? Math.round((sub.clinicalHours / totalStipulatedClinical) * totalClinical) : 0;
        if (isLast && totalStipulatedClinical > 0) clinicalAllocated = remainingClinical;
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
    }

    return {
      finalStats,
      totalCA,
      totalOrientation,
      totalExam,
      totalVacation,
      totalTheory,
      totalLab,
      totalClinical
    };
  };

  // --- Handlers ---

  const addHoliday = () => {
    if (newHoliday.date && newHoliday.name) {
      setHolidays(prev => [...prev, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
      setNewHoliday({ date: '', name: '' });
    }
  };

  const handleExportPDF = () => {
    exportToPDF('master-plan-content', collegeName, campusName, semesterType, masterPlanFilter);
  };

  // --- Render Steps ---

  const [editingSubject, setEditingSubject] = useState<{ sem: number, subjectId: string | null } | null>(null);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', theoryHours: 0, labHours: 0, clinicalHours: 0, faculty: '' });

  const handleAddSubject = (sem: number) => {
    if (!newSubject.name) return;
    const id = newSubject.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const updated = { ...semesterData };
    updated[sem].subjects.push({ ...newSubject, id });
    setSemesterData(updated);
    setNewSubject({ name: '', code: '', theoryHours: 0, labHours: 0, clinicalHours: 0, faculty: '' });
  };

  const handleUpdateSubject = (sem: number, subjectId: string, updates: Partial<any>) => {
    const updated = { ...semesterData };
    const idx = updated[sem].subjects.findIndex(s => s.id === subjectId);
    if (idx !== -1) {
      updated[sem].subjects[idx] = { ...updated[sem].subjects[idx], ...updates };
      setSemesterData(updated);
    }
  };

  const handleDeleteSubject = (sem: number, subjectId: string) => {
    const updated = { ...semesterData };
    updated[sem].subjects = updated[sem].subjects.filter(s => s.id !== subjectId);
    setSemesterData(updated);
  };

  const renderSubjectManagement = () => {
    const sems = semesterType === 'odd' ? [1, 3, 5, 7] : [2, 4, 6, 8];
    
    return (
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8"
      >
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsManagingSubjects(false)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
          >
            <ChevronLeft size={20} /> Back
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manage Subjects</h2>
            <p className="text-gray-500 font-medium mt-1">Customize hours and subjects for each semester.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {sems.map(semNum => (
            <div key={semNum} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-[#141414] px-8 py-4 flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">Semester {semNum}</h3>
                <div className="text-gray-400 text-sm font-medium">
                  {semesterData[semNum].subjects.length} Subjects
                </div>
              </div>
              
              <div className="p-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-widest">Subject Name</th>
                        <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-widest text-center">Theory (Hrs)</th>
                        <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-widest text-center">Lab (Hrs)</th>
                        <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-widest text-center">Clinical (Hrs)</th>
                        <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {semesterData[semNum].subjects.map(sub => (
                        <tr key={sub.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold text-gray-900">{sub.name}</div>
                            <div className="text-xs text-gray-400 font-medium">{sub.code}</div>
                          </td>
                          <td className="py-4 text-center">
                            {editingSubject?.subjectId === sub.id ? (
                              <input 
                                type="number" 
                                value={sub.theoryHours}
                                onChange={(e) => handleUpdateSubject(semNum, sub.id, { theoryHours: parseInt(e.target.value) || 0 })}
                                className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-center font-bold text-gray-900 outline-none focus:border-gray-900"
                              />
                            ) : (
                              <span className="font-bold text-gray-700">{sub.theoryHours}</span>
                            )}
                          </td>
                          <td className="py-4 text-center">
                            {editingSubject?.subjectId === sub.id ? (
                              <input 
                                type="number" 
                                value={sub.labHours}
                                onChange={(e) => handleUpdateSubject(semNum, sub.id, { labHours: parseInt(e.target.value) || 0 })}
                                className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-center font-bold text-gray-900 outline-none focus:border-gray-900"
                              />
                            ) : (
                              <span className="font-bold text-gray-700">{sub.labHours}</span>
                            )}
                          </td>
                          <td className="py-4 text-center">
                            {editingSubject?.subjectId === sub.id ? (
                              <input 
                                type="number" 
                                value={sub.clinicalHours}
                                onChange={(e) => handleUpdateSubject(semNum, sub.id, { clinicalHours: parseInt(e.target.value) || 0 })}
                                className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-center font-bold text-gray-900 outline-none focus:border-gray-900"
                              />
                            ) : (
                              <span className="font-bold text-gray-700">{sub.clinicalHours}</span>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {editingSubject?.subjectId === sub.id ? (
                                <button 
                                  onClick={() => setEditingSubject(null)}
                                  className="p-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => setEditingSubject({ sem: semNum, subjectId: sub.id })}
                                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                  <Edit2 size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteSubject(semNum, sub.id)}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Add New Subject Row */}
                      <tr className="bg-gray-50">
                        <td className="py-4">
                          <input 
                            type="text" 
                            placeholder="New Subject Name"
                            value={newSubject.name}
                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-gray-900"
                          />
                        </td>
                        <td className="py-4 text-center">
                          <input 
                            type="number" 
                            placeholder="T"
                            value={newSubject.theoryHours || ''}
                            onChange={(e) => setNewSubject({ ...newSubject, theoryHours: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:border-gray-900"
                          />
                        </td>
                        <td className="py-4 text-center">
                          <input 
                            type="number" 
                            placeholder="L"
                            value={newSubject.labHours || ''}
                            onChange={(e) => setNewSubject({ ...newSubject, labHours: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:border-gray-900"
                          />
                        </td>
                        <td className="py-4 text-center">
                          <input 
                            type="number" 
                            placeholder="C"
                            value={newSubject.clinicalHours || ''}
                            onChange={(e) => setNewSubject({ ...newSubject, clinicalHours: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:border-gray-900"
                          />
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => handleAddSubject(semNum)}
                            className="bg-[#141414] text-white p-2 rounded-lg hover:bg-black transition-all shadow-md"
                          >
                            <Plus size={18} />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderSetup = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <div className="mb-8 border-b border-gray-100 pb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 tracking-tight">Setup Academic Year</h2>
            <p className="text-gray-500 font-medium text-sm sm:text-base">Configure your semester parameters to generate the master plan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">College Name</label>
              <input 
                type="text" 
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. College of Nursing"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-900 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Campus Name</label>
              <input 
                type="text" 
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                placeholder="e.g. University Campus"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-900 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Semester Cycle</label>
              <div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200">
                <button 
                  onClick={() => { setSemesterType('odd'); setIsCalculated(false); }}
                  className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all ${semesterType === 'odd' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Odd
                </button>
                <button 
                  onClick={() => { 
                    setSemesterType('even'); 
                    setStartDate('2026-07-13');
                    setIsCalculated(false); 
                  }}
                  className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all ${semesterType === 'even' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Even
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Academic Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setIsCalculated(false); }}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-900 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mid-Term 1 Week (1-26)</label>
              <select 
                value={midTerm1Week}
                onChange={(e) => { setMidTerm1Week(parseInt(e.target.value)); setIsCalculated(false); }}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-900 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none shadow-sm"
              >
                {Array.from({ length: 26 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mid-Term 2 Week (1-26)</label>
              <select 
                value={midTerm2Week}
                onChange={(e) => { setMidTerm2Week(parseInt(e.target.value)); setIsCalculated(false); }}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-900 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none shadow-sm"
              >
                {Array.from({ length: 26 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black shadow-sm border border-gray-200">
                <BookOpen size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Subject Management</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Add, edit or remove subjects and hours.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsManagingSubjects(true)}
              className="w-full sm:w-auto bg-white text-black px-5 py-2.5 rounded-lg text-sm font-bold border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all shadow-sm"
            >
              Manage Subjects
            </button>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            {!isCalculated ? (
              <button 
                onClick={() => setIsCalculated(true)}
                className="w-full sm:w-auto bg-black text-white px-8 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
              >
                Next
              </button>
            ) : (
              <button 
                onClick={() => setStep(2)}
                className="w-full sm:w-auto bg-black text-white px-8 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                Generate Master Plan <ChevronLeft className="rotate-180" size={18} />
              </button>
            )}
          </div>

          {scheduleError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Scheduling Error</h3>
                <p className="text-xs font-medium mt-1">{scheduleError}</p>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isCalculated && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* Left Column: Stats */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:border-gray-300 transition-colors">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-black border border-gray-200 shadow-sm">
                      <CalendarIcon size={24} />
                    </div>
                    <div>
                      <div className="text-3xl font-black text-gray-900 tracking-tight">{totalWorkingDays}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Total Working Days</div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:border-gray-300 transition-colors">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-black border border-gray-200 shadow-sm">
                      <Clock size={24} />
                    </div>
                    <div>
                      <div className="text-3xl font-black text-gray-900 tracking-tight">{totalWorkingHours}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Total Working Hours</div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Holidays */}
                <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-gray-100 pb-5">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <CalendarDays size={20} className="text-gray-400" />
                      Holiday & Vacation List
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <input 
                        type="date" 
                        value={newHoliday.date}
                        onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm flex-1 sm:flex-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Holiday Name"
                        value={newHoliday.name}
                        onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm flex-1 sm:flex-none min-w-[140px]"
                      />
                      <button 
                        onClick={addHoliday}
                        className="bg-black text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all shadow-sm w-full sm:w-auto"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
                    {holidays.map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3.5 rounded-xl hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all group">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{h.name}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                            {new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <button 
                          onClick={() => setHolidays(holidays.filter((_, idx) => idx !== i))} 
                          className="text-gray-400 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove Holiday"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {holidays.length === 0 && (
                      <div className="col-span-1 sm:col-span-2 text-center py-8 text-gray-500 text-sm font-medium">
                        No holidays added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderMasterPlanEditor = () => {
    const filteredSems = masterPlanFilter === 'all' ? semesters : [parseInt(masterPlanFilter)];

    // Calculate totals for the entire plan (all filtered semesters)
    const planTotals = filteredSems.reduce((acc, sem) => {
      const stats = getSemesterStats(sem);
      if (!stats) return acc;
      return {
        theory: acc.theory + stats.totalTheory,
        lab: acc.lab + stats.totalLab,
        clinical: acc.clinical + stats.totalClinical,
        requiredTheory: acc.requiredTheory + semesterData[sem].subjects.reduce((s, sub) => s + sub.theoryHours, 0),
        requiredLab: acc.requiredLab + semesterData[sem].subjects.reduce((s, sub) => s + sub.labHours, 0),
        requiredClinical: acc.requiredClinical + semesterData[sem].subjects.reduce((s, sub) => s + sub.clinicalHours, 0),
      };
    }, { theory: 0, lab: 0, clinical: 0, requiredTheory: 0, requiredLab: 0, requiredClinical: 0 });

    const pushToUndo = () => {
      setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(draftTemplates))].slice(-20));
    };

    const handleUndo = () => {
      if (undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      setDraftTemplates(prev);
      setUndoStack(prevStack => prevStack.slice(0, -1));
    };

    const handleUpdateBlock = (sem: number, start: number, end: number, updates: any, oldStart?: number, oldEnd?: number) => {
      pushToUndo();
      const newTemplates = { ...draftTemplates };
      const template = [...(newTemplates[sem] || [])];
      
      // Ensure template has 26 weeks
      for (let i = 0; i < 26; i++) {
        if (!template[i]) template[i] = { phase: 'Unscheduled', activities: [], week: i + 1 };
      }

      // If old range provided, clear it first to handle shrinking
      if (oldStart !== undefined && oldEnd !== undefined) {
        for (let i = oldStart; i <= oldEnd; i++) {
          template[i] = { phase: 'Unscheduled', activities: [], week: i + 1 };
        }
      }
      
      // Apply new range
      for (let i = start; i <= end; i++) {
        template[i] = { ...template[i], ...updates, week: i + 1 };
      }
      
      newTemplates[sem] = template;
      setDraftTemplates(newTemplates);
    };

    const handleUpdateActivity = (sem: number, start: number, end: number, actIdx: number, updates: any) => {
      pushToUndo();
      const newTemplates = { ...draftTemplates };
      const template = [...(newTemplates[sem] || [])];
      for (let i = start; i <= end; i++) {
        const activities = [...(template[i].activities || [])];
        if (activities[actIdx]) {
          activities[actIdx] = { ...activities[actIdx], ...updates };
          const totalHrs = activities.reduce((sum, a) => sum + (a.hoursPerDay || 0), 0);
          if (totalHrs > 8) {
            const diff = totalHrs - 8;
            activities[actIdx].hoursPerDay = Math.max(0, activities[actIdx].hoursPerDay - diff);
          }
          template[i] = { ...template[i], activities, week: i + 1 };
        }
      }
      newTemplates[sem] = template;
      setDraftTemplates(newTemplates);
    };

    const addActivity = (sem: number, start: number, end: number) => {
      pushToUndo();
      const newTemplates = { ...draftTemplates };
      const template = [...(newTemplates[sem] || [])];
      for (let i = start; i <= end; i++) {
        const activities = [...(template[i].activities || [])];
        const currentTotal = activities.reduce((sum, a) => sum + (a.hoursPerDay || 0), 0);
        const remaining = Math.max(0, 8 - currentTotal);
        if (remaining > 0) {
          activities.push({ type: SlotType.THEORY, hoursPerDay: remaining });
          template[i] = { ...template[i], activities, week: i + 1 };
        }
      }
      newTemplates[sem] = template;
      setDraftTemplates(newTemplates);
    };

    const removeActivity = (sem: number, start: number, end: number, actIdx: number) => {
      pushToUndo();
      const newTemplates = { ...draftTemplates };
      const template = [...(newTemplates[sem] || [])];
      for (let i = start; i <= end; i++) {
        const activities = [...(template[i].activities || [])];
        if (activities[actIdx]) {
          activities.splice(actIdx, 1);
          template[i] = { ...template[i], activities, week: i + 1 };
        }
      }
      newTemplates[sem] = template;
      setDraftTemplates(newTemplates);
    };

    const handleResetSemester = (sem: number) => {
      pushToUndo();
      const newTemplates = { ...draftTemplates };
      newTemplates[sem] = getDefaultTemplate(sem, startDate, holidays, midTerm1Week, midTerm2Week, semesterData[sem]);
      setDraftTemplates(newTemplates);
      setSelectedBlock(null);
    };

    const handleSplitBlock = (sem: number, start: number, end: number) => {
      if (start === end) return;
      pushToUndo();
      const mid = Math.floor((start + end) / 2);
      const newTemplates = { ...draftTemplates };
      const template = [...(newTemplates[sem] || [])];
      // Make the second half slightly different to force a split
      for (let i = mid + 1; i <= end; i++) {
        template[i] = { ...template[i], phase: template[i].phase + " (Split)", week: i + 1 };
      }
      newTemplates[sem] = template;
      setDraftTemplates(newTemplates);
      setSelectedBlock({ semester: sem, start, end: mid });
    };

    const getBlocksForSemester = (sem: number) => {
      const template = draftTemplates[sem] || [];
      if (template.length === 0) return [];
      
      const blocks: { start: number, end: number, phase: string, activities: any[] }[] = [];
      let currentBlock = { 
        start: 0, 
        end: 0, 
        phase: template[0]?.phase || 'Unscheduled', 
        activities: template[0]?.activities || []
      };
      
      for (let i = 1; i < 26; i++) {
        const week = template[i] || { phase: 'Unscheduled', activities: [], week: i + 1 };
        const sameActivities = JSON.stringify(week.activities) === JSON.stringify(currentBlock.activities);
        if (week.phase === currentBlock.phase && sameActivities) {
          currentBlock.end = i;
        } else {
          blocks.push({ ...currentBlock });
          currentBlock = { 
            start: i, 
            end: i, 
            phase: week.phase, 
            activities: week.activities 
          };
        }
      }
      blocks.push(currentBlock);
      return blocks;
    };

    const monthHeaders: { name: string, weekCount: number }[] = [];
    const weekStartDate = new Date(startDate + 'T00:00:00');
    for (let w = 0; w < 26; w++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + (w * 7) + 3);
      const mName = d.toLocaleString('default', { month: 'long' });
      if (monthHeaders.length > 0 && monthHeaders[monthHeaders.length - 1].name === mName) {
        monthHeaders[monthHeaders.length - 1].weekCount++;
      } else {
        monthHeaders.push({ name: mName, weekCount: 1 });
      }
    }

    const weeksArr = Array.from({ length: 26 }, (_, i) => i + 1);

    const getWeekRange = (wIdx: number) => {
      const start = new Date(startDate + 'T00:00:00');
      start.setDate(start.getDate() + (wIdx * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 4); 
      return { from: start.getDate(), to: end.getDate() };
    };

    const handleSaveEditor = () => {
      // Check all filtered semesters for unscheduled weeks
      for (const sem of filteredSems) {
        const template = draftTemplates[sem] || [];
        for (let i = 0; i < 26; i++) {
          if (!template[i] || template[i].phase === 'Unscheduled') {
            alert(`Cannot save: Week ${i + 1} in Semester ${sem} is unscheduled. Please fill all weeks before saving.`);
            return;
          }
        }
      }
      setCustomTemplates(draftTemplates);
      setIsEditingMasterPlan(false);
      setSelectedBlock(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header with Totals */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (JSON.stringify(draftTemplates) !== JSON.stringify(customTemplates)) {
                  setShowExitConfirm(true);
                } else {
                  setIsEditingMasterPlan(false);
                }
              }}
              className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
              title="Go Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Master Plan Editor</h2>
              <p className="text-gray-500 font-medium text-sm">Click on any block in the preview to edit its details.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Theory Hours</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-gray-900">{Math.round(planTotals.theory)}h</span>
                <span className="text-xs font-bold text-gray-400">/ {planTotals.requiredTheory}h</span>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lab Hours</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-gray-900">{Math.round(planTotals.lab)}h</span>
                <span className="text-xs font-bold text-gray-400">/ {planTotals.requiredLab}h</span>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Clinical Hours</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-gray-900">{Math.round(planTotals.clinical)}h</span>
                <span className="text-xs font-bold text-gray-400">/ {planTotals.requiredClinical}h</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Preview Grid - Matching Master View Style */}
          <div className="flex-[3] bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="min-w-[1000px] border-2 border-black overflow-hidden rounded-lg">
              <table className="w-full border-collapse table-fixed text-[10px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-black p-1 md:p-2 text-xs font-bold w-16 md:w-24 text-center align-middle">Month</th>
                    {monthHeaders.map((m, i) => (
                      <th key={i} colSpan={m.weekCount} className="border border-black p-1 text-xs font-bold text-center align-middle">
                        {m.name}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border border-black p-1 text-[10px] md:text-xs font-bold text-center align-middle">Weeks</th>
                    {weeksArr.map(w => (
                      <th key={w} className="border border-black p-0.5 md:p-1 text-[10px] md:text-xs font-bold w-6 md:w-10 text-center align-middle">{w}</th>
                    ))}
                  </tr>
                  {masterPlanFilter !== 'all' && (
                    <>
                      <tr className="bg-gray-50">
                        <th className="border border-black p-1 text-[10px] font-bold text-center align-middle">From</th>
                        {weeksArr.map((_, i) => (
                          <th key={i} className="border border-black p-0.5 text-[8px] md:text-[9px] font-bold text-center align-middle">
                            {getWeekRange(i).from}
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="border border-black p-1 text-[10px] font-bold text-center align-middle">To</th>
                        {weeksArr.map((_, i) => (
                          <th key={i} className="border border-black p-0.5 text-[8px] md:text-[9px] font-bold text-center align-middle">
                            {getWeekRange(i).to}
                          </th>
                        ))}
                      </tr>
                    </>
                  )}
                </thead>
                <tbody>
                  {filteredSems.map(sem => (
                    <tr key={sem}>
                      <td className="border border-black p-1 md:p-2 text-center font-bold text-xs md:text-sm bg-white relative h-48 md:h-72 w-8 md:w-12 align-middle overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap inline-block" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                            B.Sc. Nursing {sem}th Sem
                          </span>
                        </div>
                      </td>
                      {getBlocksForSemester(sem).map((block, bIdx) => {
                        const isSelected = selectedBlock?.semester === sem && selectedBlock?.start === block.start && selectedBlock?.end === block.end;
                        const isFixedPhase = (phase: string) => {
                          const p = phase.toUpperCase();
                          return p.includes('UNIVERSITY EXAM') || p.includes('PREP') || p.includes('VACATION') || p.includes('HOLI') || p.includes('DIWALI');
                        };
                        const isFixed = isFixedPhase(block.phase);
                        const isUnscheduled = block.phase === 'Unscheduled';
                        const isOrientation = block.phase.toUpperCase().includes('ORIENTATION');
                        const blockLength = block.end - block.start + 1;
                        const fontSize = blockLength === 1 ? 'text-[5px] md:text-[6px]' : blockLength === 2 ? 'text-[6px] md:text-[8px]' : 'text-[7px] md:text-[9px]';
                        const subFontSize = blockLength === 1 ? 'text-[4px] md:text-[5px]' : blockLength === 2 ? 'text-[5px] md:text-[7px]' : 'text-[6px] md:text-[8px]';

                        return (
                          <td 
                            key={bIdx} 
                            colSpan={blockLength}
                            onClick={() => {
                              if (!isFixed) {
                                setSelectedBlock({ semester: sem, start: block.start, end: block.end });
                              }
                            }}
                            className={`border border-black p-0 h-48 md:h-72 transition-all relative group ${isFixed ? 'bg-gray-100/50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${isSelected ? 'z-20' : ''}`}
                            style={{ backgroundColor: isFixed ? '#f3f4f6' : (isUnscheduled ? '#FFFFFF' : 'transparent') }}
                          >
                            {isSelected && (
                              <>
                                <div className="absolute inset-0 border-4 border-[#ED7D31] z-30 pointer-events-none shadow-[0_0_15px_rgba(237,125,49,0.5)]" />
                                <div className="absolute -top-2 -right-2 bg-[#ED7D31] text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg z-40 uppercase tracking-widest">
                                  Selected
                                </div>
                              </>
                            )}
                            <div className="flex flex-col h-full w-full">
                              {isFixed || isUnscheduled || isOrientation ? (
                                <div className="h-full flex flex-col items-center justify-center p-1 overflow-hidden relative" style={{ backgroundColor: isFixed ? '#f3f4f6' : (isOrientation ? getPhaseColor(block.phase) : '#FFFFFF') }}>
                                  <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap inline-block ${isUnscheduled ? 'text-gray-200' : (isOrientation ? 'text-black' : 'text-gray-500')}`} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                                    {isUnscheduled ? 'Empty Slot' : block.phase.toUpperCase()}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {block.activities?.map((act: any, aIdx: number) => (
                                    <div 
                                      key={aIdx} 
                                      className={`flex flex-col items-center justify-center overflow-hidden relative ${aIdx < block.activities.length - 1 ? 'border-b border-black' : ''}`}
                                      style={{ 
                                        backgroundColor: getSlotColor(act.type),
                                        height: `${(act.hoursPerDay / 8) * 100}%` 
                                      }}
                                    >
                                      <span className={`${fontSize} font-black uppercase text-center leading-tight px-1`}>
                                        {act.type === SlotType.THEORY ? 'Theory Block' : 
                                         act.type === SlotType.LAB ? 'Lab/Skill Lab' :
                                         act.type === SlotType.CLINICAL ? 'Clinical Block' :
                                         act.type === SlotType.CO_CURRICULAR ? 'CCA' :
                                         act.type === SlotType.EXAM ? 'IA/Exam' :
                                         act.type === SlotType.ORIENTATION ? 'Orientation' : act.type}
                                      </span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({act.hoursPerDay}h/d)
                                      </span>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Edit Panel */}
          <div className="flex-1 space-y-6">
            {selectedBlock ? (
              <motion.div 
                key={`${selectedBlock.semester}-${selectedBlock.start}-${selectedBlock.end}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 sticky top-24"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase">Edit Block</h3>
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                      Semester {selectedBlock.semester} • Week {selectedBlock.start + 1} - {selectedBlock.end + 1}
                    </p>
                  </div>
                  <button onClick={() => setSelectedBlock(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Phase Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phase Name</label>
                    <input 
                      type="text"
                      value={draftTemplates[selectedBlock.semester][selectedBlock.start].phase}
                      onChange={(e) => handleUpdateBlock(selectedBlock.semester, selectedBlock.start, selectedBlock.end, { phase: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-gray-900 outline-none transition-all"
                    />
                  </div>

                  {/* Range Adjustment */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adjust Block Range</label>
                      {selectedBlock.start !== selectedBlock.end && (
                        <button 
                          onClick={() => handleSplitBlock(selectedBlock.semester, selectedBlock.start, selectedBlock.end)}
                          className="text-gray-900 hover:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                        >
                          <Menu size={12} className="rotate-90" /> Split Block
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Week</label>
                        <select 
                          value={selectedBlock.start + 1}
                          onChange={(e) => {
                            const newStart = parseInt(e.target.value) - 1;
                            handleUpdateBlock(selectedBlock.semester, newStart, selectedBlock.end, { 
                              phase: draftTemplates[selectedBlock.semester][selectedBlock.start].phase,
                              activities: draftTemplates[selectedBlock.semester][selectedBlock.start].activities
                            }, selectedBlock.start, selectedBlock.end);
                            setSelectedBlock({ ...selectedBlock, start: newStart });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-black text-gray-900 outline-none focus:border-gray-900 cursor-pointer"
                        >
                          {Array.from({ length: selectedBlock.end + 1 }, (_, i) => (
                            <option key={i} value={i + 1}>Week {i + 1}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Week</label>
                        <select 
                          value={selectedBlock.end + 1}
                          onChange={(e) => {
                            const newEnd = parseInt(e.target.value) - 1;
                            handleUpdateBlock(selectedBlock.semester, selectedBlock.start, newEnd, { 
                              phase: draftTemplates[selectedBlock.semester][selectedBlock.start].phase,
                              activities: draftTemplates[selectedBlock.semester][selectedBlock.start].activities
                            }, selectedBlock.start, selectedBlock.end);
                            setSelectedBlock({ ...selectedBlock, end: newEnd });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-black text-gray-900 outline-none focus:border-gray-900 cursor-pointer"
                        >
                          {Array.from({ length: 26 - selectedBlock.start }, (_, i) => (
                            <option key={i} value={selectedBlock.start + i + 1}>Week {selectedBlock.start + i + 1}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium italic leading-tight">
                      Adjusting the end week will overwrite subsequent weeks with this block's content. To split a block, use the "Split" button.
                    </p>
                  </div>

                  {/* Activities */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Schedule (Max 8h)</label>
                      <button 
                        onClick={() => addActivity(selectedBlock.semester, selectedBlock.start, selectedBlock.end)}
                        className="text-gray-900 hover:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Activity
                      </button>
                    </div>

                    <div className="space-y-3">
                      {draftTemplates[selectedBlock.semester][selectedBlock.start].activities?.map((act: any, aIdx: number) => (
                        <div key={aIdx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                          <select 
                            value={act.type}
                            onChange={(e) => handleUpdateActivity(selectedBlock.semester, selectedBlock.start, selectedBlock.end, aIdx, { type: e.target.value })}
                            className="flex-1 bg-transparent border-none text-xs font-bold outline-none cursor-pointer"
                          >
                            <option value={SlotType.THEORY}>Theory</option>
                            <option value={SlotType.LAB}>Lab/Skill</option>
                            <option value={SlotType.CLINICAL}>Clinical</option>
                            <option value={SlotType.CO_CURRICULAR}>CCA</option>
                            <option value={SlotType.EXAM}>Exam</option>
                            <option value={SlotType.ORIENTATION}>Orientation</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="0"
                              max="8"
                              value={act.hoursPerDay}
                              onChange={(e) => handleUpdateActivity(selectedBlock.semester, selectedBlock.start, selectedBlock.end, aIdx, { hoursPerDay: parseFloat(e.target.value) || 0 })}
                              className="w-12 bg-white border border-gray-200 rounded-lg px-2 py-1 text-center text-xs font-bold text-gray-900"
                            />
                            <span className="text-[10px] font-bold text-gray-400">h</span>
                          </div>
                          <button 
                            onClick={() => removeActivity(selectedBlock.semester, selectedBlock.start, selectedBlock.end, aIdx)}
                            className="text-gray-300 hover:text-gray-900 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Remaining Hours indicator */}
                      <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Scheduled</span>
                        <span className={`text-xs font-black ${draftTemplates[selectedBlock.semester][selectedBlock.start].activities?.reduce((s: number, a: any) => s + a.hoursPerDay, 0) === 8 ? 'text-gray-900' : 'text-gray-500'}`}>
                          {draftTemplates[selectedBlock.semester][selectedBlock.start].activities?.reduce((s: number, a: any) => s + a.hoursPerDay, 0)} / 8 hours
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 mt-6">
                  <button 
                    onClick={() => handleResetSemester(selectedBlock.semester)}
                    className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-900 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Reset Semester to Default
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4 sticky top-24">
                <div className="w-16 h-16 bg-gray-50 text-gray-900 rounded-full flex items-center justify-center mx-auto">
                  <Edit3 size={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase">Select a Block</h3>
                <p className="text-gray-500 font-medium text-sm">Click on any week in the grid to start editing.</p>
              </div>
            )}
          </div>
        </div>

        {/* Subject Summary Toggle - Moved Lower */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowSubjectSummary(!showSubjectSummary)}
            className="w-full px-8 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 text-gray-900 rounded-xl">
                <BarChart3 size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Subject Hours Distribution & Balancing</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Distribute the scheduled hours pool among subjects</p>
              </div>
            </div>
            <motion.div animate={{ rotate: showSubjectSummary ? 180 : 0 }}>
              <ChevronLeft className="-rotate-90" size={20} />
            </motion.div>
          </button>

          <AnimatePresence>
            {showSubjectSummary && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-gray-100"
              >
                <div className="p-6 space-y-8">
                  {filteredSems.map(sem => {
                    const stats = getSemesterStats(sem);
                    if (!stats) return null;
                    
                    const draftSubjects = subjectHoursDraft[sem] || [];
                    const sumDraftTheory = draftSubjects.reduce((s, sub) => s + sub.theoryHours, 0);
                    const sumDraftLab = draftSubjects.reduce((s, sub) => s + sub.labHours, 0);
                    const sumDraftClinical = draftSubjects.reduce((s, sub) => s + sub.clinicalHours, 0);

                    const sumIncTheory = draftSubjects.reduce((s, sub) => {
                      const incRef = (initialSubjectHours[sem] || []).find((s: any) => s.id === sub.id) || sub;
                      return s + incRef.theoryHours;
                    }, 0);
                    const sumIncLab = draftSubjects.reduce((s, sub) => {
                      const incRef = (initialSubjectHours[sem] || []).find((s: any) => s.id === sub.id) || sub;
                      return s + incRef.labHours;
                    }, 0);
                    const sumIncClinical = draftSubjects.reduce((s, sub) => {
                      const incRef = (initialSubjectHours[sem] || []).find((s: any) => s.id === sub.id) || sub;
                      return s + incRef.clinicalHours;
                    }, 0);

                    const diffTheory = stats.totalTheory - sumDraftTheory;
                    const diffLab = stats.totalLab - sumDraftLab;
                    const diffClinical = stats.totalClinical - sumDraftClinical;

                    return (
                      <div key={sem} className="space-y-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Semester {sem} Distribution</h4>
                          
                            <div className="flex flex-wrap gap-3">
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border ${Math.abs(diffTheory) < 0.1 ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                                <span>Theory: {stats.totalTheory}h | Rem: {diffTheory}h</span>
                                {Math.abs(diffTheory) > 0.1 && (
                                  <button 
                                    onClick={() => balanceDraftHours(sem, 'theoryHours')}
                                    className="ml-1 bg-gray-200 hover:bg-gray-300 px-1.5 py-0.5 rounded text-[8px] transition-colors"
                                  >
                                    Balance
                                  </button>
                                )}
                              </div>
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border ${Math.abs(diffLab) < 0.1 ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                                <span>Lab: {stats.totalLab}h | Rem: {diffLab}h</span>
                                {Math.abs(diffLab) > 0.1 && (
                                  <button 
                                    onClick={() => balanceDraftHours(sem, 'labHours')}
                                    className="ml-1 bg-gray-200 hover:bg-gray-300 px-1.5 py-0.5 rounded text-[8px] transition-colors"
                                  >
                                    Balance
                                  </button>
                                )}
                              </div>
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border ${Math.abs(diffClinical) < 0.1 ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                                <span>Clinical: {stats.totalClinical}h | Rem: {diffClinical}h</span>
                                {Math.abs(diffClinical) > 0.1 && (
                                  <button 
                                    onClick={() => balanceDraftHours(sem, 'clinicalHours')}
                                    className="ml-1 bg-gray-200 hover:bg-gray-300 px-1.5 py-0.5 rounded text-[8px] transition-colors"
                                  >
                                    Balance
                                  </button>
                                )}
                              </div>
                              <button 
                                onClick={() => applySubjectHours(sem)}
                                disabled={Math.abs(diffTheory) > 0.1 || Math.abs(diffLab) > 0.1 || Math.abs(diffClinical) > 0.1}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${Math.abs(diffTheory) < 0.1 && Math.abs(diffLab) < 0.1 && Math.abs(diffClinical) < 0.1 ? 'bg-[#141414] text-white hover:bg-black shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                              >
                                Apply & Save Totals
                              </button>
                              <button 
                                onClick={() => syncDraftWithGrid(sem)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                              >
                                Sync with Grid
                              </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="pb-3">Subject Name</th>
                                <th className="pb-3 text-center">Theory (Sch / INC)</th>
                                <th className="pb-3 text-center">Lab (Sch / INC)</th>
                                <th className="pb-3 text-center">Clinical (Sch / INC)</th>
                                <th className="pb-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {draftSubjects.map((sub: any) => {
                                const currentAlloc = stats.finalStats.find((s: any) => s.subjectId === sub.id) || {};
                                const incRef = (initialSubjectHours[sem] || []).find((s: any) => s.id === sub.id) || sub;
                                return (
                                  <tr key={sub.id} className="group hover:bg-white transition-colors">
                                    <td className="py-4 text-xs font-bold text-gray-700">
                                      {sub.name}
                                      <div className="text-[8px] text-gray-400 font-medium uppercase tracking-tighter">ID: {sub.id}</div>
                                    </td>
                                    <td className="py-4 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <input 
                                          type="number"
                                          value={sub.theoryHours}
                                          onChange={(e) => handleUpdateDraftHours(sem, sub.id, 'theoryHours', parseInt(e.target.value) || 0)}
                                          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-black text-gray-900 text-center focus:border-gray-900 outline-none shadow-sm"
                                        />
                                        <span className="text-[9px] font-bold text-gray-400">INC: {incRef.theoryHours}h</span>
                                      </div>
                                    </td>
                                    <td className="py-4 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <input 
                                          type="number"
                                          value={sub.labHours}
                                          onChange={(e) => handleUpdateDraftHours(sem, sub.id, 'labHours', parseInt(e.target.value) || 0)}
                                          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-black text-gray-900 text-center focus:border-gray-900 outline-none shadow-sm"
                                        />
                                        <span className="text-[9px] font-bold text-gray-400">INC: {incRef.labHours}h</span>
                                      </div>
                                    </td>
                                    <td className="py-4 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <input 
                                          type="number"
                                          value={sub.clinicalHours}
                                          onChange={(e) => handleUpdateDraftHours(sem, sub.id, 'clinicalHours', parseInt(e.target.value) || 0)}
                                          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-black text-gray-900 text-center focus:border-gray-900 outline-none shadow-sm"
                                        />
                                        <span className="text-[9px] font-bold text-gray-400">INC: {incRef.clinicalHours}h</span>
                                      </div>
                                    </td>
                                    <td className="py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {sub.theoryHours === currentAlloc.scheduledTheory && sub.labHours === currentAlloc.scheduledLab && sub.clinicalHours === currentAlloc.scheduledClinical ? (
                                          <span className="text-[8px] font-bold text-gray-900 uppercase">Balanced</span>
                                        ) : (
                                          <span className="text-[8px] font-bold text-gray-500 uppercase">Modified</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="border-t-2 border-gray-100 bg-gray-50/50">
                              <tr className="font-black">
                                <td className="py-4 px-2 text-[10px] uppercase tracking-widest text-gray-400">Total Scheduled</td>
                                <td className="py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-xs ${Math.abs(diffTheory) < 0.1 ? 'text-gray-900' : 'text-red-600'}`}>
                                      {sumDraftTheory} / {stats.totalTheory}h
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-1">INC: {sumIncTheory}h</span>
                                    {Math.abs(diffTheory) > 0.1 && (
                                      <span className="text-[8px] text-red-500 uppercase">Mismatch: {diffTheory > 0 ? `+${diffTheory}` : diffTheory}h</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-xs ${Math.abs(diffLab) < 0.1 ? 'text-gray-900' : 'text-red-600'}`}>
                                      {sumDraftLab} / {stats.totalLab}h
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-1">INC: {sumIncLab}h</span>
                                    {Math.abs(diffLab) > 0.1 && (
                                      <span className="text-[8px] text-red-500 uppercase">Mismatch: {diffLab > 0 ? `+${diffLab}` : diffLab}h</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-xs ${Math.abs(diffClinical) < 0.1 ? 'text-gray-900' : 'text-red-600'}`}>
                                      {sumDraftClinical} / {stats.totalClinical}h
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-1">INC: {sumIncClinical}h</span>
                                    {Math.abs(diffClinical) > 0.1 && (
                                      <span className="text-[8px] text-red-500 uppercase">Mismatch: {diffClinical > 0 ? `+${diffClinical}` : diffClinical}h</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 text-right pr-4">
                                  {Math.abs(diffTheory) > 0.1 || Math.abs(diffLab) > 0.1 || Math.abs(diffClinical) > 0.1 ? (
                                    <span className="text-[8px] font-bold text-red-500 uppercase animate-pulse">Please Correct</span>
                                  ) : (
                                    <span className="text-[8px] font-bold text-gray-900 uppercase">Perfect</span>
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        
                        { (Math.abs(diffTheory) > 0.1 || Math.abs(diffLab) > 0.1 || Math.abs(diffClinical) > 0.1) && (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3 text-gray-700">
                            <AlertCircle size={16} />
                            <p className="text-[10px] font-bold uppercase tracking-wide">
                              Equation not balanced: Please ensure the sum of subject hours matches the available pool (Remaining must be 0) before saving.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save & Exit Button */}
        <div className="flex justify-center items-center gap-4 pt-6 pb-12">
          {undoStack.length > 0 && (
            <button 
              onClick={handleUndo}
              className="bg-white text-gray-900 border-2 border-gray-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-100 transition-all flex items-center gap-2"
            >
              <Trash2 size={18} className="rotate-180" /> Undo Change
            </button>
          )}
          <button 
            onClick={handleSaveEditor}
            className="bg-[#141414] text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3"
          >
            <CheckCircle2 size={20} />
            Save & Exit Editor
          </button>
        </div>

        {/* Exit Confirmation Modal */}
        <AnimatePresence>
          {showExitConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
              >
                <div className="flex items-center gap-4 text-gray-900">
                  <div className="p-3 bg-gray-100 rounded-2xl">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Unsaved Changes</h3>
                </div>
                <p className="text-gray-600 font-medium">You have unsaved changes in your master plan. Would you like to save them before exiting?</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setCustomTemplates(draftTemplates);
                      setIsEditingMasterPlan(false);
                      setShowExitConfirm(false);
                      setSelectedBlock(null);
                    }}
                    className="w-full bg-[#141414] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all"
                  >
                    Save and Exit
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingMasterPlan(false);
                      setShowExitConfirm(false);
                      setSelectedBlock(null);
                    }}
                    className="w-full bg-gray-100 text-gray-600 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                  >
                    Discard Changes
                  </button>
                  <button 
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full text-gray-400 font-bold uppercase tracking-widest text-[10px] py-2"
                  >
                    Go Back
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderMasterPlan = () => {
    const weeksArr = Array.from({ length: 26 }, (_, i) => i + 1);
    
    // Filter semesters based on masterPlanFilter
    const filteredSemesters = masterPlanFilter === 'all' 
      ? semesters 
      : semesters.filter(s => s === parseInt(masterPlanFilter));

    // Group weeks by month for headers
    const monthHeaders: { name: string, weekCount: number }[] = [];
    const weekStartDate = new Date(startDate + 'T00:00:00');
    for (let w = 0; w < 26; w++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + (w * 7) + 3);
      const mName = d.toLocaleString('default', { month: 'long' });
      if (monthHeaders.length > 0 && monthHeaders[monthHeaders.length - 1].name === mName) {
        monthHeaders[monthHeaders.length - 1].weekCount++;
      } else {
        monthHeaders.push({ name: mName, weekCount: 1 });
      }
    }

    // Helper to get merged blocks for the grid
    const getMergedBlocks = (sIdx: number) => {
      const blocks: { phase: string, start: number, length: number, stats: any, holidays: string[] }[] = [];
      let currentBlock: any = null;

      for (let w = 0; w < 26; w++) {
        const stats = getWeekStats(sIdx, w);
        
        // Calculate rates to decide if we should split merged blocks
        const theoryRate = stats.workingDays > 0 ? stats.theory / stats.workingDays : 0;
        const labRate = stats.workingDays > 0 ? stats.lab / stats.workingDays : 0;
        const clinicalRate = stats.workingDays > 0 ? stats.clinical / stats.workingDays : 0;
        
        const currentTheoryRate = currentBlock && currentBlock.stats.workingDays > 0 ? currentBlock.stats.theory / currentBlock.stats.workingDays : 0;
        const currentLabRate = currentBlock && currentBlock.stats.workingDays > 0 ? currentBlock.stats.lab / currentBlock.stats.workingDays : 0;
        const currentClinicalRate = currentBlock && currentBlock.stats.workingDays > 0 ? currentBlock.stats.clinical / currentBlock.stats.workingDays : 0;

        const rateChanged = currentBlock && stats.workingDays > 0 && currentBlock.stats.workingDays > 0 && (
          Math.abs(theoryRate - currentTheoryRate) > 0.01 || 
          Math.abs(labRate - currentLabRate) > 0.01 ||
          Math.abs(clinicalRate - currentClinicalRate) > 0.01
        );

        if (!currentBlock || currentBlock.phase !== stats.dominantPhase || rateChanged) {
          if (currentBlock) blocks.push(currentBlock);
          currentBlock = { 
            phase: stats.dominantPhase, 
            start: w, 
            length: 1, 
            stats: { ...stats }, 
            holidays: [...(stats.weekHolidays || [])] 
          };
        } else {
          currentBlock.length++;
          currentBlock.stats.theory += stats.theory;
          currentBlock.stats.lab += stats.lab;
          currentBlock.stats.clinical += stats.clinical;
          currentBlock.stats.ca += stats.ca;
          currentBlock.stats.exam += stats.exam;
          currentBlock.stats.orientation += stats.orientation;
          currentBlock.stats.vacation += stats.vacation;
          currentBlock.stats.workingDays += stats.workingDays;
          if (stats.weekHolidays) {
            stats.weekHolidays.forEach((h: string) => {
              if (!currentBlock.holidays.includes(h)) currentBlock.holidays.push(h);
            });
          }
        }
      }
      if (currentBlock) blocks.push(currentBlock);
      return blocks;
    };

    const getWeekRange = (sIdx: number, wIdx: number) => {
      const stats = getWeekStats(sIdx, wIdx);
      const isClinical = stats.dominantPhase === 'Clinical Posting';
      
      const start = new Date(startDate + 'T00:00:00');
      start.setDate(start.getDate() + (wIdx * 7));
      
      const end = new Date(start);
      // Theory ends Friday (+4), Clinical ends Saturday (+5)
      end.setDate(end.getDate() + (isClinical ? 5 : 4));
      
      return {
        from: start.getDate(),
        to: end.getDate()
      };
    };

    const getMasterPlanTitle = () => {
      if (masterPlanFilter === 'all') {
        return `Master Plan - B.Sc. Nursing ${semesterType.toUpperCase()} Semesters`;
      } else {
        const sem = parseInt(masterPlanFilter);
        const suffix = sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th';
        return `Master Plan - B.Sc. Nursing ${sem}${suffix} Semester`;
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-2 md:p-4 space-y-8 overflow-x-auto"
      >
        <div className="min-w-[1000px] bg-white p-4 md:p-8 shadow-2xl border border-gray-200 rounded-xl" id="master-plan-content">
          {/* Detailed Header */}
          <div className="mb-10 flex flex-col items-center justify-center text-center w-full">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 mb-1">{collegeName}</h1>
            <h2 className="text-lg md:text-xl font-bold text-gray-600 mb-4">{campusName}</h2>
            <h3 className="text-lg md:text-xl font-black text-[#ED7D31] uppercase tracking-widest mb-2">{getMasterPlanTitle()}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Academic Session {new Date(startDate).getFullYear()} - {new Date(startDate).getFullYear() + 1}</p>
          </div>

          <div className="border-2 border-black overflow-hidden rounded-lg">
            <table className="w-full border-collapse table-fixed text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-black p-1 md:p-2 text-xs font-bold w-16 md:w-24 text-center align-middle">Month</th>
                  {monthHeaders.map((m, i) => (
                    <th key={i} colSpan={m.weekCount} className="border border-black p-1 text-xs font-bold text-center align-middle">
                      {m.name}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <th className="border border-black p-1 text-[10px] md:text-xs font-bold text-center align-middle">Weeks</th>
                  {weeksArr.map(w => (
                    <th key={w} className="border border-black p-0.5 md:p-1 text-[10px] md:text-xs font-bold w-6 md:w-10 text-center align-middle">{w}</th>
                  ))}
                </tr>
                {masterPlanFilter !== 'all' && (
                  <>
                    <tr className="bg-gray-50">
                      <th className="border border-black p-1 text-[10px] font-bold text-center align-middle">From</th>
                      {weeksArr.map((_, i) => (
                        <th key={i} className="border border-black p-0.5 text-[8px] md:text-[9px] font-bold text-center align-middle whitespace-nowrap overflow-hidden text-ellipsis">
                          {getWeekRange(semesters.indexOf(parseInt(masterPlanFilter)), i).from}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="border border-black p-1 text-[10px] font-bold text-center align-middle">To</th>
                      {weeksArr.map((_, i) => (
                        <th key={i} className="border border-black p-0.5 text-[8px] md:text-[9px] font-bold text-center align-middle whitespace-nowrap overflow-hidden text-ellipsis">
                          {getWeekRange(semesters.indexOf(parseInt(masterPlanFilter)), i).to}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="border border-black p-1 text-[10px] font-bold text-center align-middle">Days</th>
                      {weeksArr.map((_, i) => (
                        <th key={i} className="border border-black p-0.5 text-[8px] md:text-[9px] font-bold text-center align-middle">
                          {getWeekStats(semesters.indexOf(parseInt(masterPlanFilter)), i).workingDays}
                        </th>
                      ))}
                    </tr>
                  </>
                )}
              </thead>
              <tbody>
                {filteredSemesters.map((sem) => {
                  const sIdx = semesters.indexOf(sem);
                  const mergedBlocks = getMergedBlocks(sIdx);
                  return (
                    <tr key={sem}>
                      <td className="border border-black p-1 md:p-2 text-center font-bold text-xs md:text-sm bg-white relative h-48 md:h-72 w-8 md:w-12 align-middle overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap inline-block" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                            B.Sc. Nursing {sem}th Sem
                          </span>
                        </div>
                      </td>
                      {mergedBlocks.length === 0 ? (
                        <td colSpan={26} className="border border-black p-2 md:p-4 text-center text-gray-400 font-bold bg-gray-50 h-48 md:h-72 align-middle">
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className="text-sm md:text-base mb-1 md:mb-2 font-bold">Template Not Provided</span>
                            <span className="text-[10px] md:text-xs font-bold">Please provide a master plan template for Semester {sem}</span>
                          </div>
                        </td>
                      ) : (
                        mergedBlocks.map((block, bIdx) => {
                          const phaseName = block.phase.toUpperCase();
                          const totalHrs = Math.round(block.stats.theory + block.stats.lab + block.stats.clinical + block.stats.ca + block.stats.orientation + block.stats.exam + block.stats.vacation);
                          const days = block.stats.workingDays;
                        
                        const isTheoryPhase = block.phase === 'Theory Phase' || block.phase === 'Theory Block';
                        const isClinicalPhase = block.phase === 'Clinical Posting' || block.phase === 'Clinical Block';
                        const isIAPhase = block.phase.includes('Mid Term') || block.phase.includes('IA');
                        const isOrientationPhase = block.phase === 'Orientation & Co-curricular' || block.phase === 'Orientation';

                        const renderMath = (total: number, days: number) => {
                          const roundedTotal = Math.round(total);
                          if (days === 0 || roundedTotal === 0) return `${roundedTotal}h`;
                          const exact = total / days;
                          const hrsPerDay = Math.round(exact);
                          // If rounding leads to 0 but total > 0, show < 1 hr/day or just the total
                          if (hrsPerDay === 0 && roundedTotal > 0) {
                            return `${roundedTotal}h (${days}d)`;
                          }
                          return `${hrsPerDay}h/d × ${days}d = ${roundedTotal}h`;
                        };

                        // Dynamic font size based on block width (length in weeks)
                        const fontSize = block.length === 1 ? 'text-[6px]' : block.length === 2 ? 'text-[8px]' : 'text-[10px] md:text-xs';
                        const subFontSize = block.length === 1 ? 'text-[5px]' : 'text-[7px] md:text-[10px]';

                        return (
                          <td key={bIdx} colSpan={block.length} className="border border-black p-0 relative h-48 md:h-72 overflow-hidden align-middle">
                            <div className="flex flex-col h-full w-full">
                              {(() => {
                                const stats = block.stats;
                                const isSpecial = phaseName.includes('PREP') || phaseName.includes('UNIVERSITY EXAM') || phaseName.includes('VACATION') || phaseName.includes('HOLI') || phaseName.includes('DIWALI') || phaseName.includes('ORIENTATION');
                                
                                if (isSpecial) {
                                  return (
                                    <div className="h-full flex flex-col items-center justify-center p-1 overflow-hidden relative" style={{ backgroundColor: getPhaseColor(block.phase) }}>
                                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap inline-block" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                                        {phaseName}
                                      </span>
                                    </div>
                                  );
                                }

                                const segments = [
                                  { key: 'theory', label: 'Theory Block', color: '#FF99CC' },
                                  { key: 'exam', label: 'IA/Exam', color: '#FFFF00' },
                                  { key: 'lab', label: 'Lab/Skill Lab', color: '#92D050' },
                                  { key: 'clinical', label: 'Clinical Block', color: '#00B0F0' },
                                  { key: 'ca', label: 'CCA', color: '#FFC000' },
                                  { key: 'orientation', label: 'Orientation', color: '#A6A6A6' }
                                ].filter(s => stats[s.key] > 0);

                                if (segments.length === 0) {
                                  const isUnscheduled = block.phase === 'Unscheduled';
                                  return (
                                    <div className="h-full flex flex-col items-center justify-center p-1 overflow-hidden relative" style={{ backgroundColor: getPhaseColor(block.phase) }}>
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight ${isUnscheduled ? 'text-gray-200' : ''}`}>
                                        {isUnscheduled ? 'Empty Slot' : phaseName}
                                      </span>
                                    </div>
                                  );
                                }

                                const totalSegmentHours = segments.reduce((sum, seg) => sum + stats[seg.key], 0);

                                return (
                                  <>
                                    {segments.map((seg, idx) => {
                                      const heightPercent = totalSegmentHours > 0 ? (stats[seg.key] / totalSegmentHours) * 100 : 100 / segments.length;
                                      return (
                                        <div 
                                          key={seg.key} 
                                          className={`flex flex-col items-center justify-center ${idx < segments.length - 1 ? 'border-b border-black' : ''} p-1 overflow-hidden relative`}
                                          style={{ backgroundColor: seg.color, height: `${heightPercent}%` }}
                                        >
                                          <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>{seg.label}</span>
                                          <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                            ({renderMath(stats[seg.key], days)})
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        );
                      }))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Consolidated Summary & Keys Section */}
          <div className="mt-8">
            <div className="flex flex-row gap-4 items-stretch">
              {/* Summary Table (Left) */}
              <div className="flex-[5] min-w-0 overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black text-[9px] md:text-[11px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black border-b-0 p-1 md:p-1.5 text-center font-bold align-bottom">Semester</th>
                      <th className="border border-black border-b-0 p-1 md:p-1.5 text-center font-bold align-bottom">Subject</th>
                      <th colSpan={3} className="border border-black p-0.5 md:p-1 text-center font-bold">Stipulated Hours</th>
                      <th colSpan={3} className="border border-black p-0.5 md:p-1 text-center font-bold">Delivered Hours</th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="border border-black border-t-0 p-0"></th>
                      <th className="border border-black border-t-0 p-0"></th>
                      <th className="border border-black p-0.5 md:p-1 text-center font-bold text-[8px] md:text-[10px]">Theory</th>
                      <th className="border border-black p-0.5 md:p-1 text-center font-bold text-[8px] md:text-[10px]">Lab/Skill</th>
                      <th className="border border-black p-0.5 md:p-1 text-center font-bold text-[8px] md:text-[10px]">Clinical</th>
                      <th className="border border-black p-0.5 md:p-1 text-center font-bold text-[8px] md:text-[10px]">Theory</th>
                      <th className="border border-black p-0.5 md:p-1 text-center font-bold text-[8px] md:text-[10px]">Lab/Skill</th>
                      <th className="border border-black p-0.5 md:p-1 text-center font-bold text-[8px] md:text-[10px]">Clinical</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSemesters.map((sem) => {
                      const stats = getSemesterStats(sem);
                      if (!stats || !stats.finalStats) return null;
                      
                      const semSubjects = SEMESTER_DATABASE[sem].subjects;
                      
                      return (
                        <React.Fragment key={sem}>
                          {stats.finalStats.map((s, subIdx) => {
                            const stip = semSubjects.find(orig => orig.id === s.subjectId)!;
                            return (
                              <tr key={`${sem}-${s.subjectId}`}>
                                {subIdx === 0 ? (
                                  <td className="border border-black border-b-0 p-1 md:p-1.5 text-center font-bold bg-gray-50 align-middle">
                                    {sem}th Sem
                                  </td>
                                ) : (
                                  <td className="border border-black border-t-0 border-b-0 p-1 md:p-1.5 bg-gray-50"></td>
                                )}
                                <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{s.subjectName}</td>
                                <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stip.theoryHours}</td>
                                <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stip.labHours}</td>
                                <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stip.clinicalHours}</td>
                                <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{s.scheduledTheory}</td>
                                <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{s.scheduledLab}</td>
                                <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{s.scheduledClinical}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-purple-50 font-bold">
                            <td className="border border-black border-t-0 border-b-0 p-1 md:p-1.5 bg-gray-50"></td>
                            <td className="border border-black p-1 md:p-1.5 text-center uppercase align-middle">CO-CURRICULAR / SELF STUDY</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle">-</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle">-</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle">-</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle" colSpan={3}>{stats.totalCA + stats.totalOrientation} hrs</td>
                          </tr>
                          <tr className="bg-gray-50 font-bold">
                            <td className="border border-black border-t-0 p-1 md:p-1.5 bg-gray-50"></td>
                            <td className="border border-black p-1 md:p-1.5 text-center uppercase align-middle">TOTAL</td>
                            {(() => {
                              const stipTotal = semSubjects.reduce((acc, s) => ({
                                t: acc.t + s.theoryHours,
                                l: acc.l + s.labHours,
                                c: acc.c + s.clinicalHours
                              }), { t: 0, l: 0, c: 0 });
                              
                              return (
                                <>
                                  <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stipTotal.t}</td>
                                  <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stipTotal.l}</td>
                                  <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stipTotal.c}</td>
                                  <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stats.totalTheory}</td>
                                  <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stats.totalLab}</td>
                                  <td className="border border-black p-1 md:p-1.5 font-bold text-center align-middle">{stats.totalClinical}</td>
                                </>
                              );
                            })()}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Color Key (Right) */}
              {(() => {
                const usedKeys = new Set<string>();
                filteredSemesters.forEach(sem => {
                  const sIdx = semesters.indexOf(sem);
                  const template = getMergedBlocks(sIdx);
                  if (!template || template.length === 0) return;
                  template.forEach(block => {
                    const phaseName = block.phase.toUpperCase();
                    if (phaseName.includes('THEORY')) usedKeys.add('Theory');
                    if (phaseName.includes('CLINICAL')) usedKeys.add('Clinical');
                    if (phaseName.includes('IA') || phaseName.includes('MID TERM')) usedKeys.add('Sessional');
                    if (phaseName.includes('ORIENTATION')) usedKeys.add('Orientation');
                    if (phaseName.includes('PREP')) usedKeys.add('Prep');
                    if (phaseName.includes('UNIVERSITY EXAM')) usedKeys.add('University');
                    if (phaseName.includes('VACATION')) usedKeys.add('Vacation');
                    if (phaseName === 'LAB/CA') { usedKeys.add('Lab'); usedKeys.add('Co-Curricular'); }

                    if (block.stats.theory > 0) usedKeys.add('Theory');
                    if (block.stats.lab > 0) usedKeys.add('Lab');
                    if (block.stats.ca > 0) usedKeys.add('Co-Curricular');
                    if (block.stats.clinical > 0) usedKeys.add('Clinical');
                    if (block.stats.exam > 0 && (phaseName.includes('IA') || phaseName.includes('MID TERM'))) usedKeys.add('Sessional');
                    if (block.stats.orientation > 0) usedKeys.add('Orientation');
                    if (block.stats.vacation > 0) usedKeys.add('Vacation');
                  });
                });

                return (
                  <div className="flex-[1.5] border-2 border-black p-2 bg-gray-50 rounded-lg min-w-[180px]">
                    <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 border-b border-black pb-1">Key</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {usedKeys.has('Theory') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#FF99CC] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Theory Block</span>
                        </div>
                      )}
                      {usedKeys.has('Lab') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#92D050] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Lab/Skill Lab</span>
                        </div>
                      )}
                      {usedKeys.has('Co-Curricular') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#FFC000] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Co-Curricular</span>
                        </div>
                      )}
                      {usedKeys.has('Clinical') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#00B0F0] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Clinical Block</span>
                        </div>
                      )}
                      {usedKeys.has('Sessional') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#FFFF00] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Sessional Exam</span>
                        </div>
                      )}
                      {usedKeys.has('University') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#FF00FF] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">University Exam</span>
                        </div>
                      )}
                      {usedKeys.has('Orientation') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#A6A6A6] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Orientation</span>
                        </div>
                      )}
                      {usedKeys.has('Prep') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#C6E0B4] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Prep. Leave</span>
                        </div>
                      )}
                      {usedKeys.has('Vacation') && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#FF0000] border border-black shrink-0"></div>
                          <span className="text-[10px] font-bold uppercase">Vacation</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 flex justify-between items-center px-12">
            <div className="text-center">
              <div className="w-48 border-b-2 border-black mb-2"></div>
              <p className="font-bold text-sm">Class Coordinator</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b-2 border-black mb-2"></div>
              <p className="font-bold text-sm">Principal</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 no-print">
          <button onClick={() => setStep(1)} className="text-gray-500 font-bold uppercase flex items-center gap-2 hover:text-[#141414] transition-colors">
            <ChevronLeft /> Back to Setup
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f8f9fa] font-sans text-[#141414] selection:bg-[#ED7D31] selection:text-white">
        <DashboardHeader 
          step={step} 
          semesterType={semesterType} 
          startDate={startDate}
          masterPlanFilter={step === 2 ? masterPlanFilter : undefined}
          setMasterPlanFilter={step === 2 ? setMasterPlanFilter : undefined}
          handleExportPDF={step === 2 ? handleExportPDF : undefined}
          semesters={step === 2 ? semesters : undefined}
          isEditingMasterPlan={isEditingMasterPlan}
          onEnterEditMode={() => {
            const newTemplates = { ...customTemplates };
            const filteredSems = masterPlanFilter === 'all' 
              ? semesters 
              : [parseInt(masterPlanFilter)];
            
            filteredSems.forEach(sem => {
              if (!newTemplates[sem]) {
                newTemplates[sem] = getDefaultTemplate(sem, startDate, holidays, midTerm1Week, midTerm2Week, semesterData[sem]);
              }
            });
            setDraftTemplates(newTemplates);
            setUndoStack([]);
            setIsEditingMasterPlan(true);
          }}
        />
        <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            {step === 1 && (isManagingSubjects ? renderSubjectManagement() : renderSetup())}
            {step === 2 && (isEditingMasterPlan ? renderMasterPlanEditor() : renderMasterPlan())}
          </AnimatePresence>
        </main>

      <footer className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-[0.2em] opacity-50">
        &copy; 2026 Academic Planning System
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}} />
      </div>
    </ErrorBoundary>
  );
}
