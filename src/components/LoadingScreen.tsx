import React, { useEffect, useState } from 'react';

import { SEASONAL_THEMES, SeasonalThemeMeta } from '../services/seasonalThemeService';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  seasonalTheme?: SeasonalThemeMeta;
}

const LOADING_PHASES = [
  'เชื่อมต่อฐานข้อมูลระบบ',
  'ตรวจสอบสิทธิ์ผู้ใช้งาน',
  'จัดเตรียมข้อมูลวิชาการ',
] as const;

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'กำลังโหลดข้อมูลระบบ...',
  subMessage = 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์',
  seasonalTheme,
}) => {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const theme = seasonalTheme || SEASONAL_THEMES.default;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhaseIdx((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${theme.loginBgClass} ${
        theme.grayscaleRoot ? 'grayscale-[85%]' : ''
      } text-white font-['Prompt',sans-serif] px-6 overflow-hidden select-none`}
    >
      {/* Architectural Grid Stage with Soft Radial Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_65%_65%_at_50%_48%,#000_25%,transparent_100%)]"
      />

      {/* Focused Ceremonial Seasonal Spotlight Behind Emblem */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 42%, rgba(${theme.loginHaloRgb}, 0.16) 0%, rgba(${theme.loginHaloRgb}, 0.04) 28%, transparent 60%)`,
        }}
      />

      {/* Corner Precision Reticles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-5 sm:inset-8">
        <div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-amber-400/35" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-amber-400/35" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-amber-400/35" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-amber-400/35" />
      </div>

      {/* Main Centered Monument */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full mx-auto">
        {/* Multi-Ring Scientific Orbital Astrolabe */}
        <div className="relative w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center mb-7">
          {/* Ring 1 (Outermost): Precision Degree Ticks & Cardinal Markers */}
          <svg
            viewBox="0 0 280 280"
            className="absolute inset-0 w-full h-full animate-orbit-slow text-amber-400/35"
            aria-hidden="true"
          >
            <circle
              cx="140"
              cy="140"
              r="134"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="2 7"
            />
            <circle
              cx="140"
              cy="140"
              r="122"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeOpacity="0.4"
            />
            {/* 4 Cardinal Diamond Ticks */}
            <polygon points="140,2 143,8 140,14 137,8" fill="#FBBF24" fillOpacity="0.85" />
            <polygon points="140,266 143,272 140,278 137,272" fill="#FBBF24" fillOpacity="0.85" />
            <polygon points="2,140 8,137 14,140 8,143" fill="#FBBF24" fillOpacity="0.85" />
            <polygon points="266,140 272,137 278,140 272,143" fill="#FBBF24" fillOpacity="0.85" />
          </svg>

          {/* Ring 2 (Middle): Counter-Rotating Orbital Trajectory + Satellite Nodes */}
          <svg
            viewBox="0 0 224 224"
            className="absolute w-48 h-48 sm:w-56 sm:h-56 animate-orbit-reverse"
            aria-hidden="true"
          >
            <circle
              cx="112"
              cy="112"
              r="106"
              fill="none"
              stroke="#FBBF24"
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeDasharray="18 8 4 8"
            />
            {/* Primary Orbiting Node */}
            <circle cx="112" cy="6" r="3.5" fill="#FDE68A" />
            <circle cx="112" cy="6" r="7" fill="#FBBF24" fillOpacity="0.25" />
            {/* Counter Orbiting Node */}
            <circle cx="112" cy="218" r="2.5" fill="#F59E0B" fillOpacity="0.85" />
          </svg>

          {/* Ring 3 (Inner): Specular Gold Sweeping Arc */}
          <svg
            viewBox="0 0 176 176"
            className="absolute w-38 h-38 sm:w-44 sm:h-44 animate-orbit-medium"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="crestGoldArc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="88"
              cy="88"
              r="83"
              fill="none"
              stroke="url(#crestGoldArc)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray="140 380"
            />
          </svg>

          {/* Center Official School Emblem Pedestal */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0B1329]/95 border border-amber-400/45 flex items-center justify-center p-4 animate-crest-breathe">
            {/* Subtle Inner Metallic Rim */}
            <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />
            <img
              src="/logo.svg"
              alt="ตราสัญลักษณ์โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
              className="w-full h-full object-contain drop-shadow-[0_4px_14px_rgba(251,191,36,0.22)] pointer-events-none"
            />
          </div>
        </div>

        {/* Institutional Eyebrow Label */}
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold text-amber-300/90 mb-3">
          Academic Document Portal · PCSHS Kalasin
        </p>

        {/* Expanding Gold Ornamental Rule */}
        <div className="relative flex items-center justify-center w-48 sm:w-56 mb-4 animate-line-expand">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/75 to-transparent" />
          <div className="absolute w-2 h-2 rotate-45 bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
        </div>

        {/* Main Loading Title */}
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-1.5">
          {message}
        </h2>

        {/* School Name Subtitle */}
        <p className="text-xs sm:text-sm text-slate-300 font-normal mb-7">
          {subMessage}
        </p>

        {/* Precision Specular Gold Progress Rail */}
        <div className="w-60 sm:w-72 h-1.5 bg-slate-800/90 rounded-full overflow-hidden ring-1 ring-white/10 relative mb-4">
          <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-500 animate-gold-sweep shadow-[0_0_14px_rgba(251,191,36,0.75)]" />
        </div>

        {/* Minimal 3-Phase Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-[11px] flex-wrap">
          {LOADING_PHASES.map((label, idx) => {
            const isActive = idx === phaseIdx;
            const isPassed = idx < phaseIdx;
            return (
              <React.Fragment key={label}>
                <span
                  className={`inline-flex items-center gap-1.5 transition-colors duration-300 ${
                    isActive
                      ? 'text-amber-300 font-semibold'
                      : isPassed
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-amber-400 scale-125 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                        : isPassed
                        ? 'bg-emerald-400/80'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span>{label}</span>
                </span>
                {idx < LOADING_PHASES.length - 1 && (
                  <span className="text-slate-700" aria-hidden="true">
                    ·
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
