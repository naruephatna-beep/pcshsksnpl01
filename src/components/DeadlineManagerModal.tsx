import React, { useState } from 'react';
import {
  PlanTypeDeadlineConfig,
  PlanStatusConfig,
  StatusColor,
  LessonPlan,
  Teacher,
  DynamicFormField,
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
} from '../utils/deadlineUtils';
import {
  SYSTEM_SETTINGS_TABLE_SQL,
  checkSystemSettingsTableStatus,
  seedDocumentTypesToSupabase,
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
} from 'lucide-react';

interface DeadlineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deadlineConfigs: PlanTypeDeadlineConfig[];
  onSaveDeadlineConfigs: (configs: PlanTypeDeadlineConfig[]) => void;
  statusConfigs: PlanStatusConfig[];
  onSaveStatusConfigs: (configs: PlanStatusConfig[]) => void;
  plans: LessonPlan[];
  onUpdatePlanStatus?: (planId: string, newStatus: string, isLate?: boolean, adminNotes?: string) => Promise<void> | void;
  isSupabaseConnected?: boolean;
  currentTeacher?: Teacher | null;
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

export const DeadlineManagerModal: React.FC<DeadlineManagerModalProps> = ({
  isOpen,
  onClose,
  deadlineConfigs,
  onSaveDeadlineConfigs,
  statusConfigs,
  onSaveStatusConfigs,
  plans,
  onUpdatePlanStatus,
  isSupabaseConnected,
  currentTeacher,
}) => {
  const [activeTab, setActiveTab] = useState<'deadlines' | 'statuses' | 'plans'>('deadlines');

  // Deadlines state
  const [deadlines, setDeadlines] = useState<PlanTypeDeadlineConfig[]>([...deadlineConfigs]);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState<Partial<PlanTypeDeadlineConfig>>({
    name: '',
    description: '',
    academic_year: '2569',
    semester: '1',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '08:30',
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_time: '16:30',
    allow_late: true,
    is_active: true,
    evaluation_type: 'rubric_score',
    notes: '',
    fields: [],
  });
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [useCustomFormForNew, setUseCustomFormForNew] = useState(false);
  const [editingFormDeadlineId, setEditingFormDeadlineId] = useState<string | null>(null);

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

  // Save deadlines with automatic instant update to SQL (Supabase)
  const handleSaveDeadlines = async (updatedList: PlanTypeDeadlineConfig[]) => {
    setDeadlines(updatedList);
    onSaveDeadlineConfigs(updatedList);

    // Auto-update to SQL (Supabase) immediately
    if (isSupabaseConnected) {
      try {
        const res = await seedDocumentTypesToSupabase(updatedList);
        if (res.success) {
          setSyncCloudNotice(
            `⚡ อัปเดตเข้า SQL อัตโนมัติเรียบร้อยแล้ว! (${updatedList.length} ประเภทเอกสาร) เครื่องอื่นเห็นข้อมูลทันที`
          );
          setTableStatus({ checked: true, exists: true });
        } else {
          setSyncCloudNotice(
            `⚠️ บันทึกลงเครื่องแล้ว แต่ส่งไป SQL ไม่สำเร็จ: ${res.error || 'กรุณารันคำสั่งสร้างตาราง system_settings'}`
          );
        }
      } catch (err: any) {
        setSyncCloudNotice(`⚠️ เกิดข้อผิดพลาดขณะส่งเข้า SQL: ${err?.message}`);
      }
    } else {
      setSyncCloudNotice(
        `💾 บันทึกประเภทเอกสารในเครื่องนี้เรียบร้อย (${updatedList.length} รายการ)`
      );
    }
  };

  // Add new deadline config
  const handleAddNewDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadline.name?.trim()) return;

    const id = `type_${Date.now()}`;
    const item: PlanTypeDeadlineConfig = {
      id,
      name: newDeadline.name.trim(),
      description: newDeadline.description?.trim() || '',
      academic_year: newDeadline.academic_year || '2569',
      semester: newDeadline.semester || '1',
      start_date: newDeadline.start_date || new Date().toISOString().split('T')[0],
      start_time: newDeadline.start_time || '08:30',
      end_date: newDeadline.end_date || new Date().toISOString().split('T')[0],
      end_time: newDeadline.end_time || '16:30',
      allow_late: newDeadline.allow_late ?? true,
      is_active: newDeadline.is_active ?? true,
      evaluation_type: newDeadline.evaluation_type || 'rubric_score',
      notes: newDeadline.notes?.trim() || '',
      fields:
        useCustomFormForNew && newDeadline.fields && newDeadline.fields.length > 0
          ? newDeadline.fields
          : undefined,
    };

    const nextList = [...deadlines, item];
    setIsAddingDeadline(false);
    setUseCustomFormForNew(false);
    setNewDeadline({
      name: '',
      description: '',
      academic_year: '2569',
      semester: '1',
      start_date: new Date().toISOString().split('T')[0],
      start_time: '08:30',
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_time: '16:30',
      allow_late: true,
      is_active: true,
      evaluation_type: 'rubric_score',
      notes: '',
      fields: [],
    });
    await handleSaveDeadlines(nextList);
  };

  const handleDeleteDeadline = async (id: string) => {
    if (deadlines.length <= 1) {
      alert('ต้องมีประเภทเอกสารและกำหนดส่งอย่างน้อย 1 ประเภทในระบบ');
      return;
    }
    const filtered = deadlines.filter((d) => d.id !== id);
    await handleSaveDeadlines(filtered);
  };

  const handleUpdateDeadlineItem = (id: string, updates: Partial<PlanTypeDeadlineConfig>) => {
    const updated = deadlines.map((d) => (d.id === id ? { ...d, ...updates } : d));
    handleSaveDeadlines(updated);
  };

  // Status management
  const handleSaveStatuses = (updatedList: PlanStatusConfig[]) => {
    setStatuses(updatedList);
    onSaveStatusConfigs(updatedList);
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
                            ? 'สถานะ: เชื่อมต่อ Supabase แล้ว (แต่ยังไม่ได้สร้างตาราง system_settings)'
                            : 'สถานะ: เชื่อมต่อ Cloud Database แล้ว (ออนไลน์)'
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
                          ? 'ซิงค์ข้ามคอมพิวเตอร์ทุกเครื่อง Realtime'
                          : 'บันทึกในเครื่องนี้ (ยังไม่ซิงค์ข้ามเครื่อง)'}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed text-slate-600">
                      {isSupabaseConnected ? (
                        tableStatus.checked && !tableStatus.exists ? (
                          <>
                            <strong className="text-amber-900">เหตุผลที่ประเภทเอกสารยังไม่ขึ้นในคอมเครื่องอื่น:</strong>{' '}
                            ฐานข้อมูล Supabase ยังไม่มีตาราง <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">system_settings</code>{' '}
                            สำหรับเก็บประเภทเอกสาร ให้กดปุ่ม <strong>&quot;คัดลอก SQL สร้างตารางระบบ&quot;</strong> แล้วนำไปวางใน Supabase SQL Editor แล้วกด Run เพียง 1 ครั้ง ข้อมูลจะซิงค์ไปคอมเครื่องอื่นทันที!
                          </>
                        ) : (
                          <>
                            ประเภทเอกสารทุกประเภท (เช่น แผนการจัดการเรียนรู้ฉบับย่อ, แผนการจัดการเรียนรู้ฉบับสมบูรณ์ และประเภทเอกสารที่เพิ่มใหม่) บันทึกลงตาราง{' '}
                            <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-800 font-mono">
                              system_settings
                            </code>{' '}
                            บน Supabase และซิงค์ตรงกันในทุกเครื่องคอมพิวเตอร์ของครูทุกคนทันที
                          </>
                        )
                      ) : (
                        <>
                          <strong className="text-amber-900">เหตุผลที่ยังไม่ขึ้นที่คอมเครื่องอื่น:</strong>{' '}
                          เพราะปัจจุบันเว็บยังไม่ได้ตั้งค่าเชื่อมต่อฐานข้อมูลคลาวด์ (Supabase) ข้อมูลจึงถูกบันทึกไว้ใน Local Storage ของเครื่องนี้เท่านั้น หากเปิดจากคอมเครื่องอื่นระบบจะแสดงประเภทเอกสารเริ่มต้นแทน
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
                <span>{isSupabaseConnected ? 'ระบบเชื่อมต่อ Cloud SQL อัตโนมัติ (Online)' : 'โหมดในเครื่อง'}</span>
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
            <div className="space-y-6">
              {/* Instant SQL Auto-Sync Banner */}
              {syncCloudNotice && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200 ${
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
                    className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-900">
                      ระบบคำนวณการส่งช้าอัตโนมัติ:
                    </span>
                    <span className="text-amber-800 ml-1">
                      เมื่อครูผู้สอนส่งแผนหลัง Deadline ระบบจะติดแท็ก &quot;ส่งช้า&quot; และแสดงระยะเวลาล่าช้าอัตโนมัติ
                    </span>
                  </div>
                </div>

                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-purple-900">
                      โหมดตรวจประเมินของแต่ละชิ้นงาน:
                    </span>
                    <span className="text-purple-800 ml-1">
                      กำหนดได้ว่าชิ้นงานจะตรวจแบบ <strong>ให้คะแนนรูบริก (Rubric 100)</strong> หรือ <strong>ตรวจแค่อนุมัติ/ไม่อนุมัติ</strong> (คลิกป้ายโหมดตรวจที่การ์ดเพื่อสลับได้ทันที)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>รายการประเภทเอกสารและกำหนดส่งทั้งหมด ({deadlines.length} ประเภท)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSaveDeadlines(DEFAULT_DEADLINE_CONFIGS)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    title="คืนค่าช่วงเวลาเริ่มต้นที่ระบบแนะนำ"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>คืนค่าเริ่มต้น</span>
                  </button>
                  <button
                    onClick={() => setIsAddingDeadline(!isAddingDeadline)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มประเภทเอกสารใหม่</span>
                  </button>
                </div>
              </div>

              {/* Form to Add New Deadline */}
              {isAddingDeadline && (
                <form
                  onSubmit={handleAddNewDeadline}
                  className="bg-white p-5 rounded-2xl border-2 border-amber-300 shadow-md space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>เพิ่มประเภทเอกสารและกำหนดเวลาส่งใหม่</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingDeadline(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชื่อประเภทเอกสารแผนการสอน *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDeadline.name || ''}
                        onChange={(e) => setNewDeadline({ ...newDeadline, name: e.target.value })}
                        placeholder="เช่น แผนการจัดการเรียนรู้บูรณาการท้องถิ่น หรือ แผนรายสัปดาห์"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ภาคเรียน / ปีการศึกษา
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={newDeadline.semester || '1'}
                          onChange={(e) => setNewDeadline({ ...newDeadline, semester: e.target.value })}
                          className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white flex-1"
                        >
                          <option value="1">ภาคเรียนที่ 1</option>
                          <option value="2">ภาคเรียนที่ 2</option>
                        </select>
                        <input
                          type="text"
                          value={newDeadline.academic_year || '2569'}
                          onChange={(e) => setNewDeadline({ ...newDeadline, academic_year: e.target.value })}
                          placeholder="ปีการศึกษา เช่น 2569"
                          className="w-24 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        คำอธิบาย / รายละเอียดประเภทเอกสาร
                      </label>
                      <input
                        type="text"
                        value={newDeadline.description || ''}
                        onChange={(e) => setNewDeadline({ ...newDeadline, description: e.target.value })}
                        placeholder="คำชี้แจงสำหรับครูผู้สอน..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    {/* Start Date & Time */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>วันและเวลาเริ่มต้นเปิดรับส่ง:</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">วันที่เริ่ม</label>
                          <input
                            type="date"
                            required
                            value={newDeadline.start_date || ''}
                            onChange={(e) => setNewDeadline({ ...newDeadline, start_date: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">เวลาที่เริ่ม</label>
                          <input
                            type="time"
                            required
                            value={newDeadline.start_time || '08:30'}
                            onChange={(e) => setNewDeadline({ ...newDeadline, start_time: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* End Date & Time (Deadline) */}
                    <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 space-y-2">
                      <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>วันและเวลากำหนดส่ง (Deadline สิ้นสุด):</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-rose-700 mb-0.5">วันที่กำหนดส่ง</label>
                          <input
                            type="date"
                            required
                            value={newDeadline.end_date || ''}
                            onChange={(e) => setNewDeadline({ ...newDeadline, end_date: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-semibold text-rose-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-rose-700 mb-0.5">เวลากำหนดส่ง</label>
                          <input
                            type="time"
                            required
                            value={newDeadline.end_time || '16:30'}
                            onChange={(e) => setNewDeadline({ ...newDeadline, end_time: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-semibold text-rose-950"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Mode Selection */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-purple-600" />
                        <span>รูปแบบการตรวจประเมินของงานนี้</span>
                        <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-slate-500">เลือกรูปแบบที่ให้กรรมการตรวจ</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <label
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                          (newDeadline.evaluation_type || 'rubric_score') === 'rubric_score'
                            ? 'border-amber-500 bg-amber-50/80 text-amber-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="new_evaluation_type"
                          value="rubric_score"
                          checked={(newDeadline.evaluation_type || 'rubric_score') === 'rubric_score'}
                          onChange={() => setNewDeadline({ ...newDeadline, evaluation_type: 'rubric_score' })}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1 text-slate-900">
                            🏆 ตรวจแบบให้คะแนน (Rubric)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            มีเกณฑ์ประเมิน 5 ด้าน คำนวณเป็น 100% เหมาะสำหรับแผนฉบับสมบูรณ์
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                          newDeadline.evaluation_type === 'approval_only'
                            ? 'border-indigo-500 bg-indigo-50/80 text-indigo-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="new_evaluation_type"
                          value="approval_only"
                          checked={newDeadline.evaluation_type === 'approval_only'}
                          onChange={() => setNewDeadline({ ...newDeadline, evaluation_type: 'approval_only' })}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1 text-slate-900">
                            ✅ ตรวจแค่อนุมัติ / ไม่อนุมัติ
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            อนุมัติ หรือ ส่งกลับแก้ไข ไม่ต้องให้คะแนนรูบริก เหมาะสำหรับแผนย่อ หรือเอกสารส่งตามรอบ
                          </div>
                        </div>
                      </label>
                    </div>
                  {/* Form Mode Selection: Standard vs Custom Dynamic Form */}
                  <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 p-4 rounded-2xl border-2 border-indigo-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <List className="w-4 h-4 text-indigo-600" />
                        <span>กำหนดข้อมูลที่ต้องการให้ครูกรอก (Custom Form & Dropdown)</span>
                      </span>
                      <span className="text-[11px] text-indigo-700 font-semibold">
                        {useCustomFormForNew ? `เปิดใช้ฟอร์มกำหนดเอง (${newDeadline.fields?.length || 0} ช่องข้อมูล)` : 'ใช้แบบมาตรฐาน'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                          !useCustomFormForNew
                            ? 'border-indigo-600 bg-white font-bold text-indigo-950 shadow-xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="new_form_mode"
                          checked={!useCustomFormForNew}
                          onChange={() => setUseCustomFormForNew(false)}
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
                          useCustomFormForNew
                            ? 'border-indigo-600 bg-white font-bold text-indigo-950 shadow-xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="new_form_mode"
                          checked={useCustomFormForNew}
                          onChange={() => {
                            setUseCustomFormForNew(true);
                            if (!newDeadline.fields || newDeadline.fields.length === 0) {
                              setNewDeadline({
                                ...newDeadline,
                                fields: [
                                  { id: `fld_${Date.now()}_1`, type: 'user_profile', label: 'ครูผู้สอน', required: true, profile_key: 'name', order: 1 },
                                  { id: `fld_${Date.now()}_2`, type: 'text', label: 'ชื่อเรื่อง / รายวิชา', required: true, order: 2 },
                                  { id: `fld_${Date.now()}_3`, type: 'select', label: 'รูปแบบ / ประเภท', required: true, options: ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2', 'ตัวเลือกที่ 3'], order: 3 },
                                  {
                                    id: `fld_${Date.now()}_4`,
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
                                ],
                              });
                            }
                          }}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                            <span>📋 กำหนดช่องกรอก & Dropdown เอง</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">แอดมินกำหนดเอง</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            เลือกประเภทช่องกรอกได้ มี Dropdown พร้อมกำหนดตัวเลือก, วันที่, ข้อความยาว, ดึงข้อมูลครูอัตโนมัติ
                          </div>
                        </div>
                      </label>
                    </div>

                    {useCustomFormForNew && (
                      <div className="pt-2">
                        <DynamicFormBuilder
                          fields={newDeadline.fields || []}
                          onChange={(updatedFields) =>
                            setNewDeadline({ ...newDeadline, fields: updatedFields })
                          }
                          availableTemplates={deadlines}
                          currentTeacher={currentTeacher}
                        />
                      </div>
                    )}
                  </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newDeadline.allow_late ?? true}
                        onChange={(e) => setNewDeadline({ ...newDeadline, allow_late: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>อนุญาตให้ส่งช้าได้ (โดยระบบจะติดป้ายสถานะ &quot;ส่งช้า&quot; อัตโนมัติ)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                        {isSupabaseConnected ? '☁️ ซิงค์ Cloud (เห็นทุกเครื่อง)' : '💾 บันทึกลงเครื่องนี้'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingDeadline(false)}
                        className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                        title="บันทึกประเภทเอกสารและอัปเดตเข้า SQL อัตโนมัติทันที"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>บันทึกประเภทเอกสารนี้ (อัพเดทเข้า SQL ออโต้)</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Deadlines List */}
              <div className="space-y-4">
                {deadlines.map((dl) => {
                  const isEditing = editingDeadlineId === dl.id;
                  const deadlineDate = constructDateTime(dl.end_date, dl.end_time);
                  const isPastDeadline = Date.now() > deadlineDate.getTime();

                  return (
                    <div
                      key={dl.id}
                      className={`bg-white rounded-2xl border transition-all p-5 shadow-xs ${
                        isPastDeadline
                          ? 'border-amber-200/90 hover:border-amber-300'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {dl.name}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ภาคเรียนที่ {dl.semester}/{dl.academic_year}
                            </span>
                            {/* Evaluation Mode Badge & Instant Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const current = dl.evaluation_type || 'rubric_score';
                                const next = current === 'approval_only' ? 'rubric_score' : 'approval_only';
                                handleUpdateDeadlineItem(dl.id, { evaluation_type: next });
                              }}
                              title="คลิกเพื่อสลับรูปแบบการตรวจ (ตรวจให้คะแนน vs ตรวจแค่อนุมัติ) อัตโนมัติทันที"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer hover:shadow-xs active:scale-95 ${
                                (dl.evaluation_type || 'rubric_score') === 'approval_only'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              {(dl.evaluation_type || 'rubric_score') === 'approval_only' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                  <span>ตรวจแค่อนุมัติ/ไม่อนุมัติ</span>
                                  <span className="text-[10px] text-indigo-500 font-normal">↺ สลับ</span>
                                </>
                              ) : (
                                <>
                                  <Award className="w-3 h-3 text-amber-600" />
                                  <span>ตรวจแบบให้คะแนน (รูบริก 100)</span>
                                  <span className="text-[10px] text-amber-600 font-normal">↺ สลับ</span>
                                </>
                              )}
                            </button>
                            {isPastDeadline ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>เลยกำหนดส่งแล้ว (ระบบตรวจพบส่งช้า)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>เปิดรับส่งตามกำหนด</span>
                              </span>
                            )}

                            {/* Custom Dynamic Form Badge & Quick Configure */}
                            {dl.fields && dl.fields.length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingFormDeadlineId(
                                    editingFormDeadlineId === dl.id ? null : dl.id
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                  editingFormDeadlineId === dl.id
                                    ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                                    : 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
                                }`}
                                title="คลิกเพื่อเปิด/ปิด แผงกำหนดข้อมูลที่ต้องการให้ผู้ส่งกรอก และตัวเลือก Dropdown"
                              >
                                <List className="w-3 h-3 text-purple-600" />
                                <span>ฟอร์มกำหนดเอง ({dl.fields.length} ช่อง)</span>
                                {dl.fields.some((f) => f.type === 'select') && (
                                  <span className="text-[10px] bg-purple-200 text-purple-950 px-1.5 rounded-full font-bold">
                                    Dropdown {dl.fields.filter((f) => f.type === 'select').length}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateDeadlineItem(dl.id, {
                                    fields: [
                                      {
                                        id: `fld_${Date.now()}_1`,
                                        type: 'user_profile',
                                        label: 'ครูผู้สอน',
                                        required: true,
                                        profile_key: 'name',
                                        order: 1,
                                      },
                                      {
                                        id: `fld_${Date.now()}_2`,
                                        type: 'text',
                                        label: 'ชื่อเรื่อง / รายวิชา',
                                        required: true,
                                        order: 2,
                                      },
                                      {
                                        id: `fld_${Date.now()}_3`,
                                        type: 'select',
                                        label: 'รูปแบบ / ประเภท',
                                        required: true,
                                        options: ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2', 'ตัวเลือกที่ 3'],
                                        order: 3,
                                      },
                                      {
                                        id: `fld_${Date.now()}_4`,
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
                                    ],
                                  });
                                  setEditingFormDeadlineId(dl.id);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-pointer"
                                title="คลิกเพื่อเพิ่มช่องกรอกข้อมูลและตัวเลือก Dropdown ให้งานนี้"
                              >
                                <span>📄 แบบมาตรฐาน</span>
                                <span className="text-[10px] text-indigo-600 font-bold ml-0.5">+ กำหนด Dropdown</span>
                              </button>
                            )}
                          </div>

                          {dl.description && (
                            <p className="text-xs text-slate-600">{dl.description}</p>
                          )}

                          {/* Date Range Display / Inline Edit */}
                          {!isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                                <span className="text-slate-500 block text-[11px] font-medium">
                                  วันและเวลาเริ่มต้นเปิดรับส่ง:
                                </span>
                                <span className="font-bold text-slate-800 mt-0.5 block">
                                  {formatThaiDateTime(`${dl.start_date} ${dl.start_time}`)}
                                </span>
                              </div>

                              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-xs">
                                <span className="text-rose-700 block text-[11px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-rose-600" />
                                  <span>วันและเวลากำหนดส่ง (Deadline):</span>
                                </span>
                                <span className="font-bold text-rose-950 mt-0.5 block text-sm">
                                  {formatThaiDateTime(`${dl.end_date} ${dl.end_time}`)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-700">เริ่มต้นรับส่ง:</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="date"
                                    value={dl.start_date}
                                    onChange={(e) =>
                                      handleUpdateDeadlineItem(dl.id, { start_date: e.target.value })
                                    }
                                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                                  />
                                  <input
                                    type="time"
                                    value={dl.start_time}
                                    onChange={(e) =>
                                      handleUpdateDeadlineItem(dl.id, { start_time: e.target.value })
                                    }
                                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <span className="text-xs font-bold text-rose-800">กำหนดส่ง (Deadline):</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="date"
                                    value={dl.end_date}
                                    onChange={(e) =>
                                      handleUpdateDeadlineItem(dl.id, { end_date: e.target.value })
                                    }
                                    className="px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold text-rose-900"
                                  />
                                  <input
                                    type="time"
                                    value={dl.end_time}
                                    onChange={(e) =>
                                      handleUpdateDeadlineItem(dl.id, { end_time: e.target.value })
                                    }
                                    className="px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold text-rose-900"
                                  />
                                </div>
                              </div>

                              {/* Inline evaluation type switcher */}
                              <div className="sm:col-span-2 p-3 bg-white rounded-xl border border-amber-300">
                                <span className="text-xs font-bold text-slate-800 block mb-1.5">
                                  รูปแบบการตรวจประเมินของงานนี้:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <label
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                      (dl.evaluation_type || 'rubric_score') === 'rubric_score'
                                        ? 'bg-amber-50 border-amber-400 font-bold text-amber-950 shadow-2xs'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`eval_${dl.id}`}
                                      checked={(dl.evaluation_type || 'rubric_score') === 'rubric_score'}
                                      onChange={() =>
                                        handleUpdateDeadlineItem(dl.id, { evaluation_type: 'rubric_score' })
                                      }
                                      className="text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>🏆 ตรวจแบบให้คะแนน (รูบริก 100)</span>
                                  </label>

                                  <label
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                      dl.evaluation_type === 'approval_only'
                                        ? 'bg-indigo-50 border-indigo-400 font-bold text-indigo-950 shadow-2xs'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`eval_${dl.id}`}
                                      checked={dl.evaluation_type === 'approval_only'}
                                      onChange={() =>
                                        handleUpdateDeadlineItem(dl.id, { evaluation_type: 'approval_only' })
                                      }
                                      className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>✅ ตรวจแค่อนุมัติ/ไม่อนุมัติ (ไม่คิดคะแนน)</span>
                                  </label>
                                </div>
                              </div>

                              <div className="sm:col-span-2 pt-2 flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={dl.allow_late}
                                    onChange={(e) =>
                                      handleUpdateDeadlineItem(dl.id, { allow_late: e.target.checked })
                                    }
                                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                                  />
                                  <span>อนุญาตให้ส่งช้าได้ (ติดป้ายส่งช้า)</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDeadlineId(null);
                                    handleSaveDeadlines(deadlines);
                                  }}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                                  title="บันทึกการแก้ไขวันเวลาและอัปเดตเข้า SQL อัตโนมัติทันที"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>เสร็จสิ้น (อัพเดทเข้า SQL ออโต้)</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingFormDeadlineId(
                                editingFormDeadlineId === dl.id ? null : dl.id
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                              editingFormDeadlineId === dl.id
                                ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                                : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300'
                            }`}
                            title="กำหนดข้อมูลที่ต้องการให้ครูกรอก เช่น เมนู Dropdown, ข้อความ, วันที่, ไฟล์แนบ"
                          >
                            <List className="w-3.5 h-3.5 text-purple-600" />
                            <span>{editingFormDeadlineId === dl.id ? 'ปิดตั้งฟอร์ม' : 'ฟอร์ม & Dropdown'}</span>
                          </button>
                          <button
                            onClick={() => setEditingDeadlineId(isEditing ? null : dl.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                              isEditing
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{isEditing ? 'ปิดการแก้ไข' : 'ตั้งค่าวันส่ง & โหมดตรวจ'}</span>
                          </button>
                          {deadlines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDeadline(dl.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบประเภทนี้และอัปเดตเข้า SQL อัตโนมัติ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dedicated Dynamic Form Builder Expander for this Deadline */}
                      {editingFormDeadlineId === dl.id && (
                        <div className="mt-4 pt-4 border-t-2 border-purple-200/90 bg-purple-50/40 rounded-2xl p-3.5 sm:p-5 space-y-3.5 animate-in fade-in duration-150">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-purple-200/70 pb-3">
                            <div>
                              <h5 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-700" />
                                <span>กำหนดข้อมูลที่ต้องการให้ครูกรอกสำหรับ: &ldquo;{dl.name}&rdquo;</span>
                              </h5>
                              <p className="text-xs text-slate-600 mt-0.5">
                                แอดมินสามารถเพิ่มข้อความ, เมนู Dropdown พร้อมกำหนดตัวเลือก, วันที่, หรือช่องอัปโหลดไฟล์ที่ต้องการให้ครูกรอกได้เอง
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `ต้องการล้างช่องข้อมูลกำหนดเองของ "${dl.name}" แล้วเปลี่ยนกลับเป็นแบบฟอร์มมาตรฐานหรือไม่?`
                                    )
                                  ) {
                                    handleUpdateDeadlineItem(dl.id, { fields: undefined });
                                    setEditingFormDeadlineId(null);
                                  }
                                }}
                                className="text-xs text-rose-600 hover:text-rose-800 hover:underline px-2 py-1 font-semibold"
                              >
                                สลับกลับเป็นแบบมาตรฐาน
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFormDeadlineId(null)}
                                className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>เสร็จสิ้น (บันทึกออโต้)</span>
                              </button>
                            </div>
                          </div>

                          <DynamicFormBuilder
                            fields={dl.fields || []}
                            onChange={(updatedFields) =>
                              handleUpdateDeadlineItem(dl.id, { fields: updatedFields })
                            }
                            availableTemplates={deadlines}
                            currentTeacher={currentTeacher}
                          />
                        </div>
                      )}
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
    </div>
  );
};
