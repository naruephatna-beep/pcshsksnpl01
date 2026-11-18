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
  Palette,
} from 'lucide-react';
import {
  SEASONAL_THEMES,
  SeasonalThemeId,
  SeasonalThemeConfig,
  DEFAULT_SEASONAL_THEME_CONFIG,
  resolveFestivalIdForDate,
  resolveActiveSeasonalTheme,
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const today = new Date();
  const todayAutoId = resolveFestivalIdForDate(today);
  const todayAutoTheme = SEASONAL_THEMES[todayAutoId];
  const nextFestival = findNextUpcomingFestival(today);
  const previewTheme = resolveActiveSeasonalTheme(draft, today);
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-panel-enter"
      >
        {/* Header */}
        <div className={`px-5 py-4 text-white flex items-center justify-between shrink-0 transition-colors duration-300 ${previewTheme.sidebarTopClass || 'bg-[#0B1329]'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${previewTheme.accentBadgeClass}`}>
              <SeasonalThemeIcon iconType={previewTheme.iconType} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                ธีมตามเทศกาลสำคัญอัตโนมัติ (Seasonal Theme)
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-200/85 truncate">
                เลือกโหมดหรือคลิกเลือกธีมด้านล่างเพื่อเปลี่ยนบรรยากาศทั้งหน้าเว็บและหน้าล็อกอิน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 touch-scroll">
          {/* Compact Calendar Status + Live Preview Strip */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
            <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-slate-800">
                  วันนี้ ({today.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}):
                </span>
                <span className="font-semibold text-indigo-700 truncate">
                  {todayAutoId === 'default' ? 'วันปกติ (ธีมมาตรฐาน)' : todayAutoTheme.name}
                </span>
                {nextFestival && todayAutoId === 'default' && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    · ถัดไป: {nextFestival.theme.shortLabel} ({nextFestival.dateLabel})
                  </span>
                )}
              </div>

              {isUserMuted && (
                <button
                  type="button"
                  onClick={() => onToggleUserMuted(false)}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                >
                  เลิกซ่อนแถบบนเครื่องนี้
                </button>
              )}
            </div>

            {/* Live Preview Bar */}
            <div className={`px-3.5 py-2 border-t flex items-center justify-between gap-2.5 ${previewTheme.bannerBgClass} ${previewTheme.bannerBorderClass} ${previewTheme.bannerTextClass}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${previewTheme.accentBadgeClass}`}>
                  <SeasonalThemeIcon iconType={previewTheme.iconType} className="w-3 h-3" />
                  <span>พรีวิว: {previewTheme.shortLabel}</span>
                </span>
                <span className="text-[11px] truncate opacity-95">
                  {draft.mode === 'off'
                    ? 'ปิดโหมดเทศกาล — ใช้ธีมมาตรฐานโรงเรียนตลอดเวลา'
                    : draft.custom_message?.trim() || previewTheme.greeting}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/15 shrink-0">
                {draft.mode === 'auto' ? 'โหมดอัตโนมัติ' : draft.mode === 'manual' ? 'โหมดเลือกเอง' : 'ปิดธีม'}
              </span>
            </div>
          </div>

          {/* Compact 3-Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, mode: 'auto' }))}
              className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                draft.mode === 'auto'
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">อัตโนมัติตามปฏิทิน</span>
                {draft.mode === 'auto' && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">เปลี่ยนเองเมื่อถึงเทศกาล</div>
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
              className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                draft.mode === 'manual'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">เลือกธีมเอง / ทดลอง</span>
                {draft.mode === 'manual' && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">เลือกใช้ธีมด้านล่างทันที</div>
            </button>

            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, mode: 'off' }))}
              className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                draft.mode === 'off'
                  ? 'bg-slate-100 border-slate-700 ring-2 ring-slate-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">ปิดธีมเทศกาล</span>
                {draft.mode === 'off' && <Check className="w-3.5 h-3.5 text-slate-800 shrink-0" />}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">ใช้ธีมโรงเรียนตลอด</div>
            </button>
          </div>

          {/* 15-Theme Selector Grid (Immediately Visible Above the Fold!) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  เลือกธีมที่ต้องการแสดง (คลิกเลือกเพื่อพรีวิวและใช้งานได้ทันที)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                {allThemesList.length} ธีม
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allThemesList.map((themeItem) => {
                const isSelectedManual =
                  draft.mode === 'manual' && draft.manual_theme_id === themeItem.id;
                const isActiveAuto =
                  draft.mode === 'auto' && todayAutoId === themeItem.id;
                const isHighlighted = isSelectedManual || isActiveAuto;

                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        mode: 'manual',
                        manual_theme_id: themeItem.id as SeasonalThemeId,
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isHighlighted
                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${themeItem.previewSwatchClass} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <SeasonalThemeIcon iconType={themeItem.iconType} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {themeItem.name}
                        </span>
                        {isHighlighted && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {themeItem.dateDescription}
                        {todayAutoId === themeItem.id && themeItem.id !== 'default' && ' · ตรงกับวันนี้'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display Toggles & Custom Greeting */}
          {draft.mode !== 'off' && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 pr-2">
                    {draft.show_banner ? (
                      <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-800">แสดงแถบข้อความทักทาย</div>
                      <div className="text-[10px] text-slate-500">แสดงเหนือตารางและหน้า Login</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.show_banner}
                    onChange={(e) => setDraft((prev) => ({ ...prev, show_banner: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 pr-2">
                    <Sparkles className={`w-4 h-4 shrink-0 ${draft.show_particles ? 'text-amber-500' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-800">เอฟเฟกต์ลอยเบาๆ (พื้นหลัง)</div>
                      <div className="text-[10px] text-slate-500">โปร่งใส ไม่บังปุ่มและไม่บังตัวหนังสือ</div>
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

              {draft.show_banner && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    ข้อความทักทายพิเศษของโรงเรียน (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={draft.custom_message || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, custom_message: e.target.value }))}
                    placeholder="เว้นว่างเพื่อใช้ข้อความประจำเทศกาลอัตโนมัติ หรือพิมพ์ข้อความเอง..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>บันทึกแล้วอัปเดตทั้งโรงเรียน (ไม่กระทบตารางเอกสาร)</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
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
