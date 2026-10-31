import React, { useState } from 'react';
import {
  PlanTypeDeadlineConfig,
  PlanStatusConfig,
  StatusColor,
  LessonPlan,
  Teacher,
  DynamicFormField,
  isTeacherAdmin,
} from '../types';
import { DynamicFormBuilder } from './DynamicFormBuilder';
import {
  formatThaiDateTime,
  formatDeadlineRange,
  getStatusStyle,
  getPlanStatusInfo,
  constructDateTime,
  DEFAULT_DEADLINE_CONFIGS,
  DEFAULT_STATUS_CONFIGS,
  buildGmailComposeUrl,
  buildMailtoUrl,
} from '../utils/deadlineUtils';
import {
  SYSTEM_SETTINGS_TABLE_SQL,
  checkSystemSettingsTableStatus,
  seedDocumentTypesToSupabase,
  saveSystemSetting,
} from '../services/supabaseClient';
import {
  X,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Tag,
  ShieldCheck,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
  Check,
  Search,
  Database,
  Copy,
  Download,
  Upload,
  ExternalLink,
  HardDrive,
  FileJson,
  Award,
  List,
  Link as LinkIcon,
  Mail,
  Send,
  Loader2,
  Zap,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { openGmailComposeTab } from '../services/emailService';

interface DeadlineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deadlineConfigs: PlanTypeDeadlineConfig[];
  onSaveDeadlineConfigs: (configs: PlanTypeDeadlineConfig[]) => void;
  statusConfigs: PlanStatusConfig[];
  onSaveStatusConfigs: (configs: PlanStatusConfig[]) => void;
  plans: LessonPlan[];
  onUpdatePlanStatus?: (planId: string, newStatus: string, isLate?: boolean, adminNotes?: string) => Promise<void> | void;
  onOpenReview?: (plan: LessonPlan) => void;
  isSupabaseConnected?: boolean;
  currentTeacher?: Teacher | null;
  teachers?: Teacher[];
}

const COLOR_OPTIONS: { id: StatusColor; name: string; bg: string }[] = [
  { id: 'amber', name: 'สีส้มอำพัน (Amber)', bg: 'bg-amber-500' },
  { id: 'emerald', name: 'สีเขียวมรกต (Emerald)', bg: 'bg-emerald-500' },
  { id: 'rose', name: 'สีแดงกุหลาบ (Rose)', bg: 'bg-rose-500' },
  { id: 'orange', name: 'สีส้มสด (Orange)', bg: 'bg-orange-500' },
  { id: 'indigo', name: 'สีน้ำเงินคราม (Indigo)', bg: 'bg-indigo-500' },
  { id: 'sky', name: 'สีฟ้ากระจ่าง (Sky)', bg: 'bg-sky-500' },
  { id: 'purple', name: 'สีม่วง (Purple)', bg: 'bg-purple-500' },
  { id: 'slate', name: 'สีเทาสุภาพ (Slate)', bg: 'bg-slate-500' },
];

