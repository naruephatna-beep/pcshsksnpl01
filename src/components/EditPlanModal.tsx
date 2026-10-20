import React, { useState } from 'react';
import {
  LessonPlan,
  PlanType,
  PlanStatus,
  PlanStatusConfig,
  PlanTypeDeadlineConfig,
} from '../types';
import { getSavedStatusConfigs, getSavedDeadlineConfigs } from '../utils/deadlineUtils';
import {
  X,
  Edit,
  Save,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Award,
  ShieldCheck,
} from 'lucide-react';

interface EditPlanModalProps {
  plan: LessonPlan;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPlan: LessonPlan) => Promise<void>;
  isAdmin?: boolean;
  statusConfigs?: PlanStatusConfig[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
}

const DEFAULT_PLAN_TYPES: PlanType[] = [
  'แผนการจัดการเรียนรู้ฉบับย่อ',
  'แผนการจัดการเรียนรู้ฉบับสมบูรณ์',
];

export const EditPlanModal: React.FC<EditPlanModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSave,
  isAdmin = false,
  statusConfigs,
  deadlineConfigs,
}) => {
  const currentStatuses = statusConfigs || getSavedStatusConfigs();
  const currentDeadlines = deadlineConfigs && deadlineConfigs.length > 0 ? deadlineConfigs : getSavedDeadlineConfigs();
  const availablePlanTypes = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    currentDeadlines.forEach((d) => {
      const name = (d.name || '').trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push(name);
      }
    });
    return list.length > 0 ? list : ['แผนการจัดการเรียนรู้ฉบับย่อ', 'แผนการจัดการเรียนรู้ฉบับสมบูรณ์'];
  }, [currentDeadlines]);

  const [formData, setFormData] = useState<LessonPlan>({ ...plan });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUrl = (formData.file_url || '').trim();
    if (!trimmedUrl) {
      setError('บังคับส่งเป็นลิงก์ไฟล์ PDF: กรุณาระบุลิงก์เอกสารแผนการสอน');
      return;
    }

    let finalUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const isGoogleDrive = /drive\.google\.com|docs\.google\.com/i.test(finalUrl);
    const isCloudDoc = /onedrive|1drv\.ms|dropbox\.com|sharepoint\.com|supabase\.co|storage\.googleapis\.com/i.test(finalUrl);
    const isPdfExt = /\.pdf(\?|$|#)/i.test(finalUrl);

    if (!isPdfExt && !isGoogleDrive && !isCloudDoc) {
      setError('บังคับส่งเฉพาะลิงก์ไฟล์ PDF เท่านั้น! (เช่น ลิงก์ไฟล์ PDF บน Google Drive หรือลิงก์ที่ลงท้ายด้วย .pdf)');
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        ...formData,
        file_url: finalUrl,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกการแก้ไข');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-purple-700 to-indigo-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25">
              <Edit className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-rose-200">
                {isAdmin ? 'Admin Control' : 'แก้ไขแผนการสอนของฉัน'}
              </span>
              <h2 className="text-xl font-bold">
                {isAdmin ? 'แก้ไขข้อมูลแผนการสอน (แอดมิน)' : 'แก้ไขข้อมูลแผนการจัดการเรียนรู้'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-500">รหัสเอกสาร:</span>{' '}
              <strong className="font-mono text-slate-800">{formData.id}</strong>
            </div>
            <div>
              <span className="text-slate-500">ครูผู้สอน:</span>{' '}
              <strong className="text-slate-800">{formData.teacher_name}</strong>{' '}
              <span className="font-mono text-indigo-600">({formData.teacher_id})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รหัสวิชา
              </label>
              <input
                type="text"
                required
                value={formData.subject_code}
                onChange={(e) => setFormData({ ...formData, subject_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อรายวิชา
              </label>
              <input
                type="text"
                required
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อแผนการจัดการเรียนรู้
            </label>
            <textarea
              rows={2}
              required
              value={formData.plan_title}
              onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ระดับชั้น
              </label>
              <input
                type="text"
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ภาคเรียน / ปีการศึกษา
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  placeholder="เทอม"
                  className="w-1/2 px-2 py-2 border border-slate-300 rounded-xl text-sm text-center"
                />
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  placeholder="ปี"
                  className="w-1/2 px-2 py-2 border border-slate-300 rounded-xl text-sm text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                จำนวนชั่วโมงสอน
              </label>
              <input
                type="number"
                value={formData.total_hours}
                onChange={(e) => setFormData({ ...formData, total_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ประเภทเอกสาร
              </label>
              <select
                value={formData.plan_type}
                onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as PlanType })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
              >
                {availablePlanTypes.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                สถานะการตรวจสอบ (Status - ปรับได้ตามที่แอดมินกำหนด)
              </label>
              {isAdmin ? (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                >
                  {currentStatuses.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label} ({st.id})
                    </option>
                  ))}
                </select>
              ) : formData.status === 'needs_revision' ? (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as PlanStatus })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl text-sm bg-amber-50 font-semibold text-amber-900"
                >
                  <option value="submitted">ส่งใหม่เพื่อขอรับการตรวจอีกครั้ง (submitted)</option>
                  <option value="needs_revision">ยังอยู่ระหว่างแก้ไข (needs_revision)</option>
                </select>
              ) : (
                <div className="px-3 py-2 border border-slate-200 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>{formData.status}</span>
                </div>
              )}
            </div>
          </div>

          {/* Admin Late Submission Override Control */}
          {isAdmin && (
            <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <span className="font-bold text-orange-950">
                    การติดตามการส่งช้า (Late Submission Flag):
                  </span>
                  <p className="text-[11px] text-orange-850">
                    {formData.is_late
                      ? `แผนนี้ถูกทำเครื่องหมายว่า "ส่งช้า" ${formData.submission_delay_text ? `(${formData.submission_delay_text})` : ''}`
                      : 'แผนนี้ถูกทำเครื่องหมายว่า "ส่งตรงเวลา"'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-orange-900 shrink-0">
                <input
                  type="checkbox"
                  checked={formData.is_late ?? false}
                  onChange={(e) => setFormData({ ...formData, is_late: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span>ระบุว่าส่งช้า (Late)</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ลิงก์ไฟล์แผนการสอน (URL PDF บังคับ)
              </label>
              <input
                type="text"
                required
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                placeholder="https://drive.google.com/... หรือ .pdf"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                คะแนนประเมิน {isAdmin ? '(0-100)' : ''}
              </label>
              {isAdmin ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.total_score || ''}
                  onChange={(e) => setFormData({ ...formData, total_score: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              ) : (
                <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700">
                  {formData.total_score ? `${formData.total_score} คะแนน (ร้อยละ ${formData.total_score}%)` : 'ยังไม่ได้ประเมินคะแนน'}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ข้อเสนอแนะ / ความเห็นของฝ่ายวิชาการ
            </label>
            {isAdmin ? (
              <textarea
                rows={2}
                value={formData.review_comment || ''}
                onChange={(e) => setFormData({ ...formData, review_comment: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            ) : (
              <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs text-slate-600 min-h-[44px]">
                {formData.review_comment || 'ไม่มีข้อเสนอแนะเพิ่มเติม'}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-medium text-sm shadow-md flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขแผน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
