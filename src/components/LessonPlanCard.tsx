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
  classifyDocumentType,
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
  Award,
  ChevronDown,
} from 'lucide-react';

interface LessonPlanCardProps {
  plan: LessonPlan;
  currentTeacher: Teacher;
  onOpenReceipt: (plan: LessonPlan) => void;
  onOpenReview: (plan: LessonPlan) => void;
  onDeletePlan: (planId: string) => void;
  onEditPlan?: (plan: LessonPlan) => void;
  onResubmitPlan?: (plan: LessonPlan) => void;
  onOpenCertificate?: (plan: LessonPlan) => void;
  statusConfigs?: PlanStatusConfig[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  onQuickChangeStatus?: (plan: LessonPlan, newStatus: string) => void;
  onToggleLate?: (plan: LessonPlan) => void;
  canReview?: boolean;
}

export const LessonPlanCard: React.FC<LessonPlanCardProps> = ({
  plan,
  currentTeacher,
  onOpenReceipt,
  onOpenReview,
  onDeletePlan,
  onEditPlan,
  onResubmitPlan,
  onOpenCertificate,
  statusConfigs,
  deadlineConfigs,
  onQuickChangeStatus,
  onToggleLate,
  canReview: canReviewProp,
}) => {
  const photoUrl = formatGoogleDriveImageUrl(plan.teacher_photo);
  const isAdmin = isTeacherAdmin(currentTeacher);
  const isOwner = plan.teacher_id === currentTeacher.Teacher_ID;
  const isDirectlyAssigned = Boolean(
    currentTeacher &&
      (plan.assigned_reviewer_id === currentTeacher.Teacher_ID ||
        plan.assigned_reviewer_name === currentTeacher.Name)
  );
  const canReview = canReviewProp !== undefined ? canReviewProp : (isAdmin || isDirectlyAssigned);
  const [showFileList, setShowFileList] = React.useState(false);

  // Extract all attached files if available in plan.notes
  const allAttachments = React.useMemo(() => {
    const list: { file_name: string; file_url: string; file_size?: string }[] = [];
    if (plan.notes) {
      try {
        const parsed = JSON.parse(plan.notes);
        if (parsed && Array.isArray(parsed._attachments) && parsed._attachments.length > 0) {
          parsed._attachments.forEach((att: any, idx: number) => {
            if (att && att.file_url && att.file_url !== '#') {
              list.push({
                file_name: att.file_name || `ไฟล์แนบ ${idx + 1}`,
                file_url: att.file_url,
                file_size: att.file_size,
              });
            }
          });
        }
      } catch {}
    }
    if (list.length === 0 && plan.file_url && plan.file_url !== '#') {
      list.push({
        file_name: plan.file_name || 'ดูไฟล์',
        file_url: plan.file_url,
      });
    }
    return list;
  }, [plan.notes, plan.file_url, plan.file_name]);

  // Extract per-file review results (Form B)
  const planFileReviews = React.useMemo(() => {
    if (plan.file_reviews && Array.isArray(plan.file_reviews) && plan.file_reviews.length > 0) {
      return plan.file_reviews;
    }
    if (plan.notes) {
      try {
        const parsed = JSON.parse(plan.notes);
        if (parsed && Array.isArray(parsed._file_reviews) && parsed._file_reviews.length > 0) {
          return parsed._file_reviews;
        }
      } catch {}
    }
    return null;
  }, [plan.file_reviews, plan.notes]);

  const [showFileReviewBreakdown, setShowFileReviewBreakdown] = React.useState(false);

  // Timeliness & Late Status calculation
  const timeliness = checkSubmissionTimeliness(plan.plan_type, plan.submitted_at, deadlineConfigs);
  const isLate = plan.is_late !== undefined ? plan.is_late : timeliness.isLate;
  const delayNote = plan.submission_delay_text || timeliness.delayText;

  // Dynamic Status Info configured by Admin
  const statusInfo = getPlanStatusInfo(plan.status, statusConfigs);
  const docMeta = classifyDocumentType(plan.plan_type);

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

        {/* Prominent Document Type Tag (แยกชนิดเอกสารชัดเจน) */}
        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${docMeta.badgeClass} shadow-2xs`}>
              <span>{docMeta.shortBadge}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              เทอม {plan.semester}/{plan.academic_year} · {plan.grade_level}
            </span>
          </div>

          {plan.current_stage_order && plan.status !== 'approved' && (
            <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md">
              ขั้นที่ {plan.current_stage_order}{plan.total_stages ? `/${plan.total_stages}` : ''}
              {plan.assigned_reviewer_name ? ` · ${plan.assigned_reviewer_name.split(' ')[0]}` : ''}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2 text-sm sm:text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
          {plan.plan_title}
        </h3>

        {/* Metadata */}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
          {plan.total_hours && !plan.plan_type.includes('วิจัย') ? (
            <>
              <span>{plan.total_hours} ชม.</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span className="text-slate-600 font-medium truncate max-w-[220px]" title={plan.plan_type}>
            {plan.plan_type}
          </span>
        </div>

        {/* Visual Workflow Timeline Progress Stepper */}
        {(() => {
          const hasBranch = Boolean(plan.branch);
          const steps = hasBranch
            ? [
                { id: 1, label: 'หน.สาขาวิชา' },
                { id: 2, label: 'หน.กลุ่มสาระ' },
                { id: 3, label: 'ผอ.อนุมัติ' },
              ]
            : [
                { id: 1, label: 'หน.กลุ่มสาระ' },
                { id: 2, label: 'ผอ.อนุมัติ' },
              ];

          const isApproved = plan.status === 'approved';
          const isNeedsRevision = plan.status === 'needs_revision';
          const currentStage = isApproved ? 99 : (plan.current_stage_order || 1);

          return (
            <div className="mt-2.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>ไทม์ไลน์ลำดับขั้น:</span>
                </span>
                {isApproved ? (
                  <span className="text-emerald-700 font-black">อนุมัติครบทุกระดับ ✓</span>
                ) : isNeedsRevision ? (
                  <span className="text-rose-600 font-bold">รอการปรับปรุง</span>
                ) : (
                  <span className="text-amber-700 font-bold truncate max-w-[150px]">
                    {plan.assigned_reviewer_name ? `รอ: ${plan.assigned_reviewer_name}` : 'กำลังรอตรวจ'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {steps.map((st, idx) => {
                  const isDone = isApproved || currentStage > st.id;
                  const isCurrent = !isApproved && currentStage === st.id;

                  return (
                    <React.Fragment key={st.id}>
                      <div
                        className={`flex-1 flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                          isDone
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : isCurrent
                            ? isNeedsRevision
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-300'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : isCurrent
                              ? isNeedsRevision
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-500 text-slate-950 font-black animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? '✓' : st.id}
                        </span>
                        <span className="truncate">{st.label}</span>
                      </div>
                      {idx < steps.length - 1 && (
                        <span className="text-slate-300 text-[10px] shrink-0">➔</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
              <div className="text-[11px] text-slate-400 font-mono truncate max-w-[210px]">
                {plan.teacher_id} · {plan.learning_area}{plan.branch ? ` (${plan.branch})` : ''}
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
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-lg font-bold text-[11px] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="แก้ไขข้อเสนอแนะและส่งแผนที่ปรับปรุงแล้วเพื่อขอรับการตรวจอีกครั้ง"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>แก้ไขและส่งตรวจใหม่</span>
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

        {/* Form B: Per-file Review Summary Chips & Collapsible Details */}
        {planFileReviews && planFileReviews.length > 1 && (
          <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs space-y-2">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  ผลตรวจแยกรายไฟล์ ({planFileReviews.filter((f) => f.status === 'approved').length}/{planFileReviews.length} ไฟล์ผ่าน)
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowFileReviewBreakdown(!showFileReviewBreakdown)}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{showFileReviewBreakdown ? 'ย่อผลตรวจ' : 'ดูคะแนนรายไฟล์'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showFileReviewBreakdown ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Quick status chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {planFileReviews.map((fr, idx) => {
                const isApp = fr.status === 'approved';
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      isApp
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                    title={`${fr.file_name}: ${isApp ? 'ผ่าน' : 'ส่งกลับแก้ไข'}${fr.comment ? ` - ${fr.comment}` : ''}`}
                  >
                    <span>{isApp ? '✓' : '⚠️'} ไฟล์ {idx + 1}</span>
                    {fr.total_score !== undefined && (
                      <span className="font-mono text-[9px] opacity-80">({fr.total_score}%)</span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Detailed per-file table when expanded */}
            {showFileReviewBreakdown && (
              <div className="pt-2 border-t border-indigo-100/80 space-y-1.5 animate-in fade-in">
                {planFileReviews.map((fr, idx) => {
                  const isApp = fr.status === 'approved';
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-[11px] ${
                        isApp
                          ? 'bg-white/90 border-emerald-200/80 text-emerald-950'
                          : 'bg-rose-50/90 border-rose-200 text-rose-950 ring-1 ring-rose-300/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isApp ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {isApp ? '✓ ผ่าน' : '⚠️ ตีกลับ'}
                          </span>
                          <span className="font-bold truncate max-w-[180px]">
                            {idx + 1}. {fr.file_name}
                          </span>
                        </div>
                        {fr.total_score !== undefined && (
                          <span className="font-mono font-bold text-[10px] text-slate-700 shrink-0">
                            {fr.total_score}%
                          </span>
                        )}
                      </div>
                      {fr.comment && (
                        <p className="text-[10px] text-slate-600 mt-1 italic pl-1 border-l-2 border-slate-300 line-clamp-2">
                          ข้อเสนอแนะ: {fr.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Quick Status Bar */}
      {isAdmin && onQuickChangeStatus && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
            <span>ปรับสถานะ:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <select
              value={plan.status}
              onChange={(e) => onQuickChangeStatus(plan, e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isLate
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="คลิกเพื่อสลับสถานะส่งช้า / ส่งตรงเวลา"
              >
                {isLate ? 'ส่งช้า' : 'ตรงเวลา'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Footer (Standardized button heights, padding, and visual hierarchy) */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* File link(s) */}
          {allAttachments.length <= 1 ? (
            <a
              href={allAttachments[0]?.file_url || plan.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>ดูไฟล์</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          ) : (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setShowFileList(!showFileList)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="คลิกเพื่อดูไฟล์แนบทั้งหมด"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>ดูไฟล์ ({allAttachments.length})</span>
                <ChevronDown className={`w-3 h-3 text-indigo-500 transition-transform ${showFileList ? 'rotate-180' : ''}`} />
              </button>

              {showFileList && (
                <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                    <span>ไฟล์แนบทั้งหมด ({allAttachments.length})</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">คลิกเพื่อเปิด</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {allAttachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowFileList(false)}
                        className="px-3 py-1.5 hover:bg-indigo-50 flex items-center justify-between gap-2 text-xs text-slate-700 hover:text-indigo-950 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate font-medium">{file.file_name}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Receipt button */}
          <button
            onClick={() => onOpenReceipt(plan)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
            title="พิมพ์ใบตอบรับการส่งแผน"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ใบตอบรับ</span>
          </button>

          {/* Certificate button for approved plans */}
          {plan.status === 'approved' && onOpenCertificate && (
            <button
              onClick={() => onOpenCertificate(plan)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black shadow-2xs transition-all cursor-pointer active:scale-95"
              title="ดูและพิมพ์วุฒิบัตร / เกียรติบัตร ว.PA"
            >
              <Award className="w-3.5 h-3.5 text-slate-950" />
              <span>วุฒิบัตร ว.PA</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* If plan needs revision, show single prominent 'แก้ไขและส่งตรวจใหม่' button */}
          {plan.status === 'needs_revision' && (isAdmin || isOwner) && onResubmitPlan ? (
            <button
              onClick={() => onResubmitPlan(plan)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              title="ดูข้อเสนอแนะ แก้ไขไฟล์ และส่งตรวจใหม่อีกครั้ง"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>แก้ไขและส่งตรวจใหม่</span>
            </button>
          ) : (
            /* Standard Edit button for normal non-revision states */
            (isAdmin || isOwner) && onEditPlan && (
              <button
                onClick={() => onEditPlan(plan)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
                title="แก้ไขข้อมูลเอกสาร"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                <span>แก้ไข</span>
              </button>
            )
          )}

          {/* Review button */}
          {canReview && (
            <button
              onClick={() => onOpenReview(plan)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1329] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{plan.status === 'submitted' ? 'ตรวจ' : 'ผลตรวจ'}</span>
            </button>
          )}

          {/* Delete */}
          {(isAdmin || isOwner) && (
            <button
              onClick={() => onDeletePlan(plan.id)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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
