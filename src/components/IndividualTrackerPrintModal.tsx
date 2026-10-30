import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig, isTeacherAdmin } from '../types';
import {
  calculateTaskTimeStatus,
  formatThaiDateTime,
  getSavedDeadlineConfigs,
  isPlanMatchingAssignment,
} from '../utils/deadlineUtils';
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  FileText,
  Users,
  Check,
  Search,
} from 'lucide-react';

interface IndividualTrackerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  plans: LessonPlan[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  currentTeacher?: Teacher;
  initialArea?: string;
  initialStatus?: 'all' | 'uncompleted' | 'completed' | 'late' | 'ontime' | 'pending';
}

export const IndividualTrackerPrintModal: React.FC<IndividualTrackerPrintModalProps> = ({
  isOpen,
  onClose,
  teachers,
  plans,
  deadlineConfigs,
  currentTeacher,
  initialArea = 'ทั้งหมด',
  initialStatus = 'all',
}) => {
  const normalizeStatus = (s: string): 'all' | 'uncompleted' | 'completed' | 'late' => {
    if (s === 'ontime') return 'completed';
    if (s === 'pending') return 'uncompleted';
    if (s === 'completed' || s === 'uncompleted' || s === 'late') return s;
    return 'all';
  };

  const [selectedArea, setSelectedArea] = useState<string>(initialArea);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'uncompleted' | 'completed' | 'late'>(normalizeStatus(initialStatus));
  const [printLayout, setPrintLayout] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSignatures, setShowSignatures] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedArea(initialArea);
      setSelectedStatus(normalizeStatus(initialStatus));
    }
  }, [isOpen, initialArea, initialStatus]);

  // 1. Filter out admins to get teaching staff
  const teachingStaff = useMemo(() => {
    return teachers.filter((t) => !isTeacherAdmin(t));
  }, [teachers]);

  // 2. Active assignment configs
  const activeAssignments = useMemo(() => {
    const list = deadlineConfigs && deadlineConfigs.length > 0
      ? deadlineConfigs
      : getSavedDeadlineConfigs();
    return list.filter((c) => c.is_active !== false);
  }, [deadlineConfigs]);

  const areas = [
    'ทั้งหมด',
    'วิทยาศาสตร์และเทคโนโลยี',
    'คณิตศาสตร์',
    'ภาษาต่างประเทศ',
    'ภาษาไทย',
    'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'ศิลปะ',
    'สุขศึกษาและพลศึกษา',
    'การงานอาชีพ',
  ];

  const normalize = (val?: string) => String(val || '').trim().toLowerCase();

  // 3. Compile full tracking data for each teacher
  const teacherRows = useMemo(() => {
    return teachingStaff.map((teacher) => {
      const tId = normalize(teacher.Teacher_ID || (teacher as any).teacher_id);
      const tName = normalize(teacher.Name || (teacher as any).name);

      const teacherPlans = plans.filter((p) => {
        const pId = normalize(p.teacher_id || (p as any).Teacher_ID);
        const pName = normalize(p.teacher_name || (p as any).Teacher_Name);
        return (tId && pId === tId) || (tName && pName === tName);
      });

      const taskResults = activeAssignments.map((config) => {
        const matchingPlans = teacherPlans.filter((p) => isPlanMatchingAssignment(p, config));
        const isSubmitted = matchingPlans.length > 0;
        const sorted = [...matchingPlans].sort(
          (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        );
        const submittedPlan = sorted[0];
        const timeStatus = calculateTaskTimeStatus(config.end_date, config.end_time || '23:59');

        return {
          config,
          isSubmitted,
          submittedPlan,
          matchingPlans: sorted,
          timeStatus,
        };
      });

      const submittedTasks = taskResults.filter((r) => r.isSubmitted);
      const missingTasks = taskResults.filter((r) => !r.isSubmitted);
      const submittedCount = submittedTasks.length;
      const totalCount = activeAssignments.length;
      const isAllCompleted = totalCount > 0 && submittedCount === totalCount;
      const hasUnsubmitted = totalCount > 0 && submittedCount < totalCount;
      const hasLateSubmission = submittedTasks.some((r) => r.submittedPlan?.is_late);
      const percent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

      return {
        teacher,
        taskResults,
        submittedTasks,
        missingTasks,
        submittedCount,
        totalCount,
        isAllCompleted,
        hasUnsubmitted,
        hasLateSubmission,
        percent,
      };
    });
  }, [teachingStaff, activeAssignments, plans]);

  // 4. Filtered teachers according to modal controls
  const filteredTeacherRows = useMemo(() => {
    return teacherRows.filter(({ teacher, isAllCompleted, hasUnsubmitted, hasLateSubmission }) => {
      if (selectedArea !== 'ทั้งหมด' && teacher.Learning_Area !== selectedArea) {
        return false;
      }
      if (selectedStatus === 'completed' && !isAllCompleted) return false;
      if (selectedStatus === 'uncompleted' && !hasUnsubmitted) return false;
      if (selectedStatus === 'late' && !hasLateSubmission) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = teacher.Name.toLowerCase().includes(q);
        const matchId = teacher.Teacher_ID.toLowerCase().includes(q);
        const matchArea = teacher.Learning_Area.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchArea) return false;
      }

      return true;
    });
  }, [teacherRows, selectedArea, selectedStatus, searchQuery]);

  // Overall Statistics for current scope
  const stats = useMemo(() => {
    const total = filteredTeacherRows.length;
    const completed = filteredTeacherRows.filter((r) => r.isAllCompleted && !r.hasLateSubmission).length;
    const completedWithLate = filteredTeacherRows.filter((r) => r.isAllCompleted && r.hasLateSubmission).length;
    const missing = filteredTeacherRows.filter((r) => r.hasUnsubmitted).length;
    return { total, completed, completedWithLate, missing };
  }, [filteredTeacherRows]);

  if (!isOpen) return null;

  const printDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const printTime = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 print:m-0 print:border-none print:shadow-none print:max-w-none print:rounded-none">
        
        {/* TOP CONTROL BAR (HIDDEN IN PRINT) */}
        <div className="bg-slate-900 p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>พิมพ์รายงานสรุปการส่งเอกสารวิชาการรายบุคคล</span>
                <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                  {filteredTeacherRows.length} ท่าน
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                พร้อมตราโรงเรียนตรงกลางด้านบน แยกรายการงานที่ส่งและยังไม่ส่งชัดเจน
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Print Layout Toggle */}
            <div className="flex bg-white/10 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintLayout('table')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  printLayout === 'table' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                ตารางสรุปมาตรฐาน
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('cards')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  printLayout === 'cards' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                การ์ดแจกแจงรายบุคคล
              </button>
            </div>

            {/* Print Action Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>พิมพ์เอกสาร / บันทึก PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUB-FILTER BAR (HIDDEN IN PRINT) */}
        <div className="bg-slate-100/90 p-3 px-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>ตัวกรองการพิมพ์:</span>
            </span>

            {/* Department Filter */}
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area === 'ทั้งหมด' ? 'กลุ่มสาระ: ทั้งหมด' : area}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">สถานะ: ครูทุกคน</option>
              <option value="uncompleted">เฉพาะผู้ที่ยังมีงานค้างส่ง</option>
              <option value="completed">เฉพาะผู้ที่ส่งครบแล้ว</option>
              <option value="late">เฉพาะผู้ที่มีงานส่งล่าช้า</option>
            </select>

            {/* Signature Toggle */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium cursor-pointer hover:bg-slate-50 select-none">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] whitespace-nowrap">ช่องลงนาม</span>
            </label>
          </div>

          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อครู หรือรหัส..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* PRINTABLE REPORT CONTAINER */}
        <div className="p-6 sm:p-10 md:p-12 space-y-6 text-slate-900 bg-white print:p-2 print:space-y-4">
          
          {/* 1. SCHOOL EMBLEM AT THE VERY TOP CENTER (ตราโรงเรียนตรงกลางด้านบนสุด ตามภาพที่ 1) */}
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5">
            <div className="flex justify-center mb-1">
              <img
                src="/assets/aistudio/PCSHS_Kalasin.__th__6ef5abd0.png"
                alt="ตราสัญลักษณ์โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
                className="h-20 sm:h-24 mx-auto object-contain drop-shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              รายงานสรุปการส่งเอกสารวิชาการรายบุคคล
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-800">
              โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </p>
            <p className="text-xs text-slate-600">
              กลุ่มบริหารวิชาการ • ภาคเรียนที่ 1 ปีการศึกษา 2569
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 pt-1">
              <span>กลุ่มสาระ: <strong className="text-slate-800">{selectedArea}</strong></span>
              <span>•</span>
              <span>สถานะ: <strong className="text-slate-800">
                {selectedStatus === 'all'
                  ? 'ทุกคน'
                  : selectedStatus === 'uncompleted'
                  ? 'เฉพาะค้างส่ง'
                  : selectedStatus === 'completed'
                  ? 'ส่งครบแล้ว'
                  : 'มีส่งช้า'}
              </strong></span>
              <span>•</span>
              <span>วันที่พิมพ์: {printDate} เวลา {printTime} น.</span>
            </div>
          </div>

          {/* 2. STATISTICAL SUMMARY TILES */}
          <div className="grid grid-cols-4 gap-3 text-center border-b border-slate-200 pb-4 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">ครูในรายงาน</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total} ท่าน</div>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-emerald-800 font-medium">ส่งตรงเวลา 100%</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">{stats.completed} ท่าน</div>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-amber-800 font-medium">ส่งครบแต่มีช้า</div>
              <div className="text-lg font-bold text-amber-700 mt-0.5">{stats.completedWithLate} ท่าน</div>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
              <div className="text-rose-800 font-medium">ยังมีงานค้างส่ง</div>
              <div className="text-lg font-bold text-rose-700 mt-0.5">{stats.missing} ท่าน</div>
            </div>
          </div>

          {/* 3. REPORT CONTENT: TABLE OR CARDS */}
          {filteredTeacherRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold">ไม่พบข้อมูลครูผู้สอนที่ตรงกับเงื่อนไขการพิมพ์</p>
            </div>
          ) : printLayout === 'table' ? (
            /* FORMAT 1: OFFICIAL INDIVIDUAL SUMMARY TABLE */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>ตารางแจกแจงรายการงานที่ส่งและยังไม่ส่ง จำแนกรายบุคคล ({filteredTeacherRows.length} ท่าน)</span>
                <span className="text-slate-500 font-normal">ภาระงานที่มอบหมายทั้งหมด: {activeAssignments.length} รายการ</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <tr>
                      <th className="p-2 w-10 text-center border-r border-slate-300">#</th>
                      <th className="p-2 w-52 border-r border-slate-300">ครูผู้สอน / กลุ่มสาระ</th>
                      <th className="p-2 w-28 text-center border-r border-slate-300">สถานะรวม</th>
                      <th className="p-2 border-r border-slate-300">
                        <span className="text-emerald-800">✓ งานที่ส่งแล้ว</span>
                      </th>
                      <th className="p-2 border-r border-slate-300">
                        <span className="text-rose-800">✕ งานที่ยังไม่ส่ง</span>
                      </th>
                      <th className="p-2 w-20 text-center">ความคืบหน้า</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTeacherRows.map((row, idx) => {
                      const { teacher, submittedTasks, missingTasks, isAllCompleted, hasLateSubmission, percent, submittedCount, totalCount } = row;

                      return (
                        <tr key={`print-row-${teacher.Teacher_ID}`} className="page-break-avoid">
                          {/* Row Number */}
                          <td className="p-2 text-center border-r border-slate-200 font-mono text-slate-500 align-top">
                            {idx + 1}
                          </td>

                          {/* Teacher Info */}
                          <td className="p-2 border-r border-slate-200 align-top">
                            <div className="font-bold text-slate-900">{teacher.Name}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              <span>รหัส: {teacher.Teacher_ID}</span>
                              {teacher.position && <span className="ml-1">• {teacher.position}</span>}
                            </div>
                            <div className="text-[11px] text-indigo-700 font-medium mt-0.5">
                              {teacher.Learning_Area}
                            </div>
                          </td>

                          {/* Overall Status Badge */}
                          <td className="p-2 text-center border-r border-slate-200 align-top">
                            {isAllCompleted ? (
                              hasLateSubmission ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  ครบมีช้า
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  ตรงเวลา 100%
                                </span>
                              )
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                ค้าง {missingTasks.length} งาน
                              </span>
                            )}
                          </td>

                          {/* SUBMITTED TASKS (งานที่ส่งแล้ว) */}
                          <td className="p-2 border-r border-slate-200 align-top space-y-1">
                            {submittedTasks.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">- ยังไม่มีงานที่ส่ง -</span>
                            ) : (
                              <ul className="space-y-1">
                                {submittedTasks.map((st) => (
                                  <li key={`sub-${st.config.id}`} className="text-[11px] leading-tight flex items-start gap-1">
                                    <span className="text-emerald-700 font-bold shrink-0">✓</span>
                                    <div>
                                      <span className="font-semibold text-slate-800">{st.config.name}</span>
                                      {st.submittedPlan && (
                                        <span className="text-slate-500 text-[10px] block">
                                          ส่ง: {new Date(st.submittedPlan.submitted_at).toLocaleDateString('th-TH')}
                                          {st.submittedPlan.is_late ? (
                                            <span className="text-amber-700 font-bold ml-1">(ส่งช้า)</span>
                                          ) : (
                                            <span className="text-emerald-700 font-medium ml-1">(ตรงเวลา)</span>
                                          )}
                                          {typeof st.submittedPlan.total_score === 'number' && (
                                            <span className="font-bold text-indigo-600 ml-1">
                                              • {st.submittedPlan.total_score}/100 คะแนน
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>

                          {/* MISSING TASKS (งานที่ยังไม่ส่ง) */}
                          <td className="p-2 border-r border-slate-200 align-top space-y-1">
                            {missingTasks.length === 0 ? (
                              <span className="text-emerald-700 font-semibold text-[11px]">✓ ส่งครบทุกงานแล้ว</span>
                            ) : (
                              <ul className="space-y-1">
                                {missingTasks.map((mt) => (
                                  <li key={`mis-${mt.config.id}`} className="text-[11px] leading-tight flex items-start gap-1">
                                    <span className="text-rose-600 font-bold shrink-0">✕</span>
                                    <div>
                                      <span className="font-semibold text-rose-950">{mt.config.name}</span>
                                      <span className="text-slate-500 text-[10px] block">
                                        กำหนด: {mt.timeStatus.deadlineFormatted}
                                        {mt.timeStatus.isOverdue ? (
                                          <span className="text-rose-700 font-bold ml-1">(เลยกำหนด {mt.timeStatus.days} วัน)</span>
                                        ) : (
                                          <span className="text-slate-600 ml-1">(เหลือ {mt.timeStatus.days} วัน)</span>
                                        )}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>

                          {/* Progress Column */}
                          <td className="p-2 text-center align-top font-mono">
                            <span className="font-bold text-slate-800">{submittedCount}/{totalCount}</span>
                            <div className="text-[10px] text-slate-500">({percent}%)</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* FORMAT 2: DETAILED INDIVIDUAL DOSSIER CARDS */
            <div className="space-y-4">
              {filteredTeacherRows.map((row, idx) => {
                const { teacher, submittedTasks, missingTasks, isAllCompleted, hasLateSubmission, percent, submittedCount, totalCount } = row;

                return (
                  <div
                    key={`print-card-${teacher.Teacher_ID}`}
                    className="p-4 rounded-xl border border-slate-300 bg-white space-y-3 page-break-avoid"
                  >
                    {/* Teacher Card Header */}
                    <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 font-mono text-xs">#{idx + 1}</span>
                          <h3 className="font-bold text-sm text-slate-900">{teacher.Name}</h3>
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700">
                            {teacher.Teacher_ID}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                          <span className="text-indigo-700 font-medium">{teacher.Learning_Area}</span>
                          <span>•</span>
                          <span>{teacher.position || 'ครูผู้สอน'}</span>
                          {teacher.Email && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 font-mono text-[11px]">{teacher.Email}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {isAllCompleted ? (
                          hasLateSubmission ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              ส่งครบแล้วแต่มีล่าช้า
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              ✓ ส่งตรงเวลา 100%
                            </span>
                          )
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            ค้างส่ง {missingTasks.length} รายการ
                          </span>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ความคืบหน้า: {submittedCount}/{totalCount} งาน ({percent}%)
                        </div>
                      </div>
                    </div>

                    {/* Side-by-Side: Submitted vs Missing Tasks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Left: Submitted Tasks */}
                      <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                        <div className="font-bold text-emerald-900 flex items-center justify-between border-b border-emerald-200/60 pb-1">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>งานที่ส่งแล้ว ({submittedTasks.length} รายการ)</span>
                          </span>
                        </div>

                        {submittedTasks.length === 0 ? (
                          <div className="text-slate-400 italic text-[11px] py-2 text-center">
                            - ยังไม่มีรายการส่งเอกสารในระบบ -
                          </div>
                        ) : (
                          <ul className="space-y-1.5 pt-0.5">
                            {submittedTasks.map((st) => (
                              <li key={st.config.id} className="text-[11px] flex items-start justify-between gap-1 border-b border-emerald-100 pb-1 last:border-b-0">
                                <div className="min-w-0 pr-1">
                                  <div className="font-semibold text-slate-800">{st.config.name}</div>
                                  <div className="text-[10px] text-slate-500">
                                    ส่งเมื่อ: {new Date(st.submittedPlan?.submitted_at || '').toLocaleDateString('th-TH')}
                                    {typeof st.submittedPlan?.total_score === 'number' && (
                                      <span className="font-bold text-indigo-700 ml-1">
                                        • คะแนน: {st.submittedPlan.total_score}/100
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                  st.submittedPlan?.is_late
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {st.submittedPlan?.is_late ? 'ส่งช้า' : 'ตรงเวลา'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Right: Missing Tasks */}
                      <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200/80 space-y-1.5">
                        <div className="font-bold text-rose-900 flex items-center justify-between border-b border-rose-200/60 pb-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-rose-600" />
                            <span>งานที่ยังไม่ส่ง ({missingTasks.length} รายการ)</span>
                          </span>
                        </div>

                        {missingTasks.length === 0 ? (
                          <div className="text-emerald-700 font-semibold text-[11px] py-2 text-center">
                            ✓ ส่งเอกสารครบถ้วนทุกรายการตามกำหนดแล้ว
                          </div>
                        ) : (
                          <ul className="space-y-1.5 pt-0.5">
                            {missingTasks.map((mt) => (
                              <li key={mt.config.id} className="text-[11px] flex items-start justify-between gap-1 border-b border-rose-100 pb-1 last:border-b-0">
                                <div className="min-w-0 pr-1">
                                  <div className="font-semibold text-rose-950">{mt.config.name}</div>
                                  <div className="text-[10px] text-slate-500">
                                    กำหนดส่ง: {mt.timeStatus.deadlineFormatted}
                                  </div>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                  mt.timeStatus.isOverdue
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-200 text-slate-800'
                                }`}>
                                  {mt.timeStatus.isOverdue ? `เลย ${mt.timeStatus.days} วัน` : `เหลือ ${mt.timeStatus.days} วัน`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. OFFICIAL SIGNATURES BLOCK AT BOTTOM (ซ่อนตามคำขอ "ไม่ต้องมีลายเซ็น" แต่เปิดได้ตามต้องการ) */}
          {showSignatures ? (
            <div className="pt-8 mt-6 border-t border-slate-300 page-break-avoid">
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {/* Signature 1: Report Creator */}
                <div className="space-y-12">
                  <p className="text-slate-600">ลงชื่อ............................................................</p>
                  <div>
                    <p className="font-bold text-slate-900">
                      ({currentTeacher ? currentTeacher.Name : '............................................................'})
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">ผู้จัดทำรายงาน / เจ้าหน้าที่วิชาการ</p>
                  </div>
                </div>

                {/* Signature 2: Academic Head */}
                <div className="space-y-12">
                  <p className="text-slate-600">ลงชื่อ............................................................</p>
                  <div>
                    <p className="font-bold text-slate-900">(นายณฤภัทร นะคะจัด)</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">หัวหน้ากลุ่มบริหารวิชาการ</p>
                  </div>
                </div>

                {/* Signature 3: School Director */}
                <div className="space-y-12">
                  <p className="text-slate-600">ลงชื่อ............................................................</p>
                  <div>
                    <p className="font-bold text-slate-900">(ผู้อำนวยการสถานศึกษา)</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">ผู้อำนวยการโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-slate-400">
                เอกสารรายงานสรุปผลการส่งเอกสารวิชาการรายบุคคล • โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
              </div>
            </div>
          ) : (
            <div className="pt-4 mt-6 border-t border-slate-200 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 page-break-avoid">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/aistudio/PCSHS_Kalasin.__th__6ef5abd0.png"
                  alt="จภ. กาฬสินธุ์"
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.svg';
                  }}
                />
                <span className="font-medium text-slate-700">โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</span>
              </div>
              <span className="text-slate-400">ระบบติดตามและรายงานผลการส่งเอกสารวิชาการรายบุคคล ภาคเรียนที่ 1/2569</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
