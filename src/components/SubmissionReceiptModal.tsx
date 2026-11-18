import React, { useState } from 'react';
import { LessonPlan, Teacher } from '../types';
import { X, Printer, Award, CheckCircle2, School, ShieldCheck, Mail, RefreshCw, Sparkles } from 'lucide-react';
import {
  sendAcademicEmailOneClick,
  generateReceiptEmailHtml,
  ACADEMIC_SENDER_NAME,
  ACADEMIC_SENDER_EMAIL,
} from '../services/emailService';
import { PrintModalShell } from './PrintModalShell';

interface SubmissionReceiptModalProps {
  plan: LessonPlan;
  teacher?: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onOpenCertificate?: (plan: LessonPlan) => void;
}

export const SubmissionReceiptModal: React.FC<SubmissionReceiptModalProps> = ({
  plan,
  teacher,
  isOpen,
  onClose,
  onOpenCertificate,
}) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmailReceipt = async () => {
    const toEmail = (teacher?.Email || '').trim();
    if (!toEmail) return;

    setIsSendingEmail(true);
    setEmailMsg('');
    try {
      const receiptMail = generateReceiptEmailHtml({ plan, teacher });
      const res = await sendAcademicEmailOneClick({
        to: toEmail,
        subject: receiptMail.subject,
        htmlBody: receiptMail.html,
        body: receiptMail.plainText,
        senderName: ACADEMIC_SENDER_NAME,
      });

      if (res.success) {
        setEmailSent(true);
        setEmailMsg(`ส่งหลักฐานเข้าอีเมล ${toEmail} ผ่าน Google Apps Script สำเร็จแล้ว!`);
      } else if (res.isLegacyScript) {
        setEmailMsg('Google Apps Script ของโรงเรียนยังไม่ได้อัปเดตคำสั่งส่งอีเมล');
      } else {
        setEmailMsg(`ส่งเมลไม่สำเร็จ: ${res.error || 'โปรดตรวจสอบการเชื่อมต่อ'}`);
      }
    } catch (err: any) {
      setEmailMsg(`ข้อผิดพลาด: ${err?.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const emailAction = teacher?.Email ? (
    <button
      type="button"
      onClick={handleSendEmailReceipt}
      disabled={isSendingEmail || emailSent}
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-70"
      title={`ส่งสำเนาเข้า ${teacher.Email}`}
    >
      {isSendingEmail ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : emailSent ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <Mail className="w-3.5 h-3.5" />
      )}
      <span>
        {isSendingEmail ? 'กำลังส่งเมล...' : emailSent ? 'ส่งเมลแล้ว' : 'ส่งสำเนาเข้าเมล (1 คลิก)'}
      </span>
    </button>
  ) : null;

  const emailBanner = emailMsg ? (
    <div
      className={`px-6 py-2 text-xs font-bold border-b ${
        emailSent ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
      }`}
    >
      {emailMsg}
    </div>
  ) : null;

  const modalFooter = (
    <div className="px-4 sm:px-6 py-3 bg-[#0B1329] border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300">
      <span className="hidden sm:inline">
        ระบบส่งเอกสารวิชาการ • ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {plan.status === 'approved' && onOpenCertificate && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCertificate(plan);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            title="เปิดดูวุฒิบัตร / เกียรติบัตร ว.PA ของแผนนี้"
          >
            <Award className="w-4 h-4 text-slate-950" />
            <span>ดูวุฒิบัตร ว.PA</span>
          </button>
        )}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์ใบตอบรับ</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/20 hover:bg-rose-600 text-rose-100 hover:text-white border border-rose-400/40 rounded-xl font-bold transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>ปิดหน้านี้</span>
        </button>
      </div>
    </div>
  );

  return (
    <PrintModalShell
      isOpen={isOpen}
      onClose={onClose}
      onPrint={handlePrint}
      title="เอกสารหลักฐานการส่งแผนการจัดการเรียนรู้"
      subtitle={`${plan.subject_code} ${plan.subject_name} • ${plan.teacher_name}`}
      icon={<Printer className="w-4 h-4" />}
      headerActions={emailAction}
      subHeader={emailBanner}
      footer={modalFooter}
      paperClassName="p-6 sm:p-10 font-['Sarabun',sans-serif] text-slate-800 bg-white max-w-2xl"
    >
      {/* Certificate / Receipt Sheet */}
      <div>
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
                      ส่งช้ากว่ากำหนด {plan.submission_delay_text ? `(${plan.submission_delay_text})` : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">
                      ส่งตรงเวลาตามกำหนด
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

        </div>
    </PrintModalShell>
  );
};
