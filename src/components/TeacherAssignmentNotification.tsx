import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig, PlanStatusConfig } from '../types';
import {
  constructDateTime,
  formatThaiDateTime,
  getPlanStatusInfo,
} from '../utils/deadlineUtils';
import {
  Bell,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Receipt,
  Info,
  ArrowRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';

interface TeacherAssignmentNotificationProps {
  currentTeacher: Teacher;
  plans: LessonPlan[];
  deadlineConfigs: PlanTypeDeadlineConfig[];
  statusConfigs?: PlanStatusConfig[];
  onOpenSubmitForType: (planType: string) => void;
  onOpenReceipt?: (plan: LessonPlan) => void;
}

export interface AssignmentItem {
  config: PlanTypeDeadlineConfig;
  isSubmitted: boolean;
  submittedPlan?: LessonPlan;
  submittedCount: number;
  allSubmittedPlans: LessonPlan[];
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isUrgent: boolean;
  hasStarted: boolean;
  daysUntilStart: number;
  deadlineDate: Date;
  startDate: Date;
  deadlineFormatted: string;
}

export const TeacherAssignmentNotification: React.FC<TeacherAssignmentNotificationProps> = ({
  currentTeacher,
  plans,
  deadlineConfigs,
  statusConfigs,
  onOpenSubmitForType,
  onOpenReceipt,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);

  useEffect(() => {
    const handleFilterEvent = (e: any) => {
      if (e.detail?.filter) {
        setFilter(e.detail.filter);
      }
      setIsCollapsed(false);
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 2000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('filter-assignments', handleFilterEvent);
    return () => window.removeEventListener('filter-assignments', handleFilterEvent);
  }, []);

  // Filter only active deadline configs configured by Admin
  const activeConfigs = useMemo(() => {
    return (deadlineConfigs || []).filter((c) => c.is_active !== false);
  }, [deadlineConfigs]);

  // Compute status for each assigned document type for the current teacher
  const assignments: AssignmentItem[] = useMemo(() => {
    const now = new Date();
    const normalize = (val?: string) => String(val || '').trim().toLowerCase();
    const currentId = normalize(currentTeacher.Teacher_ID || (currentTeacher as any).teacher_id);
    const currentName = normalize(currentTeacher.Name || (currentTeacher as any).name);

    // Plans belonging to this teacher (matches by either ID or Name to prevent case/whitespace bugs)
    const myPlans = plans.filter((p) => {
      const pId = normalize(p.teacher_id || (p as any).Teacher_ID);
      const pName = normalize(p.teacher_name || (p as any).Teacher_Name);
      return (currentId && pId === currentId) || (currentName && pName === currentName);
    });

    return activeConfigs.map((config) => {
      const deadlineDate = constructDateTime(config.end_date, config.end_time || '23:59');
      const startDate = constructDateTime(config.start_date, config.start_time || '00:00');

      // Check if teacher has submitted any plan for this document type
      const matchingPlans = myPlans.filter(
        (p) => p.plan_type.trim().toLowerCase() === config.name.trim().toLowerCase()
      );
      const isSubmitted = matchingPlans.length > 0;
      // Sort newest first
      const sortedMatching = [...matchingPlans].sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
      const submittedPlan = sortedMatching[0];

      // Time calculations
      const diffMs = deadlineDate.getTime() - now.getTime();
      const isOverdue = diffMs < 0;
      const absMs = Math.abs(diffMs);
      const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

      const isDueToday = !isOverdue && days === 0;
      const isUrgent = !isOverdue && days <= 3;

      // Start date check
      const startDiffMs = startDate.getTime() - now.getTime();
      const hasStarted = startDiffMs <= 0;
      const daysUntilStart = hasStarted ? 0 : Math.ceil(startDiffMs / (1000 * 60 * 60 * 24));

      return {
        config,
        isSubmitted,
        submittedPlan,
        submittedCount: matchingPlans.length,
        allSubmittedPlans: sortedMatching,
        daysRemaining: days,
        hoursRemaining: hours,
        minutesRemaining: mins,
        isOverdue,
        isDueToday,
        isUrgent,
        hasStarted,
        daysUntilStart,
        deadlineDate,
        startDate,
        deadlineFormatted: formatThaiDateTime(deadlineDate),
      };
    });
  }, [activeConfigs, plans, currentTeacher.Teacher_ID]);

  // Statistics
  const totalAssigned = assignments.length;
  const submittedCount = assignments.filter((a) => a.isSubmitted).length;
  const pendingCount = totalAssigned - submittedCount;
  const overdueUnsubmittedCount = assignments.filter((a) => !a.isSubmitted && a.isOverdue).length;
  const urgentUnsubmittedCount = assignments.filter(
    (a) => !a.isSubmitted && !a.isOverdue && a.isUrgent
  ).length;

  const filteredAssignments = useMemo(() => {
    if (filter === 'pending') {
      return assignments.filter((a) => !a.isSubmitted);
    }
    if (filter === 'submitted') {
      return assignments.filter((a) => a.isSubmitted);
    }
    return assignments;
  }, [assignments, filter]);

  if (activeConfigs.length === 0) {
    return null;
  }

  return (
    <div
      id="assigned-documents-section"
      className={`scroll-mt-20 bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
        isHighlighted
          ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-lg scale-[1.005]'
          : 'border-slate-200/90'
      }`}
    >
      {/* Top Header Card (Style 4: Midnight Navy with Amber Highlights) */}
      <div className="bg-[#0B1329] text-white p-4 sm:p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ภาระงานที่ Admin มอบหมาย
                </span>
                {pendingCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    รอส่ง {pendingCount} รายการ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ส่งครบแล้วทุกรายการ 🎉
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1">
                รายการเอกสารที่ต้องจัดส่ง (ภาระงานครู)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ตรวจสอบวันเวลาคงเหลือและสถานะการส่งเอกสารของท่าน
              </p>
            </div>
          </div>

          {/* Quick Filter Segmented Control & Collapse Toggle */}
          <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
            <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/80 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ทั้งหมด ({totalAssigned})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 ${
                  filter === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-amber-300 hover:text-white'
                }`}
              >
                <span>ยังไม่ได้ส่ง</span>
                <span className="px-1 py-0.2 rounded text-[10px] bg-slate-900/60 text-amber-200">
                  {pendingCount}
                </span>
              </button>
              <button
                onClick={() => setFilter('submitted')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 ${
                  filter === 'submitted'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <span>ส่งแล้ว</span>
                <span className="px-1 py-0.2 rounded text-[10px] bg-slate-900/60 text-emerald-200">
                  {submittedCount}
                </span>
              </button>
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 shrink-0"
              title={isCollapsed ? 'ขยายรายการ' : 'ย่อรายการ'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Notice when viewing pending filter: explain where submitted work is */}
        {!isCollapsed && filter === 'pending' && submittedCount > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                ท่านส่งงานแล้ว <strong>{submittedCount} รายการ</strong> (ระบบซ่อนงานที่ส่งแล้วในหน้านี้ไว้)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="text-emerald-300 hover:text-white underline font-bold cursor-pointer text-[11px] shrink-0"
            >
              คลิกเพื่อดูงานทั้งหมด
            </button>
          </div>
        )}

        {/* Warning strip if urgent or overdue */}
        {!isCollapsed && overdueUnsubmittedCount > 0 && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>แจ้งเตือน:</strong> มีเอกสาร {overdueUnsubmittedCount} รายการที่เลยกำหนดส่งแล้ว กรุณาจัดส่งทันที
              </span>
            </div>
            <button
              onClick={() => setFilter('pending')}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors"
            >
              ดูรายการ
            </button>
          </div>
        )}

        {!isCollapsed && overdueUnsubmittedCount === 0 && urgentUnsubmittedCount > 0 && (
          <div className="mt-3.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>ใกล้ครบกำหนด:</strong> มีเอกสาร {urgentUnsubmittedCount} รายการ ที่เหลือเวลาส่งอีกไม่เกิน 3 วัน
              </span>
            </div>
            <button
              onClick={() => setFilter('pending')}
              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg font-bold text-[11px] shrink-0 transition-colors"
            >
              รีบส่ง
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 space-y-4 bg-slate-50/70">
          {/* Quick Summary Grid: Compact 2x2 on mobile, 4-col on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">มอบหมายทั้งหมด</div>
              <div className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {totalAssigned} <span className="text-xs font-normal text-slate-400">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="text-[11px] text-emerald-700 font-medium">ส่งแล้ว (เสร็จสิ้น)</div>
              <div className="text-base sm:text-xl font-bold text-emerald-700 mt-0.5 tabular-nums">
                {submittedCount} <span className="text-xs font-normal text-emerald-600">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="text-[11px] text-amber-700 font-medium">ยังไม่ได้ส่ง</div>
              <div className="text-base sm:text-xl font-bold text-amber-700 mt-0.5 tabular-nums">
                {pendingCount} <span className="text-xs font-normal text-amber-600">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">ความคืบหน้า</div>
              <div className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {totalAssigned > 0 ? Math.round((submittedCount / totalAssigned) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Cards List: 1-col on mobile, 2-col on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredAssignments.map((item) => {
              const {
                config,
                isSubmitted,
                submittedPlan,
                submittedCount: userSubCount,
                daysRemaining,
                hoursRemaining,
                minutesRemaining,
                isOverdue,
                isDueToday,
                isUrgent,
                hasStarted,
                daysUntilStart,
                deadlineFormatted,
              } = item;

              const planStatusInfo = submittedPlan
                ? getPlanStatusInfo(submittedPlan.status, statusConfigs)
                : null;

              return (
                <div
                  key={config.id}
                  className={`bg-white rounded-xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                    isSubmitted
                      ? 'border-emerald-200 shadow-2xs'
                      : isOverdue
                      ? 'border-rose-300 shadow-xs bg-rose-50/10'
                      : isUrgent
                      ? 'border-amber-300 shadow-xs bg-amber-50/10'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Header line: Title & status */}
                    <div className="flex items-start justify-between gap-2.5 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                          <FileText className="w-4 h-4" />
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                          {config.name}
                        </h4>
                      </div>

                      {/* Prominent badge: ส่งแล้ว vs ยังไม่ได้ส่ง */}
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ส่งแล้ว</span>
                          {userSubCount > 1 && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-extrabold">
                              {userSubCount}
                            </span>
                          )}
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>เลยกำหนด</span>
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
                          <Flame className="w-3.5 h-3.5 text-amber-600" />
                          <span>ครบกำหนดวันนี้</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>ยังไม่ส่ง</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata line (Zero-Pill discipline: unboxed text with · separators) */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2.5 flex-wrap">
                      <span>ภาคเรียนที่ {config.semester}/{config.academic_year}</span>
                      <span aria-hidden="true">·</span>
                      <span className={config.evaluation_type === 'approval_only' ? 'text-indigo-600 font-medium' : 'text-amber-700 font-medium'}>
                        {config.evaluation_type === 'approval_only' ? '✅ ตรวจแค่อนุมัติ/ไม่อนุมัติ' : '🏆 ตรวจแบบให้คะแนน (รูบริก)'}
                      </span>
                      {config.allow_late && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500">อนุญาตส่งล่าช้าได้</span>
                        </>
                      )}
                    </div>

                    {config.description && (
                      <p className="text-xs text-slate-600 mb-2.5 line-clamp-2 leading-relaxed">
                        {config.description}
                      </p>
                    )}

                    {config.notes && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 mb-3 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong>คำชี้แจง:</strong> {config.notes}
                        </div>
                      </div>
                    )}

                    {/* Deadline and Countdown box */}
                    <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 mb-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-600" />
                          กำหนดส่ง:
                        </span>
                        <span className="font-bold text-slate-800">{deadlineFormatted}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          เวลาคงเหลือ:
                        </span>
                        <div>
                          {!hasStarted ? (
                            <span className="font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                              เปิดรับในอีก {daysUntilStart} วัน
                            </span>
                          ) : isOverdue ? (
                            <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                              เลยกำหนดแล้ว {daysRemaining > 0 ? `${daysRemaining} วัน` : ''} {hoursRemaining > 0 ? `${hoursRemaining} ชม.` : ''}
                            </span>
                          ) : isDueToday ? (
                            <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              เหลืออีก {hoursRemaining} ชม. {minutesRemaining} น.
                            </span>
                          ) : isUrgent ? (
                            <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              เหลืออีก {daysRemaining} วัน {hoursRemaining > 0 ? `${hoursRemaining} ชม.` : ''}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded">
                              เหลืออีก {daysRemaining} วัน
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* If SUBMITTED: details snippet */}
                    {isSubmitted && submittedPlan && (
                      <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 space-y-1.5 mb-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-800 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ข้อมูลเอกสารที่ส่ง:
                          </span>
                          {planStatusInfo && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-bold border ${planStatusInfo.style.badge}`}
                            >
                              {planStatusInfo.label}
                            </span>
                          )}
                        </div>

                        <div className="text-slate-800 font-medium truncate">
                          <span className="text-slate-500">วิชา:</span>{' '}
                          {submittedPlan.subject_code ? `[${submittedPlan.subject_code}] ` : ''}
                          {submittedPlan.plan_title || submittedPlan.subject_name}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>ส่งเมื่อ: {formatThaiDateTime(submittedPlan.submitted_at)}</span>
                          <span
                            className={
                              submittedPlan.is_late
                                ? 'text-amber-700 font-bold'
                                : 'text-emerald-700 font-bold'
                            }
                          >
                            {submittedPlan.is_late ? 'ส่งล่าช้า' : 'ตรงเวลา'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar (Mobile Touch targets >= 44px) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-1">
                    {isSubmitted ? (
                      <div className="flex items-center gap-2 w-full justify-between flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {submittedPlan?.file_url && (
                            <a
                              href={submittedPlan.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                              title="เปิดดูไฟล์ที่ส่ง"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>ดู PDF</span>
                            </a>
                          )}

                          {onOpenReceipt && submittedPlan && (
                            <button
                              onClick={() => onOpenReceipt(submittedPlan)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              title="พิมพ์/ดูใบตอบรับ"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>ใบตอบรับ</span>
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => onOpenSubmitForType(config.name)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                          title="ส่งฉบับปรับปรุงหรือส่งเพิ่มเติม"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>ส่งเพิ่ม/ปรับปรุง</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onOpenSubmitForType(config.name)}
                        className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-sm shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-slate-950" />
                        <span>ส่งเอกสารนี้ ({config.name})</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAssignments.length === 0 && (
            <div className="text-center py-6 bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {filter === 'pending'
                  ? 'ไม่มีรายการที่ค้างส่ง ท่านส่งเอกสารครบทุกรายการแล้ว!'
                  : 'ไม่พบรายการเอกสารในตัวกรองนี้'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
