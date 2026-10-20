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
  formatThaiDateTime,
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
  Edit,
} from 'lucide-react';

interface LessonPlanTableRowProps {
  plan: LessonPlan;
  currentTeacher: Teacher;
  onOpenReceipt: (plan: LessonPlan) => void;
  onOpenReview: (plan: LessonPlan) => void;
  onDeletePlan: (planId: string) => void;
  onEditPlan?: (plan: LessonPlan) => void;
  onResubmitPlan?: (plan: LessonPlan) => void;
  statusConfigs?: PlanStatusConfig[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
}

export const LessonPlanTableRow: React.FC<LessonPlanTableRowProps> = ({
  plan,
  currentTeacher,
  onOpenReceipt,
  onOpenReview,
  onDeletePlan,
  onEditPlan,
  onResubmitPlan,
  statusConfigs,
  deadlineConfigs,
}) => {
  const photoUrl = formatGoogleDriveImageUrl(plan.teacher_photo);
  const isAdmin = isTeacherAdmin(currentTeacher);
  const isOwner = plan.teacher_id === currentTeacher.Teacher_ID;
  const canReview = isAdmin;

  const timeliness = checkSubmissionTimeliness(plan.plan_type, plan.submitted_at, deadlineConfigs);
  const isLate = plan.is_late !== undefined ? plan.is_late : timeliness.isLate;
  const statusInfo = getPlanStatusInfo(plan.status, statusConfigs);

  return (
    <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0 text-xs">
      {/* 1. Subject & Title */}
      <td className="py-3 px-3.5 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-900 text-white text-[11px] shrink-0">
            {plan.subject_code}
          </span>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 truncate max-w-[220px]" title={plan.plan_title}>
              {plan.plan_title}
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
              {plan.subject_name}
            </div>
          </div>
        </div>
      </td>

      {/* 2. Teacher */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={plan.teacher_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-slate-700">
                {getInitials(plan.teacher_name)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 truncate max-w-[140px]">
              {plan.teacher_name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {plan.teacher_id} · {plan.learning_area}
            </div>
          </div>
        </div>
      </td>

      {/* 3. Document Type & Term */}
      <td className="py-3 px-3 hidden md:table-cell">
        <div className="font-medium text-slate-700">{plan.plan_type}</div>
        <div className="text-[11px] text-slate-400">
          {plan.grade_level} · เทอม {plan.semester}/{plan.academic_year}
        </div>
      </td>

      {/* 4. Submission Date & Timeliness */}
      <td className="py-3 px-3 whitespace-nowrap hidden lg:table-cell">
        <div className="text-slate-700 font-mono text-[11px]">
          {plan.submitted_at.split(' ')[0]}
        </div>
        <div>
          {isLate ? (
            <span className="text-amber-700 font-bold text-[10px] flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              ส่งช้า
            </span>
          ) : (
            <span className="text-emerald-700 font-medium text-[10px] flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              ตรงเวลา
            </span>
          )}
        </div>
      </td>

      {/* 5. Status Badge */}
      <td className="py-3 px-3 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${statusInfo.style.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.style.dot}`}></span>
          <span>{statusInfo.label}</span>
          {plan.status === 'approved' && plan.total_score ? (
            <span className="font-mono text-[10px]">({plan.total_score}%)</span>
          ) : null}
        </span>
      </td>

      {/* 6. Actions */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1 justify-end">
          {/* File link */}
          <a
            href={plan.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center"
            title="เปิดดูไฟล์ PDF"
          >
            <FileText className="w-3.5 h-3.5" />
          </a>

          {/* Receipt */}
          <button
            onClick={() => onOpenReceipt(plan)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="ใบตอบรับ"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Resubmit if needs revision */}
          {plan.status === 'needs_revision' && (isAdmin || isOwner) && onResubmitPlan && (
            <button
              onClick={() => onResubmitPlan(plan)}
              className="px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded-md hover:bg-amber-600 text-[10px] flex items-center gap-0.5 cursor-pointer"
              title="ส่งแผนใหม่อีกครั้ง"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ส่งใหม่</span>
            </button>
          )}

          {/* Edit */}
          {(isAdmin || isOwner) && onEditPlan && (
            <button
              onClick={() => onEditPlan(plan)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="แก้ไขข้อมูลแผน"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Review (Admin) */}
          {canReview && (
            <button
              onClick={() => onOpenReview(plan)}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <UserCheck className="w-3 h-3 text-amber-400" />
              <span>{plan.status === 'submitted' ? 'ตรวจ' : 'ผล'}</span>
            </button>
          )}

          {/* Delete */}
          {(isAdmin || isOwner) && (
            <button
              onClick={() => onDeletePlan(plan.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="ลบ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
