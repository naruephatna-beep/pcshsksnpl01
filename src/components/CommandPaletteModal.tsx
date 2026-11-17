import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LessonPlan, Teacher, isTeacherAdmin } from '../types';
import { getPlanStatusInfo } from '../utils/deadlineUtils';
import {
  Search,
  X,
  FileText,
  Users,
  PlusCircle,
  UserCheck,
  BarChart3,
  Workflow,
  Building2,
  Calendar,
  User,
  ArrowRight,
  CornerDownLeft,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';

interface CommandItem {
  id: string;
  group: 'actions' | 'plans' | 'teachers';
  title: string;
  subtitle: string;
  meta?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeacher: Teacher;
  isAdmin: boolean;
  plans: LessonPlan[];
  teachers: Teacher[];
  assignedToMeCount: number;
  onOpenSubmit: () => void;
  onJumpToReviewQueue: () => void;
  onJumpToMyPlans: () => void;
  onOpenProfile: () => void;
  onOpenDirectory: () => void;
  onOpenPlanReview: (plan: LessonPlan) => void;
  onFilterBySearch: (query: string) => void;
  onOpenExecutive?: () => void;
  onOpenWorkflowManager?: () => void;
  onOpenStaffStructure?: () => void;
  onOpenReviewerWorkload?: () => void;
  onOpenDeadlineManager?: () => void;
  onOpenAdminTracker?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  currentTeacher,
  isAdmin,
  plans,
  teachers,
  assignedToMeCount,
  onOpenSubmit,
  onJumpToReviewQueue,
  onJumpToMyPlans,
  onOpenProfile,
  onOpenDirectory,
  onOpenPlanReview,
  onFilterBySearch,
  onOpenExecutive,
  onOpenWorkflowManager,
  onOpenStaffStructure,
  onOpenReviewerWorkload,
  onOpenDeadlineManager,
  onOpenAdminTracker,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const items: CommandItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: CommandItem[] = [];

    // 1. Quick Actions
    const baseActions: CommandItem[] = [
      {
        id: 'act-submit',
        group: 'actions',
        title: 'ส่งแผนการสอน / เอกสารวิชาการใหม่',
        subtitle: 'เปิดแบบฟอร์มส่งเอกสารเข้าสู่ระบบ',
        meta: 'คำสั่งด่วน',
        icon: <PlusCircle className="w-4 h-4 text-amber-600" />,
        onSelect: () => {
          onClose();
          onOpenSubmit();
        },
      },
      {
        id: 'act-review-queue',
        group: 'actions',
        title: `เอกสารที่รอฉันตรวจ (${assignedToMeCount})`,
        subtitle: 'เปิดคิวตรวจเอกสารที่ได้รับมอบหมาย',
        meta: 'งานตรวจ',
        icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
        onSelect: () => {
          onClose();
          onJumpToReviewQueue();
        },
      },
      {
        id: 'act-my-plans',
        group: 'actions',
        title: isAdmin ? 'รายการเอกสารทั้งหมดในระบบ' : 'ดูเอกสารของฉันทั้งหมด',
        subtitle: 'สลับไปยังหน้าตารางและการ์ดรายการเอกสาร',
        meta: 'มุมมอง',
        icon: <FileText className="w-4 h-4 text-slate-600" />,
        onSelect: () => {
          onClose();
          onJumpToMyPlans();
        },
      },
      {
        id: 'act-directory',
        group: 'actions',
        title: `ทำเนียบบุคลากร (${teachers.length} ท่าน)`,
        subtitle: 'ดูรายชื่อครู กลุ่มสาระ และช่องทางติดต่อ',
        meta: 'ข้อมูล',
        icon: <Users className="w-4 h-4 text-sky-600" />,
        onSelect: () => {
          onClose();
          onOpenDirectory();
        },
      },
      {
        id: 'act-profile',
        group: 'actions',
        title: 'ข้อมูลส่วนตัว & เปลี่ยนรหัสผ่าน',
        subtitle: `${currentTeacher.Name} · ${currentTeacher.Learning_Area}`,
        meta: 'บัญชี',
        icon: <User className="w-4 h-4 text-slate-600" />,
        onSelect: () => {
          onClose();
          onOpenProfile();
        },
      },
    ];

    if (isAdmin) {
      if (onOpenExecutive) {
        baseActions.push({
          id: 'act-exec',
          group: 'actions',
          title: 'แดชบอร์ดภาพรวมผู้บริหาร',
          subtitle: 'สรุปสถิติ ความตรงต่อเวลา และกราฟภาพรวมโรงเรียน',
          meta: 'ผู้บริหาร',
          icon: <BarChart3 className="w-4 h-4 text-amber-600" />,
          onSelect: () => {
            onClose();
            onOpenExecutive();
          },
        });
      }
      if (onOpenReviewerWorkload) {
        baseActions.push({
          id: 'act-workload',
          group: 'actions',
          title: 'ภาระงานผู้ตรวจ (ตรวจสอบยอดตรวจจริง)',
          subtitle: 'ดูจำนวนแผนที่ตรวจแล้วและค้างตรวจของกรรมการแต่ละคน',
          meta: 'แอดมิน',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
          onSelect: () => {
            onClose();
            onOpenReviewerWorkload();
          },
        });
      }
      if (onOpenWorkflowManager) {
        baseActions.push({
          id: 'act-workflow',
          group: 'actions',
          title: 'ตั้งค่าสายงานอนุมัติ & ผู้ตรวจ',
          subtitle: 'กำหนดขั้นตอนการตรวจและโหมดตรวจเฉพาะกลุ่ม/สุ่ม',
          meta: 'แอดมิน',
          icon: <Workflow className="w-4 h-4 text-indigo-600" />,
          onSelect: () => {
            onClose();
            onOpenWorkflowManager();
          },
        });
      }
      if (onOpenStaffStructure) {
        baseActions.push({
          id: 'act-staff',
          group: 'actions',
          title: 'โครงสร้างสาขาวิชา & กลุ่มสาระ',
          subtitle: 'จัดการสมาชิกและแต่งตั้งหัวหน้าสาขา/หัวหน้ากลุ่มสาระ',
          meta: 'แอดมิน',
          icon: <Building2 className="w-4 h-4 text-amber-600" />,
          onSelect: () => {
            onClose();
            onOpenStaffStructure();
          },
        });
      }
      if (onOpenAdminTracker) {
        baseActions.push({
          id: 'act-tracker',
          group: 'actions',
          title: 'ตารางติดตามการส่งงานรายบุคคล',
          subtitle: 'ตรวจสอบสถานะการส่งเอกสารของบุคลากรทั้งโรงเรียน',
          meta: 'แอดมิน',
          icon: <ClipboardList className="w-4 h-4 text-indigo-600" />,
          onSelect: () => {
            onClose();
            onOpenAdminTracker();
          },
        });
      }
      if (onOpenDeadlineManager) {
        baseActions.push({
          id: 'act-deadline',
          group: 'actions',
          title: 'กำหนดส่ง & จัดการสถานะเอกสาร',
          subtitle: 'ตั้งวันหมดเขตส่งงานและแก้ไขประเภทเอกสาร',
          meta: 'แอดมิน',
          icon: <Calendar className="w-4 h-4 text-slate-600" />,
          onSelect: () => {
            onClose();
            onOpenDeadlineManager();
          },
        });
      }
    }

    const filteredActions = q
      ? baseActions.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.subtitle.toLowerCase().includes(q)
        )
      : baseActions.slice(0, 6);

    result.push(...filteredActions);

    // 2. Plans Search (show top 5 matching when typing)
    if (q.length >= 1) {
      const matchingPlans = plans
        .filter(
          (p) =>
            p.status !== 'deleted' &&
            (p.plan_title?.toLowerCase().includes(q) ||
              p.subject_code?.toLowerCase().includes(q) ||
              p.subject_name?.toLowerCase().includes(q) ||
              p.teacher_name?.toLowerCase().includes(q) ||
              p.plan_type?.toLowerCase().includes(q))
        )
        .slice(0, 5);

      matchingPlans.forEach((p) => {
        const statusInfo = getPlanStatusInfo(p.status);
        result.push({
          id: `plan-${p.id}`,
          group: 'plans',
          title: `${p.subject_code ? `${p.subject_code} · ` : ''}${p.plan_title}`,
          subtitle: `${p.teacher_name} · ${p.plan_type}`,
          meta: statusInfo.label,
          icon: <FileText className="w-4 h-4 text-indigo-500" />,
          onSelect: () => {
            onClose();
            if (isAdmin) {
              onOpenPlanReview(p);
            } else {
              onFilterBySearch(p.subject_code || p.plan_title);
            }
          },
        });
      });

      // 3. Teachers Search (top 4)
      const matchingTeachers = teachers
        .filter(
          (t) =>
            t.Name?.toLowerCase().includes(q) ||
            t.Teacher_ID?.toLowerCase().includes(q) ||
            t.Learning_Area?.toLowerCase().includes(q)
        )
        .slice(0, 4);

      matchingTeachers.forEach((t) => {
        result.push({
          id: `teacher-${t.Teacher_ID}`,
          group: 'teachers',
          title: t.Name,
          subtitle: `${t.Teacher_ID} · ${t.Learning_Area}${t.branch ? ` (${t.branch})` : ''}`,
          meta: isTeacherAdmin(t) ? 'Admin' : 'ครูผู้สอน',
          icon: <Users className="w-4 h-4 text-emerald-600" />,
          onSelect: () => {
            onClose();
            onFilterBySearch(t.Name);
          },
        });
      });
    }

    return result;
  }, [
    query,
    plans,
    teachers,
    isAdmin,
    assignedToMeCount,
    currentTeacher,
    onClose,
    onOpenSubmit,
    onJumpToReviewQueue,
    onJumpToMyPlans,
    onOpenProfile,
    onOpenDirectory,
    onOpenPlanReview,
    onFilterBySearch,
    onOpenExecutive,
    onOpenWorkflowManager,
    onOpenStaffStructure,
    onOpenReviewerWorkload,
    onOpenDeadlineManager,
    onOpenAdminTracker,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].onSelect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="ค้นหาด่วนและคำสั่งลัด"
    >
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-panel-enter">
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="พิมพ์คำสั่ง, รหัสวิชา, ชื่อแผน หรือชื่อคุณครู..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="ล้างคำค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">ไม่พบผลลัพธ์สำหรับ &ldquo;{query}&rdquo;</p>
              <p>ลองค้นหาด้วยรหัสวิชา ชื่อแผน หรือชื่อครูผู้สอน</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.onSelect}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/10 text-amber-300' : 'bg-slate-100'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </div>
                      <div className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.meta && (
                      <span
                        className={`text-[10px] font-medium ${
                          isSelected ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        {item.meta}
                      </span>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-300'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑↓</kbd>
              <span>เลื่อน</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] inline-flex items-center">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
              <span>เลือก</span>
            </span>
          </div>
          {query && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onFilterBySearch(query);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              กรองรายการเอกสารด้วยคำนี้ →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
