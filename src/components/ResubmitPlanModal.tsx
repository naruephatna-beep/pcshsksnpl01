import React, { useState } from 'react';
import { LessonPlan, FileReviewResult } from '../types';
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
  Check,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import { PdfPermissionNotice } from './PdfPermissionNotice';

interface ResubmitPlanModalProps {
  isOpen: boolean;
  plan: LessonPlan | null;
  onClose: () => void;
  onResubmit: (updatedPlan: LessonPlan) => Promise<void>;
}

interface ResubmitFileItem {
  file_index: number;
  file_name: string;
  file_url: string;
  file_size?: string;
  status: 'approved' | 'needs_revision' | 'pending';
  comment?: string;
  total_score?: number;
  isModified?: boolean;
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

  // Track multi-files if submission had multiple attachments
  const [multiFiles, setMultiFiles] = useState<ResubmitFileItem[]>([]);
  const [overrideApproved, setOverrideApproved] = useState<Record<number, boolean>>({});

  // Parse notes from plan
  const parsedFormFields = React.useMemo(() => {
    if (!plan?.notes) return null;
    try {
      const parsed = JSON.parse(plan.notes);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, any>;
      }
    } catch {}
    return null;
  }, [plan?.notes]);

  // Extract per-file reviews (Form B)
  const fileReviews = React.useMemo(() => {
    if (!plan) return null;
    if (plan.file_reviews && Array.isArray(plan.file_reviews) && plan.file_reviews.length > 0) {
      return plan.file_reviews;
    }
    if (parsedFormFields && Array.isArray(parsedFormFields._file_reviews) && parsedFormFields._file_reviews.length > 0) {
      return parsedFormFields._file_reviews as FileReviewResult[];
    }
    return null;
  }, [plan, parsedFormFields]);

  // Sync state when plan changes
  React.useEffect(() => {
    if (plan) {
      setFileUrl(plan.file_url || '');
      setResubmitNote('');
      setError('');
      setIsPermissionConfirmed(false);
      setOverrideApproved({});

      // Build multi-files list
      const list: ResubmitFileItem[] = [];
      const rawAtts =
        parsedFormFields && Array.isArray(parsedFormFields._attachments)
          ? parsedFormFields._attachments
          : [];
      const reviews =
        plan.file_reviews ||
        (parsedFormFields && Array.isArray(parsedFormFields._file_reviews)
          ? parsedFormFields._file_reviews
          : []);

      if (rawAtts.length > 0) {
        rawAtts.forEach((att: any, idx: number) => {
          const matchReview = reviews.find(
            (r: any) => r.file_index === idx || r.file_name === att.file_name
          );
          list.push({
            file_index: idx,
            file_name: att.file_name || `ไฟล์แนบที่ ${idx + 1}`,
            file_url: att.file_url || '',
            file_size: att.file_size,
            status: (matchReview?.status || (plan.status === 'needs_revision' ? 'needs_revision' : 'approved')) as any,
            comment: matchReview?.comment || '',
            total_score: matchReview?.total_score,
            isModified: false,
          });
        });
      } else if (plan.file_url && plan.file_url !== '#') {
        list.push({
          file_index: 0,
          file_name: plan.file_name || 'ไฟล์เอกสารหลัก',
          file_url: plan.file_url,
          status: plan.status === 'needs_revision' ? 'needs_revision' : 'approved',
          comment: plan.review_comment || '',
          total_score: plan.total_score,
          isModified: false,
        });
      }
      setMultiFiles(list);
    }
  }, [plan, parsedFormFields]);

  if (!isOpen || !plan) return null;

  const isMultiMode = multiFiles.length > 1;

  const handleUpdateFileUrl = (index: number, newUrl: string) => {
    setMultiFiles((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, file_url: newUrl, isModified: true } : item
      )
    );
  };

  const handleToggleOverrideApproved = (index: number) => {
    setOverrideApproved((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAddNewAttachment = () => {
    const nextIdx = multiFiles.length;
    setMultiFiles((prev) => [
      ...prev,
      {
        file_index: nextIdx,
        file_name: `เอกสารแนบเพิ่มเติม (${nextIdx + 1})`,
        file_url: '',
        status: 'needs_revision',
        comment: 'ไฟล์แนบเพิ่มเติมสำหรับการส่งตรวจใหม่',
        isModified: true,
      },
    ]);
  };

  const handleRemoveAttachment = (index: number) => {
    if (multiFiles.length <= 1) return;
    setMultiFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // ==========================================
    // MULTI-FILE RESUBMISSION LOGIC (Item 3)
    // ==========================================
    if (isMultiMode) {
      // Validate all files requiring revision or modified
      for (let i = 0; i < multiFiles.length; i++) {
        const f = multiFiles[i];
        const isNeedsRev = f.status === 'needs_revision';
        const isOverridden = overrideApproved[i];
        if (isNeedsRev || isOverridden) {
          const trimmed = (f.file_url || '').trim();
          if (!trimmed) {
            setError(`กรุณาระบุลิงก์สำหรับ "${f.file_name}"`);
            return;
          }
          if (trimmed.includes('/folders/') || trimmed.includes('/drive/folders/')) {
            setError(`ลิงก์ของ "${f.file_name}" เป็นโฟลเดอร์ กรุณาคัดลอกลิงก์ไฟล์โดยตรง`);
            return;
          }
        }
      }

      if (!isPermissionConfirmed) {
        setError(
          'กรุณาตรวจสอบสิทธิ์ไฟล์ใน Google Drive ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู" และทำเครื่องหมายยืนยันก่อนกดส่ง'
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const now = new Date();
        const thaiDateTime = `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

        // Updated attachments array
        const updatedAttachments = multiFiles.map((f) => ({
          file_name: f.file_name,
          file_url: f.file_url.trim(),
          file_size: f.file_size,
        }));

        // Updated file reviews: keep approved files, reset revised files to pending
        const updatedReviews: FileReviewResult[] = multiFiles.map((f, idx) => {
          const wasApproved = f.status === 'approved' && !overrideApproved[idx];
          return {
            file_index: idx,
            file_name: f.file_name,
            file_url: f.file_url.trim(),
            file_size: f.file_size,
            status: wasApproved ? 'approved' : 'pending',
            total_score: wasApproved ? f.total_score : undefined,
            comment: wasApproved ? f.comment : `ส่งแก้ไขใหม่เมื่อ ${thaiDateTime}`,
          };
        });

        // Notes JSON
        let finalNotes = plan.notes;
        try {
          const cur = plan.notes ? JSON.parse(plan.notes) : {};
          if (typeof cur === 'object' && cur !== null) {
            cur._attachments = updatedAttachments;
            cur._file_reviews = updatedReviews;
            finalNotes = JSON.stringify(cur);
          }
        } catch {
          finalNotes = JSON.stringify({
            _raw_notes: plan.notes,
            _attachments: updatedAttachments,
            _file_reviews: updatedReviews,
          });
        }

        const revisedNames = multiFiles
          .filter((f, idx) => f.status === 'needs_revision' || overrideApproved[idx])
          .map((f) => f.file_name)
          .join(', ');

        const combinedComment = resubmitNote.trim()
          ? `[ส่งใหม่ ${thaiDateTime}]: ${resubmitNote.trim()} (แก้ไข: ${revisedNames})${plan.review_comment ? `\n(ข้อเสนอแนะเดิม: ${plan.review_comment})` : ''}`
          : `[ส่งใหม่ ${thaiDateTime}]: ปรับปรุง ${revisedNames} เรียบร้อยแล้ว${plan.review_comment ? `\n(ข้อเสนอแนะเดิม: ${plan.review_comment})` : ''}`;

        const updatedPlan: LessonPlan = {
          ...plan,
          file_url: multiFiles[0]?.file_url || plan.file_url,
          status: 'submitted',
          submitted_at: `${thaiDateTime} (ส่งแก้ไขใหม่)`,
          review_comment: combinedComment,
          notes: finalNotes,
          file_reviews: updatedReviews,
        };

        await onResubmit(updatedPlan);
        onClose();
      } catch (err: any) {
        setError(err?.message || 'เกิดข้อผิดพลาดในการส่งแผนใหม่อีกครั้ง');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ==========================================
    // SINGLE-FILE RESUBMISSION LOGIC
    // ==========================================
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
        status: 'submitted',
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
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-100">
                Resubmit Lesson Plan
              </span>
              <h2 className="text-lg sm:text-xl font-bold">ส่งแผนการสอนใหม่อีกครั้ง</h2>
              <p className="text-xs text-amber-100 mt-0.5">
                {isMultiMode
                  ? 'แก้ไขเฉพาะไฟล์ที่กรรมการตีกลับ โดยไฟล์ที่ผ่านแล้วจะถูกเก็บรักษาไว้โดยอัตโนมัติ'
                  : 'แผนจะถูกเปลี่ยนสถานะเป็น "รอตรวจ" เพื่อให้กรรมการตรวจใหม่อีกครั้ง'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-800 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Plan Summary Card */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
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

          {/* Overall Previous Review Feedback */}
          {plan.review_comment && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>ข้อเสนอแนะที่ต้องแก้ไข (จาก {plan.reviewer_name || 'ผู้ตรวจ / ฝ่ายวิชาการ'}):</span>
              </div>
              <p className="text-rose-900 bg-white/80 p-2.5 rounded-xl border border-rose-100 whitespace-pre-wrap leading-relaxed text-[11px] sm:text-xs">
                {plan.review_comment}
              </p>
            </div>
          )}

          {/* ============================================================
              ITEM 3: SELECTIVE MULTI-FILE RE-UPLOAD / RESUBMISSION INTERFACE
              ============================================================ */}
          {isMultiMode ? (
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-amber-50 rounded-2xl border border-indigo-200/80 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>รายการไฟล์แนบที่ส่งตรวจ ({multiFiles.length} ไฟล์)</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    💡 ไฟล์ที่ <strong className="text-emerald-700">ผ่านแล้ว</strong> จะคงอยู่เดิม ท่านเพียงแค่วางลิงก์ใหม่สำหรับไฟล์ที่ <strong className="text-rose-600">ถูกตีกลับ</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewAttachment}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                  title="เพิ่มไฟล์แนบเพิ่มเติม"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มไฟล์</span>
                </button>
              </div>

              {/* Per-File Cards */}
              <div className="space-y-2.5">
                {multiFiles.map((item, idx) => {
                  const isApproved = item.status === 'approved' && !overrideApproved[idx];

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border-2 transition-all space-y-2.5 ${
                        isApproved
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-white border-amber-300/90 shadow-2xs'
                      }`}
                    >
                      {/* File Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                              isApproved
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {isApproved ? '✓ ผ่านแล้ว' : '⚠️ ต้องแก้ไข'}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            ไฟล์ที่ {idx + 1}: {item.file_name}
                          </span>
                          {item.total_score !== undefined && (
                            <span className="font-mono text-[10px] text-slate-500 font-bold">
                              ({item.total_score}%)
                            </span>
                          )}
                        </div>

                        {/* Approved Toggle Override */}
                        {item.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleToggleOverrideApproved(idx)}
                            className="text-[10px] font-bold text-indigo-700 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {overrideApproved[idx] ? (
                              <>
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>ยกเลิก (คงไฟล์เดิม)</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-indigo-600" />
                                <span>ต้องการเปลี่ยนไฟล์นี้ด้วย</span>
                              </>
                            )}
                          </button>
                        )}
                        {idx >= 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                            title="ลบไฟล์แนบนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Reviewer Note for this specific file */}
                      {item.comment && !isApproved && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-0.5">
                          <span className="font-bold block text-[10px] text-rose-700">ข้อเสนอแนะเฉพาะไฟล์นี้:</span>
                          <p className="italic">{item.comment}</p>
                        </div>
                      )}

                      {/* Input for new file link */}
                      {!isApproved ? (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            ลิงก์ไฟล์ฉบับแก้ไข (PDF หรือ Excel) <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              value={item.file_url}
                              onChange={(e) => handleUpdateFileUrl(idx, e.target.value)}
                              placeholder="https://drive.google.com/... หรือ ลิงก์ตรง .pdf, .xlsx"
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                            />
                            {item.file_url && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                                title="ทดสอบเปิดดูลิงก์"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูไฟล์</span>
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            💡 หากอัปโหลดทับไฟล์เดิมบน Google Drive สามารถใช้ลิงก์เดิมได้เลยครับ
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-emerald-900 bg-white/70 p-2 rounded-xl border border-emerald-200/60">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ไฟล์นี้ผ่านเกณฑ์แล้ว ระบบจะเก็บรักษาไว้ตามเดิม</span>
                          </span>
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-indigo-700 hover:underline flex items-center gap-1"
                          >
                            <span>เปิดดู</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Shared PDF Permission Notice & Visual Guide */}
              <PdfPermissionNotice
                url={multiFiles.find((f) => f.status === 'needs_revision')?.file_url || multiFiles[0]?.file_url}
                isConfirmed={isPermissionConfirmed}
                onConfirmChange={setIsPermissionConfirmed}
                required={true}
                showStepByStep={true}
              />
            </div>
          ) : (
            /* Standard Single-File Resubmission */
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
          )}

          {/* Resubmit Note to Reviewer */}
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
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer"
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
