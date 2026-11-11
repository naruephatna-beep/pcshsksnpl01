import React, { useState } from 'react';
import { LessonPlan } from '../types';
import {
  X,
  Send,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCcw,
  Award,
} from 'lucide-react';
import { PdfPermissionNotice } from './PdfPermissionNotice';

interface ResubmitPlanModalProps {
  isOpen: boolean;
  plan: LessonPlan | null;
  onClose: () => void;
  onResubmit: (updatedPlan: LessonPlan) => Promise<void>;
}

export const ResubmitPlanModal: React.FC<ResubmitPlanModalProps> = ({
  isOpen,
  plan,
  onClose,
  onResubmit,
}) => {
  const [fileUrl, setFileUrl] = useState(plan?.file_url || '');
  const [resubmitNote, setResubmitNote] = useState('');
  const [isPermissionConfirmed, setIsPermissionConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Extract per-file reviews (Form B)
  const fileReviews = React.useMemo(() => {
    if (!plan) return null;
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
  }, [plan]);

  // Sync fileUrl when plan changes
  React.useEffect(() => {
    if (plan) {
      setFileUrl(plan.file_url || '');
      setResubmitNote('');
      setError('');
      setIsPermissionConfirmed(false);
    }
  }, [plan]);

  if (!isOpen || !plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUrl = fileUrl.trim();
    if (!trimmedUrl) {
      setError('กรุณาระบุลิงก์ไฟล์แผนการสอนฉบับแก้ไข (PDF)');
      return;
    }

    let finalUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const isGoogleDrive = /drive\.google\.com|docs\.google\.com/i.test(finalUrl);
    const isGoogleDriveFolder = isGoogleDrive && /\/folders\/|\/drive\/folders\//i.test(finalUrl);
    const isCloudDoc = /onedrive|1drv\.ms|dropbox\.com|sharepoint\.com|supabase\.co|storage\.googleapis\.com/i.test(finalUrl);
    const isDocExt = /\.(pdf|xlsx|xls|csv|docx|doc)(\?|$|#)/i.test(finalUrl);

    if (isGoogleDriveFolder) {
      setError('ลิงก์ที่ระบุเป็น "โฟลเดอร์" ไม่ใช่ไฟล์เอกสาร! กรุณาคัดลอกลิงก์ของตัวไฟล์โดยตรง');
      return;
    }

    if (!isDocExt && !isGoogleDrive && !isCloudDoc) {
      setError('บังคับส่งเฉพาะไฟล์เอกสาร (เช่น PDF หรือ Excel .xlsx/.xls หรือ Google Drive/Sheets)');
      return;
    }

    if (!isPermissionConfirmed) {
      setError('กรุณาตรวจสอบสิทธิ์ไฟล์ใน Google Drive ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู" และทำเครื่องหมายยืนยันก่อนกดส่ง');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const thaiDateTime = `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

      const combinedComment = resubmitNote.trim()
        ? `[ส่งใหม่ ${thaiDateTime}]: ${resubmitNote.trim()}${plan.review_comment ? `\n(ข้อเสนอแนะเดิม: ${plan.review_comment})` : ''}`
        : plan.review_comment;

      const updatedPlan: LessonPlan = {
        ...plan,
        file_url: finalUrl,
        status: 'submitted', // เด้งไปสถานะรอตรวจเพื่อให้แอดมินตรวจอีกครั้ง
        submitted_at: `${thaiDateTime} (ส่งแก้ไขใหม่)`,
        review_comment: combinedComment,
      };

      await onResubmit(updatedPlan);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการส่งแผนใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (!isSubmitting && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-100">
                Resubmit Lesson Plan
              </span>
              <h2 className="text-xl font-bold">ส่งแผนการสอนใหม่อีกครั้ง</h2>
              <p className="text-xs text-amber-100 mt-0.5">
                แผนจะถูกเปลี่ยนสถานะเป็น <span className="underline font-bold text-white">รอการตรวจ</span> เพื่อให้แอดมินตรวจใหม่อีกครั้ง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Plan Summary Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">รหัสเอกสาร:</span>
              <span className="font-mono font-bold text-slate-800">{plan.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">วิชา:</span>
              <span className="font-semibold text-slate-800">
                {plan.subject_code} - {plan.subject_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ชื่อแผน:</span>
              <span className="font-medium text-slate-800 truncate max-w-[280px]">
                {plan.plan_title}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ประเภท:</span>
              <span className="text-indigo-600 font-semibold">{plan.plan_type}</span>
            </div>
          </div>

          {/* Previous Review Feedback */}
          {plan.review_comment && (
            <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>ข้อเสนอแนะที่ต้องแก้ไข (จาก {plan.reviewer_name || 'ผู้ตรวจ / ฝ่ายวิชาการ'}):</span>
              </div>
              <p className="text-rose-900 bg-white/70 p-2.5 rounded-xl border border-rose-100 whitespace-pre-wrap leading-relaxed">
                {plan.review_comment}
              </p>
            </div>
          )}

          {/* Form B: Per-file Review Breakdown (Shows which files passed and which need revision) */}
          {fileReviews && fileReviews.length > 1 && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>ผลตรวจแยกรายไฟล์ที่ส่งมา ({fileReviews.filter((f) => f.status === 'approved').length}/{fileReviews.length} ไฟล์ผ่าน):</span>
                </span>
                <span className="text-[10px] text-amber-800 font-semibold">
                  {fileReviews.filter((f) => f.status === 'needs_revision').length} ไฟล์ที่ต้องปรับปรุง
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {fileReviews.map((fr, idx) => {
                  const isApp = fr.status === 'approved';
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${
                        isApp
                          ? 'bg-white/80 border-emerald-200 text-emerald-950'
                          : 'bg-white border-rose-300 text-rose-950 shadow-2xs ring-1 ring-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isApp ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}
                          >
                            {isApp ? '✓ ผ่าน' : '⚠️ ตีกลับแก้ไข'}
                          </span>
                          <span className="font-bold truncate text-slate-800">
                            ไฟล์ {idx + 1}: {fr.file_name}
                          </span>
                        </div>
                        {fr.total_score !== undefined && (
                          <span className="font-mono font-bold text-slate-600 shrink-0">
                            {fr.total_score}%
                          </span>
                        )}
                      </div>
                      {fr.comment && (
                        <p className="text-[11px] text-slate-600 italic pl-1 border-l-2 border-slate-300">
                          ข้อเสนอแนะ: {fr.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New File Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ลิงก์ไฟล์เอกสารฉบับแก้ไข (PDF หรือ Excel) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/... หรือ ลิงก์ตรง .pdf, .xlsx"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>หากอัปโหลดทับไฟล์เดิมบน Google Drive สามารถใช้ลิงก์เดิมได้เลย</span>
            </p>

            {/* PDF Permission Notice & Enforced Confirmation */}
            <PdfPermissionNotice
              url={fileUrl}
              isConfirmed={isPermissionConfirmed}
              onConfirmChange={setIsPermissionConfirmed}
              required={true}
              showStepByStep={true}
            />
          </div>

          {/* Resubmit Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              บันทึกข้อความถึงผู้ตรวจ (ไม่บังคับ)
            </label>
            <textarea
              rows={2}
              value={resubmitNote}
              onChange={(e) => setResubmitNote(e.target.value)}
              placeholder="เช่น แก้ไขเนื้อหาและเอกสารประกอบตามข้อเสนอแนะเรียบร้อยแล้วครับ/ค่ะ"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Status highlight notice */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center gap-2 text-xs text-amber-800">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              เมื่อกดยืนยัน แผนจะเปลี่ยนเป็นสถานะ <strong>"รอตรวจ (submitted)"</strong> ทันที เพื่อให้ผู้ดูแลระบบและฝ่ายวิชาการตรวจประเมิน
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังส่งแผน...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ยืนยันส่งแผนใหม่อีกครั้ง</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
