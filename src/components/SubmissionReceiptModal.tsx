import React from 'react';
import { LessonPlan, Teacher } from '../types';
import { X, Printer, Award, CheckCircle2, School, ShieldCheck } from 'lucide-react';

interface SubmissionReceiptModalProps {
  plan: LessonPlan;
  teacher?: Teacher;
  isOpen: boolean;
  onClose: () => void;
}

export const SubmissionReceiptModal: React.FC<SubmissionReceiptModalProps> = ({
  plan,
  teacher,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header bar */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <span className="text-xs font-semibold tracking-wider text-slate-300">
            เอกสารหลักฐานการส่งแผนการจัดการเรียนรู้
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="ปิดหน้านี้"
            >
              <X className="w-4 h-4" />
              <span>ปิดหน้านี้</span>
            </button>
          </div>
        </div>

        {/* Certificate / Receipt Sheet */}
        <div className="p-8 font-['Sarabun',sans-serif] text-slate-800 bg-white">
          {/* School Emblem / Seal */}
          <div className="text-center pb-4 border-b-2 border-slate-200">
            <div className="w-16 h-24 mx-auto mb-2 flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="ตราสัญลักษณ์โรงเรียน"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </h2>
            <p className="text-xs text-slate-500">
              กลุ่มบริหารวิชาการ • สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
            </p>
            <div className="mt-2 inline-block px-4 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold rounded-full">
              ใบตอบรับและยืนยันการส่งแผนการจัดการเรียนรู้
            </div>
          </div>

          {/* Receipt Info */}
          <div className="mt-4 grid grid-cols-2 text-xs text-slate-500 gap-y-1">
            <div>เลขที่เอกสาร: <strong className="font-mono text-slate-800">{plan.id}</strong></div>
            <div className="text-right">วันที่ส่ง: <strong className="text-slate-800">{plan.submitted_at}</strong></div>
          </div>

          {/* Main Content Details */}
          <div className="mt-5 space-y-3 text-sm">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-slate-500">ครูผู้สอน:</span>
                <span className="col-span-2 font-bold text-slate-800">{plan.teacher_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-slate-500">รหัสประจำตัว (Key):</span>
                <span className="col-span-2 font-mono font-bold text-indigo-700">{plan.teacher_id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-slate-500">กลุ่มสาระการเรียนรู้:</span>
                <span className="col-span-2 text-slate-700 font-medium">{plan.learning_area}</span>
              </div>
              {teacher && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-slate-500">ตำแหน่ง / วิทยฐานะ:</span>
                  <span className="col-span-2 text-slate-700">{teacher.position} ({teacher.academic_standing})</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-slate-500">รหัส-ชื่อรายวิชา:</span>
                <span className="col-span-2 font-bold text-slate-800">
                  {plan.subject_code} {plan.subject_name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-slate-500">ระดับชั้น / ภาคเรียน:</span>
                <span className="col-span-2 text-slate-700">
                  {plan.grade_level} (ภาคเรียนที่ {plan.semester}/{plan.academic_year})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-slate-500">ชื่อแผนการสอน:</span>
                <span className="col-span-2 text-slate-800 font-medium">{plan.plan_title}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-slate-500">ประเภทเอกสาร:</span>
                <span className="col-span-2 text-slate-700">{plan.plan_type} ({plan.total_hours} ชม.)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">การตรงต่อเวลา:</span>
                <span className="col-span-2 font-semibold flex items-center gap-1.5">
                  {plan.is_late ? (
                    <span className="text-orange-700 font-bold">
                      ⚠️ ส่งช้ากว่ากำหนด {plan.submission_delay_text ? `(${plan.submission_delay_text})` : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">
                      ✓ ส่งตรงเวลาตามกำหนด
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Status & Review Outcome */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">สถานะการตรวจสอบ:</span>
                <span className="font-bold text-sm text-indigo-900 flex items-center gap-1.5 mt-0.5">
                  {plan.status === 'approved' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">อนุมัติเรียบร้อยแล้ว</span>
                    </>
                  )}
                  {plan.status === 'needs_revision' && (
                    <span className="text-amber-700">ส่งกลับแก้ไข</span>
                  )}
                  {plan.status === 'submitted' && (
                    <span className="text-blue-700">รอการตรวจสอบจากฝ่ายวิชาการ</span>
                  )}
                </span>
              </div>

              {plan.total_score && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">คะแนนการประเมิน:</span>
                  <span className="text-base font-bold text-indigo-700">
                    {plan.total_score} / 100
                  </span>
                </div>
              )}
            </div>

            {plan.review_comment && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong className="text-slate-800 block mb-1">ความเห็นของผู้ตรวจ:</strong>
                {plan.review_comment}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-center text-xs">
            <div>
              <div className="h-12 flex items-center justify-center">
                <span className="font-serif italic text-slate-400">ลงชื่อครูผู้สอน</span>
              </div>
              <div className="border-t border-slate-300 pt-1">
                <p className="font-semibold text-slate-800">({plan.teacher_name})</p>
                <p className="text-slate-500 text-[11px]">ครูผู้สอน</p>
              </div>
            </div>

            <div>
              <div className="h-12 flex items-center justify-center">
                <span className="font-serif italic text-indigo-600 font-bold">
                  {plan.reviewer_name ? 'อนุมัติผ่านระบบ' : 'รอลงนาม'}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-1">
                <p className="font-semibold text-slate-800">
                  ({plan.reviewer_name || 'นายอภิชน นาชัยฤทธิ์'})
                </p>
                <p className="text-slate-500 text-[11px]">
                  รองผู้อำนวยการฝ่ายบริหารวิชาการ
                </p>
              </div>
            </div>
          </div>

          {/* Quick Close Button within document (Mobile & Desktop) */}
          <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <span className="text-[11px] text-slate-400">
              * สามารถพิมพ์หรือบันทึกเป็น PDF เพื่อเก็บไว้เป็นหลักฐานได้
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>พิมพ์เอกสาร</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>ปิดหน้านี้</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 print:hidden text-xs">
          <span className="text-slate-500 hidden sm:inline">
            ระบบส่งแผนการสอน • ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบตอบรับ</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>ปิดหน้านี้</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
