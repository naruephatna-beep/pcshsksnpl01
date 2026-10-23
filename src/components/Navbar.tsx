import React, { useState } from 'react';
import { Teacher, isTeacherAdmin } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  Upload,
  Users,
  LogOut,
  ClipboardList,
  Calendar,
  BarChart3,
  Bell,
  Menu,
  X,
  User,
  ShieldCheck,
  PlusCircle,
  Database,
  Cloud,
} from 'lucide-react';
import { getDatabaseProvider } from '../services/cloudflareClient';

interface NavbarProps {
  currentTeacher: Teacher | null;
  isSupabaseConnected?: boolean;
  onOpenSubmitModal: () => void;
  onOpenProfileModal: () => void;
  onOpenDirectoryModal: () => void;
  onOpenFileStorageModal?: () => void;
  onOpenAdminTrackerModal: () => void;
  onOpenDeadlineManager?: () => void;
  onOpenExecutiveDashboard?: () => void;
  onLogout: () => void;
  lastSyncTime?: string;
  isSyncing?: boolean;
  onManualSync?: () => void;
  pendingAssignmentsCount?: number;
  onScrollToAssignments?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTeacher,
  onOpenSubmitModal,
  onOpenProfileModal,
  onOpenDirectoryModal,
  onOpenAdminTrackerModal,
  onOpenDeadlineManager,
  onOpenExecutiveDashboard,
  onLogout,
  pendingAssignmentsCount,
  onScrollToAssignments,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const photoUrl = currentTeacher ? formatGoogleDriveImageUrl(currentTeacher.photo) : '';
  const isAdmin = isTeacherAdmin(currentTeacher);

  const handleMobileAction = (action: () => void) => {
    setIsMobileMenuOpen(false);
    action();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & School Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <img
              src="/logo.svg"
              alt="ตราสัญลักษณ์โรงเรียน"
              className="h-10 w-auto sm:h-13 object-contain shrink-0 drop-shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
                  ระบบส่งแผนการสอน
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-900 border border-amber-400/30 shrink-0">
                  จ.ภ. กาฬสินธุ์
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[180px] sm:max-w-md">
                โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Controls */}
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
            {currentTeacher && (
              <>
                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    {onOpenExecutiveDashboard && (
                      <button
                        onClick={onOpenExecutiveDashboard}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer active:scale-95"
                        title="แดชบอร์ดฝ่ายบริหาร สถิติและกราฟวิเคราะห์"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>แดชบอร์ดบริหาร</span>
                      </button>
                    )}

                    {onOpenDeadlineManager && (
                      <button
                        onClick={onOpenDeadlineManager}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50 shadow-2xs cursor-pointer active:scale-95"
                        title="กำหนดช่วงเวลาส่งของแต่ละประเภทเอกสาร"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>กำหนดส่ง & สถานะ</span>
                      </button>
                    )}

                    <button
                      onClick={onOpenAdminTrackerModal}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50 shadow-2xs cursor-pointer active:scale-95"
                      title="ติดตามดูว่าใครส่งแผนแล้วบ้างแยกตามกลุ่มสาระ"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
                      <span>ติดตามส่งแผน</span>
                    </button>

                    <button
                      onClick={onOpenDirectoryModal}
                      className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-600" />
                      <span>บุคลากร</span>
                    </button>
                  </div>
                )}

                {/* Notification Bell for Regular Teachers */}
                {!isAdmin && onScrollToAssignments && (
                  <button
                    onClick={onScrollToAssignments}
                    className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    title={
                      pendingAssignmentsCount && pendingAssignmentsCount > 0
                        ? `มีภาระงานที่ Admin มอบหมายรอส่ง ${pendingAssignmentsCount} รายการ`
                        : 'ส่งเอกสารที่ได้รับมอบหมายครบทุกรายการแล้ว'
                    }
                  >
                    <Bell className="w-5 h-5 text-slate-700" />
                    {pendingAssignmentsCount !== undefined && pendingAssignmentsCount > 0 ? (
                      <span className="absolute 1 top-1 right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                        {pendingAssignmentsCount}
                      </span>
                    ) : (
                      <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                    )}
                  </button>
                )}

