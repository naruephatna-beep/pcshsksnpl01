import React from 'react';
import { Home, FileText, Plus, UserCheck, User } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: 'all' | 'my' | 'assigned_to_me') => void;
  onOpenSubmit: () => void;
  onOpenProfile: () => void;
  assignedReviewCount?: number;
  canReview?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenSubmit,
  onOpenProfile,
  assignedReviewCount = 0,
  canReview = true,
}) => {
  return (
    <nav
      aria-label="เมนูหลักสำหรับมือถือ"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
        {/* Tab 1: หน้าหลัก */}
        <button
          type="button"
          onClick={() => onSelectTab('all')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors cursor-pointer active:scale-95 ${
            currentTab === 'all'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${currentTab === 'all' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1 leading-none">หน้าหลัก</span>
        </button>

        {/* Tab 2: งานของฉัน */}
        <button
          type="button"
          onClick={() => onSelectTab('my')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors cursor-pointer active:scale-95 ${
            currentTab === 'my'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <FileText className={`w-5 h-5 ${currentTab === 'my' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1 leading-none">งานของฉัน</span>
        </button>

        {/* Tab 3: Center Elevated Submit Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenSubmit}
            aria-label="ส่งแผนการสอนหรือภาระงานใหม่"
            className="w-12 h-12 -mt-4 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-white cursor-pointer active:scale-90 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Tab 4: งานตรวจ (พร้อม Badge แจ้งเตือน) */}
        <button
          type="button"
          onClick={() => onSelectTab('assigned_to_me')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors relative cursor-pointer active:scale-95 ${
            currentTab === 'assigned_to_me'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <UserCheck className={`w-5 h-5 ${currentTab === 'assigned_to_me' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {assignedReviewCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow-xs">
                {assignedReviewCount > 99 ? '99+' : assignedReviewCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">งานตรวจ</span>
        </button>

        {/* Tab 5: โปรไฟล์ */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center min-h-[48px] py-1 text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer active:scale-95"
        >
          <User className="w-5 h-5 stroke-2" />
          <span className="text-[10px] mt-1 leading-none">โปรไฟล์</span>
        </button>
      </div>
    </nav>
  );
};
