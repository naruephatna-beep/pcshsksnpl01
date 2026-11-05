import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Save,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Link as LinkIcon,
  HardDrive,
  FileText,
  ShieldCheck,
  Mail,
  Send,
  Zap,
} from 'lucide-react';
import {
  getSavedGoogleDriveWebhookUrl,
  saveGoogleDriveWebhookUrl,
  testGoogleDriveConnection,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  DEFAULT_GDRIVE_WEBHOOK_URL,
} from '../services/googleDriveService';
import {
  sendAcademicEmailOneClick,
  ACADEMIC_SENDER_EMAIL,
  ACADEMIC_SENDER_NAME,
} from '../services/emailService';

interface GoogleDriveConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (url: string) => void;
}

export const GoogleDriveConfigModal: React.FC<GoogleDriveConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'guide' | 'code'>('settings');

  // Test Email States
  const [testEmailAddress, setTestEmailAddress] = useState('naruephat.n@kkumail.com');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
    sentAt?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getSavedGoogleDriveWebhookUrl());
      setTestResult(null);
      setEmailTestResult(null);
    }
  }, [isOpen]);

  const handleTestEmail = async () => {
    const to = testEmailAddress.trim();
    if (!to || !to.includes('@')) {
      setEmailTestResult({
        success: false,
        message: 'กรุณาระบุที่อยู่อีเมลที่ถูกต้องสำหรับการทดสอบ',
      });
      return;
    }
    setIsTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res = await sendAcademicEmailOneClick({
        to,
        subject: `[ทดสอบระบบ] การส่งอีเมลอัตโนมัติจากฝ่ายวิชาการ PCSHS KSN (${new Date().toLocaleTimeString('th-TH')})`,
        htmlBody: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #0B1329 0%, #1E293B 100%); padding: 18px 24px; border-radius: 12px; margin-bottom: 20px;">
              <h2 style="color: #F59E0B; margin: 0; font-size: 18px;">โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</h2>
              <p style="color: #e2e8f0; margin: 4px 0 0 0; font-size: 13px;">กลุ่มบริหารวิชาการ - ระบบส่งและติดตามเอกสารวิชาการ</p>
            </div>
            <p style="font-size: 15px; color: #1e293b; font-weight: bold;">เรียน คุณครู / ผู้ทดสอบระบบ</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
              นี่คืออีเมลทดสอบการเชื่อมต่อระบบ <strong>1-Click Academic Email</strong> ส่งผ่าน Google Apps Script ของฝ่ายวิชาการ (${ACADEMIC_SENDER_EMAIL})
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 14px 18px; border-radius: 10px; margin: 16px 0; color: #166534; font-size: 13px;">
              ✓ ระบบทำงานได้อย่างสมบูรณ์แบบ ส่งตรงจากบัญชีวิชาการโรงเรียนในคลิกเดียวโดยไม่ต้องเปิดแท็บหรือหน้าต่างอื่น
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              ส่งเมื่อ: ${new Date().toLocaleString('th-TH')} • ฝ่ายบริหารวิชาการ จ.ภ. กาฬสินธุ์
            </p>
          </div>
        `,
        senderName: ACADEMIC_SENDER_NAME,
      });

      if (res.success) {
        setEmailTestResult({
          success: true,
          message: `✓ ${res.message || 'ส่งอีเมลสำเร็จ!'} (หากยังไม่พบในกล่องข้อความหลัก โปรดตรวจสอบในโฟลเดอร์ Junk/Spam)`,
          sentAt: res.sentAt,
        });
      } else {
        setEmailTestResult({
          success: false,
          message: res.error || 'ไม่สามารถส่งอีเมลได้',
        });
      }
    } catch (err: any) {
      setEmailTestResult({
        success: false,
        message: err?.message || 'เกิดข้อผิดพลาดในการทดสอบส่งอีเมล',
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({
        success: false,
        message: 'กรุณากรอก URL ของ Google Apps Script Web App ก่อนทดสอบ',
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleDriveConnection(webhookUrl);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `ข้อผิดพลาด: ${err?.message || 'ไม่สามารถทดสอบได้'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveGoogleDriveWebhookUrl(webhookUrl);
      if (onSaved) onSaved(webhookUrl);
      setTestResult({
        success: true,
        message: 'บันทึกการตั้งค่า Google Drive เชื่อมต่อกับระบบเรียบร้อยแล้ว!',
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `บันทึกไม่สำเร็จ: ${e?.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isConnected = !!getSavedGoogleDriveWebhookUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <Cloud className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                  Google Drive Auto-Uploader
                </span>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    พร้อมใช้งาน
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                    ยังไม่ได้เชื่อมต่อ
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                ตั้งค่าระบบบันทึก PDF เข้า Google Drive อัตโนมัติ
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>ตั้งค่า URL เชื่อมต่อ</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>ขั้นตอนทำทีละสเต็ป (4 ขั้นตอน)</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>โค้ดสคริปต์ Google Apps Script</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 flex-1">
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Feature highlight */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 space-y-1">
                  <p className="font-bold text-sm text-emerald-900">
                    ระบบสร้างลิงก์อัตโนมัติ (Zero-Storage Database Architecture)
                  </p>
                  <p className="leading-relaxed text-emerald-800">
                    เมื่อเชื่อมต่อแล้ว ครูสามารถเลือกไฟล์ PDF จากเครื่องเพื่อส่งงานได้ทันที ระบบจะนำไฟล์เข้าสู่
                    Google Drive กลางของโรงเรียน และสร้างลิงก์สำหรับดูเอกสารมาบันทึกลงในฐานข้อมูลอัตโนมัติ
                    ช่วยประหยัดพื้นที่ฐานข้อมูล 100%
                  </p>
                  <p className="text-[11px] text-emerald-900 font-semibold pt-1 border-t border-emerald-200/80 flex items-center gap-1.5">
                    <span>📁</span>
                    <span>ระบบแยกไฟล์ตาม <strong>"โฟลเดอร์ประเภทงาน"</strong> ให้อัตโนมัติ (และจะสร้างโฟลเดอร์ใหม่ให้อัตโนมัติทันทีเมื่อแอดมินเปิดรับงานประเภทใหม่)</span>
                  </p>
                  <p className="text-[11px] text-emerald-900 font-semibold flex items-center gap-1.5">
                    <span>🗑️</span>
                    <span>รองรับการย้ายไฟล์ลง <strong>"ถังขยะ Google Drive (Trash)"</strong> ให้อัตโนมัติเมื่อมีการกดยกเลิก/ลบงาน (กู้คืนได้ภายใน 30 วัน)</span>
                  </p>
                  <p className="text-[11px] text-emerald-900 font-semibold flex items-center gap-1.5">
                    <span>✉️</span>
                    <span>ระบบส่งอีเมล <strong>"1 คลิกจากเมลฝ่ายวิชาการ"</strong> (แจ้งผลการตรวจ, แจ้งเตือนส่งงาน, ส่งสำเนาใบเสร็จ) ผ่านบัญชีวิชาการทันที</span>
                  </p>
                  <p className="text-[11px] text-emerald-900 font-semibold flex items-center gap-1.5">
                    <span>📑</span>
                    <span>ระบบสำเนาไฟล์ที่ตรวจแล้วเข้าโฟลเดอร์ <strong>"ตรวจแล้ว/ประเภทเอกสาร_สาขาวิชา"</strong> อัตโนมัติ (ดึงและดาวน์โหลดไฟล์ PDF จริงจากลิงก์มาเก็บเป็นสำเนา)</span>
                  </p>
                </div>
              </div>

              {/* Webhook Input Field */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>URL ของ Google Apps Script Web App (Webhook URL)</span>
                    {webhookUrl.trim() === DEFAULT_GDRIVE_WEBHOOK_URL && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        URL ประจำโรงเรียน จภ.กาฬสินธุ์
                      </span>
                    )}
                  </label>
                  {webhookUrl.trim() !== DEFAULT_GDRIVE_WEBHOOK_URL && (
                    <button
                      type="button"
                      onClick={() => setWebhookUrl(DEFAULT_GDRIVE_WEBHOOK_URL)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>คืนค่าเป็น URL ของโรงเรียน</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm font-mono text-slate-900 shadow-2xs placeholder:text-slate-400"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>* เชื่อมต่อถาวรกับทุกเครื่องและทุกอุปกรณ์อัตโนมัติ</span>
                  <span className="text-[10px] font-mono text-slate-400">PCSHS KSN Google Apps Script</span>
                </div>
              </div>

              {/* Action Buttons: Test & Save */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !webhookUrl.trim()}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
                  <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเชื่อมต่อ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('guide')}
                  className="ml-auto text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>ดูขั้นตอนวิธีทำทีละขั้น</span>
                </button>
              </div>

              {/* Test Result Feedback Box */}
              {testResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">{testResult.message}</p>
                    {testResult.details && (
                      <p className="font-mono text-[11px] opacity-80 break-all">
                        {typeof testResult.details === 'string'
                          ? testResult.details
                          : JSON.stringify(testResult.details)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 1-Click Academic Email Live Test Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white border border-amber-400/40 space-y-3 mt-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white">ทดสอบการส่งอีเมลฝ่ายวิชาการ (1-Click Google Apps Script)</h4>
                      <p className="text-[11px] text-slate-300">ส่งตรงจาก {ACADEMIC_SENDER_EMAIL} ผ่าน Google Apps Script ในคลิกเดียว</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="ระบุอีเมลผู้รับเพื่อทดสอบ..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={isTestingEmail || !testEmailAddress.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isTestingEmail ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                    )}
                    <span>{isTestingEmail ? 'กำลังส่งเมล...' : '⚡ กดทดสอบส่งทันที'}</span>
                  </button>
                </div>

                {emailTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                      emailTestResult.success
                        ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-200'
                        : 'bg-rose-950/80 border border-rose-500/60 text-rose-200'
                    }`}
                  >
                    {emailTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="font-semibold">{emailTestResult.message}</p>
                      {emailTestResult.sentAt && (
                        <p className="text-[10px] text-emerald-400 opacity-80">
                          ส่งเมื่อ: {new Date(emailTestResult.sentAt).toLocaleTimeString('th-TH')} น.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                คู่มือการติดตั้ง Google Apps Script เชื่อมต่อกับระบบ (4 ขั้นตอน)
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      สร้างโฟลเดอร์ใน Google Drive ของฝ่ายวิชาการ
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      เข้าไปที่ Google Drive ของฝ่ายวิชาการ แล้วสร้างโฟลเดอร์ใหม่ เช่น 
                      <span className="font-bold text-slate-800"> "คลังแผนการสอน_รร.จุฬาภรณฯ"</span> จากนั้นคัดลอก 
                      <strong className="text-emerald-700"> Folder ID</strong> จาก URL บนแถบที่อยู่เว็บ
                    </p>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-600">
                      https://drive.google.com/drive/folders/<span className="bg-amber-100 text-amber-900 font-bold px-1 rounded">1AbCdEfGhIjKlMnOpQrStUvWxYz</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      คัดลอกโค้ดสคริปต์ไปวางที่ Google Apps Script
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      เปิดเว็บ <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">script.google.com <ExternalLink className="w-3 h-3 inline" /></a> ด้วยบัญชีฝ่ายวิชาการ กด <strong>+ โครงการใหม่ (New Project)</strong> แล้วนำโค้ดจากแท็บ "โค้ดสคริปต์" ไปวางแทนที่โค้ดเดิมทั้งหมด
                    </p>
                    <button
                      onClick={handleCopyCode}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ดสคริปต์ตอนนี้'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      ใส่ Folder ID ในโค้ด และสั่ง "ทำให้ใช้งานได้" (Deploy as Web App)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      แก้ไขบรรทัด <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">var TARGET_FOLDER_ID = "ใส่ ID ที่ได้จากข้อ 1";</code> แล้วกดปุ่มสีน้ำเงิน <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้รายการใหม่ (New deployment)</strong>
                    </p>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <p className="font-bold">⚠️ จุดสำคัญที่สุดในการตั้งค่า:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                        <li>ปฏิบัติการในฐานะ (Execute as): <strong>ฉัน (Me)</strong></li>
                        <li>ผู้ที่มีสิทธิ์เข้าถึง (Who has access): <strong>ทุกคน (Anyone)</strong> (เพื่อให้ครูสามารถส่งไฟล์ขึ้น Drive กลางได้โดยไม่ต้องยืนยันสิทธิ์ซ้ำซ้อน)</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                      <p className="font-bold">💡 สำหรับผู้ที่เคยติดตั้งสคริปต์ไว้แล้ว (ต้องการเปิดใช้ระบบส่งเมล 1-Click / ย้ายลงถังขยะ):</p>
                      <p className="text-[11.5px] text-blue-800 leading-relaxed">
                        หลังจากนำโค้ดใหม่ไปวางทับใน <code>Code.gs</code> แล้ว ให้กด <strong>"ทำให้ใช้งานได้" (Deploy)</strong> &rarr; <strong>"จัดการการทำให้ใช้งานได้" (Manage deployments)</strong> &rarr; กดรูปดินสอแก้ไข &rarr; ตรงช่องเวอร์ชันเลือก <strong>"เวอร์ชันใหม่" (New version)</strong> &rarr; กด <strong>"ทำให้ใช้งานได้" (Deploy)</strong> เพื่อให้ URL เดิมรันระบบส่งอีเมลตัวใหม่ทันที
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      คัดลอก "URL ของเว็บแอป" มาวางในระบบ
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      คัดลอก Web App URL ที่ได้ (ลงท้ายด้วย <code className="bg-slate-200 px-1 rounded font-mono">/exec</code>) นำมาวางในช่อง URL ในแท็บ "ตั้งค่า URL เชื่อมต่อ" แล้วกด <strong>บันทึกการเชื่อมต่อ</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    โค้ดสำหรับ Google Apps Script (Code.gs)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    คัดลอกโค้ดทั้งหมดนี้ไปวางใน Google Apps Script ได้เลย
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                  <span>{copiedCode ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกโค้ด'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed border border-slate-800 shadow-inner">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>เชื่อมต่อผ่าน HTTPS และ Google Drive API อย่างปลอดภัย</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
