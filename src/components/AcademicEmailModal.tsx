import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import {
  sendAcademicEmailOneClick,
  openGmailComposeTab,
  ACADEMIC_SENDER_EMAIL,
  ACADEMIC_SENDER_NAME,
} from '../services/emailService';
import {
  X,
  Mail,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Edit3,
  School,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface AcademicEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: {
    email: string;
    name?: string;
    teacherId?: string;
  };
  defaultSubject?: string;
  defaultHtml?: string;
  defaultPlainText?: string;
  categoryTitle?: string;
  onSentSuccess?: () => void;
}

export const AcademicEmailModal: React.FC<AcademicEmailModalProps> = ({
  isOpen,
  onClose,
  defaultRecipient,
  defaultSubject = '',
  defaultHtml = '',
  defaultPlainText = '',
  categoryTitle = 'ส่งอีเมลจากฝ่ายวิชาการ (1 คลิก)',
  onSentSuccess,
}) => {
  const [toEmail, setToEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    sentAt?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setToEmail(defaultRecipient?.email || '');
      setRecipientName(defaultRecipient?.name || '');
      setSubject(defaultSubject || `[ฝ่ายวิชาการ จภ.กาฬสินธุ์] แจ้งข่าวสารงานวิชาการ`);
      setMessage(defaultPlainText || '');
      setHtmlPreview(defaultHtml || '');
      setResult(null);
      setActiveTab(defaultHtml ? 'preview' : 'edit');
    }
  }, [isOpen, defaultRecipient, defaultSubject, defaultHtml, defaultPlainText]);

  if (!isOpen) return null;

  // Handle 1-Click Send via Google Apps Script Web App
  const handleSendOneClick = async () => {
    if (!toEmail.trim() || !toEmail.includes('@')) {
      setResult({
        success: false,
        message: 'กรุณาระบุอีเมลผู้รับที่ถูกต้อง',
      });
      return;
    }

    if (!subject.trim()) {
      setResult({
        success: false,
        message: 'กรุณาระบุหัวข้ออีเมล',
      });
      return;
    }

    setIsSending(true);
    setResult(null);

    // Prepare effective HTML
    const finalHtml = htmlPreview.trim()
      ? htmlPreview
      : `<!DOCTYPE html><html><body><div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${message.replace(/\n/g, '<br/>')}</div></body></html>`;

    try {
      const res = await sendAcademicEmailOneClick({
        to: toEmail.trim(),
        subject: subject.trim(),
        htmlBody: finalHtml,
        body: message || 'โปรดเปิดอ่านเนื้อหาในรูปแบบ HTML',
        senderName: ACADEMIC_SENDER_NAME,
      });

      if (res.success) {
        setResult({
          success: true,
          message: res.message || `ส่งอีเมลไปยัง ${toEmail} สำเร็จเรียบร้อยแล้ว!`,
          sentAt: res.sentAt,
        });

        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }

        if (onSentSuccess) {
          onSentSuccess();
        }

        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setResult({
          success: false,
          message: `ไม่สามารถส่งผ่าน Web App ได้: ${res.error || 'โปรดตรวจสอบการตั้งค่า'} (ท่านสามารถคลิกส่งผ่าน Gmail ด้านล่างแทนได้)`,
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `ข้อผิดพลาด: ${err?.message || 'ไม่สามารถส่งอีเมลได้'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle Open in Gmail Compose tab
  const handleOpenInGmail = () => {
    openGmailComposeTab({
      to: toEmail.trim(),
      subject: subject.trim(),
      body: message || subject,
      authUser: ACADEMIC_SENDER_EMAIL,
    });
  };

  // Copy plain text content
  const handleCopyText = () => {
    navigator.clipboard.writeText(message || subject);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B1329] via-[#162347] to-[#1E293B] p-5 sm:p-6 text-white shrink-0 border-b-3 border-[#F59E0B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <Mail className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-300 block">
                  1-Click Academic Email System
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {categoryTitle}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 flex-wrap">
            <span className="text-amber-300 font-semibold">ผู้ส่ง:</span>
            <span className="text-white font-medium">{ACADEMIC_SENDER_NAME}</span>
            <span className="text-slate-400 font-mono text-[11px]">({ACADEMIC_SENDER_EMAIL})</span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-2 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-[#F59E0B] text-slate-950 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>ตัวอย่างอีเมล (Preview)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'border-[#F59E0B] text-slate-950 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>แก้ไขข้อความ / ผู้รับ</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Recipient and Subject Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ส่งถึง (อีเมลผู้รับ):
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="teacher@pcshsksn.ac.th"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-[#F59E0B] focus:border-amber-500"
                />
              </div>
              {recipientName && (
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  คุณครู: {recipientName}
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                หัวข้ออีเมล (Subject):
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ระบุหัวข้ออีเมล..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-[#F59E0B] focus:border-amber-500"
              />
            </div>
          </div>

          {/* Tab 1: Preview HTML */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">ตัวอย่างหน้าตาอีเมลจริงที่จะถูกส่ง:</span>
                <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  สไตล์ทางการ จภ.กาฬสินธุ์
                </span>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 max-h-72 overflow-y-auto p-1 shadow-inner">
                {htmlPreview ? (
                  <iframe
                    title="Email Preview"
                    srcDoc={htmlPreview}
                    className="w-full h-64 border-0 rounded-xl bg-white"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="p-4 bg-white rounded-xl text-slate-700 whitespace-pre-wrap text-xs leading-relaxed">
                    {message || 'ยังไม่มีข้อความ'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Edit Plain Text */}
          {activeTab === 'edit' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                ข้อความในอีเมล (Plain text / เนื้อความ):
              </label>
              <textarea
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="พิมพ์ข้อความที่ต้องการแจ้งเตือนคุณครู..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-sans focus:ring-2 focus:ring-[#F59E0B] focus:border-amber-500"
              />
            </div>
          )}

          {/* Result Alert Box */}
          {result && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                result.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <p className="font-bold">{result.message}</p>
                {result.sentAt && (
                  <p className="text-[10px] text-emerald-700 opacity-80">
                    เวลาที่ส่ง: {new Date(result.sentAt).toLocaleTimeString('th-TH')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="คัดลอกข้อความอีเมล"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInGmail}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="เปิดเขียนใน Gmail ด้วยบัญชีวิชาการ"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">เปิดส่งใน Gmail</span>
              <span className="sm:hidden">Gmail</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              ปิด
            </button>

            <button
              type="button"
              onClick={handleSendOneClick}
              disabled={isSending || !toEmail.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0B1329] via-[#162347] to-[#1E293B] hover:from-slate-900 hover:to-indigo-950 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition-all cursor-pointer border border-[#F59E0B] disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>กำลังส่งเมลวิชาการ...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#F59E0B]" />
                  <span>ส่งอีเมลทันที (1 คลิก)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
