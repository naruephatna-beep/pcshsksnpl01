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

        {/* Collapsible Step-by-Step Guide */}
        {showStepByStep && isGuideExpanded && (
          <div className="mt-3 pt-3 border-t border-amber-200/70 text-[11px] space-y-2 bg-white/70 p-3 rounded-lg">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>3 ขั้นตอนการตั้งค่าสิทธิ์ใน Google Drive ก่อนส่ง:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 font-medium pl-1">
              <li>
                เปิด Google Drive ➜ คลิกขวาที่ไฟล์ PDF ➜ เลือกเมนู <strong>&ldquo;แชร์&rdquo; (Share)</strong>
              </li>
              <li>
                ในหัวข้อ <strong>&ldquo;การเข้าถึงทั่วไป&rdquo; (General access)</strong> ให้เปลี่ยนจาก <em>&ldquo;จำกัด (Restricted)&rdquo;</em> เป็น <strong className="text-emerald-700 underline">&ldquo;ทุกคนที่มีลิงก์&rdquo; (Anyone with the link)</strong>
              </li>
              <li>
                ตรวจสอบบทบาทด้านขวาให้เป็น <strong>&ldquo;ผู้มีสิทธิ์อ่าน&rdquo; (Viewer)</strong> แล้วกด <strong>&ldquo;คัดลอกลิงก์&rdquo; (Copy link)</strong> นำมาวางที่นี่
              </li>
            </ol>
            <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
              <span className="italic">💡 ทริค: ทดสอบเปิดในหน้าต่างไม่ระบุตัวตน (Incognito) หากเปิดอ่านได้เลย แปลว่าสิทธิ์ถูกต้อง 100%</span>
              {trimmedUrl && (
                <button
                  type="button"
                  onClick={handleTestOpen}
                  className="font-bold text-indigo-700 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>ลองเปิดดู</span>
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
