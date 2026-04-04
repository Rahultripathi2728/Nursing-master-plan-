import React from 'react';
import { GraduationCap, Settings, CalendarDays, Edit3, Download } from 'lucide-react';

export const DashboardHeader = ({ 
  step, 
  semesterType, 
  startDate,
  masterPlanFilter,
  setMasterPlanFilter,
  handleExportPDF,
  semesters,
  isEditingMasterPlan,
  onEnterEditMode
}: { 
  step: number, 
  semesterType: string, 
  startDate: string,
  masterPlanFilter?: string,
  setMasterPlanFilter?: (v: string) => void,
  handleExportPDF?: () => void,
  semesters?: number[],
  isEditingMasterPlan?: boolean,
  onEnterEditMode?: () => void
}) => {
  const sessionYear = new Date(startDate).getFullYear();
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm no-print">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left Side: Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-[#141414] text-white p-2.5 rounded-xl shadow-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
              MASTER PLANNER
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Curriculum Management System
            </p>
          </div>
        </div>

        {/* Right Side: Status / Info */}
        <div className="flex items-center gap-4 sm:gap-6 sm:pr-4">
          {step === 1 ? (
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
              <Settings size={14} className="text-gray-500" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Setup Phase</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 sm:gap-6">
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

              {step === 2 && !isEditingMasterPlan && (
                <button 
                  onClick={onEnterEditMode}
                  className="flex items-center gap-2 bg-gray-100 text-gray-900 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all border border-gray-200 shadow-sm uppercase tracking-widest"
                >
                  <Edit3 size={16} /> Edit Master Plan
                </button>
              )}

              {handleExportPDF && !isEditingMasterPlan && (
                <button 
                  onClick={handleExportPDF}
                  className="bg-[#141414] text-white px-5 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
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
