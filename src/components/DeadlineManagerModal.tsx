import React, { useState, useMemo, useEffect } from 'react';
import {
  PlanTypeDeadlineConfig,
  PlanStatusConfig,
  StatusColor,
  LessonPlan,
  Teacher,
  DynamicFormField,
  ActiveTermConfig,
  DEFAULT_ACTIVE_TERM_CONFIG,
} from '../types';
import { DynamicFormBuilder } from './DynamicFormBuilder';
import {
  formatThaiDateTime,
  getStatusStyle,
  constructDateTime,
  DEFAULT_DEADLINE_CONFIGS,
  DEFAULT_STATUS_CONFIGS,
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
  Check,
  Search,
  Database,
  Copy,
  Download,
  Upload,
  ExternalLink,
  FileJson,
  Award,
  List,
  Link as LinkIcon,
  Mail,
  Send,
  Loader2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  FileSpreadsheet,
  FileText,
  ClipboardCheck,
  Sliders,
} from 'lucide-react';
import {
  sendAcademicEmailOneClick,
  ACADEMIC_SENDER_NAME,
} from '../services/emailService';

interface DeadlineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deadlineConfigs: PlanTypeDeadlineConfig[];
  onSaveDeadlineConfigs: (configs: PlanTypeDeadlineConfig[]) => void;
  statusConfigs: PlanStatusConfig[];
  onSaveStatusConfigs: (configs: PlanStatusConfig[]) => void;
  plans: LessonPlan[];
  onUpdatePlanStatus?: (
    planId: string,
    newStatus: string,
    isLate?: boolean,
    adminNotes?: string
  ) => Promise<void> | void;
  onOpenReview?: (plan: LessonPlan) => void;
  isSupabaseConnected?: boolean;
  currentTeacher?: Teacher | null;
  teachers?: Teacher[];
  activeTerm?: ActiveTermConfig;
}

const COLOR_OPTIONS: { id: StatusColor; name: string; bg: string; hint: string }[] = [
  { id: 'amber', name: 'สีส้มอำพัน', bg: 'bg-amber-500', hint: 'เหมาะกับงานที่รอตรวจ' },
  { id: 'emerald', name: 'สีเขียวมรกต', bg: 'bg-emerald-500', hint: 'เหมาะกับงานที่ผ่าน / อนุมัติแล้ว' },
  { id: 'rose', name: 'สีแดงกุหลาบ', bg: 'bg-rose-500', hint: 'เหมาะกับงานที่ต้องเร่งแก้ไข' },
  { id: 'orange', name: 'สีส้มสด', bg: 'bg-orange-500', hint: 'เหมาะกับงานส่งกลับแก้ไข / ส่งช้า' },
  { id: 'indigo', name: 'สีน้ำเงินคราม', bg: 'bg-indigo-500', hint: 'เหมาะกับขั้นตรวจสอบ / รอลงนาม' },
  { id: 'sky', name: 'สีฟ้ากระจ่าง', bg: 'bg-sky-500', hint: 'เหมาะกับงานกำลังดำเนินการ' },
  { id: 'purple', name: 'สีม่วง', bg: 'bg-purple-500', hint: 'เหมาะกับงานพิเศษ / เฉพาะกิจ' },
  { id: 'slate', name: 'สีเทาสุภาพ', bg: 'bg-slate-500', hint: 'เหมาะกับงานทั่วไป / ปิดรับ' },
];

interface QuickToggleFieldDef {
  key: string;
  fieldId: string;
  label: string;
  description: string;
  type: DynamicFormField['type'];
  profile_key?: DynamicFormField['profile_key'];
  placeholder?: string;
  requiredByDefault: boolean;
}

const POPULAR_TOGGLE_FIELDS: QuickToggleFieldDef[] = [
  {
    key: 'teacher_name',
    fieldId: 'fld_teacher_name',
    label: 'ชื่อครูผู้สอน (ระบบกรอกให้อัตโนมัติ)',
    description: 'ดึงชื่อครูที่ล็อกอินอยู่มาแสดงให้ทันที ไม่ต้องพิมพ์เอง',
    type: 'user_profile',
    profile_key: 'name',
    requiredByDefault: true,
  },
  {
    key: 'subject_code',
    fieldId: 'fld_subject_code',
    label: 'รหัสวิชา',
    description: 'เช่น ว31101, ค32102',
    type: 'text',
    placeholder: 'เช่น ว31101',
    requiredByDefault: true,
  },
  {
    key: 'subject_name',
    fieldId: 'fld_subject_name',
    label: 'ชื่อรายวิชา',
    description: 'เช่น ฟิสิกส์เพิ่มเติม 1',
    type: 'text',
    placeholder: 'กรอกชื่อวิชา',
    requiredByDefault: true,
  },
  {
    key: 'grade_level',
    fieldId: 'fld_grade_level',
    label: 'ระดับชั้นที่สอน',
    description: 'เลือก ม.1 - ม.6',
    type: 'select',
    requiredByDefault: true,
  },
  {
    key: 'title',
    fieldId: 'fld_title',
    label: 'ชื่อเรื่อง / หัวข้องาน',
    description: 'เช่น ชื่อหน่วยการเรียนรู้ หรือชื่องานวิจัย',
    type: 'text',
    placeholder: 'ระบุชื่อเรื่อง...',
    requiredByDefault: true,
  },
  {
    key: 'notes',
    fieldId: 'fld_notes',
    label: 'คำอธิบาย / หมายเหตุเพิ่มเติม',
    description: 'ช่องพิมพ์ข้อความยาวให้ครูอธิบายงาน',
    type: 'textarea',
    placeholder: 'รายละเอียดเพิ่มเติม (ถ้ามี)...',
    requiredByDefault: false,
  },
  {
    key: 'file',
    fieldId: 'fld_file_main',
    label: 'แนบไฟล์เอกสาร หรือวางลิงก์ Google Drive',
    description: 'รองรับทั้งอัปโหลดไฟล์ PDF / Excel และวางลิงก์แชร์',
    type: 'file',
    requiredByDefault: true,
  },
];

const DEFAULT_DYNAMIC_FIELDS: DynamicFormField[] = [
  { id: 'fld_teacher_name', type: 'user_profile', label: 'ครูผู้สอน', required: true, profile_key: 'name', order: 1 },
  { id: 'fld_title', type: 'text', label: 'ชื่อเรื่อง / หัวข้องาน', required: true, order: 2 },
  {
    id: 'fld_file_main',
    type: 'file',
    label: 'แนบไฟล์เอกสาร / ลิงก์ Google Drive',
    required: true,
    order: 3,
    file_config: {
      submission_mode: 'both',
      allow_link: true,
      allowed_types: ['.pdf', '.xlsx', '.xls', '.docx'],
      max_size_mb: 25,
    },
  },
];

interface TaskTemplatePreset {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  accentClass: string;
  defaultName: string;
  defaultDescription: string;
  evaluationType: 'rubric_score' | 'approval_only';
  useCustomForm: boolean;
  defaultDays: number;
  fields: DynamicFormField[];
}

