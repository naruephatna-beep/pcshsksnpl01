import React, { useState } from 'react';
import {
  LessonPlan,
  Teacher,
  PlanStatus,
  RubricScore,
  PlanStatusConfig,
  PlanTypeDeadlineConfig,
  EvaluationType,
  ReviewWorkflowConfig,
  StageReviewRecord,
} from '../types';
import {
  getSavedStatusConfigs,
  getPlanEvaluationType,
  classifyDocumentType,
} from '../utils/deadlineUtils';
import {
  getLocalWorkflows,
  getWorkflowForPlan,
  advancePlanStage,
} from '../services/departmentWorkflowService';
import {
  X,
  CheckCircle,
  AlertTriangle,
  FileText,
  Star,
  ExternalLink,
  Award,
  MessageSquare,
  UserCheck,
  Tag,
  ChevronDown,
  ChevronUp,
  Info,
  Mail,
  Send,
  Sparkles,
  Eye,
  Zap,
} from 'lucide-react';
import {
  sendAcademicEmailOneClick,
  generateReviewEmailHtml,
  ACADEMIC_SENDER_EMAIL,
} from '../services/emailService';
import { AcademicEmailModal } from './AcademicEmailModal';

interface ReviewPlanModalProps {
  plan: LessonPlan;
  reviewer: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onSaveReview: (updatedPlan: LessonPlan) => Promise<any> | any;
  statusConfigs?: PlanStatusConfig[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  teachers?: Teacher[];
  workflow?: ReviewWorkflowConfig;
  workflows?: ReviewWorkflowConfig[];
}

export const ReviewPlanModal: React.FC<ReviewPlanModalProps> = ({
  plan,
  reviewer,
  isOpen,
  onClose,
  onSaveReview,
  statusConfigs,
  deadlineConfigs,
  teachers,
  workflow,
  workflows,
}) => {
  const allStatuses = statusConfigs || getSavedStatusConfigs();
  const activeWorkflow = workflow || getWorkflowForPlan(plan, workflows || getLocalWorkflows());
  const currentStageOrder = plan.current_stage_order || 1;
  const currentStage =
    activeWorkflow?.stages?.find((s) => s.order === currentStageOrder) ||
    activeWorkflow?.stages?.[0];

  const [status, setStatus] = useState<PlanStatus>(
    plan.status === 'submitted' ? 'approved' : plan.status
  );
  const [comment, setComment] = useState(plan.review_comment || '');
  const [rubrics, setRubrics] = useState<RubricScore>(
    plan.rubric_scores || {
      standards: 5,
      activities: 5,
      media: 4,
      assessment: 4,
      recording: 5,
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmittedDetails, setShowSubmittedDetails] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingDirectEmail, setIsSendingDirectEmail] = useState(false);
  const [directMailStatus, setDirectMailStatus] = useState<string | null>(null);

  // User-Friendly: Side-by-Side Split View (PDF preview alongside review criteria)
  const embedPreviewUrl = React.useMemo(() => {
    if (!plan.file_url || plan.file_url === '#') return null;
    const url = plan.file_url.trim();
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    if (url.includes('drive.google.com/open?id=')) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    if (url.endsWith('.pdf')) {
      return url;
    }
    return null;
  }, [plan.file_url]);

  const [isSplitView, setIsSplitView] = useState<boolean>(Boolean(embedPreviewUrl));

  // Quick feedback presets to save teachers typing time
  const QUICK_FEEDBACK_PRESETS = [
    '✓ ผ่านเกณฑ์การประเมิน แผนการจัดการเรียนรู้มีความละเอียด ครบถ้วนตามมาตรฐาน',
    '✓ กิจกรรมการเรียนรู้และการวัดประเมินผลสอดคล้องกับตัวชี้วัดเป็นอย่างดี',
    '✓ สื่อ นวัตกรรม และแหล่งเรียนรู้มีความหลากหลาย น่าสนใจ ส่งเสริมผู้เรียน',
    '⚠️ ขอให้ปรับปรุงเกณฑ์การวัดและประเมินผลรูบริกให้ชัดเจนยิ่งขึ้น',
    '⚠️ ขอให้ระบุระยะเวลาในแต่ละกิจกรรมให้สอดคล้องกับคาบเรียน',
  ];

  const handleAppendPreset = (presetText: string) => {
    setComment((prev) => {
      if (!prev.trim()) return presetText;
      if (prev.includes(presetText)) return prev;
      return `${prev}\n${presetText}`;
    });
  };

  const targetTeacher = React.useMemo(() => {
    return teachers?.find((t) => t.Teacher_ID === plan.teacher_id);
  }, [teachers, plan.teacher_id]);
  const teacherEmail = (targetTeacher?.Email || '').trim();

  const initialEvalType =
    currentStage?.evaluation_mode ||
    plan.evaluation_type ||
    getPlanEvaluationType(plan.plan_type, deadlineConfigs);
  const [evaluationType, setEvaluationType] = useState<EvaluationType>(initialEvalType);
  const isApprovalOnly = evaluationType === 'approval_only';
  const docMeta = classifyDocumentType(plan.plan_type);
  const isResearch = docMeta.key === 'classroom_research' || (plan.plan_type || '').includes('วิจัย');

  const parsedFormFields = React.useMemo(() => {
    if (!plan.notes) return null;
    try {
      const parsed = JSON.parse(plan.notes);
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
        return parsed as Record<string, any>;
      }
    } catch {
      // not json
    }
    return null;
  }, [plan.notes]);

