import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  MousePointer2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ManualVisualId, UserManualVisual } from './UserManualVisuals';

export interface InteractiveGuideStep {
  number: string;
  title: string;
  summary: string;
  details: string[];
  menuLocation?: string;
  tip?: string;
  visualId: ManualVisualId;
  visualCaption: string;
}

interface SubCue {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  actionText: string;
}

const VISUAL_SUB_CUES: Record<ManualVisualId, [SubCue, SubCue, SubCue]> = {
  'auth-01': [
    { x: 28, y: 31, actionText: '1. พิมพ์อีเมลโรงเรียน หรือรหัสครู (เช่น te028) ระบบจะแสดงชื่อยืนยันทันที' },
    { x: 28, y: 69, actionText: '2. กรอกรหัสผ่าน (เข้าใช้ครั้งแรกใส่ 12345)' },
    { x: 52, y: 87, actionText: '3. กดปุ่ม "เข้าสู่ระบบส่งเอกสารวิชาการ"' },
  ],
  'auth-02': [
    { x: 32, y: 47, actionText: '1. ตั้งรหัสผ่านใหม่ที่ปลอดภัยและจำง่าย' },
    { x: 32, y: 69, actionText: '2. กรอกยืนยันรหัสผ่านใหม่อีกครั้งให้ตรงกัน' },
    { x: 52, y: 87, actionText: '3. กดปุ่ม "บันทึกรหัสผ่านใหม่และเข้าใช้งาน"' },
  ],
  'auth-03': [
    { x: 28, y: 60, actionText: '1. ตรวจสอบชื่อ ตำแหน่ง กลุ่มสาระฯ และสาขาวิชาของตนเอง' },
    { x: 72, y: 60, actionText: '2. แนบลิงก์รูปภาพลายเซ็นหรืออัปเดตเบอร์ติดต่อ' },
    { x: 50, y: 87, actionText: '3. กด "บันทึกข้อมูลส่วนตัว" เพื่ออัปเดตฐานข้อมูล' },
  ],
  'auth-04': [
    { x: 45, y: 46, actionText: '1. เปลี่ยนการเข้าถึงทั่วไปเป็น "ทุกคนที่มีลิงก์ (Anyone with the link)"' },
    { x: 30, y: 70, actionText: '2. ตั้งบทบาทเป็น "ผู้มีสิทธิ์อ่าน (Viewer)" หรือแสดงความคิดเห็น' },
    { x: 78, y: 70, actionText: '3. กด "คัดลอกลิงก์" เพื่อนำไปวางส่งในระบบ' },
  ],
  'teacher-01': [
    { x: 38, y: 38, actionText: '1. สังเกตแถบแจ้งเตือนงานใกล้ครบกำหนดส่งด้านบนหน้าหลัก' },
    { x: 84, y: 38, actionText: '2. คลิก "ส่งงานนี้" ได้ทันที หรือเปิดเมนู "งานที่ฉันต้องส่ง"' },
    { x: 78, y: 77, actionText: '3. ตัวเลขสีเหลืองแสดงจำนวนงานที่ยังค้างส่งในภาคเรียนนี้' },
  ],
  'teacher-02': [
    { x: 42, y: 37, actionText: '1. กรอกข้อมูลรายวิชาและรายละเอียดตามแบบฟอร์มให้ครบ' },
    { x: 72, y: 64, actionText: '2. เลือกอัปโหลดไฟล์จากเครื่อง หรือวางลิงก์ Google Drive' },
    { x: 52, y: 86, actionText: '3. กด "ยืนยันส่งเอกสารเข้าระบบ" งานจะเข้าคิวผู้ตรวจอัตโนมัติ' },
  ],
  'teacher-03': [
    { x: 24, y: 31, actionText: '1. คลิกตัวกรองดูเฉพาะ "รอตรวจ", "อนุมัติแล้ว" หรือ "ส่งกลับแก้ไข"' },
    { x: 54, y: 71, actionText: '2. ตรวจสอบสถานะความคืบหน้าทีละด่านตรวจบนการ์ดเอกสาร' },
    { x: 82, y: 71, actionText: '3. ดูคะแนนรูบริกและความคิดเห็นจากผู้ตรวจได้ในรายการ' },
  ],
  'teacher-04': [
    { x: 45, y: 33, actionText: '1. เปิดอ่านข้อเสนอแนะของผู้ตรวจในการ์ดสถานะ "ส่งกลับแก้ไข"' },
    { x: 52, y: 57, actionText: '2. กดปุ่ม "ส่งแก้ไขใหม่" บนการ์ดงานเดิม (ไม่ต้องสร้างงานใหม่)' },
    { x: 52, y: 82, actionText: '3. วางลิงก์ไฟล์ฉบับแก้ไขใหม่แทนของเดิมแล้วกดบันทึก' },
  ],
  'teacher-05': [
    { x: 35, y: 31, actionText: '1. กดปุ่ม "พิมพ์เอกสาร / บันทึก PDF" ที่แถบด้านบน' },
    { x: 50, y: 67, actionText: '2. ตรวจสอบความถูกต้องของใบยืนยันขนาด A4 ก่อนสั่งพิมพ์' },
    { x: 82, y: 31, actionText: '3. กด "ปิด / ย้อนกลับ" เมื่อพิมพ์เสร็จเพื่อกลับสู่หน้าหลัก' },
  ],
  'reviewer-01': [
    { x: 42, y: 33, actionText: '1. คลิกเมนู "เอกสารที่รอฉันตรวจ" (บนมือถือแตะแท็บ "งานตรวจ")' },
    { x: 76, y: 73, actionText: '2. เลือกเอกสารในคิว แล้วกดปุ่ม "ตรวจเอกสาร"' },
    { x: 50, y: 73, actionText: '3. ระบบจะเปิดหน้าต่างตรวจสอบไฟล์และประเมินผลทันที' },
  ],
  'reviewer-02': [
    { x: 78, y: 50, actionText: '1. กดปุ่ม "เปิดดู" เพื่อตรวจไฟล์แนบฉบับล่าสุดที่ครูส่งมา' },
    { x: 50, y: 76, actionText: '2. อ่านรายละเอียดข้อมูลแบบฟอร์มที่ครูกรอกส่งประกอบการตรวจ' },
    { x: 45, y: 50, actionText: '3. ตรวจสอบครบทุกไฟล์กรณีเอกสารชุดนั้นแนบมามากกว่า 1 ไฟล์' },
  ],
  'reviewer-03': [
    { x: 65, y: 30, actionText: '1. เลือกคะแนนรูบริกแต่ละหัวข้อ (หรือประเมินแบบอนุมัติอย่างเดียว)' },
    { x: 45, y: 54, actionText: '2. พิมพ์ข้อเสนอแนะหรือจุดที่ต้องการให้ปรับปรุง' },
    { x: 32, y: 80, actionText: '3. กด "อนุมัติ / ผ่าน" หรือ "ส่งกลับแก้ไข" เพื่อส่งผลกลับให้ครู' },
  ],
  'reviewer-04': [
    { x: 45, y: 38, actionText: '1. เข้าเมนู "เอกสารทั้งโรงเรียน" เมื่อได้รับสิทธิ์จากผู้ดูแลระบบ' },
    { x: 28, y: 73, actionText: '2. กรองดูเอกสารแยกตามกลุ่มสาระการเรียนรู้ที่รับผิดชอบ' },
    { x: 72, y: 73, actionText: '3. กรองดูตามสถานะ เพื่อติดตามภาพรวมได้อย่างรวดเร็ว' },
  ],
  'executive-01': [
    { x: 22, y: 40, actionText: '1. ดูภาพรวมอัตราการส่งงานทั้งหมดของโรงเรียนจากแถบ KPI' },
    { x: 75, y: 40, actionText: '2. เปรียบเทียบยอดอนุมัติแล้วและงานที่รอตรวจ' },
    { x: 48, y: 75, actionText: '3. ตรวจสอบความคืบหน้าแยกตามกลุ่มสาระฯ และคลิกดูรายคนได้' },
  ],
  'executive-02': [
    { x: 20, y: 44, actionText: '1. ดูแดชบอร์ดภาพรวมผู้บริหารในมุมมองมาตรฐาน' },
    { x: 50, y: 44, actionText: '2. กด "จัดอันดับสาระ" เพื่อเทียบอัตราการส่งระหว่างกลุ่มสาระฯ' },
    { x: 80, y: 44, actionText: '3. กด "Data-Driven" เพื่อดูแนวโน้มและสถิติเชิงวิเคราะห์' },
  ],
  'executive-03': [
    { x: 82, y: 36, actionText: '1. ตรวจสอบและกด "อนุมัติ" เอกสารในด่านผู้บริหาร' },
    { x: 35, y: 73, actionText: '2. เลือกดูรายงานสรุปที่ต้องการนำไปใช้ในการประชุม' },
    { x: 78, y: 73, actionText: '3. กด "พิมพ์รายงาน" เพื่อสั่งพิมพ์หรือบันทึกเป็น PDF' },
  ],
  'admin-01': [
    { x: 78, y: 33, actionText: '1. ตั้งค่าปีการศึกษา/ภาคเรียนปัจจุบัน (เช่น 2/2569) และโฟลเดอร์ Drive' },
    { x: 44, y: 63, actionText: '2. เปิดเมนู "โครงสร้างสาขา & หัวหน้าสาระ"' },
    { x: 56, y: 75, actionText: '3. กำหนดหัวหน้าสาขาและหัวหน้าสาระ เพื่อให้สายงานอนุมัติดึงคนถูก' },
  ],
  'admin-02': [
    { x: 44, y: 34, actionText: '1. สร้างภาระงานใหม่และกำหนดวัน-เวลาหมดเขตส่งเอกสาร' },
    { x: 44, y: 65, actionText: '2. เพิ่มช่องกรอกข้อมูลแบบ Dynamic (ข้อความ ตัวเลือก แนบไฟล์/ลิงก์)' },
    { x: 75, y: 77, actionText: '3. แนบลิงก์ไฟล์ตัวอย่างหรือแบบฟอร์มต้นแบบให้ครูกดดูได้' },
  ],
  'admin-03': [
    { x: 18, y: 67, actionText: '1. เมื่อครูส่งเอกสาร ระบบจะเริ่มส่งเข้าสายงานอนุมัติอัตโนมัติ' },
    { x: 50, y: 67, actionText: '2. กำหนดผู้ตรวจแต่ละด่าน (เช่น หน.สาขา -> หน.สาระ -> วิชาการ)' },
    { x: 84, y: 67, actionText: '3. เมื่อผ่านครบทุกด่าน เอกสารจะเปลี่ยนเป็นอนุมัติสมบูรณ์' },
  ],
  'admin-04': [
    { x: 28, y: 47, actionText: '1. เปิด "ติดตามรายบุคคล" เพื่อดูเมทริกซ์ว่าใครส่งครบ/ยังไม่ส่ง' },
    { x: 72, y: 47, actionText: '2. เปิด "ภาระงานผู้ตรวจ" เพื่อดูยอดตรวจจริงและงานค้างของผู้ตรวจ' },
    { x: 80, y: 82, actionText: '3. ใช้ทางลัด ⌘K หรือ Ctrl+K เพื่อค้นหาและสลับเมนูได้ทันที' },
  ],
};

