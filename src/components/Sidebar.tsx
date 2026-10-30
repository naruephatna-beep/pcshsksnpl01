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
  Trophy,
} from 'lucide-react';
import { getDatabaseProvider } from '../services/cloudflareClient';

interface SidebarProps {
  currentTeacher: Teacher | null;
  isAdmin: boolean;
  mainView: 'executive' | 'plans';
  setMainView: (view: 'executive' | 'plans') => void;
  executiveMode?: 'standard' | 'ranking' | 'ddo';
  setExecutiveMode?: (mode: 'standard' | 'ranking' | 'ddo') => void;
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

  return (
    <div className="flex flex-col h-full bg-[#0B1329] text-slate-200 select-none">
      {/* Brand & School Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1.5 flex items-center justify-center shrink-0 border border-white/20 shadow-sm">
              <img
                src="/assets/aistudio/PCSHS_Kalasin.__th__6ef5abd0.png"
                alt="ตราสัญลักษณ์โรงเรียน"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight truncate">
                  ส่งเอกสารวิชาการ
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 shrink-0">
                  จ.ภ.
                </span>
              </div>
              <p className="text-xs text-amber-300 font-medium truncate mt-0.5">
                จ.ภ. กาฬสินธุ์
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="ปิดเมนู"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Teacher Profile Card in Sidebar */}
      <div className="p-3 mx-3 my-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm shrink-0">
        <button
          onClick={() => handleNavClick(onOpenProfileModal)}
          className="w-full flex items-center gap-3 text-left group cursor-pointer transition-all"
          title="คลิกเพื่อแก้ไขข้อมูลส่วนตัว"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs group-hover:border-amber-400 transition-colors">
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
              <span className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                {currentTeacher.Name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5 mt-0.5">
              <span className="bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-slate-700/60 text-[10px]">
                {currentTeacher.Teacher_ID}
              </span>
              <span className="truncate text-slate-400 text-[11px]">{currentTeacher.Learning_Area}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 text-xs touch-scroll scrollbar-thin scrollbar-thumb-slate-800">
        {/* Section 1: การทำงาน & เอกสาร (Workspaces) */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>พื้นที่ทำงาน (Workspace)</span>
          </div>

          <div className="space-y-1">
            {/* ภาระงานมอบหมาย (แจ้งเตือนส่งงานจาก Admin) */}
            <button
              onClick={() => {
                setMainView('plans');
                handleNavClick(onScrollToAssignments);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="truncate font-medium text-xs">ภาระงานมอบหมาย</span>
              </div>
              {pendingAssignmentsCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shrink-0">
                  รอส่ง {pendingAssignmentsCount}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 shrink-0 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ครบ</span>
                </span>
              )}
            </button>

            {/* เอกสารทั้งหมด */}
            <button
              onClick={() =>
                handleNavClick(() => {
                  setMainView('plans');
                  setViewTab('all');
                })
              }
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                mainView === 'plans' && viewTab === 'all'
                  ? 'bg-amber-400/15 text-amber-300 font-semibold border-l-2 border-amber-400 shadow-2xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
                <span className="truncate text-xs">
                  {isAdmin ? 'เอกสารทั้งหมด' : 'เอกสารของฉัน'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded shrink-0 border border-slate-700/60">
                {isAdmin ? totalPlansCount : myPlansCount}
              </span>
            </button>

            {/* Status Sub-Filters for regular teachers */}
            {!isAdmin && (
              <div className="pl-4 space-y-0.5 border-l border-slate-800 ml-4 mt-1 text-[11px]">
                <button
                  onClick={() =>
                    handleNavClick(() => {
                      setMainView('plans');
                      setViewTab('pending_review');
                    })
                  }
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    mainView === 'plans' && viewTab === 'pending_review'
                      ? 'text-amber-300 font-semibold bg-slate-800/80'
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    mainView === 'plans' && viewTab === 'approved'
                      ? 'text-emerald-300 font-semibold bg-slate-800/80'
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    mainView === 'plans' && viewTab === 'needs_revision'
                      ? 'text-rose-300 font-semibold bg-slate-800/80'
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
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  mainView === 'executive' && executiveMode === 'standard'
                    ? 'bg-amber-400/15 text-amber-300 font-semibold border-l-2 border-amber-400 shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate text-xs">แดชบอร์ดภาพรวมผู้บริหาร</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                  Stats
                </span>
              </button>

              {/* จัดอันดับกลุ่มสาระ (Leaderboard) */}
              <button
                onClick={() =>
                  handleNavClick(() => {
                    setMainView('executive');
                    if (setExecutiveMode) setExecutiveMode('ranking');
                  })
                }
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  mainView === 'executive' && executiveMode === 'ranking'
                    ? 'bg-amber-400/20 text-amber-300 font-semibold border-l-2 border-amber-400 shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate text-xs">จัดอันดับกลุ่มสาระ</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                  Rank #1
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  mainView === 'executive' && executiveMode === 'ddo'
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold border-l-2 border-indigo-400 shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrainCircuit className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate text-xs">วิเคราะห์ Data-Driven Org</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500 text-white shadow-2xs">
                  DDO
                </span>
              </button>

              {/* ศูนย์ติดตามงานรายบุคคล */}
              <button
                onClick={() => handleNavClick(onOpenAdminTrackerModal)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer group font-medium"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClipboardList className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0 transition-colors" />
                  <span className="truncate text-xs">ติดตามงานรายบุคคล</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* กำหนดส่ง & จัดการสถานะ */}
              <button
                onClick={() => handleNavClick(onOpenDeadlineManager)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer group font-medium"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0 transition-colors" />
                  <span className="truncate text-xs">กำหนดส่ง & จัดการสถานะ</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* สมุดรายชื่อบุคลากร */}
              <button
                onClick={() => handleNavClick(onOpenDirectoryModal)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer group font-medium"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0 transition-colors" />
                  <span className="truncate text-xs">ทำเนียบบุคลากร (27 ท่าน)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer / System status & Logout */}
      <div className="p-3 border-t border-slate-800/80 shrink-0 space-y-2 bg-[#090F20]">
        <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
          <div className="flex items-center gap-2 truncate text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate font-mono text-[11px]">Cloudflare D1 Online</span>
          </div>

          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer shrink-0 ml-2 text-[10px] bg-slate-800 px-2 py-1 rounded-lg border border-slate-700/80 active:scale-95 transition-all"
              title="ซิงค์ข้อมูลกับฐานข้อมูล Cloud ทันที"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>ซิงค์</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/60">
          <button
            onClick={() => handleNavClick(onOpenProfileModal)}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
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
};
