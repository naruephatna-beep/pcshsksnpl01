import React, { useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PdfPermissionNoticeProps {
  url?: string;
  isConfirmed?: boolean;
  onConfirmChange?: (confirmed: boolean) => void;
  required?: boolean;
  compact?: boolean;
  showStepByStep?: boolean;
}

export const PdfPermissionNotice: React.FC<PdfPermissionNoticeProps> = ({
  url = '',
  isConfirmed = false,
  onConfirmChange,
  required = true,
  compact = false,
  showStepByStep = true,
}) => {
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);
  const trimmedUrl = url.trim();

  const isGoogleDrive = /drive\.google\.com|docs\.google\.com/i.test(trimmedUrl);
  const isGoogleDriveFolder = isGoogleDrive && /\/folders\/|\/drive\/folders\//i.test(trimmedUrl);
  const isOneDrive = /onedrive|1drv\.ms|sharepoint\.com/i.test(trimmedUrl);
  const isDropbox = /dropbox\.com/i.test(trimmedUrl);

  const handleTestOpen = () => {
    if (!trimmedUrl) return;
    let urlToOpen = trimmedUrl;
    if (!/^https?:\/\//i.test(urlToOpen)) {
      urlToOpen = 'https://' + urlToOpen;
    }
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-2 mt-2">
      {/* Alert if link is a folder instead of file */}
      {isGoogleDriveFolder && (
        <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">⚠️ ตรวจพบว่าลิงก์นี้เป็น &ldquo;โฟลเดอร์&rdquo; ไม่ใช่ไฟล์เอกสาร PDF!</p>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              กรุณาเข้าไปในโฟลเดอร์ คลิกขวาที่ <strong>ไฟล์เอกสาร PDF โดยตรง</strong> แล้วเลือก &ldquo;แชร์&rdquo; เพื่อคัดลอกลิงก์ไฟล์เฉพาะเล่มนั้น
            </p>
          </div>
        </div>
      )}

      {/* Permission Verification Banner */}
      <div
        className={`rounded-xl border transition-all ${
          isConfirmed
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs'
            : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs'
        } ${compact ? 'p-2.5 text-xs' : 'p-3.5 text-xs'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {isConfirmed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 font-bold">
                <span>ตรวจสอบสิทธิ์ไฟล์ PDF:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                    isConfirmed
                      ? 'bg-emerald-200/80 text-emerald-900'
                      : 'bg-amber-200/90 text-amber-900'
                  }`}
                >
                  ต้องตั้งค่าเป็น &ldquo;ทุกคนที่มีลิงก์&rdquo; (Anyone with the link)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {isGoogleDrive ? (
                  <span>
                    กรุณาตั้งค่าแชร์ใน Google Drive ให้เป็น <strong>&ldquo;ทุกคนที่มีลิงก์มีสิทธิ์ดู&rdquo; (Viewer)</strong> เพื่อให้ฝ่ายวิชาการและผู้บริหารสามารถเปิดตรวจได้ทันทีโดยไม่ต้องร้องขอสิทธิ์
                  </span>
                ) : isOneDrive || isDropbox ? (
                  <span>
                    กรุณาตั้งค่าสิทธิ์แชร์ไฟล์ให้เป็น <strong>&ldquo;ทุกคนที่มีลิงก์สามารถดูได้&rdquo;</strong> โดยไม่ต้องขอสิทธิ์
                  </span>
                ) : (
                  <span>
                    หากใช้ Google Drive / Cloud กรุณาตั้งค่าสิทธิ์แชร์ให้เป็น <strong>&ldquo;ทุกคนที่มีลิงก์มีสิทธิ์ดู&rdquo; (Anyone with the link)</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          {showStepByStep && (
            <button
              type="button"
              onClick={() => setIsGuideExpanded(!isGuideExpanded)}
              className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white/80 hover:bg-white border border-indigo-200/80 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">วิธีตั้งค่า</span>
              {isGuideExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Collapsible Step-by-Step Visual Illustrated Guide (Item 5) */}
        {showStepByStep && isGuideExpanded && (
          <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-3 bg-white/95 p-3.5 rounded-xl border border-amber-200/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>💡 วิธีตั้งค่าแชร์ Google Drive เป็น &ldquo;ทุกคนที่มีลิงก์&rdquo; ใน 3 ขั้นตอน:</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                ทำตามนี้ 10 วินาทีเสร็จ
              </span>
            </div>

            {/* Visual 3-Step Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              {/* Step 1 */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    1
                  </span>
                  <span className="font-bold text-slate-800 text-[11px]">คลิกขวาที่ไฟล์ PDF</span>
                </div>
                <div className="text-[11px] text-slate-600 leading-relaxed bg-white p-2 rounded-lg border border-slate-100">
                  ใน Google Drive กดที่จุดสามจุด <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">⋮</code> หรือคลิกขวา ➜ เลือกเมนู <strong>&ldquo;แชร์&rdquo; (Share)</strong>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    2
                  </span>
                  <span className="font-bold text-indigo-950 text-[11px]">เปลี่ยนการเข้าถึงทั่วไป</span>
                </div>
                <div className="text-[11px] text-slate-700 leading-relaxed bg-white p-2 rounded-lg border border-indigo-100 space-y-1">
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="line-through text-rose-500 font-bold">🔒 จำกัด</span>
                    <span>➔</span>
                    <span className="bg-emerald-100 text-emerald-900 font-black px-1.5 py-0.2 rounded">🌐 ทุกคนที่มีลิงก์</span>
                  </div>
                  <p className="text-[10px] text-slate-500">บทบาทขวามือ: <strong>ผู้มีสิทธิ์อ่าน (Viewer)</strong></p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    3
                  </span>
                  <span className="font-bold text-emerald-950 text-[11px]">คัดลอกลิงก์มาวาง</span>
                </div>
                <div className="text-[11px] text-emerald-900 leading-relaxed bg-white p-2 rounded-lg border border-emerald-100">
                  กดปุ่ม <strong>&ldquo;คัดลอกลิงก์&rdquo; (Copy link)</strong> ด้านล่างซ้าย แล้วนำมาวางในช่องส่งนี้ได้เลย!
                </div>
              </div>
            </div>

            {/* Test Link Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-600">
                <span>💡 ทดสอบ: ลองเปิดในหน้าต่างไม่ระบุตัวตน (Incognito) หากเปิดอ่านได้เลยแปลว่าสิทธิ์ถูกต้อง 100%</span>
              </span>
              {trimmedUrl && (
                <button
                  type="button"
                  onClick={handleTestOpen}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ทดสอบเปิดดูลิงก์</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Checkbox */}
        {onConfirmChange && (
          <div className="mt-2.5 pt-2 border-t border-slate-200/60">
            <label className="flex items-start sm:items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => onConfirmChange(e.target.checked)}
                className="mt-0.5 sm:mt-0 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
              />
              <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 leading-tight">
                ข้าพเจ้าได้ตรวจสอบและตั้งค่าสิทธิ์ไฟล์ PDF เป็น &ldquo;ทุกคนที่มีลิงก์มีสิทธิ์ดู&rdquo; (Anyone with the link) เรียบร้อยแล้ว
                {required && <span className="text-rose-500 ml-1 font-black">*</span>}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
