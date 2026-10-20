import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig } from '../types';
import { constructDateTime, formatThaiDateTime } from '../utils/deadlineUtils';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Upload,
  ArrowRight,
  ArrowDown,
  Flame,
  X,
  Sparkles,
} from 'lucide-react';

interface DeadlineCountdownBannerProps {
  currentTeacher: Teacher;
  plans: LessonPlan[];
  deadlineConfigs: PlanTypeDeadlineConfig[];
  onOpenSubmitForType: (planType: string) => void;
  isAdmin: boolean;
  onScrollToAssignments?: () => void;
}

export const DeadlineCountdownBanner: React.FC<DeadlineCountdownBannerProps> = ({
  currentTeacher,
  plans,
  deadlineConfigs,
  onOpenSubmitForType,
  isAdmin,
  onScrollToAssignments,
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Update tick every 30 seconds for live countdown accuracy
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filter active deadline configs
  const activeConfigs = useMemo(() => {
    return (deadlineConfigs || []).filter((c) => c.is_active !== false);
  }, [deadlineConfigs]);

  // Find target deadline to highlight
  const targetInfo = useMemo(() => {
    const normalize = (val?: string) => String(val || '').trim().toLowerCase();
    const currentId = normalize(currentTeacher.Teacher_ID || (currentTeacher as any).teacher_id);
    const currentName = normalize(currentTeacher.Name || (currentTeacher as any).name);

    const myPlans = plans.filter((p) => {
      const pId = normalize(p.teacher_id || (p as any).Teacher_ID);
      const pName = normalize(p.teacher_name || (p as any).Teacher_Name);
      return (currentId && pId === currentId) || (currentName && pName === currentName);
    });

    // Calculate details for each active config
    const computed = activeConfigs.map((config) => {
      const deadlineDate = constructDateTime(config.end_date, config.end_time || '23:59');
      const diffMs = deadlineDate.getTime() - now.getTime();
      const isOverdue = diffMs < 0;
      const absMs = Math.abs(diffMs);
      const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

      const hasSubmitted = myPlans.some(
        (p) => p.plan_type.trim().toLowerCase() === config.name.trim().toLowerCase()
      );

      return {
        config,
        deadlineDate,
        diffMs,
        isOverdue,
        days,
        hours,
        minutes,
        hasSubmitted,
        allCompleted: false,
      };
    });

    if (!isAdmin) {
      // Prioritize unsubmitted and not-yet-overdue, closest first
      const pendingUpcoming = computed
        .filter((c) => !c.hasSubmitted && !c.isOverdue)
        .sort((a, b) => a.diffMs - b.diffMs);

      if (pendingUpcoming.length > 0) {
        return pendingUpcoming[0];
      }

      // If overdue pending exists
      const overduePending = computed
        .filter((c) => !c.hasSubmitted && c.isOverdue)
        .sort((a, b) => b.diffMs - a.diffMs);

      if (overduePending.length > 0) {
        return overduePending[0];
      }

      // If all submitted
      return {
        ...computed[0],
        allCompleted: true,
      };
    } else {
      // Admin: show closest upcoming deadline across the school
      const upcoming = [...computed].sort((a, b) => a.diffMs - b.diffMs);
      return upcoming[0];
    }
  }, [activeConfigs, plans, currentTeacher, now, isAdmin]);

  if (!targetInfo || isDismissed) return null;

  const { config, isOverdue, days, hours, minutes, allCompleted } = targetInfo;

  const handleScrollToPending = () => {
    window.dispatchEvent(new CustomEvent('filter-assignments', { detail: { filter: 'pending' } }));
    if (onScrollToAssignments) {
      onScrollToAssignments();
    } else {
      const el = document.getElementById('assigned-documents-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-4 sm:p-5 shadow-lg shadow-amber-500/20 border-2 border-amber-300 transition-all animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Decorative Glow Elements */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/25 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-400/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left Info: Icon & Message */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#0B1329] text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            {allCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : isOverdue ? (
              <AlertTriangle className="w-6 h-6 text-rose-400 animate-bounce" />
            ) : days <= 1 ? (
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            ) : (
              <Clock className="w-6 h-6 text-amber-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#0B1329] text-amber-300 shrink-0">
                ⚡ แถบนับถอยหลังส่งงาน
              </span>
              <span className="text-xs font-bold text-slate-900 truncate">
                {config.name}
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              {allCompleted ? (
                <p className="text-sm sm:text-base font-extrabold text-slate-950">
                  🎉 ยอดเยี่ยม! ท่านส่งเอกสารตามกำหนดครบทุกรายการแล้ว
                </p>
              ) : isOverdue ? (
                <p className="text-sm sm:text-base font-extrabold text-slate-950 flex items-center gap-1.5">
                  <span>สิ้นสุดกำหนดเวลาแล้ว</span>
                  <span className="text-xs font-bold bg-rose-600 text-white px-2 py-0.5 rounded-md">
                    เลยกำหนดมา {days} วัน {hours} ชม.
                  </span>
                </p>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    เหลือเวลาอีก:
                  </span>
                  <div className="inline-flex items-center gap-1 bg-[#0B1329] text-white px-2.5 py-1 rounded-lg font-mono font-black text-xs sm:text-sm shadow-inner">
                    <span className="text-amber-400 font-bold">{days}</span> วัน
                    <span className="text-amber-400 font-bold ml-1">{hours}</span> ชม.
                    <span className="text-amber-400 font-bold ml-1">{minutes}</span> นาที
                  </div>
                </div>
              )}

              <span className="text-[11px] sm:text-xs text-slate-800/90 hidden lg:inline">
                (กำหนดส่ง: {formatThaiDateTime(`${config.end_date} ${config.end_time || '23:59'}`)} น.)
              </span>
            </div>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
          {!allCompleted && !isAdmin && (
            <button
              onClick={handleScrollToPending}
              className="flex-1 md:flex-initial px-4 sm:px-5 py-2.5 bg-[#0B1329] hover:bg-slate-900 text-amber-300 hover:text-white rounded-xl text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="เลื่อนลงไปยังรายการงานที่ยังไม่ได้ส่ง"
            >
              <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>เลื่อนไปงานที่ยังไม่ส่ง</span>
              <ArrowDown className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}

          {isAdmin && (
            <div className="px-3 py-1.5 bg-[#0B1329]/90 text-amber-300 rounded-xl text-xs font-bold border border-amber-400/40">
              สถานะเปิดรับส่งทั้งโรงเรียน
            </div>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-black/10 text-slate-800 transition-colors"
            title="ซ่อนการแจ้งเตือนนี้"
            aria-label="ปิดแถบแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
