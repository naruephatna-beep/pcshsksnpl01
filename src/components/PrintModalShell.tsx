import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ArrowLeft } from 'lucide-react';

interface PrintModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  onPrint?: () => void;
  printButtonLabel?: string;
  headerActions?: React.ReactNode;
  subHeader?: React.ReactNode;
  footer?: React.ReactNode;
  orientation?: 'portrait' | 'landscape';
  paperClassName?: string;
  children: React.ReactNode;
}

export const PrintModalShell: React.FC<PrintModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  onPrint,
  printButtonLabel = 'พิมพ์เอกสาร / บันทึก PDF',
  headerActions,
  subHeader,
  footer,
  orientation = 'portrait',
  paperClassName = 'p-6 sm:p-10 md:p-12 space-y-6',
  children,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Manage body.has-print-modal class with ref counting so nested portals never conflict
  useEffect(() => {
    if (!isOpen) return;

    const currentCount = Number(document.body.dataset.printModalCount || '0') + 1;
    document.body.dataset.printModalCount = String(currentCount);
    document.body.classList.add('has-print-modal');

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const nextCount = Math.max(0, Number(document.body.dataset.printModalCount || '1') - 1);
      if (nextCount === 0) {
        delete document.body.dataset.printModalCount;
        document.body.classList.remove('has-print-modal');
        document.body.style.overflow = prevOverflow;
      } else {
        document.body.dataset.printModalCount = String(nextCount);
      }
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const maxPaperWidth = orientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[120] flex flex-col bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150 print-modal-portal"
    >
      {/* PINNED TOP CONTROL BAR — Always visible at top of viewport, hidden when printing */}
      <div className="shrink-0 print:hidden bg-[#0B1329] text-white px-3 sm:px-6 py-3 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 sm:hidden"
            title="ย้อนกลับ / ปิดหน้าพิมพ์"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ออก</span>
          </button>

          <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 hidden sm:flex items-center justify-center shrink-0">
            {icon || <Printer className="w-4 h-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[260px] sm:max-w-md md:max-w-xl">
                {title}
              </h2>
              {badge && (
                <span className="text-[11px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md font-bold shrink-0">
                  {badge}
                </span>
              )}
              <span className="hidden md:inline-block text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-semibold shrink-0">
                {orientation === 'landscape' ? 'แบบฟอร์ม A4 แนวนอน' : 'แบบฟอร์ม A4 แนวตั้ง'}
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-400 truncate max-w-xl hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {headerActions}

          <button
            type="button"
            onClick={handlePrintClick}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{printButtonLabel}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-600 text-rose-100 hover:text-white border border-rose-400/40 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="ปิดหน้าต่างพิมพ์ (หรือกด Esc)"
          >
            <X className="w-4 h-4 shrink-0" />
            <span>ปิด / ออก</span>
          </button>
        </div>
      </div>

      {/* OPTIONAL PINNED SUB-TOOLBAR (e.g. filters or email feedback banner) */}
      {subHeader && (
        <div className="shrink-0 print:hidden">
          {subHeader}
        </div>
      )}

      {/* SCROLLABLE PAPER DESK — Click outside sheet to close */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex-1 min-h-0 overflow-y-auto bg-slate-300/90 p-3 sm:p-6 md:p-8 print-scroll-container"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${maxPaperWidth} mx-auto bg-white text-slate-900 shadow-2xl border border-slate-300/90 rounded-sm print-paper-sheet font-['Sarabun',sans-serif] ${paperClassName}`}
        >
          {children}
        </div>
      </div>

      {/* OPTIONAL PINNED BOTTOM FOOTER (e.g. Open Certificate button) */}
      {footer && (
        <div className="shrink-0 print:hidden">
          {footer}
        </div>
      )}
    </div>,
    document.body
  );
};
