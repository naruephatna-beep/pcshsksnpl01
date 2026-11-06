import React, { useState, useEffect, useRef } from 'react';
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
import { assignWorkflowToPlan } from '../services/departmentWorkflowService';
import { triggerSchoolCelebration } from '../utils/confettiUtils';
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
  Cloud,
  Plus,
  Copy,
  Layers,
  Files,
  Info,
} from 'lucide-react';
import { PdfPermissionNotice } from './PdfPermissionNotice';

export interface DynamicAttachment {
  field_id: string;
  file_name: string;
  file_url: string;
  file_size?: string;
}

export interface DynamicSubmissionItem {
  id: string;
  formValues: Record<string, any>;
  attachments: DynamicAttachment[];
  isPermissionConfirmed?: boolean;
}

interface DynamicSubmitModalProps {
  currentTeacher: Teacher;
  config: PlanTypeDeadlineConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (
    submission: AssignmentSubmission | AssignmentSubmission[],
    correspondingPlan?: LessonPlan | LessonPlan[]
  ) => void;
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
  const formRef = useRef<HTMLDivElement>(null);

  // Helper to create a pristine item with teacher profile defaults
  const createNewItem = (inheritFrom?: Partial<DynamicSubmissionItem>): DynamicSubmissionItem => {
    const initialValues: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === 'user_profile') {
        if (f.profile_key === 'learning_area') {
          initialValues[f.id] = currentTeacher.Learning_Area || '';
        } else if (f.profile_key === 'teacher_id') {
          initialValues[f.id] = currentTeacher.Teacher_ID || '';
        } else if (f.profile_key === 'position') {
          initialValues[f.id] = currentTeacher.position || '';
        } else {
          initialValues[f.id] = currentTeacher.Name || '';
        }
      } else if (f.type === 'checkbox') {
        initialValues[f.id] = inheritFrom?.formValues?.[f.id] ? [...inheritFrom.formValues[f.id]] : [];
      } else {
        initialValues[f.id] = inheritFrom?.formValues?.[f.id] || '';
      }
    });

    return {
      id: Math.random().toString(36).substring(2, 9),
      formValues: initialValues,
      attachments: inheritFrom?.attachments ? [...inheritFrom.attachments] : [],
      isPermissionConfirmed: inheritFrom?.isPermissionConfirmed || false,
    };
  };

  // State: Multiple items (supports submitting multiple subjects/projects at once)
  const [items, setItems] = useState<DynamicSubmissionItem[]>([createNewItem()]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Per-field active link text input (fieldId -> string)
  const [activeLinkInputs, setActiveLinkInputs] = useState<Record<string, string>>({});

  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSuccessNotice(null);
    setActiveLinkInputs({});

    if (!currentTeacher.Name || !currentTeacher.Teacher_ID) {
      setError('ข้อมูลบัญชีครูยังไม่สมบูรณ์ กรุณาแก้ไขโปรไฟล์ก่อนส่งงาน');
    }

    if (existingSubmission) {
      setItems([
        {
          id: existingSubmission.id,
          formValues: existingSubmission.answers || {},
          attachments: existingSubmission.attachments || [],
          isPermissionConfirmed: true,
        },
      ]);
      setActiveItemIndex(0);
    } else {
      setItems([createNewItem()]);
      setActiveItemIndex(0);
    }
  }, [isOpen, config.id, existingSubmission, currentTeacher]);

  if (!isOpen) return null;

  const currentItem = items[activeItemIndex] || items[0];
  const timeliness = checkSubmissionTimeliness(config.name, new Date(), [config]);

  // Update a form field value for current item
  const handleUpdateFieldValue = (fieldId: string, value: any) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === activeItemIndex
          ? { ...it, formValues: { ...it.formValues, [fieldId]: value } }
          : it
      )
    );
  };

  // Add attachments to current item
  const handleAddAttachments = (fieldId: string, newAttachments: DynamicAttachment[]) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== activeItemIndex) return it;
        const updated = [...it.attachments, ...newAttachments];
        return {
          ...it,
          attachments: updated,
          formValues: {
            ...it.formValues,
            [fieldId]: updated.filter((a) => a.field_id === fieldId)[0]?.file_url || it.formValues[fieldId],
          },
          isPermissionConfirmed: true,
        };
      })
    );
  };

  // Remove a specific attachment
  const handleRemoveAttachment = (attachmentToRemove: DynamicAttachment) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== activeItemIndex) return it;
        const updated = it.attachments.filter(
          (a) => !(a.field_id === attachmentToRemove.field_id && a.file_url === attachmentToRemove.file_url)
        );
        const remainingFieldAtts = updated.filter((a) => a.field_id === attachmentToRemove.field_id);
        return {
          ...it,
          attachments: updated,
          formValues: {
            ...it.formValues,
            [attachmentToRemove.field_id]: remainingFieldAtts[0]?.file_url || '',
          },
        };
      })
    );
  };

  // Handle multi-file upload from device
  const handleFileChange = async (field: DynamicFormField, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    // Check size limit & extensions for all files
    const maxSizeMb = field.file_config?.max_size_mb || 25;
    for (const f of fileList) {
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`ไฟล์ "${f.name}" มีขนาดเกิน ${maxSizeMb} MB กรุณาเลือกไฟล์ใหม่`);
        e.target.value = '';
        return;
      }

      const allowed = field.file_config?.allowed_types || [];
      if (allowed.length > 0) {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        const isAllowed = allowed.some((a) => a.toLowerCase().trim() === ext);
        if (!isAllowed) {
          setError(`ไฟล์ "${f.name}" ประเภทไม่ถูกต้อง! อนุญาตเฉพาะ: ${allowed.join(', ')}`);
          e.target.value = '';
          return;
        }
      }
    }

    setError('');
    setUploadingFieldId(field.id);

    try {
      const uploaded: DynamicAttachment[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        setUploadProgressText(
          fileList.length > 1
            ? `กำลังนำไฟล์ ${i + 1}/${fileList.length} (${f.name}) เข้า Google Drive...`
            : `กำลังนำไฟล์ "${f.name}" เข้าสู่ Google Drive...`
        );

        const uploadRes = await uploadAssignmentAttachmentFile(
          f,
          currentTeacher.Teacher_ID,
          config.name || config.id,
          currentTeacher.Name
        );

        if (uploadRes.success) {
          uploaded.push({
            field_id: field.id,
            file_name: uploadRes.fileName || f.name,
            file_url: uploadRes.url,
            file_size: uploadRes.fileSize,
          });
        } else {
          setError(`อัปโหลดไฟล์ "${f.name}" ไม่สำเร็จ: ${uploadRes.error || 'โปรดลองใหม่อีกครั้ง'}`);
        }
      }

      if (uploaded.length > 0) {
        handleAddAttachments(field.id, uploaded);
      }
    } catch (err: any) {
      setError(`เกิดข้อผิดพลาดในการอัปโหลด: ${err?.message || 'ข้อผิดพลาดระบบ'}`);
    } finally {
      setUploadingFieldId(null);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  // Handle adding direct link attachment
  const handleAddLinkAttachment = (field: DynamicFormField) => {
    const rawUrl = (activeLinkInputs[field.id] || '').trim();
    if (!rawUrl) {
      setError('กรุณากรอกลิงก์ไฟล์ PDF ก่อนกดเพิ่มลิงก์');
      return;
    }

    let finalUrl = rawUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      setError('รูปแบบลิงก์ไม่ถูกต้อง กรุณากรอก URL เช่น https://drive.google.com/...');
      return;
    }

    const currentFieldAtts = (currentItem.attachments || []).filter((a) => a.field_id === field.id);
    const newAtt: DynamicAttachment = {
      field_id: field.id,
      file_name: `${field.label || 'เอกสาร'} (ไฟล์ที่ ${currentFieldAtts.length + 1})`,
      file_url: finalUrl,
      file_size: 'PDF Cloud Link',
    };

    handleAddAttachments(field.id, [newAtt]);
    setActiveLinkInputs((prev) => ({ ...prev, [field.id]: '' }));
    setError('');
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

  // Add new item (subject/class)
  const handleAddItem = () => {
    const newItem = createNewItem(currentItem);
    setItems((prev) => [...prev, newItem]);
    setActiveItemIndex(items.length);
    setTimeout(() => {
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  // Duplicate current item
  const handleDuplicateItem = () => {
    const duplicated = createNewItem(currentItem);
    setItems((prev) => [...prev, duplicated]);
    setActiveItemIndex(items.length);
  };

  // Remove an item
  const handleRemoveItem = (idxToRemove: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idxToRemove));
    setActiveItemIndex((prev) => Math.max(0, prev - 1));
  };

  // Helper to generate label for tab pills
  const getItemTabLabel = (item: DynamicSubmissionItem, index: number) => {
    const code =
      item.formValues['fld_subject_code'] ||
      item.formValues['fld_subject'] ||
      item.formValues['fld_code'];
    const title =
      item.formValues['fld_title'] ||
      item.formValues['fld_research_topic'] ||
      item.formValues['fld_topic'] ||
      item.formValues['fld_grade_level'];

    if (code && title) return `${code}: ${String(title).substring(0, 16)}`;
    if (code) return String(code);
    if (title) return String(title).substring(0, 20);
    return `รายการที่ ${index + 1}`;
  };

  // Form Submit Handler (Submits all items)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validation across all items
    for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
      const it = items[itemIdx];
      const itPrefix = items.length > 1 ? `[รายการที่ ${itemIdx + 1}] ` : '';

      for (const f of fields) {
        if (f.type === 'file') {
          const fieldAtts = (it.attachments || []).filter((a) => a.field_id === f.id);
          const rawVal = String(it.formValues[f.id] || '').trim();

          if (f.required && fieldAtts.length === 0 && !rawVal) {
            setActiveItemIndex(itemIdx);
            setError(`${itPrefix}กรุณาอัปโหลดไฟล์หรือระบุลิงก์ในช่อง: "${f.label}"`);
            return;
          }

          if (f.required && !it.isPermissionConfirmed && fieldAtts.length === 0) {
            setActiveItemIndex(itemIdx);
            setError(
              `${itPrefix}กรุณาตรวจสอบสิทธิ์ไฟล์ใน Google Drive ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู" และกดยืนยันก่อนส่ง`
            );
            return;
          }
        } else if (f.required) {
          if (f.type === 'checkbox') {
            const val = it.formValues[f.id];
            if (!Array.isArray(val) || val.length === 0) {
              setActiveItemIndex(itemIdx);
              setError(`${itPrefix}กรุณาเลือกตัวเลือกอย่างน้อย 1 ข้อในช่อง: "${f.label}"`);
              return;
            }
          } else {
            const val = String(it.formValues[f.id] || '').trim();
            if (!val) {
              setActiveItemIndex(itemIdx);
              setError(`${itPrefix}กรุณากรอกข้อมูลในช่อง: "${f.label}"`);
              return;
            }
          }
        }
      }
    }

    setIsSubmitting(true);

    try {
      const createdSubmissions: AssignmentSubmission[] = [];
      const createdPlans: LessonPlan[] = [];

      for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const it = items[itemIdx];
        const submissionId =
          existingSubmission?.id && items.length === 1
            ? existingSubmission.id
            : `SUB-${Date.now()}-${itemIdx}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newRecord: AssignmentSubmission = {
          id: submissionId,
          assignment_id: config.id,
          assignment_name: config.name,
          teacher_id: currentTeacher.Teacher_ID,
          teacher_name: currentTeacher.Name,
          learning_area: currentTeacher.Learning_Area || '',
          submitted_at: new Date().toISOString(),
          status: timeliness.isLate ? 'late' : 'submitted',
          answers: it.formValues,
          attachments: it.attachments,
          is_late: timeliness.isLate,
          submission_delay_text: timeliness.delayText,
        };

        await saveAssignmentSubmissionRecord(newRecord);
        createdSubmissions.push(newRecord);

        // Map to corresponding LessonPlan for complete cross-feature tracking
        const firstAttachment = it.attachments[0];
        const titleCandidate =
          it.formValues['fld_title'] ||
          it.formValues['fld_research_topic'] ||
          it.formValues['fld_topic'] ||
          it.formValues[fields.find((f) => f.type === 'textarea')?.id || ''] ||
          it.formValues[fields.find((f) => f.type === 'text')?.id || ''] ||
          config.name;

        const subjectCodeCandidate =
          it.formValues['fld_subject_code'] ||
          it.formValues[fields.find((f) => f.label.includes('รหัสวิชา'))?.id || ''] ||
          'ภาระงาน';

        const subjectNameCandidate =
          it.formValues['fld_subject_name'] ||
          it.formValues[fields.find((f) => f.label.includes('วิชา') || f.label.includes('ชื่อ'))?.id || ''] ||
          config.name;

        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

        const correspondingPlan: LessonPlan = {
          id: submissionId,
          teacher_id: currentTeacher.Teacher_ID,
          teacher_name: currentTeacher.Name,
          teacher_photo: currentTeacher.photo,
          learning_area: currentTeacher.Learning_Area || '',
          branch: currentTeacher.branch || '',
          subject_code: String(subjectCodeCandidate),
          subject_name: String(subjectNameCandidate),
          grade_level: String(it.formValues['fld_grade_level'] || 'มัธยมศึกษา'),
          semester: config.semester,
          academic_year: config.academic_year,
          plan_title: String(titleCandidate).substring(0, 120),
          plan_type: config.name,
          total_hours: Number(it.formValues['fld_hours']) || 1,
          file_url: firstAttachment?.file_url || (it.formValues[fields.find((f) => f.type === 'file')?.id || ''] || '#'),
          file_name:
            it.attachments.length > 1
              ? `${firstAttachment?.file_name || 'เอกสาร'} (+อีก ${it.attachments.length - 1} ไฟล์)`
              : firstAttachment?.file_name || 'เอกสารภาระงาน',
          submitted_at: nowStr,
          status: timeliness.isLate ? 'late' : 'submitted',
          is_late: timeliness.isLate,
          submission_delay_text: timeliness.delayText,
          evaluation_type: config.evaluation_type || 'approval_only',
          notes: JSON.stringify({
            ...it.formValues,
            _attachments: it.attachments,
          }),
        };

        const finalPlan = assignWorkflowToPlan(correspondingPlan);
        await savePlanRecord(finalPlan);
        createdPlans.push(finalPlan);
      }

      triggerSchoolCelebration('full');

      if (onSubmitted) {
        onSubmitted(
          createdSubmissions.length === 1 ? createdSubmissions[0] : (createdSubmissions as any),
          createdPlans.length === 1 ? createdPlans[0] : (createdPlans as any)
        );
      }

      setSuccessNotice(
        createdPlans.length > 1
          ? `ส่งภาระงานสำเร็จทั้งหมด ${createdPlans.length} รายการแล้ว!`
          : 'ส่งภาระงานสำเร็จเรียบร้อยแล้ว!'
      );

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
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-4 sm:p-5 text-white shrink-0">
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-200">
                  แบบฟอร์มส่งภาระงานวิชาการ
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  รองรับหลายไฟล์ & หลายวิชา
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold line-clamp-1">{config.name}</h2>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 sm:gap-3 text-xs bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/15 flex-wrap">
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

        {/* Multi-Item / Multi-Subject Selector Tabs Bar (เหมือนแผนฉบับย่อ) */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll py-0.5">
            <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>รายการที่ส่ง:</span>
            </span>

            {items.map((it, idx) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setActiveItemIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeItemIndex === idx
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                }`}
              >
                <span>{getItemTabLabel(it, idx)}</span>
                {it.attachments && it.attachments.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      activeItemIndex === idx
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-indigo-100 text-indigo-900'
                    }`}
                  >
                    {it.attachments.length} ไฟล์
                  </span>
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 ml-1"
              title="เพิ่มวิชาหรือรายการอื่นที่ต้องส่งสำหรับภาระงานนี้"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มวิชา/รายการ</span>
            </button>
          </div>

          {items.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDuplicateItem}
                className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                title="คัดลอกข้อมูลรายการปัจจุบัน"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveItem(activeItemIndex)}
                className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                title="ลบรายการนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 touch-scroll">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-bold block">แจ้งเตือน:</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm">{successNotice}</span>
            </div>
          )}

          {/* Item Index Banner if multiple items */}
          {items.length > 1 && (
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between text-xs text-indigo-950 font-bold">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-mono text-[11px]">
                  {activeItemIndex + 1}
                </span>
                <span>
                  กำลังกรอก: {getItemTabLabel(currentItem, activeItemIndex)} (รายการที่ {activeItemIndex + 1} จาก {items.length})
                </span>
              </div>
              <button
                type="button"
                onClick={handleDuplicateItem}
                className="text-indigo-700 hover:text-indigo-900 underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>คัดลอกข้อมูลรายการนี้</span>
              </button>
            </div>
          )}

          {/* Dynamic Fields List for current item */}
          <div className="space-y-4">
            {fields.map((field) => {
              const val = currentItem.formValues[field.id];
              const fieldAttachments = (currentItem.attachments || []).filter((a) => a.field_id === field.id);

              return (
                <div
                  key={field.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs transition-all hover:border-slate-300"
                >
                  {/* Field Header */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1">
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-500 font-bold">*</span>}
                    </label>

                    {field.type === 'file' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                        <Files className="w-3 h-3 text-indigo-600" />
                        <span>แนบได้หลายไฟล์</span>
                      </span>
                    )}
                  </div>

                  {field.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{field.description}</p>
                  )}

                  {/* FIELD TYPE: TEXT */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder || `กรอก${field.label}`}
                      value={val || ''}
                      onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                    />
                  )}

                  {/* FIELD TYPE: TEXTAREA */}
                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      required={field.required}
                      placeholder={field.placeholder || `กรอกรายละเอียด${field.label}`}
                      value={val || ''}
                      onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                    />
                  )}

                  {/* FIELD TYPE: NUMBER */}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      required={field.required}
                      placeholder={field.placeholder || '0'}
                      value={val || ''}
                      onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                    />
                  )}

                  {/* FIELD TYPE: DATE */}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      value={val || ''}
                      onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                    />
                  )}

                  {/* FIELD TYPE: SELECT */}
                  {field.type === 'select' && (
                    <select
                      required={field.required}
                      value={val || ''}
                      onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs bg-white cursor-pointer"
                    >
                      <option value="">-- โปรดเลือก {field.label} --</option>
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
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                        >
                          <input
                            type="radio"
                            name={`radio_${currentItem.id}_${field.id}`}
                            required={field.required && !val}
                            checked={val === opt}
                            onChange={() => handleUpdateFieldValue(field.id, opt)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-700 font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* FIELD TYPE: CHECKBOX */}
                  {field.type === 'checkbox' && (
                    <div className="space-y-1.5 pt-1">
                      {(field.options || []).map((opt) => {
                        const checkedList = Array.isArray(val) ? val : [];
                        const isChecked = checkedList.includes(opt);
                        return (
                          <label
                            key={opt}
                            className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleUpdateFieldValue(field.id, [...checkedList, opt]);
                                } else {
                                  handleUpdateFieldValue(
                                    field.id,
                                    checkedList.filter((x: string) => x !== opt)
                                  );
                                }
                              }}
                              className="text-indigo-600 focus:ring-indigo-500 rounded"
                            />
                            <span className="text-xs text-slate-700 font-medium">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* FIELD TYPE: USER_PROFILE (Read-only / Prefilled) */}
                  {field.type === 'user_profile' && (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={val || ''}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-700 font-medium cursor-not-allowed select-none"
                      />
                      <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                        อัตโนมัติ
                      </span>
                    </div>
                  )}

                  {/* FIELD TYPE: FILE UPLOAD & MULTI-FILE ATTACHMENTS */}
                  {field.type === 'file' && (
                    <div className="space-y-3 pt-1">
                      {/* List of currently attached files for this field */}
                      {fieldAttachments.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold px-1">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>เอกสารที่แนบแล้ว ({fieldAttachments.length} ไฟล์):</span>
                            </span>
                            <span className="text-[10px] font-normal text-slate-500">
                              สามารถเพิ่มไฟล์ต่อได้ด้านล่าง
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {fieldAttachments.map((att, attIdx) => (
                              <div
                                key={`${att.file_url}_${attIdx}`}
                                className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs hover:bg-emerald-100/60 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 font-mono shadow-xs">
                                    {attIdx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-emerald-950 truncate block">
                                      {att.file_name}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                                      <span>{att.file_size || 'แนบเรียบร้อย'}</span>
                                      <span aria-hidden="true">·</span>
                                      <span className="truncate max-w-[220px] font-mono opacity-80">
                                        {att.file_url}
                                      </span>
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
                                    <span>เปิดดู</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttachment(att)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                                    title="ลบไฟล์นี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Google Drive Multi-Uploader & Link Box */}
                      <div className="space-y-3 p-4 bg-slate-50/90 rounded-2xl border-2 border-indigo-100 shadow-2xs">
                        {/* Option 1: Multi-file Upload from Device */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Cloud className="w-4 h-4 text-emerald-600" />
                              <span>
                                {fieldAttachments.length > 0
                                  ? '+ เพิ่มไฟล์ PDF อีก (เลือกได้หลายไฟล์พร้อมกัน)'
                                  : '1. อัปโหลดไฟล์ PDF จากเครื่อง (เลือกได้หลายไฟล์พร้อมกัน)'}
                              </span>
                            </label>
                            <span className="text-[10px] text-emerald-800 bg-emerald-100/80 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                              ระบบสร้างลิงก์เข้าไดรฟ์ให้อัตโนมัติ
                            </span>
                          </div>

                          <div className="relative">
                            <label
                              className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                                uploadingFieldId === field.id
                                  ? 'bg-amber-50/80 border-amber-400 text-amber-900 pointer-events-none'
                                  : 'bg-white hover:bg-emerald-50/40 border-slate-300 hover:border-emerald-400 text-slate-700'
                              }`}
                            >
                              {uploadingFieldId === field.id ? (
                                <div className="flex flex-col items-center gap-2 py-1 text-center">
                                  <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                  <p className="font-bold text-xs text-emerald-900">
                                    {uploadProgressText || 'กำลังนำไฟล์เข้าสู่ Google Drive ของโรงเรียน...'}
                                  </p>
                                  <p className="text-[10px] text-emerald-700">
                                    ระบบกำลังเปิดสิทธิ์และเชื่อมโยงไฟล์ทั้งหมดเข้าฐานข้อมูล
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1.5 py-1 text-center">
                                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                                    <Upload className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-xs text-slate-800 hover:text-emerald-700">
                                      คลิกเพื่อเลือกไฟล์ PDF จากเครื่อง (เลือกทีละไฟล์ หรือหลายไฟล์พร้อมกัน)
                                    </span>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      รองรับไฟล์ .pdf (ไม่เกิน 25 MB/ไฟล์) · ระบบจะนำไฟล์เข้า Google Drive และบันทึกให้ครบทุกไฟล์
                                    </p>
                                  </div>
                                </div>
                              )}
                              <input
                                type="file"
                                multiple
                                accept=".pdf,application/pdf"
                                disabled={uploadingFieldId === field.id}
                                onChange={(e) => handleFileChange(field, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 border-t border-slate-200"></div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            หรือ 2. กรอกลิงก์ Google Drive ด้วยตนเอง (แนบได้หลายลิงก์)
                          </span>
                          <div className="flex-1 border-t border-slate-200"></div>
                        </div>

                        {/* Option 2: Add Link Input */}
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                              <input
                                type="url"
                                value={activeLinkInputs[field.id] || ''}
                                onChange={(e) =>
                                  setActiveLinkInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddLinkAttachment(field);
                                  }
                                }}
                                placeholder="https://drive.google.com/file/d/... วางลิงก์แล้วกด 'เพิ่มลิงก์นี้'"
                                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-2xs transition-all"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddLinkAttachment(field)}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                              title="เพิ่มลิงก์นี้ลงในรายการเอกสารแนบ"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>เพิ่มลิงก์นี้</span>
                            </button>
                          </div>

                          <p className="text-[10px] text-slate-500">
                            * สามารถวางลิงก์แล้วกดปุ่ม "เพิ่มลิงก์นี้" เพื่อแนบหลายๆ ลิงก์ต่อ 1 ช่องข้อมูลได้
                          </p>
                        </div>

                        {/* PDF Permission Notice & Confirmation */}
                        <PdfPermissionNotice
                          url={fieldAttachments[0]?.file_url || activeLinkInputs[field.id]}
                          isConfirmed={currentItem.isPermissionConfirmed ?? false}
                          onConfirmChange={(confirmed) => {
                            setItems((prev) =>
                              prev.map((it, idx) =>
                                idx === activeItemIndex ? { ...it, isPermissionConfirmed: confirmed } : it
                              )
                            );
                          }}
                          required={field.required}
                          showStepByStep={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Add-Item Button (เหมือนแผนย่อ) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 via-indigo-50/50 to-blue-50/80 border-2 border-dashed border-amber-300/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>ต้องการส่งภาระงานนี้สำหรับหลายวิชา / หลายเรื่องพร้อมกันหรือไม่?</span>
              </span>
              <p className="text-[11px] text-slate-600">
                คุณครูสามารถกดปุ่ม "+ เพิ่มวิชา/รายการ" เพื่อส่งหลายงานได้ในรอบเดียวเหมือนหน้าส่งแผนการสอน
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ เพิ่มวิชา / รายการที่ต้องส่งอีก</span>
            </button>
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
                  <span>
                    {items.length > 1
                      ? `ยืนยันการส่งภาระงานทั้งหมด (${items.length} รายการ)`
                      : 'ยืนยันการส่งงานนี้'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
