import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  Check,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  SEASONAL_THEMES,
  SeasonalThemeId,
  SeasonalThemeConfig,
  DEFAULT_SEASONAL_THEME_CONFIG,
  resolveFestivalIdForDate,
  findNextUpcomingFestival,
} from '../services/seasonalThemeService';
import { SeasonalThemeIcon } from './SeasonalDecorations';

interface SeasonalThemeModalProps {
  isOpen: boolean;
  config: SeasonalThemeConfig;
  isUserMuted: boolean;
  onToggleUserMuted: (muted: boolean) => void;
  onSave: (newConfig: SeasonalThemeConfig) => Promise<void>;
  onClose: () => void;
}

export const SeasonalThemeModal: React.FC<SeasonalThemeModalProps> = ({
  isOpen,
  config,
  isUserMuted,
  onToggleUserMuted,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<SeasonalThemeConfig>(config);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(config);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const today = new Date();
  const todayAutoId = resolveFestivalIdForDate(today);
  const todayAutoTheme = SEASONAL_THEMES[todayAutoId];
  const nextFestival = findNextUpcomingFestival(today);

  const allThemesList = Object.values(SEASONAL_THEMES);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...draft,
        updated_at: new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_SEASONAL_THEME_CONFIG);
  };

  return (
    <div
      onClick={(e) => {
        if (!isSaving && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-[#0B1329] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                ตั้งค่าธีมตามเทศกาลสำคัญอัตโนมัติ (Seasonal Theme)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                เปลี่ยนบรรยากาศหน้าเว็บตามปฏิทินไทย-สากล โดยไม่กระทบความชัดเจนของเอกสารและตารางงาน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Today's Calendar Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  ปฏิทินวันนี้ ({today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}):{' '}
                  <span className="text-indigo-700">
                    {todayAutoId === 'default' ? 'วันปกติ (ธีมมาตรฐานโรงเรียน)' : todayAutoTheme.name}
                  </span>
                </div>
                {nextFestival && todayAutoId === 'default' && (
                  <p className="text-slate-600">
                    เทศกาลถัดไปที่จะเปลี่ยนอัตโนมัติ: <strong>{nextFestival.theme.name}</strong> ({nextFestival.dateLabel} · อีก {nextFestival.daysAway} วัน)
                  </p>
                )}
              </div>
            </div>

            {isUserMuted && (
              <button
                type="button"
                onClick={() => onToggleUserMuted(false)}
                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                ยกเลิกการซ่อนแถบบนเครื่องนี้
              </button>
            )}
          </div>

          {/* 3 Operation Modes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              รูปแบบการทำงานของธีมทั้งโรงเรียน
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, mode: 'auto' }))}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  draft.mode === 'auto'
                    ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">อัตโนมัติตามวันเทศกาล</span>
                  {draft.mode === 'auto' && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  เปลี่ยนธีมเองเมื่อถึงเทศกาล (ปีใหม่, วันครู, สงกรานต์, ฮาโลวีน, ลอยกระทง ฯลฯ) และกลับเป็นปกติเมื่อจบช่วง
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    mode: 'manual',
                    manual_theme_id: prev.manual_theme_id === 'default' ? 'halloween' : prev.manual_theme_id,
                  }))
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  draft.mode === 'manual'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">เลือกธีมเอง / ทดลองใช้</span>
                  {draft.mode === 'manual' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  บังคับใช้ธีมที่เลือกด้านล่างทันที (เหมาะสำหรับพรีวิวดูก่อน หรือเปิดโหมดสำรวม/กิจกรรมพิเศษ)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, mode: 'off' }))}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  draft.mode === 'off'
                    ? 'bg-slate-100 border-slate-700 ring-2 ring-slate-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">ปิดธีมเทศกาล</span>
                  {draft.mode === 'off' && <Check className="w-4 h-4 text-slate-800" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  ใช้ธีมมาตรฐานกรมท่า-ทองตลอดเวลา ปิดแบนเนอร์และเอฟเฟกต์ทั้งหมด
                </p>
              </button>
            </div>
          </div>

          {/* Non-intrusive options */}
          {draft.mode !== 'off' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 pr-2">
                  {draft.show_banner ? (
                    <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800">แสดงแถบข้อความทักทาย</div>
                    <div className="text-[11px] text-slate-500">แถบ 1 บรรทัดใต้ส่วนหัว (ครูสามารถกดซ่อนเองได้)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={draft.show_banner}
                  onChange={(e) => setDraft((prev) => ({ ...prev, show_banner: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 pr-2">
                  <Sparkles className={`w-4 h-4 shrink-0 ${draft.show_particles ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-800">เอฟเฟกต์ลอยเบาๆ (พื้นหลัง)</div>
                    <div className="text-[11px] text-slate-500">โปร่งใส ไม่บังปุ่มกดและไม่รบกวนการอ่านตาราง</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={draft.show_particles}
                  onChange={(e) => setDraft((prev) => ({ ...prev, show_particles: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Optional Custom Greeting */}
          {draft.mode !== 'off' && draft.show_banner && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                ข้อความทักทายพิเศษของโรงเรียน (ไม่บังคับ — หากเว้นว่างจะใช้ข้อความประจำเทศกาลอัตโนมัติ)
              </label>
              <input
                type="text"
                value={draft.custom_message || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, custom_message: e.target.value }))}
                placeholder="เช่น ขอเชิญคณะครูร่วมกิจกรรมวันครู ณ หอประชุม..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Festival Directory / Manual Preview Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                รายการเทศกาลทั้งหมดในปฏิทินอัตโนมัติ (คลิกเพื่อเลือกใช้งานหรือทดลองพรีวิว)
              </label>
              <span className="text-[11px] text-slate-500">{allThemesList.length} ธีม</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {allThemesList.map((themeItem) => {
                const isSelectedManual = draft.mode === 'manual' && draft.manual_theme_id === themeItem.id;
                const isTodayMatch = todayAutoId === themeItem.id && themeItem.id !== 'default';
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => {
                      if (themeItem.id === 'default') {
                        setDraft((prev) => ({ ...prev, mode: 'off', manual_theme_id: 'default' }));
                      } else {
                        setDraft((prev) => ({
                          ...prev,
                          mode: 'manual',
                          manual_theme_id: themeItem.id as SeasonalThemeId,
                        }));
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelectedManual
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${themeItem.previewSwatchClass} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <SeasonalThemeIcon iconType={themeItem.iconType} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">{themeItem.name}</span>
                        {isSelectedManual && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {themeItem.dateDescription}
                        {isTodayMatch && ' · ตรงกับวันนี้'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>บันทึกแล้วจะอัปเดตตรงกันทั้งโรงเรียนโดยไม่รบกวนตารางงาน</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>กลับเป็นค่าอัตโนมัติ</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#0B1329] hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าธีม'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
