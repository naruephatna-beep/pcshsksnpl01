import React, { useState, useEffect } from 'react';
import {
  Teacher,
  PlanTypeDeadlineConfig,
  DynamicFormField,
  AssignmentSubmission,
  LessonPlan,
} from '../types';
import { checkSubmissionTimeliness } from '../utils/deadlineUtils';
import {
  saveAssignmentSubmissionRecord,
  uploadAssignmentAttachmentFile,
  savePlanRecord,
} from '../services/supabaseClient';
import {
  X,
  FileCheck2,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Calendar,
  Lock,
  ExternalLink,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DynamicSubmitModalProps {
  currentTeacher: Teacher;
  config: PlanTypeDeadlineConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (submission: AssignmentSubmission, correspondingPlan?: LessonPlan) => void;
  existingSubmission?: AssignmentSubmission | null;
}

export const DynamicSubmitModal: React.FC<DynamicSubmitModalProps> = ({
  currentTeacher,
  config,
  isOpen,
  onClose,
  onSubmitted,
  existingSubmission,
}) => {
  const fields: DynamicFormField[] = config.fields || [];

  // Form values state: maps field.id -> value
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  // File uploads state: maps field.id -> array of attachments
  const [attachments, setAttachments] = useState<
    Array<{
      field_id: string;
      file_name: string;
      file_url: string;
      file_size?: string;
    }>
  >([]);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [fileInputModes, setFileInputModes] = useState<Record<string, 'upload' | 'link'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Initialize or reset form values
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSuccessNotice(null);

    // If teacher profile is incomplete
    if (!currentTeacher.Name || !currentTeacher.Teacher_ID) {
      setError('ข้อมูลบัญชีครูยังไม่สมบูรณ์ (ไม่พบชื่อ-นามสกุล) กรุณาแก้ไขโปรไฟล์ก่อนส่งงาน');
    }

    if (existingSubmission) {
      setFormValues(existingSubmission.answers || {});
      setAttachments(existingSubmission.attachments || []);
    } else {
      const initial: Record<string, any> = {};
      fields.forEach((f) => {
        if (f.type === 'user_profile') {
          if (f.profile_key === 'learning_area') {
            initial[f.id] = currentTeacher.Learning_Area || '';
          } else if (f.profile_key === 'teacher_id') {
            initial[f.id] = currentTeacher.Teacher_ID || '';
          } else if (f.profile_key === 'position') {
            initial[f.id] = currentTeacher.position || '';
          } else {
            initial[f.id] = currentTeacher.Name || '';
          }
        } else if (f.type === 'checkbox') {
          initial[f.id] = [];
        } else {
          initial[f.id] = '';
        }
      });

      const initialModes: Record<string, 'upload' | 'link'> = {};
      fields.forEach((f) => {
        if (f.type === 'file') {
          if (f.file_config?.submission_mode === 'link_only' || f.file_config?.require_link_only) {
            initialModes[f.id] = 'link';
          } else {
            initialModes[f.id] = 'upload';
          }
        }
      });
      setFileInputModes(initialModes);
      setFormValues(initial);
      setAttachments([]);
    }
  }, [isOpen, config.id, existingSubmission, currentTeacher]);

  if (!isOpen) return null;

  const timeliness = checkSubmissionTimeliness(config.name, new Date(), [config]);

  // Handle single file upload
  const handleFileChange = async (field: DynamicFormField, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit
    const maxSizeMb = field.file_config?.max_size_mb || 25;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`ไฟล์ "${file.name}" มีขนาดเกิน ${maxSizeMb} MB กรุณาเลือกไฟล์ใหม่`);
      e.target.value = '';
      return;
    }

    // Check extension if restricted
    const allowed = field.file_config?.allowed_types || [];
    if (allowed.length > 0) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAllowed = allowed.some((a) => a.toLowerCase().trim() === ext);
      if (!isAllowed) {
        setError(`ประเภทไฟล์ไม่ถูกต้อง! อนุญาตเฉพาะ: ${allowed.join(', ')}`);
        e.target.value = '';
        return;
      }
    }

    setError('');
    setUploadingFieldId(field.id);

    try {
      const uploadRes = await uploadAssignmentAttachmentFile(
        file,
        currentTeacher.Teacher_ID,
        config.id
      );

      if (uploadRes.success) {
        // Remove existing attachment for this field if single file
        const filtered = attachments.filter((a) => a.field_id !== field.id);
        const newAtt = {
          field_id: field.id,
          file_name: uploadRes.fileName,
          file_url: uploadRes.url,
          file_size: uploadRes.fileSize,
        };
        setAttachments([...filtered, newAtt]);
        setFormValues((prev) => ({ ...prev, [field.id]: uploadRes.url }));
      } else {
        setError(`อัปโหลดไฟล์ไม่สำเร็จ: ${uploadRes.error || 'โปรดลองใหม่อีกครั้ง'}`);
      }
    } catch (err: any) {
      setError(`เกิดข้อผิดพลาดในการอัปโหลด: ${err?.message || 'ข้อผิดพลาดระบบ'}`);
    } finally {
      setUploadingFieldId(null);
      e.target.value = '';
    }
  };

  // Remove uploaded attachment
  const handleRemoveAttachment = (fieldId: string) => {
    setAttachments((prev) => prev.filter((a) => a.field_id !== fieldId));
    setFormValues((prev) => ({ ...prev, [fieldId]: '' }));
  };

  // Set PDF link directly from Google Drive / Cloud
  const handleSetPdfLink = (field: DynamicFormField, rawUrl: string) => {
    const cleanUrl = rawUrl.trim();
    setFormValues((prev) => ({ ...prev, [field.id]: cleanUrl }));

    if (cleanUrl) {
      let finalUrl = cleanUrl;
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      const filtered = attachments.filter((a) => a.field_id !== field.id);
      const newAtt = {
        field_id: field.id,
        file_name: `${field.label || 'เอกสาร'}.pdf (ลิงก์ PDF)`,
        file_url: finalUrl,
        file_size: 'PDF Cloud Link',
      };
      setAttachments([...filtered, newAtt]);
    } else {
      setAttachments((prev) => prev.filter((a) => a.field_id !== field.id));
    }
  };

  // Helper to test opening link
  const handleTestOpenLink = (url?: string) => {
    if (!url) return;
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validate required fields
    for (const f of fields) {
      if (f.type === 'file') {
        const rawVal = String(formValues[f.id] || '').trim();
        if (f.required && !rawVal) {
          setError(`[${f.label}] กรุณาระบุลิงก์ไฟล์ PDF (เช่น ลิงก์ Google Drive หรือลิงก์ที่ลงท้ายด้วย .pdf)`);
          return;
        }

        if (rawVal) {
          let finalUrl = rawVal;
          if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'https://' + finalUrl;
          }

          try {
            new URL(finalUrl);
          } catch {
            setError(`[${f.label}] รูปแบบลิงก์ไม่ถูกต้อง กรุณากรอก URL เช่น https://drive.google.com/...`);
            return;
          }

          const isGoogleDrive = /drive\.google\.com|docs\.google\.com/i.test(finalUrl);
          const isCloudDoc =
            /onedrive|1drv\.ms|dropbox\.com|sharepoint\.com|supabase\.co|storage\.googleapis\.com|canva\.com|icloud\.com/i.test(
              finalUrl
            );
          const isPdfExt = /\.pdf(\?|$|#)/i.test(finalUrl);

          if (!isPdfExt && !isGoogleDrive && !isCloudDoc) {
            setError(
              `[${f.label}] บังคับส่งเฉพาะลิงก์ไฟล์ PDF เท่านั้น! (เช่น ลิงก์ไฟล์ PDF บน Google Drive หรือลิงก์ที่ลงท้ายด้วย .pdf)`
            );
            return;
          }
        }
      } else if (f.required) {
        if (f.type === 'checkbox') {
          const val = formValues[f.id];
          if (!Array.isArray(val) || val.length === 0) {
            setError(`กรุณาเลือกตัวเลือกอย่างน้อย 1 ข้อในช่อง: "${f.label}"`);
            return;
          }
        } else {
          const val = String(formValues[f.id] || '').trim();
          if (!val) {
            setError(`กรุณากรอกข้อมูลในช่อง: "${f.label}"`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);

    try {
      const submissionId = existingSubmission?.id || `SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newRecord: AssignmentSubmission = {
        id: submissionId,
        assignment_id: config.id,
        assignment_name: config.name,
        teacher_id: currentTeacher.Teacher_ID,
        teacher_name: currentTeacher.Name,
        learning_area: currentTeacher.Learning_Area || '',
        submitted_at: new Date().toISOString(),
        status: timeliness.isLate ? 'late' : 'submitted',
        answers: formValues,
        attachments: attachments,
        is_late: timeliness.isLate,
        submission_delay_text: timeliness.delayText,
      };

      const res = await saveAssignmentSubmissionRecord(newRecord);

      // Create and save corresponding LessonPlan record so it integrates with all existing tracking & receipt
      const firstAttachment = attachments[0];
      const titleCandidate =
        formValues['fld_title'] ||
        formValues['fld_research_topic'] ||
        formValues['fld_topic'] ||
        formValues[fields.find((f) => f.type === 'textarea')?.id || ''] ||
        formValues[fields.find((f) => f.type === 'text')?.id || ''] ||
        config.name;

      const subjectCodeCandidate =
        formValues['fld_subject_code'] ||
        formValues[fields.find((f) => f.label.includes('รหัสวิชา'))?.id || ''] ||
        'ภาระงาน';

      const subjectNameCandidate =
        formValues['fld_subject_name'] ||
        formValues[fields.find((f) => f.label.includes('วิชา') || f.label.includes('ชื่อ'))?.id || ''] ||
        config.name;

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const correspondingPlan: LessonPlan = {
        id: submissionId,
        teacher_id: currentTeacher.Teacher_ID,
        teacher_name: currentTeacher.Name,
        teacher_photo: currentTeacher.photo,
        learning_area: currentTeacher.Learning_Area || '',
        subject_code: String(subjectCodeCandidate),
        subject_name: String(subjectNameCandidate),
        grade_level: String(formValues['fld_grade_level'] || 'มัธยมศึกษา'),
        semester: config.semester,
        academic_year: config.academic_year,
        plan_title: String(titleCandidate).substring(0, 120),
        plan_type: config.name,
        total_hours: Number(formValues['fld_hours']) || 1,
        file_url: firstAttachment?.file_url || (formValues[fields.find((f) => f.type === 'file')?.id || ''] || '#'),
        file_name: firstAttachment?.file_name || 'เอกสารภาระงาน',
        submitted_at: nowStr,
        status: timeliness.isLate ? 'late' : 'submitted',
        is_late: timeliness.isLate,
        submission_delay_text: timeliness.delayText,
        evaluation_type: config.evaluation_type || 'approval_only',
        notes: JSON.stringify(formValues),
      };

      await savePlanRecord(correspondingPlan);

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      if (onSubmitted) {
        onSubmitted(newRecord, correspondingPlan);
      }

      setSuccessNotice('ส่งภาระงานสำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกการส่งงาน');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-4 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shadow-inner shrink-0">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-200 block truncate">
                Assignment Submission Form
              </span>
              <h2 className="text-base sm:text-lg font-bold line-clamp-1">{config.name}</h2>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 sm:gap-3 text-xs bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/15 flex-wrap">
            <span className="font-semibold text-sky-200">ผู้ส่งงาน:</span>
            <span className="font-bold truncate max-w-[150px]">{currentTeacher.Name}</span>
            <span className="font-mono bg-white/20 px-1.5 py-0.2 rounded text-[10px]">
              {currentTeacher.Teacher_ID}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="text-amber-200 truncate max-w-[160px]">{currentTeacher.Learning_Area}</span>
          </div>
        </div>

        {/* Timeliness Banner */}
        <div
          className={`px-4 sm:px-6 py-2.5 text-xs flex items-center justify-between border-b ${
            timeliness.isLate
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {timeliness.isLate ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold">
              {timeliness.isLate
                ? `เกินกำหนดส่ง (${timeliness.delayText})`
                : `อยู่ในช่วงกำหนดส่ง (${timeliness.delayText})`}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-600 hidden sm:inline">
            กำหนดส่ง: {timeliness.formattedDeadline}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 touch-scroll">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm whitespace-pre-line leading-relaxed">
              {error}
            </div>
          )}

          {successNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {config.description && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">คำชี้แจงจากฝ่ายบริหาร:</strong>
              {config.description}
            </div>
          )}

          {/* DYNAMIC FIELDS RENDERER */}
          <div className="space-y-4">
            {fields.map((field, index) => {
              const val = formValues[field.id];

              return (
                <div
                  key={field.id}
                  className="bg-slate-50/60 border border-slate-200/90 rounded-2xl p-4 space-y-1.5 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-500">*</span>}
                    </label>

                    {field.type === 'user_profile' && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>ดึงจากโปรไฟล์ครูอัตโนมัติ</span>
                      </span>
                    )}
                  </div>

                  {field.description && (
                    <p className="text-[11px] text-slate-500">{field.description}</p>
                  )}

                  {/* FIELD TYPE: USER PROFILE (READ-ONLY) */}
                  {field.type === 'user_profile' && (
                    <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 flex items-center justify-between">
                      <span>{val || currentTeacher.Name}</span>
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                  )}

                  {/* FIELD TYPE: TEXT */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder || `กรอก${field.label}`}
                      value={val || ''}
                      onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  )}

                  {/* FIELD TYPE: TEXTAREA */}
                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      required={field.required}
                      placeholder={field.placeholder || `ระบุรายละเอียด${field.label}...`}
                      value={val || ''}
                      onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 leading-relaxed"
                    />
                  )}

                  {/* FIELD TYPE: NUMBER */}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      required={field.required}
                      placeholder={field.placeholder || '0'}
                      value={val || ''}
                      onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-mono"
                    />
                  )}

                  {/* FIELD TYPE: DATE */}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      value={val || ''}
                      onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-mono"
                    />
                  )}

                  {/* FIELD TYPE: SELECT */}
                  {field.type === 'select' && (
                    <select
                      required={field.required}
                      value={val || ''}
                      onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">-- โปรดคลิกเพื่อเลือก {field.label} --</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* FIELD TYPE: RADIO */}
                  {field.type === 'radio' && (
                    <div className="space-y-1.5 pt-1">
                      {(field.options || []).map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            val === opt
                              ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`sub_${field.id}`}
                            value={opt}
                            checked={val === opt}
                            onChange={() => setFormValues({ ...formValues, [field.id]: opt })}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs sm:text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* FIELD TYPE: CHECKBOX */}
                  {field.type === 'checkbox' && (
                    <div className="space-y-1.5 pt-1">
                      {(field.options || []).map((opt) => {
                        const currentArr: string[] = Array.isArray(val) ? val : [];
                        const isChecked = currentArr.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = isChecked
                                  ? currentArr.filter((x) => x !== opt)
                                  : [...currentArr, opt];
                                setFormValues({ ...formValues, [field.id]: next });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs sm:text-sm">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* FIELD TYPE: FILE UPLOAD & PDF LINK */}
                  {field.type === 'file' && (
                    <div className="space-y-3 pt-1">
                      {/* Attached file/link badge if uploaded or linked */}
                      {attachments
                        .filter((a) => a.field_id === field.id)
                        .map((att) => (
                          <div
                            key={att.file_url}
                            className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-bold text-emerald-950 truncate block">
                                  {att.file_name}
                                </span>
                                <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                                  <span>{att.file_size || 'แนบเรียบร้อย'}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate max-w-[200px] font-mono">{att.file_url}</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg font-semibold border border-emerald-300 flex items-center gap-1 text-[11px] transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>เปิดไฟล์</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(field.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                                title="ลบไฟล์และเลือกใหม่"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                      {/* Dedicated PDF Link Input Interface (Zero-Egress Mode) */}
                      <div className="space-y-2.5 p-4 bg-slate-50/90 rounded-2xl border-2 border-rose-100 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <LinkIcon className="w-3.5 h-3.5 text-rose-600" />
                            <span>ลิงก์ไฟล์ PDF / Google Drive ของเอกสารนี้</span>
                            {field.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>
                          <span className="text-[10px] text-rose-700 bg-rose-50 font-bold px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            บังคับส่งเฉพาะลิงก์ PDF (ประหยัดแบนด์วิดท์)
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                              type="url"
                              required={field.required}
                              value={val || ''}
                              onChange={(e) => handleSetPdfLink(field, e.target.value)}
                              placeholder="https://drive.google.com/file/d/... หรือ ลิงก์ตรงที่ลงท้ายด้วย .pdf"
                              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600 shadow-2xs transition-all"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTestOpenLink(val)}
                            disabled={!val}
                            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="ทดสอบเปิดลิงก์ PDF นี้ในแท็บใหม่"
                          >
                            <span>ทดสอบเปิด</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>

                        {val && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">พร้อมส่ง: {val}</span>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          💡 <strong>คำแนะนำ:</strong> กรุณาอัปโหลดไฟล์ PDF ไว้บน <strong>Google Drive / OneDrive</strong> แล้วคัดลอกลิงก์มาวาง โดยตั้งค่าสิทธิ์แชร์เป็น <em>&ldquo;ทุกคนที่มีลิงก์สามารถดูได้&rdquo;</em> เพื่อให้ผู้ตรวจเปิดอ่านได้ทันทีและช่วยประหยัดทรัพยากรเซิร์ฟเวอร์
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="pt-3 pb-safe border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-colors cursor-pointer text-center"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !!uploadingFieldId}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  <span>ยืนยันการส่งงานนี้</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
