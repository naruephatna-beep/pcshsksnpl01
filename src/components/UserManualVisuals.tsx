import React from 'react';
import {
  Mail,
  Lock,
  CheckCircle2,
  ArrowRight,
  Globe,
  Link2,
  Copy,
  Bell,
  Clock,
  Upload,
  FileText,
  RotateCcw,
  Printer,
  UserCheck,
  ExternalLink,
  Layers,
  BarChart3,
  Trophy,
  BrainCircuit,
  Calendar,
  Building2,
  Workflow,
  ClipboardList,
  ShieldCheck,
  User,
} from 'lucide-react';

export type ManualVisualId =
  | 'auth-01'
  | 'auth-02'
  | 'auth-03'
  | 'auth-04'
  | 'teacher-01'
  | 'teacher-02'
  | 'teacher-03'
  | 'teacher-04'
  | 'teacher-05'
  | 'reviewer-01'
  | 'reviewer-02'
  | 'reviewer-03'
  | 'reviewer-04'
  | 'executive-01'
  | 'executive-02'
  | 'executive-03'
  | 'admin-01'
  | 'admin-02'
  | 'admin-03'
  | 'admin-04';

interface UserManualVisualProps {
  visualId: ManualVisualId;
  caption?: string;
  compact?: boolean;
}

const CalloutBadge: React.FC<{ num: string }> = ({ num }) => (
  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-mono text-[9px] font-bold shrink-0">
    {num}
  </span>
);

