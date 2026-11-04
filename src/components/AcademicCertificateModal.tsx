import React, { useRef } from 'react';
import { LessonPlan, Teacher } from '../types';
import { formatThaiDateTime } from '../utils/deadlineUtils';
import {
  X,
  Printer,
  Download,
  Award,
  Sparkles,
  CheckCircle2,
  Mail,
  Share2,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';
import { sendAcademicEmailOneClick } from '../services/emailService';

interface AcademicCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: LessonPlan | null;
  teacher?: Teacher | null;
  teachers?: Teacher[];
  onNotifyEmailSent?: (msg: string) => void;
}

export const AcademicCertificateModal: React.FC<AcademicCertificateModalProps> = ({
  isOpen,
  onClose,
  plan,
  teacher,
  teachers = [],
  onNotifyEmailSent,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailSentStatus, setEmailSentStatus] = React.useState<string | null>(null);

  if (!isOpen || !plan) return null;

  const targetTeacher = teacher || teachers.find((t) => t.Teacher_ID === plan.teacher_id);
  const teacherName = targetTeacher?.Name || plan.teacher_name || 'คุณครูผู้สอน';
  const teacherEmail = targetTeacher?.Email || '';
  const position = targetTeacher?.position || 'ครู';
  const academicStanding = targetTeacher?.academic_standing || '';
  const learningArea = targetTeacher?.Learning_Area || plan.learning_area || 'กลุ่มบริหารวิชาการ';

  // Format serial number: e.g. วช.จภ.กส. ๒๕๖๙ / ๐๐๑
  const serialNo = `วช.จภ.กส. ${plan.academic_year || '๒๕๖๙'}/${String(plan.id.replace(/\D/g, '').slice(-4) || '๑๐๑').padStart(4, '๐')}`;

  // Approval date
  const approvalDate = plan.reviewed_at ? new Date(plan.reviewed_at) : new Date();
  const day = approvalDate.getDate();
  const monthsThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const month = monthsThai[approvalDate.getMonth()];
  const yearBE = approvalDate.getFullYear() + (approvalDate.getFullYear() < 2500 ? 543 : 0);
  const fullThaiDate = `ให้ไว้ ณ วันที่ ${day} เดือน ${month} พุทธศักราช ${yearBE}`;

  // Achievement level determination
  const score = typeof plan.total_score === 'number' ? plan.total_score : 90;
  const isExcellence = score >= 90;
  const achievementText = isExcellence
    ? 'ผ่านการประเมินคุณภาพระดับ "ดีเด่นยอดเยี่ยม" (คะแนน ๙๐ คะแนนขึ้นไป)'
    : 'ผ่านเกณฑ์การประเมินและได้รับอนุมัติให้ใช้จัดการเรียนรู้';

  // Direct print handler (A4 landscape)
  const handlePrint = () => {
    window.print();
  };

  // 1-Click Email send to teacher
  const handleSendEmailCertificate = async () => {
    if (!teacherEmail) {
      setEmailSentStatus('ไม่พบอีเมลของคุณครูในระบบ');
      return;
    }
    setIsSendingEmail(true);
    setEmailSentStatus(null);
    try {
      const subject = `[ฝ่ายวิชาการ จภ.กาฬสินธุ์] วุฒิบัตรรับรองการส่งและประเมินเอกสาร: ${plan.subject_code} ${plan.subject_name}`;
      const htmlBody = `
        <div style="font-family: 'Sarabun', sans-serif; max-width: 650px; margin: auto; padding: 25px; border: 2px solid #0B1329; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #D97706; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #0B1329; margin: 0 0 5px 0;">โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</h2>
            <p style="color: #D97706; font-weight: bold; margin: 0;">กลุ่มบริหารวิชาการ • เอกสารรับรองการปฏิบัติงาน ว.PA / SAR</p>
          </div>
          <p>เรียน คุณครู${teacherName}</p>
          <p>ฝ่ายบริหารวิชาการขอแจ้งมอบ <strong>วุฒิบัตรรับรองการส่งและผ่านการประเมินเอกสารวิชาการ</strong> สำหรับนำไปใช้ประกอบการประเมินผลการปฏิบัติงานตามข้อตกลง (ว.PA) และรายงานการประเมินตนเอง (SAR) ประจำปีการศึกษา ${plan.academic_year || '2569'}</p>
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>ประเภทเอกสาร:</strong> ${plan.plan_type}</p>
            <p style="margin: 4px 0;"><strong>รายวิชา:</strong> ${plan.subject_code} ${plan.subject_name}</p>
            <p style="margin: 4px 0;"><strong>สถานะ:</strong> อนุมัติผ่านการประเมิน ${isExcellence ? `(ระดับดีเด่น ${score} คะแนน)` : ''}</p>
            <p style="margin: 4px 0;"><strong>เลขที่วุฒิบัตร:</strong> ${serialNo}</p>
          </div>
          <p>คุณครูสามารถเข้าสู่ระบบส่งเอกสารวิชาการออนไลน์ เพื่อเปิดดูและพิมพ์วุฒิบัตรฉบับเต็มได้ทุกเวลาครับ</p>
          <p style="margin-top: 30px; color: #64748B; font-size: 13px;">กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
        </div>
      `;

      const res = await sendAcademicEmailOneClick({
        to: teacherEmail,
        subject,
        htmlBody,
        body: `วุฒิบัตรรับรองการส่งแผนการสอน ${plan.subject_code} สำหรับคุณครู ${teacherName} เลขที่ ${serialNo}`,
      });

      if (res.success) {
        setEmailSentStatus(`ส่งวุฒิบัตรไปยัง ${teacherEmail} สำเร็จเรียบร้อยแล้ว!`);
        if (onNotifyEmailSent) onNotifyEmailSent(`ส่งวุฒิบัตรไปยัง ${teacherEmail} เรียบร้อยแล้ว`);
      } else {
        setEmailSentStatus(`ส่งอีเมลไม่สำเร็จ: ${res.error || 'กรุณาลองใหม่อีกครั้ง'}`);
      }
    } catch (e: any) {
      setEmailSentStatus(`เกิดข้อผิดพลาด: ${e?.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #academic-certificate-print-area,
          #academic-certificate-print-area * {
            visibility: visible;
          }
          #academic-certificate-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            z-index: 999999;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden my-auto flex flex-col">
        {/* Modal Toolbar Header */}
        <div className="bg-[#0B1329] px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>วุฒิบัตรรับรองการส่งเอกสารวิชาการ (ว.PA / SAR)</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-extrabold">
                  A4 Landscape
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ออกโดยกลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmailCertificate}
              disabled={isSendingEmail || !teacherEmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              title={teacherEmail ? `ส่งวุฒิบัตรไปยัง ${teacherEmail}` : 'ไม่พบอีเมลผู้รับ'}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isSendingEmail ? 'กำลังส่งอีเมล...' : 'ส่งทางอีเมล'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email sent notification alert */}
        {emailSentStatus && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {emailSentStatus}
            </span>
            <button
              onClick={() => setEmailSentStatus(null)}
              className="text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Preview Container */}
        <div className="p-4 sm:p-8 bg-slate-800/60 overflow-x-auto flex justify-center">
          {/* Official Certificate Paper Sheet (A4 Aspect Ratio: 297mm x 210mm) */}
          <div
            id="academic-certificate-print-area"
            ref={certificateRef}
            className="w-full max-w-[850px] aspect-[1.414/1] bg-white text-slate-900 rounded-lg shadow-2xl p-6 sm:p-10 relative flex flex-col justify-between overflow-hidden select-none border-8 border-double border-[#0B1329]"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.03) 0%, rgba(255, 255, 255, 1) 70%)',
            }}
          >
            {/* Outer Thai Golden Ornamental Corner Accents */}
            <div className="absolute top-2 left-2 w-12 h-12 border-t-2 border-l-2 border-amber-500 pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-12 h-12 border-t-2 border-r-2 border-amber-500 pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 border-amber-500 pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 border-amber-500 pointer-events-none"></div>

            {/* Inner Thin Border */}
            <div className="absolute inset-3 border border-amber-400/50 pointer-events-none"></div>

            {/* Certificate Header */}
            <div className="text-center relative z-10 pt-2">
              <div className="flex justify-center mb-2">
                <img
                  src="/logo.svg"
                  alt="ตราสัญลักษณ์ จ.ภ. กาฬสินธุ์"
                  className="w-14 h-16 sm:w-18 sm:h-20 object-contain drop-shadow-sm"
                />
              </div>
              <h4 className="text-base sm:text-xl font-extrabold text-[#0B1329] tracking-tight">
                โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
              </h4>
              <p className="text-xs sm:text-sm font-semibold text-amber-700 mt-0.5">
                กลุ่มบริหารวิชาการ • Princess Chulabhorn Science High School Kalasin
              </p>
              <div className="inline-block mt-2 px-6 py-1 bg-gradient-to-r from-amber-500/20 via-amber-500/40 to-amber-500/20 border-y border-amber-500/60">
                <h2 className="text-lg sm:text-2xl font-black text-[#0B1329] tracking-wider font-['Prompt']">
                  วุฒิบัตรรับรองทางวิชาการ
                </h2>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="text-center relative z-10 px-4 sm:px-12 my-auto space-y-2.5 sm:space-y-3.5">
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                วุฒิบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
              </p>

              <div className="py-0.5">
                <h3 className="text-xl sm:text-3xl font-black text-[#0B1329] tracking-tight font-['Prompt']">
                  {teacherName}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                  ตำแหน่ง {position} {academicStanding ? `วิทยฐานะ ${academicStanding}` : ''} • กลุ่มสาระการเรียนรู้{learningArea}
                </p>
              </div>

              <div className="max-w-xl mx-auto space-y-1">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  ได้จัดทำและส่งมอบ <strong className="text-[#0B1329]">{plan.plan_type}</strong>
                </p>
                <p className="text-xs sm:text-sm font-bold text-[#0B1329] bg-amber-50/80 py-1 px-3 rounded-lg border border-amber-200 inline-block max-w-full truncate">
                  รหัสวิชา {plan.subject_code} รายวิชา{plan.subject_name} (ภาคเรียนที่ {plan.semester}/{plan.academic_year})
                </p>
                <p className="text-xs sm:text-sm text-emerald-800 font-semibold pt-1">
                  ✨ {achievementText} ✨
                </p>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500 pt-1">
                ขอให้มีความเจริญก้าวหน้าในวิชาชีพ และร่วมสร้างสรรค์คุณภาพการศึกษาแก่นักเรียนสืบไป
              </p>

              <p className="text-xs sm:text-sm font-medium text-slate-700 pt-1">
                {fullThaiDate}
              </p>
            </div>

            {/* Certificate Footer / Signatures */}
            <div className="relative z-10 pt-2 border-t border-slate-200/80 flex items-end justify-between px-4 sm:px-10 text-center">
              {/* Left Signee: Head of Academic Affairs */}
              <div className="flex flex-col items-center">
                <div className="h-10 sm:h-12 flex items-center justify-center">
                  <span className="font-serif italic text-slate-400 text-xs">[ ลายมือชื่ออิเล็กทรอนิกส์ ]</span>
                </div>
                <div className="border-t border-slate-400 w-36 sm:w-44 pt-1">
                  <p className="text-[11px] sm:text-xs font-bold text-slate-800">
                    ( นางสาวธัญญรัศท์ สุภษร )
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">
                    หัวหน้ากลุ่มบริหารวิชาการ
                  </p>
                </div>
              </div>

              {/* Center Seal / Registration Serial */}
              <div className="flex flex-col items-center pb-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center text-amber-600 shadow-xs mb-1">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="font-mono text-[9px] sm:text-[10px] font-bold text-slate-500">
                  {serialNo}
                </span>
                <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> ตรวจสอบผ่านระบบดิจิทัล
                </span>
              </div>

              {/* Right Signee: School Director */}
              <div className="flex flex-col items-center">
                <div className="h-10 sm:h-12 flex items-center justify-center">
                  <span className="font-serif italic text-slate-400 text-xs">[ ลายมือชื่ออิเล็กทรอนิกส์ ]</span>
                </div>
                <div className="border-t border-slate-400 w-36 sm:w-44 pt-1">
                  <p className="text-[11px] sm:text-xs font-bold text-slate-800">
                    ( ผู้อำนวยการสถานศึกษา )
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">
                    ผู้อำนวยการโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-900/90 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              วุฒิบัตรฉบับนี้มีเลขทะเบียนกำกับ สามารถบันทึกเป็น PDF และนำไปแนบเป็นหลักฐานการส่งแผนการสอนในแฟ้ม <strong>ว.PA</strong> หรือรายงาน <strong>SAR</strong> ได้ทันที
            </span>
          </div>
          <div className="text-[11px] text-slate-500 shrink-0">
            {teacherEmail ? `อีเมลครู: ${teacherEmail}` : 'ไม่มีอีเมลในระบบ'}
          </div>
        </div>
      </div>
    </div>
  );
};
