import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig } from '../types';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Table as TableIcon,
  Wand2,
} from 'lucide-react';

export interface TrackerMatrixRow {
  teacher: Teacher;
  taskResults: Array<{
    config: PlanTypeDeadlineConfig;
    isSubmitted: boolean;
    submittedPlan?: LessonPlan;
  }>;
  submittedTasksCount: number;
  totalTasksCount: number;
  isAllCompleted: boolean;
  hasUnsubmitted: boolean;
  hasLateSubmission: boolean;
}

interface TrackerInfographicPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRows: TrackerMatrixRow[];
  filteredRows: TrackerMatrixRow[];
  activeAssignments: PlanTypeDeadlineConfig[];
  currentAreaFilter: string;
  onCopied?: (message: string) => void;
}

type PromptStyle = 'clean_matrix' | 'official_poster' | 'minimal_line';
type AspectChoice = 'portrait_3_4' | 'vertical_9_16' | 'landscape_16_9';
type PromptFormat = 'ai_image_prompt' | 'data_only';

export const TrackerInfographicPromptModal: React.FC<TrackerInfographicPromptModalProps> = ({
  isOpen,
  onClose,
  allRows,
  filteredRows,
  activeAssignments,
  currentAreaFilter,
  onCopied,
}) => {
  const [scopeArea, setScopeArea] = useState<string>('current_filter');
  const [promptStyle, setPromptStyle] = useState<PromptStyle>('clean_matrix');
  const [aspectChoice, setAspectChoice] = useState<AspectChoice>('portrait_3_4');
  const [promptFormat, setPromptFormat] = useState<PromptFormat>('ai_image_prompt');
  const [showLateDetail, setShowLateDetail] = useState<boolean>(false);
  const [includeSummaryCounts, setIncludeSummaryCounts] = useState<boolean>(true);
  const [activePreviewTab, setActivePreviewTab] = useState<'prompt' | 'table'>('prompt');
  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);

  // Extract available learning areas
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      const area = (r.teacher.Learning_Area || '').trim();
      if (area) set.add(area);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [allRows]);

  // Reset scopeArea when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomText(null);
      setCopied(false);
      if (currentAreaFilter && currentAreaFilter !== 'ทั้งหมด') {
        setScopeArea(currentAreaFilter);
      } else if (filteredRows.length !== allRows.length) {
        setScopeArea('current_filter');
      } else {
        setScopeArea('all');
      }
    }
  }, [isOpen, currentAreaFilter, filteredRows.length, allRows.length]);

  // Rows selected for the prompt
  const targetRows = useMemo(() => {
    if (scopeArea === 'current_filter') return filteredRows;
    if (scopeArea === 'all') return allRows;
    return allRows.filter((r) => (r.teacher.Learning_Area || '').trim() === scopeArea);
  }, [scopeArea, filteredRows, allRows]);

  // Group targetRows by Learning Area
  const groupedByArea = useMemo(() => {
    const map = new Map<string, TrackerMatrixRow[]>();
    targetRows.forEach((row) => {
      const areaName = (row.teacher.Learning_Area || 'ไม่ระบุกลุ่มสาระ').trim() || 'ไม่ระบุกลุ่มสาระ';
      const list = map.get(areaName) || [];
      list.push(row);
      map.set(areaName, list);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'th'))
      .map(([area, rows]) => ({
        area,
        rows: [...rows].sort((a, b) => a.teacher.Name.localeCompare(b.teacher.Name, 'th')),
      }));
  }, [targetRows]);

  // Generate structured prompt text matching the user's sketch layout
  const generatedPrompt = useMemo(() => {
    const taskHeaders = activeAssignments.map((a) => a.name.trim());
    const totalTeachers = targetRows.length;
    const completedAllCount = targetRows.filter((r) => r.isAllCompleted).length;
    const pendingCount = totalTeachers - completedAllCount;

    const todayStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build data matrix text grouped by Learning Area (exact match to sketch)
    const dataSections = groupedByArea
      .map(({ area, rows }) => {
        const headerLine = `| ชื่อครู | ${taskHeaders.join(' | ')} |`;
        const dividerLine = `| --- | ${taskHeaders.map(() => '---').join(' | ')} |`;
        const rowLines = rows.map((r) => {
          const cells = activeAssignments.map((cfg) => {
            const tr = r.taskResults.find((x) => x.config.id === cfg.id);
            if (!tr || !tr.isSubmitted) return 'ยังไม่ส่ง';
            if (showLateDetail && tr.submittedPlan?.is_late) return 'ส่งแล้ว (ส่งช้า)';
            return 'ส่งแล้ว';
          });
          return `| ${r.teacher.Name} | ${cells.join(' | ')} |`;
        });
        return [`กลุ่มสาระ: ${area} (${rows.length} ท่าน)`, headerLine, dividerLine, ...rowLines].join('\n');
      })
      .join('\n\n');

    if (promptFormat === 'data_only') {
      const summaryHeader = includeSummaryCounts
        ? `สรุปภาพรวม: ครูทั้งหมด ${totalTeachers} ท่าน | ส่งครบแล้ว ${completedAllCount} ท่าน | ยังค้างส่ง ${pendingCount} ท่าน\nข้อมูล ณ วันที่ ${todayStr}\n\n`
        : `ข้อมูล ณ วันที่ ${todayStr}\n\n`;
      return `ติดตามรายงานการส่งเอกสาร\n${summaryHeader}${dataSections || '(ไม่พบข้อมูลตามตัวกรองที่เลือก)'}`;
    }

    const aspectDesc =
      aspectChoice === 'vertical_9_16'
        ? 'แนวตั้ง 9:16 (เหมาะสำหรับส่งแจ้งเตือนใน LINE / มือถือ)'
        : aspectChoice === 'landscape_16_9'
        ? 'แนวนอน 16:9 (เหมาะสำหรับนำเสนอบนจอหรือสไลด์ประชุม)'
        : 'แนวตั้ง 3:4 (เหมาะสำหรับโปสเตอร์รายงาน / พิมพ์ A4)';

    const styleDesc =
      promptStyle === 'official_poster'
        ? 'สไตล์โปสเตอร์รายงานฝ่ายวิชาการทางการ โทนสีกรมท่าเข้ม (#0B1329) ตัดสีทองแสด (#F59E0B) พื้นหลังตารางสีขาวสะอาด มีหัวแบนเนอร์โรงเรียนด้านบน'
        : promptStyle === 'minimal_line'
        ? 'สไตล์โมเดิร์นมินิมอล พื้นหลังขาวสะอาดตา การ์ดขอบมน ตัวอักษรคมชัด อ่านง่ายบนหน้าจอมือถือและ LINE'
        : 'สไตล์ตารางเมทริกซ์อินโฟกราฟิกสะอาดตา พื้นหลังสว่าง อ่านชื่อครูและสถานะได้ชัดเจนในพริบตา';

    const summaryInstruction = includeSummaryCounts
      ? `- แถบสรุปสถิติด้านบนใต้หัวข้อ: "ครูทั้งหมด ${totalTeachers} ท่าน | ส่งครบแล้ว ${completedAllCount} ท่าน | ยังค้างส่ง ${pendingCount} ท่าน" (ข้อมูล ณ วันที่ ${todayStr})`
      : `- แสดงวันที่ข้อมูล: "ข้อมูล ณ วันที่ ${todayStr}"`;

    return [
      `ช่วยออกแบบและสร้างภาพ Infographic (อินโฟกราฟิก) ภาษาไทย เรื่อง "ติดตามรายงานการส่งเอกสาร"`,
      `โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
      ``,
      `[ข้อกำหนดด้านการออกแบบและสัดส่วน]`,
      `- สัดส่วนภาพ: ${aspectDesc}`,
      `- สไตล์ภาพ: ${styleDesc}`,
      `- ฟอนต์และภาษา: ใช้ตัวอักษรภาษาไทยที่ถูกต้อง สะกดตรงตามข้อมูล 100% ห้ามตัดชื่อครูหรือเปลี่ยนคำ`,
      summaryInstruction,
      ``,
      `[โครงสร้างการจัดวาง (Layout ตามแบบตารางแยกกลุ่มสาระ)]`,
      `1. หัวเรื่องใหญ่ด้านบนสุดตรงกลาง: "ติดตามรายงานการส่งเอกสาร"`,
      `2. แบ่งกลุ่มข้อมูลแยกตามหัวข้อ "ชื่อกลุ่มสาระ" เรียงลงมาทีละกลุ่ม`,
      `3. ในแต่ละกลุ่มสาระ แสดงตารางที่มีคอลัมน์ซ้ายสุดเป็น "รายชื่อครู" และคอลัมน์ถัดไปเป็นชื่องานแต่ละชิ้น: ${taskHeaders.map((t, i) => `งานที่ ${i + 1}: "${t}"`).join(', ')}`,
      `4. ช่องสถานะของแต่ละงานให้ใส่สัญลักษณ์/ป้ายสีให้แยกออกทันที:`,
      `   - "ส่งแล้ว" ➔ ป้ายสีเขียวอ่อน ตัวอักษรสีเขียวเข้ม (พร้อมเครื่องหมาย ✓)`,
      `   - "ยังไม่ส่ง" ➔ ป้ายสีแดงอ่อน ตัวอักษรสีแดงเข้ม (เน้นให้เห็นชัดเพื่อติดตามงาน)`,
      showLateDetail
        ? `   - "ส่งแล้ว (ส่งช้า)" ➔ ป้ายสีเหลืองอำพัน ตัวอักษรสีส้มเข้ม`
        : ``,
      ``,
      `[ข้อมูลจริงสำหรับนำไปวาดลงในอินโฟกราฟิก (เรียงตามกลุ่มสาระ)]`,
      dataSections || '(ไม่พบข้อมูลครูตามเงื่อนไขที่เลือก)',
    ]
      .filter((line): line is string => line !== undefined)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }, [
    activeAssignments,
    targetRows,
    groupedByArea,
    promptFormat,
    aspectChoice,
    promptStyle,
    showLateDetail,
    includeSummaryCounts,
  ]);

  const activeText = customText !== null ? customText : generatedPrompt;

  const handleCopyPrompt = async () => {
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
      onCopied?.('คัดลอกคำพรอมพ์ AI สำหรับสร้างอินโฟกราฟิกเรียบร้อยแล้ว');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onCopied?.('ไม่สามารถคัดลอกได้ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0B1329] text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                ขอคำพรอมพ์ AI สร้างอินโฟกราฟิกติดตามการส่งเอกสาร
              </h3>
              <p className="text-xs text-slate-300 truncate">
                จัดโครงสร้างแยกตามกลุ่มสาระ รายชื่อครู และสถานะ ส่งแล้ว / ยังไม่ส่ง ของงานแต่ละชิ้นอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/60">
          {/* Controls Strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Scope selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ขอบเขตข้อมูลครู
                </label>
                <select
                  value={scopeArea}
                  onChange={(e) => {
                    setScopeArea(e.target.value);
                    setCustomText(null);
                  }}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                >
                  <option value="current_filter">
                    ตามตัวกรองหน้าจอปัจจุบัน ({filteredRows.length} ท่าน)
                  </option>
                  <option value="all">ครูทั้งโรงเรียน ({allRows.length} ท่าน)</option>
                  {availableAreas.map((area) => {
                    const count = allRows.filter(
                      (r) => (r.teacher.Learning_Area || '').trim() === area
                    ).length;
                    return (
                      <option key={area} value={area}>
                        เฉพาะกลุ่มสาระ: {area} ({count} ท่าน)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Format selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  รูปแบบข้อความ
                </label>
                <select
                  value={promptFormat}
                  onChange={(e) => {
                    setPromptFormat(e.target.value as PromptFormat);
                    setCustomText(null);
                  }}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                >
                  <option value="ai_image_prompt">คำพรอมพ์ AI สร้างภาพอินโฟกราฟิก</option>
                  <option value="data_only">เฉพาะตารางข้อมูลสรุป (Text/Markdown)</option>
                </select>
              </div>

              {/* Aspect ratio (when AI prompt) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ขนาดภาพอินโฟกราฟิก
                </label>
                <select
                  value={aspectChoice}
                  disabled={promptFormat === 'data_only'}
                  onChange={(e) => {
                    setAspectChoice(e.target.value as AspectChoice);
                    setCustomText(null);
                  }}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="portrait_3_4">แนวตั้ง 3:4 (โปสเตอร์ / พิมพ์ A4)</option>
                  <option value="vertical_9_16">แนวตั้ง 9:16 (ส่ง LINE / มือถือ)</option>
                  <option value="landscape_16_9">แนวนอน 16:9 (นำเสนอ / สไลด์)</option>
                </select>
              </div>
            </div>

            {/* Style + Options Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {promptFormat === 'ai_image_prompt' ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">สไตล์:</span>
                  {[
                    { id: 'clean_matrix' as PromptStyle, label: 'ตารางสะอาดตา' },
                    { id: 'official_poster' as PromptStyle, label: 'โปสเตอร์วิชาการ' },
                    { id: 'minimal_line' as PromptStyle, label: 'มินิมอลส่ง LINE' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setPromptStyle(s.id);
                        setCustomText(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                        promptStyle === s.id
                          ? 'bg-[#0B1329] text-amber-400 border-[#0B1329]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeSummaryCounts}
                    onChange={(e) => {
                      setIncludeSummaryCounts(e.target.checked);
                      setCustomText(null);
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>ใส่ยอดสรุปรวม</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={showLateDetail}
                    onChange={(e) => {
                      setShowLateDetail(e.target.checked);
                      setCustomText(null);
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>ระบุคำว่า "(ส่งช้า)" ด้วย</span>
                </label>
              </div>
            </div>
          </div>

          {/* Preview Switcher + Live Prompt / Visual Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('prompt')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    activePreviewTab === 'prompt'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>คำพรอมพ์พร้อมคัดลอก</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('table')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    activePreviewTab === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ดูตัวอย่างตารางข้อมูล ({groupedByArea.length} กลุ่มสาระ)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>
                  {targetRows.length} ครู · {activeAssignments.length} งาน
                </span>
                {customText !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomText(null)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>รีเซ็ตข้อความ</span>
                  </button>
                )}
              </div>
            </div>

            {activePreviewTab === 'prompt' ? (
              <div className="p-3 sm:p-4 space-y-2">
                <textarea
                  value={activeText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={14}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white resize-y"
                />
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    วิธีใช้: กด <strong>"คัดลอกคำพรอมพ์ AI"</strong> แล้วนำไปวางใน AI สร้างภาพอินโฟกราฟิก (เช่น Gemini, ChatGPT หรือ Canva AI) เพื่อสร้างภาพสรุปส่งเข้ากลุ่มไลน์หรือรายงานผลได้ทันที
                  </span>
                </p>
              </div>
            ) : (
              <div className="p-4 max-h-[380px] overflow-auto space-y-4">
                <div className="text-center font-bold text-sm text-slate-900">
                  ติดตามรายงานการส่งเอกสาร
                </div>
                {groupedByArea.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    ไม่พบข้อมูลครูตามขอบเขตที่เลือก
                  </div>
                ) : (
                  groupedByArea.map(({ area, rows }) => (
                    <div key={area} className="space-y-1.5">
                      <div className="text-xs font-extrabold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                        {area} ({rows.length} ท่าน)
                      </div>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3 font-bold min-w-[160px]">ชื่อครู</th>
                              {activeAssignments.map((cfg) => (
                                <th key={cfg.id} className="py-2 px-2.5 text-center font-bold min-w-[110px]">
                                  {cfg.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rows.map((r) => (
                              <tr key={r.teacher.Teacher_ID} className="hover:bg-slate-50/70">
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {r.teacher.Name}
                                </td>
                                {activeAssignments.map((cfg) => {
                                  const tr = r.taskResults.find((x) => x.config.id === cfg.id);
                                  const isSubmitted = tr?.isSubmitted;
                                  const isLate = tr?.submittedPlan?.is_late;
                                  return (
                                    <td key={cfg.id} className="py-2 px-2.5 text-center">
                                      {isSubmitted ? (
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                            showLateDetail && isLate
                                              ? 'bg-amber-50 text-amber-800'
                                              : 'bg-emerald-50 text-emerald-700'
                                          }`}
                                        >
                                          {showLateDetail && isLate ? 'ส่งแล้ว (ส่งช้า)' : 'ส่งแล้ว'}
                                        </span>
                                      ) : (
                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700">
                                          ยังไม่ส่ง
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ข้อมูลดึงตรงจากสถานะการส่งงานจริงในระบบ ณ ปัจจุบัน
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleCopyPrompt}
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
                  <span>คัดลอกคำพรอมพ์ AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
