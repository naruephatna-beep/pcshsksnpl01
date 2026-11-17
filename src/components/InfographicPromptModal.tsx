import React, { useState, useMemo, useEffect } from 'react';
import {
  InfographicPromptPayload,
  generateEnglishInfographicPrompt,
  generateThaiInfographicPrompt,
} from '../utils/aiInfographicPrompt';
import { X, Sparkles, Copy, Check, RotateCcw, Wand2 } from 'lucide-react';

interface InfographicPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: InfographicPromptPayload;
}

export const InfographicPromptModal: React.FC<InfographicPromptModalProps> = ({
  isOpen,
  onClose,
  payload,
}) => {
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [aspectRatio, setAspectRatio] = useState<'4:5' | '9:16' | '16:9' | '1:1'>(
    payload.aspectRatio || '4:5'
  );
  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomText(null);
      setCopied(false);
    }
  }, [isOpen]);

  const generatedText = useMemo(() => {
    const merged: InfographicPromptPayload = {
      ...payload,
      aspectRatio,
    };
    return lang === 'th'
      ? generateThaiInfographicPrompt(merged)
      : generateEnglishInfographicPrompt(merged);
  }, [payload, lang, aspectRatio]);

  const activeText = customText !== null ? customText : generatedText;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = activeText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#0B1329] text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                AI Infographic Prompt สำหรับสรุปภาพรวม 8 กลุ่มสาระ
              </h3>
              <p className="text-xs text-slate-300 truncate">
                สร้างคำพรอมพ์จากสถิติการส่งเอกสารจริงเพื่อนำไปสร้างโปสเตอร์อินโฟกราฟิก
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/60">
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 mr-1">ภาษาคำพรอมพ์:</span>
              <button
                type="button"
                onClick={() => {
                  setLang('th');
                  setCustomText(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  lang === 'th'
                    ? 'bg-[#0B1329] text-amber-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ภาษาไทย (ChatGPT / Gemini)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLang('en');
                  setCustomText(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#0B1329] text-amber-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                English (Midjourney / Canva)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">สัดส่วน:</span>
              <select
                value={aspectRatio}
                onChange={(e) => {
                  setAspectRatio(e.target.value as '4:5' | '9:16' | '16:9' | '1:1');
                  setCustomText(null);
                }}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="4:5">4:5 (โปสเตอร์)</option>
                <option value="9:16">9:16 (แนวตั้ง LINE)</option>
                <option value="16:9">16:9 (แนวนอนสไลด์)</option>
                <option value="1:1">1:1 (สี่เหลี่ยมจัตุรัส)</option>
              </select>
              {customText !== null && (
                <button
                  type="button"
                  onClick={() => setCustomText(null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>รีเซ็ต</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <textarea
              value={activeText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={15}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white resize-y"
            />
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>คัดลอกข้อความด้านบนไปวางใน AI สร้างภาพเพื่อสร้างโปสเตอร์รายงานผลได้ทันที</span>
            </p>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0B1329] hover:bg-slate-900 text-amber-400'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>คัดลอกคำพรอมพ์แล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>คัดลอกคำพรอมพ์</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