const DEFAULT_DYNAMIC_FIELDS: DynamicFormField[] = [
  { id: 'fld_init_1', type: 'user_profile', label: 'ครูผู้สอน', required: true, profile_key: 'name', order: 1 },
  { id: 'fld_init_2', type: 'text', label: 'ชื่อเรื่อง / รายวิชา', required: true, order: 2 },
  { id: 'fld_init_3', type: 'select', label: 'รูปแบบ / ประเภท', required: true, options: ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2', 'ตัวเลือกที่ 3'], order: 3 },
  {
    id: 'fld_init_4',
    type: 'file',
    label: 'ลิงก์ไฟล์เอกสาร / PDF (Google Drive)',
    required: true,
    order: 4,
    file_config: {
      submission_mode: 'link_only',
      require_link_only: true,
      allowed_types: ['.pdf'],
      max_size_mb: 25,
    },
  },
];

export const DeadlineManagerModal: React.FC<DeadlineManagerModalProps> = ({
  isOpen,
  onClose,
  deadlineConfigs,
  onSaveDeadlineConfigs,
  statusConfigs,
  onSaveStatusConfigs,
  plans,
  onUpdatePlanStatus,
  onOpenReview,
  isSupabaseConnected,
  currentTeacher,
  teachers = [],
}) => {
  const [activeTab, setActiveTab] = useState<'deadlines' | 'statuses' | 'plans'>('deadlines');

  // Broadcast email state
  const [broadcastConfig, setBroadcastConfig] = useState<PlanTypeDeadlineConfig | null>(null);
  const [broadcastCopied, setBroadcastCopied] = useState<boolean>(false);
  const [isBroadcastingEmail, setIsBroadcastingEmail] = useState<boolean>(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState<string | null>(null);

  // Teaching staff for email notifications
  const teachingStaff = React.useMemo(() => {
    return (teachers || []).filter((t) => !isTeacherAdmin(t));
  }, [teachers]);

  const teacherEmails = React.useMemo(() => {
    return teachingStaff.map((t) => t.Email).filter(Boolean);
  }, [teachingStaff]);

  // Deadlines state
  const [deadlines, setDeadlines] = useState<PlanTypeDeadlineConfig[]>([...deadlineConfigs]);
  
  // Dedicated Task Add/Edit Modal state
  interface TaskModalState {
    isOpen: boolean;
    isNew: boolean;
    taskId?: string;
    name: string;
    description: string;
    academic_year: string;
    semester: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    allow_late: boolean;
    is_active: boolean;
    evaluation_type: 'rubric_score' | 'approval_only';
    sample_title: string;
    sample_url: string;
    useCustomForm: boolean;
    fields: DynamicFormField[];
    activeSubTab: 'general' | 'form';
  }

  const [taskModal, setTaskModal] = useState<TaskModalState | null>(null);
  const [showHelperInfo, setShowHelperInfo] = useState<boolean>(false);

  // Statuses state
  const [statuses, setStatuses] = useState<PlanStatusConfig[]>([...statusConfigs]);
  const [newStatus, setNewStatus] = useState<Partial<PlanStatusConfig>>({
    id: '',
    label: '',
    color: 'indigo',
    description: '',
  });
  const [isAddingStatus, setIsAddingStatus] = useState(false);

  // Quick Plan status editor
  const [planSearch, setPlanSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  // Export / Import / Copy Settings state
  const [copiedSettings, setCopiedSettings] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Cloud database table status
  const [tableStatus, setTableStatus] = useState<{ checked: boolean; exists: boolean; error?: string }>({
    checked: false,
    exists: false,
  });
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncCloudNotice, setSyncCloudNotice] = useState<string | null>(null);
  const [showCloudCard, setShowCloudCard] = useState(false);

  React.useEffect(() => {
    setDeadlines(deadlineConfigs);
  }, [deadlineConfigs]);

  React.useEffect(() => {
    setStatuses(statusConfigs);
  }, [statusConfigs]);

  React.useEffect(() => {
    if (isOpen && isSupabaseConnected) {
      checkSystemSettingsTableStatus().then((res) => {
        setTableStatus({ checked: true, exists: res.tableExists, error: res.error });
      });
    }
  }, [isOpen, isSupabaseConnected]);

  const handleCopySystemSettingsSql = () => {
    navigator.clipboard.writeText(SYSTEM_SETTINGS_TABLE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSyncDocumentTypesNow = async () => {
    setIsSyncingCloud(true);
    setSyncCloudNotice(null);
    try {
      const res = await seedDocumentTypesToSupabase(deadlines);
      if (res.success) {
        setSyncCloudNotice(`ซิงค์ประเภทเอกสาร ${deadlines.length} รายการ ขึ้น Cloud Database สำเร็จ! อุปกรณ์และเครื่องอื่นของครูทุกคนจะมองเห็นทันที`);
        setTableStatus({ checked: true, exists: true });
      } else {
        setSyncCloudNotice(`ไม่สามารถบันทึกลง Cloud: ${res.error || 'ตาราง system_settings ยังไม่พร้อมใช้งาน'}`);
      }
    } catch (e: any) {
      setSyncCloudNotice(`เกิดข้อผิดพลาด: ${e?.message}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleCopySettingsJson = () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        deadlineConfigs: deadlines,
        statusConfigs: statuses,
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopiedSettings(true);
    setTimeout(() => setCopiedSettings(false), 2500);
  };

  const handleDownloadSettingsJson = () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        deadlineConfigs: deadlines,
        statusConfigs: statuses,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pcsk_deadline_settings_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(jsonInput.trim());
      if (parsed.deadlineConfigs && Array.isArray(parsed.deadlineConfigs)) {
        handleSaveDeadlines(parsed.deadlineConfigs);
      } else if (Array.isArray(parsed)) {
        handleSaveDeadlines(parsed);
      }
      if (parsed.statusConfigs && Array.isArray(parsed.statusConfigs)) {
        handleSaveStatuses(parsed.statusConfigs);
      }
      setShowJsonModal(false);
      setJsonInput('');
      alert('นำเข้าการตั้งค่าประเภทเอกสารสำเร็จเรียบร้อย!');
    } catch (e: any) {
      setJsonError('รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบโค้ดที่คัดลอกมา');
    }
  };

  if (!isOpen) return null;

  // Save deadlines with automatic instant update to Cloudflare D1
  const handleSaveDeadlines = async (updatedList: PlanTypeDeadlineConfig[]) => {
    setDeadlines(updatedList);
    onSaveDeadlineConfigs(updatedList);

    // Auto-update to Cloudflare D1 immediately
    if (isSupabaseConnected) {
      try {
        const res = await seedDocumentTypesToSupabase(updatedList);
        if (res.success) {
          setSyncCloudNotice(
            `⚡ อัปเดตเข้า Cloudflare D1 เรียบร้อยแล้ว! (${updatedList.length} ประเภทเอกสาร) เครื่องอื่นเห็นข้อมูลทันที`
          );
          setTableStatus({ checked: true, exists: true });
        } else {
          setSyncCloudNotice(
            `⚠️ บันทึกลงเครื่องแล้ว แต่ส่งไป Cloudflare D1 ไม่สำเร็จ: ${res.error || 'โปรดตรวจสอบการเชื่อมต่อ Worker'}`
          );
        }
      } catch (err: any) {
        setSyncCloudNotice(`⚠️ เกิดข้อผิดพลาดขณะส่งเข้า Cloudflare: ${err?.message}`);
      }
    } else {
      setSyncCloudNotice(
        `💾 บันทึกประเภทเอกสารในเครื่องนี้เรียบร้อย (${updatedList.length} รายการ)`
      );
    }
  };

  // Helper to calculate days remaining or late
  const getRemainingTimeBadge = (endDate: string, endTime: string) => {
    try {
      const target = constructDateTime(endDate, endTime).getTime();
      const now = Date.now();
      const diffMs = target - now;
      if (diffMs < 0) {
        const pastDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
        return {
          isLate: true,
          label: pastDays === 0 ? 'เลยกำหนดวันนี้' : `เลยกำหนดมา ${pastDays} วัน`,
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      }
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (days === 0) {
        const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
        return {
          isLate: false,
          label: `เหลืออีก ~${hours} ชม.`,
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
        };
      }
      return {
        isLate: false,
        label: `เหลืออีก ${days} วัน`,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    } catch {
      return { isLate: false, label: 'เปิดรับตามกำหนด', badgeClass: 'bg-slate-100 text-slate-700' };
    }
  };

  const handleOpenAddTaskModal = () => {
    setTaskModal({
      isOpen: true,
      isNew: true,
      name: '',
      description: '',
      academic_year: '2569',
      semester: '2',
      start_date: new Date().toISOString().split('T')[0],
      start_time: '08:30',
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_time: '16:30',
      allow_late: true,
      is_active: true,
      evaluation_type: 'rubric_score',
      sample_title: '',
      sample_url: '',
      useCustomForm: false,
      fields: [],
      activeSubTab: 'general',
    });
  };

  const handleOpenEditTaskModal = (dl: PlanTypeDeadlineConfig) => {
    setTaskModal({
      isOpen: true,
      isNew: false,
      taskId: dl.id,
      name: dl.name,
      description: dl.description || '',
      academic_year: dl.academic_year || '2569',
      semester: dl.semester || '1',
      start_date: dl.start_date || new Date().toISOString().split('T')[0],
      start_time: dl.start_time || '08:30',
      end_date: dl.end_date || new Date().toISOString().split('T')[0],
      end_time: dl.end_time || '16:30',
      allow_late: dl.allow_late ?? true,
      is_active: dl.is_active ?? true,
      evaluation_type: dl.evaluation_type || 'rubric_score',
      sample_title: dl.sample_title || '',
      sample_url: dl.sample_url || '',
      useCustomForm: Boolean(dl.fields && dl.fields.length > 0),
      fields: dl.fields && dl.fields.length > 0 ? [...dl.fields] : [],
      activeSubTab: 'general',
    });
  };

  const handleOpenFormTaskModal = (dl: PlanTypeDeadlineConfig) => {
    const existingFields =
      dl.fields && dl.fields.length > 0
        ? [...dl.fields]
        : [...DEFAULT_DYNAMIC_FIELDS];

    setTaskModal({
      isOpen: true,
      isNew: false,
      taskId: dl.id,
      name: dl.name,
      description: dl.description || '',
      academic_year: dl.academic_year || '2569',
      semester: dl.semester || '1',
      start_date: dl.start_date || new Date().toISOString().split('T')[0],
      start_time: dl.start_time || '08:30',
      end_date: dl.end_date || new Date().toISOString().split('T')[0],
      end_time: dl.end_time || '16:30',
      allow_late: dl.allow_late ?? true,
      is_active: dl.is_active ?? true,
      evaluation_type: dl.evaluation_type || 'rubric_score',
      sample_title: dl.sample_title || '',
      sample_url: dl.sample_url || '',
      useCustomForm: true,
      fields: existingFields,
      activeSubTab: 'form',
    });
  };

  const handleSaveTaskModal = async () => {
    if (!taskModal || !taskModal.name.trim()) {
      alert('กรุณากรอกชื่อภาระงาน / ประเภทเอกสาร');
      return;
    }

    if (taskModal.isNew) {
      const id = `type_${Date.now()}`;
      const newItem: PlanTypeDeadlineConfig = {
        id,
        name: taskModal.name.trim(),
        description: taskModal.description.trim(),
        academic_year: taskModal.academic_year || '2569',
        semester: taskModal.semester || '1',
        start_date: taskModal.start_date || new Date().toISOString().split('T')[0],
        start_time: taskModal.start_time || '08:30',
        end_date: taskModal.end_date || new Date().toISOString().split('T')[0],
        end_time: taskModal.end_time || '16:30',
        allow_late: taskModal.allow_late,
        is_active: taskModal.is_active,
        evaluation_type: taskModal.evaluation_type,
        sample_title: taskModal.sample_title.trim() || undefined,
        sample_url: taskModal.sample_url.trim() || undefined,
        fields: taskModal.useCustomForm && taskModal.fields.length > 0 ? taskModal.fields : undefined,
      };

      const nextList = [...deadlines, newItem];
      setTaskModal(null);
      await handleSaveDeadlines(nextList);
      setBroadcastConfig(newItem);
    } else {
      const nextList = deadlines.map((dl) => {
        if (dl.id === taskModal.taskId) {
          return {
            ...dl,
            name: taskModal.name.trim(),
            description: taskModal.description.trim(),
            academic_year: taskModal.academic_year || '2569',
            semester: taskModal.semester || '1',
            start_date: taskModal.start_date,
            start_time: taskModal.start_time,
            end_date: taskModal.end_date,
            end_time: taskModal.end_time,
            allow_late: taskModal.allow_late,
            is_active: taskModal.is_active,
            evaluation_type: taskModal.evaluation_type,
            sample_title: taskModal.sample_title.trim() || undefined,
            sample_url: taskModal.sample_url.trim() || undefined,
            fields: taskModal.useCustomForm && taskModal.fields.length > 0 ? taskModal.fields : undefined,
          };
        }
        return dl;
      });
      setTaskModal(null);
      await handleSaveDeadlines(nextList);
    }
  };

  const handleDeleteDeadline = async (id: string, name?: string) => {
    if (deadlines.length <= 1) {
      alert('ต้องมีประเภทเอกสารและกำหนดส่งอย่างน้อย 1 ประเภทในระบบ');
      return;
    }
    const confirmText = name
      ? `คุณแน่ใจหรือไม่ว่าต้องการลบภาระงาน "${name}" ออกจากระบบ?`
      : 'คุณแน่ใจหรือไม่ว่าต้องการลบภาระงานนี้ออกจากระบบ?';
    if (!window.confirm(confirmText)) return;

    const filtered = deadlines.filter((d) => d.id !== id);
    await handleSaveDeadlines(filtered);
  };

  const handleUpdateDeadlineItem = (id: string, updates: Partial<PlanTypeDeadlineConfig>) => {
    const updated = deadlines.map((d) => (d.id === id ? { ...d, ...updates } : d));
    handleSaveDeadlines(updated);
  };

  // Status management
  const handleSaveStatuses = async (updatedList: PlanStatusConfig[]) => {
    setStatuses(updatedList);
    onSaveStatusConfigs(updatedList);
    if (isSupabaseConnected) {
      try {
        await saveSystemSetting('status_configs', updatedList);
      } catch (err: any) {
        console.warn('Could not auto-save status_configs to cloud:', err);
      }
    }
  };

  const handleAddNewStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus.label?.trim()) return;

    const id = (newStatus.id?.trim() || `custom_${Date.now()}`).toLowerCase().replace(/\s+/g, '_');
    const existing = statuses.find((s) => s.id === id);
    if (existing) {
      alert('มีรหัสสถานะนี้ในระบบแล้ว กรุณาใช้รหัสอื่น');
      return;
    }

    const item: PlanStatusConfig = {
      id,
      label: newStatus.label.trim(),
      color: (newStatus.color as StatusColor) || 'indigo',
      description: newStatus.description?.trim() || '',
      is_system: false,
    };

    const nextList = [...statuses, item];
    handleSaveStatuses(nextList);
    setIsAddingStatus(false);
    setNewStatus({
      id: '',
      label: '',
      color: 'indigo',
      description: '',
    });
  };

  const handleUpdateStatusItem = (id: string, updates: Partial<PlanStatusConfig>) => {
    const nextList = statuses.map((s) => (s.id === id ? { ...s, ...updates } : s));
    handleSaveStatuses(nextList);
  };

  const handleDeleteStatus = (id: string) => {
    const target = statuses.find((s) => s.id === id);
    if (target?.is_system && ['submitted', 'approved', 'needs_revision'].includes(id)) {
      alert('ไม่สามารถลบสถานะหลักของระบบได้ แต่ท่านสามารถแก้ไขชื่อและสีของสถานะนี้ได้');
      return;
    }
    const nextList = statuses.filter((s) => s.id !== id);
    handleSaveStatuses(nextList);
  };

  // Quick Plan Status change
  const handlePlanStatusChange = async (plan: LessonPlan, newStatusVal: string) => {
    if (!onUpdatePlanStatus) return;
    setUpdatingPlanId(plan.id);
    try {
      await onUpdatePlanStatus(plan.id, newStatusVal, plan.is_late, plan.admin_notes);
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const handleTogglePlanLate = async (plan: LessonPlan) => {
    if (!onUpdatePlanStatus) return;
    setUpdatingPlanId(plan.id);
    try {
      const nextLate = !plan.is_late;
      await onUpdatePlanStatus(plan.id, plan.status, nextLate, plan.admin_notes);
    } finally {
      setUpdatingPlanId(null);
    }
  };

  // Filter plans for Tab 3
  const filteredPlans = plans.filter((p) => {
    if (planFilter === 'late' && !p.is_late) return false;
    if (planFilter !== 'all' && planFilter !== 'late' && p.status !== planFilter) return false;
    if (planSearch.trim()) {
      const q = planSearch.toLowerCase();
      const matchSub = p.subject_code.toLowerCase().includes(q) || p.subject_name.toLowerCase().includes(q);
      const matchTeach = p.teacher_name.toLowerCase().includes(q) || p.teacher_id.toLowerCase().includes(q);
      const matchTitle = p.plan_title.toLowerCase().includes(q);
      return matchSub || matchTeach || matchTitle;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer active:scale-95"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 min-w-0 pr-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-white/20 backdrop-blur-md text-amber-100 border border-white/20 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
                <span>Admin Control</span>
              </div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                กำหนดช่วงเวลาส่ง & จัดการสถานะ
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-100/90 mt-0.5 line-clamp-1">
                กำหนดเวลาส่งของแต่ละประเภทเอกสาร และปรับแต่งสถานะทั้งหมดในระบบ
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-5 border-t border-white/20 pt-2.5 sm:pt-3 overflow-x-auto touch-scroll max-w-full">
            <button
              onClick={() => setActiveTab('deadlines')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
                activeTab === 'deadlines'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>1. กำหนดช่วงเวลาส่ง ({deadlines.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('statuses')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
                activeTab === 'statuses'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>2. สถานะทั้งหมด ({statuses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. ปรับสถานะแผน ({plans.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 bg-slate-50/50 touch-scroll">
          {/* Storage & Cloud Database Status Card (ซ่อนตามคำขอของผู้ใช้ โดยสามารถคลิกเปิดดูได้) */}
          {showCloudCard ? (
            <div
              className={`p-4 rounded-2xl border text-xs flex flex-col space-y-3 ${
                isSupabaseConnected
                  ? tableStatus.checked && !tableStatus.exists
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/90 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isSupabaseConnected && tableStatus.exists
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <span>
                        {isSupabaseConnected
                          ? tableStatus.checked && !tableStatus.exists
                            ? 'สถานะ: เชื่อมต่อ Cloudflare แล้ว (แต่ยังไม่ได้สร้างตาราง system_settings)'
                            : 'สถานะ: เชื่อมต่อ Cloudflare D1 สำเร็จ (ออนไลน์)'
                          : 'สถานะ: โหมดจัดเก็บเฉพาะในบราวเซอร์ของเครื่องนี้ (Local Storage)'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSupabaseConnected && tableStatus.exists
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isSupabaseConnected && tableStatus.exists
                          ? 'ซิงค์ข้ามคอมพิวเตอร์ทุกเครื่อง'
                          : 'บันทึกในเครื่องนี้ (ยังไม่ซิงค์ข้ามเครื่อง)'}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed text-slate-600">
                      {isSupabaseConnected ? (
                        tableStatus.checked && !tableStatus.exists ? (
                          <>
                            <strong className="text-amber-900">เหตุผลที่ประเภทเอกสารยังไม่ขึ้นในคอมเครื่องอื่น:</strong>{' '}
                            ฐานข้อมูล Cloudflare D1 ยังไม่มีตาราง <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">system_settings</code>{' '}
                            สำหรับเก็บประเภทเอกสาร ให้คัดลอก SQL ในหน้าต่างฐานข้อมูลไปรันใน Cloudflare D1 Console เพียง 1 ครั้ง ข้อมูลจะซิงค์ไปคอมเครื่องอื่นทันที!
                          </>
                        ) : (
                          <>
                            ประเภทเอกสารทุกประเภท บันทึกลงตาราง{' '}
                            <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-800 font-mono">
                              system_settings
                            </code>{' '}
                            บน Cloudflare D1 และซิงค์ตรงกันในทุกเครื่องคอมพิวเตอร์ของครูทุกคนทันที
                          </>
                        )
                      ) : (
                        <>
                          <strong className="text-amber-900">เหตุผลที่ยังไม่ขึ้นที่คอมเครื่องอื่น:</strong>{' '}
                          เพราะปัจจุบันเว็บยังไม่ได้ตั้งค่าเชื่อมต่อฐานข้อมูลคลาวด์ (Cloudflare D1) ข้อมูลจึงถูกบันทึกไว้ใน Local Storage ของเครื่องนี้เท่านั้น หากเปิดจากคอมเครื่องอื่นระบบจะแสดงประเภทเอกสารเริ่มต้นแทน
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 md:pt-0">
                  {isSupabaseConnected && tableStatus.checked && !tableStatus.exists && (
                    <button
                      type="button"
                      onClick={handleCopySystemSettingsSql}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>คัดลอก SQL ตารางระบบแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก SQL สร้างตารางระบบ</span>
                        </>
                      )}
                    </button>
                  )}

                  {isSupabaseConnected && (
                    <button
                      type="button"
                      onClick={handleSyncDocumentTypesNow}
                      disabled={isSyncingCloud}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isSyncingCloud ? 'กำลังซิงค์...' : 'ซิงค์ประเภทเอกสารขึ้น Cloud เดี๋ยวนี้'}</span>
                    </button>
                  )}


                  <button
                    type="button"
                    onClick={handleCopySettingsJson}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="คัดลอก JSON การตั้งค่าทั้งหมดไปวางในเครื่องอื่น"
                  >
                    {copiedSettings ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>คัดลอก JSON</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJsonModal(true)}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="นำเข้าการตั้งค่าจากโค้ด JSON"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>นำเข้า JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSettingsJson}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs cursor-pointer transition-colors"
                    title="ดาวน์โหลดไฟล์สำรอง .json"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCloudCard(false)}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
                    title="ซ่อนกล่องนี้"
                  >
                    ✕ ซ่อน
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                <span>{isSupabaseConnected ? 'ระบบเชื่อมต่อ Cloudflare D1 (Online)' : 'โหมดในเครื่อง'}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCloudCard(true)}
                className="text-[11px] text-slate-400 hover:text-indigo-600 font-medium underline cursor-pointer"
              >
                แสดงข้อมูลการเชื่อมต่อและเครื่องมือซิงค์ฐานข้อมูล
              </button>
            </div>
          )}

          {/* TAB 1: DEADLINES CONFIG */}
          {activeTab === 'deadlines' && (
            <div className="space-y-4 sm:space-y-5">
              {/* Instant SQL Auto-Sync Banner */}
              {syncCloudNotice && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold border flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200 ${
                    syncCloudNotice.includes('สำเร็จ') || syncCloudNotice.includes('⚡')
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>{syncCloudNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncCloudNotice(null)}
                    className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Summary Stats & Quick Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">ภาระงานทั้งหมด</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>{deadlines.length} ภาระงาน</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">ตรวจรูบริก 100 คะแนน</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>
                      {deadlines.filter((d) => (d.evaluation_type || 'rubric_score') === 'rubric_score').length} งาน
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">ตรวจแค่อนุมัติ/ส่งกลับ</div>
                  <div className="text-lg font-black text-indigo-700 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>
                      {deadlines.filter((d) => d.evaluation_type === 'approval_only').length} งาน
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">สถานะเปิดรับส่ง</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>
                      เปิดรับอยู่ {deadlines.filter((d) => Date.now() <= constructDateTime(d.end_date, d.end_time).getTime()).length} งาน
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar & Guide Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span>รายการภาระงานและกำหนดส่ง</span>
                    <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      {deadlines.length}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHelperInfo(!showHelperInfo)}
                    className="text-[11px] text-slate-500 hover:text-amber-800 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span>{showHelperInfo ? 'ซ่อนคำแนะนำ' : 'คู่มือการส่งช้า & โหมดตรวจ'}</span>
                    {showHelperInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('ต้องการคืนค่าภาระงานเริ่มต้นของระบบหรือไม่?')) {
                        handleSaveDeadlines(DEFAULT_DEADLINE_CONFIGS);
                      }
                    }}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="คืนค่าช่วงเวลาเริ่มต้นที่ระบบแนะนำ"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>คืนค่าเริ่มต้น</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddTaskModal}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ เพิ่มภาระงานใหม่</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Info Cards */}
              {showHelperInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950">
                        ระบบคำนวณการส่งช้าอัตโนมัติ:
                      </span>
                      <p className="text-amber-900/90 mt-0.5 leading-relaxed">
                        เมื่อครูผู้สอนส่งแผนหลัง Deadline ระบบจะติดแท็ก &quot;ส่งช้า&quot; และคำนวณระยะเวลาล่าช้าให้ทันที
                      </p>
                    </div>
                  </div>

                  <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-purple-950">
                        โหมดตรวจประเมินของแต่ละชิ้นงาน:
                      </span>
                      <p className="text-purple-900/90 mt-0.5 leading-relaxed">
                        เลือกได้ว่าชิ้นงานจะตรวจแบบ <strong>ให้คะแนนรูบริก (Rubric 100)</strong> หรือ <strong>ตรวจแค่อนุมัติ/ส่งกลับแก้ไข</strong> (คลิกปุ่มสลับที่การ์ดเพื่อเปลี่ยนได้ทันที)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Deadlines List Cards (Clean, Readable, Comprehensive) */}
              <div className="space-y-3.5">
                {deadlines.map((dl, idx) => {
                  const deadlineDate = constructDateTime(dl.end_date, dl.end_time);
                  const isPastDeadline = Date.now() > deadlineDate.getTime();
                  const remainingBadge = getRemainingTimeBadge(dl.end_date, dl.end_time);
                  const evalType = dl.evaluation_type || 'rubric_score';
                  const hasCustomFields = Boolean(dl.fields && dl.fields.length > 0);
                  const selectFieldsCount = dl.fields ? dl.fields.filter((f) => f.type === 'select').length : 0;

                  return (
                    <div
                      key={dl.id}
                      className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs hover:shadow-md ${
                        isPastDeadline
                          ? 'border-amber-200/90 bg-gradient-to-br from-white to-amber-50/20'
                          : 'border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {/* Top Header Row of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-800 border border-amber-500/20 text-xs font-bold flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate max-w-md" title={dl.name}>
                            {dl.name}
                          </h3>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                            ภาคเรียนที่ {dl.semester}/{dl.academic_year}
                          </span>
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${remainingBadge.badgeClass}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isPastDeadline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                            <span>{remainingBadge.label}</span>
                          </span>

                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            {dl.allow_late ? '✓ ส่งช้าได้' : '✕ ห้ามส่งช้า'}
                          </span>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3.5">
                        {/* 1. Deadline & Start Schedule */}
                        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>กำหนดเวลาส่ง (Deadline)</span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {formatThaiDateTime(`${dl.end_date} ${dl.end_time}`)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            เริ่มเปิดรับ: {formatThaiDateTime(`${dl.start_date} ${dl.start_time}`)}
                          </div>
                        </div>

                        {/* 2. Evaluation Mode with 1-Click Toggle */}
                        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-purple-600" />
                              <span>รูปแบบการตรวจประเมิน</span>
                            </span>
                            <span className="text-[10px] text-slate-400">คลิกสลับได้ทันที</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = evalType === 'approval_only' ? 'rubric_score' : 'approval_only';
                              handleUpdateDeadlineItem(dl.id, { evaluation_type: next });
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer active:scale-98 ${
                              evalType === 'rubric_score'
                                ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-950 border-amber-300'
                                : 'bg-indigo-100/80 hover:bg-indigo-200 text-indigo-950 border-indigo-300'
                            }`}
                            title="คลิกเพื่อสลับระหว่าง ตรวจให้คะแนนรูบริก 100 กับ ตรวจแค่อนุมัติ/ส่งกลับ"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {evalType === 'rubric_score' ? (
                                <>
                                  <Award className="w-3.5 h-3.5 text-amber-700" />
                                  <span>🏆 รูบริก 100 คะแนน</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
                                  <span>✅ ตรวจแค่อนุมัติ</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] underline font-medium opacity-80">↺ สลับโหมด</span>
                          </button>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {evalType === 'rubric_score' ? 'เกณฑ์ 5 ด้าน 100% เหมาะสำหรับวิจัย/แผนสมบูรณ์' : 'อนุมัติ/ส่งกลับ ไม่คิดคะแนน เหมาะสำหรับแผนย่อ'}
                          </div>
                        </div>

                        {/* 3. Form & Sample Documents Preview */}
                        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <List className="w-3.5 h-3.5 text-indigo-600" />
                              <span>แบบฟอร์มที่ครูต้องกรอก</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasCustomFields ? (
                              <button
                                type="button"
                                onClick={() => handleOpenFormTaskModal(dl)}
                                className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <List className="w-3 h-3 text-purple-700" />
                                <span>ฟอร์มกำหนดเอง ({dl.fields?.length} ช่อง)</span>
                                {selectFieldsCount > 0 && (
                                  <span className="text-[10px] bg-purple-200 px-1 rounded font-mono">
                                    Dropdown {selectFieldsCount}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md text-xs font-medium">
                                📄 แบบมาตรฐาน (วิชา+PDF)
                              </span>
                            )}

                            {dl.sample_url ? (
                              <a
                                href={dl.sample_url.startsWith('http') ? dl.sample_url : `https://${dl.sample_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                                title={dl.sample_title || 'เปิดดูตัวอย่าง'}
                              >
                                <LinkIcon className="w-3 h-3 text-sky-600" />
                                <span className="truncate max-w-[120px]">{dl.sample_title || 'ดูตัวอย่าง'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : null}
                          </div>
                          {dl.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-1" title={dl.description}>
                              คำชี้แจง: {dl.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Action Bar (Grouped, Neat, Distinct Hierarchy) */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400">
                          รหัสอ้างอิง: <span className="font-mono">{dl.id}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* 1. Primary Action: Edit task details & deadline */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditTaskModal(dl)}
                            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>แก้ไขข้อมูล & กำหนดส่ง</span>
                          </button>

                          {/* 2. Secondary Action: Setup Form & Dropdown */}
                          <button
                            type="button"
                            onClick={() => handleOpenFormTaskModal(dl)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                            title="กำหนดช่องกรอกข้อมูลและเมนู Dropdown"
                          >
                            <List className="w-3.5 h-3.5 text-purple-600" />
                            <span>ฟอร์ม & Dropdown</span>
                          </button>

                          {/* 3. Broadcast Email to Staff */}
                          <button
                            type="button"
                            onClick={() => setBroadcastConfig(dl)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                            title="ส่งอีเมลแจ้งเตือนภาระงานนี้ให้ครูทุกคนทันที"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-600" />
                            <span>ส่งเมลแจ้งเตือน</span>
                          </button>

                          {/* 4. Delete Task */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDeadline(dl.id, dl.name)}
                            disabled={deadlines.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title={deadlines.length <= 1 ? 'ต้องมีภาระงานอย่างน้อย 1 ประเภทในระบบ' : 'ลบภาระงานนี้'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: STATUS CUSTOMIZATION */}
          {activeTab === 'statuses' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Tag className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-indigo-950">
                      ปรับแต่งสถานะที่แสดงในระบบทั้งหมด:
                    </span>
                    <span className="text-indigo-800 ml-1">
                      ท่านสามารถเปลี่ยนชื่อสถานะ (เช่น เปลี่ยนคำว่า &quot;รอตรวจ&quot; หรือ &quot;ส่งกลับแก้ไข&quot;), เปลี่ยนสีป้ายสถานะ และเพิ่มสถานะที่กำหนดเองได้ตามต้องการ
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSaveStatuses(DEFAULT_STATUS_CONFIGS)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>คืนค่าสถานะเริ่มต้น</span>
                  </button>
                  <button
                    onClick={() => setIsAddingStatus(!isAddingStatus)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มสถานะใหม่</span>
                  </button>
                </div>
              </div>

              {/* Form to Add New Status */}
              {isAddingStatus && (
                <form
                  onSubmit={handleAddNewStatus}
                  className="bg-white p-5 rounded-2xl border-2 border-indigo-300 shadow-md space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-600" />
                      <span>เพิ่มสถานะใหม่ที่กำหนดเอง</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingStatus(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชื่อสถานะที่แสดงในระบบ (Label) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newStatus.label || ''}
                        onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                        placeholder="เช่น ตรวจแล้วรอบที่ 1 หรือ รอลงนามผู้อำนวยการ"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        รหัสสถานะภาษาอังกฤษ (System Key - ไม่บังคับ)
                      </label>
                      <input
                        type="text"
                        value={newStatus.id || ''}
                        onChange={(e) => setNewStatus({ ...newStatus, id: e.target.value })}
                        placeholder="เช่น pending_signature (เว้นว่างเพื่อสร้างอัตโนมัติ)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เลือกชุดสีของป้ายสถานะ (Color Theme)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {COLOR_OPTIONS.map((c) => {
                          const isSel = (newStatus.color || 'indigo') === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setNewStatus({ ...newStatus, color: c.id })}
                              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                isSel
                                  ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-full ${c.bg}`}></span>
                              <span className="text-xs font-semibold text-slate-700">{c.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        คำอธิบายความหมายของสถานะนี้
                      </label>
                      <input
                        type="text"
                        value={newStatus.description || ''}
                        onChange={(e) => setNewStatus({ ...newStatus, description: e.target.value })}
                        placeholder="คำชี้แจงสถานะนี้สำหรับครูผู้สอน..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStatus(false)}
                      className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      บันทึกสถานะใหม่
                    </button>
                  </div>
                </form>
              )}

              {/* Statuses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statuses.map((st) => {
                  const style = getStatusStyle(st.color);
                  return (
                    <div
                      key={st.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.badge}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                            <span>{st.label}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({st.id})
                          </span>
                        </div>

                        {!st.is_system && (
                          <button
                            onClick={() => handleDeleteStatus(st.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="ลบสถานะนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Editable Label */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          ชื่อสถานะที่แสดง (ปรับได้อิสระ):
                        </label>
                        <input
                          type="text"
                          value={st.label}
                          onChange={(e) =>
                            handleUpdateStatusItem(st.id, { label: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Color Selector */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          สีป้าย:
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleUpdateStatusItem(st.id, { color: c.id })}
                              className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center transition-transform cursor-pointer ${
                                st.color === c.id
                                  ? 'ring-2 ring-offset-1 ring-slate-800 scale-110 shadow-sm'
                                  : 'opacity-60 hover:opacity-100 hover:scale-105'
                              }`}
                              title={c.name}
                            >
                              {st.color === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          คำอธิบายสถานะ:
                        </label>
                        <input
                          type="text"
                          value={st.description || ''}
                          onChange={(e) =>
                            handleUpdateStatusItem(st.id, { description: e.target.value })
                          }
                          placeholder="คำอธิบายสั้นๆ..."
                          className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-[11px] text-slate-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: QUICK PLAN STATUS ADJUSTMENT */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                    placeholder="ค้นหาชื่อครู, รหัสวิชา, หรือชื่อแผน..."
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0">
                  <span className="text-slate-400 text-xs">กรอง:</span>
                  {(() => {
                    const seen = new Set<string>();
                    const buttons: { id: string; label: string }[] = [];
                    buttons.push({ id: 'all', label: 'ทั้งหมด' });
                    seen.add('all');
                    buttons.push({ id: 'late', label: '⚠️ ส่งช้าเท่านั้น' });
                    seen.add('late');

                    (statuses || []).forEach((s) => {
                      const cleanId = (s.id || '').trim().toLowerCase();
                      if (!cleanId || seen.has(cleanId)) return;
                      seen.add(cleanId);
                      buttons.push({ id: s.id.trim(), label: s.label });
                    });

                    return buttons.map((f) => (
                      <button
                        key={`plan-filter-${f.id}`}
                        onClick={() => setPlanFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          planFilter === f.id
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Plans Table/List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">วิชา / แผนการสอน</th>
                        <th className="py-3 px-4">ครูผู้สอน</th>
                        <th className="py-3 px-4">ประเภทเอกสาร</th>
                        <th className="py-3 px-4">วันเวลาที่ส่ง</th>
                        <th className="py-3 px-4">สถานะส่งช้า (Late)</th>
                        <th className="py-3 px-4">ปรับสถานะ (Admin)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPlans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            ไม่พบรายการแผนการสอนที่ตรงกับเงื่อนไข
                          </td>
                        </tr>
                      ) : (
                        filteredPlans.map((plan) => {
                          const statusInfo = getPlanStatusInfo(plan.status, statuses);
                          const isUpdating = updatingPlanId === plan.id;

                          return (
                            <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 max-w-xs">
                                <div className="font-bold text-slate-900 truncate">
                                  {plan.subject_code} - {plan.subject_name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate" title={plan.plan_title}>
                                  {plan.plan_title}
                                </div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-800">{plan.teacher_name}</div>
                                <div className="text-[10px] text-slate-400">รหัส {plan.teacher_id}</div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {plan.plan_type}
                                </span>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                {formatThaiDateTime(plan.submitted_at)}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleTogglePlanLate(plan)}
                                  disabled={isUpdating}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    plan.is_late
                                      ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title="คลิกเพื่อสลับสถานะส่งช้า / ส่งตรงเวลา"
                                >
                                  {plan.is_late ? (
                                    <>
                                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                                      <span>ส่งช้า</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>ตรงเวลา</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={plan.status}
                                    disabled={isUpdating}
                                    onChange={(e) => handlePlanStatusChange(plan, e.target.value)}
                                    className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                                  >
                                    {statuses.map((st) => (
                                      <option key={st.id} value={st.id}>
                                        {st.label} ({st.id})
                                      </option>
                                    ))}
                                  </select>
                                  {onOpenReview && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onOpenReview(plan);
                                      }}
                                      className="px-2 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                                      title="เปิดหน้าต่างตรวจประเมิน/อนุมัติเต็มรูปแบบ"
                                    >
                                      <UserCheck className="w-3 h-3 text-amber-300" />
                                      <span>ตรวจประเมิน</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>การปรับเปลี่ยนจะมีผลกับทุกส่วนของระบบและบันทึกแบบ Realtime</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* JSON Import Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileJson className="w-5 h-5 text-amber-600" />
                <span>นำเข้าการตั้งค่าประเภทเอกสาร (Import JSON)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowJsonModal(false);
                  setJsonError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              วางโค้ด JSON ที่ได้จากการกดปุ่ม <strong>&quot;คัดลอกการตั้งค่า&quot;</strong> จากเครื่องแอดมินอื่น หรือเนื้อหาจากไฟล์สำรอง .json เพื่อนำเข้าการตั้งค่าประเภทเอกสารมายังเครื่องนี้ทันที
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">วางโค้ด JSON การตั้งค่าที่นี่:</label>
              <textarea
                rows={7}
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setJsonError(null);
                }}
                placeholder='{"deadlineConfigs": [...]}'
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {jsonError && (
                <div className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowJsonModal(false);
                  setJsonError(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!jsonInput.trim()}
                onClick={handleImportJson}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                นำเข้าข้อมูลทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Email Modal */}
      {broadcastConfig && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/75 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-[#0B1329] via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-400 border border-amber-400/30 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                    Email Broadcast Announcement
                  </span>
                  <h3 className="font-extrabold text-base truncate">
                    ส่งอีเมลแจ้งเตือนภาระงานใหม่ให้ครูทุกคน
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastConfig(null)}
                className="p-1.5 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Task summary */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-amber-900 font-bold text-sm">{broadcastConfig.name}</span>
                  <span className="font-mono bg-amber-200 px-2 py-0.5 rounded text-[10px] font-bold text-amber-950">
                    ภาค {broadcastConfig.semester}/{broadcastConfig.academic_year}
                  </span>
                </div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>กำหนดส่ง: <strong className="text-slate-800">{formatThaiDateTime(`${broadcastConfig.end_date} ${broadcastConfig.end_time || '23:59'}`)}</strong></span>
                </div>
              </div>

              {/* Recipients info */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">ผู้รับอีเมล:</span>
                  <span className="text-slate-500 text-[11px]">ครูผู้สอนทั้งหมด {teacherEmails.length} ท่าน (@pcshsksn.ac.th)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(teacherEmails.join(', '));
                    setBroadcastCopied(true);
                    setTimeout(() => setBroadcastCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {broadcastCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>คัดลอกอีเมล {teacherEmails.length} รายการ</span>
                </button>
              </div>

              {/* Message preview */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ตัวอย่างข้อความแจ้งเตือนทางอีเมล:
                </label>
                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-sans text-xs leading-relaxed space-y-2 select-all border border-slate-800">
                  <div className="text-amber-300 font-bold border-b border-slate-800 pb-1">
                    หัวข้อ: [แจ้งภาระงานใหม่] {broadcastConfig.name} - กำหนดส่ง {formatThaiDateTime(`${broadcastConfig.end_date} ${broadcastConfig.end_time || '23:59'}`)} (จ.ภ. กาฬสินธุ์)
                  </div>
                  <p>เรียน คุณครูทุกท่าน โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
                  <p>ฝ่ายบริหารงานวิชาการขอแจ้งมอบหมายภาระงานและกำหนดส่งเอกสารใหม่ในระบบส่งเอกสารวิชาการออนไลน์:</p>
                  <p className="text-amber-200">
                    📌 ภาระงาน: {broadcastConfig.name}<br />
                    📅 ภาคเรียนที่ {broadcastConfig.semester} ปีการศึกษา {broadcastConfig.academic_year}<br />
                    ⏰ กำหนดส่ง: {formatThaiDateTime(`${broadcastConfig.end_date} ${broadcastConfig.end_time || '23:59'}`)}
                    {broadcastConfig.description ? <><br />📝 รายละเอียด: {broadcastConfig.description}</> : null}
                    {broadcastConfig.sample_url ? <><br />📎 เอกสารตัวอย่าง: {broadcastConfig.sample_url}</> : null}
                  </p>
                  <p>🔗 เข้าสู่ระบบเพื่อดำเนินการส่งเอกสาร: {typeof window !== 'undefined' ? window.location.origin : ''}</p>
                  <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                    จึงเรียนมาเพื่อโปรดทราบและดำเนินการตามกำหนดเวลา<br />
                    กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
                  </p>
                </div>
              </div>

              {broadcastSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{broadcastSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setBroadcastConfig(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const deadlineFormatted = formatThaiDateTime(`${broadcastConfig.end_date} ${broadcastConfig.end_time || '23:59'}`);
                    const subject = `[แจ้งภาระงานใหม่] ${broadcastConfig.name} - กำหนดส่ง ${deadlineFormatted} (จ.ภ. กาฬสินธุ์)`;
                    const body = `เรียน คุณครูทุกท่าน โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์\n\nฝ่ายบริหารงานวิชาการขอแจ้งมอบหมายภาระงานและกำหนดส่งเอกสารใหม่ในระบบส่งเอกสารวิชาการออนไลน์:\n\n📌 ภาระงาน: ${broadcastConfig.name}\n📅 ภาคเรียนที่ ${broadcastConfig.semester} ปีการศึกษา ${broadcastConfig.academic_year}\n⏰ กำหนดส่ง: ${deadlineFormatted}\n${broadcastConfig.description ? `📝 รายละเอียด: ${broadcastConfig.description}\n` : ''}${broadcastConfig.sample_url ? `📎 เอกสารตัวอย่าง: ${broadcastConfig.sample_url}\n` : ''}\n🔗 เข้าสู่ระบบเพื่อดำเนินการส่งเอกสาร: ${window.location.origin}\n\nจึงเรียนมาเพื่อโปรดทราบและดำเนินการตามกำหนดเวลา\nกลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
                    navigator.clipboard.writeText(body);
                    setBroadcastCopied(true);
                    setTimeout(() => setBroadcastCopied(false), 2000);
                  }}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>คัดลอกข้อความ</span>
                </button>

                {/* 1-Click Gmail Broadcast Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!broadcastConfig) return;
                    const deadlineFormatted = formatThaiDateTime(`${broadcastConfig.end_date} ${broadcastConfig.end_time || '23:59'}`);
                    const subject = `[แจ้งภาระงานใหม่] ${broadcastConfig.name} - กำหนดส่ง ${deadlineFormatted} (จ.ภ. กาฬสินธุ์)`;
                    const body = `เรียน คุณครูทุกท่าน โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์\n\nฝ่ายบริหารงานวิชาการขอแจ้งมอบหมายภาระงานและกำหนดส่งเอกสารใหม่ในระบบส่งเอกสารวิชาการออนไลน์:\n\n📌 ภาระงาน: ${broadcastConfig.name}\n📅 ภาคเรียนที่ ${broadcastConfig.semester} ปีการศึกษา ${broadcastConfig.academic_year}\n⏰ กำหนดส่ง: ${deadlineFormatted}\n${broadcastConfig.description ? `📝 รายละเอียด: ${broadcastConfig.description}\n` : ''}${broadcastConfig.sample_url ? `📎 เอกสารตัวอย่าง: ${broadcastConfig.sample_url}\n` : ''}\n🔗 เข้าสู่ระบบเพื่อดำเนินการส่งเอกสาร: ${window.location.origin}\n\nจึงเรียนมาเพื่อโปรดทราบและดำเนินการตามกำหนดเวลา\nกลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;

                    openGmailComposeTab({
                      to: teacherEmails.join(','),
                      subject,
                      body,
                    });
                    setBroadcastSuccessMsg(`⚡ เปิด Gmail พร้อมส่งแจ้งเตือนถึงคุณครูทั้ง ${teacherEmails.length} ท่านแล้ว!`);
                    setTimeout(() => {
                      setBroadcastSuccessMsg(null);
                      setBroadcastConfig(null);
                    }, 2500);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer text-xs"
                >
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>⚡ เปิดส่งใน Gmail (academics@pcshsksn.ac.th) ถึงครูทุกคน ({teacherEmails.length} ท่าน)</span>
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
      {/* Dedicated Add/Edit Task Modal */}
      {taskModal && taskModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 sm:p-5 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white border border-white/30 shrink-0">
                    {taskModal.isNew ? <Plus className="w-5 h-5 stroke-[2.5]" /> : <Edit2 className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider block">
                      {taskModal.isNew ? 'New Task & Deadline' : 'Edit Task & Deadline'}
                    </span>
                    <h3 className="font-extrabold text-base sm:text-lg truncate">
                      {taskModal.isNew ? 'เพิ่มภาระงานและกำหนดเวลาส่งใหม่' : `แก้ไขภาระงาน: ${taskModal.name || 'ไม่ระบุชื่อ'}`}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskModal(null)}
                  className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-Tabs for Task Modal */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => setTaskModal({ ...taskModal, activeSubTab: 'general' })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    taskModal.activeSubTab === 'general'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>1. ข้อมูลภาระงาน & กำหนดเวลาส่ง</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskModal({ ...taskModal, activeSubTab: 'form' })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    taskModal.activeSubTab === 'form'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>
                    2. แบบฟอร์ม & Dropdown {taskModal.useCustomForm ? `(${taskModal.fields.length} ช่อง)` : '(แบบมาตรฐาน)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1 bg-slate-50/50">
              {taskModal.activeSubTab === 'general' ? (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-amber-600" />
                      <span>ข้อมูลทั่วไปของภาระงาน</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชื่อประเภทเอกสาร / ภาระงาน <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={taskModal.name}
                        onChange={(e) => setTaskModal({ ...taskModal, name: e.target.value })}
                        placeholder="เช่น ประเด็นการวิจัยในชั้นเรียน หรือ แผนการจัดการเรียนรู้บูรณาการ"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ภาคเรียน / ปีการศึกษา
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={taskModal.semester}
                            onChange={(e) => setTaskModal({ ...taskModal, semester: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white flex-1"
                          >
                            <option value="1">ภาคเรียนที่ 1</option>
                            <option value="2">ภาคเรียนที่ 2</option>
                          </select>
                          <input
                            type="text"
                            value={taskModal.academic_year}
                            onChange={(e) => setTaskModal({ ...taskModal, academic_year: e.target.value })}
                            placeholder="ปีการศึกษา"
                            className="w-24 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          คำอธิบาย / ข้อกำหนดเพิ่มเติมสำหรับครู
                        </label>
                        <input
                          type="text"
                          value={taskModal.description}
                          onChange={(e) => setTaskModal({ ...taskModal, description: e.target.value })}
                          placeholder="คำชี้แจงสั้นๆ..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission Schedule */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>ช่วงเวลากำหนดส่ง (Schedule & Deadline)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Start Date */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <span>วันและเวลาเริ่มต้นเปิดรับส่ง:</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">วันที่เริ่ม</label>
                            <input
                              type="date"
                              required
                              value={taskModal.start_date}
                              onChange={(e) => setTaskModal({ ...taskModal, start_date: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">เวลาที่เริ่ม</label>
                            <input
                              type="time"
                              required
                              value={taskModal.start_time}
                              onChange={(e) => setTaskModal({ ...taskModal, start_time: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* End Date (Deadline) */}
                      <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 space-y-2">
                        <span className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>วันและเวลากำหนดส่ง (Deadline):</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-rose-700 mb-0.5">วันที่กำหนดส่ง</label>
                            <input
                              type="date"
                              required
                              value={taskModal.end_date}
                              onChange={(e) => setTaskModal({ ...taskModal, end_date: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold text-rose-950"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-rose-700 mb-0.5">เวลากำหนดส่ง</label>
                            <input
                              type="time"
                              required
                              value={taskModal.end_time}
                              onChange={(e) => setTaskModal({ ...taskModal, end_time: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold text-rose-950"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 pt-1">
                      <input
                        type="checkbox"
                        checked={taskModal.allow_late}
                        onChange={(e) => setTaskModal({ ...taskModal, allow_late: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>อนุญาตให้ส่งช้าได้หลังพ้นกำหนด (ระบบจะติดป้าย &quot;ส่งช้า&quot; และคำนวณวันล่าช้าอัตโนมัติ)</span>
                    </label>
                  </div>

                  {/* Evaluation Mode */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-purple-600" />
                        <span>รูปแบบการตรวจประเมิน</span>
                        <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-slate-500">เลือกรูปแบบที่ให้ผู้ตรวจประเมินใช้</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          taskModal.evaluation_type === 'rubric_score'
                            ? 'border-amber-500 bg-amber-50/80 text-amber-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal_eval_type"
                          value="rubric_score"
                          checked={taskModal.evaluation_type === 'rubric_score'}
                          onChange={() => setTaskModal({ ...taskModal, evaluation_type: 'rubric_score' })}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            🏆 ตรวจแบบให้คะแนนรูบริก (Rubric 100)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            มีเกณฑ์ประเมิน 5 ด้าน คำนวณเป็นร้อยละ 100 เหมาะสำหรับแผนฉบับสมบูรณ์ และงานวิจัยในชั้นเรียน
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          taskModal.evaluation_type === 'approval_only'
                            ? 'border-indigo-500 bg-indigo-50/80 text-indigo-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal_eval_type"
                          value="approval_only"
                          checked={taskModal.evaluation_type === 'approval_only'}
                          onChange={() => setTaskModal({ ...taskModal, evaluation_type: 'approval_only' })}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            ✅ ตรวจแค่อนุมัติ / ส่งกลับแก้ไข
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            อนุมัติ หรือ ส่งกลับแก้ไข ไม่ต้องกรอกคะแนนรูบริก เหมาะสำหรับแผนย่อ หรือเอกสารส่งตามรอบ
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Sample Links */}
                  <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
                        <span>เอกสารตัวอย่าง / แบบฟอร์มต้นแบบ (ไม่บังคับ)</span>
                      </span>
                      <span className="text-[10px] text-sky-700">Google Docs, Drive หรือ PDF</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={taskModal.sample_title}
                          onChange={(e) => setTaskModal({ ...taskModal, sample_title: e.target.value })}
                          placeholder="ชื่อตัวอย่าง เช่น แบบฟอร์มแผนการสอน (Google Docs)"
                          className="w-full px-3 py-1.5 border border-sky-300 rounded-lg text-xs bg-white text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <input
                          type="url"
                          value={taskModal.sample_url}
                          onChange={(e) => setTaskModal({ ...taskModal, sample_url: e.target.value })}
                          placeholder="https://docs.google.com/... หรือ drive.google.com/..."
                          className="w-full px-3 py-1.5 border border-sky-300 rounded-lg text-xs bg-white font-mono text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SubTab: Form & Dropdown Builder */
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <List className="w-4 h-4 text-purple-600" />
                        <span>เลือกรูปแบบฟอร์มที่ครูต้องกรอก</span>
                      </span>
                      <span className="text-[11px] text-purple-700 font-semibold">
                        {taskModal.useCustomForm ? `เปิดใช้ฟอร์มกำหนดเอง (${taskModal.fields.length} ช่องข้อมูล)` : 'แบบมาตรฐาน'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <label
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                          !taskModal.useCustomForm
                            ? 'border-indigo-600 bg-indigo-50/70 font-bold text-indigo-950 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal_form_mode"
                          checked={!taskModal.useCustomForm}
                          onChange={() => setTaskModal({ ...taskModal, useCustomForm: false })}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">📄 แบบฟอร์มมาตรฐาน</div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            กรอกรหัสวิชา, ชื่อวิชา, ระดับชั้น, และแนบไฟล์แผนการสอน PDF ทั่วไป
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                          taskModal.useCustomForm
                            ? 'border-purple-600 bg-purple-50/70 font-bold text-purple-950 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal_form_mode"
                          checked={taskModal.useCustomForm}
                          onChange={() => {
                            const fields =
                              taskModal.fields && taskModal.fields.length > 0
                                ? taskModal.fields
                                : [...DEFAULT_DYNAMIC_FIELDS];
                            setTaskModal({ ...taskModal, useCustomForm: true, fields });
                          }}
                          className="mt-0.5 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-purple-950 flex items-center gap-1">
                            <span>📋 กำหนดช่องกรอก & Dropdown เอง</span>
                            <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">กำหนดเอง</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            เพิ่มเมนู Dropdown, ข้อความ, วันที่, และช่องแนบไฟล์ได้ตามใจชอบ
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {taskModal.useCustomForm ? (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                      <DynamicFormBuilder
                        fields={taskModal.fields || []}
                        onChange={(updatedFields) =>
                          setTaskModal({ ...taskModal, fields: updatedFields })
                        }
                        availableTemplates={deadlines}
                        currentTeacher={currentTeacher}
                        sampleUrl={taskModal.sample_url || ''}
                        sampleTitle={taskModal.sample_title || ''}
                        onSampleDocumentsChange={(sampleData) =>
                          setTaskModal({ ...taskModal, ...sampleData })
                        }
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-100 rounded-2xl text-center text-slate-500 text-xs">
                      ขณะนี้ใช้แบบฟอร์มมาตรฐาน หากต้องการเพิ่มตัวเลือก Dropdown หรือช่องกรอกเฉพาะทาง ให้คลิกเลือก &quot;กำหนดช่องกรอก & Dropdown เอง&quot; ด้านบน
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setTaskModal(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleSaveTaskModal}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{taskModal.isNew ? 'บันทึกภาระงานใหม่' : 'บันทึกการแก้ไขภาระงาน'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