  if (!isOpen) return null;

  const totalRubricScore =
    Math.round(
      ((rubrics.standards +
        rubrics.activities +
        rubrics.media +
        rubrics.assessment +
        rubrics.recording) /
        25) *
        100
    );

  const handleQuickApprove = async () => {
    setStatus('approved');
    const autoNote = comment.trim() || 'อนุมัติการใช้แผนการจัดการเรียนรู้ ผ่านตามเกณฑ์มาตรฐานเรียบร้อยแล้ว';
    setComment(autoNote);
    setIsSubmitting(true);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const reviewRecord: StageReviewRecord = {
      stage_id: currentStage?.id || `stage_${currentStageOrder}`,
      stage_order: currentStageOrder,
      stage_title: currentStage?.title || `ขั้นที่ ${currentStageOrder}`,
      evaluation_mode: isApprovalOnly ? 'approval_only' : 'rubric_score',
      reviewer_id: reviewer.Teacher_ID,
      reviewer_name: `${reviewer.Name} (${reviewer.position})`,
      reviewed_at: dateStr,
      status: 'approved',
      comment: autoNote,
      rubric_scores: isApprovalOnly ? undefined : rubrics,
      total_score: isApprovalOnly ? undefined : totalRubricScore,
    };

    let updated: LessonPlan;
    if (activeWorkflow && activeWorkflow.stages.length > 0) {
      updated = advancePlanStage(plan, activeWorkflow, reviewRecord, reviewer);
    } else {
      const existingReviews = plan.stage_reviews || [];
      updated = {
        ...plan,
        status: 'approved',
        reviewed_by: reviewer.Teacher_ID,
        reviewer_name: `${reviewer.Name} (${reviewer.position})`,
        reviewed_at: dateStr,
        review_comment: autoNote,
        rubric_scores: isApprovalOnly ? undefined : rubrics,
        total_score: isApprovalOnly ? undefined : totalRubricScore,
        evaluation_type: isApprovalOnly ? 'approval_only' : 'rubric_score',
        stage_reviews: [
          ...existingReviews.filter((r) => r.stage_id !== reviewRecord.stage_id),
          reviewRecord,
        ],
      };
    }

    try {
      await onSaveReview(updated);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const reviewRecord: StageReviewRecord = {
      stage_id: currentStage?.id || `stage_${currentStageOrder}`,
      stage_order: currentStageOrder,
      stage_title: currentStage?.title || `ขั้นที่ ${currentStageOrder}`,
      evaluation_mode: isApprovalOnly ? 'approval_only' : 'rubric_score',
      reviewer_id: reviewer.Teacher_ID,
      reviewer_name: `${reviewer.Name} (${reviewer.position})`,
      reviewed_at: dateStr,
      status: (status === 'approved' ? 'approved' : status === 'needs_revision' ? 'needs_revision' : status) as any,
      comment: comment.trim(),
      rubric_scores: isApprovalOnly ? undefined : rubrics,
      total_score: isApprovalOnly ? undefined : totalRubricScore,
    };

    let updated: LessonPlan;
    if (activeWorkflow && activeWorkflow.stages.length > 0) {
      updated = advancePlanStage(plan, activeWorkflow, reviewRecord, reviewer);
    } else {
      const existingReviews = plan.stage_reviews || [];
      updated = {
        ...plan,
        status,
        reviewed_by: reviewer.Teacher_ID,
        reviewer_name: `${reviewer.Name} (${reviewer.position})`,
        reviewed_at: dateStr,
        review_comment: comment.trim(),
        rubric_scores: isApprovalOnly ? undefined : rubrics,
        total_score: isApprovalOnly ? undefined : totalRubricScore,
        evaluation_type: isApprovalOnly ? 'approval_only' : 'rubric_score',
        stage_reviews: [
          ...existingReviews.filter((r) => r.stage_id !== reviewRecord.stage_id),
          reviewRecord,
        ],
      };
    }

    try {
      await onSaveReview(updated);

      // 1-Click Academic Email notification
      if (sendEmailNotification && teacherEmail) {
        const currentStatusObj = allStatuses.find((s) => s.id === status);
        const statusLabel = currentStatusObj?.label || (status === 'approved' ? 'อนุมัติ' : status === 'needs_revision' ? 'ส่งกลับแก้ไข' : status);
        const reviewMail = generateReviewEmailHtml({
          plan: updated,
          reviewer,
          statusLabel,
          comment: comment.trim(),
          rubricScore: isApprovalOnly ? undefined : totalRubricScore,
        });

        sendAcademicEmailOneClick({
          to: teacherEmail,
          subject: reviewMail.subject,
          htmlBody: reviewMail.html,
          body: reviewMail.plainText,
        }).catch((err) => {
          console.warn('Could not dispatch review email:', err);
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRubric = (key: keyof RubricScore, val: number) => {
    setRubrics((prev) => ({ ...prev, [key]: val }));
  };

  const currentStatusObj = allStatuses.find((s) => s.id === status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4">
      <div className={`w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in zoom-in-95 ${
        isSplitView && embedPreviewUrl ? 'max-w-6xl w-full h-[92vh]' : 'max-w-2xl max-h-[92vh] sm:max-h-[88vh]'
      }`}>
        {/* Pinned Header */}
        <div className="relative bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 p-4 sm:p-5 text-white shrink-0 shadow-xs">
          <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2">
            {embedPreviewUrl && (
              <button
                type="button"
                onClick={() => setIsSplitView(!isSplitView)}
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSplitView
                    ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-white/30'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title="สลับมุมมอง: ดูเอกสาร PDF คู่กับแบบตรวจข้างๆ กัน"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isSplitView ? '🖥️ โหมดแยกจอคู่' : '📄 แยกจอเปิด PDF'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shrink-0">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-purple-200 block truncate">
                {isResearch ? 'Classroom Action Research Review' : 'Academic Review'}
              </span>
              <h2 className="text-base sm:text-lg font-bold truncate">
                {isResearch ? 'ตรวจและประเมินงานวิจัยในชั้นเรียน' : `ตรวจและประเมิน${docMeta.label || 'แผนการจัดการเรียนรู้'}`}
              </h2>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2 sm:gap-3 text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl flex-wrap">
            <span className="text-purple-200 font-medium">ผู้ตรวจ:</span>
            <span className="font-semibold truncate max-w-[150px]">{reviewer.Name}</span>
            <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
              {reviewer.Teacher_ID}
            </span>
            <span className="hidden sm:inline text-purple-200">·</span>
            <span className="truncate max-w-[160px] text-purple-100">{reviewer.position}</span>
          </div>
        </div>

        {/* Main Body with Split View option */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-white">
          {/* Left Panel: Embedded PDF / Google Drive Viewer (Desktop Split View) */}
          {isSplitView && embedPreviewUrl && (
            <div className="hidden lg:flex lg:w-1/2 flex-col border-r border-slate-200 bg-slate-900 shrink-0 h-full relative">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950 text-white text-xs border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold truncate text-slate-200">{plan.file_name || 'ไฟล์เอกสาร'}</span>
                </div>
                <a
                  href={plan.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                >
                  <span>เปิดเต็มจอ</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex-1 w-full h-full relative bg-slate-950">
                <iframe
                  src={embedPreviewUrl}
                  title="PDF Preview"
                  className="w-full h-full border-0"
                  allow="autoplay"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Right/Main Panel: Scrollable Review Controls */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-5 bg-white">
            {/* 1-Click Quick Approve Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 flex items-center justify-between gap-3 shadow-2xs">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                    อนุมัติทันทีใน 1 คลิก (Quick Approve)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                  หากตรวจดูแล้วว่าเอกสารถูกต้องตามเกณฑ์ สามารถกดอนุมัติได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickApprove}
                disabled={isSubmitting}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>อนุมัติทันที</span>
              </button>
            </div>

            {/* Multi-Stage Approval Pipeline Breadcrumbs */}
            {activeWorkflow && activeWorkflow.stages.length > 0 && (
            <div className="bg-[#0B1329] text-white p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-bold text-amber-400">
                    สายงานอนุมัติ: {activeWorkflow.name}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  ขั้นที่ {currentStageOrder} จาก {activeWorkflow.stages.length} ขั้น
                </span>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {activeWorkflow.stages.map((st, idx) => {
                  const isPast = st.order < currentStageOrder;
                  const isCurrent = st.order === currentStageOrder;
                  const isModeApproval = st.evaluation_mode === 'approval_only';

                  return (
                    <React.Fragment key={st.id}>
                      <div
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shrink-0 transition-all ${
                          isPast
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-semibold'
                            : isCurrent
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20 ring-2 ring-white/30'
                            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/20 font-black">
                          {isPast ? '✓' : st.order}
                        </span>
                        <div className="text-left">
                          <p className="truncate max-w-[150px] leading-tight">{st.title}</p>
                          <p className={`text-[9px] ${isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                            {isModeApproval ? 'แบบกดอนุมัติ' : 'แบบให้คะแนนรูบริก'}
                          </p>
                        </div>
                      </div>
                      {idx < activeWorkflow.stages.length - 1 && (
                        <span className="text-slate-600 text-xs font-bold">→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plan Summary Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${docMeta.badgeClass}`}>
                    <span>{docMeta.shortBadge}</span>
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-100 text-indigo-700">
                    {plan.subject_code} - {plan.subject_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEvaluationType(isApprovalOnly ? 'rubric_score' : 'approval_only')}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer hover:shadow-xs active:scale-95 ${
                      isApprovalOnly
                        ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                    title="คลิกเพื่อสลับระหว่าง: ตรวจแค่อนุมัติ vs ตรวจให้คะแนนรูบริก"
                  >
                    {isApprovalOnly ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-purple-600" />
                        <span>ตรวจแค่อนุมัติ (คลิกเพื่อสลับเป็นให้คะแนน)</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-3 h-3 text-amber-600" />
                        <span>ตรวจให้คะแนนรูบริก 100 (คลิกเพื่อสลับเป็นตรวจแค่อนุมัติ)</span>
                      </>
                    )}
                  </button>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 line-clamp-2">{plan.plan_title}</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                  ครูผู้สอน: <strong className="text-slate-700">{plan.teacher_name}</strong> ({plan.teacher_id}) · {plan.learning_area} · ชั้น {plan.grade_level}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <a
                  href={plan.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors active:scale-95 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>เปิดดูไฟล์</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-[10px] text-slate-400 mt-1">สิทธิ์: ทุกคนที่มีลิงก์</span>
              </div>
            </div>

            {/* Dynamic Form Details (Collapsible & Scrollable if long) */}
            {parsedFormFields && Object.keys(parsedFormFields).length > 0 && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSubmittedDetails(!showSubmittedDetails)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3 rounded-full bg-purple-600"></span>
                    <span>รายละเอียดข้อมูลที่ครูกรอกส่ง ({Object.keys(parsedFormFields).length} รายการ)</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
                    <span>{showSubmittedDetails ? 'ย่อข้อมูล' : 'แสดงรายละเอียด'}</span>
                    {showSubmittedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>
                {showSubmittedDetails && (
                  <div className="p-3 border-t border-slate-100 max-h-56 overflow-y-auto space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                      {Object.entries(parsedFormFields).map(([key, value]) => {
                        if (typeof value !== 'string' && typeof value !== 'number') return null;
                        const labelMap: Record<string, string> = {
                          fld_teacher_name: 'ครูผู้สอน',
                          fld_learning_area: 'กลุ่มสาระฯ',
                          fld_research_format: 'รูปแบบวิจัย',
                          fld_subject: 'วิชา',
                          fld_content_topic: 'เนื้อหา/เรื่อง',
                          fld_target_students: 'กลุ่มเป้าหมาย',
                          fld_research_issue: 'ประเด็นการวิจัย',
                          fld_methodology: 'วิธีการดำเนินงาน',
                          fld_title: 'หัวข้อ',
                        };
                        const fieldLabel = labelMap[key] || key.replace(/^fld_/, '');
                        const isLongText = String(value).length > 60;
                        return (
                          <div
                            key={key}
                            className={`bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 ${
                              isLongText ? 'sm:col-span-2' : ''
                            }`}
                          >
                            <span className="font-bold text-slate-700 block mb-0.5">{fieldLabel}:</span>
                            <span className="text-slate-800 break-words leading-relaxed">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Review Form Form Element with ID */}
          <form id="reviewPlanForm" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              ผลการพิจารณาตรวจสอบ <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  status === 'approved'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="review_status"
                  value="approved"
                  checked={status === 'approved'}
                  onChange={() => setStatus('approved')}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    status === 'approved' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}
                >
                  {status === 'approved' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {isResearch ? 'อนุมัติ / เห็นชอบประเด็นการวิจัย' : 'อนุมัติให้ใช้จัดการเรียนรู้ได้'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isResearch
                      ? 'ประเด็นการวิจัยหรือรายงานมีความสมบูรณ์ สอดคล้องกับเป้าหมายพัฒนาผู้เรียน'
                      : 'แผนมีความสมบูรณ์ สอดคล้องกับหลักสูตร'}
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  status === 'needs_revision'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="review_status"
                  value="needs_revision"
                  checked={status === 'needs_revision'}
                  onChange={() => setStatus('needs_revision')}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    status === 'needs_revision' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                  }`}
                >
                  {status === 'needs_revision' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ส่งกลับเพื่อปรับปรุงแก้ไข
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ต้องปรับปรุงตามข้อเสนอแนะ
                  </div>
                </div>
              </label>
            </div>

            {/* Custom status selector for admin */}
            <div className="mt-3 flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span>หรือระบุสถานะอื่นตามที่แอดมินกำหนด:</span>
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-2xs focus:ring-1 focus:ring-indigo-500"
              >
                {allStatuses.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label} ({st.id})
                  </option>
                ))}
              </select>
            </div>

            {status === 'approved' && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
                <span className="text-base">📁</span>
                <div>
                  <span className="font-bold text-emerald-900">สำรองไฟล์เข้า Google Drive อัตโนมัติ:</span>
                  <span className="text-emerald-800 ml-1">
                    เมื่อกดบันทึกผล ระบบจะคัดลอกไฟล์สำเนาไปเก็บในโฟลเดอร์ <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-950">ตรวจแล้ว/{plan.plan_type}_{plan.branch || (teachers?.find(t => t.Teacher_ID === plan.teacher_id)?.branch) || plan.learning_area}</strong> ใน Google Drive ทันที
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rubric Evaluation OR Approval-Only Notice */}
          {isApprovalOnly ? (
            <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 text-xs text-indigo-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <CheckCircle className="w-4 h-4 text-indigo-600" />
                  <span>รูปแบบการตรวจ: ตรวจพิจารณาอนุมัติ / ส่งกลับแก้ไข (ไม่คิดคะแนน)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEvaluationType('rubric_score')}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                >
                  ต้องการให้คะแนนคลิกที่นี่
                </button>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                เอกสารประเภท <strong>&ldquo;{plan.plan_type}&rdquo;</strong> ถูกกำหนดให้ตรวจแบบอนุมัติการใช้งานโดยไม่ต้องกรอกคะแนนรูบริก ท่านสามารถเลือกผลการพิจารณาด้านบนและพิมพ์ข้อเสนอแนะได้ทันที (หรือคลิกปุ่มด้านบนเพื่อประเมินรูบริก 100 คะแนน)
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  {isResearch ? 'เกณฑ์การประเมินคุณภาพงานวิจัยในชั้นเรียน (5 ด้าน)' : 'เกณฑ์การประเมินคุณภาพแผน (5 ด้าน)'}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEvaluationType('approval_only')}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    สลับเป็นตรวจแค่อนุมัติ
                  </button>
                  <div className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                    คะแนนรวม: {totalRubricScore}%
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                {(isResearch
                  ? [
                      { key: 'standards' as const, label: '1. ความชัดเจนของสภาพปัญหาและความสำคัญของประเด็นการวิจัย' },
                      { key: 'activities' as const, label: '2. วัตถุประสงค์และกลุ่มเป้าหมายนักเรียนที่ชัดเจนและสอดคล้อง' },
                      { key: 'media' as const, label: '3. นวัตกรรม/วิธีดำเนินการวิจัยและการจัดกิจกรรมแก้ปัญหา' },
                      { key: 'assessment' as const, label: '4. เครื่องมือการวิจัยและการเก็บรวบรวมข้อมูลตามสภาพจริง' },
                      { key: 'recording' as const, label: '5. การสรุปผล ประโยชน์ และการสะท้อนคิดเพื่อพัฒนาการเรียนรู้' },
                    ]
                  : [
                      { key: 'standards' as const, label: '1. ความสอดคล้องของมาตรฐานการเรียนรู้และตัวชี้วัด' },
                      { key: 'activities' as const, label: '2. การจัดกิจกรรมการเรียนรู้เชิงรุก (Active Learning)' },
                      { key: 'media' as const, label: '3. สื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้' },
                      { key: 'assessment' as const, label: '4. เครื่องมือการวัดผลและประเมินผลตามสภาพจริง' },
                      { key: 'recording' as const, label: '5. บันทึกผลหลังสอนและการสะท้อนคิด (Reflection)' },
                    ]
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/60"
                  >
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          type="button"
                          key={score}
                          onClick={() => updateRubric(item.key, score)}
                          className={`w-7 h-7 rounded-lg font-bold text-xs transition-all ${
                            rubrics[item.key] >= score
                              ? 'bg-amber-400 text-slate-900 shadow-sm'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment & Feedback */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>ข้อเสนอแนะและข้อคิดเห็นของฝ่ายวิชาการ</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStatus('needs_revision');
                    setComment(
                      'ไม่สามารถเปิดไฟล์ PDF ได้เนื่องจากยังไม่ได้เปิดสิทธิ์แชร์เป็น "ทุกคนที่มีลิงก์" (Anyone with the link) กรุณาเข้าไปใน Google Drive คลิกขวาที่ไฟล์ > แชร์ > การเข้าถึงทั่วไปเปลี่ยนเป็น "ทุกคนที่มีลิงก์" แล้วกดส่งใหม่อีกครั้งครับ/ค่ะ'
                    );
                  }}
                  className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="คลิกเพื่อใส่ข้อความแจ้งครูว่าไฟล์ PDF ติดสิทธิ์เข้าถึง"
                >
                  <span>⚠️ แจ้งไฟล์ติดสิทธิ์</span>
                </button>

                {isResearch ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('approved');
                        setComment(
                          'เห็นชอบประเด็นและกรอบการวิจัยในชั้นเรียน มีความชัดเจนและเหมาะสม สามารถดำเนินกิจกรรมวิจัยเพื่อพัฒนาคุณภาพผู้เรียนตามแผนได้ครับ/ค่ะ'
                        );
                      }}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>🔬 เห็นชอบประเด็นวิจัย</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('needs_revision');
                        setComment(
                          'แนะนำให้นิยามตัวแปร นวัตกรรมที่ใช้แก้ปัญหา และเครื่องมือวัดผลให้ชัดเจนและสอดคล้องกับกลุ่มเป้าหมายยิ่งขึ้น แล้วส่งใหม่อีกครั้งครับ/ค่ะ'
                        );
                      }}
                      className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>💡 แนะนำปรับประเด็น</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('approved');
                      setComment(
                        'แผนการจัดการเรียนรู้เชิงรุกมีความสมบูรณ์ จัดกิจกรรม Active Learning ได้น่าสนใจ สื่อและเครื่องมือวัดผลสอดคล้องกับตัวชี้วัด อนุมัติครับ/ค่ะ'
                      );
                    }}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>🌟 ชื่นชมแผนสมบูรณ์</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Feedback Presets for Fast 1-Click Commenting */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="text-[10px] text-slate-400 font-semibold shrink-0">ข้อความแนะนำ:</span>
              {QUICK_FEEDBACK_PRESETS.map((pst, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAppendPreset(pst)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200/80 hover:border-purple-300 transition-colors cursor-pointer text-left truncate max-w-[220px]"
                  title={pst}
                >
                  {pst}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ระบุข้อเสนอแนะ จุดเด่น หรือสิ่งที่ควรเพิ่มเติมปรับปรุง เพื่อพัฒนาการจัดการเรียนรู้..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />

            {/* 1-Click Academic Email Notification Option */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/90 to-amber-50/70 border border-purple-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="w-4 h-4 text-purple-700 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-purple-950 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-700" />
                      <span>ส่งอีเมลแจ้งผลการตรวจให้ครูทันที (1 คลิกจากเมลวิชาการ)</span>
                    </span>
                    <span className="text-[11px] text-purple-700 block truncate font-mono">
                      {teacherEmail ? `ส่งไปที่: ${teacherEmail}` : '⚠️ ไม่พบอีเมลของคุณครูในระบบ'}
                    </span>
                  </div>
                </label>

                {teacherEmail && (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                    {directMailStatus && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 animate-in fade-in">
                        {directMailStatus}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSendingDirectEmail}
                        onClick={async () => {
                          setIsSendingDirectEmail(true);
                          setDirectMailStatus(null);
                          try {
                            const currentStatusObj = allStatuses.find((s) => s.id === status);
                            const statusLabel =
                              currentStatusObj?.label ||
                              (status === 'approved'
                                ? 'อนุมัติ'
                                : status === 'needs_revision'
                                ? 'ส่งกลับแก้ไข'
                                : status);
                            const reviewMail = generateReviewEmailHtml({
                              plan,
                              reviewer,
                              statusLabel,
                              comment: comment.trim(),
                              rubricScore: isApprovalOnly ? undefined : totalRubricScore,
                            });

                            const res = await sendAcademicEmailOneClick({
                              to: teacherEmail,
                              subject: reviewMail.subject,
                              htmlBody: reviewMail.html,
                              body: reviewMail.plainText,
                            });

                            if (res.success) {
                              setDirectMailStatus('⚡ ส่งผลการตรวจผ่าน Google Apps Script เรียบร้อยแล้ว!');
                            } else if (res.isLegacyScript) {
                              setDirectMailStatus('⚠️ Google Apps Script ปัจจุบันยังไม่อัปเดตคำสั่งส่งเมล (โปรดดูวิธีอัปเดตในปุ่มตัวอย่าง)');
                            } else {
                              setDirectMailStatus(`⚠️ ส่งไม่สำเร็จ: ${res.error}`);
                            }
                          } catch (err: any) {
                            setDirectMailStatus(`ข้อผิดพลาด: ${err?.message}`);
                          } finally {
                            setIsSendingDirectEmail(false);
                            setTimeout(() => setDirectMailStatus(null), 5000);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                        title="กดครั้งเดียว ส่งอีเมลแจ้งผลตรวจให้ครูทันที"
                      >
                        {isSendingDirectEmail ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Zap className="w-3 h-3 text-amber-300" />
                        )}
                        <span>{isSendingDirectEmail ? 'กำลังส่ง...' : '⚡ ส่งเมลทันที (1 คลิก)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEmailModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl border border-purple-300 bg-white hover:bg-purple-50 text-purple-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3 text-purple-600" />
                        <span>ตัวอย่าง</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

      {/* Pinned Sticky Footer - Always visible on screen */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 z-10">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 hidden sm:inline">ผลการตรวจ:</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${
              status === 'approved'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : status === 'needs_revision'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
            }`}
          >
            {status === 'approved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
            {status === 'needs_revision' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
            <span>{currentStatusObj?.label || (status === 'approved' ? 'อนุมัติ' : status === 'needs_revision' ? 'ส่งกลับแก้ไข' : status)}</span>
            {!isApprovalOnly && (
              <span className="font-mono text-[11px] bg-white/70 px-1 rounded ml-1">
                {totalRubricScore}%
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-colors text-center cursor-pointer active:scale-95 shadow-2xs"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="reviewPlanForm"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-5 sm:px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>บันทึกผลการประเมิน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* 1-Click Academic Email Preview & Customizer Modal */}
    {isEmailModalOpen && teacherEmail && (
      <AcademicEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        defaultRecipient={{
          email: teacherEmail,
          name: targetTeacher?.Name || plan.teacher_name,
          teacherId: plan.teacher_id,
        }}
        defaultSubject={
          generateReviewEmailHtml({
            plan,
            reviewer,
            statusLabel: currentStatusObj?.label || (status === 'approved' ? 'อนุมัติ' : status === 'needs_revision' ? 'ส่งกลับแก้ไข' : status),
            comment: comment.trim(),
            rubricScore: isApprovalOnly ? undefined : totalRubricScore,
          }).subject
        }
        defaultHtml={
          generateReviewEmailHtml({
            plan,
            reviewer,
            statusLabel: currentStatusObj?.label || (status === 'approved' ? 'อนุมัติ' : status === 'needs_revision' ? 'ส่งกลับแก้ไข' : status),
            comment: comment.trim(),
            rubricScore: isApprovalOnly ? undefined : totalRubricScore,
          }).html
        }
        defaultPlainText={
          generateReviewEmailHtml({
            plan,
            reviewer,
            statusLabel: currentStatusObj?.label || (status === 'approved' ? 'อนุมัติ' : status === 'needs_revision' ? 'ส่งกลับแก้ไข' : status),
            comment: comment.trim(),
            rubricScore: isApprovalOnly ? undefined : totalRubricScore,
          }).plainText
        }
        categoryTitle="ส่งผลการตรวจเอกสารผ่านเมลวิชาการ"
      />
    )}
  </div>
);
};
