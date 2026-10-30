import React, { useState, useMemo } from 'react';
import {
  InfographicPromptPayload,
  generateEnglishInfographicPrompt,
  generateThaiInfographicPrompt,
} from '../utils/aiInfographicPrompt';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  X,
  Layers,
  FileText,
  School,
  ExternalLink,
  Info,
} from 'lucide-react';

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
  const [activeLang, setActiveLang] = useState<'en' | 'th'>('en');
  const [aspectRatio, setAspectRatio] = useState<'4:5' | '9:16' | '16:9'>('4:5');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Compute active prompt with current ratio
  const activePrompt = useMemo(() => {
    const fullPayload: InfographicPromptPayload = {
      ...payload,
      aspectRatio,
    };
    return activeLang === 'en'
      ? generateEnglishInfographicPrompt(fullPayload)
      : generateThaiInfographicPrompt(fullPayload);
  }, [payload, activeLang, aspectRatio]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(activePrompt);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = activePrompt;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy prompt: ', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([activePrompt], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `AI_Infographic_Prompt_${activeLang.toUpperCase()}_PCSHS_Kalasin.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <img
                src="/assets/aistudio/PCSHS_Kalasin.__th__6ef5abd0.png"
                alt="ตราสัญลักษณ์โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  AI Infographic Prompt
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                  ✓ สวยงาม ทันสมัย ไม่มีลายเซ็น
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                Prompt อินโฟกราฟิกสถิติส่งงาน 8 กลุ่มสาระ
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Toolbar: Language Tabs + Aspect Ratio */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveLang('en')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLang === 'en'
                  ? 'bg-white text-indigo-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇬🇧 ภาษาอังกฤษ (สำหรับ Midjourney / DALL-E)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLang('th')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLang === 'th'
                  ? 'bg-white text-indigo-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇹🇭 ภาษาไทย (สำหรับ ChatGPT / Gemini)</span>
            </button>
          </div>

          {/* Ratio Selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">สัดส่วนภาพ:</span>
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setAspectRatio('4:5')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  aspectRatio === '4:5'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="แนวตั้ง เหมาะสำหรับโปสเตอร์ / สื่อสิ่งพิมพ์"
              >
                4:5 (โปสเตอร์)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="แนวนอน เหมาะสำหรับสไลด์นำเสนอ"
              >
                16:9 (สไลด์)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="แนวตั้งยาว เหมาะสำหรับ Story / มือถือ"
              >
                9:16 (มือถือ)
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Real-data validation badge */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-2.5 text-indigo-950">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">ดึงข้อมูลจริงจากระบบการส่งเอกสารเรียบร้อยแล้ว</p>
              <p className="text-slate-600 text-[11px]">
                สถิตินี้คำนวณจากครูทั้งหมด {payload.totalTeachers} ท่าน, ส่งแล้ว {payload.totalSubmittedTeachers} ท่าน ({payload.overallSubmissionRate}%), ตรงเวลา {payload.onTimeRate}%, และจัดอันดับทั้ง {payload.areaStats.length} กลุ่มสาระตามตัวเลขจริง
              </p>
            </div>
          </div>

          {/* School Identity & Design Specs Banner */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20">
                <img
                  src="/assets/aistudio/PCSHS_Kalasin.__th__6ef5abd0.png"
                  alt="ตราสัญลักษณ์ จภ. กาฬสินธุ์"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.svg';
                  }}
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</span>
                </p>
                <p className="text-[11px] text-slate-300">
                  ตราสัญลักษณ์พระเกี้ยวและอักษรย่อ "จภ" สีแสดทอง พร้อมแถบริบบิ้นโบว์สีน้ำเงิน
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                ✓ ไม่มีลายเซ็น
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                สีกรมท่า-ทอง
              </span>
            </div>
          </div>

          {/* Prompt Output Code Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-500 font-bold px-1">
              <span>ข้อความ Prompt ที่พร้อมนำไปใช้งาน:</span>
              <span className="font-mono text-[11px] font-normal">{activePrompt.length} ตัวอักษร</span>
            </div>
            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap border border-slate-800 max-h-72 overflow-y-auto select-all shadow-inner">
                {activePrompt}
              </pre>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <p className="font-bold text-slate-800">1. คัดลอก Prompt</p>
              <p className="text-slate-500">กดปุ่มคัดลอกด้านล่างเพื่อนำข้อความไปใช้</p>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <p className="font-bold text-slate-800">2. วางใน AI ที่คุณใช้</p>
              <p className="text-slate-500">วางใน Midjourney, ChatGPT หรือ Canva Magic Media</p>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <p className="font-bold text-slate-800">3. ได้ภาพตามอัตลักษณ์</p>
              <p className="text-slate-500">ได้ภาพอินโฟกราฟิกโทนสีกรมท่า-ทองที่มีตัวเลขจริงครบถ้วน</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดเป็นไฟล์ .txt</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>คัดลอกเรียบร้อยแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอก Prompt ทันที</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
