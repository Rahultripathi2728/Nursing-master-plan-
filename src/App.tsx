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
  CalendarDays
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
  CustomScheduleBlock
} from './types';
import { SEMESTER_DATABASE, SLOT_TIMINGS } from './constants';
import { generateSchedule } from './scheduler';
import { generateHolidaysForPeriod, FIXED_HOLIDAYS_NAMES } from './holidayUtils';

// --- Components ---

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      if (this.state.error && this.state.error.message) {
        errorMessage = this.state.error.message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">Something went wrong</h2>
            <p className="text-gray-500 mb-8 font-medium">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#141414] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---

const DashboardHeader = ({ 
  step, 
  semesterType, 
  startDate,
  masterPlanFilter,
  setMasterPlanFilter,
  handleExportPDF,
  semesters
}: { 
  step: number, 
  semesterType: string, 
  startDate: string,
  masterPlanFilter?: string,
  setMasterPlanFilter?: (v: string) => void,
  handleExportPDF?: () => void,
  semesters?: number[]
}) => {
  const sessionYear = new Date(startDate).getFullYear();
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm no-print">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left Side: Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-[#141414] text-white p-2.5 rounded-xl shadow-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
              GEHU MASTER PLAN
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Curriculum Management System
            </p>
          </div>
        </div>

        {/* Right Side: Status / Info */}
        <div className="flex items-center gap-3">
          {step === 1 ? (
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
              <Settings size={14} className="text-gray-500" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Setup Phase</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 text-[#ED7D31]">
                <CalendarDays size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {semesterType} Sem • {sessionYear}-{sessionYear + 1}
                </span>
              </div>
              
              {masterPlanFilter !== undefined && setMasterPlanFilter && semesters && (
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 text-gray-500">Filter:</span>
                  <select 
                    value={masterPlanFilter}
                    onChange={(e) => setMasterPlanFilter(e.target.value)}
                    className="bg-white border-none rounded-lg px-3 py-2 text-xs font-bold outline-none shadow-sm cursor-pointer"
                  >
                    <option value="all">All Semesters</option>
                    {semesters.map(s => (
                      <option key={s} value={s.toString()}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              )}

              {handleExportPDF && (
                <button 
                  onClick={handleExportPDF}
                  className="bg-[#141414] text-white px-4 py-2 rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  <Download size={16} /> Export PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default function App() {
  const [step, setStep] = useState(1);
  const [semesterType, setSemesterType] = useState<'odd' | 'even'>(() => {
    const saved = localStorage.getItem('semesterType');
    return (saved as 'odd' | 'even') || 'odd';
  });
  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem('startDate') || '2025-08-04';
    return saved;
  });
  const [midTerm1Week, setMidTerm1Week] = useState<number>(() => {
    const saved = localStorage.getItem('midTerm1Week');
    return saved ? parseInt(saved) : 10;
  });
  const [midTerm2Week, setMidTerm2Week] = useState<number>(() => {
    const saved = localStorage.getItem('midTerm2Week');
    return saved ? parseInt(saved) : 19;
  });
  const [isCalculated, setIsCalculated] = useState(false);

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem('holidays');
    if (saved) return JSON.parse(saved);
    
    const start = localStorage.getItem('startDate') || '2025-08-01';
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

  // Save to localStorage whenever these change
  useEffect(() => {
    localStorage.setItem('semesterType', semesterType);
    localStorage.setItem('startDate', startDate);
    localStorage.setItem('midTerm1Week', midTerm1Week.toString());
    localStorage.setItem('midTerm2Week', midTerm2Week.toString());
    localStorage.setItem('holidays', JSON.stringify(holidays));
  }, [semesterType, startDate, midTerm1Week, midTerm2Week, holidays]);

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
        vacations.push({ date: weekDates[0], name: 'Diwali Vacation Week' });
      }
      if (hasHoli) {
        vacations.push({ date: weekDates[0], name: 'Holi Vacation Week' });
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
      return semesters.map(sem => generateSchedule(sem, startDate, holidays, true, midTerm1Week, midTerm2Week));
    } catch (err: any) {
      console.error(err);
      setScheduleError(err.message || "Failed to generate schedule due to impossible constraints.");
      return [];
    }
  }, [startDate, holidays, semesters, midTerm1Week, midTerm2Week]);

  const totalWorkingDays = useMemo(() => {
    if (!isCalculated || schedules.length === 0) return 0;
    return schedules[0].blocks.reduce((acc, b) => acc + b.workingDays, 0);
  }, [schedules, isCalculated]);

  const totalWorkingHours = useMemo(() => {
    return totalWorkingDays * 8; // 8 hours per day as per user request
  }, [totalWorkingDays]);

  // --- Handlers ---

  const addHoliday = () => {
    if (newHoliday.date && newHoliday.name) {
      setHolidays(prev => [...prev, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
      setNewHoliday({ date: '', name: '' });
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('master-plan-content');
    if (!element) return;

    try {
      // Ensure the element is visible and has dimensions
      if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        // Try to wait a bit or just warn
        console.warn('Element dimensions are zero, waiting for layout...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Scroll to top to avoid capture issues with html2canvas
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);
      
      const parentElement = element.parentElement;
      const originalScrollLeft = parentElement ? parentElement.scrollLeft : 0;
      if (parentElement) {
        parentElement.scrollLeft = 0;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('master-plan-content');
          if (clonedElement) {
            clonedElement.style.width = `${element.scrollWidth}px`; 
            clonedElement.style.maxWidth = 'none';
            clonedElement.style.overflow = 'visible';
          }
          // Hide elements with no-print class
          const noPrintElements = clonedDoc.getElementsByClassName('no-print');
          for (let i = 0; i < noPrintElements.length; i++) {
            (noPrintElements[i] as HTMLElement).style.display = 'none';
          }
        }
      });

      // Restore scroll
      window.scrollTo(0, originalScrollY);
      if (parentElement) {
        parentElement.scrollLeft = originalScrollLeft;
      }

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      if (!imgWidth || !imgHeight) {
        throw new Error('Canvas dimensions are invalid after capture');
      }
      
      const ratio = Math.min(pdfWidth / (imgWidth / 2), pdfHeight / (imgHeight / 2));
      
      const finalWidth = (imgWidth / 2) * ratio;
      const finalHeight = (imgHeight / 2) * ratio;
      
      const x = Math.max(0, (pdfWidth - finalWidth) / 2);
      const y = Math.max(0, (pdfHeight - finalHeight) / 2);

      if (isNaN(x) || isNaN(y) || isNaN(finalWidth) || isNaN(finalHeight)) {
        throw new Error('Calculated PDF dimensions are invalid');
      }

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(`Master_Plan_Sem_${semesterType}_${new Date().getFullYear()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again or ensure the page is fully loaded.');
    }
  };

  // --- Render Steps ---

  const renderSetup = () => {
    // Test comment
    return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-6 space-y-6"
    >
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Setup Academic Year</h2>
          <p className="text-gray-500 font-medium">Configure your semester parameters to generate the master plan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Semester Cycle</label>
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button 
                onClick={() => { setSemesterType('odd'); setIsCalculated(false); }}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${semesterType === 'odd' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Odd
              </button>
              <button 
                onClick={() => { 
                  setSemesterType('even'); 
                  setStartDate('2026-07-13');
                  setIsCalculated(false); 
                }}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${semesterType === 'even' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Even
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Academic Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setIsCalculated(false); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 font-medium text-gray-900 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Mid-Term 1 Week (1-26)</label>
            <select 
              value={midTerm1Week}
              onChange={(e) => { setMidTerm1Week(parseInt(e.target.value)); setIsCalculated(false); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 font-medium text-gray-900 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all outline-none"
            >
              {Array.from({ length: 26 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Mid-Term 2 Week (1-26)</label>
            <select 
              value={midTerm2Week}
              onChange={(e) => { setMidTerm2Week(parseInt(e.target.value)); setIsCalculated(false); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 font-medium text-gray-900 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all outline-none"
            >
              {Array.from({ length: 26 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          {!isCalculated ? (
            <button 
              onClick={() => setIsCalculated(true)}
              className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
            >
              Next
            </button>
          ) : (
            <button 
              onClick={() => setStep(2)}
              className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
            >
              Generate Master Plan
            </button>
          )}
        </div>

        {scheduleError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold">Scheduling Error</h3>
              <p className="text-sm mt-1">{scheduleError}</p>
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
            className="space-y-6 overflow-hidden"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center gap-6 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                  <CalendarIcon size={32} />
                </div>
                <div>
                  <div className="text-4xl font-extrabold text-gray-900 tracking-tight">{totalWorkingDays}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">Total Working Days</div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center gap-6 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
                  <Clock size={32} />
                </div>
                <div>
                  <div className="text-4xl font-extrabold text-gray-900 tracking-tight">{totalWorkingHours}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">Total Working Hours</div>
                </div>
              </div>
            </div>
            
            {/* Holiday Management */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                    <AlertCircle size={20} />
                  </div>
                  Holiday & Vacation List
                </h3>
                <div className="flex flex-wrap gap-3">
                  <input 
                    type="date" 
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <input 
                    type="text" 
                    placeholder="Holiday Name"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-w-[200px]"
                  />
                  <button 
                    onClick={addHoliday}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {holidays.map((h, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                    <div>
                      <div className="font-bold text-gray-900">{h.name}</div>
                      <div className="text-xs text-gray-500 font-semibold mt-0.5">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <button 
                      onClick={() => setHolidays(holidays.filter((_, idx) => idx !== i))} 
                      className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove Holiday"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
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

    const getPhaseColor = (name: string) => {
      const n = name.toLowerCase();
      if (n === 'blank') return '#FFFFFF';
      if (n.includes('orientation')) return '#A6A6A6'; // Grey
      if (n.includes('co-curricular')) return '#FFC000'; // Orange
      if (n.includes('mid term') || n.includes('sessional')) return '#FFFF00'; // Yellow
      if (n.includes('clinical')) return '#00B0F0'; // Blue
      if (n.includes('prep')) return '#C6E0B4'; // Light Green
      if (n.includes('vacation') || n.includes('diwali') || n.includes('holi')) return '#FF0000'; // Red
      if (n.includes('lab') || n.includes('skill') || n.includes('live class')) return '#92D050'; // Green
      if (n.includes('theory')) return '#FF99CC'; // Pink
      if (n.includes('exam')) return '#FF00FF'; // Magenta
      return '#FF99CC';
    };

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

    const getSemesterStats = (sem: number) => {
      const semSubjects = SEMESTER_DATABASE[sem].subjects;
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

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-2 md:p-4 space-y-8 overflow-x-auto"
      >
        <div className="min-w-[1000px] bg-white p-4 md:p-8 shadow-2xl border border-gray-200 rounded-xl" id="master-plan-content">
          {/* Detailed Header */}
          <div className="mb-8 flex flex-col items-center">
            <div className="text-center space-y-1">
              <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight">Graphic Era College of Nursing</h1>
              <h2 className="text-lg md:text-xl font-bold text-gray-600">Graphic Era Hill University, Bhimtal Campus</h2>
              <h3 className="text-base md:text-lg font-black text-[#ED7D31] uppercase tracking-widest">Master Plan - B.Sc. Nursing {semesterType.toUpperCase()} Semesters</h3>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Academic Session {new Date(startDate).getFullYear()} - {new Date(startDate).getFullYear() + 1}</p>
            </div>
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
                      <td className="border border-black p-1 md:p-2 text-center font-bold text-xs md:text-sm bg-white relative h-48 md:h-72 w-8 md:w-12 align-middle">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap block writing-vertical-rl" style={{ transform: 'rotate(180deg)' }}>
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
                              {isTheoryPhase ? (
                                <>
                                  {block.stats.theory > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center border-b border-black bg-[#FF99CC] p-1 overflow-hidden relative">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Theory Block</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.theory, days)})
                                      </span>
                                    </div>
                                  )}
                                  {block.stats.lab > 0 && (
                                    <div className="flex-[0.6] flex flex-col items-center justify-center border-b border-black bg-[#92D050] p-1 overflow-hidden">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Lab/Skill Lab</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.lab, days)})
                                      </span>
                                    </div>
                                  )}
                                  {block.stats.ca > 0 && (
                                    <div className="flex-[0.4] flex flex-col items-center justify-center bg-[#FFC000] p-1 overflow-hidden">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Co-Curricular</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.ca, days)})
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : isClinicalPhase ? (
                                <div className="h-full flex flex-col items-center justify-center bg-[#00B0F0] p-1 overflow-hidden relative">
                                  <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Clinical Block</span>
                                  <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                    ({renderMath(block.stats.clinical, days)})
                                  </span>
                                </div>
                              ) : isIAPhase ? (
                                <>
                                  {block.stats.exam > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center border-b border-black bg-[#FFFF00] p-1 overflow-hidden relative">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Sessional Exam</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.exam, days)})
                                      </span>
                                    </div>
                                  )}
                                  {block.stats.lab > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center border-b border-black bg-[#92D050] p-1 overflow-hidden">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Lab Hours</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.lab, days)})
                                      </span>
                                    </div>
                                  )}
                                  {block.stats.ca > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-[#FFC000] p-1 overflow-hidden">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Co-Curricular</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.ca, days)})
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : isOrientationPhase ? (
                                <>
                                  {block.stats.orientation > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center border-b border-black bg-[#A6A6A6] p-1 overflow-hidden relative">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Orientation</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.orientation, days)})
                                      </span>
                                    </div>
                                  )}
                                  {block.stats.ca > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-[#FFC000] p-1 overflow-hidden">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Co-Curricular</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.ca, days)})
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : block.phase === 'Lab/CA' ? (
                                <>
                                  {block.stats.lab > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center border-b border-black bg-[#92D050] p-1 overflow-hidden relative">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Lab Hours</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.lab, days)})
                                      </span>
                                    </div>
                                  )}
                                  {block.stats.ca > 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-[#FFC000] p-1 overflow-hidden">
                                      <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>Co-Curricular</span>
                                      <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                        ({renderMath(block.stats.ca, days)})
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center p-1 overflow-hidden relative" style={{ backgroundColor: getPhaseColor(block.phase) }}>
                                  <span className={`${fontSize} font-bold uppercase text-center leading-tight`}>{phaseName}</span>
                                  {!(phaseName.includes('PREPARATION') || phaseName.includes('EXAM')) && (
                                    <span className={`${subFontSize} font-bold text-center leading-tight`}>
                                      ({renderMath(totalHrs, days)})
                                    </span>
                                  )}
                                </div>
                              )}
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
                            <td className="border border-black p-1 md:p-1.5 text-center uppercase align-middle">CO-CURRICULAR / ORIENTATION</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle">-</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle">-</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle">-</td>
                            <td className="border border-black p-1 md:p-1.5 text-center align-middle" colSpan={3}>{stats.totalCA + stats.totalOrientation} hrs</td>
                          </tr>
                          <tr className="bg-blue-50 font-bold">
                            <td className="border border-black border-t-0 p-1 md:p-1.5 bg-gray-50"></td>
                            <td className="border border-black p-1 md:p-1.5 text-center uppercase align-middle">SEM {sem} TOTAL</td>
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
              <div className="flex-[1.5] border-2 border-black p-2 bg-gray-50 rounded-lg min-w-[180px]">
                <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 border-b border-black pb-1">Key</h4>
                <div className="grid grid-cols-1 gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FF99CC] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Theory Block</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#92D050] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Lab/Skill Lab</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FFC000] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Co-Curricular</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#00B0F0] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Clinical Block</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FFFF00] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Sessional Exam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FF00FF] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">University Exam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#A6A6A6] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Orientation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#C6E0B4] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Prep. Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FF0000] border border-black shrink-0"></div>
                    <span className="text-[10px] font-bold uppercase">Vacation</span>
                  </div>
                </div>
              </div>
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
        />
        <main className="container mx-auto py-8">
          <AnimatePresence mode="wait">
            {step === 1 && renderSetup()}
            {step === 2 && renderMasterPlan()}
          </AnimatePresence>
        </main>

      <footer className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-[0.2em] opacity-50">
        &copy; 2026 Graphic Era Hill University • Academic Planning System
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
        .writing-vertical-rl { writing-mode: vertical-rl; }
      `}} />
      </div>
    </ErrorBoundary>
  );
}
