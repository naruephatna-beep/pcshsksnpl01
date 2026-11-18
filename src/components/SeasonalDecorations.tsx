import React from 'react';
import {
  Sparkles,
  Heart,
  Droplets,
  Atom,
  Crown,
  BookOpen,
  Star,
  Flame,
  Trees,
  Flower2,
  GraduationCap,
  SlidersHorizontal,
  X,
  Ghost,
} from 'lucide-react';
import { SeasonalThemeMeta, SeasonalThemeConfig } from '../services/seasonalThemeService';

interface SeasonalIconProps {
  iconType: SeasonalThemeMeta['iconType'];
  className?: string;
}

export const SeasonalThemeIcon: React.FC<SeasonalIconProps> = ({ iconType, className = 'w-4 h-4' }) => {
  switch (iconType) {
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    case 'lantern':
    case 'flame':
      return <Flame className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'droplet':
      return <Droplets className={className} />;
    case 'flower':
      return <Flower2 className={className} />;
    case 'atom':
      return <Atom className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'pumpkin':
      return <Ghost className={className} />;
    case 'tree':
      return <Trees className={className} />;
    case 'ribbon':
      return <GraduationCap className={className} />;
    default:
      return <GraduationCap className={className} />;
  }
};

interface ParticleSpec {
  left: string;
  duration: string;
  delay: string;
  size: number;
  opacity: number;
}

const PARTICLE_SPECS: ParticleSpec[] = [
  { left: '4%', duration: '15s', delay: '0s', size: 14, opacity: 0.28 },
  { left: '12%', duration: '19s', delay: '-4s', size: 11, opacity: 0.22 },
  { left: '21%', duration: '17s', delay: '-9s', size: 15, opacity: 0.26 },
  { left: '33%', duration: '21s', delay: '-2s', size: 12, opacity: 0.2 },
  { left: '47%', duration: '16s', delay: '-11s', size: 14, opacity: 0.22 },
  { left: '58%', duration: '20s', delay: '-6s', size: 11, opacity: 0.2 },
  { left: '69%', duration: '18s', delay: '-14s', size: 15, opacity: 0.25 },
  { left: '78%', duration: '15s', delay: '-3s', size: 12, opacity: 0.24 },
  { left: '87%', duration: '22s', delay: '-8s', size: 14, opacity: 0.28 },
  { left: '94%', duration: '16s', delay: '-12s', size: 12, opacity: 0.26 },
];

function renderParticleSvg(mode: SeasonalThemeMeta['particleMode'], size: number) {
  switch (mode) {
    case 'snow':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </svg>
      );
    case 'hearts':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-rose-400">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case 'water':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-cyan-500">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    case 'atoms':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-indigo-500">
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-30 12 12)" />
        </svg>
      );
    case 'halloween':
      return (
        <svg width={size + 2} height={size + 2} viewBox="0 0 24 24" fill="currentColor" className="text-orange-500">
          <path d="M22 10c-2.5 0-4.4 1.3-5.2 3.1-.5-1.9-1.9-3.4-3.8-4l1-2.1h-4l1 2.1c-1.9.6-3.3 2.1-3.8 4C6.4 11.3 4.5 10 2 10c0 3.6 2.6 6.5 6 6.9.7 1.3 2.2 2.1 4 2.1s3.3-.8 4-2.1c3.4-.4 6-3.3 6-6.9z" />
        </svg>
      );
    case 'lanterns':
      return (
        <svg width={size + 2} height={size + 4} viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
          <path d="M7 4h10l2 6v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6l2-6z" />
          <rect x="9" y="19" width="6" height="2" rx="1" className="text-amber-600" />
        </svg>
      );
    case 'petals':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
          <path d="M12 2C9.5 6 7 9.5 7 13a5 5 0 0 0 10 0c0-3.5-2.5-7-5-11z" />
        </svg>
      );
    default: // sparkles
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
      );
  }
}

export const SeasonalParticlesOverlay: React.FC<{
  theme: SeasonalThemeMeta;
  enabled: boolean;
}> = ({ theme, enabled }) => {
  if (!enabled || theme.id === 'default' || theme.particleMode === 'none') {
    return null;
  }

  const isUpward = theme.particleMode === 'lanterns';

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-10 overflow-hidden print:hidden"
      aria-hidden="true"
    >
      {PARTICLE_SPECS.map((p, idx) => (
        <div
          key={idx}
          className={`absolute top-0 ${isUpward ? 'animate-seasonal-float-up' : 'animate-seasonal-fall'}`}
          style={{
            left: p.left,
            animationDuration: p.duration,
            animationDelay: p.delay,
            opacity: p.opacity,
          }}
        >
          {renderParticleSvg(theme.particleMode, p.size)}
        </div>
      ))}
    </div>
  );
};

interface SeasonalBannerBarProps {
  theme: SeasonalThemeMeta;
  config: SeasonalThemeConfig;
  isAdmin: boolean;
  isDismissed: boolean;
  onDismiss: () => void;
  onOpenSettings: () => void;
}

export const SeasonalBannerBar: React.FC<SeasonalBannerBarProps> = ({
  theme,
  config,
  isAdmin,
  isDismissed,
  onDismiss,
  onOpenSettings,
}) => {
  if (isDismissed || !config.show_banner || theme.id === 'default') {
    return null;
  }

  const displayText = config.custom_message?.trim() || theme.greeting;

  return (
    <div
      className={`print:hidden px-3 sm:px-6 py-2 border-b ${theme.bannerBgClass} ${theme.bannerBorderClass} ${theme.bannerTextClass}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${theme.accentBadgeClass}`}
          >
            <SeasonalThemeIcon iconType={theme.iconType} className="w-3.5 h-3.5" />
            <span>{theme.shortLabel}</span>
          </span>
          <p className="text-xs font-medium truncate">{displayText}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
              title="ตั้งค่าธีมตามเทศกาล"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden sm:inline">ปรับธีม</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="ซ่อนแถบเทศกาลชั่วคราว (ไม่กระทบการใช้งาน)"
            aria-label="ซ่อนแถบเทศกาล"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