interface UserManualInteractivePlayerProps {
  roleTitle: string;
  steps: InteractiveGuideStep[];
  activeStepIndex: number;
  onSelectStep: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

function formatCueForThaiSpeech(raw: string): string {
  return raw
    .replace(/^\d+\.\s*/, '')
    .replace(/\(Anyone with the link\)/gi, '')
    .replace(/\(Viewer\)/gi, '')
    .replace(/Google Drive/gi, 'กูเกิล ไดรฟ์')
    .replace(/\bDrive\b/gi, 'ไดรฟ์')
    .replace(/Data-Driven/gi, 'ดาต้า ดริฟเวน')
    .replace(/\bDynamic\b/gi, 'ปรับเปลี่ยนได้')
    .replace(/\bte028\b/gi, 'ทีอี ศูนย์สองแปด')
    .replace(/\b12345\b/g, 'หนึ่ง สอง สาม สี่ ห้า')
    .replace(/\bKPI\b/gi, 'ตัวชี้วัดหลัก')
    .replace(/\bA4\b/gi, 'เอสี่')
    .replace(/⌘K/g, 'ปุ่มคำสั่งลัด')
    .replace(/Ctrl\+K/gi, 'คอนโทรล เค')
    .replace(/Teacher_ID/g, 'รหัสครู')
    .replace(/\bPDF\b/g, 'พีดีเอฟ')
    .replace(/หน\./g, 'หัวหน้า')
    .replace(/(\d+)\/(\d+)/g, '$1 ทับ $2')
    .replace(/\s*\/\s*/g, ' หรือ ')
    .replace(/->/g, ' ไปยัง ')
    .replace(/ฯ/g, '')
    .replace(/["()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestThaiVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const isThai = (v: SpeechSynthesisVoice) => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();
    return (
      lang === 'th-th' ||
      lang.startsWith('th-') ||
      lang === 'th' ||
      name.includes('thai') ||
      name.includes('ไทย') ||
      name.includes('premwadee') ||
      name.includes('niwat') ||
      name.includes('kanya') ||
      name.includes('narisa')
    );
  };
  const thaiVoices = voices.filter(isThai);
  if (thaiVoices.length === 0) return null;
  // Prefer Google / Microsoft / Apple Thai voices when multiple exist
  return (
    thaiVoices.find((v) => /google|premwadee|niwat|kanya|narisa/i.test(v.name || '')) ||
    thaiVoices[0]
  );
}

export const UserManualInteractivePlayer: React.FC<UserManualInteractivePlayerProps> = ({
  roleTitle,
  steps,
  activeStepIndex,
  onSelectStep,
  isPlaying,
  onTogglePlay,
}) => {
  const safeIndex = Math.min(Math.max(activeStepIndex, 0), Math.max(steps.length - 1, 0));
  const currentStep = steps[safeIndex];
  const [subPhase, setSubPhase] = useState<0 | 1 | 2>(0);

  const supportsSpeech =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(supportsSpeech);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [thaiVoice, setThaiVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [hasCheckedVoices, setHasCheckedVoices] = useState(false);
  const [noThaiVoiceAvailable, setNoThaiVoiceAvailable] = useState(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeech = useCallback(() => {
    if (!supportsSpeech) return;
    try {
      activeUtteranceRef.current = null;
      window.speechSynthesis.cancel();
    } catch {
      // Ignore browser speech cancel errors
    }
    setIsSpeaking(false);
  }, [supportsSpeech]);

  // Discover best available Thai voice from browser
  useEffect(() => {
    if (!supportsSpeech) return;
    const pickThaiVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        const found = findBestThaiVoice(voices);
        setThaiVoice(found);
        if (voices.length > 0) {
          setHasCheckedVoices(true);
          setNoThaiVoiceAvailable(!found);
        }
      } catch {
        setThaiVoice(null);
      }
    };
    pickThaiVoice();
    const fallbackCheck = window.setTimeout(() => {
      pickThaiVoice();
      setHasCheckedVoices(true);
    }, 500);
    window.speechSynthesis.addEventListener?.('voiceschanged', pickThaiVoice);
    return () => {
      window.clearTimeout(fallbackCheck);
      window.speechSynthesis.removeEventListener?.('voiceschanged', pickThaiVoice);
    };
  }, [supportsSpeech]);

  // Ensure speech stops cleanly when component unmounts
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Reset sub-phase whenever step changes
  useEffect(() => {
    setSubPhase(0);
  }, [safeIndex, steps]);

  const advanceNext = useCallback(() => {
    if (subPhase < 2) {
      setSubPhase((subPhase + 1) as 0 | 1 | 2);
    } else {
      setSubPhase(0);
      onSelectStep((safeIndex + 1) % steps.length);
    }
  }, [subPhase, safeIndex, steps.length, onSelectStep]);

  const activeVisualId = currentStep?.visualId;
  const cues = activeVisualId ? VISUAL_SUB_CUES[activeVisualId] : undefined;
  const activeCue = cues
    ? cues[subPhase]
    : { x: 50, y: 50, actionText: currentStep?.summary || '' };

  // Auto-play progression + synchronized Thai browser voice narration
  useEffect(() => {
    if (!isPlaying || steps.length === 0 || !currentStep) {
      stopSpeech();
      return;
    }

    let cancelled = false;
    let advanceTimer: number | undefined;
    let speakDelayTimer: number | undefined;
    let watchdogTimer: number | undefined;

    const scheduleAdvance = (delayMs: number) => {
      if (cancelled || advanceTimer !== undefined) return;
      advanceTimer = window.setTimeout(() => {
        if (!cancelled) {
          advanceNext();
        }
      }, delayMs);
    };

    if (supportsSpeech && isVoiceEnabled) {
      stopSpeech();
      const spokenText = formatCueForThaiSpeech(activeCue.actionText);

      // Re-query latest browser voices dynamically
      let currentVoices: SpeechSynthesisVoice[] = [];
      try {
        currentVoices = window.speechSynthesis.getVoices();
      } catch {
        currentVoices = [];
      }
      const resolvedThaiVoice = thaiVoice || findBestThaiVoice(currentVoices);

      // If browser explicitly loaded voices and NONE support Thai, don't speak broken English!
      if (currentVoices.length > 0 && !resolvedThaiVoice) {
        setNoThaiVoiceAvailable(true);
        scheduleAdvance(2400);
      } else if (spokenText) {
        if (resolvedThaiVoice) setNoThaiVoiceAvailable(false);
        speakDelayTimer = window.setTimeout(() => {
          if (cancelled) return;
          try {
            const utterance = new SpeechSynthesisUtterance(spokenText);
            utterance.lang = resolvedThaiVoice?.lang || 'th-TH';
            utterance.rate = speechRate;
            if (resolvedThaiVoice) {
              utterance.voice = resolvedThaiVoice;
            }
            activeUtteranceRef.current = utterance;

            utterance.onstart = () => {
              if (!cancelled) setIsSpeaking(true);
            };
            utterance.onend = () => {
              if (cancelled) return;
              setIsSpeaking(false);
              if (watchdogTimer) window.clearTimeout(watchdogTimer);
              scheduleAdvance(550);
            };
            utterance.onerror = () => {
              if (cancelled) return;
              setIsSpeaking(false);
              if (watchdogTimer) window.clearTimeout(watchdogTimer);
              scheduleAdvance(2200);
            };

            window.speechSynthesis.resume?.();
            window.speechSynthesis.speak(utterance);

            // Safety watchdog in case browser speech engine silently stalls or lacks Thai voice
            const maxWaitMs = Math.max(5200, Math.round((spokenText.length * 140) / speechRate));
            watchdogTimer = window.setTimeout(() => {
              if (!cancelled) {
                stopSpeech();
                scheduleAdvance(200);
              }
            }, maxWaitMs);
          } catch {
            setIsSpeaking(false);
            scheduleAdvance(2400);
          }
        }, 50);
      } else {
        scheduleAdvance(2200);
      }
    } else {
      stopSpeech();
      scheduleAdvance(2200);
    }

    return () => {
      cancelled = true;
      if (speakDelayTimer) window.clearTimeout(speakDelayTimer);
      if (advanceTimer) window.clearTimeout(advanceTimer);
      if (watchdogTimer) window.clearTimeout(watchdogTimer);
      stopSpeech();
    };
  }, [
    isPlaying,
    isVoiceEnabled,
    supportsSpeech,
    speechRate,
    thaiVoice,
    subPhase,
    safeIndex,
    steps.length,
    currentStep,
    activeCue.actionText,
    advanceNext,
    stopSpeech,
  ]);

  if (!currentStep) return null;

  return (
    <section
      aria-label="โหมดสาธิตภาพเคลื่อนไหวทีละขั้น"
      className="rounded-2xl border border-slate-200 bg-slate-900 text-white overflow-hidden shadow-md"
    >
      {/* Top Player Control Bar */}
      <div className="px-4 py-3 bg-[#0B1329] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">
              สาธิตการใช้งานแบบภาพเคลื่อนไหว · {roleTitle}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              จำลองการกดปุ่มและลำดับหน้าจอทีละขั้นโดยไม่ต้องใช้วิดีโอภายนอก
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {supportsSpeech && (
            <>
              <button
                type="button"
                onClick={() => {
                  const next = !isVoiceEnabled;
                  setIsVoiceEnabled(next);
                  if (!next) stopSpeech();
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isVoiceEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title={
                  isVoiceEnabled
                    ? thaiVoice
                      ? `คลิกเพื่อปิดเสียงบรรยาย (ใช้เสียง: ${thaiVoice.name})`
                      : hasCheckedVoices && noThaiVoiceAvailable
                        ? 'เบราว์เซอร์นี้ยังไม่มีเสียงอ่านภาษาไทยในระบบ'
                        : 'คลิกเพื่อปิดเสียงบรรยาย'
                    : 'คลิกเพื่อเปิดเสียงบรรยายภาษาไทย'
                }
              >
                {isVoiceEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="hidden sm:inline">
                  {isVoiceEnabled
                    ? isSpeaking
                      ? 'กำลังบรรยาย (ไทย)'
                      : hasCheckedVoices && noThaiVoiceAvailable
                        ? 'ไม่พบเสียงไทย'
                        : 'เสียงไทย: เปิด'
                    : 'เสียงไทย: ปิด'}
                </span>
              </button>

              {isVoiceEnabled && (
                <button
                  type="button"
                  onClick={() =>
                    setSpeechRate((prev) => (prev === 1.0 ? 1.15 : prev === 1.15 ? 0.9 : 1.0))
                  }
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono tabular-nums text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="สลับความเร็วเสียงบรรยาย"
                >
                  {speechRate}x
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onSelectStep((safeIndex - 1 + steps.length) % steps.length);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            aria-label="ขั้นตอนก่อนหน้า"
            title="ขั้นตอนก่อนหน้า"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isPlaying) stopSpeech();
              onTogglePlay();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>หยุดชั่วคราว</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>เล่นสาธิตอัตโนมัติ</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onSelectStep((safeIndex + 1) % steps.length);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            aria-label="ขั้นตอนถัดไป"
            title="ขั้นตอนถัดไป"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onSelectStep(0);
              setSubPhase(0);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            aria-label="เริ่มใหม่จากขั้นตอนที่ 1"
            title="เริ่มใหม่จากขั้นตอนที่ 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/60">
        {/* Left: Animated Screen Frame + Pointer */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="relative rounded-xl overflow-hidden bg-white p-1.5 ring-1 ring-white/10 shadow-lg">
            <UserManualVisual visualId={currentStep.visualId} compact />

            {/* Animated Pointer & Click Ring (GPU-composited transform) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-20 transition-all duration-500 ease-out"
              style={{
                left: `${activeCue.x}%`,
                top: `${activeCue.y}%`,
                transform: 'translate(-20%, -20%)',
              }}
            >
              {/* Soft click ring */}
              <span
                key={`${safeIndex}-${subPhase}`}
                className="absolute -inset-1.5 rounded-full border-2 border-amber-400/90 bg-amber-400/20 ring-4 ring-amber-400/25 transition-transform duration-300"
              />
              {/* Simulated Pointer */}
              <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900/90 text-amber-300 shadow-md border border-amber-400">
                <MousePointer2 className="w-3.5 h-3.5 fill-amber-300" />
              </span>
            </div>
          </div>

          {/* Narration Subtitle Strip */}
          <div className="rounded-xl bg-[#0B1329] border border-slate-800 px-3.5 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm font-medium text-amber-200 leading-snug">
                {activeCue.actionText}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                {[0, 1, 2].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSubPhase(p as 0 | 1 | 2)}
                    aria-label={`จังหวะที่ ${p + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      subPhase === p ? 'w-5 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {isVoiceEnabled && hasCheckedVoices && noThaiVoiceAvailable && (
              <p className="text-[11px] text-amber-300/80 border-t border-slate-800/80 pt-1.5 leading-snug">
                หมายเหตุ: อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่มีชุดเสียงอ่านภาษาไทยในระบบ (แนะนำเปิดใน Chrome/Edge หรือมือถือที่มีเสียงภาษาไทย หรืออ่านคำบรรยายภาษาไทยด้านบนประกอบ)
              </p>
            )}
          </div>
        </div>

        {/* Right: Synchronized Step Playlist */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">ลำดับการสาธิต</span>
            <span className="font-mono tabular-nums">
              {safeIndex + 1} / {steps.length}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5 touch-scroll">
            {steps.map((step, idx) => {
              const isCurrent = idx === safeIndex;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => onSelectStep(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    isCurrent
                      ? 'bg-white/10 border-amber-400/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-md font-mono tabular-nums text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      isCurrent
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {step.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{step.title}</div>
                    <div className="text-[11px] opacity-80 truncate">{step.summary}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="h-1 bg-slate-800 w-full overflow-hidden">
        <div
          className="h-full bg-amber-400 transition-transform duration-500 ease-out origin-left"
          style={{
            transform: `scaleX(${((safeIndex * 3 + subPhase + 1) / (steps.length * 3)).toFixed(3)})`,
          }}
        />
      </div>
    </section>
  );
};