                {/* Primary Action: Submit Plan for Teachers (Style 4: Energetic Amber-Orange) */}
                {!isAdmin && (
                  <button
                    onClick={onOpenSubmitModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-950" />
                    <span>ส่งเอกสาร</span>
                  </button>
                )}

                {/* Teacher Profile trigger */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <button
                    onClick={onOpenProfileModal}
                    className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                    title="คลิกเพื่อแก้ไขข้อมูลส่วนตัว"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                        <span className="text-xs font-bold text-slate-700">
                          {getInitials(currentTeacher.Name)}
                        </span>
                      )}
                    </div>

                    <div className="hidden lg:block">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span>{currentTeacher.Name}</span>
                        <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-200/60 px-1 rounded">
                          {currentTeacher.Teacher_ID}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate max-w-[130px]">
                        {currentTeacher.Learning_Area}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Right Controls (< md screens) */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Quick Submit button on mobile for regular teachers */}
            {currentTeacher && !isAdmin && (
              <button
                onClick={onOpenSubmitModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-xl text-xs font-bold shadow-xs active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>ส่งงาน</span>
              </button>
            )}

            {/* Notification bell on mobile */}
            {currentTeacher && !isAdmin && onScrollToAssignments && (
              <button
                onClick={onScrollToAssignments}
                className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5" />
                {pendingAssignmentsCount !== undefined && pendingAssignmentsCount > 0 ? (
                  <span className="absolute 0.5 top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-amber-500 text-slate-950 rounded-full text-[9px] font-extrabold flex items-center justify-center">
                    {pendingAssignmentsCount}
                  </span>
                ) : (
                  <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
            )}

            {/* Hamburger Menu Button */}
            {currentTeacher && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
                aria-label="เมนูหลัก"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && currentTeacher && (
          <div className="md:hidden py-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Teacher profile card */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
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
                    <span className="text-xs font-bold text-slate-700">
                      {getInitials(currentTeacher.Name)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{currentTeacher.Name}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-1 rounded">
                      {currentTeacher.Teacher_ID}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {currentTeacher.Learning_Area}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleMobileAction(onOpenProfileModal)}
                className="text-xs font-bold text-slate-800 hover:underline px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs"
              >
                แก้ไข
              </button>
            </div>

            {/* Admin Controls on Mobile */}
            {isAdmin && (
              <div className="space-y-1.5 mb-3">
                <div className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                  เมนูผู้ดูแลระบบ (Admin Hub)
                </div>
                {onOpenExecutiveDashboard && (
                  <button
                    onClick={() => handleMobileAction(onOpenExecutiveDashboard)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs"
                  >
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span>แดชบอร์ดฝ่ายบริหาร & กราฟสถิติ</span>
                  </button>
                )}
                {onOpenDeadlineManager && (
                  <button
                    onClick={() => handleMobileAction(onOpenDeadlineManager)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50"
                  >
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>กำหนดวันเวลาส่ง & จัดการสถานะ</span>
                  </button>
                )}
                <button
                  onClick={() => handleMobileAction(onOpenAdminTrackerModal)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50"
                >
                  <ClipboardList className="w-4 h-4 text-slate-600" />
                  <span>เปิดตารางติดตามการส่งแผน</span>
                </button>
                <button
                  onClick={() => handleMobileAction(onOpenDirectoryModal)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50"
                >
                  <Users className="w-4 h-4 text-slate-600" />
                  <span>สมุดรายชื่อบุคลากร (27 ท่าน)</span>
                </button>
              </div>
            )}

            {/* Regular Teacher Actions on Mobile */}
            {!isAdmin && (
              <div className="space-y-2 mb-3">
                <button
                  onClick={() => handleMobileAction(onOpenSubmitModal)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-xl text-sm shadow-md active:scale-98 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>ส่งเอกสารแผนการสอน</span>
                </button>

                {onScrollToAssignments && (
                  <button
                    onClick={() => handleMobileAction(onScrollToAssignments)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <span>ภาระงานที่ Admin มอบหมาย</span>
                    </div>
                    {pendingAssignmentsCount !== undefined && pendingAssignmentsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                        รอส่ง {pendingAssignmentsCount} รายการ
                      </span>
                    ) : (
                      <span className="text-emerald-600 text-[11px] font-bold">ส่งครบแล้ว ✓</span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={() => handleMobileAction(onLogout)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
