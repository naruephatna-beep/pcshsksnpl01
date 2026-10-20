import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Teacher, LessonPlan, PlanType, PlanTypeDeadlineConfig } from '../types';
import {
  checkSubmissionTimeliness,
  getSavedDeadlineConfigs,
} from '../utils/deadlineUtils';
import {
  X,
  UploadCloud,
  FileText,
  FileCheck2,
  Sparkles,
  Link as LinkIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SubmitPlanModalProps {
  currentTeacher: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (planOrPlans: LessonPlan | LessonPlan[]) => Promise<any>;
  isSupabaseConnected?: boolean;
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  initialPlanType?: string;
}

const DEFAULT_PLAN_TYPES: PlanType[] = [
  'แผนการจัดการเรียนรู้ฉบับย่อ',
  'แผนการจัดการเรียนรู้ฉบับสมบูรณ์',
];

const GRADE_LEVELS = [
  'มัธยมศึกษาปีที่ 1',
  'มัธยมศึกษาปีที่ 2',
  'มัธยมศึกษาปีที่ 3',
  'มัธยมศึกษาปีที่ 4',
  'มัธยมศึกษาปีที่ 5',
  'มัธยมศึกษาปีที่ 6',
];

export interface SubmissionItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  gradeLevel: string;
  semester: string;
  academicYear: string;
  planTitle: string;
  planType: PlanType;
  totalHours: number;
  fileUrl: string;
  fileName: string;
  notes: string;
}