const TASK_PRESETS: TaskTemplatePreset[] = [
  {
    id: 'preset_plan',
    title: 'แผนการจัดการเรียนรู้',
    subtitle: 'รหัสวิชา + ชื่อวิชา + ระดับชั้น + แนบไฟล์ PDF',
    badge: 'แบบมาตรฐาน',
    icon: <BookOpen className="w-5 h-5 text-amber-600" />,
    accentClass: 'border-amber-200 hover:border-amber-400 bg-amber-50/40',
    defaultName: 'แผนการจัดการเรียนรู้ฉบับย่อ',
    defaultDescription: 'ส่งแผนการจัดการเรียนรู้ไฟล์ PDF ประจำภาคเรียน',
    evaluationType: 'approval_only',
    useCustomForm: false,
    defaultDays: 14,
    fields: [],
  },
  {
    id: 'preset_pp5',
    title: 'ปพ.5 / รายงานผลสัมฤทธิ์',
    subtitle: 'รหัสวิชา + ชื่อวิชา + ระดับชั้น + แนบ Excel/PDF',
    badge: 'ยอดนิยม',
    icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
    accentClass: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/40',
    defaultName: 'แบบรายงาน ปพ.5',
    defaultDescription: 'อัปโหลดไฟล์ ปพ.5 (.xlsx / .pdf) หรือวางลิงก์ Google Drive',
    evaluationType: 'approval_only',
    useCustomForm: true,
    defaultDays: 14,
    fields: [
      { id: 'fld_teacher_name', type: 'user_profile', label: 'ครูผู้สอน', required: true, profile_key: 'name', order: 1 },
      { id: 'fld_subject_code', type: 'text', label: 'รหัสวิชา', placeholder: 'เช่น ว31101', required: true, order: 2 },
      { id: 'fld_subject_name', type: 'text', label: 'ชื่อรายวิชา', placeholder: 'ระบุชื่อวิชา', required: true, order: 3 },
      {
        id: 'fld_grade_level',
        type: 'select',
        label: 'ระดับชั้น',
        required: true,
        options: ['มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3', 'มัธยมศึกษาปีที่ 4', 'มัธยมศึกษาปีที่ 5', 'มัธยมศึกษาปีที่ 6'],
        order: 4,
      },
      {
        id: 'fld_file_main',
        type: 'file',
        label: 'ไฟล์ ปพ.5 (Excel หรือ PDF)',
        required: true,
        order: 5,
        file_config: { submission_mode: 'both', allow_link: true, allowed_types: ['.xlsx', '.xls', '.pdf'], max_size_mb: 25 },
      },
    ],
  },
  {
    id: 'preset_research',
    title: 'วิจัยในชั้นเรียน / นวัตกรรม',
    subtitle: 'หัวข้อวิจัย + บทคัดย่อ + แนบ PDF + ให้คะแนน 100',
    badge: 'ให้คะแนน 100',
    icon: <Award className="w-5 h-5 text-purple-600" />,
    accentClass: 'border-purple-200 hover:border-purple-400 bg-purple-50/40',
    defaultName: 'รายงานวิจัยในชั้นเรียน',
    defaultDescription: 'ส่งรายงานการวิจัยในชั้นเรียนพร้อมไฟล์ฉบับสมบูรณ์',
    evaluationType: 'rubric_score',
    useCustomForm: true,
    defaultDays: 30,
    fields: [
      { id: 'fld_teacher_name', type: 'user_profile', label: 'ครูผู้วิจัย', required: true, profile_key: 'name', order: 1 },
      { id: 'fld_research_topic', type: 'text', label: 'ชื่อเรื่องวิจัย / นวัตกรรม', placeholder: 'ระบุชื่องานวิจัย...', required: true, order: 2 },
      { id: 'fld_notes', type: 'textarea', label: 'สรุปผลโดยย่อ (ไม่บังคับ)', placeholder: 'สรุปผลการพัฒนาผู้เรียน...', required: false, order: 3 },
      {
        id: 'fld_file_main',
        type: 'file',
        label: 'แนบไฟล์รายงานวิจัย (PDF)',
        required: true,
        order: 4,
        file_config: { submission_mode: 'both', allow_link: true, allowed_types: ['.pdf'], max_size_mb: 25 },
      },
    ],
  },
  {
    id: 'preset_general',
    title: 'ส่งเอกสาร / แบบฟอร์มทั่วไป',
    subtitle: 'ชื่องาน + แนบไฟล์หรือลิงก์ ใช้งานง่ายสุด',
    badge: 'ง่ายที่สุด',
    icon: <FileText className="w-5 h-5 text-sky-600" />,
    accentClass: 'border-sky-200 hover:border-sky-400 bg-sky-50/40',
    defaultName: 'เอกสารงานวิชาการทั่วไป',
    defaultDescription: 'กรอกชื่อเรื่องและแนบไฟล์เอกสารที่ได้รับมอบหมาย',
    evaluationType: 'approval_only',
    useCustomForm: true,
    defaultDays: 7,
    fields: [
      { id: 'fld_teacher_name', type: 'user_profile', label: 'ผู้ส่งเอกสาร', required: true, profile_key: 'name', order: 1 },
      { id: 'fld_title', type: 'text', label: 'ชื่อเรื่อง / เอกสารที่ส่ง', placeholder: 'ระบุชื่อเรื่อง...', required: true, order: 2 },
      {
        id: 'fld_file_main',
        type: 'file',
        label: 'แนบไฟล์เอกสาร / ลิงก์ Google Drive',
        required: true,
        order: 3,
        file_config: { submission_mode: 'both', allow_link: true, allowed_types: ['.pdf', '.docx', '.xlsx', '.jpg', '.png'], max_size_mb: 25 },
      },
    ],
  },
];

function getDateAfterDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getEndOfCurrentMonthDate(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, '0');
  const d = String(lastDay.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
  activeTerm = DEFAULT_ACTIVE_TERM_CONFIG,
}) => {
  const [activeTab, setActiveTab] = useState<'deadlines' | 'statuses' | 'plans'>('deadlines');

  // Broadcast email state
  const [broadcastConfig, setBroadcastConfig] = useState<PlanTypeDeadlineConfig | null>(null);
  const [isBroadcastingEmail, setIsBroadcastingEmail] = useState<boolean>(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState<string | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState<{ sent: number; total: number } | null>(null);

  const teacherEmails = useMemo(() => {
    const list = (teachers || [])
      .map((t) => (t.Email || '').trim())
      .filter((e) => e && e.includes('@'));
    return Array.from(new Set(list));
  }, [teachers]);

  // Deadlines state
  const [deadlines, setDeadlines] = useState<PlanTypeDeadlineConfig[]>([...deadlineConfigs]);

  // Step-by-step Wizard Modal state
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
    step: 1 | 2 | 3;
    showAdvancedBuilder: boolean;
    validationError?: string | null;
  }

  const [taskModal, setTaskModal] = useState<TaskModalState | null>(null);
  const [previewTask, setPreviewTask] = useState<PlanTypeDeadlineConfig | null>(null);

  // Inline confirmation dialog (no window.confirm / window.alert)
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Inline alert/feedback message
  const [inlineFeedback, setInlineFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Statuses draft state (with explicit Save button instead of jittery auto-save per keystroke)
  const [draftStatuses, setDraftStatuses] = useState<PlanStatusConfig[]>([...statusConfigs]);
  const [hasUnsavedStatusChanges, setHasUnsavedStatusChanges] = useState(false);
  const [isSavingStatuses, setIsSavingStatuses] = useState(false);
  const [newStatus, setNewStatus] = useState<Partial<PlanStatusConfig>>({
    id: '',
    label: '',
    color: 'indigo',
    description: '',
  });
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [showCustomStatusKey, setShowCustomStatusKey] = useState(false);

  // Quick Plan status editor (Tab 3)
  const [planSearch, setPlanSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('all');
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string>('approved');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Advanced / Technical tools (collapsed cleanly at the bottom)
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [copiedSettings, setCopiedSettings] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [tableStatus, setTableStatus] = useState<{ checked: boolean; exists: boolean; error?: string }>({
    checked: false,
    exists: false,
  });
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncCloudNotice, setSyncCloudNotice] = useState<string | null>(null);

  useEffect(() => {
    setDeadlines(deadlineConfigs);
  }, [deadlineConfigs]);

  useEffect(() => {
    setDraftStatuses(statusConfigs);
    setHasUnsavedStatusChanges(false);
  }, [statusConfigs]);

  useEffect(() => {
    if (isOpen && isSupabaseConnected) {
      checkSystemSettingsTableStatus().then((res) => {
        setTableStatus({ checked: true, exists: res.tableExists, error: res.error });
      });
    }
  }, [isOpen, isSupabaseConnected]);

  if (!isOpen) return null;

  const showToastNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setInlineFeedback({ type, text });
    setTimeout(() => {
      setInlineFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

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
        setSyncCloudNotice(`ซิงค์งานทั้งหมด ${deadlines.length} รายการขึ้นระบบกลางสำเร็จแล้ว! เครื่องอื่นเห็นข้อมูลตรงกันทันที`);
        setTableStatus({ checked: true, exists: true });
      } else {
        setSyncCloudNotice(`ไม่สามารถซิงค์ขึ้น Cloud: ${res.error || 'โปรดตรวจสอบการเชื่อมต่อฐานข้อมูล'}`);
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
        statusConfigs: draftStatuses,
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
        statusConfigs: draftStatuses,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pcsk_tasks_settings_${new Date().toISOString().slice(0, 10)}.json`;
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
        handlePersistStatuses(parsed.statusConfigs);
      }
      setShowJsonModal(false);
      setJsonInput('');
      showToastNotice('success', 'นำเข้าข้อมูลการตั้งค่าสำเร็จเรียบร้อยแล้ว!');
    } catch {
      setJsonError('รูปแบบโค้ด JSON ไม่ถูกต้อง กรุณาตรวจสอบข้อความที่นำมาวางอีกครั้ง');
    }
  };

  const handleSaveDeadlines = async (updatedList: PlanTypeDeadlineConfig[]) => {
    setDeadlines(updatedList);
    onSaveDeadlineConfigs(updatedList);

    if (isSupabaseConnected) {
      try {
        const res = await seedDocumentTypesToSupabase(updatedList);
        if (res.success) {
          setSyncCloudNotice(
            `บันทึกเรียบร้อยแล้ว! (${updatedList.length} รายการ) ทุกเครื่องจะเห็นข้อมูลตรงกันทันที`
          );
          setTableStatus({ checked: true, exists: true });
        } else {
          setSyncCloudNotice(
            `บันทึกในเครื่องแล้ว แต่ส่งขึ้นระบบกลางไม่สำเร็จ: ${res.error || 'โปรดตรวจสอบอินเทอร์เน็ต'}`
          );
        }
      } catch (err: any) {
        setSyncCloudNotice(`เกิดข้อผิดพลาดขณะบันทึกลง Cloud: ${err?.message}`);
      }
    } else {
      setSyncCloudNotice(`บันทึกในเบราว์เซอร์เครื่องนี้เรียบร้อยแล้ว (${updatedList.length} รายการ)`);
    }
  };

  const getRemainingTimeBadge = (endDate: string, endTime: string) => {
    try {
      const target = constructDateTime(endDate, endTime).getTime();
      const now = Date.now();
      const diffMs = target - now;
      if (diffMs < 0) {
        const pastDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
        return {
          isLate: true,
          label: pastDays === 0 ? 'ครบกำหนดวันนี้' : `เลยกำหนด ${pastDays} วัน`,
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      }
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (days === 0) {
        const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
        return {
          isLate: false,
          label: `เหลือ ~${hours} ชม.`,
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
        };
      }
      return {
        isLate: false,
        label: `เหลือ ${days} วัน`,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    } catch {
      return { isLate: false, label: 'เปิดรับตามกำหนด', badgeClass: 'bg-slate-100 text-slate-700' };
    }
  };

  // Open wizard from blank or template preset
  const handleOpenAddTaskModal = (preset?: TaskTemplatePreset) => {
    const defaultDays = preset?.defaultDays || 14;
    setTaskModal({
      isOpen: true,
      isNew: true,
      name: preset ? preset.defaultName : '',
      description: preset ? preset.defaultDescription : '',
      academic_year: activeTerm.academic_year || '2569',
      semester: activeTerm.semester || '2',
      start_date: new Date().toISOString().split('T')[0],
      start_time: '08:30',
      end_date: getDateAfterDays(defaultDays),
      end_time: '16:30',
      allow_late: true,
      is_active: true,
      evaluation_type: preset ? preset.evaluationType : 'approval_only',
      sample_title: '',
      sample_url: '',
      useCustomForm: preset ? preset.useCustomForm : true,
      fields: preset
        ? preset.fields.map((f, idx) => ({ ...f, order: idx + 1 }))
        : [...DEFAULT_DYNAMIC_FIELDS],
      step: 1,
      showAdvancedBuilder: false,
      validationError: null,
    });
  };

  const handleOpenEditTaskModal = (dl: PlanTypeDeadlineConfig, startStep: 1 | 2 | 3 = 1) => {
    setTaskModal({
      isOpen: true,
      isNew: false,
      taskId: dl.id,
      name: dl.name,
      description: dl.description || '',
      academic_year: dl.academic_year || activeTerm.academic_year || '2569',
      semester: dl.semester || activeTerm.semester || '2',
      start_date: dl.start_date || new Date().toISOString().split('T')[0],
      start_time: dl.start_time || '08:30',
      end_date: dl.end_date || new Date().toISOString().split('T')[0],
      end_time: dl.end_time || '16:30',
      allow_late: dl.allow_late ?? true,
      is_active: dl.is_active ?? true,
      evaluation_type: dl.evaluation_type || 'rubric_score',
      sample_title: dl.sample_title || '',
      sample_url: dl.sample_url || '',
      useCustomForm: startStep === 3 ? true : Boolean(dl.fields && dl.fields.length > 0),
      fields:
        dl.fields && dl.fields.length > 0
          ? [...dl.fields]
          : startStep === 3
          ? [...DEFAULT_DYNAMIC_FIELDS]
          : [],
      step: startStep,
      showAdvancedBuilder: false,
      validationError: null,
    });
  };

  // Toggle popular simple form fields on Step 3
  const isToggleFieldActive = (fields: DynamicFormField[], def: QuickToggleFieldDef): boolean => {
    return fields.some((f) => {
      if (f.id === def.fieldId) return true;
      if (def.key === 'teacher_name' && f.type === 'user_profile' && f.profile_key === 'name') return true;
      if (def.key === 'subject_code' && (f.id === 'fld_subject_code' || f.label.includes('รหัสวิชา'))) return true;
      if (def.key === 'subject_name' && (f.id === 'fld_subject_name' || f.label.includes('ชื่อวิชา') || f.label.includes('ชื่อรายวิชา'))) return true;
      if (def.key === 'grade_level' && (f.id === 'fld_grade_level' || f.label.includes('ระดับชั้น'))) return true;
      if (def.key === 'title' && (f.id === 'fld_title' || f.id === 'fld_research_topic' || f.id === 'fld_topic' || f.label.includes('ชื่อเรื่อง'))) return true;
      if (def.key === 'notes' && f.type === 'textarea') return true;
      if (def.key === 'file' && f.type === 'file') return true;
      return false;
    });
  };

  const handleToggleQuickField = (def: QuickToggleFieldDef) => {
    if (!taskModal) return;
    const current = [...(taskModal.fields || [])];
    const active = isToggleFieldActive(current, def);

    let nextFields: DynamicFormField[];
    if (active) {
      nextFields = current.filter((f) => {
        if (f.id === def.fieldId) return false;
        if (def.key === 'teacher_name' && f.type === 'user_profile' && f.profile_key === 'name') return false;
        if (def.key === 'subject_code' && (f.id === 'fld_subject_code' || f.label.includes('รหัสวิชา'))) return false;
        if (def.key === 'subject_name' && (f.id === 'fld_subject_name' || f.label.includes('ชื่อวิชา') || f.label.includes('ชื่อรายวิชา'))) return false;
        if (def.key === 'grade_level' && (f.id === 'fld_grade_level' || f.label.includes('ระดับชั้น'))) return false;
        if (def.key === 'title' && (f.id === 'fld_title' || f.id === 'fld_research_topic' || f.id === 'fld_topic' || f.label.includes('ชื่อเรื่อง'))) return false;
        if (def.key === 'notes' && f.type === 'textarea') return false;
        if (def.key === 'file' && f.type === 'file') return false;
        return true;
      });
    } else {
      const newField: DynamicFormField = {
        id: def.fieldId,
        type: def.type,
        label: def.key === 'teacher_name' ? 'ครูผู้สอน' : def.label,
        placeholder: def.placeholder,
        profile_key: def.profile_key,
        required: def.requiredByDefault,
        order: current.length + 1,
        ...(def.key === 'grade_level'
          ? {
              options: ['มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3', 'มัธยมศึกษาปีที่ 4', 'มัธยมศึกษาปีที่ 5', 'มัธยมศึกษาปีที่ 6'],
            }
          : {}),
        ...(def.key === 'file'
          ? {
              file_config: {
                submission_mode: 'both',
                allow_link: true,
                allowed_types: ['.pdf', '.xlsx', '.xls', '.docx'],
                max_size_mb: 25,
              },
            }
          : {}),
      };
      // Keep file field at the bottom if adding something else
      if (def.key !== 'file') {
        const fileIdx = current.findIndex((f) => f.type === 'file');
        if (fileIdx !== -1) {
          current.splice(fileIdx, 0, newField);
          nextFields = current;
        } else {
          nextFields = [...current, newField];
        }
      } else {
        nextFields = [...current, newField];
      }
    }

    const reordered = nextFields.map((f, i) => ({ ...f, order: i + 1 }));
    setTaskModal({
      ...taskModal,
      useCustomForm: true,
      fields: reordered,
    });
  };

  const handleSaveTaskModal = async () => {
    if (!taskModal) return;
    if (!taskModal.name.trim()) {
      setTaskModal({
        ...taskModal,
        step: 1,
        validationError: 'กรุณากรอก "ชื่องานที่ให้ครูส่ง" ก่อนกดบันทึกครับ',
      });
      return;
    }

    let resolvedSampleUrl = taskModal.sample_url.trim() || undefined;
    if (resolvedSampleUrl) {
      if (!/^https?:\/\//i.test(resolvedSampleUrl)) {
        resolvedSampleUrl = `https://${resolvedSampleUrl}`;
      }
    } else if (taskModal.description) {
      const match = taskModal.description.match(/(https?:\/\/[^\s]+|docs\.google\.com[^\s]+|drive\.google\.com[^\s]+)/i);
      if (match) {
        const raw = match[0].trim();
        resolvedSampleUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      }
    }

    if (taskModal.isNew) {
      const id = `type_${Date.now()}`;
      const newItem: PlanTypeDeadlineConfig = {
        id,
        name: taskModal.name.trim(),
        description: taskModal.description.trim(),
        academic_year: taskModal.academic_year || activeTerm.academic_year || '2569',
        semester: taskModal.semester || activeTerm.semester || '2',
        start_date: taskModal.start_date || new Date().toISOString().split('T')[0],
        start_time: taskModal.start_time || '08:30',
        end_date: taskModal.end_date || new Date().toISOString().split('T')[0],
        end_time: taskModal.end_time || '16:30',
        allow_late: taskModal.allow_late,
        is_active: taskModal.is_active,
        evaluation_type: taskModal.evaluation_type,
        sample_title: taskModal.sample_title.trim() || undefined,
        sample_url: resolvedSampleUrl,
        fields: taskModal.useCustomForm && taskModal.fields.length > 0 ? taskModal.fields : undefined,
      };

      const nextList = [...deadlines, newItem];
      setTaskModal(null);
      await handleSaveDeadlines(nextList);
      setBroadcastSuccessMsg(null);
      setBroadcastProgress(null);
      setBroadcastConfig(newItem);
    } else {
      const nextList = deadlines.map((dl) => {
        if (dl.id === taskModal.taskId) {
          return {
            ...dl,
            name: taskModal.name.trim(),
            description: taskModal.description.trim(),
            academic_year: taskModal.academic_year || activeTerm.academic_year || '2569',
            semester: taskModal.semester || activeTerm.semester || '2',
            start_date: taskModal.start_date,
            start_time: taskModal.start_time,
            end_date: taskModal.end_date,
            end_time: taskModal.end_time,
            allow_late: taskModal.allow_late,
            is_active: taskModal.is_active,
            evaluation_type: taskModal.evaluation_type,
            sample_title: taskModal.sample_title.trim() || undefined,
            sample_url: resolvedSampleUrl,
            fields: taskModal.useCustomForm && taskModal.fields.length > 0 ? taskModal.fields : undefined,
          };
        }
        return dl;
      });
      setTaskModal(null);
      await handleSaveDeadlines(nextList);
      showToastNotice('success', `บันทึกการแก้ไขงาน "${taskModal.name.trim()}" เรียบร้อยแล้ว`);
    }
  };

  const requestDeleteDeadline = (id: string, name: string) => {
    if (deadlines.length <= 1) {
      showToastNotice('error', 'ต้องมีรายการงานอย่างน้อย 1 รายการในระบบครับ');
      return;
    }
    setConfirmAction({
      title: 'ยืนยันการลบรายการงาน',
      message: `ต้องการลบงาน "${name}" ออกจากรายการที่เปิดรับส่งใช่หรือไม่? (เอกสารที่ครูส่งมาแล้วก่อนหน้านี้จะยังคงอยู่ในระบบ)`,
      confirmLabel: 'ลบรายการงานนี้',
      variant: 'danger',
      onConfirm: async () => {
        const filtered = deadlines.filter((d) => d.id !== id);
        await handleSaveDeadlines(filtered);
        showToastNotice('success', `ลบงาน "${name}" เรียบร้อยแล้ว`);
      },
    });
  };

  const handleUpdateDeadlineItem = (id: string, updates: Partial<PlanTypeDeadlineConfig>) => {
    const updated = deadlines.map((d) => (d.id === id ? { ...d, ...updates } : d));
    handleSaveDeadlines(updated);
  };

  // Status management with Draft + explicit Save
  const handlePersistStatuses = async (updatedList: PlanStatusConfig[]) => {
    setIsSavingStatuses(true);
    try {
      setDraftStatuses(updatedList);
      onSaveStatusConfigs(updatedList);
      if (isSupabaseConnected) {
        await saveSystemSetting('status_configs', updatedList).catch(() => {});
      }
      setHasUnsavedStatusChanges(false);
      showToastNotice('success', 'บันทึกป้ายสถานะงานเรียบร้อยแล้ว! ครูทุกคนจะเห็นป้ายสถานะใหม่ตรงกัน');
    } finally {
      setIsSavingStatuses(false);
    }
  };

  const handleAddNewStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus.label?.trim()) return;

    const cleanId =
      newStatus.id?.trim()
        ? newStatus.id.trim().toLowerCase().replace(/\s+/g, '_')
        : `status_${Date.now()}`;
    const existing = draftStatuses.find((s) => s.id === cleanId);
    if (existing) {
      showToastNotice('error', 'มีรหัสสถานะนี้ในระบบแล้ว กรุณาใช้ชื่อหรือรหัสอื่น');
      return;
    }

    const item: PlanStatusConfig = {
      id: cleanId,
      label: newStatus.label.trim(),
      color: (newStatus.color as StatusColor) || 'indigo',
      description: newStatus.description?.trim() || '',
      is_system: false,
    };

    const nextList = [...draftStatuses, item];
    handlePersistStatuses(nextList);
    setIsAddingStatus(false);
    setShowCustomStatusKey(false);
    setNewStatus({ id: '', label: '', color: 'indigo', description: '' });
  };

  const handleEditDraftStatus = (id: string, updates: Partial<PlanStatusConfig>) => {
    setDraftStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    setHasUnsavedStatusChanges(true);
  };

  const handleDeleteStatus = (id: string) => {
    const target = draftStatuses.find((s) => s.id === id);
    if (target?.is_system && ['submitted', 'approved', 'needs_revision'].includes(id)) {
      showToastNotice('info', 'สถานะหลักของระบบไม่สามารถลบได้ แต่สามารถเปลี่ยนชื่อและสีป้ายได้ตามต้องการครับ');
      return;
    }
    setConfirmAction({
      title: 'ยืนยันการลบป้ายสถานะ',
      message: `ต้องการลบป้ายสถานะ "${target?.label || id}" ออกจากระบบใช่หรือไม่?`,
      confirmLabel: 'ลบป้ายสถานะนี้',
      variant: 'danger',
      onConfirm: async () => {
        const nextList = draftStatuses.filter((s) => s.id !== id);
        await handlePersistStatuses(nextList);
      },
    });
  };

  // Tab 3 Plan status changes
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

  const distinctPlanTypes = useMemo(() => {
    const seen = new Set<string>();
    deadlines.forEach((d) => {
      if (d.name) seen.add(d.name);
    });
    plans.forEach((p) => {
      if (p.plan_type) seen.add(p.plan_type);
    });
    return Array.from(seen);
  }, [deadlines, plans]);

  const filteredPlans = plans.filter((p) => {
    if (planTypeFilter !== 'all' && p.plan_type !== planTypeFilter) return false;
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

  const handleToggleSelectPlan = (id: string) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    const allFilteredSelected =
      filteredPlans.length > 0 && filteredPlans.every((p) => selectedPlanIds.has(p.id));
    if (allFilteredSelected) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(filteredPlans.map((p) => p.id)));
    }
  };

  const handleApplyBulkStatus = async () => {
    if (!onUpdatePlanStatus || selectedPlanIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const targets = plans.filter((p) => selectedPlanIds.has(p.id));
      for (const plan of targets) {
        await onUpdatePlanStatus(plan.id, bulkStatusTarget, plan.is_late, plan.admin_notes);
      }
      showToastNotice('success', `อัปเดตสถานะพร้อมกัน ${targets.length} รายการเรียบร้อยแล้ว`);
      setSelectedPlanIds(new Set());
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const activeCount = deadlines.filter(
    (d) => Date.now() <= constructDateTime(d.end_date, d.end_time).getTime()
  ).length;
  const expiredCount = deadlines.length - activeCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-[#0B1329] p-4 sm:p-5 text-white shrink-0 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 p-2 rounded-xl transition-colors cursor-pointer active:scale-95"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 min-w-0 pr-10">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>เมนูผู้ดูแลระบบ</span>
              </div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                เพิ่ม / แก้ไขงานที่ให้ครูส่ง
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1">
                สร้างหัวข้องานใหม่จากแม่แบบ ตั้งวันส่ง ปรับป้ายสถานะ และจัดการงานที่เปิดรับส่ง
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 border-t border-white/15 pt-2.5 sm:pt-3 overflow-x-auto touch-scroll max-w-full">
            <button
              onClick={() => setActiveTab('deadlines')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
                activeTab === 'deadlines'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>1. รายการงานที่เปิดรับส่ง ({deadlines.length})</span>
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
              <span>2. ป้ายสถานะงาน ({draftStatuses.length})</span>
              {hasUnsavedStatusChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="มีการแก้ไขที่ยังไม่บันทึก" />
              )}
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
              <span>3. เปลี่ยนสถานะงานครูรายคน ({plans.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5 bg-slate-50/60 touch-scroll">
          {/* Global inline feedback banner */}
          {inlineFeedback && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold border flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150 ${
                inlineFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : inlineFeedback.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                  : 'bg-sky-50 text-sky-900 border-sky-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {inlineFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : inlineFeedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-sky-600 shrink-0" />
                )}
                <span>{inlineFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setInlineFeedback(null)}
                className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: TASK LIST & QUICK TEMPLATES */}
          {activeTab === 'deadlines' && (
            <div className="space-y-4 sm:space-y-5">
              {syncCloudNotice && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold border flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150 ${
                    syncCloudNotice.includes('เรียบร้อย') || syncCloudNotice.includes('สำเร็จ')
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{syncCloudNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncCloudNotice(null)}
                    className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Simple Plain-Thai Summary */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">งานทั้งหมด</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{deadlines.length} งาน</span>
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <div className="text-[11px] font-semibold text-emerald-700">เปิดรับส่งอยู่</div>
                  <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{activeCount} งาน</span>
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">ครบกำหนดแล้ว</div>
                  <div className="text-base sm:text-lg font-black text-slate-700 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{expiredCount} งาน</span>
                  </div>
                </div>
              </div>

              {/* 1-Click Quick Templates Section */}
              <div className="bg-white rounded-2xl border border-amber-200/90 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>สร้างงานด่วนจากแม่แบบสำเร็จรูป (คลิกเลือกได้เลย)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      เลือกแม่แบบที่ตรงกับงาน ระบบจะจัดเตรียมช่องกรอกข้อมูลและวันส่งให้ครบ แก้แค่ชื่องานก็เปิดรับส่งได้ทันที
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAddTaskModal()}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>สร้างงานใหม่เอง</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {TASK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleOpenAddTaskModal(preset)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.98] flex flex-col justify-between gap-2 ${preset.accentClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2 rounded-lg bg-white shadow-2xs border border-slate-100 shrink-0">
                          {preset.icon}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200/80">
                          {preset.badge}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{preset.title}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {preset.subtitle}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Existing Tasks List Header */}
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span>รายการงานที่เปิดรับส่งในระบบ</span>
                  <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                    {deadlines.length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: 'คืนค่ารายการงานเริ่มต้น',
                      message: 'ต้องการคืนค่ารายการงานเริ่มต้นของระบบใช่หรือไม่? (งานที่สร้างเพิ่มไว้อาจถูกแทนที่)',
                      confirmLabel: 'คืนค่าเริ่มต้น',
                      variant: 'warning',
                      onConfirm: async () => {
                        await handleSaveDeadlines(DEFAULT_DEADLINE_CONFIGS);
                        showToastNotice('success', 'คืนค่ารายการงานเริ่มต้นเรียบร้อยแล้ว');
                      },
                    })
                  }
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>คืนค่าเริ่มต้น</span>
                </button>
              </div>

              {/* Tasks Cards */}
              <div className="space-y-3.5">
                {deadlines.map((dl, idx) => {
                  const deadlineDate = constructDateTime(dl.end_date, dl.end_time);
                  const isPastDeadline = Date.now() > deadlineDate.getTime();
                  const remainingBadge = getRemainingTimeBadge(dl.end_date, dl.end_time);
                  const evalType = dl.evaluation_type || 'rubric_score';
                  const hasCustomFields = Boolean(dl.fields && dl.fields.length > 0);

                  return (
                    <div
                      key={dl.id}
                      className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-2xs hover:shadow-md ${
                        isPastDeadline
                          ? 'border-amber-200/90 bg-amber-50/15'
                          : 'border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-800 border border-amber-500/20 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate max-w-md" title={dl.name}>
                            {dl.name}
                          </h3>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                            ภาคเรียนที่ {dl.semester}/{dl.academic_year}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${remainingBadge.badgeClass}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isPastDeadline ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            <span>{remainingBadge.label}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            {dl.allow_late ? 'ส่งช้าได้ (ติดป้ายส่งช้า)' : 'ปิดรับเมื่อหมดเขต'}
                          </span>
                        </div>
                      </div>

                      {/* Middle Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3.5">
                        {/* 1. Schedule */}
                        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-1">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>วันหมดเขตส่งงาน</span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {formatThaiDateTime(`${dl.end_date} ${dl.end_time}`)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            เริ่มเปิดรับ: {formatThaiDateTime(`${dl.start_date} ${dl.start_time}`)}
                          </div>
                        </div>

                        {/* 2. Eval Mode */}
                        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <ClipboardCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span>วิธีตรวจงาน</span>
                            </span>
                            <span className="text-[10px] text-slate-400">คลิกเพื่อสลับได้</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = evalType === 'approval_only' ? 'rubric_score' : 'approval_only';
                              handleUpdateDeadlineItem(dl.id, { evaluation_type: next });
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                              evalType === 'rubric_score'
                                ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-950 border-amber-300'
                                : 'bg-indigo-100/80 hover:bg-indigo-200 text-indigo-950 border-indigo-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {evalType === 'rubric_score' ? (
                                <>
                                  <Award className="w-3.5 h-3.5 text-amber-700" />
                                  <span>ให้คะแนนเต็ม 100</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
                                  <span>ตรวจผ่าน / ส่งกลับแก้ไข</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] underline font-medium opacity-80">เปลี่ยน</span>
                          </button>
                        </div>

                        {/* 3. Teacher Form */}
                        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                            <List className="w-3.5 h-3.5 text-indigo-600" />
                            <span>ช่องข้อมูลที่ครูต้องกรอก</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasCustomFields ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTaskModal(dl, 3)}
                                className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Sliders className="w-3 h-3 text-purple-700" />
                                <span>กำหนดไว้ {dl.fields?.length} ช่อง</span>
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md text-xs font-medium">
                                แบบมาตรฐาน (วิชา + แนบ PDF)
                              </span>
                            )}

                            {dl.sample_url && (
                              <a
                                href={dl.sample_url.startsWith('http') ? dl.sample_url : `https://${dl.sample_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <LinkIcon className="w-3 h-3 text-sky-600" />
                                <span className="truncate max-w-[110px]">{dl.sample_title || 'ไฟล์ตัวอย่าง'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          {dl.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1" title={dl.description}>
                              {dl.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setPreviewTask(dl)}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" />
                          <span>ดูตัวอย่างหน้าครู</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTaskModal(dl, 1)}
                            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>แก้ไขงาน / วันส่ง</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditTaskModal(dl, 3)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5 text-purple-600" />
                            <span>ปรับช่องกรอก</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBroadcastConfig(dl)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-600" />
                            <span>แจ้งเตือนครู</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => requestDeleteDeadline(dl.id, dl.name)}
                            disabled={deadlines.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title={deadlines.length <= 1 ? 'ต้องมีงานอย่างน้อย 1 รายการ' : 'ลบงานนี้'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hidden Technical / Advanced Section at bottom */}
              <div className="pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setShowAdvancedTools(!showAdvancedTools)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer py-1"
                >
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>ตั้งค่าขั้นสูง (สำรองข้อมูล / ซิงค์ฐานข้อมูล)</span>
                  {showAdvancedTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvancedTools && (
                  <div
                    className={`mt-2 p-4 rounded-2xl border text-xs space-y-3 animate-in fade-in duration-150 ${
                      isSupabaseConnected
                        ? 'bg-white border-slate-200 text-slate-700'
                        : 'bg-amber-50/70 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>สถานะการซิงค์ฐานข้อมูลกลาง:</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSupabaseConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {isSupabaseConnected ? 'เชื่อมต่อออนไลน์แล้ว' : 'ทำงานในเครื่องนี้'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          เครื่องมือสำหรับส่งข้อมูลขึ้น Cloud ทันที หรือสำรองไฟล์การตั้งค่าเก็บไว้
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isSupabaseConnected && (
                        <button
                          type="button"
                          onClick={handleSyncDocumentTypesNow}
                          disabled={isSyncingCloud}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isSyncingCloud ? 'กำลังซิงค์...' : 'บังคับซิงค์ขึ้น Cloud ทันที'}</span>
                        </button>
                      )}

                      {isSupabaseConnected && tableStatus.checked && !tableStatus.exists && (
                        <button
                          type="button"
                          onClick={handleCopySystemSettingsSql}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedSql ? 'คัดลอก SQL แล้ว' : 'คัดลอก SQL สร้างตาราง'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCopySettingsJson}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedSettings ? 'คัดลอกเรียบร้อย' : 'คัดลอกข้อมูลสำรอง'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowJsonModal(true)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>นำเข้าข้อมูลสำรอง</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSettingsJson}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลดไฟล์ .json</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STATUS LABELS */}
          {activeTab === 'statuses' && (
            <div className="space-y-5">
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Tag className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-950">ปรับแต่งชื่อป้ายสถานะที่แสดงให้ครูเห็น</div>
                    <p className="text-indigo-800 mt-0.5">
                      แก้ไขข้อความ สีป้าย หรือคำอธิบายของแต่ละสถานะ แล้วกดปุ่ม &quot;บันทึกป้ายสถานะ&quot; ด้านล่างเพื่อใช้งานทันที
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        title: 'คืนค่าป้ายสถานะเริ่มต้น',
                        message: 'ต้องการคืนค่าชื่อและสีป้ายสถานะกลับเป็นค่ามาตรฐานของระบบใช่หรือไม่?',
                        confirmLabel: 'คืนค่าเริ่มต้น',
                        variant: 'warning',
                        onConfirm: () => handlePersistStatuses(DEFAULT_STATUS_CONFIGS),
                      })
                    }
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>คืนค่าเริ่มต้น</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingStatus(!isAddingStatus)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มป้ายสถานะใหม่</span>
                  </button>
                </div>
              </div>

              {/* Save Bar when modified */}
              {hasUnsavedStatusChanges && (
                <div className="sticky top-0 z-10 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>มีการแก้ไขป้ายสถานะที่ยังไม่ได้บันทึก กรุณากดปุ่ม &quot;บันทึกการแก้ไข&quot; เพื่อให้มีผลทุกเครื่อง</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftStatuses(statusConfigs);
                        setHasUnsavedStatusChanges(false);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      ยกเลิกที่แก้
                    </button>
                    <button
                      type="button"
                      disabled={isSavingStatuses}
                      onClick={() => handlePersistStatuses(draftStatuses)}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingStatuses ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขป้ายสถานะ'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Add New Status Form */}
              {isAddingStatus && (
                <form
                  onSubmit={handleAddNewStatus}
                  className="bg-white p-5 rounded-2xl border-2 border-indigo-300 shadow-md space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-600" />
                      <span>สร้างป้ายสถานะใหม่</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingStatus(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ข้อความที่แสดงบนป้ายสถานะ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newStatus.label || ''}
                        onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                        placeholder="เช่น ตรวจแล้วรอบที่ 1 หรือ รอลงนามผู้อำนวยการ"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        เลือกสีป้ายสถานะ
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
                              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${c.bg}`}></span>
                              <span className="text-xs font-semibold text-slate-700 truncate">{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        คำอธิบายความหมาย (ไม่บังคับ)
                      </label>
                      <input
                        type="text"
                        value={newStatus.description || ''}
                        onChange={(e) => setNewStatus({ ...newStatus, description: e.target.value })}
                        placeholder="คำชี้แจงสั้นๆ ให้ครูเข้าใจว่าต้องทำอย่างไรต่อ..."
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowCustomStatusKey(!showCustomStatusKey)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        {showCustomStatusKey ? 'ซ่อนการกำหนดรหัสระบบ' : 'กำหนดรหัสระบบเอง (สำหรับแอดมินขั้นสูง)'}
                      </button>
                      {showCustomStatusKey && (
                        <input
                          type="text"
                          value={newStatus.id || ''}
                          onChange={(e) => setNewStatus({ ...newStatus, id: e.target.value })}
                          placeholder="รหัสภาษาอังกฤษ เช่น pending_signature (เว้นว่างได้ ระบบสร้างให้อัตโนมัติ)"
                          className="mt-1.5 w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStatus(false)}
                      className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      บันทึกป้ายสถานะใหม่
                    </button>
                  </div>
                </form>
              )}

              {/* Statuses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draftStatuses.map((st) => {
                  const style = getStatusStyle(st.color);
                  const colorMeta = COLOR_OPTIONS.find((c) => c.id === st.color);
                  return (
                    <div
                      key={st.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.badge}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                          <span>{st.label || 'ไม่มีชื่อ'}</span>
                        </span>

                        {!st.is_system ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteStatus(st.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบป้ายสถานะนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            สถานะหลัก
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          ข้อความที่แสดงบนป้าย:
                        </label>
                        <input
                          type="text"
                          value={st.label}
                          onChange={(e) => handleEditDraftStatus(st.id, { label: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-600">สีป้าย:</label>
                          {colorMeta && <span className="text-[10px] text-slate-400">{colorMeta.hint}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleEditDraftStatus(st.id, { color: c.id })}
                              className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center transition-transform cursor-pointer ${
                                st.color === c.id
                                  ? 'ring-2 ring-offset-1 ring-slate-800 scale-110 shadow-sm'
                                  : 'opacity-65 hover:opacity-100 hover:scale-105'
                              }`}
                              title={c.name}
                            >
                              {st.color === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">คำอธิบายสั้นๆ:</label>
                        <input
                          type="text"
                          value={st.description || ''}
                          onChange={(e) => handleEditDraftStatus(st.id, { description: e.target.value })}
                          placeholder="คำอธิบายความหมายของสถานะนี้..."
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explicit Bottom Save Button */}
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  disabled={!hasUnsavedStatusChanges || isSavingStatuses}
                  onClick={() => handlePersistStatuses(draftStatuses)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    hasUnsavedStatusChanges
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingStatuses ? 'กำลังบันทึก...' : 'บันทึกป้ายสถานะทั้งหมด'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QUICK PLAN STATUS ADJUSTMENT */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="relative sm:col-span-7">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={planSearch}
                      onChange={(e) => setPlanSearch(e.target.value)}
                      placeholder="ค้นหาชื่อครู, รหัสวิชา, หรือชื่อเรื่อง..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <select
                      value={planTypeFilter}
                      onChange={(e) => {
                        setPlanTypeFilter(e.target.value);
                        setSelectedPlanIds(new Set());
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    >
                      <option value="all">กรองตามชื่องาน: ทุกหัวข้องาน</option>
                      {distinctPlanTypes.map((pt) => (
                        <option key={pt} value={pt}>
                          งาน: {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Quick Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                  <span className="text-slate-400 text-xs shrink-0">สถานะ:</span>
                  {(() => {
                    const seen = new Set<string>();
                    const buttons: { id: string; label: string }[] = [];
                    buttons.push({ id: 'all', label: 'ทั้งหมด' });
                    seen.add('all');
                    buttons.push({ id: 'late', label: 'ส่งช้าเท่านั้น' });
                    seen.add('late');

                    (draftStatuses || []).forEach((s) => {
                      const cleanId = (s.id || '').trim().toLowerCase();
                      if (!cleanId || seen.has(cleanId)) return;
                      seen.add(cleanId);
                      buttons.push({ id: s.id.trim(), label: s.label });
                    });

                    return buttons.map((f) => (
                      <button
                        key={`plan-filter-${f.id}`}
                        type="button"
                        onClick={() => setPlanFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          planFilter === f.id
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Bulk Action Bar */}
              {selectedPlanIds.size > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-indigo-950">
                    เลือกอยู่ {selectedPlanIds.size} รายการ — เปลี่ยนสถานะพร้อมกันเป็น:
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkStatusTarget}
                      onChange={(e) => setBulkStatusTarget(e.target.value)}
                      className="px-3 py-1.5 border border-indigo-300 rounded-xl text-xs font-bold bg-white text-slate-800"
                    >
                      {draftStatuses.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isBulkUpdating}
                      onClick={handleApplyBulkStatus}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isBulkUpdating ? 'กำลังบันทึก...' : 'นำไปใช้ทันที'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanIds(new Set())}
                      className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {/* Plans Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 pl-4 pr-2 w-8">
                          <input
                            type="checkbox"
                            checked={filteredPlans.length > 0 && filteredPlans.every((p) => selectedPlanIds.has(p.id))}
                            onChange={handleToggleSelectAllFiltered}
                            className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                            title="เลือกทุกรายการที่แสดง"
                          />
                        </th>
                        <th className="py-3 px-3">วิชา / ชื่อเรื่อง</th>
                        <th className="py-3 px-3">ครูผู้สอน</th>
                        <th className="py-3 px-3">หัวข้องาน</th>
                        <th className="py-3 px-3">วันเวลาที่ส่ง</th>
                        <th className="py-3 px-3">เวลาส่ง</th>
                        <th className="py-3 px-4">เปลี่ยนสถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPlans.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            ไม่พบรายการงานที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      ) : (
                        filteredPlans.map((plan) => {
                          const isUpdating = updatingPlanId === plan.id;

                          return (
                            <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 pl-4 pr-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPlanIds.has(plan.id)}
                                  onChange={() => handleToggleSelectPlan(plan.id)}
                                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3 max-w-xs">
                                <div className="font-bold text-slate-900 truncate">
                                  {plan.subject_code} - {plan.subject_name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate" title={plan.plan_title}>
                                  {plan.plan_title}
                                </div>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-semibold text-slate-800">{plan.teacher_name}</div>
                                <div className="text-[10px] text-slate-400">{plan.teacher_id}</div>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {plan.plan_type}
                                </span>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                {formatThaiDateTime(plan.submitted_at)}
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlanLate(plan)}
                                  disabled={isUpdating}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    plan.is_late
                                      ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title="คลิกเพื่อสลับสถานะส่งช้า / ตรงเวลา"
                                >
                                  {plan.is_late ? (
                                    <>
                                      <AlertTriangle className="w-3 h-3 text-orange-600" />
                                      <span>ส่งช้า</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
                                    {draftStatuses.map((st) => (
                                      <option key={st.id} value={st.id}>
                                        {st.label}
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
                                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                      <UserCheck className="w-3 h-3 text-amber-300" />
                                      <span>เปิดตรวจ</span>
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
            <span>การเปลี่ยนแปลงทุกอย่างจะซิงค์ไปยังทุกเครื่องอัตโนมัติ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Inline Confirm Modal (Safe, zero window.confirm) */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmAction.variant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{confirmAction.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{confirmAction.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmAction.onConfirm;
                  setConfirmAction(null);
                  await fn();
                }}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold cursor-pointer ${
                  confirmAction.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher View Preview Modal */}
      {previewTask && (
        <div className="fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="bg-[#0B1329] p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-sky-300 uppercase">ตัวอย่างมุมมองฝั่งครูผู้สอน</div>
                  <h3 className="text-sm font-bold text-white">{previewTask.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs bg-slate-50/70">
              {/* Mock Assignment Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 mb-1">
                      ภาคเรียนที่ {previewTask.semester}/{previewTask.academic_year}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{previewTask.name}</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {getRemainingTimeBadge(previewTask.end_date, previewTask.end_time).label}
                  </span>
                </div>

                {previewTask.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    {previewTask.description}
                  </p>
                )}

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    ส่งได้ถึง: <strong className="text-slate-800">{formatThaiDateTime(`${previewTask.end_date} ${previewTask.end_time}`)}</strong>
                  </span>
                </div>

                {previewTask.sample_url && (
                  <a
                    href={previewTask.sample_url.startsWith('http') ? previewTask.sample_url : `https://${previewTask.sample_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl font-bold text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{previewTask.sample_title || 'เปิดดูไฟล์ตัวอย่าง'}</span>
                  </a>
                )}
              </div>

              {/* Form Fields Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <List className="w-3.5 h-3.5 text-purple-600" />
                  <span>สิ่งที่ครูต้องกรอกตอนกดปุ่มส่งงาน:</span>
                </div>
                {previewTask.fields && previewTask.fields.length > 0 ? (
                  previewTask.fields.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-700">
                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                      </div>
                      <div className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
                        {f.type === 'user_profile'
                          ? '(ระบบกรอกชื่อครูให้อัตโนมัติ)'
                          : f.type === 'file'
                          ? 'ปุ่มเลือกไฟล์จากเครื่อง หรือวางลิงก์ Google Drive'
                          : f.type === 'select'
                          ? `ตัวเลือก Dropdown (${(f.options || []).slice(0, 3).join(', ')}...)`
                          : f.placeholder || 'ช่องกรอกข้อความ'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <div>• รหัสวิชา และ ชื่อรายวิชา</div>
                    <div>• ระดับชั้น / ภาคเรียน</div>
                    <div>• ชื่อแผนการสอน / หน่วยการเรียนรู้</div>
                    <div>• อัปโหลดไฟล์ PDF หรือวางลิงก์ Google Drive</div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const t = previewTask;
                  setPreviewTask(null);
                  handleOpenEditTaskModal(t, 1);
                }}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                แก้ไขงานนี้
              </button>
              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิดตัวอย่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileJson className="w-5 h-5 text-amber-600" />
                <span>นำเข้าข้อมูลสำรอง (JSON)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowJsonModal(false);
                  setJsonError(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={7}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setJsonError(null);
              }}
              placeholder='วางโค้ดข้อมูลสำรองที่นี่...'
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
            {jsonError && (
              <div className="text-rose-600 text-xs font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowJsonModal(false);
                  setJsonError(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!jsonInput.trim()}
                onClick={handleImportJson}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                นำเข้าข้อมูลทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Email Prompt Modal */}
      {broadcastConfig && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-[#0B1329] p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center text-amber-400 ring-1 ring-amber-400/30 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/15 ring-1 ring-amber-400/30 text-amber-300 text-[10px] font-bold tracking-wider uppercase">
                    บันทึกงานเรียบร้อยแล้ว
                  </div>
                  <h3 className="font-bold text-base text-white mt-0.5 leading-tight">
                    ต้องการส่งอีเมลแจ้งเตือนครูเลยไหม?
                  </h3>
                </div>
              </div>
              {!isBroadcastingEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastConfig(null);
                    setBroadcastSuccessMsg(null);
                    setBroadcastProgress(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 rounded-xl cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                ระบบเปิดรับส่งงานนี้เรียบร้อยแล้ว คุณสามารถกดปุ่มด้านล่างเพื่อส่งอีเมลแจ้งหัวข้องานและวันหมดเขตไปยังครูทุกคนได้ทันที หรือกดข้ามหากยังไม่ต้องการแจ้งทางอีเมล
              </p>

              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-amber-950 font-black text-sm">{broadcastConfig.name}</span>
                  <span className="font-mono bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[11px] font-bold shrink-0">
                    ภาค {broadcastConfig.semester}/{broadcastConfig.academic_year}
                  </span>
                </div>
                <div className="text-slate-700 flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    กำหนดส่ง:{' '}
                    <strong className="text-slate-900 font-bold">
                      {formatThaiDateTime(`${broadcastConfig.end_date} ${broadcastConfig.end_time || '23:59'}`)}
                    </strong>
                  </span>
                </div>
                <div className="text-slate-700 flex items-center gap-1.5 pt-1 border-t border-amber-200/60 text-[11px]">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ผู้รับแจ้งเตือน: <strong className="text-emerald-700 font-bold">{teacherEmails.length} ท่าน</strong> ในระบบ
                  </span>
                </div>
              </div>

              {isBroadcastingEmail && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-center text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  <span className="font-bold text-sky-950 text-sm">
                    กำลังจัดส่งอีเมลแจ้งเตือนครู {broadcastProgress ? `(${broadcastProgress.sent}/${broadcastProgress.total} ท่าน)` : ''}...
                  </span>
                </div>
              )}

              {broadcastSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-bold">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>{broadcastSuccessMsg}</div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              {!broadcastSuccessMsg ? (
                <>
                  <button
                    type="button"
                    disabled={isBroadcastingEmail}
                    onClick={() => {
                      setBroadcastConfig(null);
                      setBroadcastSuccessMsg(null);
                      setBroadcastProgress(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    ข้าม (ไม่ต้องส่งอีเมล)
                  </button>

                  <button
                    type="button"
                    disabled={isBroadcastingEmail || teacherEmails.length === 0}
                    onClick={async () => {
                      if (!broadcastConfig) return;
                      setIsBroadcastingEmail(true);
                      setBroadcastSuccessMsg(null);
                      setBroadcastProgress({ sent: 0, total: teacherEmails.length });

                      const deadlineFormatted = formatThaiDateTime(`${broadcastConfig.end_date} ${broadcastConfig.end_time || '23:59'}`);
                      const subject = `[แจ้งภาระงานใหม่] ${broadcastConfig.name} - กำหนดส่ง ${deadlineFormatted} (จ.ภ. กาฬสินธุ์)`;
                      const body = `เรียน คุณครูทุกท่าน โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์\n\nฝ่ายบริหารงานวิชาการขอแจ้งมอบหมายภาระงานและกำหนดส่งเอกสารใหม่ในระบบส่งเอกสารวิชาการออนไลน์:\n\nภาระงาน: ${broadcastConfig.name}\nภาคเรียนที่ ${broadcastConfig.semester} ปีการศึกษา ${broadcastConfig.academic_year}\nกำหนดส่ง: ${deadlineFormatted}\n${broadcastConfig.description ? `รายละเอียด: ${broadcastConfig.description}\n` : ''}${broadcastConfig.sample_url ? `เอกสารตัวอย่าง: ${broadcastConfig.sample_url}\n` : ''}\nเข้าสู่ระบบเพื่อดำเนินการส่งเอกสาร: ${typeof window !== 'undefined' ? window.location.origin : ''}\n\nกลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
                      const html = `<!DOCTYPE html><html><body><div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;"><h2 style="color: #0b1329; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">มอบหมายภาระงานใหม่ ฝ่ายวิชาการ จ.ภ. กาฬสินธุ์</h2><p>เรียน คุณครูทุกท่าน</p><p>ฝ่ายบริหารวิชาการขอแจ้งมอบหมายภาระงานในระบบส่งเอกสารวิชาการออนไลน์ ดังนี้:</p><div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;"><strong>ภาระงาน:</strong> ${broadcastConfig.name}<br/><strong>ภาคเรียน/ปีการศึกษา:</strong> ภาคเรียนที่ ${broadcastConfig.semester}/${broadcastConfig.academic_year}<br/><strong>กำหนดส่ง:</strong> <span style="color: #dc2626; font-weight: bold;">${deadlineFormatted}</span><br/>${broadcastConfig.description ? `<strong>รายละเอียด:</strong> ${broadcastConfig.description}<br/>` : ''}${broadcastConfig.sample_url ? `<a href="${broadcastConfig.sample_url}" style="color: #2563eb;">ดูตัวอย่างเอกสาร</a>` : ''}</div><p><a href="${typeof window !== 'undefined' ? window.location.origin : ''}" style="display: inline-block; background-color: #0b1329; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">เข้าสู่ระบบส่งงานวิชาการ</a></p><hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/><p style="font-size: 12px; color: #64748b;">กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p></div></body></html>`;

                      let sentCount = 0;
                      const chunkSize = 4;
                      for (let i = 0; i < teacherEmails.length; i += chunkSize) {
                        const chunk = teacherEmails.slice(i, i + chunkSize);
                        const results = await Promise.allSettled(
                          chunk.map((email) =>
                            sendAcademicEmailOneClick({
                              to: email,
                              subject,
                              htmlBody: html,
                              body,
                              senderName: ACADEMIC_SENDER_NAME,
                            })
                          )
                        );
                        for (const r of results) {
                          if (r.status === 'fulfilled' && r.value.success) {
                            sentCount++;
                          }
                        }
                        setBroadcastProgress({ sent: Math.min(i + chunkSize, teacherEmails.length), total: teacherEmails.length });
                      }

                      setIsBroadcastingEmail(false);
                      if (sentCount > 0) {
                        setBroadcastSuccessMsg(`ส่งอีเมลแจ้งเตือนครูสำเร็จ ${sentCount} จาก ${teacherEmails.length} ท่านเรียบร้อยแล้ว`);
                      } else {
                        setBroadcastSuccessMsg(`บันทึกงานเรียบร้อยแล้ว (ไม่สามารถส่งอีเมลได้ โปรดตรวจสอบการเชื่อมต่อเมล)`);
                      }

                      setTimeout(() => {
                        setBroadcastSuccessMsg(null);
                        setBroadcastConfig(null);
                        setBroadcastProgress(null);
                      }, 2200);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 text-white" />
                    <span>ส่งอีเมลแจ้งเตือนครูทันที ({teacherEmails.length} ท่าน)</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastConfig(null);
                    setBroadcastSuccessMsg(null);
                    setBroadcastProgress(null);
                  }}
                  className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3-Step Guided Wizard Add/Edit Task Modal */}
      {taskModal && taskModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 p-2.5 sm:p-5 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[93vh] my-auto">
            {/* Wizard Header */}
            <div className="bg-[#0B1329] p-4 sm:p-5 text-white shrink-0 border-b border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/15 ring-1 ring-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    {taskModal.isNew ? <Plus className="w-5 h-5 stroke-[2.5]" /> : <Edit2 className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-300 tracking-wide block">
                      {taskModal.isNew ? 'สร้างงานใหม่ (ทำตาม 3 ขั้นตอนง่ายๆ)' : 'แก้ไขข้อมูลงาน'}
                    </span>
                    <h3 className="font-bold text-base sm:text-lg truncate">
                      {taskModal.isNew
                        ? taskModal.name
                          ? `สร้างงาน: ${taskModal.name}`
                          : 'เพิ่มงานใหม่ให้ครูส่ง'
                        : `แก้ไขงาน: ${taskModal.name || 'ไม่ระบุชื่อ'}`}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3-Step Visual Stepper */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800">
                {[
                  { num: 1 as const, label: '1. สั่งงานอะไร?', sub: 'ชื่องาน & คำแนะนำ' },
                  { num: 2 as const, label: '2. ส่งเมื่อไหร่?', sub: 'วันหมดเขต & วิธีตรวจ' },
                  { num: 3 as const, label: '3. ครูต้องกรอกอะไร?', sub: 'เลือกช่องกรอก & ดูตัวอย่าง' },
                ].map((s) => {
                  const isActive = taskModal.step === s.num;
                  const isDone = taskModal.step > s.num;
                  return (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => setTaskModal({ ...taskModal, step: s.num, validationError: null })}
                      className={`p-2 sm:px-3 sm:py-2 rounded-xl text-left transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                          : isDone
                          ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        <span className="truncate">{s.label}</span>
                      </div>
                      <div
                        className={`text-[10px] truncate hidden sm:block ${
                          isActive ? 'text-slate-800 font-medium' : 'opacity-75'
                        }`}
                      >
                        {s.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wizard Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1 bg-slate-50/50">
              {taskModal.validationError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{taskModal.validationError}</span>
                </div>
              )}

              {/* STEP 1: WHAT TASK */}
              {taskModal.step === 1 && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        ชื่องานที่ต้องการให้ครูส่ง <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={taskModal.name}
                        onChange={(e) =>
                          setTaskModal({ ...taskModal, name: e.target.value, validationError: null })
                        }
                        placeholder="เช่น แผนการสอน ภาคเรียนที่ 2, แบบรายงาน ปพ.5, วิจัยในชั้นเรียน"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        ชื่อนี้จะไปปรากฏบนปุ่มส่งงานและตารางติดตามงานของครูทุกคน
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          ภาคเรียน และ ปีการศึกษา
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
                            className="w-24 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          คำชี้แจงเพิ่มเติมสำหรับครู (ไม่บังคับ)
                        </label>
                        <input
                          type="text"
                          value={taskModal.description}
                          onChange={(e) => setTaskModal({ ...taskModal, description: e.target.value })}
                          placeholder="เช่น ส่งไฟล์ PDF ที่รวมทุกหน่วยแล้ว หรือส่งเป็นไฟล์ Excel"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sample File / Link */}
                  <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
                        <span>แนบลิงก์ไฟล์ตัวอย่าง / แบบฟอร์มต้นแบบให้ครูดาวน์โหลด (ถ้ามี)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={taskModal.sample_title}
                          onChange={(e) => setTaskModal({ ...taskModal, sample_title: e.target.value })}
                          placeholder="ชื่อปุ่ม เช่น ดาวน์โหลดแบบฟอร์มตัวอย่าง"
                          className="w-full px-3 py-2 border border-sky-300 rounded-xl text-xs bg-white text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <input
                          type="url"
                          value={taskModal.sample_url}
                          onChange={(e) => setTaskModal({ ...taskModal, sample_url: e.target.value })}
                          placeholder="วางลิงก์ Google Drive / Google Docs ที่นี่..."
                          className="w-full px-3 py-2 border border-sky-300 rounded-xl text-xs bg-white font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    {taskModal.sample_url.trim() && (
                      <a
                        href={
                          /^https?:\/\//i.test(taskModal.sample_url.trim())
                            ? taskModal.sample_url.trim()
                            : `https://${taskModal.sample_url.trim()}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>ทดสอบเปิดลิงก์ตัวอย่าง</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: WHEN & HOW TO REVIEW */}
              {taskModal.step === 2 && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>กำหนดช่วงเวลาส่งงาน</span>
                      </span>

                      {/* 1-click Deadline Shortcuts */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-500">ตั้งวันหมดเขตด่วน:</span>
                        {[
                          { label: 'อีก 7 วัน', date: getDateAfterDays(7) },
                          { label: 'อีก 14 วัน', date: getDateAfterDays(14) },
                          { label: 'อีก 30 วัน', date: getDateAfterDays(30) },
                          { label: 'สิ้นเดือนนี้', date: getEndOfCurrentMonthDate() },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setTaskModal({ ...taskModal, end_date: preset.date })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              taskModal.end_date === preset.date
                                ? 'bg-amber-400 text-slate-950 border-amber-500'
                                : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="text-xs font-bold text-slate-700">วันที่เริ่มเปิดให้ครูส่ง:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={taskModal.start_date}
                            onChange={(e) => setTaskModal({ ...taskModal, start_date: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                          <input
                            type="time"
                            value={taskModal.start_time}
                            onChange={(e) => setTaskModal({ ...taskModal, start_time: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 space-y-2">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>วันหมดเขตส่ง (Deadline):</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={taskModal.end_date}
                            onChange={(e) => setTaskModal({ ...taskModal, end_date: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold text-rose-950"
                          />
                          <input
                            type="time"
                            value={taskModal.end_time}
                            onChange={(e) => setTaskModal({ ...taskModal, end_time: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold text-rose-950"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 pt-1">
                      <input
                        type="checkbox"
                        checked={taskModal.allow_late}
                        onChange={(e) => setTaskModal({ ...taskModal, allow_late: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>ยังส่งช้าหลังวันหมดเขตได้ (ระบบจะติดป้าย &quot;ส่งช้า&quot; ให้อัตโนมัติ)</span>
                    </label>
                  </div>

                  {/* Evaluation Mode */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-purple-600" />
                      <span>ผู้ตรวจจะประเมินงานนี้ด้วยวิธีไหน?</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          taskModal.evaluation_type === 'approval_only'
                            ? 'border-indigo-500 bg-indigo-50/80 text-indigo-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="wizard_eval_type"
                          checked={taskModal.evaluation_type === 'approval_only'}
                          onChange={() => setTaskModal({ ...taskModal, evaluation_type: 'approval_only' })}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>ตรวจแบบ ผ่าน / ส่งกลับแก้ไข</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                              แนะนำ
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            ผู้ตรวจกดเลือก &quot;อนุมัติ&quot; หรือ &quot;ส่งกลับแก้ไข&quot; ได้ทันที รวดเร็ว ไม่ต้องกรอกคะแนน
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          taskModal.evaluation_type === 'rubric_score'
                            ? 'border-amber-500 bg-amber-50/80 text-amber-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="wizard_eval_type"
                          checked={taskModal.evaluation_type === 'rubric_score'}
                          onChange={() => setTaskModal({ ...taskModal, evaluation_type: 'rubric_score' })}
                          className="mt-0.5 text-amber-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            ตรวจแบบ ให้คะแนนเต็ม 100 (มีเกณฑ์รูบริก)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            มีตารางให้คะแนน 5 ด้านรวม 100 คะแนน เหมาะสำหรับแผนฉบับสมบูรณ์ หรือวิจัย
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: TEACHER FORM TOGGLES + LIVE PREVIEW */}
              {taskModal.step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Simple Toggle Switches */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-purple-600" />
                            <span>เลือกช่องข้อมูลที่ต้องการให้ครูกรอก</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setTaskModal({
                                ...taskModal,
                                useCustomForm: !taskModal.useCustomForm,
                                fields:
                                  !taskModal.useCustomForm && taskModal.fields.length === 0
                                    ? [...DEFAULT_DYNAMIC_FIELDS]
                                    : taskModal.fields,
                              })
                            }
                            className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                          >
                            {taskModal.useCustomForm ? 'สลับใช้ฟอร์มแผนมาตรฐาน' : 'เปิดใช้สวิตช์เลือกช่องเอง'}
                          </button>
                        </div>

                        {!taskModal.useCustomForm ? (
                          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs text-indigo-950">
                            <div className="font-bold">กำลังใช้แบบฟอร์มมาตรฐานสำหรับแผนการสอน</div>
                            <p className="text-[11px] text-indigo-800 leading-relaxed">
                              ครูจะกรอก: <strong>รหัสวิชา, ชื่อวิชา, ระดับชั้น, ภาคเรียน, ชื่อแผน และแนบไฟล์ PDF / Google Drive</strong>
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setTaskModal({
                                  ...taskModal,
                                  useCustomForm: true,
                                  fields:
                                    taskModal.fields.length > 0 ? taskModal.fields : [...DEFAULT_DYNAMIC_FIELDS],
                                })
                              }
                              className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-900 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100"
                            >
                              ต้องการปรับเลือกช่องกรอกเอง (เช่น ปิดช่องรหัสวิชา)
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {POPULAR_TOGGLE_FIELDS.map((def) => {
                              const checked = isToggleFieldActive(taskModal.fields || [], def);
                              return (
                                <label
                                  key={def.key}
                                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    checked
                                      ? 'bg-emerald-50/60 border-emerald-300'
                                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900">{def.label}</div>
                                    <div className="text-[11px] text-slate-500">{def.description}</div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleQuickField(def)}
                                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Optional Advanced Custom Form Builder */}
                      {taskModal.useCustomForm && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                          <button
                            type="button"
                            onClick={() =>
                              setTaskModal({
                                ...taskModal,
                                showAdvancedBuilder: !taskModal.showAdvancedBuilder,
                              })
                            }
                            className="w-full flex items-center justify-between text-xs font-bold text-purple-900 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <List className="w-4 h-4 text-purple-600" />
                              <span>ตั้งค่าช่องข้อมูลขั้นสูง (เพิ่ม Dropdown / Checkbox / แก้ชื่อช่อง)</span>
                            </span>
                            {taskModal.showAdvancedBuilder ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {taskModal.showAdvancedBuilder && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
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
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Live Teacher Preview */}
                    <div className="lg:col-span-5">
                      <div className="bg-white rounded-2xl border-2 border-sky-200 shadow-xs overflow-hidden sticky top-0">
                        <div className="bg-sky-50 px-4 py-2.5 border-b border-sky-200 flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-sky-600" />
                          <span className="text-xs font-bold text-sky-950">ตัวอย่างหน้าจอที่ครูจะเห็นจริง</span>
                        </div>
                        <div className="p-4 space-y-3 text-xs">
                          <div>
                            <div className="text-[10px] font-bold text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded-full border border-amber-200 mb-1">
                              ภาคเรียนที่ {taskModal.semester}/{taskModal.academic_year}
                            </div>
                            <div className="text-sm font-bold text-slate-900">
                              {taskModal.name.trim() || '(ยังไม่ได้กรอกชื่องาน)'}
                            </div>
                            {taskModal.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{taskModal.description}</p>
                            )}
                          </div>

                          <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              ส่งได้ถึง: {formatThaiDateTime(`${taskModal.end_date} ${taskModal.end_time}`)}
                            </span>
                          </div>

                          <div className="border-t border-slate-100 pt-2.5 space-y-2">
                            {taskModal.useCustomForm ? (
                              (taskModal.fields || []).length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">
                                  เลือกสวิตช์ทางซ้ายเพื่อเพิ่มช่องให้ครูกรอก
                                </p>
                              ) : (
                                taskModal.fields.map((f) => (
                                  <div key={f.id} className="space-y-0.5">
                                    <div className="text-[11px] font-semibold text-slate-700">
                                      {f.label} {f.required && <span className="text-rose-500">*</span>}
                                    </div>
                                    <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                                      {f.type === 'user_profile'
                                        ? currentTeacher?.Name || 'ชื่อครูอัตโนมัติ'
                                        : f.type === 'file'
                                        ? 'เลือกไฟล์จากเครื่อง / วางลิงก์ Drive'
                                        : f.type === 'select'
                                        ? 'เลือกจากรายการ...'
                                        : f.placeholder || 'ช่องพิมพ์คำตอบ'}
                                    </div>
                                  </div>
                                ))
                              )
                            ) : (
                              <div className="space-y-1.5 text-[11px] text-slate-600">
                                <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                                  รหัสวิชา / ชื่อวิชา *
                                </div>
                                <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                                  ระดับชั้น / ชื่อแผน *
                                </div>
                                <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                                  แนบไฟล์ PDF / ลิงก์ Google Drive *
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTaskModal(null)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                {taskModal.step > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setTaskModal({
                        ...taskModal,
                        step: (taskModal.step - 1) as 1 | 2 | 3,
                        validationError: null,
                      })
                    }
                    className="px-3.5 py-2 bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>ย้อนกลับ</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {taskModal.step < 3 ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveTaskModal}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer hidden sm:inline-flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>บันทึกเลย</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (taskModal.step === 1 && !taskModal.name.trim()) {
                          setTaskModal({
                            ...taskModal,
                            validationError: 'กรุณากรอก "ชื่องานที่ต้องการให้ครูส่ง" ก่อนไปขั้นตอนถัดไปครับ',
                          });
                          return;
                        }
                        setTaskModal({
                          ...taskModal,
                          step: (taskModal.step + 1) as 1 | 2 | 3,
                          validationError: null,
                        });
                      }}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>ขั้นตอนถัดไป</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveTaskModal}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{taskModal.isNew ? 'ยืนยันสร้างงานนี้' : 'บันทึกการแก้ไขงาน'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
