import React, { useState } from 'react';
import {
  LessonPlan,
  Teacher,
  PlanStatus,
  RubricScore,
  PlanStatusConfig,
  PlanTypeDeadlineConfig,
} from '../types';
import {
  getSavedStatusConfigs,
  getPlanEvaluationType,
  classifyDocumentType,
} from '../utils/deadlineUtils';
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
} from 'lucide-react';

interface ReviewPlanModalProps {
  plan: LessonPlan;
  reviewer: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onSaveReview: (updatedPlan: LessonPlan) => Promise<any> | any;
  statusConfigs?: PlanStatusConfig[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
}

export const ReviewPlanModal: React.FC<ReviewPlanModalProps> = ({
  plan,
  reviewer,
  isOpen,
  onClose,
  onSaveReview,
  statusConfigs,
  deadlineConfigs,
}) => {
  const allStatuses = statusConfigs || getSavedStatusConfigs();
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

  const evaluationType =
    plan.evaluation_type || getPlanEvaluationType(plan.plan_type, deadlineConfigs);
  const isApprovalOnly = evaluationType === 'approval_only';
  const docMeta = classifyDocumentType(plan.plan_type);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updated: LessonPlan = {
      ...plan,
      status,
      reviewed_by: reviewer.Teacher_ID,
      reviewer_name: `${reviewer.Name} (${reviewer.position})`,
      reviewed_at: dateStr,
      review_comment: comment.trim(),
      rubric_scores: isApprovalOnly ? undefined : rubrics,
      total_score: isApprovalOnly ? undefined : totalRubricScore,
      evaluation_type: isApprovalOnly ? 'approval_only' : 'rubric_score',
    };

    try {
      await onSaveReview(updated);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 p-4 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shrink-0">
              <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-purple-200 block truncate">
                Academic Review
              </span>
              <h2 className="text-base sm:text-xl font-bold truncate">ตรวจและประเมินแผนการสอน</h2>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3 flex items-center gap-2 sm:gap-3 text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex-wrap">
            <span className="text-purple-200">ผู้ตรวจ:</span>
            <span className="font-semibold truncate max-w-[150px]">{reviewer.Name}</span>
            <span className="font-mono bg-white/20 px-1.5 py-0.2 rounded text-[10px]">
              {reviewer.Teacher_ID}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="truncate max-w-[160px]">{reviewer.position}</span>
          </div>
        </div>

        {/* Plan Summary Card */}
        <div className="p-3.5 sm:p-6 pb-2.5 sm:pb-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${docMeta.badgeClass}`}>
                  <span>{docMeta.shortBadge}</span>
                </span>
                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-100 text-indigo-700">
                  {plan.subject_code} - {plan.subject_name}
                </span>
                {isApprovalOnly ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <CheckCircle className="w-3 h-3 text-purple-600" />
                    <span>ตรวจแค่อนุมัติ/ไม่อนุมัติ (ไม่คิดคะแนน)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Award className="w-3 h-3 text-amber-600" />
                    <span>ตรวจแบบให้คะแนนรูบริก (100)</span>
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 line-clamp-1">{plan.plan_title}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                ครู: <strong className="text-slate-700">{plan.teacher_name}</strong> ({plan.teacher_id}) · {plan.learning_area} · ชั้น {plan.grade_level}
              </p>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <a
                href={plan.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-sm transition-colors active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>เปิดดูไฟล์</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[10px] text-slate-400 mt-1">สิทธิ์: ทุกคนที่มีลิงก์</span>
            </div>
          </div>

          {/* Details parsed from dynamic form submission if available */}
          {parsedFormFields && Object.keys(parsedFormFields).length > 0 && (
            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/90 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                <span className="w-1.5 h-3 rounded-full bg-purple-600"></span>
                <span>ข้อมูลและรายละเอียดที่ครูกรอกส่ง ({docMeta.label}):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1">
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
                  return (
                    <div key={key} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">{fieldLabel}: </span>
                      <span className="text-slate-900 break-words">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto touch-scroll p-4 sm:p-6 space-y-4 sm:space-y-5">
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
                    อนุมัติให้ใช้จัดการเรียนรู้ได้
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    แผนมีความสมบูรณ์ สอดคล้องกับหลักสูตร
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
          </div>

          {/* Rubric Evaluation OR Approval-Only Notice */}
          {isApprovalOnly ? (
            <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 text-xs text-indigo-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-indigo-900">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                <span>รูปแบบการตรวจ: ตรวจพิจารณาอนุมัติ / ส่งกลับแก้ไข (ไม่คิดคะแนน)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                เอกสารประเภท <strong>&ldquo;{plan.plan_type}&rdquo;</strong> ถูกกำหนดให้ตรวจแบบอนุมัติการใช้งานโดยไม่ต้องกรอกคะแนนรูบริก ท่านสามารถเลือกผลการพิจารณาด้านบนและพิมพ์ข้อเสนอแนะได้ทันที
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  เกณฑ์การประเมินคุณภาพแผน (5 ด้าน)
                </h4>
                <div className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                  คะแนนรวม: {totalRubricScore}%
                </div>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                {[
                  { key: 'standards' as const, label: '1. ความสอดคล้องของมาตรฐานการเรียนรู้และตัวชี้วัด' },
                  { key: 'activities' as const, label: '2. การจัดกิจกรรมการเรียนรู้เชิงรุก (Active Learning)' },
                  { key: 'media' as const, label: '3. สื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้' },
                  { key: 'assessment' as const, label: '4. เครื่องมือการวัดผลและประเมินผลตามสภาพจริง' },
                  { key: 'recording' as const, label: '5. บันทึกผลหลังสอนและการสะท้อนคิด (Reflection)' },
                ].map((item) => (
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>ข้อเสนอแนะและข้อคิดเห็นของฝ่ายวิชาการ</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setStatus('needs_revision');
                  setComment(
                    'ไม่สามารถเปิดไฟล์ PDF ได้เนื่องจากยังไม่ได้เปิดสิทธิ์แชร์เป็น "ทุกคนที่มีลิงก์" (Anyone with the link) กรุณาเข้าไปใน Google Drive คลิกขวาที่ไฟล์ > แชร์ > การเข้าถึงทั่วไปเปลี่ยนเป็น "ทุกคนที่มีลิงก์" แล้วกดส่งใหม่อีกครั้งครับ/ค่ะ'
                  );
                }}
                className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="คลิกเพื่อใส่ข้อความแจ้งครูว่าไฟล์ PDF ติดสิทธิ์เข้าถึง"
              >
                <span>⚠️ แจ้งไฟล์ PDF ติดสิทธิ์</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ระบุข้อเสนอแนะ จุดเด่น หรือสิ่งที่ควรเพิ่มเติมปรับปรุง เพื่อพัฒนาการจัดการเรียนรู้..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 pb-safe border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors text-center cursor-pointer active:scale-98"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึกผลการประเมิน</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
