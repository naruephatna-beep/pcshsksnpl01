import React from 'react';
import { Teacher, isTeacherAdmin, isTeacherExecutive } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  FileText,
  BarChart3,
  ClipboardList,
  Calendar,
  Users,
  Bell,
  Upload,
  Plus,
  LogOut,
  User,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ChevronRight,
  ExternalLink,
  BrainCircuit,
  Database,
  Cloud,
} from 'lucide-react';
import { getDatabaseProvider } from '../services/cloudflareClient';

interface SidebarProps {
  currentTeacher: Teacher | null;
  isAdmin: boolean;
  mainView: 'executive' | 'plans';
  setMainView: (view: 'executive' | 'plans') => void;
  executiveMode?: 'standard' | 'ddo';
  setExecutiveMode?: (mode: 'standard' | 'ddo') => void;
  viewTab: string;
  setViewTab: (tab: any) => void;
  pendingAssignmentsCount?: number;
  totalPlansCount: number;
  myPlansCount: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSubmitModal: () => void;
  onOpenProfileModal: () => void;
  onOpenDirectoryModal: () => void;
  onOpenAdminTrackerModal: () => void;
  onOpenDeadlineManager: () => void;
  onOpenDatabaseModal?: () => void;
  onScrollToAssignments: () => void;
  onLogout: () => void;
  lastSyncTime?: string;
  isSyncing?: boolean;
  onManualSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTeacher,
  isAdmin,
  mainView,
  setMainView,
  executiveMode = 'standard',
  setExecutiveMode,
  viewTab,
  setViewTab,
  pendingAssignmentsCount = 0,
  totalPlansCount,
  myPlansCount,
  isMobileOpen,
  onCloseMobile,
  onOpenSubmitModal,
  onOpenProfileModal,
  onOpenDirectoryModal,
  onOpenAdminTrackerModal,
  onOpenDeadlineManager,
  onOpenDatabaseModal,
  onScrollToAssignments,
  onLogout,
  lastSyncTime,
  isSyncing,
  onManualSync,
}) => {
  if (!currentTeacher) return null;

  const photoUrl = formatGoogleDriveImageUrl(currentTeacher.photo);
  const isExecutive = isTeacherExecutive(currentTeacher);

  const handleNavClick = (callback: () => void) => {
    callback();
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0B1329] text-slate-200 select-none">
      {/* Brand & School Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/15 shadow-inner">
              <img
                src="/logo.svg"
                alt="ตราสัญลักษณ์โรงเรียน"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight truncate">
                  ระบบส่งแผนการสอน
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-slate-950 shrink-0">
                  PCSHS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                จ.ภ. กาฬสินธุ์
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary CTA Button: สีแสดทอง (#F59E0B) โดดเด่น มองเห็นทันทีตั้งแต่เปิดเว็บ */}
        {!isAdmin && (
          <div className="mt-4">
            <button
              onClick={() => handleNavClick(onOpenSubmitModal)}
              className="w-full py-2.5 px-4 bg-[#F59E0B] hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-950" />
              <span>ส่งเอกสารแผนการสอน</span>
            </button>
          </div>
        )}
      </div>

      {/* Teacher Profile Card in Sidebar */}
      <div className="p-3 mx-3 my-3 bg-slate-900/90 rounded-2xl border border-slate-800 shrink-0">
        <button
          onClick={() => handleNavClick(onOpenProfileModal)}
          className="w-full flex items-center gap-2.5 text-left group cursor-pointer"
          title="คลิกเพื่อแก้ไขข้อมูลส่วนตัว"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={currentTeacher.Name}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-amber-400">
                {getInitials(currentTeacher.Name)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                {currentTeacher.Name}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
              <span className="bg-slate-800 px-1 rounded text-amber-300 font-semibold">
                {currentTeacher.Teacher_ID}
              </span>
              <span className="truncate">{currentTeacher.Learning_Area}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 text-xs touch-scroll scrollbar-thin scrollbar-thumb-slate-800">
        {/* Section 1: การทำงาน & เอกสาร (Workspaces) */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            พื้นที่ทำงาน (Workspace)
          </div>

          <div className="space-y-1">
            {/* ภาระงานมอบหมาย (แจ้งเตือนส่งงานจาก Admin) */}
            <button
              onClick={() => {
                setMainView('plans');
                handleNavClick(onScrollToAssignments);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate font-medium">ภาระงานมอบหมาย</span>
              </div>
              {pendingAssignmentsCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-xs shrink-0">
                  รอส่ง {pendingAssignmentsCount}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ครบ</span>
                </span>
              )}
            </button>

            {/* แผนการสอนทั้งหมด */}
            <button
              onClick={() =>
                handleNavClick(() => {
                  setMainView('plans');
                  setViewTab('all');
                })
              }
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                mainView === 'plans' && viewTab === 'all'
                  ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
                <span className="truncate font-medium">
                  {isAdmin ? 'รายการแผนทั้งหมด' : 'แผนของฉัน'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                {isAdmin ? totalPlansCount : myPlansCount}
              </span>
            </button>

            {/* Status Sub-Filters for regular teachers */}
            {!isAdmin && (
              <div className="pl-6 space-y-0.5 border-l border-slate-800/80 ml-3 mt-1 text-[11px]">
                <button
                  onClick={() =>
                    handleNavClick(() => {
                      setMainView('plans');
                      setViewTab('pending_review');
                    })
                  }
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    mainView === 'plans' && viewTab === 'pending_review'
                      ? 'text-amber-400 font-bold bg-slate-800/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>รอการตรวจ</span>
                  </span>
                </button>

                <button
                  onClick={() =>
                    handleNavClick(() => {
                      setMainView('plans');
                      setViewTab('approved');
                    })
                  }
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    mainView === 'plans' && viewTab === 'approved'
                      ? 'text-emerald-400 font-bold bg-slate-800/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>อนุมัติแล้ว</span>
                  </span>
                </button>

                <button
                  onClick={() =>
                    handleNavClick(() => {
                      setMainView('plans');
                      setViewTab('needs_revision');
                    })
                  }
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    mainView === 'plans' && viewTab === 'needs_revision'
                      ? 'text-rose-400 font-bold bg-slate-800/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>ส่งกลับแก้ไข</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: ฝ่ายบริหาร & ผู้ดูแลระบบ (Admin Hub) */}
        {isAdmin && (
          <div>
            <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>การบริหาร & ตรวจสอบ</span>
            </div>

            <div className="space-y-1">
              {/* แดชบอร์ดภาพรวมผู้บริหาร */}
              <button
                onClick={() =>
                  handleNavClick(() => {
                    setMainView('executive');
                    if (setExecutiveMode) setExecutiveMode('standard');
                  })
                }
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                  mainView === 'executive' && executiveMode === 'standard'
                    ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate font-medium">แดชบอร์ดภาพรวมผู้บริหาร</span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                  Stats
                </span>
              </button>

              {/* วิเคราะห์ Data-Driven Org (DDO) */}
              <button
                onClick={() =>
                  handleNavClick(() => {
                    setMainView('executive');
                    if (setExecutiveMode) setExecutiveMode('ddo');
                  })
                }
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                  mainView === 'executive' && executiveMode === 'ddo'
                    ? 'bg-indigo-500/25 text-indigo-300 font-bold border border-indigo-400/40 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrainCircuit className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate font-medium">วิเคราะห์ Data-Driven Org</span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500 text-white shadow-xs">
                  DDO
                </span>
              </button>

              {/* ศูนย์ติดตามส่งแผนรายบุคคล */}
              <button
                onClick={() => handleNavClick(onOpenAdminTrackerModal)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClipboardList className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">ติดตามส่งแผนรายบุคคล</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {/* กำหนดส่ง & จัดการสถานะ */}
              <button
                onClick={() => handleNavClick(onOpenDeadlineManager)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">กำหนดส่ง & จัดการสถานะ</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {/* สมุดรายชื่อบุคลากร */}
              <button
                onClick={() => handleNavClick(onOpenDirectoryModal)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">ทำเนียบบุคลากร (27 ท่าน)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {/* จัดการฐานข้อมูล Cloudflare D1 / Supabase */}
              {onOpenDatabaseModal && (
                <button
                  onClick={() => handleNavClick(onOpenDatabaseModal)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-orange-300 hover:text-white hover:bg-orange-950/40 border border-orange-500/25 transition-colors cursor-pointer"
                  title="ตั้งค่าและย้ายฐานข้อมูล Cloudflare D1 / Supabase"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Cloud className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="truncate font-medium">จัดการฐานข้อมูล (Cloudflare)</span>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-orange-500 text-slate-950">
                    {getDatabaseProvider() === 'cloudflare' ? 'D1' : 'SQL'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / System status & Logout */}
      <div className="p-3 border-t border-slate-800/80 shrink-0 space-y-2">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-400">
          {onOpenDatabaseModal ? (
            <button
              onClick={() => handleNavClick(onOpenDatabaseModal)}
              className="flex items-center gap-1.5 hover:text-orange-300 transition-colors cursor-pointer truncate"
              title="คลิกเพื่อจัดการและย้ายฐานข้อมูล Cloudflare D1 / Supabase"
            >
              <Cloud className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="truncate">
                {getDatabaseProvider() === 'cloudflare' ? 'Cloudflare D1' : 'Supabase SQL'}
              </span>
            </button>
          ) : (
            <span className="truncate">ซิงค์: {lastSyncTime || 'ระบบออฟไลน์'}</span>
          )}

          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer shrink-0 ml-2"
              title="ซิงค์ข้อมูลกับฐานข้อมูล Cloud ทันที"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>ซิงค์</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
          <button
            onClick={() => handleNavClick(onOpenProfileModal)}
            className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">ข้อมูลส่วนตัว</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (md+) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col shrink-0 h-screen sticky top-0 z-30 border-r border-slate-800 shadow-2xl">
        {content}
      </aside>

      {/* Mobile Slide-over Drawer (< md) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
          />

          {/* Drawer container */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