const WindowFrame: React.FC<{
  title: string;
  darkHeader?: boolean;
  children: React.ReactNode;
}> = ({ title, darkHeader = true, children }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
    <div
      className={`px-3 py-1.5 flex items-center justify-between gap-2 border-b text-[10px] font-semibold ${
        darkHeader
          ? 'bg-[#0B1329] text-slate-200 border-slate-800'
          : 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      <span className="truncate">{title}</span>
      <span className="flex items-center gap-1 shrink-0 opacity-60" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      </span>
    </div>
    <div className="p-3 bg-white">{children}</div>
  </div>
);

export const UserManualVisual: React.FC<UserManualVisualProps> = ({
  visualId,
  caption,
  compact = false,
}) => {
  const renderScene = () => {
    switch (visualId) {
      case 'auth-01':
        return (
          <WindowFrame title="หน้าเข้าสู่ระบบ · PCSHS Kalasin">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <CalloutBadge num="1" />
                <span>อีเมล หรือ Teacher_ID</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 font-mono text-[10px]">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>te028</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-[10px]">
                <span className="flex items-center gap-1.5 text-emerald-900 font-semibold truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  พบข้อมูล: ครูผู้สอน · กลุ่มสาระฯ
                </span>
                <span className="font-mono text-emerald-800 font-bold">te028</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold pt-0.5">
                <CalloutBadge num="2" />
                <span>รหัสผ่าน (ครั้งแรก: 12345)</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-700 font-mono text-[10px]">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>•••••</span>
              </div>
              <div className="pt-0.5 flex items-center gap-1.5">
                <CalloutBadge num="3" />
                <div className="flex-1 py-1.5 px-3 rounded-lg bg-amber-400 text-slate-950 font-bold text-center text-[11px] flex items-center justify-center gap-1">
                  <span>เข้าสู่ระบบส่งเอกสารวิชาการ</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'auth-02':
        return (
          <WindowFrame title="ตั้งรหัสผ่านใหม่ (เข้าใช้ครั้งแรก)">
            <div className="space-y-2 text-[11px]">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900">
                ตรวจพบการใช้รหัสผ่านเริ่มต้น <strong className="font-mono">12345</strong> กรุณาตั้งรหัสใหม่
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                  <CalloutBadge num="1" />
                  <span>กรอกรหัสผ่านใหม่</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-mono text-[10px] text-slate-600">
                  ••••••••
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                  <CalloutBadge num="2" />
                  <span>ยืนยันรหัสผ่านอีกครั้ง</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-mono text-[10px] text-slate-600">
                  ••••••••
                </div>
              </div>
              <div className="pt-0.5 flex items-center gap-1.5">
                <CalloutBadge num="3" />
                <div className="flex-1 py-1.5 px-3 rounded-lg bg-[#0B1329] text-amber-300 font-bold text-center text-[10px]">
                  บันทึกรหัสผ่านใหม่และเข้าใช้งาน
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'auth-03':
        return (
          <WindowFrame title="ข้อมูลส่วนตัว & ลายเซ็น">
            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-[#0B1329] text-amber-300 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs truncate">ชื่อ-สกุล ครูผู้สอน</div>
                  <div className="text-[10px] text-slate-500">กลุ่มสาระฯ · สาขาวิชา · วิทยฐานะ</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1 font-semibold text-slate-700 mb-0.5">
                    <CalloutBadge num="1" />
                    <span>ข้อมูลสังกัด</span>
                  </div>
                  <div className="text-slate-500">ตรวจสอบกลุ่มสาระ/สาขาให้ตรง</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1 font-semibold text-slate-700 mb-0.5">
                    <CalloutBadge num="2" />
                    <span>ลายเซ็น / รหัส</span>
                  </div>
                  <div className="text-slate-500">แนบลิงก์รูปภาพลายเซ็น</div>
                </div>
              </div>
              <div className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white font-bold text-center text-[10px]">
                บันทึกข้อมูลส่วนตัว
              </div>
            </div>
          </WindowFrame>
        );

      case 'auth-04':
        return (
          <WindowFrame title="Google Drive · ตั้งค่าการแชร์ลิงก์" darkHeader={false}>
            <div className="space-y-2 text-[11px]">
              <div className="text-[10px] font-bold text-slate-700">การเข้าถึงทั่วไป (General access)</div>
              <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/70 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-bold text-emerald-950 text-[11px]">
                        <CalloutBadge num="1" />
                        <span>ทุกคนที่มีลิงก์ (Anyone with the link)</span>
                      </div>
                      <div className="text-[10px] text-emerald-800">ทุกคนบนอินเทอร์เน็ตที่มีลิงก์ดูได้</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-emerald-200/80">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                    <CalloutBadge num="2" />
                    <span>บทบาท: ผู้มีสิทธิ์อ่าน (Viewer)</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-emerald-300 text-emerald-900 font-semibold text-[10px]">
                    <Copy className="w-3 h-3" />
                    คัดลอกลิงก์
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500">
                ห้ามตั้งเป็น "จำกัด (Restricted)" เพราะผู้ตรวจจะเปิดไฟล์ไม่ได้
              </div>
            </div>
          </WindowFrame>
        );

      case 'teacher-01':
        return (
          <WindowFrame title="หน้าหลักครู · แจ้งเตือนภาระงาน">
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 font-bold text-amber-950 text-[10px]">
                      <CalloutBadge num="1" />
                      <span className="truncate">แผนการจัดการเรียนรู้ (เหลืออีก 3 วัน)</span>
                    </div>
                    <div className="text-[10px] text-amber-800">กำหนดส่ง ภาคเรียนที่ 2/2569</div>
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0">
                  ส่งงานนี้
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#0B1329] text-slate-200 flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5">
                  <CalloutBadge num="2" />
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>งานที่ฉันต้องส่ง (Sidebar)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold tabular-nums">
                  รอส่ง 2
                </span>
              </div>
            </div>
          </WindowFrame>
        );

      case 'teacher-02':
        return (
          <WindowFrame title="ส่งเอกสาร / แบบฟอร์มภาระงาน">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                <CalloutBadge num="1" />
                <span>กรอกข้อมูลรายวิชา / หัวข้อตามแบบฟอร์ม</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
                ชื่อรายวิชา / รหัสวิชา / ระดับชั้น...
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                <CalloutBadge num="2" />
                <span>เลือกวิธีแนบงาน (ไฟล์ หรือ ลิงก์ Drive)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-1.5 text-slate-700 font-medium">
                  <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>อัปโหลดจากเครื่อง</span>
                </div>
                <div className="p-2 rounded-lg border border-amber-300 bg-amber-50 flex items-center gap-1.5 text-amber-950 font-semibold">
                  <Link2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>วางลิงก์ Drive</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <CalloutBadge num="3" />
                <div className="flex-1 py-1.5 px-3 rounded-lg bg-amber-400 text-slate-950 font-bold text-center text-[10px]">
                  ยืนยันส่งเอกสารเข้าระบบ
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'teacher-03':
        return (
          <WindowFrame title="เอกสารของฉัน · ติดตามสถานะและด่านตรวจ">
            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-center gap-1 text-[10px]">
                <CalloutBadge num="1" />
                <div className="grid grid-cols-3 gap-1 flex-1">
                  <span className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-center">
                    รอตรวจ
                  </span>
                  <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold text-center">
                    อนุมัติแล้ว
                  </span>
                  <span className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-900 font-semibold text-center">
                    ส่งกลับแก้ไข
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                  <CalloutBadge num="2" />
                  <span>ความคืบหน้าสายงานอนุมัติ</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 font-semibold">
                    ด่าน 1 ✓
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 font-semibold">
                    ด่าน 2 รอตรวจ
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="px-2 py-1 rounded bg-slate-200 text-slate-600">
                    ด่าน 3
                  </span>
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'teacher-04':
        return (
          <WindowFrame title="ขั้นตอนแก้ไขงานเมื่อถูกตีกลับ (ส่งกลับแก้ไข)">
            <div className="space-y-2 text-[11px]">
              <div className="p-2 rounded-lg border border-rose-200 bg-rose-50/70 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-bold text-rose-900">สถานะ: ส่งกลับแก้ไข</span>
                  <span className="text-rose-700 font-medium">อ่านความเห็นผู้ตรวจ</span>
                </div>
                <div className="text-[10px] text-rose-800">
                  "กรุณาปรับแผนหน่วยที่ 2 และแนบลิงก์ฉบับแก้ไข"
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <CalloutBadge num="1" />
                <div className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>กด "ส่งแก้ไขใหม่" บนการ์ดงานเดิม</span>
                </div>
              </div>

              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                  <CalloutBadge num="2" />
                  <span>วางลิงก์ใหม่แทนที่ลิงก์เดิม แล้วกดบันทึก</span>
                </div>
                <div className="px-2 py-1 rounded bg-white border border-slate-300 font-mono text-[10px] text-emerald-800 truncate">
                  https://drive.google.com/file/d/NEW_LINK...
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'teacher-05':
        return (
          <WindowFrame title="ใบยืนยันส่งเอกสาร / เกียรติบัตร">
            <div className="space-y-2 text-[11px]">
              <div className="p-2 rounded-lg bg-[#0B1329] text-white flex items-center justify-between gap-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <CalloutBadge num="1" />
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>พิมพ์เอกสาร / บันทึก PDF</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-white/15 text-slate-200">
                  ปิด / ย้อนกลับ
                </span>
              </div>
              <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-center space-y-1">
                <div className="text-[11px] font-bold text-slate-900">
                  แบบฟอร์มยืนยันการส่งเอกสารวิชาการ (A4)
                </div>
                <div className="text-[10px] text-slate-600">
                  ชื่อครู · รายการเอกสาร · วันที่ส่ง · สถานะอนุมัติ
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'reviewer-01':
        return (
          <WindowFrame title="คิวเอกสารที่รอฉันตรวจ">
            <div className="space-y-2 text-[11px]">
              <div className="p-2 rounded-lg bg-[#0B1329] text-slate-200 flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5">
                  <CalloutBadge num="1" />
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-semibold">เอกสารที่รอฉันตรวจ</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold tabular-nums">
                  3
                </span>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-[10px]">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">แผนการสอน · ครูผู้ส่ง</div>
                  <div className="text-slate-500">ด่าน: หัวหน้ากลุ่มสาขา / สาระ</div>
                </div>
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 text-white font-semibold shrink-0">
                  <CalloutBadge num="2" />
                  <span>ตรวจเอกสาร</span>
                </span>
              </div>
            </div>
          </WindowFrame>
        );

      case 'reviewer-02':
        return (
          <WindowFrame title="หน้าต่างตรวจเอกสาร · เปิดไฟล์แนบ">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                <CalloutBadge num="1" />
                <span>ไฟล์แนบจากผู้ส่ง (แสดงลิงก์ล่าสุดเสมอ)</span>
              </div>
              <div className="p-2 rounded-lg border border-indigo-200 bg-indigo-50/60 flex items-center justify-between gap-2 text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-indigo-950 truncate">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  เอกสารฉบับแก้ไขล่าสุด.pdf
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-indigo-200 text-indigo-800 font-bold shrink-0">
                  <span>เปิดดู</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-600">
                <span className="font-semibold text-slate-800">รายละเอียดจากฟอร์ม:</span> แสดงคำตอบทุกช่องที่ครูกรอกส่งประกอบการตรวจ
              </div>
            </div>
          </WindowFrame>
        );

      case 'reviewer-03':
        return (
          <WindowFrame title="ประเมินผล · คะแนนรูบริก & อนุมัติ">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <CalloutBadge num="1" />
                  <span>ประเมินรูบริก / เกณฑ์คุณภาพ</span>
                </span>
                <span className="font-mono font-bold text-indigo-700 tabular-nums">92/100</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] text-slate-500">
                <span className="font-semibold text-slate-700">ความเห็นถึงครู:</span> ระบุจุดเด่นหรือจุดที่ต้องปรับปรุง...
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <CalloutBadge num="2" />
                <div className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-center">
                  อนุมัติ / ผ่าน
                </div>
                <div className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-center">
                  ส่งกลับแก้ไข
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'reviewer-04':
        return (
          <WindowFrame title="เอกสารทั้งโรงเรียน (สำหรับผู้ได้รับสิทธิ์)">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-[10px]">
                <CalloutBadge num="1" />
                <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>เมนู "เอกสารทั้งโรงเรียน" ใน Sidebar</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600">
                  กรองตามกลุ่มสาระฯ
                </div>
                <div className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600">
                  กรองตามสถานะตรวจ
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'executive-01':
        return (
          <WindowFrame title="แดชบอร์ดภาพรวมผู้บริหาร">
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] tabular-nums">
                <div className="p-2 rounded-lg bg-slate-900 text-white">
                  <div className="text-[9px] text-slate-300">ส่งแล้วทั้งหมด</div>
                  <div className="font-mono font-bold text-amber-300 text-xs">94%</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="text-[9px]">อนุมัติแล้ว</div>
                  <div className="font-mono font-bold text-xs">128</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="text-[9px]">รอตรวจ</div>
                  <div className="font-mono font-bold text-xs">14</div>
                </div>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">ความคืบหน้ารายกลุ่มสาระฯ</span>
                  <span className="text-slate-500">คลิกดูรายคนได้</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full w-4/5 bg-emerald-600 rounded-full" />
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'executive-02':
        return (
          <WindowFrame title="วิเคราะห์ข้อมูลฝ่ายบริหาร (Analytics)">
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold flex flex-col items-center gap-1 text-center">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>ภาพรวม</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 font-semibold flex flex-col items-center gap-1 text-center">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>จัดอันดับสาระ</span>
                </div>
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold flex flex-col items-center gap-1 text-center">
                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Data-Driven</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                สลับมุมมองจากเมนู Sidebar หมวดการติดตาม & สถิติ
              </div>
            </div>
          </WindowFrame>
        );

      case 'executive-03':
        return (
          <WindowFrame title="อนุมัติด่านผู้บริหาร & พิมพ์รายงาน">
            <div className="space-y-2 text-[11px]">
              <div className="p-2 rounded-lg border border-indigo-200 bg-indigo-50/70 flex items-center justify-between gap-2 text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-indigo-950">
                  <CalloutBadge num="1" />
                  <span>เอกสารรอผู้บริหารอนุมัติ</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                  อนุมัติ
                </span>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <CalloutBadge num="2" />
                  <span>ส่งออกรายงานเข้าประชุม</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0B1329] text-amber-300 font-bold">
                  <Printer className="w-3 h-3" />
                  พิมพ์รายงาน
                </span>
              </div>
            </div>
          </WindowFrame>
        );

      case 'admin-01':
        return (
          <WindowFrame title="ตั้งค่าปีการศึกษา & โครงสร้างสาขา">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-amber-950">
                  <CalloutBadge num="1" />
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>ปีการศึกษา & ภาคเรียน</span>
                </span>
                <span className="font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded">
                  2/2569
                </span>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-[10px]">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <CalloutBadge num="2" />
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>โครงสร้าง: กลุ่มสาระ → สาขา → หัวหน้า</span>
                </div>
                <div className="text-slate-500 pl-5">
                  ตั้งค่าหัวหน้าสาขา/สาระ เพื่อใช้ดึงผู้ตรวจอัตโนมัติ
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'admin-02':
        return (
          <WindowFrame title="เพิ่ม / แก้ไขงาน & ฟอร์มแบบ Dynamic">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <CalloutBadge num="1" />
                  <span>กำหนดหัวข้องาน & วันหมดเขตส่ง</span>
                </span>
                <span className="font-mono text-amber-800 font-semibold">DD/MM/YYYY</span>
              </div>
              <div className="p-2 rounded-lg border border-indigo-200 bg-indigo-50/50 space-y-1 text-[10px]">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
                  <CalloutBadge num="2" />
                  <span>ตัวสร้างช่องกรอกข้อมูล (Dynamic Fields)</span>
                </div>
                <div className="flex flex-wrap gap-1 pl-5 text-[9px] text-indigo-900">
                  <span className="px-1.5 py-0.5 rounded bg-white border border-indigo-200">ข้อความ</span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-indigo-200">ตัวเลือก</span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-indigo-200">แนบไฟล์/ลิงก์</span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-indigo-200">ไฟล์ตัวอย่าง</span>
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'admin-03':
        return (
          <WindowFrame title="สายงานอนุมัติหลายด่าน (Workflow)">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                <CalloutBadge num="1" />
                <Workflow className="w-3.5 h-3.5 text-indigo-600" />
                <span>กำหนดลำดับด่านและวิธีกระจายผู้ตรวจ</span>
              </div>
              <div className="flex items-center justify-between gap-1 text-[9px] text-center">
                <div className="flex-1 p-1.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-800">
                  ครูส่งงาน
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <div className="flex-1 p-1.5 rounded bg-amber-50 border border-amber-200 font-semibold text-amber-950">
                  ด่าน 1<br />หน.สาขา
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <div className="flex-1 p-1.5 rounded bg-indigo-50 border border-indigo-200 font-semibold text-indigo-950">
                  ด่าน 2<br />หน.สาระ
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <div className="flex-1 p-1.5 rounded bg-emerald-50 border border-emerald-200 font-semibold text-emerald-950">
                  ด่าน 3<br />อนุมัติ
                </div>
              </div>
            </div>
          </WindowFrame>
        );

      case 'admin-04':
        return (
          <WindowFrame title="ติดตามงานรายบุคคล & ภาระงานผู้ตรวจ">
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>ติดตามรายบุคคล</span>
                  </div>
                  <div className="font-mono text-[9px] text-slate-600 tabular-nums">
                    แผน: ✓ · วิจัย: ✗
                  </div>
                </div>
                <div className="p-2 rounded-lg border border-emerald-200 bg-emerald-50/70 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-emerald-950">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ภาระงานผู้ตรวจ</span>
                  </div>
                  <div className="font-mono text-[9px] text-emerald-800 tabular-nums">
                    ตรวจแล้ว 12 · ค้าง 3
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>สิทธิ์เอกสาร · Drive · บุคลากร</span>
                </span>
                <span className="font-mono text-[9px] text-slate-500">⌘K ค้นหาด่วน</span>
              </div>
            </div>
          </WindowFrame>
        );
    }
  };

  return (
    <figure className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {renderScene()}
      {caption && (
        <figcaption className="text-[11px] text-slate-500 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
