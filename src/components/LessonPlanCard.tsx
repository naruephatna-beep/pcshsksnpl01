import React from 'react';
import {
  LessonPlan,
  Teacher,
  isTeacherAdmin,
  PlanStatusConfig,
  PlanTypeDeadlineConfig,
} from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  getPlanStatusInfo,
  checkSubmissionTimeliness,
} from '../utils/deadlineUtils';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Printer,
  UserCheck,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Edit,
} from 'lucide-react';

interface LessonPlanCardProps {
  plan: LessonPlan;
  currentTeacher: Teacher;
  onOpenReceipt: (plan: LessonPlan) => void;
  onOpenReview: (plan: LessonPlan) => void;
  onDeletePlan: (planId: string) => void;
  onEditPlan?: (plan: LessonPlan) => void;
  onResubmitPlan?: (plan: LessonPlan) => void;
  statusConfigs?: PlanStatusConfig[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  onQuickChangeStatus?: (plan: LessonPlan, newStatus: string) => void;
  onToggleLate?: (plan: LessonPlan) => void;
}

export const LessonPlanCard: React.FC<LessonPlanCardProps> = ({
  plan,
  currentTeacher,
  onOpenReceipt,
  onOpenReview,
  onDeletePlan,
  onEditPlan,
  onResubmitPlan,
  statusConfigs,
  deadlineConfigs,
  onQuickChangeStatus,
  onToggleLate,
}) => {
  const photoUrl = formatGoogleDriveImageUrl(plan.teacher_photo);
  const isAdmin = isTeacherAdmin(currentTeacher);
  const isOwner = plan.teacher_id === currentTeacher.Teacher_ID;
  const canReview = isAdmin;

  // Timeliness & Late Status calculation
  const timeliness = checkSubmissionTimeliness(plan.plan_type, plan.submitted_at, deadlineConfigs);
  const isLate = plan.is_late !== undefined ? plan.is_late : timeliness.isLate;
  const delayNote = plan.submission_delay_text || timeliness.delayText;

  // Dynamic Status Info configured by Admin
  const statusInfo = getPlanStatusInfo(plan.status, statusConfigs);

  return (
    <div
      className={`bg-white rounded-xl border shadow-2xs hover:shadow-sm transition-all p-4 sm:p-5 flex flex-col justify-between group ${
        isLate ? 'border-amber-300/80 hover:border-amber-400' : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      <div>
        {/* Card Header: Subject Code & Status */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-white shrink-0">
              {plan.subject_code}
            </span>
            <span className="text-xs font-bold text-slate-800 truncate">
              {plan.subject_name}
            </span>
          </div>

          {/* Badges Container */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            {/* LATE SUBMISSION BADGE */}
            {isLate && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                title={`ส่งช้ากว่ากำหนด: ${delayNote}`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                <span>ส่งช้า</span>
              </span>
            )}

            {/* DYNAMIC STATUS BADGE */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${statusInfo.style.badge}`}
              title={statusInfo.id}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.style.dot}`}></span>
              <span>{statusInfo.label}</span>
              {plan.status === 'approved' && plan.total_score ? (
                <span className="font-mono text-[10px]">({plan.total_score}%)</span>
              ) : null}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-2.5 text-sm sm:text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
          {plan.plan_title}
        </h3>

        {/* Metadata (Zero-Pill discipline: unboxed with typographic · separators) */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
          <span>{plan.grade_level}</span>
          <span aria-hidden="true">·</span>
          <span>เทอม {plan.semester}/{plan.academic_year}</span>
          <span aria-hidden="true">·</span>
          <span>{plan.total_hours} ชม.</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-700 font-medium">{plan.plan_type}</span>
        </div>

        {/* Teacher details */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={plan.teacher_name}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-bold text-slate-700">
                  {getInitials(plan.teacher_name)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {plan.teacher_name}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {plan.teacher_id} · {plan.learning_area}
              </div>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-mono shrink-0">
            {plan.submitted_at.split(' ')[0]}
          </span>
        </div>

        {/* Late submission explanation banner */}
        {isLate && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>ส่งช้า: {delayNote}</span>
            </span>
            {plan.deadline_at && (
              <span className="text-amber-800/80 font-mono text-[10px] shrink-0">
                กำหนด: {plan.deadline_at}
              </span>
            )}
          </div>
        )}

        {/* Needs revision alert & Resubmit action */}
        {plan.status === 'needs_revision' && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-rose-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>ส่งกลับแก้ไข</span>
              </span>
              {(isAdmin || isOwner) && onResubmitPlan && (
                <button
                  onClick={() => onResubmitPlan(plan)}
                  className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-md font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                  title="ส่งแผนที่ปรับปรุงแล้วเพื่อขอรับการตรวจอีกครั้ง"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ส่งใหม่</span>
                </button>
              )}
            </div>
            {plan.review_comment ? (
              <div className="text-slate-800 bg-white/90 p-2 rounded border border-rose-200/70">
                <span className="font-bold text-slate-700 block text-[10px]">
                  ข้อเสนอแนะ ({plan.reviewer_name || 'ฝ่ายวิชาการ'}):
                </span>
                <p className="line-clamp-2 leading-relaxed text-[11px]">{plan.review_comment}</p>
              </div>
            ) : (
              <p className="text-rose-800 text-[11px]">
                กรุณาปรับปรุงแผนการจัดการเรียนรู้ และกดส่งใหม่อีกครั้ง
              </p>
            )}
          </div>
        )}

        {/* Feedback snippet if approved or with comment */}
        {plan.status !== 'needs_revision' && plan.review_comment && (
          <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-700 block mb-0.5 text-[10px]">
              ข้อเสนอแนะ ({plan.reviewer_name || 'ฝ่ายวิชาการ'}):
            </span>
            <p className="line-clamp-2 text-[11px]">{plan.review_comment}</p>
          </div>
        )}
      </div>

      {/* Admin Quick Status Bar */}
      {isAdmin && onQuickChangeStatus && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 text-[11px] font-bold flex items-center gap-1 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
            <span>ปรับสถานะ:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <select
              value={plan.status}
              onChange={(e) => onQuickChangeStatus(plan, e.target.value)}
              className="px-2 py-1 rounded-md border border-slate-300 text-[11px] font-bold bg-white text-slate-800 shadow-2xs cursor-pointer focus:ring-1 focus:ring-amber-500"
            >
              {(statusConfigs || []).map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.label}
                </option>
              ))}
            </select>
            {onToggleLate && (
              <button
                type="button"
                onClick={() => onToggleLate(plan)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                  isLate
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title="คลิกเพื่อสลับสถานะส่งช้า / ส่งตรงเวลา"
              >
                {isLate ? 'ส่งช้า' : 'ตรงเวลา'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Footer (Mobile responsive wrap with comfortable touch targets) */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* File link */}
          <a
            href={plan.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ดูไฟล์</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Receipt button */}
          <button
            onClick={() => onOpenReceipt(plan)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="พิมพ์ใบตอบรับการส่งแผน"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ใบตอบรับ</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Resubmit button */}
          {plan.status === 'needs_revision' && (isAdmin || isOwner) && onResubmitPlan && (
            <button
              onClick={() => onResubmitPlan(plan)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ส่งใหม่</span>
            </button>
          )}

          {/* Edit plan button */}
          {(isAdmin || isOwner) && onEditPlan && (
            <button
              onClick={() => onEditPlan(plan)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
              title="แก้ไขข้อมูลแผน"
            >
              <Edit className="w-3.5 h-3.5 text-slate-600" />
              <span>แก้ไข</span>
            </button>
          )}

          {/* Review button */}
          {canReview && (
            <button
              onClick={() => onOpenReview(plan)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{plan.status === 'submitted' ? 'ตรวจ' : 'ผลตรวจ'}</span>
            </button>
          )}

          {/* Delete */}
          {(isAdmin || isOwner) && (
            <button
              onClick={() => onDeletePlan(plan.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="ลบรายการ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
