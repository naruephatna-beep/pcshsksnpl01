import React, { useState, useMemo } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig, PlanStatusConfig, isTeacherAdmin } from '../types';
import { isPlanMatchingAssignment, formatThaiDateTime, getSavedDeadlineConfigs } from '../utils/deadlineUtils';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Printer,
  ExternalLink,
  FileText,
  Flame,
  Check,
  Send,
  Filter,
} from 'lucide-react';

export interface DepartmentRankingLeaderboardProps {
  teachers: Teacher[];
  plans: LessonPlan[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  statusConfigs?: PlanStatusConfig[];
  onOpenPlan?: (plan: LessonPlan) => void;
  onSendReminder?: (teacher: Teacher) => void;
  embedded?: boolean;
}

export interface DepartmentRankItem {
  rank: number;
  areaName: string;
  totalTeachers: number;
  submittedTeachersCount: number;
  onTimeTeachersCount: number;
  lateTeachersCount: number;
  pendingTeachersCount: number;
  completionRate: number;
  onTimeRate: number;
  isCompletedAll: boolean;
  isOnTimeAll: boolean;
  completionTimestamp: number | null; // ms of latest submission
  completionDateFormatted: string | null;
  timeAheadText: string | null;
  finalFinisherName: string | null;
  teachersDetail: Array<{
    teacher: Teacher;
    isSubmitted: boolean;
    isOnTime: boolean;
    isLate: boolean;
    plan?: LessonPlan;
    submittedAtFormatted?: string;
  }>;
}

export const DepartmentRankingLeaderboard: React.FC<DepartmentRankingLeaderboardProps> = ({
  teachers,
  plans,
  deadlineConfigs,
  statusConfigs,
  onOpenPlan,
  onSendReminder,
  embedded = false,
}) => {
  // 1. Resolve active assignments
  const activeAssignments = useMemo(() => {
    const list = deadlineConfigs && deadlineConfigs.length > 0
      ? deadlineConfigs
      : getSavedDeadlineConfigs();
    return list.filter((c) => c.is_active !== false);
  }, [deadlineConfigs]);

  // Selected document type filter ('all' for overall, or specific assignment id)
  const [selectedTaskKey, setSelectedTaskKey] = useState<string>('all');
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'perfect_only'>('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 2. Filter teaching staff (excluding admins)
  const teachingStaff = useMemo(() => {
    return teachers.filter((t) => !isTeacherAdmin(t));
  }, [teachers]);

  // 3. Extract unique valid learning areas
  const learningAreas = useMemo(() => {
    const set = new Set<string>();
    teachingStaff.forEach((t) => {
      const area = (t.Learning_Area || '').trim();
      if (
        area &&
        area !== '-' &&
        !area.includes('กลุ่มบริหาร') &&
        !area.includes('ฝ่ายบริหาร')
      ) {
        set.add(area);
      }
    });

    // Standard ordering if available
    const standardOrder = [
      'วิทยาศาสตร์และเทคโนโลยี',
      'คณิตศาสตร์',
      'ภาษาต่างประเทศ',
      'ภาษาไทย',
      'สังคมศึกษา ศาสนา และวัฒนธรรม',
      'สุขศึกษาและพลศึกษา',
      'ศิลปะ',
      'การงานอาชีพ',
    ];

    const result = standardOrder.filter((name) => set.has(name));
    set.forEach((name) => {
      if (!result.includes(name)) result.push(name);
    });

    return result;
  }, [teachingStaff]);

  // Helper: Normalize string for comparison
  const normalize = (val?: string) => String(val || '').trim().toLowerCase();

  // Helper to calculate time ahead of deadline
  const calculateAheadTime = (timestampMs: number, targetConfig?: PlanTypeDeadlineConfig): string | null => {
    if (!targetConfig || !targetConfig.end_date) return null;
    try {
      const timeStr = targetConfig.end_time || '23:59';
      const [year, month, day] = targetConfig.end_date.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      const deadlineDate = new Date(year, month - 1, day, hours, minutes, 59, 999);
      const diffMs = deadlineDate.getTime() - timestampMs;

      if (diffMs <= 0) {
        return 'ส่งตรงเวลาพอดี / ในวันกำหนดส่ง';
      }

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;

      if (diffDays > 0) {
        return `เสร็จก่อนกำหนด ${diffDays} วัน ${remainingHours > 0 ? `${remainingHours} ชม.` : ''}`;
      }
      return `เสร็จก่อนกำหนด ${diffHours} ชั่วโมง`;
    } catch {
      return null;
    }
  };

  // 4. Compute ranking items for current task selection
  const rankingData = useMemo(() => {
    const currentAssignment = activeAssignments.find((c) => c.id === selectedTaskKey);

    const items: DepartmentRankItem[] = learningAreas.map((areaName) => {
      const areaTeachers = teachingStaff.filter((t) => t.Learning_Area === areaName);
      const totalTeachers = areaTeachers.length;

      let submittedCount = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let latestSubmissionMs = 0;
      let finalFinisher: string | null = null;

      const teachersDetail = areaTeachers.map((teacher) => {
        const tId = normalize(teacher.Teacher_ID || (teacher as any).teacher_id);
        const tName = normalize(teacher.Name || (teacher as any).name);

        // Plans belonging to this teacher
        const teacherPlans = plans.filter((p) => {
          const pId = normalize(p.teacher_id || (p as any).Teacher_ID);
          const pName = normalize(p.teacher_name || (p as any).Teacher_Name);
          return (tId && pId === tId) || (tName && pName === tName);
        });

        let isSubmitted = false;
        let isOnTime = false;
        let isLate = false;
        let plan: LessonPlan | undefined = undefined;
        let submittedAtFormatted: string | undefined = undefined;

        if (selectedTaskKey === 'all') {
          // In 'all' mode: teacher must submit all active assignments or at least have submitted their required plans
          if (activeAssignments.length > 0) {
            const submittedTasks = activeAssignments.filter((cfg) =>
              teacherPlans.some((p) => isPlanMatchingAssignment(p, cfg))
            );
            isSubmitted = submittedTasks.length === activeAssignments.length;
            
            // Check if any plan for any assignment is late
            const relevantPlans = teacherPlans.filter((p) =>
              activeAssignments.some((cfg) => isPlanMatchingAssignment(p, cfg))
            );
            if (relevantPlans.length > 0) {
              const anyLate = relevantPlans.some((p) => p.is_late);
              isLate = anyLate;
              isOnTime = isSubmitted && !anyLate;
              // sort to find the latest
              const sorted = [...relevantPlans].sort(
                (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
              );
              plan = sorted[0];
            }
          } else {
            // No configured deadlines: check if teacher has any submitted plan
            isSubmitted = teacherPlans.length > 0;
            if (isSubmitted) {
              const sorted = [...teacherPlans].sort(
                (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
              );
              plan = sorted[0];
              isLate = !!plan.is_late;
              isOnTime = !isLate;
            }
          }
        } else if (currentAssignment) {
          // Specific assignment mode
          const matching = teacherPlans.filter((p) => isPlanMatchingAssignment(p, currentAssignment));
          if (matching.length > 0) {
            const sorted = [...matching].sort(
              (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
            );
            plan = sorted[0];
            isSubmitted = true;
            isLate = !!plan.is_late;
            isOnTime = !isLate;
          }
        }

        if (isSubmitted && plan) {
          submittedCount++;
          if (isOnTime) onTimeCount++;
          if (isLate) lateCount++;

          const timeMs = new Date(plan.submitted_at).getTime();
          if (!isNaN(timeMs) && timeMs > latestSubmissionMs) {
            latestSubmissionMs = timeMs;
            finalFinisher = teacher.Name;
          }

          try {
            submittedAtFormatted = formatThaiDateTime(plan.submitted_at);
          } catch {
            submittedAtFormatted = plan.submitted_at;
          }
        }

        return {
          teacher,
          isSubmitted,
          isOnTime,
          isLate,
          plan,
          submittedAtFormatted,
        };
      });

      const pendingTeachersCount = Math.max(0, totalTeachers - submittedCount);
      const completionRate = totalTeachers > 0 ? Math.round((submittedCount / totalTeachers) * 100) : 0;
      const onTimeRate = totalTeachers > 0 ? Math.round((onTimeCount / totalTeachers) * 100) : 0;
      const isCompletedAll = submittedCount === totalTeachers && totalTeachers > 0;
      const isOnTimeAll = isCompletedAll && onTimeCount === totalTeachers && lateCount === 0;

      let completionDateFormatted: string | null = null;
      let timeAheadText: string | null = null;

      if (isCompletedAll && latestSubmissionMs > 0) {
        try {
          const d = new Date(latestSubmissionMs);
          completionDateFormatted = d.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' น.';
        } catch {
          completionDateFormatted = 'เสร็จสิ้นครบถ้วน';
        }

        timeAheadText = calculateAheadTime(latestSubmissionMs, currentAssignment);
      }

      return {
        rank: 0,
        areaName,
        totalTeachers,
        submittedTeachersCount: submittedCount,
        onTimeTeachersCount: onTimeCount,
        lateTeachersCount: lateCount,
        pendingTeachersCount,
        completionRate,
        onTimeRate,
        isCompletedAll,
        isOnTimeAll,
        completionTimestamp: isCompletedAll ? latestSubmissionMs : null,
        completionDateFormatted,
        timeAheadText,
        finalFinisherName: finalFinisher,
        teachersDetail,
      };
    });

    // 5. Leaderboard Sorting Algorithm
    // Priority 1: isOnTimeAll (100% on-time & 100% completed) -> sorted ascending by completionTimestamp (earliest first)
    // Priority 2: isCompletedAll (100% completed but has late submissions) -> sorted by onTimeRate desc, then completionTimestamp asc
    // Priority 3: Not yet 100% completed -> sorted by onTimeRate desc, then completionRate desc
    items.sort((a, b) => {
      // Both completed 100% and 100% on-time: sort by who finished first!
      if (a.isOnTimeAll && b.isOnTimeAll) {
        return (a.completionTimestamp || 0) - (b.completionTimestamp || 0);
      }
      if (a.isOnTimeAll && !b.isOnTimeAll) return -1;
      if (!a.isOnTimeAll && b.isOnTimeAll) return 1;

      // Both completed 100% but some were late: sort by higher on-time rate, then timestamp
      if (a.isCompletedAll && b.isCompletedAll) {
        if (b.onTimeRate !== a.onTimeRate) {
          return b.onTimeRate - a.onTimeRate;
        }
        return (a.completionTimestamp || 0) - (b.completionTimestamp || 0);
      }
      if (a.isCompletedAll && !b.isCompletedAll) return -1;
      if (!a.isCompletedAll && b.isCompletedAll) return 1;

      // Both in-progress: sort by on-time rate, then completion rate, then submitted count
      if (b.onTimeRate !== a.onTimeRate) {
        return b.onTimeRate - a.onTimeRate;
      }
      if (b.completionRate !== a.completionRate) {
        return b.completionRate - a.completionRate;
      }
      return b.submittedTeachersCount - a.submittedTeachersCount;
    });

    // Assign rank numbers (1, 2, 3...)
    items.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return items;
  }, [learningAreas, teachingStaff, plans, selectedTaskKey, activeAssignments]);

  // Filtered list based on filterMode
  const displayedRankings = useMemo(() => {
    if (filterMode === 'perfect_only') {
      return rankingData.filter((r) => r.isOnTimeAll);
    }
    return rankingData;
  }, [rankingData, filterMode]);

  // Top 3 Podium Winners
  const top1 = rankingData[0];
  const top2 = rankingData[1];
  const top3 = rankingData[2];

  // Current task title for header display
  const currentTaskTitle = useMemo(() => {
    if (selectedTaskKey === 'all') {
      return 'ภาพรวมทุกภาระงานที่เปิดรับส่ง';
    }
    const found = activeAssignments.find((c) => c.id === selectedTaskKey);
    return found ? found.name : 'ภาระงานวิชาการ';
  }, [selectedTaskKey, activeAssignments]);

  return (
    <div className={`space-y-6 ${embedded ? '' : 'p-4 sm:p-6 bg-slate-50/70 rounded-3xl border border-slate-200/90'}`}>
      {/* 1. Header with Trophy Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-slate-950 shadow-md relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/15 rounded-full blur-xl pointer-events-none"></div>
        <div className="absolute right-32 -top-10 w-36 h-36 bg-amber-200/20 rounded-full blur-lg pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/10 rounded-full text-xs font-bold text-slate-950">
              <Sparkles className="w-3.5 h-3.5 text-amber-900" />
              <span>การประเมินความเร็วและวินัยการส่งงานระดับกลุ่มสาระ (SLA Hall of Fame)</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 flex items-center gap-2.5 flex-wrap">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-amber-900 shrink-0" />
              <span>ทำเนียบจัดอันดับกลุ่มสาระยอดเยี่ยม</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-800/90 max-w-2xl leading-relaxed">
              จัดอันดับกลุ่มสาระการเรียนรู้ที่ครูผู้สอน<strong>ส่งเอกสารครบ 100% และตรงเวลาทุกคนก่อนเป็นกลุ่มแรก</strong> โดยบันทึกเวลาที่ครูคนสุดท้ายในกลุ่มส่งเข้าระบบสำเร็จจริง (Real-Time Finish Timestamp)
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-slate-950 hover:bg-black text-amber-300 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>พิมพ์ประกาศเกียรติคุณ A4</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div className="mt-6 pt-5 border-t border-slate-950/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/30 backdrop-blur-xs p-3 rounded-2xl border border-white/20">
            <span className="text-[11px] font-medium text-slate-800">กลุ่มที่ตรงเวลาครบ 100%</span>
            <div className="text-2xl font-black text-slate-950 mt-0.5">
              {rankingData.filter((r) => r.isOnTimeAll).length}{' '}
              <span className="text-xs font-bold text-slate-800">/ {rankingData.length} กลุ่ม</span>
            </div>
          </div>
          <div className="bg-white/30 backdrop-blur-xs p-3 rounded-2xl border border-white/20">
            <span className="text-[11px] font-medium text-slate-800">กลุ่มอันดับ 1 ชนะเลิศ</span>
            <div className="text-base font-black text-slate-950 mt-1 truncate" title={top1 ? top1.areaName : '-'}>
              🥇 {top1 && top1.isOnTimeAll ? top1.areaName : 'ยังรอผู้ชนะ 100%'}
            </div>
          </div>
          <div className="bg-white/30 backdrop-blur-xs p-3 rounded-2xl border border-white/20">
            <span className="text-[11px] font-medium text-slate-800">ภาระงานที่กำลังจัดอันดับ</span>
            <div className="text-sm font-bold text-slate-950 mt-1 truncate" title={currentTaskTitle}>
              {currentTaskTitle}
            </div>
          </div>
          <div className="bg-white/30 backdrop-blur-xs p-3 rounded-2xl border border-white/20">
            <span className="text-[11px] font-medium text-slate-800">กลุ่มสาระทั้งหมด</span>
            <div className="text-2xl font-black text-slate-950 mt-0.5">
              {rankingData.length} <span className="text-xs font-bold text-slate-800">กลุ่มสาระ</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Control & Assignment Selection Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Assignment Selector */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>เลือกประเภทเอกสารที่ต้องการจัดอันดับ:</span>
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1 md:pb-0">
              <button
                onClick={() => setSelectedTaskKey('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  selectedTaskKey === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📑 ภาพรวมทุกภาระงาน
              </button>

              {activeAssignments.map((cfg) => {
                const isSelected = selectedTaskKey === cfg.id;
                return (
                  <button
                    key={cfg.id}
                    onClick={() => setSelectedTaskKey(cfg.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{cfg.name}</span>
                    {cfg.end_date && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'}`}>
                        {cfg.end_date.split('-').slice(1).join('/')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter completed only */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs shrink-0 self-start md:self-auto">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แสดงทุกกลุ่มสาระ ({rankingData.length})
            </button>
            <button
              onClick={() => setFilterMode('perfect_only')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'perfect_only'
                  ? 'bg-emerald-600 shadow-xs text-white'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <span>เฉพาะกลุ่มตรงเวลา 100%</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterMode === 'perfect_only' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {rankingData.filter((r) => r.isOnTimeAll).length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Top 3 Podium Showcase (แท่นเกียรติยศ 3 อันดับแรก) */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>เกียรติยศสูงสุด 3 อันดับแรก (Top 3 Department Podium)</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            กลุ่มสาระที่ทำสถิติส่งเอกสารครบและตรงเวลาทุกคนเร็วที่สุด
          </h3>
          <p className="text-xs text-slate-400">
            จัดอันดับจากเวลาที่บุคลากรครูคนสุดท้ายในกลุ่มส่งงานตรงเวลาเข้าระบบสำเร็จจริง ({currentTaskTitle})
          </p>
        </div>

        {/* 3-Column Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 max-w-4xl mx-auto items-end">
          {/* SILVER - RANK 2 */}
          <div className="order-2 md:order-1 bg-slate-800/80 rounded-2xl p-5 border border-slate-700 hover:border-slate-500 transition-all text-center flex flex-col justify-between h-full relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900 flex items-center justify-center font-black text-xl shadow-md border-2 border-slate-200">
                🥈
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                รองชนะเลิศอันดับ 1
              </div>
              <div className="text-base font-extrabold text-white truncate px-2" title={top2?.areaName}>
                {top2 ? top2.areaName : 'ยังไม่มีผู้ได้รับ'}
              </div>

              {top2 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-700/80 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ความสำเร็จ:</span>
                    <span className="font-bold text-white">{top2.submittedTeachersCount}/{top2.totalTeachers} ท่าน ({top2.completionRate}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ความตรงต่อเวลา:</span>
                    <span className={`font-bold ${top2.onTimeRate === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {top2.onTimeRate}%
                    </span>
                  </div>
                  {top2.completionDateFormatted ? (
                    <div className="p-2 rounded-xl bg-slate-900/90 text-[11px] text-slate-300 text-left space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-400 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>สำเร็จสมบูรณ์เมื่อ:</span>
                      </div>
                      <div className="font-bold text-slate-200">{top2.completionDateFormatted}</div>
                      {top2.timeAheadText && (
                        <div className="text-[10px] text-emerald-400 font-semibold">{top2.timeAheadText}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400/90 pt-1">
                      {top2.pendingTeachersCount > 0 ? `ค้างส่งอีก ${top2.pendingTeachersCount} ท่าน` : 'มีครูส่งช้า'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* GOLD - RANK 1 (CHAMPION) - Elevated */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-amber-400 shadow-xl text-center flex flex-col justify-between h-full relative overflow-hidden md:-translate-y-3 group">
            <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black py-1 tracking-wider uppercase">
              ★ CHAMPION OF PUNCTUALITY ★
            </div>

            <div className="space-y-3.5 pt-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-slate-950 flex items-center justify-center font-black text-3xl shadow-lg border-2 border-white">
                🥇
              </div>
              <div className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>อันดับ 1 ชนะเลิศ</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white px-2" title={top1?.areaName}>
                {top1 ? top1.areaName : 'ยังไม่มีผู้ทำสำเร็จ'}
              </div>

              {top1 && (
                <div className="space-y-2 pt-2 border-t border-amber-500/30 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>ความสำเร็จ:</span>
                    <span className="font-extrabold text-white text-sm">
                      {top1.submittedTeachersCount}/{top1.totalTeachers} ท่าน (100%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>ความตรงต่อเวลา:</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      {top1.onTimeRate}% ตรงเวลาทุกคน
                    </span>
                  </div>

                  {top1.completionDateFormatted ? (
                    <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 text-[11px] text-slate-300 text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>วัน-เวลาที่ส่งครบทุกคน:</span>
                      </div>
                      <div className="font-black text-white text-xs">{top1.completionDateFormatted}</div>
                      {top1.timeAheadText && (
                        <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{top1.timeAheadText}</span>
                        </div>
                      )}
                      {top1.finalFinisherName && (
                        <div className="text-[10px] text-slate-400 pt-0.5 truncate">
                          ส่งคนสุดท้าย: {top1.finalFinisherName}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 font-bold pt-1">
                      {top1.pendingTeachersCount > 0 ? `ค้างส่งอีก ${top1.pendingTeachersCount} ท่าน` : 'ยังไม่มีกลุ่มที่ส่งครบ 100%'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BRONZE - RANK 3 */}
          <div className="order-3 bg-slate-800/80 rounded-2xl p-5 border border-slate-700 hover:border-slate-500 transition-all text-center flex flex-col justify-between h-full relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-600 text-amber-100 flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-500">
                🥉
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                รองชนะเลิศอันดับ 2
              </div>
              <div className="text-base font-extrabold text-white truncate px-2" title={top3?.areaName}>
                {top3 ? top3.areaName : 'ยังไม่มีผู้ได้รับ'}
              </div>

              {top3 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-700/80 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ความสำเร็จ:</span>
                    <span className="font-bold text-white">{top3.submittedTeachersCount}/{top3.totalTeachers} ท่าน ({top3.completionRate}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ความตรงต่อเวลา:</span>
                    <span className={`font-bold ${top3.onTimeRate === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {top3.onTimeRate}%
                    </span>
                  </div>
                  {top3.completionDateFormatted ? (
                    <div className="p-2 rounded-xl bg-slate-900/90 text-[11px] text-slate-300 text-left space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-400 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>สำเร็จสมบูรณ์เมื่อ:</span>
                      </div>
                      <div className="font-bold text-slate-200">{top3.completionDateFormatted}</div>
                      {top3.timeAheadText && (
                        <div className="text-[10px] text-emerald-400 font-semibold">{top3.timeAheadText}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400/90 pt-1">
                      {top3.pendingTeachersCount > 0 ? `ค้างส่งอีก ${top3.pendingTeachersCount} ท่าน` : 'มีครูส่งช้า'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Complete Leaderboard Ranking Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Medal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ตารางจัดอันดับทั้ง 8 กลุ่มสาระการเรียนรู้
              </h3>
              <p className="text-xs text-slate-500">
                จัดอันดับตามเกณฑ์: ส่งครบ 100% ตรงเวลาทุกคนก่อน → อัตราส่งตรงเวลา → อัตราส่งรวม
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            แสดง {displayedRankings.length} จาก {rankingData.length} กลุ่มสาระ
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayedRankings.map((dept) => {
            const isExpanded = expandedArea === dept.areaName;
            const isTop1 = dept.rank === 1 && dept.isOnTimeAll;
            const isTop2 = dept.rank === 2 && dept.isOnTimeAll;
            const isTop3 = dept.rank === 3 && dept.isOnTimeAll;

            return (
              <div key={dept.areaName} className="transition-colors hover:bg-slate-50/70">
                {/* Main Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Rank Badge + Department Title */}
                  <div className="flex items-center gap-3.5 min-w-[280px]">
                    {/* Rank Badge */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-xs ${
                        isTop1
                          ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-2 border-white ring-2 ring-amber-400'
                          : isTop2
                          ? 'bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-800 border border-slate-300'
                          : isTop3
                          ? 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white border border-amber-500'
                          : dept.isOnTimeAll
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${dept.rank}`}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {dept.areaName}
                        </span>
                        {dept.isOnTimeAll ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ส่งครบตรงเวลา 100%</span>
                          </span>
                        ) : dept.isCompletedAll ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>ครบ 100% (มีส่งช้า {dept.lateTeachersCount} ท่าน)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <span>กำลังส่ง (ขาด {dept.pendingTeachersCount} ท่าน)</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>จำนวนครูผู้สอน: <strong>{dept.totalTeachers} ท่าน</strong></span>
                        <span>•</span>
                        <span>ส่งแล้ว: <strong>{dept.submittedTeachersCount} ท่าน</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Progress bars & Rates */}
                  <div className="flex-1 max-w-md space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">ความก้าวหน้าการส่งงาน</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{dept.completionRate}%</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-semibold text-emerald-700">ตรงเวลา {dept.onTimeRate}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex shadow-2xs">
                      <div
                        className="bg-emerald-500 h-2.5 transition-all"
                        style={{ width: `${dept.onTimeRate}%` }}
                        title={`ตรงเวลา ${dept.onTimeTeachersCount} ท่าน`}
                      ></div>
                      <div
                        className="bg-amber-500 h-2.5 transition-all"
                        style={{
                          width: `${Math.max(
                            0,
                            dept.completionRate - dept.onTimeRate
                          )}%`,
                        }}
                        title={`ส่งช้า ${dept.lateTeachersCount} ท่าน`}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="text-emerald-700">✓ ตรงเวลา: {dept.onTimeTeachersCount}</span>
                      {dept.lateTeachersCount > 0 && (
                        <span className="text-amber-700">⚠️ ส่งช้า: {dept.lateTeachersCount}</span>
                      )}
                      {dept.pendingTeachersCount > 0 && (
                        <span className="text-rose-600 font-semibold">รอส่ง: {dept.pendingTeachersCount}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Timestamp of Completion & Action button */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                    <div className="text-left lg:text-right space-y-0.5">
                      <div className="text-[11px] text-slate-400 font-medium">วัน-เวลาที่ส่งครบทุกคน:</div>
                      {dept.completionDateFormatted ? (
                        <div className="text-xs font-bold text-slate-900 font-mono">
                          {dept.completionDateFormatted}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">
                          ยังไม่ครบ 100%
                        </div>
                      )}
                      {dept.timeAheadText && (
                        <div className="text-[10px] text-emerald-600 font-bold">
                          {dept.timeAheadText}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedArea(isExpanded ? null : dept.areaName)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>รายชื่อ</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Drawer: Teacher-by-teacher breakdown in this department */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-100 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>สถานะการส่งงานรายบุคคล กลุ่มสาระฯ {dept.areaName} ({dept.teachersDetail.length} ท่าน)</span>
                      </span>
                      <span className="text-slate-500">
                        {currentTaskTitle}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {dept.teachersDetail.map((item) => (
                        <div
                          key={item.teacher.Teacher_ID}
                          className={`p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                            item.isOnTime
                              ? 'bg-white border-emerald-200'
                              : item.isLate
                              ? 'bg-amber-50/80 border-amber-200'
                              : 'bg-rose-50/80 border-rose-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900 truncate" title={item.teacher.Name}>
                                {item.teacher.Name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {item.teacher.Teacher_ID}
                              </div>
                            </div>

                            {item.isOnTime ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                ตรงเวลา
                              </span>
                            ) : item.isLate ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 shrink-0">
                                ส่งช้า
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900 shrink-0">
                                ยังไม่ส่ง
                              </span>
                            )}
                          </div>

                          {item.isSubmitted && item.plan ? (
                            <div className="pt-1 border-t border-slate-100 text-[11px] space-y-1">
                              <div className="text-slate-600 truncate" title={item.plan.plan_title}>
                                {item.plan.plan_title}
                              </div>
                              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                <span>ส่งเมื่อ: {item.submittedAtFormatted}</span>
                                {onOpenPlan && (
                                  <button
                                    onClick={() => onOpenPlan(item.plan!)}
                                    className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                  >
                                    ดูแผน
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-1 border-t border-rose-100 flex items-center justify-between text-[11px]">
                              <span className="text-rose-600 font-medium">ยังไม่มีข้อมูลส่งในระบบ</span>
                              {onSendReminder && (
                                <button
                                  onClick={() => onSendReminder(item.teacher)}
                                  className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>แจ้งเตือน</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Printable Certificate & Summary A4 Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold">ประกาศเกียรติคุณและผลการจัดอันดับกลุ่มสาระ (A4 Print / PDF)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official Report Content (Printable Layout) */}
            <div className="p-8 sm:p-12 space-y-6 text-slate-900 bg-white">
              <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
                <img
                  src="/logo.svg"
                  alt="โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
                  className="h-20 mx-auto object-contain"
                />
                <h1 className="text-xl font-bold tracking-tight">
                  ประกาศเกียรติคุณและผลการจัดอันดับกลุ่มสาระการเรียนรู้ดีเด่นด้านวินัยการส่งงาน
                </h1>
                <p className="text-sm font-semibold text-slate-700">
                  โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
                </p>
                <p className="text-xs text-slate-500">
                  ภาระงาน: {currentTaskTitle} • ภาคเรียนที่ 1 ปีการศึกษา 2569
                </p>
                <p className="text-xs text-slate-400">
                  วันที่ออกประกาศ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Champion Citation */}
              {top1 && top1.isOnTimeAll && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center space-y-1">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    🏆 รางวัลชนะเลิศกลุ่มสาระการเรียนรู้ดีเด่นอันดับ 1
                  </div>
                  <div className="text-2xl font-black text-amber-950">
                    กลุ่มสาระการเรียนรู้{top1.areaName}
                  </div>
                  <p className="text-xs text-amber-900/90 leading-relaxed max-w-xl mx-auto">
                    สามารถดำเนินการส่งเอกสารครบถ้วน 100% ตรงเวลาทุกคนเป็นกลุ่มแรกของสถานศึกษา เมื่อวันที่ {top1.completionDateFormatted} {top1.timeAheadText ? `(${top1.timeAheadText})` : ''}
                  </p>
                </div>
              )}

              {/* Table in Printout */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">
                  ตารางสรุปผลการจัดอันดับ 8 กลุ่มสาระการเรียนรู้
                </h3>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                    <tr>
                      <th className="p-2 text-center border-r border-slate-300">อันดับ</th>
                      <th className="p-2 border-r border-slate-300">กลุ่มสาระการเรียนรู้</th>
                      <th className="p-2 text-center border-r border-slate-300">จำนวนครู</th>
                      <th className="p-2 text-center border-r border-slate-300">ส่งครบ</th>
                      <th className="p-2 text-center border-r border-slate-300">ตรงเวลา</th>
                      <th className="p-2 text-center border-r border-slate-300">วัน-เวลาที่ส่งครบ</th>
                      <th className="p-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rankingData.map((d) => (
                      <tr key={d.areaName}>
                        <td className="p-2 text-center border-r border-slate-200 font-bold font-mono">
                          {d.rank === 1 && d.isOnTimeAll ? '🥇 1' : d.rank === 2 && d.isOnTimeAll ? '🥈 2' : d.rank === 3 && d.isOnTimeAll ? '🥉 3' : d.rank}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-medium">{d.areaName}</td>
                        <td className="p-2 text-center border-r border-slate-200 font-mono">{d.totalTeachers}</td>
                        <td className="p-2 text-center border-r border-slate-200 font-bold font-mono">{d.submittedTeachersCount} ({d.completionRate}%)</td>
                        <td className="p-2 text-center border-r border-slate-200 text-emerald-700 font-bold font-mono">{d.onTimeRate}%</td>
                        <td className="p-2 text-center border-r border-slate-200 text-[11px] font-mono">
                          {d.completionDateFormatted || '-'}
                        </td>
                        <td className="p-2 text-center font-bold text-[11px]">
                          {d.isOnTimeAll ? 'ตรงเวลา 100%' : d.isCompletedAll ? `ครบ (ช้า ${d.lateTeachersCount})` : `รอส่ง ${d.pendingTeachersCount}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Line */}
              <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
                <div className="space-y-14">
                  <p>ลงชื่อ............................................................</p>
                  <div>
                    <p className="font-bold">(ผู้อำนวยการสถานศึกษา)</p>
                    <p className="text-slate-500 mt-1">โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
                  </div>
                </div>

                <div className="space-y-14">
                  <p>ลงชื่อ............................................................</p>
                  <div>
                    <p className="font-bold">(รองผู้อำนวยการกลุ่มบริหารวิชาการ)</p>
                    <p className="text-slate-500 mt-1">โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