export const SubmitPlanModal: React.FC<SubmitPlanModalProps> = ({
  currentTeacher,
  isOpen,
  onClose,
  onSubmit,
  isSupabaseConnected = false,
  deadlineConfigs,
  initialPlanType,
}) => {
  const formRef = useRef<HTMLFormElement>(null);

  const currentDeadlines =
    deadlineConfigs && deadlineConfigs.length > 0
      ? deadlineConfigs
      : getSavedDeadlineConfigs();

  const availablePlanTypes = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    currentDeadlines.forEach((d) => {
      const name = (d.name || '').trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push(name);
      }
    });
    return list.length > 0 ? list : DEFAULT_PLAN_TYPES;
  }, [currentDeadlines]);

  const defaultInitialType =
    initialPlanType && availablePlanTypes.includes(initialPlanType)
      ? initialPlanType
      : availablePlanTypes.length > 0
      ? availablePlanTypes[0]
      : DEFAULT_PLAN_TYPES[0];

  const createNewItem = (
    type?: string,
    inheritFrom?: Partial<SubmissionItem>
  ): SubmissionItem => ({
    id: Math.random().toString(36).substring(2, 9),
    subjectCode: inheritFrom?.subjectCode || '',
    subjectName: inheritFrom?.subjectName || '',
    gradeLevel: inheritFrom?.gradeLevel || GRADE_LEVELS[3], // ม.4 default
    semester: inheritFrom?.semester || '1',
    academicYear: inheritFrom?.academicYear || '2569',
    planTitle: inheritFrom?.planTitle || '',
    planType: (inheritFrom?.planType || type || defaultInitialType) as PlanType,
    totalHours: inheritFrom?.totalHours || 40,
    fileUrl: '',
    fileName: '',
    notes: inheritFrom?.notes || '',
  });

  const [items, setItems] = useState<SubmissionItem[]>([
    createNewItem(defaultInitialType),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens or initialPlanType changes
  useEffect(() => {
    if (isOpen) {
      setItems([createNewItem(defaultInitialType)]);
      setError('');
    }
  }, [isOpen, initialPlanType]);

  if (!isOpen) return null;

  // Add new blank item for another subject
  const handleAddItem = () => {
    const lastItem = items[items.length - 1];
    setItems((prev) => [
      ...prev,
      createNewItem(lastItem?.planType, {
        semester: lastItem?.semester,
        academicYear: lastItem?.academicYear,
        planType: lastItem?.planType,
        gradeLevel: lastItem?.gradeLevel,
      }),
    ]);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollTo({
          top: formRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 60);
  };

  // Duplicate an existing item
  const handleDuplicateItem = (itemToCopy: SubmissionItem) => {
    const duplicated = createNewItem(itemToCopy.planType, {
      ...itemToCopy,
      subjectCode: itemToCopy.subjectCode,
      subjectName: itemToCopy.subjectName,
      planTitle: itemToCopy.planTitle,
    });
    setItems((prev) => [...prev, duplicated]);
  };

  // Remove an item
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update a field in an item
  const handleUpdateItem = (
    id: string,
    field: keyof SubmissionItem,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Test opening a specific PDF URL
  const handleTestOpenLink = (url: string) => {
    let urlToTest = url.trim();
    if (!urlToTest) {
      setError('กรุณากรอกลิงก์ไฟล์ PDF ก่อนทดสอบเปิด');
      return;
    }
    if (!/^https?:\/\//i.test(urlToTest)) {
      urlToTest = 'https://' + urlToTest;
    }
    window.open(urlToTest, '_blank', 'noopener,noreferrer');
  };

  // Submit all items
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validation across all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemLabel = `รายการที่ ${i + 1}${
        item.subjectCode ? ` (${item.subjectCode})` : ''
      }`;

      if (
        !item.subjectCode.trim() ||
        !item.subjectName.trim() ||
        !item.planTitle.trim()
      ) {
        setError(
          `[${itemLabel}] กรุณากรอกรหัสวิชา ชื่อวิชา และชื่อแผนการจัดการเรียนรู้ให้ครบถ้วน`
        );
        return;
      }

      const trimmedUrl = item.fileUrl.trim();
      if (!trimmedUrl) {
        setError(
          `[${itemLabel}] บังคับส่งเป็นลิงก์ไฟล์ PDF: กรุณาระบุลิงก์เอกสารแผนการสอน (เช่น Google Drive PDF หรือลิงก์ตรง .pdf)`
        );
        return;
      }

      let finalUrl = trimmedUrl;
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }

      try {
        new URL(finalUrl);
      } catch {
        setError(
          `[${itemLabel}] รูปแบบลิงก์ไม่ถูกต้อง กรุณากรอก URL ให้ถูกต้อง เช่น https://drive.google.com/...`
        );
        return;
      }

      const isGoogleDrive = /drive\.google\.com|docs\.google\.com/i.test(finalUrl);
      const isCloudDoc =
        /onedrive|1drv\.ms|dropbox\.com|sharepoint\.com|supabase\.co|storage\.googleapis\.com/i.test(
          finalUrl
        );
      const isPdfExt = /\.pdf(\?|$|#)/i.test(finalUrl);

      if (!isPdfExt && !isGoogleDrive && !isCloudDoc) {
        setError(
          `[${itemLabel}] บังคับส่งเฉพาะลิงก์ไฟล์ PDF เท่านั้น! (เช่น ลิงก์ไฟล์ PDF บน Google Drive หรือลิงก์ที่ลงท้ายด้วย .pdf)`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 2. Construct LessonPlan records for each item
      const plansToSubmit: LessonPlan[] = items.map((item, index) => {
        const generatedId = `LP-${item.academicYear}-${Math.floor(
          1000 + Math.random() * 9000
        )}-${index + 1}`;
        const safeCode = item.subjectCode.trim().toUpperCase();
        const generatedFileName = item.fileName.trim()
          ? item.fileName.endsWith('.pdf')
            ? item.fileName
            : `${item.fileName}.pdf`
          : `${safeCode}_${item.planTitle.trim().slice(0, 25)}.pdf`;

        const submissionTimeliness = checkSubmissionTimeliness(
          item.planType,
          new Date(),
          currentDeadlines
        );

        let finalUrl = item.fileUrl.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl;
        }

        return {
          id: generatedId,
          teacher_id: currentTeacher.Teacher_ID,
          teacher_name: currentTeacher.Name,
          teacher_photo: currentTeacher.photo,
          learning_area: currentTeacher.Learning_Area,
          subject_code: safeCode,
          subject_name: item.subjectName.trim(),
          grade_level: item.gradeLevel,
          semester: item.semester,
          academic_year: item.academicYear,
          plan_title: item.planTitle.trim(),
          plan_type: item.planType,
          total_hours: Number(item.totalHours) || 40,
          file_url: finalUrl,
          file_name: generatedFileName,
          file_size: 'PDF Cloud Link',
          notes: item.notes.trim(),
          submitted_at: new Date(Date.now() + index * 1000).toISOString(),
          status: submissionTimeliness.isLate ? 'late' : 'submitted',
          is_late: submissionTimeliness.isLate,
          submission_delay_text: submissionTimeliness.delayText,
          deadline_at: submissionTimeliness.formattedDeadline,
        };
      });

      // 3. Submit all plans
      const res: any = await onSubmit(plansToSubmit);

      if (res && res.isSupabase && !res.success) {
        const hint = res.error?.includes('relation')
          ? '\n(อาจยังไม่ได้สร้างตาราง lesson_plans ใน Supabase SQL — ให้คลิก "ตั้งค่า Supabase" ด้านบนเพื่อดูคำสั่ง SQL)'
          : '';
        setError(
          `บันทึกในเครื่องแล้ว แต่ Supabase SQL ปฏิเสธ: ${res.error}${hint}`
        );
        setIsSubmitting(false);
        return;
      }

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการส่งแผนการสอน');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 p-4 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shadow-inner shrink-0">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-blue-200 block truncate">
                  Lesson Plan Submission
                </span>
                <span className="bg-amber-400 text-slate-950 px-2 py-0.2 rounded-full text-[10px] font-black">
                  {items.length} วิชา / รายการ
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold truncate">
                ส่งแผนการจัดการเรียนรู้ (เพิ่มได้หลายวิชา)
              </h2>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3 flex items-center gap-2 sm:gap-3 text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/15 flex-wrap">
            <span className="font-semibold text-sky-200">ผู้ส่ง:</span>
            <span className="font-medium truncate max-w-[150px]">
              {currentTeacher.Name}
            </span>
            <span className="font-mono bg-white/20 px-1.5 py-0.2 rounded text-[10px]">
              {currentTeacher.Teacher_ID}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="text-amber-200 truncate max-w-[160px]">
              {currentTeacher.Learning_Area}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 touch-scroll"
        >
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm whitespace-pre-line leading-relaxed">
              {error}
            </div>
          )}

          {/* Quick Guide for Google Drive PDF Sharing */}
          <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-3.5 sm:p-4 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-indigo-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>คำแนะนำการส่งแผนหลายวิชาในรอบเดียว:</span>
              </span>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                บังคับส่งเป็นลิงก์ไฟล์ PDF
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              ท่านสามารถกรอกข้อมูลวิชาแรก แล้วกดปุ่ม{' '}
              <strong className="text-indigo-700">
                &ldquo;+ เพิ่มวิชา / เอกสารอีกรายการ&rdquo;
              </strong>{' '}
              เพื่อเพิ่มวิชาอื่น ๆ (เช่น ครูสอนทั้ง ม.4 และ ม.5)
              และกดส่งพร้อมกันได้ทันที โดยแต่ละวิชาใช้ลิงก์ Google Drive PDF
              ของวิชานั้น ๆ
            </p>
          </div>

          {/* SUBMISSION ITEMS LIST */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const itemTimeliness = checkSubmissionTimeliness(
                item.planType,
                new Date(),
                currentDeadlines
              );

              return (
                <div
                  key={item.id}
                  className="bg-slate-50/70 border-2 border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-indigo-300 transition-colors shadow-2xs relative"
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {item.subjectCode && item.subjectName
                              ? `${item.subjectCode} ${item.subjectName}`
                              : `วิชา / เอกสารรายการที่ ${index + 1}`}
                          </h3>
                          {item.subjectCode ? (
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                              {item.subjectCode}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                              (กรอกข้อมูลวิชาใหม่ที่นี่)
                            </span>
                          )}
                          {item.gradeLevel && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold truncate hidden sm:inline">
                              {item.gradeLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Item Card Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(item)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="คัดลอกข้อมูลวิชานี้เพื่อสร้างรายการถัดไปอย่างรวดเร็ว"
                      >
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">คัดลอกข้อมูล</span>
                      </button>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Field 1: Subject Code & Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        รหัสวิชา (Subject Code) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.subjectCode}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'subjectCode',
                            e.target.value.toUpperCase()
                          )
                        }
                        placeholder="เช่น ว31101, ค22101, ท32101"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono uppercase bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชื่อรายวิชา (Subject Name) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.subjectName}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'subjectName',
                            e.target.value
                          )
                        }
                        placeholder="เช่น ฟิสิกส์ 1 หรือ วิทยาศาสตร์ชีวภาพ"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      />
                    </div>
                  </div>

                  {/* Field 2: Grade, Semester, Hours */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ระดับชั้น <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={item.gradeLevel}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'gradeLevel', e.target.value)
                        }
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      >
                        {GRADE_LEVELS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ภาคเรียน / ปีการศึกษา <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={item.semester}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'semester', e.target.value)
                          }
                          className="w-1/2 px-2.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                        >
                          <option value="1">เทอม 1</option>
                          <option value="2">เทอม 2</option>
                        </select>
                        <input
                          type="text"
                          value={item.academicYear}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id,
                              'academicYear',
                              e.target.value
                            )
                          }
                          placeholder="2569"
                          className="w-1/2 px-2.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono text-center bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        จำนวนชั่วโมงสอนรวม
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={item.totalHours}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id,
                              'totalHours',
                              Number(e.target.value)
                            )
                          }
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 3: Plan Type + Timeliness Status */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        ประเภทเอกสาร <span className="text-rose-500">*</span>
                      </label>
                      {itemTimeliness.configFound && (
                        <span className="text-[11px] font-mono text-slate-500">
                          กำหนดส่ง: {itemTimeliness.formattedDeadline}
                        </span>
                      )}
                    </div>
                    <select
                      value={item.planType}
                      onChange={(e) =>
                        handleUpdateItem(
                          item.id,
                          'planType',
                          e.target.value as PlanType
                        )
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                    >
                      {availablePlanTypes.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>

                    {/* Deadline notice for this item */}
                    {itemTimeliness.configFound && (
                      <div
                        className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          itemTimeliness.isLate
                            ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {itemTimeliness.isLate ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="font-semibold truncate">
                            {itemTimeliness.isLate
                              ? `เกินกำหนดส่ง (${itemTimeliness.delayText})`
                              : `อยู่ในช่วงกำหนดส่ง (${itemTimeliness.delayText})`}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono shrink-0">
                          {itemTimeliness.formattedDeadline}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Field 4: Plan Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อแผนการจัดการเรียนรู้ / หน่วยการเรียนรู้{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={item.planTitle}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'planTitle', e.target.value)
                      }
                      placeholder="เช่น แผนการจัดการเรียนรู้ที่ 1-10 เรื่อง การเคลื่อนที่ในหนึ่งมิติ และกฎการเคลื่อนที่ของนิวตัน"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                    />
                  </div>

                  {/* Field 5: Strict PDF Link for this Item */}
                  <div className="bg-white border-2 border-indigo-200/80 rounded-2xl p-3.5 sm:p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                        <span>ลิงก์ไฟล์ PDF ของวิชานี้</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        บังคับไฟล์ PDF
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          type="url"
                          required
                          value={item.fileUrl}
                          onChange={(e) => {
                            handleUpdateItem(item.id, 'fileUrl', e.target.value);
                            if (!item.fileName && e.target.value) {
                              handleUpdateItem(
                                item.id,
                                'fileName',
                                `${item.subjectCode || 'แผน'}_${
                                  item.planTitle ? item.planTitle.slice(0, 20) : 'เอกสาร'
                                }.pdf`
                              );
                            }
                          }}
                          placeholder="https://drive.google.com/file/d/... หรือ ลิงก์ตรงที่ลงท้ายด้วย .pdf"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 font-mono text-xs sm:text-sm"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTestOpenLink(item.fileUrl)}
                        disabled={!item.fileUrl.trim()}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shrink-0 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="ทดสอบเปิดลิงก์ PDF ของวิชานี้"
                      >
                        <span>ทดสอบเปิด</span>
                        <span>↗</span>
                      </button>
                    </div>
                  </div>

                  {/* Field 6: Notes */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      หมายเหตุเพิ่มเติมของวิชานี้ (ไม่บังคับ)
                    </label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'notes', e.target.value)
                      }
                      placeholder="เช่น แผนการสอนห้องเรียนพิเศษวิทยาศาสตร์, เน้นการทดลอง 5E"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ADD ANOTHER SUBJECT / DOCUMENT BUTTON */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-3.5 px-4 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer text-xs sm:text-sm shadow-2xs"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>+ เพิ่มวิชา / เอกสารอีกรายการ (สำหรับครูที่มีหลายวิชา เช่น แผนย่อคนละวิชา)</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-3 pb-safe border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>จำนวนเอกสารที่จะส่ง:</span>
              <span className="font-bold text-indigo-700 font-mono">
                {items.length} รายการ
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-colors text-center cursor-pointer active:scale-98"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังส่งแผน ({items.length} รายการ)...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      ยืนยันส่งเอกสารทั้งหมด ({items.length} วิชา)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
