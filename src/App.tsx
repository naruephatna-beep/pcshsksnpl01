import React, { useState, useEffect, useMemo } from 'react';
import {
  Teacher,
  LessonPlan,
  PlanStatus,
  isTeacherAdmin,
  isTeacherExecutive,
  PlanTypeDeadlineConfig,
  PlanStatusConfig,
  AssignmentSubmission,
} from './types';
import {
  fetchTeachers,
  getLocalTeachers,
  updateTeacherRecord,
  fetchPlans,
  savePlanRecord,
  deletePlanRecord,
  getSavedSupabaseConfig,
  subscribeToDatabaseChanges,
  fetchSystemSetting,
  saveSystemSetting,
  fetchAssignmentSubmissionsList,
  getLocalPlans,
  saveLocalPlans,
} from './services/supabaseClient';
import {
  getSavedDeadlineConfigs,
  saveDeadlineConfigs,
  getSavedStatusConfigs,
  saveStatusConfigs,
  checkSubmissionTimeliness,
  getPlanStatusInfo,
  getSavedSubmissions,
  classifyDocumentType,
  DEFAULT_DEADLINE_CONFIGS,
  DEFAULT_STATUS_CONFIGS,
} from './utils/deadlineUtils';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { LessonPlanCard } from './components/LessonPlanCard';
import { SubmitPlanModal } from './components/SubmitPlanModal';
import { ReviewPlanModal } from './components/ReviewPlanModal';
import { ProfileModal } from './components/ProfileModal';
import { ForcePasswordModal } from './components/ForcePasswordModal';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { SubmissionReceiptModal } from './components/SubmissionReceiptModal';
import { getDatabaseProvider } from './services/cloudflareClient';
import { TeacherDirectoryModal } from './components/TeacherDirectoryModal';
import { FileStorageInfoModal } from './components/FileStorageInfoModal';
import { AdminTrackerModal } from './components/AdminTrackerModal';
import { EditPlanModal } from './components/EditPlanModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ResubmitPlanModal } from './components/ResubmitPlanModal';
import { LoadingScreen } from './components/LoadingScreen';
import { DeadlineManagerModal } from './components/DeadlineManagerModal';
import { TeacherAssignmentNotification } from './components/TeacherAssignmentNotification';
import { DynamicSubmitModal } from './components/DynamicSubmitModal';
import { Sidebar } from './components/Sidebar';
import { LessonPlanTableRow } from './components/LessonPlanTableRow';
import { DeadlineCountdownBanner } from './components/DeadlineCountdownBanner';
import {
  Search,
  Filter,
  PlusCircle,
  BookOpen,
  FileCheck2,
  ListFilter,
  LayoutGrid,
  Layers,
  GraduationCap,
  Sparkles,
  Database,
  HardDrive,
  ShieldCheck,
  ClipboardList,
  Calendar,
  BarChart3,
  FileText,
  Bell,
  Users,
  User,
  Table as TableIcon,
  Menu,
  X,
  ArrowRight,
  Clock,
  ChevronRight,
  Upload,
  RefreshCw,
  BrainCircuit,
  Cloud,
  Trophy,
} from 'lucide-react';

export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>(() => getLocalTeachers());
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Views
  const [viewTab, setViewTab] = useState<'all' | 'my' | 'pending_review' | 'approved' | 'needs_revision'>('all');
  const [mainView, setMainView] = useState<'plans' | 'executive'>('plans');
  const [executiveMode, setExecutiveMode] = useState<'standard' | 'ranking' | 'ddo'>('standard');
  const [planDisplayMode, setPlanDisplayMode] = useState<'board' | 'table'>('board');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');

  // Auto-switch to executive dashboard for leadership accounts
  useEffect(() => {
    if (currentTeacher && isTeacherExecutive(currentTeacher)) {
      setMainView('executive');
    }
  }, [currentTeacher]);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitModalInitialType, setSubmitModalInitialType] = useState<string | undefined>(undefined);
  const [selectedDynamicConfig, setSelectedDynamicConfig] = useState<PlanTypeDeadlineConfig | null>(null);
  const [isDynamicSubmitModalOpen, setIsDynamicSubmitModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);
  const [isFileStorageModalOpen, setIsFileStorageModalOpen] = useState(false);
  const [isAdminTrackerModalOpen, setIsAdminTrackerModalOpen] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [deadlineConfigs, setDeadlineConfigs] = useState<PlanTypeDeadlineConfig[]>(() => getSavedDeadlineConfigs());
  const [statusConfigs, setStatusConfigs] = useState<PlanStatusConfig[]>(() => getSavedStatusConfigs());
  const [planToEdit, setPlanToEdit] = useState<LessonPlan | null>(null);
  const [selectedPlanForReview, setSelectedPlanForReview] = useState<LessonPlan | null>(null);
  const [selectedPlanForReceipt, setSelectedPlanForReceipt] = useState<LessonPlan | null>(null);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [planToDelete, setPlanToDelete] = useState<LessonPlan | null>(null);
  const [planToResubmit, setPlanToResubmit] = useState<LessonPlan | null>(null);
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  const [lastSyncTime, setLastSyncTime] = useState<string>('เพิ่งเริ่มต้น');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Silent sync and re-fetch from database
  const syncWithDatabase = async (silent: boolean = true) => {
    setIsSyncing(true);
    try {
      const [teachersRes, plansRes, dlSettingsRes, statusSettingsRes, submissionsRes] = await Promise.all([
        fetchTeachers(),
        fetchPlans(),
        fetchSystemSetting<PlanTypeDeadlineConfig[]>('deadline_configs', getSavedDeadlineConfigs()),
        fetchSystemSetting<PlanStatusConfig[]>('status_configs', getSavedStatusConfigs()),
        fetchAssignmentSubmissionsList(),
      ]);
      setTeachers(teachersRes.data);
      setIsSupabaseConnected(teachersRes.isSupabase || plansRes.isSupabase);

      let effectiveDl = getSavedDeadlineConfigs();
      if (dlSettingsRes.isSupabase && Array.isArray(dlSettingsRes.data) && dlSettingsRes.data.length > 0) {
        effectiveDl = dlSettingsRes.data;
        saveDeadlineConfigs(dlSettingsRes.data);
        setDeadlineConfigs(dlSettingsRes.data);
      } else if (dlSettingsRes.isSupabase && (!dlSettingsRes.data || (Array.isArray(dlSettingsRes.data) && dlSettingsRes.data.length === 0))) {
        // Seed default deadline configs (แผนย่อ, แผนสมบูรณ์) to cloud if table is empty
        saveSystemSetting('deadline_configs', DEFAULT_DEADLINE_CONFIGS);
      }

      if (statusSettingsRes.isSupabase && Array.isArray(statusSettingsRes.data) && statusSettingsRes.data.length > 0) {
        saveStatusConfigs(statusSettingsRes.data);
        setStatusConfigs(statusSettingsRes.data);
      } else if (statusSettingsRes.isSupabase && (!statusSettingsRes.data || (Array.isArray(statusSettingsRes.data) && statusSettingsRes.data.length === 0))) {
        saveSystemSetting('status_configs', DEFAULT_STATUS_CONFIGS);
      }

      // CRITICAL FIX: Merge remote plans with dynamic submissions and local storage
      // so teacher submitted work NEVER disappears even if Supabase SQL table has FK or sync delays!
      const remotePlans = plansRes.data || [];
      const remotePlanIds = new Set(remotePlans.map((p) => p.id));

      // 1. Convert dynamic submissions that might not yet be in lesson_plans table
      const convertedDynamicPlans: LessonPlan[] = (submissionsRes || [])
        .filter((sub) => !remotePlanIds.has(sub.id))
        .map((sub) => {
          const firstAtt = sub.attachments?.[0];
          const dlConfig = effectiveDl.find((d) => d.id === sub.assignment_id || d.name === sub.assignment_name);
          const fields = dlConfig?.fields || [];
          const answers = sub.answers || {};

          const titleCandidate =
            answers['fld_title'] ||
            answers['fld_research_topic'] ||
            answers['fld_topic'] ||
            answers[fields.find((f) => f.type === 'textarea')?.id || ''] ||
            answers[fields.find((f) => f.type === 'text')?.id || ''] ||
            sub.assignment_name;

          return {
            id: sub.id,
            teacher_id: sub.teacher_id,
            teacher_name: sub.teacher_name,
            teacher_photo: '',
            learning_area: sub.learning_area || '',
            subject_code: String(answers['fld_subject_code'] || 'ภาระงาน'),
            subject_name: String(answers['fld_subject_name'] || sub.assignment_name),
            grade_level: String(answers['fld_grade_level'] || 'มัธยมศึกษา'),
            semester: dlConfig?.semester || '1',
            academic_year: dlConfig?.academic_year || '2567',
            plan_title: String(titleCandidate).substring(0, 120),
            plan_type: sub.assignment_name,
            total_hours: Number(answers['fld_hours']) || 1,
            file_url: firstAtt?.file_url || answers[fields.find((f) => f.type === 'file')?.id || ''] || '#',
            file_name: firstAtt?.file_name || 'เอกสารภาระงาน',
            submitted_at: sub.submitted_at || new Date().toISOString(),
            status: sub.status || 'submitted',
            is_late: sub.is_late ?? false,
            submission_delay_text: sub.submission_delay_text,
            evaluation_type: dlConfig?.evaluation_type || 'approval_only',
            notes: JSON.stringify(answers),
          };
        });

      // 2. Also keep local storage plans that haven't been pushed or were saved recently
      const localPlans = getLocalPlans();
      const knownIds = new Set([...remotePlans.map((p) => p.id), ...convertedDynamicPlans.map((p) => p.id)]);
      const missingLocals = localPlans.filter((lp) => !knownIds.has(lp.id));

      const mergedPlans = [...remotePlans, ...convertedDynamicPlans, ...missingLocals];
      saveLocalPlans(mergedPlans);

      const evaluated = mergedPlans.map((p) => {
        if (p.is_late === undefined) {
          const tl = checkSubmissionTimeliness(p.plan_type, p.submitted_at, effectiveDl);
          return {
            ...p,
            is_late: tl.isLate,
            submission_delay_text: p.submission_delay_text || tl.delayText,
            deadline_at: p.deadline_at || tl.formattedDeadline,
          };
        }
        return p;
      });
      setPlans(evaluated);

      const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(now);

      if (!silent) {
        setToastNotice({
          type: 'success',
          message: 'ซิงค์ข้อมูลกับฐานข้อมูลล่าสุดสำเร็จแล้ว!',
          details: `ดึงข้อมูลแผนการสอน ${plansRes.data.length} รายการ และบุคลากร ${teachersRes.data.length} ท่าน (สถานะ: ${
            plansRes.isSupabase ? 'เชื่อมต่อ Cloudflare D1 เรียบร้อย' : 'ใช้งาน Local Storage'
          })`,
        });
      }
    } catch (e) {
      console.error('Error syncing with database:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Load initial data
  // Load initial data (single pass, zero redundant queries)
  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        syncWithDatabase(true),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);

      // Restore active user session if previously logged in (uses cached teachers from syncWithDatabase, 0 network egress)
      const savedUserEmail = localStorage.getItem('lp_current_user_email');
      if (savedUserEmail) {
        const teachers = getLocalTeachers();
        const found = teachers.find(
          (t) =>
            t.Email.toLowerCase() === savedUserEmail.toLowerCase() ||
            t.Teacher_ID.toLowerCase() === savedUserEmail.toLowerCase()
        );
        if (found) {
          setCurrentTeacher(found);
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Targeted Table Sync (only fetches the specific table that changed in Realtime, saving 80% Egress)
  const syncTable = async (table: string) => {
    try {
      if (table === 'lesson_plans') {
        const plansRes = await fetchPlans();
        if (plansRes.data) {
          const effectiveDl = deadlineConfigs.length > 0 ? deadlineConfigs : getSavedDeadlineConfigs();
          const remotePlans = plansRes.data || [];
          const remotePlanIds = new Set(remotePlans.map((p) => p.id));
          const localSubmissions = getSavedSubmissions();
          const convertedDynamicPlans: LessonPlan[] = (localSubmissions || [])
            .filter((sub: AssignmentSubmission) => !remotePlanIds.has(sub.id))
            .map((sub: AssignmentSubmission) => {
              const firstAtt = sub.attachments?.[0];
              const dlConfig = effectiveDl.find((d) => d.id === sub.assignment_id || d.name === sub.assignment_name);
              const fields = dlConfig?.fields || [];
              const answers = sub.answers || {};
              const titleCandidate =
                answers['fld_title'] ||
                answers['fld_research_topic'] ||
                answers['fld_topic'] ||
                sub.assignment_name;
              return {
                id: sub.id,
                teacher_id: sub.teacher_id,
                teacher_name: sub.teacher_name,
                teacher_photo: '',
                learning_area: sub.learning_area || '',
                subject_code: String(answers['fld_subject_code'] || 'ภาระงาน'),
                subject_name: String(answers['fld_subject_name'] || sub.assignment_name),
                grade_level: String(answers['fld_grade_level'] || 'มัธยมศึกษา'),
                semester: dlConfig?.semester || '1',
                academic_year: dlConfig?.academic_year || '2567',
                plan_title: String(titleCandidate).substring(0, 120),
                plan_type: sub.assignment_name,
                total_hours: Number(answers['fld_hours']) || 1,
                file_url: firstAtt?.file_url || '#',
                file_name: firstAtt?.file_name || 'เอกสารภาระงาน',
                submitted_at: sub.submitted_at || new Date().toISOString(),
                status: sub.status || 'submitted',
                is_late: sub.is_late ?? false,
                submission_delay_text: sub.submission_delay_text,
                evaluation_type: dlConfig?.evaluation_type || 'approval_only',
                notes: JSON.stringify(answers),
              };
            });
          const localPlans = getLocalPlans();
          const knownIds = new Set([...remotePlans.map((p) => p.id), ...convertedDynamicPlans.map((p) => p.id)]);
          const missingLocals = localPlans.filter((lp) => !knownIds.has(lp.id));
          const merged = [...remotePlans, ...convertedDynamicPlans, ...missingLocals];
          setPlans(merged);
        }
      } else if (table === 'teachers') {
        const teachersRes = await fetchTeachers();
        if (teachersRes.data) {
          setTeachers(teachersRes.data);
        }
      } else if (table === 'system_settings') {
        const [dlRes, stRes] = await Promise.all([
          fetchSystemSetting<PlanTypeDeadlineConfig[]>('deadline_configs', getSavedDeadlineConfigs()),
          fetchSystemSetting<PlanStatusConfig[]>('status_configs', getSavedStatusConfigs()),
        ]);
        if (dlRes.data && Array.isArray(dlRes.data)) {
          setDeadlineConfigs(dlRes.data);
          saveDeadlineConfigs(dlRes.data);
        }
        if (stRes.data && Array.isArray(stRes.data)) {
          setStatusConfigs(stRes.data);
          saveStatusConfigs(stRes.data);
        }
      } else {
        syncWithDatabase(true);
      }
    } catch (err) {
      console.warn(`Targeted sync error for ${table}:`, err);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Supabase Realtime Subscription: listens to changes with targeted table sync
    const unsubscribe = subscribeToDatabaseChanges((table) => {
      console.log(`[App] Realtime event on table ${table}: targeted syncing...`);
      syncTable(table);
    });

    // 2. Bandwidth-optimized background sync: every 10 minutes (Realtime WebSocket already pushes instant updates!)
    const interval = setInterval(() => {
      syncWithDatabase(true);
    }, 600000);

    // 3. Sync on window focus (debounced to 3 minutes to avoid burning egress on tab switches)
    let lastFocusSync = Date.now();
    const onFocus = () => {
      if (Date.now() - lastFocusSync > 180000) {
        lastFocusSync = Date.now();
        syncWithDatabase(true);
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Update current user in storage when changed
  const handleSetCurrentUser = (teacher: Teacher) => {
    setIsLoading(true);
    setCurrentTeacher(teacher);
    if (isTeacherExecutive(teacher)) {
      setMainView('executive');
    } else {
      setMainView('plans');
    }
    localStorage.setItem('lp_current_user_email', teacher.Email);
    setIsLoginModalOpen(false);
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    setIsLoading(true);
    localStorage.removeItem('lp_current_user_email');
    setCurrentTeacher(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  // Password update enforcement (auto-updates in DB)
  const handlePasswordChanged = async (updated: Teacher) => {
    const res = await updateTeacherRecord(updated);
    setTeachers((prev) =>
      prev.map((t) => (t.Teacher_ID === updated.Teacher_ID ? updated : t))
    );
    setCurrentTeacher(updated);
    await syncWithDatabase(true);

    setToastNotice({
      type: 'success',
      message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
      details: !isAdmin
        ? 'รหัสผ่านใหม่ของคุณมีผลใช้งานทันทีและระบบบันทึกเรียบร้อยแล้ว'
        : res.isSupabase
        ? 'ข้อมูลรหัสผ่านใหม่ถูกอัปเดตลงฐานข้อมูล Cloudflare D1 (ตาราง teachers) อัตโนมัติแล้ว'
        : 'บันทึกในเครื่องเรียบร้อยแล้ว',
    });
  };

  // Profile save (auto-updates in DB)
  const handleSaveProfile = async (updated: Teacher) => {
    const res = await updateTeacherRecord(updated);
    setTeachers((prev) =>
      prev.map((t) => (t.Teacher_ID === updated.Teacher_ID ? updated : t))
    );
    if (currentTeacher?.Teacher_ID === updated.Teacher_ID) {
      setCurrentTeacher(updated);
    }
    // Also sync teacher name in existing lesson plans if name changed
    setPlans((prev) =>
      prev.map((p) =>
        p.teacher_id === updated.Teacher_ID
          ? {
              ...p,
              teacher_name: updated.Name,
              teacher_photo: updated.photo,
              learning_area: updated.Learning_Area,
            }
          : p
      )
    );
    await syncWithDatabase(true);

    setToastNotice({
      type: 'success',
      message: 'บันทึกข้อมูลส่วนตัวสำเร็จ',
      details: !isAdmin
        ? 'ข้อมูลของคุณได้รับการอัปเดตเรียบร้อยแล้ว'
        : res.isSupabase
        ? 'ระบบได้อัปเดตข้อมูลของคุณลงในฐานข้อมูล Cloudflare D1 (ตาราง teachers) อัตโนมัติเรียบร้อยแล้ว'
        : 'บันทึกในเครื่องเรียบร้อยแล้ว (ยังไม่ได้เชื่อมต่อ Cloudflare D1)',
    });
  };

  // Plan creation (supports single or multiple lesson plans)
  const handleCreatePlan = async (newPlanOrPlans: LessonPlan | LessonPlan[]) => {
    const plansList = Array.isArray(newPlanOrPlans) ? newPlanOrPlans : [newPlanOrPlans];
    if (plansList.length === 0) return { success: true, isSupabase: false };

    let lastRes: any = { success: true, isSupabase: false };
    for (const plan of plansList) {
      lastRes = await savePlanRecord(plan);
    }
    setPlans((prev) => [...plansList, ...prev]);
    await syncWithDatabase(true);

    const count = plansList.length;
    if (!isAdmin) {
      setToastNotice({
        type: 'success',
        message:
          count > 1
            ? `ส่งแผนการสอนสำเร็จทั้งหมด ${count} วิชา/รายการแล้ว!`
            : 'ส่งแผนการสอนสำเร็จเรียบร้อยแล้ว!',
        details:
          count > 1
            ? `ระบบได้บันทึกข้อมูลและส่งเอกสารแผนการจัดการเรียนรู้ ${count} วิชาเข้าสู่ระบบเรียบร้อยแล้ว`
            : 'ระบบได้บันทึกข้อมูลและส่งแผนการสอนเข้าสู่ระบบเรียบร้อยแล้ว',
      });
    } else {
      if (!lastRes.isSupabase) {
        setToastNotice({
          type: 'warning',
          message:
            count > 1
              ? `บันทึกแผน ${count} รายการลงในเครื่อง (Local Storage) แล้ว`
              : 'บันทึกแผนลงในเครื่อง (Local Storage) แล้ว',
          details:
            '⚠️ ยังไม่ได้เชื่อมต่อ Cloudflare D1 กรุณาคลิก "ฐานข้อมูล" เพื่อนำ Cloudflare Worker URL มาเชื่อมต่อ',
        });
      } else if (!lastRes.success) {
        setToastNotice({
          type: 'error',
          message: 'บันทึกในเครื่องแล้ว แต่ Cloudflare D1 บันทึกไม่สำเร็จ',
          details:
            lastRes.error ||
            'โปรดตรวจสอบว่าได้สร้างตาราง lesson_plans ใน Cloudflare D1 แล้วหรือไม่',
        });
      } else {
        setToastNotice({
          type: 'success',
          message:
            count > 1
              ? `ส่งแผนการสอนสำเร็จ ${count} รายการ และบันทึกลงฐานข้อมูล Cloudflare D1 เรียบร้อยแล้ว!`
              : 'ส่งแผนการสอนสำเร็จและบันทึกลงฐานข้อมูล Cloudflare D1 เรียบร้อยแล้ว!',
          details: 'ข้อมูลบนเว็บไซต์และในฐานข้อมูล Cloudflare D1 อัปเดตตรงกันทันที',
        });
      }
    }
    return lastRes;
  };

  // Plan review update (auto-updates in DB)
  const handleSaveReview = async (updatedPlan: LessonPlan) => {
    const res = await savePlanRecord(updatedPlan);
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
    await syncWithDatabase(true);

    if (res.isSupabase && res.success) {
      setToastNotice({
        type: 'success',
        message: 'อัปเดตผลการตรวจแผนลงใน Cloudflare D1 เรียบร้อยแล้ว!',
        details: 'ข้อมูลบนเว็บไซต์และในฐานข้อมูล Cloudflare D1 อัปเดตตรงกันทันที',
      });
    }
    return res;
  };

  // Execute deletion in state and DB (no window.confirm block)
  const executeDeletePlan = async (planId: string) => {
    const res = await deletePlanRecord(planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    await syncWithDatabase(true);

    setToastNotice({
      type: 'success',
      message: 'ลบแผนการสอนเรียบร้อยแล้ว',
      details: !isAdmin
        ? 'ระบบได้ลบข้อมูลออกจากระบบเรียบร้อยแล้ว'
        : res.isSupabase
        ? 'ระบบได้ลบข้อมูลออกจากฐานข้อมูล Cloudflare D1 (ตาราง lesson_plans) อัตโนมัติแล้ว'
        : 'ลบออกจากเครื่องเรียบร้อยแล้ว',
    });
  };

  // Open custom confirmation modal for deletion (safe for iframe preview)
  const handleDeletePlan = (planId: string) => {
    const targetPlan = plans.find((p) => p.id === planId);
    if (targetPlan) {
      setPlanToDelete(targetPlan);
    } else {
      executeDeletePlan(planId);
    }
  };

  // Resubmit plan (status -> 'submitted' to let admin review again)
  const handleResubmitPlan = async (updatedPlan: LessonPlan) => {
    const res = await savePlanRecord(updatedPlan);
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
    await syncWithDatabase(true);

    setToastNotice({
      type: 'success',
      message: 'ส่งแผนการสอนใหม่อีกครั้งสำเร็จ!',
      details: 'สถานะเปลี่ยนเป็น "รอตรวจ (submitted)" เรียบร้อยแล้ว เพื่อให้ผู้ดูแลระบบและฝ่ายวิชาการตรวจประเมินอีกครั้ง',
    });
  };

  // Save deadline configurations (Admin)
  const handleSaveDeadlineConfigs = async (newConfigs: PlanTypeDeadlineConfig[]) => {
    saveDeadlineConfigs(newConfigs);
    setDeadlineConfigs(newConfigs);
    setPlans((prev) =>
      prev.map((p) => {
        const tl = checkSubmissionTimeliness(p.plan_type, p.submitted_at, newConfigs);
        return {
          ...p,
          is_late: p.is_late !== undefined ? p.is_late : tl.isLate,
          submission_delay_text: tl.delayText,
          deadline_at: tl.formattedDeadline,
        };
      })
    );
    const dbRes = await saveSystemSetting('deadline_configs', newConfigs);
    if (dbRes.success && dbRes.isSupabase) {
      setToastNotice({
        type: 'success',
        message: 'บันทึกประเภทเอกสารและวันส่งงานลง Cloud Database สำเร็จ!',
        details: `บันทึกข้อมูลประเภทเอกสาร ${newConfigs.length} รายการ (รวมแผนการจัดการเรียนรู้ฉบับย่อ, แผนฉบับสมบูรณ์ และประเภทใหม่) ลงใน Cloudflare D1 เรียบร้อย ข้อมูลจะซิงค์ไปยังอุปกรณ์และคอมพิวเตอร์ของครูทุกคนทันที`,
      });
    } else if (!dbRes.success && dbRes.isSupabase) {
      setToastNotice({
        type: 'warning',
        message: 'บันทึกในเครื่องนี้แล้ว (แต่ยังไม่บันทึกลง Cloudflare D1)',
        details: `ข้อความจากฐานข้อมูล: ${dbRes.error || 'ตาราง system_settings อาจยังไม่ได้ถูกสร้าง'} — แนะนำคัดลอก SQL ในหน้าต่างฐานข้อมูลไปรันใน Cloudflare D1 Console`,
      });
    } else {
      setToastNotice({
        type: 'info',
        message: 'บันทึกประเภทเอกสารในเบราว์เซอร์เครื่องนี้เรียบร้อย',
        details: `บันทึกใน Local Storage เครื่องนี้แล้ว (เชื่อมต่อ Cloudflare D1 เพื่อซิงค์ข้ามเครื่อง)`,
      });
    }
  };

  // Save status configurations (Admin)
  const handleSaveStatusConfigs = async (newConfigs: PlanStatusConfig[]) => {
    saveStatusConfigs(newConfigs);
    setStatusConfigs(newConfigs);
    const dbRes = await saveSystemSetting('status_configs', newConfigs);
    if (dbRes.success && dbRes.isSupabase) {
      setToastNotice({
        type: 'success',
        message: 'บันทึกการปรับแต่งสถานะลง Cloud Database สำเร็จ!',
        details: `อัปเดตข้อมูลสถานะ ${newConfigs.length} รายการ ไปยังอุปกรณ์ของครูทุกคนเรียบร้อย`,
      });
    } else if (!dbRes.success && dbRes.isSupabase) {
      setToastNotice({
        type: 'warning',
        message: 'บันทึกลงเครื่องนี้แล้ว (แต่ยังไม่บันทึกลง Cloudflare D1)',
        details: `เกิดข้อผิดพลาด: ${dbRes.error || 'ตาราง system_settings ยังไม่ถูกสร้าง'} — กรุณาสร้างตาราง system_settings ใน Cloudflare D1`,
      });
    } else {
      setToastNotice({
        type: 'info',
        message: 'บันทึกการปรับแต่งสถานะในเครื่องนี้เรียบร้อย',
        details: `อัปเดตข้อมูลสถานะ ${newConfigs.length} สถานะ ใน Local Storage ของเบราว์เซอร์นี้`,
      });
    }
  };

  // Quick Change Plan Status (Admin)
  const handleQuickChangePlanStatus = async (
    planOrId: LessonPlan | string,
    newStatus: string,
    isLateOverride?: boolean,
    adminNotes?: string
  ) => {
    const planId = typeof planOrId === 'string' ? planOrId : planOrId.id;
    const targetPlan = plans.find((p) => p.id === planId);
    if (!targetPlan) return;

    const updatedPlan: LessonPlan = {
      ...targetPlan,
      status: newStatus,
      is_late: isLateOverride !== undefined ? isLateOverride : targetPlan.is_late,
      admin_notes: adminNotes !== undefined ? adminNotes : targetPlan.admin_notes,
    };

    setPlans((prev) => prev.map((p) => (p.id === planId ? updatedPlan : p)));
    await savePlanRecord(updatedPlan);
    await syncWithDatabase(true);

    const stInfo = getPlanStatusInfo(newStatus, statusConfigs);
    setToastNotice({
      type: 'success',
      message: `ปรับสถานะเป็น "${stInfo.label}" เรียบร้อยแล้ว`,
      details: `แผนรหัส ${updatedPlan.id} (${updatedPlan.subject_code}) ได้รับการอัปเดตสถานะใหม่เรียบร้อย`,
    });
  };

  // Toggle Plan Late status (Admin)
  const handleTogglePlanLate = async (plan: LessonPlan) => {
    const nextLate = !plan.is_late;
    const updatedPlan: LessonPlan = {
      ...plan,
      is_late: nextLate,
    };
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? updatedPlan : p)));
    await savePlanRecord(updatedPlan);
    await syncWithDatabase(true);

    setToastNotice({
      type: 'info',
      message: nextLate ? 'ทำเครื่องหมายเป็น "ส่งช้า" แล้ว' : 'ทำเครื่องหมายเป็น "ส่งตรงเวลา" แล้ว',
      details: `แผนรหัส ${plan.id} (${plan.subject_code})`,
    });
  };

  // Must force password change if current logged-in teacher has Pass === '12345'
  const mustForceChangePassword = currentTeacher && currentTeacher.Pass === '12345';
  const isAdmin = isTeacherAdmin(currentTeacher);

  const handleOpenSubmitForType = (planType: string) => {
    const targetConfig = (deadlineConfigs || []).find(
      (c) => c.name.trim().toLowerCase() === planType.trim().toLowerCase()
    );
    if (targetConfig && targetConfig.fields && targetConfig.fields.length > 0) {
      setSelectedDynamicConfig(targetConfig);
      setIsDynamicSubmitModalOpen(true);
    } else {
      setSubmitModalInitialType(planType);
      setIsSubmitModalOpen(true);
    }
  };

  const pendingAssignmentsCount = useMemo(() => {
    if (!currentTeacher || isAdmin) return 0;
    const activeConfigs = (deadlineConfigs || []).filter((c) => c.is_active !== false);
    const normalize = (val?: string) => String(val || '').trim().toLowerCase();
    const currentTeacherId = normalize(currentTeacher.Teacher_ID);
    const currentTeacherName = normalize(currentTeacher.Name);

    const myPlans = plans.filter((p) => {
      const pId = normalize(p.teacher_id);
      const pName = normalize(p.teacher_name);
      return (currentTeacherId && pId === currentTeacherId) || (currentTeacherName && pName === currentTeacherName);
    });

    let pending = 0;
    for (const cfg of activeConfigs) {
      const submitted = myPlans.some(
        (p) => p.plan_type.trim().toLowerCase() === cfg.name.trim().toLowerCase()
      );
      if (!submitted) pending++;
    }
    return pending;
  }, [currentTeacher, isAdmin, deadlineConfigs, plans]);

  const handleScrollToAssignments = (filter?: 'pending' | 'all' | React.MouseEvent) => {
    // Default to 'all' so teacher's submitted assignments don't disappear when clicking notification
    const filterType = filter === 'pending' ? 'pending' : 'all';
    window.dispatchEvent(new CustomEvent('filter-assignments', { detail: { filter: filterType } }));
    const el = document.getElementById('assigned-documents-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const userVisiblePlans = useMemo(() => {
    if (isAdmin) return plans;
    return plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID);
  }, [isAdmin, plans, currentTeacher]);

  const docCategoryCounts = useMemo(() => {
    let summary = 0;
    let full = 0;
    let research = 0;
    let general = 0;
    for (const p of userVisiblePlans) {
      const meta = classifyDocumentType(p.plan_type);
      if (meta.key === 'summary_plan') summary++;
      else if (meta.key === 'full_plan') full++;
      else if (meta.key === 'classroom_research') research++;
      else general++;
    }
    return {
      all: userVisiblePlans.length,
      summary,
      full,
      research,
      general,
    };
  }, [userVisiblePlans]);

  // Filtered plans logic
  const filteredPlans = plans.filter((plan) => {
    // CRITICAL: Regular teachers can ONLY see their own plans! Normalized comparison prevents case/whitespace bugs
    if (!isAdmin) {
      const normalize = (val?: string) => String(val || '').trim().toLowerCase();
      const planTeacherId = normalize(plan.teacher_id || (plan as any).Teacher_ID);
      const currentTeacherId = normalize(currentTeacher?.Teacher_ID || (currentTeacher as any)?.teacher_id);
      const planTeacherName = normalize(plan.teacher_name || (plan as any).Teacher_Name);
      const currentTeacherName = normalize(currentTeacher?.Name || (currentTeacher as any)?.name);

      const isOwner =
        (currentTeacherId && planTeacherId === currentTeacherId) ||
        (currentTeacherName && planTeacherName === currentTeacherName);

      if (!isOwner) {
        return false;
      }

      // Waiting for review tab: show all unreviewed plans (both 'submitted' and 'late')
      if (viewTab === 'pending_review' && (plan.status === 'approved' || plan.status === 'needs_revision')) {
        return false;
      }
      if (viewTab === 'approved' && plan.status !== 'approved') {
        return false;
      }
      if (viewTab === 'needs_revision' && plan.status !== 'needs_revision') {
        return false;
      }
      if ((viewTab as any) === 'late' && !plan.is_late) {
        return false;
      }
    }

    // Status filter (Admin)
    if (isAdmin && statusFilter !== 'all') {
      if (statusFilter === 'late') {
        if (!plan.is_late) return false;
      } else if (plan.status !== statusFilter) {
        return false;
      }
    }

    // Area filter (Admin)
    if (isAdmin && areaFilter && plan.learning_area !== areaFilter) {
      return false;
    }

    // Document Type Filter (แยกประเภทเอกสาร)
    if (docTypeFilter !== 'all') {
      const docTypeMeta = classifyDocumentType(plan.plan_type);
      if (docTypeFilter === 'general_academic') {
        if (
          docTypeMeta.key === 'summary_plan' ||
          docTypeMeta.key === 'full_plan' ||
          docTypeMeta.key === 'classroom_research'
        ) {
          return false;
        }
      } else if (docTypeMeta.key !== docTypeFilter) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject =
        plan.subject_code.toLowerCase().includes(q) ||
        plan.subject_name.toLowerCase().includes(q);
      const matchTitle = plan.plan_title.toLowerCase().includes(q);
      if (!isAdmin) {
        if (!matchSubject && !matchTitle) return false;
      } else {
        const matchTeacher =
          plan.teacher_name.toLowerCase().includes(q) ||
          plan.teacher_id.toLowerCase().includes(q);
        const matchArea = plan.learning_area.toLowerCase().includes(q);
        if (!matchSubject && !matchTitle && !matchTeacher && !matchArea) {
          return false;
        }
      }
    }

    return true;
  });

  // If data is initializing, show full-page LoadingScreen with dancing dinosaur
  if (isLoading) {
    return <LoadingScreen message="กำลังโหลดข้อมูลระบบ..." subMessage="โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์" />;
  }

  // If user is not logged in, show full-page LoginScreen with school logo
  if (!currentTeacher) {
    return (
      <LoginScreen
        teachers={teachers}
        isSupabaseConnected={isSupabaseConnected}
        onLogin={handleSetCurrentUser}
        onShowLoadingDemo={() => {
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 2200);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-['Prompt',sans-serif]">
      {/* 1. Desktop Left Sidebar: สีกรมท่าเข้ม (#0B1329) เมนูคมชัด */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 bg-[#0B1329] border-r border-slate-800 z-30 select-none">
        <Sidebar
          currentTeacher={currentTeacher}
          isAdmin={isAdmin}
          mainView={mainView}
          setMainView={setMainView}
          executiveMode={executiveMode}
          setExecutiveMode={setExecutiveMode}
          viewTab={viewTab}
          setViewTab={setViewTab}
          pendingAssignmentsCount={pendingAssignmentsCount}
          totalPlansCount={plans.length}
          myPlansCount={plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID).length}
          isMobileOpen={false}
          onCloseMobile={() => {}}
          onOpenSubmitModal={() => {
            setSubmitModalInitialType(undefined);
            setIsSubmitModalOpen(true);
          }}
          onOpenProfileModal={() => {
            setTeacherToEdit(currentTeacher);
            setIsProfileModalOpen(true);
          }}
          onOpenDirectoryModal={() => setIsDirectoryModalOpen(true)}
          onOpenAdminTrackerModal={() => setIsAdminTrackerModalOpen(true)}
          onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
          onScrollToAssignments={handleScrollToAssignments}
          onLogout={handleLogout}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onManualSync={() => syncWithDatabase(false)}
        />
      </aside>

      {/* 2. Mobile Drawer (Slide-over): สีกรมท่าเข้ม (#0B1329) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#0B1329] shadow-2xl z-10 flex flex-col">
            <Sidebar
              currentTeacher={currentTeacher}
              isAdmin={isAdmin}
              mainView={mainView}
              setMainView={setMainView}
              executiveMode={executiveMode}
              setExecutiveMode={setExecutiveMode}
              viewTab={viewTab}
              setViewTab={setViewTab}
              pendingAssignmentsCount={pendingAssignmentsCount}
              totalPlansCount={plans.length}
              myPlansCount={plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID).length}
              isMobileOpen={true}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              onOpenSubmitModal={() => {
                setSubmitModalInitialType(undefined);
                setIsSubmitModalOpen(true);
              }}
              onOpenProfileModal={() => {
                setTeacherToEdit(currentTeacher);
                setIsProfileModalOpen(true);
              }}
              onOpenDirectoryModal={() => setIsDirectoryModalOpen(true)}
              onOpenAdminTrackerModal={() => setIsAdminTrackerModalOpen(true)}
              onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
              onScrollToAssignments={handleScrollToAssignments}
              onLogout={handleLogout}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
              onManualSync={() => syncWithDatabase(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Right Workspace: สีขาวบริสุทธิ์ (Pure White / Crisp Slate Canvas) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-50/70">
        {/* Mobile Header: สีกรมท่าเข้ม (#0B1329) */}
        <header className="md:hidden sticky top-0 z-30 bg-[#0B1329] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
              aria-label="เปิดเมนูนำทาง"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20">
                <img src="/logo.svg" alt="ตราสัญลักษณ์โรงเรียน" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-xs text-white block truncate leading-tight">
                  ระบบส่งเอกสารวิชาการ
                </span>
                <span className="text-[10px] text-amber-400 font-semibold block truncate">
                  จ.ภ. กาฬสินธุ์ · ภาคเรียนที่ 2/2567
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTeacherToEdit(currentTeacher);
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all"
              title="ข้อมูลส่วนตัว"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="max-w-[70px] truncate">{currentTeacher.Name.split(' ')[0]}</span>
            </button>
          </div>
        </header>

        {/* Desktop Top Sub-header (Institutional Modern Academic Bar) */}
        <div className="hidden md:flex sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-2.5 border-b border-slate-200/90 items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">จ.ภ. กาฬสินธุ์</span>
              <span className="text-slate-300">/</span>
              <span className="text-amber-800 font-semibold text-xs">
                ภาคเรียนที่ 2/2567
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-900">
                {mainView === 'executive'
                  ? executiveMode === 'ddo'
                    ? 'วิเคราะห์ Data-Driven Org'
                    : 'แดชบอร์ดภาพรวมผู้บริหาร'
                  : 'รายการแผนการจัดการเรียนรู้'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Sync Indicator */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] text-slate-500">ซิงค์:</span>
              <span className="text-[11px] font-semibold text-slate-800">{lastSyncTime}</span>
              <button
                onClick={() => syncWithDatabase(false)}
                disabled={isSyncing}
                title="คลิกเพื่อซิงค์ข้อมูลกับ Cloud ทันที"
                className="text-slate-400 hover:text-indigo-600 ml-1 p-0.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>

            {/* Teacher Profile Button */}
            <button
              onClick={() => {
                setTeacherToEdit(currentTeacher);
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer group"
              title="แก้ไขข้อมูลส่วนตัว"
            >
              <div className="w-6 h-6 rounded-lg bg-[#0B1329] text-amber-400 flex items-center justify-center font-bold text-xs">
                {currentTeacher.Name.slice(0, 1)}
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-950 transition-colors">
                {currentTeacher.Name}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                {isAdmin ? 'Admin' : currentTeacher.Learning_Area}
              </span>
            </button>
          </div>
        </div>

        {/* Workspace Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-28 md:pb-12">
          {/* Toast / Status Notice */}
          {toastNotice && (
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                toastNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : toastNotice.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : toastNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    toastNotice.type === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : toastNotice.type === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : toastNotice.type === 'error'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {toastNotice.type === 'success' && <FileCheck2 className="w-5 h-5" />}
                  {toastNotice.type === 'warning' && <Database className="w-5 h-5" />}
                  {toastNotice.type === 'error' && <ShieldCheck className="w-5 h-5" />}
                  {toastNotice.type === 'info' && <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold">{toastNotice.message}</p>
                  {toastNotice.details && (
                    <p className="text-xs opacity-90 mt-1 whitespace-pre-line leading-relaxed">
                      {toastNotice.details}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setToastNotice(null)}
                className="p-1 rounded-lg hover:bg-black/5 opacity-60 hover:opacity-100 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* แถบนับถอยหลังเป็น สีแสดทอง (#F59E0B) โดดเด่น มองเห็นทันทีตั้งแต่เปิดเว็บ */}
          <DeadlineCountdownBanner
            currentTeacher={currentTeacher}
            plans={plans}
            deadlineConfigs={deadlineConfigs}
            onOpenSubmitForType={handleOpenSubmitForType}
            isAdmin={isAdmin}
            onScrollToAssignments={handleScrollToAssignments}
          />

          {/* Welcome & Overview Header Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-amber-100/40 via-indigo-50/30 to-transparent pointer-events-none rounded-bl-full" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-600 font-medium">กลุ่มสาระฯ {currentTeacher.Learning_Area}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                  <span>
                    {isTeacherExecutive(currentTeacher)
                      ? `ยินดีต้อนรับ ${currentTeacher.Name}`
                      : `ยินดีต้อนรับ ${currentTeacher?.Name || 'อาจารย์'}`}
                  </span>
                  {isAdmin && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#0B1329] text-amber-400 border border-amber-400/30">
                      Super Admin
                    </span>
                  )}
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  {isTeacherExecutive(currentTeacher)
                    ? 'ศูนย์บัญชาการข้อมูลฝ่ายบริหาร: ติดตามสถานะการส่งงานรายคน รายกลุ่มสาระ สรุปช้าเร็วตรงเวลา พร้อมกราฟและรายงานผู้บริหาร'
                    : isAdmin
                    ? 'ระบบจัดการและส่งแผนการจัดการเรียนรู้ออนไลน์ พร้อมระบบอนุมัติและประเมินคุณภาพทุกกลุ่มสาระการเรียนรู้'
                    : `ระบบจัดส่งเอกสารและติดตามผลการตรวจแผนการจัดการเรียนรู้ ประจำภาคเรียนที่ 2/2567`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsDirectoryModalOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                  title="ดูรายชื่อครูและข้อมูลติดต่อ"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>ทำเนียบบุคลากร (27 ท่าน)</span>
                </button>

                <button
                  onClick={() => {
                    setTeacherToEdit(currentTeacher);
                    setIsProfileModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#0B1329] hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                  title="แก้ไขข้อมูลส่วนตัว"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>ข้อมูลส่วนตัว</span>
                </button>
              </div>
            </div>
          </div>

        {/* View Switcher for Admins & Leadership */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => {
                  setMainView('executive');
                  setExecutiveMode('standard');
                }}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mainView === 'executive' && executiveMode === 'standard'
                    ? 'bg-white text-indigo-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span className="truncate">ภาพรวมผู้บริหาร</span>
              </button>

              <button
                onClick={() => {
                  setMainView('executive');
                  setExecutiveMode('ddo');
                }}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mainView === 'executive' && executiveMode === 'ddo'
                    ? 'bg-white text-indigo-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-indigo-950'
                }`}
              >
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <span className="truncate">Data-Driven Org</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                  DDO
                </span>
              </button>

              <button
                onClick={() => setMainView('plans')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mainView === 'plans'
                    ? 'bg-white text-indigo-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="truncate">เอกสารทั้งหมด ({plans.length})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium px-2 flex items-center gap-1.5">
              <span>มุมมอง:</span>
              <span className="font-semibold text-slate-800 truncate">
                {mainView === 'executive'
                  ? executiveMode === 'ddo'
                    ? 'องค์กรขับเคลื่อนด้วยข้อมูล (Data-Driven Organization)'
                    : 'แดชบอร์ดภาพรวมและกราฟ'
                  : 'รายการแผนและการตรวจประเมิน'}
              </span>
            </div>
          </div>
        )}

        {/* Special Admin Control Notification Bar (shown on plans view) */}
        {isAdmin && mainView === 'plans' && (
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B1329] text-amber-400 flex items-center justify-center shrink-0 font-bold shadow-xs mt-0.5 sm:mt-0">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>โหมดผู้ดูแลระบบ (Admin: {currentTeacher?.Teacher_ID})</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-semibold">
                    Super Admin
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  ท่านสามารถติดตามดูว่าครูคนใดส่งแผนแล้วบ้างแยกตามกลุ่มสาระการเรียนรู้ และมีสิทธิ์แก้ไขข้อมูลแผนการสอนรวมถึงข้อมูลครูทุกคนในระบบ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => {
                  setExecutiveMode('ranking');
                  setMainView('executive');
                }}
                className="flex-1 sm:flex-initial justify-center px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                title="จัดอันดับกลุ่มสาระที่ส่งเอกสารครบและตรงเวลาทุกคนก่อน"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>จัดอันดับกลุ่มสาระ</span>
              </button>
              <button
                onClick={() => setIsDeadlineModalOpen(true)}
                className="flex-1 sm:flex-initial justify-center px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="กำหนดช่วงเวลาส่งของแต่ละประเภทเอกสาร และปรับแต่งสถานะทั้งหมด"
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>กำหนดส่ง & สถานะ</span>
              </button>
              <button
                onClick={() => setIsAdminTrackerModalOpen(true)}
                className="flex-1 sm:flex-initial justify-center px-4 py-2.5 bg-[#0B1329] hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer active:scale-95"
              >
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>ตารางติดตามส่ง</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Display: Either Executive Dashboard OR Plans Grid */}
        {isAdmin && mainView === 'executive' ? (
          <ExecutiveDashboard
            teachers={teachers}
            plans={plans}
            currentTeacher={currentTeacher}
            deadlineConfigs={deadlineConfigs}
            executiveMode={executiveMode}
            onExecutiveModeChange={setExecutiveMode}
            onOpenPlan={(plan) => setSelectedPlanForReview(plan)}
            onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
            onOpenDirectoryModal={() => setIsDirectoryModalOpen(true)}
          />
        ) : (
          <>
            {/* For regular users: Show assigned documents notification & deadline alert */}
            {!isAdmin && currentTeacher && (
              <TeacherAssignmentNotification
                currentTeacher={currentTeacher}
                plans={plans}
                deadlineConfigs={deadlineConfigs}
                statusConfigs={statusConfigs}
                onOpenSubmitForType={handleOpenSubmitForType}
                onOpenReceipt={(plan) => setSelectedPlanForReceipt(plan)}
              />
            )}

            {/* Dashboard Statistics */}
            <DashboardStats
              plans={plans}
              teachers={teachers}
              currentTeacher={currentTeacher}
              selectedArea={areaFilter}
              onSelectArea={(area) => setAreaFilter(area)}
              selectedDocType={docTypeFilter}
              onSelectDocType={(dt) => setDocTypeFilter(dt)}
            />

        {/* Lesson Plans Control Bar */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* View Tabs */}
            {!isAdmin ? (
              <div className="flex items-center overflow-x-auto touch-scroll max-w-full bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-medium gap-1 pb-1">
                <button
                  onClick={() => setViewTab('all')}
                  className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    viewTab === 'all'
                      ? 'bg-white text-indigo-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  เอกสารของฉันทั้งหมด ({plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID).length})
                </button>
                <button
                  onClick={() => setViewTab('pending_review')}
                  className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    viewTab === 'pending_review'
                      ? 'bg-white text-amber-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>รอตรวจ</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-500 font-mono text-xs">({plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID && p.status === 'submitted').length})</span>
                </button>
                <button
                  onClick={() => setViewTab('approved')}
                  className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    viewTab === 'approved'
                      ? 'bg-white text-emerald-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>อนุมัติแล้ว</span>
                  <span className="text-slate-500 font-mono text-xs">({plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID && p.status === 'approved').length})</span>
                </button>
                <button
                  onClick={() => setViewTab('needs_revision')}
                  className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    viewTab === 'needs_revision'
                      ? 'bg-white text-rose-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>ส่งกลับแก้ไข</span>
                  <span className="text-slate-500 font-mono text-xs">({plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID && p.status === 'needs_revision').length})</span>
                </button>
                <button
                  onClick={() => setViewTab('late' as any)}
                  className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    (viewTab as any) === 'late'
                      ? 'bg-white text-orange-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>ส่งช้า</span>
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-slate-500 font-mono text-xs">({plans.filter((p) => p.teacher_id === currentTeacher?.Teacher_ID && p.is_late).length})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xs">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>เอกสารทั้งหมดในระบบ ({plans.length} รายการ)</span>
                </div>
              </div>
            )}

            {/* Status Filter buttons (Admin Only - Dynamic from statusConfigs) */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs touch-scroll max-w-full">
                <span className="text-slate-500 text-xs font-medium shrink-0 flex items-center gap-1 mr-0.5">
                  <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                  <span>สถานะ:</span>
                </span>
                {(() => {
                  const seen = new Set<string>();
                  const buttons: { id: string; label: string }[] = [];
                  buttons.push({ id: 'all', label: 'ทั้งหมด' });
                  seen.add('all');
                  buttons.push({ id: 'late', label: '⚠️ ส่งช้า' });
                  seen.add('late');

                  (statusConfigs || []).forEach((s) => {
                    const cleanId = (s.id || '').trim().toLowerCase();
                    if (!cleanId || seen.has(cleanId)) return;
                    seen.add(cleanId);
                    buttons.push({ id: s.id.trim(), label: s.label });
                  });

                  return buttons.map((s) => (
                    <button
                      key={`status-filter-${s.id}`}
                      onClick={() => setStatusFilter(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                        statusFilter === s.id
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Document Type Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll py-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium text-xs shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>ประเภทเอกสาร:</span>
            </span>
            <button
              onClick={() => setDocTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>ทุกประเภท</span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  docTypeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {docCategoryCounts.all}
              </span>
            </button>
            <button
              onClick={() => setDocTypeFilter('summary_plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'summary_plan'
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80'
              }`}
            >
              <span>📄 แผนฯ ฉบับย่อ</span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  docTypeFilter === 'summary_plan' ? 'bg-white/20 text-white' : 'bg-sky-200/80 text-sky-900'
                }`}
              >
                {docCategoryCounts.summary}
              </span>
            </button>
            <button
              onClick={() => setDocTypeFilter('full_plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'full_plan'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
              }`}
            >
              <span>📘 แผนฯ ฉบับสมบูรณ์</span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  docTypeFilter === 'full_plan' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                }`}
              >
                {docCategoryCounts.full}
              </span>
            </button>
            <button
              onClick={() => setDocTypeFilter('classroom_research')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'classroom_research'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/80'
              }`}
            >
              <span>🔬 วิจัยในชั้นเรียน</span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  docTypeFilter === 'classroom_research' ? 'bg-white/20 text-white' : 'bg-purple-200/80 text-purple-900'
                }`}
              >
                {docCategoryCounts.research}
              </span>
            </button>
            {docCategoryCounts.general > 0 && (
              <button
                onClick={() => setDocTypeFilter('general_academic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  docTypeFilter === 'general_academic'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80'
                }`}
              >
                <span>📑 เอกสารวิชาการอื่นๆ</span>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                    docTypeFilter === 'general_academic' ? 'bg-white/20 text-white' : 'bg-indigo-200/80 text-indigo-900'
                  }`}
                >
                  {docCategoryCounts.general}
                </span>
              </button>
            )}
          </div>

          {/* Search bar & Active filter indicators */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-2.5 border-t border-slate-100">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัสวิชา (ว31101), ชื่อวิชา, ชื่อแผน, หรือชื่อครูผู้สอน..."
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {docTypeFilter !== 'all' && (
              <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border border-purple-200">
                <span>
                  ประเภท:{' '}
                  {docTypeFilter === 'summary_plan'
                    ? 'แผนฯ ฉบับย่อ'
                    : docTypeFilter === 'full_plan'
                    ? 'แผนฯ ฉบับสมบูรณ์'
                    : docTypeFilter === 'classroom_research'
                    ? 'วิจัยในชั้นเรียน'
                    : 'เอกสารวิชาการ'}
                </span>
                <button
                  onClick={() => setDocTypeFilter('all')}
                  className="hover:text-purple-900 font-bold ml-1 cursor-pointer"
                  title="แสดงทุกประเภท"
                >
                  ✕
                </button>
              </div>
            )}

            {areaFilter && (
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0">
                <span>กลุ่มสาระ: {areaFilter}</span>
                <button
                  onClick={() => setAreaFilter('')}
                  className="hover:text-indigo-900 font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lesson Plans Grid & Table View */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-500" />
              <span>รายการเอกสารวิชาการ / แผนการจัดการเรียนรู้</span>
              <span className="text-xs text-slate-500 font-normal">
                (พบ {filteredPlans.length} รายการ)
              </span>
            </h3>

            {/* View Switcher: บอร์ดการ์ด vs ตารางแถวสรุป */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 self-start sm:self-auto shrink-0 shadow-2xs">
              <button
                onClick={() => setPlanDisplayMode('board')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  planDisplayMode === 'board'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ดูแบบบอร์ดการ์ด"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
                <span>บอร์ดการ์ด</span>
              </button>
              <button
                onClick={() => setPlanDisplayMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  planDisplayMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ดูแบบตารางแถวสรุป"
              >
                <TableIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>ตารางแถวสรุป</span>
              </button>
            </div>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-500">
                <BookOpen className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                ไม่พบแผนการสอนที่ตรงกับเงื่อนไขการค้นหา
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isAdmin
                  ? 'ยังไม่มีรายการแผนการสอนที่ตรงกับตัวกรอง ท่านสามารถติดตามภาพรวมได้ที่ปุ่มติดตามส่งแผนรายบุคคล'
                  : 'ลองปรับเปลี่ยนคำค้นหา หรือคลิกปุ่มส่งเอกสารเพื่อเริ่มสร้างรายการ'}
              </p>
              {!isAdmin && (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-slate-950" />
                  <span>ส่งเอกสาร</span>
                </button>
              )}
            </div>
          ) : planDisplayMode === 'board' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlans.map((plan) => (
                <LessonPlanCard
                  key={plan.id}
                  plan={plan}
                  currentTeacher={currentTeacher || teachers[0]}
                  onOpenReceipt={(p) => setSelectedPlanForReceipt(p)}
                  onOpenReview={(p) => setSelectedPlanForReview(p)}
                  onDeletePlan={(id) => handleDeletePlan(id)}
                  onEditPlan={(p) => setPlanToEdit(p)}
                  onResubmitPlan={(p) => setPlanToResubmit(p)}
                  statusConfigs={statusConfigs}
                  deadlineConfigs={deadlineConfigs}
                  onQuickChangeStatus={handleQuickChangePlanStatus}
                  onToggleLate={handleTogglePlanLate}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">รหัสวิชา & รายวิชา</th>
                      <th className="py-3.5 px-3 hidden sm:table-cell">ผู้สอน</th>
                      <th className="py-3.5 px-3 hidden md:table-cell">ประเภทเอกสาร</th>
                      <th className="py-3.5 px-3 hidden lg:table-cell">วันที่ส่ง & ความตรงต่อเวลา</th>
                      <th className="py-3.5 px-3">สถานะ</th>
                      <th className="py-3.5 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPlans.map((plan) => (
                      <LessonPlanTableRow
                        key={plan.id}
                        plan={plan}
                        currentTeacher={currentTeacher || teachers[0]}
                        onOpenReceipt={(p) => setSelectedPlanForReceipt(p)}
                        onOpenReview={(p) => setSelectedPlanForReview(p)}
                        onDeletePlan={(id) => handleDeletePlan(id)}
                        onEditPlan={(p) => setPlanToEdit(p)}
                        onResubmitPlan={(p) => setPlanToResubmit(p)}
                        statusConfigs={statusConfigs}
                        deadlineConfigs={deadlineConfigs}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                <span>แสดงทั้งหมด {filteredPlans.length} รายการ</span>
                <span className="text-[11px] text-slate-400">
                  💡 บนจอมือถือสามารถเลื่อนซ้าย-ขวาเพื่อดูข้อมูลครบถ้วน
                </span>
              </div>
            </div>
          )}
        </div>
      </>
    )}
  </main>

      {/* Mandatory Force Password Change Modal (Pass === '12345') */}
      {mustForceChangePassword && currentTeacher && (
        <ForcePasswordModal
          teacher={currentTeacher}
          onPasswordChanged={handlePasswordChanged}
        />
      )}

      {/* Submit Plan Modal */}
      {currentTeacher && (
        <SubmitPlanModal
          currentTeacher={currentTeacher}
          isOpen={isSubmitModalOpen}
          onClose={() => {
            setIsSubmitModalOpen(false);
            setSubmitModalInitialType(undefined);
          }}
          onSubmit={handleCreatePlan}
          isSupabaseConnected={isSupabaseConnected}
          deadlineConfigs={deadlineConfigs}
          initialPlanType={submitModalInitialType}
        />
      )}

      {/* Profile Modal */}
      {teacherToEdit && (
        <ProfileModal
          teacher={teacherToEdit}
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setTeacherToEdit(null);
          }}
          onSave={handleSaveProfile}
        />
      )}

      {/* Review Plan Modal */}
      {selectedPlanForReview && (
        <ReviewPlanModal
          plan={selectedPlanForReview}
          reviewer={currentTeacher || teachers.find(isTeacherAdmin) || teachers[0]}
          isOpen={!!selectedPlanForReview}
          onClose={() => setSelectedPlanForReview(null)}
          onSaveReview={handleSaveReview}
          statusConfigs={statusConfigs}
          deadlineConfigs={deadlineConfigs}
        />
      )}

      {/* Submission Receipt Modal */}
      {selectedPlanForReceipt && (
        <SubmissionReceiptModal
          plan={selectedPlanForReceipt}
          teacher={teachers.find((t) => t.Teacher_ID === selectedPlanForReceipt.teacher_id)}
          isOpen={!!selectedPlanForReceipt}
          onClose={() => setSelectedPlanForReceipt(null)}
        />
      )}

      {/* Teacher Directory Modal */}
      {currentTeacher && (
        <TeacherDirectoryModal
          teachers={teachers}
          currentTeacher={currentTeacher}
          isOpen={isDirectoryModalOpen}
          onClose={() => setIsDirectoryModalOpen(false)}
          onEditTeacher={(t) => {
            setTeacherToEdit(t);
            setIsProfileModalOpen(true);
          }}
        />
      )}

      {/* File Storage Hub Info Modal */}
      <FileStorageInfoModal
        plans={plans}
        isOpen={isFileStorageModalOpen}
        onClose={() => setIsFileStorageModalOpen(false)}
      />

      {/* Admin Tracker Matrix Modal */}
      <AdminTrackerModal
        teachers={teachers}
        plans={plans}
        deadlineConfigs={deadlineConfigs}
        statusConfigs={statusConfigs}
        isOpen={isAdminTrackerModalOpen}
        onClose={() => setIsAdminTrackerModalOpen(false)}
        onEditTeacher={(t) => {
          setTeacherToEdit(t);
          setIsProfileModalOpen(true);
        }}
        onEditPlan={(p) => setPlanToEdit(p)}
        onDeletePlan={(id) => handleDeletePlan(id)}
        onOpenReview={(p) => setSelectedPlanForReview(p)}
        onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
      />

      {/* Deadline & Status Manager Modal (Admin) */}
      <DeadlineManagerModal
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        deadlineConfigs={deadlineConfigs}
        onSaveDeadlineConfigs={handleSaveDeadlineConfigs}
        statusConfigs={statusConfigs}
        onSaveStatusConfigs={handleSaveStatusConfigs}
        plans={plans}
        onUpdatePlanStatus={handleQuickChangePlanStatus}
        onOpenReview={(p) => setSelectedPlanForReview(p)}
        isSupabaseConnected={isSupabaseConnected}
        currentTeacher={currentTeacher}
        teachers={teachers}
      />

      {/* Dynamic Assignment Submit Modal (when task has custom fields & dropdowns) */}
      {currentTeacher && selectedDynamicConfig && (
        <DynamicSubmitModal
          currentTeacher={currentTeacher}
          config={selectedDynamicConfig}
          isOpen={isDynamicSubmitModalOpen}
          onClose={() => {
            setIsDynamicSubmitModalOpen(false);
            setSelectedDynamicConfig(null);
          }}
          onSubmitted={async (submission, correspondingPlan) => {
            if (correspondingPlan) {
              setPlans((prev) => [correspondingPlan, ...prev]);
            }
            await syncWithDatabase(true);
            setToastNotice({
              type: 'success',
              message: `ส่งภาระงาน "${selectedDynamicConfig.name}" เรียบร้อยแล้ว!`,
              details: 'บันทึกข้อมูลและส่งเข้าระบบ Cloudflare D1 เรียบร้อยแล้ว',
            });
          }}
        />
      )}

      {/* Edit Plan Modal (Teacher owner or Admin) */}
      {planToEdit && (
        <EditPlanModal
          plan={planToEdit}
          isOpen={!!planToEdit}
          isAdmin={isAdmin}
          statusConfigs={statusConfigs}
          deadlineConfigs={deadlineConfigs}
          onClose={() => setPlanToEdit(null)}
          onSave={async (updatedPlan) => {
            const res = await savePlanRecord(updatedPlan);
            setPlans((prev) =>
              prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
            );
            await syncWithDatabase(true);

            setToastNotice({
              type: 'success',
              message: 'บันทึกการแก้ไขแผนเรียบร้อยแล้ว',
              details: res.isSupabase
                ? 'ระบบได้อัปเดตข้อมูลลงฐานข้อมูล Cloudflare D1 (ตาราง lesson_plans) อัตโนมัติแล้ว'
                : 'บันทึกในเครื่องเรียบร้อยแล้ว',
            });
          }}
        />
      )}

      {/* Confirm Delete Modal (safe in iframe, no window.confirm) */}
      <ConfirmDeleteModal
        isOpen={!!planToDelete}
        plan={planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={async (id) => {
          await executeDeletePlan(id);
        }}
      />

      {/* Resubmit Plan Modal */}
      <ResubmitPlanModal
        isOpen={!!planToResubmit}
        plan={planToResubmit}
        onClose={() => setPlanToResubmit(null)}
        onResubmit={handleResubmitPlan}
      />

      {/* Login Modal */}
      <LoginModal
        teachers={teachers}
        isOpen={isLoginModalOpen}
        onLogin={handleSetCurrentUser}
      />

      {/* Mobile Floating Bottom Navigation Bar: สะดวกใช้งานบนมือถือด้วยนิ้วโป้งเดียว (Style 4: แสด-กรมท่า) */}
      {currentTeacher && (
        <nav
          aria-label="เมนูหลักสำหรับมือถือ"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xl px-2 pt-1 pb-safe flex items-center justify-around text-[10px] font-bold text-slate-600 transition-all select-none"
        >
          {/* Button 1: แผนงาน */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setMainView('plans');
              setViewTab('all');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer active:scale-95 ${
              mainView === 'plans' ? 'text-amber-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>แผนงาน</span>
          </button>

          {/* Button 2: ภาระงาน หรือ แดชบอร์ด */}
          {isAdmin ? (
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setMainView('executive');
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer active:scale-95 ${
                mainView === 'executive' ? 'text-amber-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>แดชบอร์ด</span>
            </button>
          ) : (
            <button
              onClick={handleScrollToAssignments}
              className="relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer active:scale-95 text-slate-500 hover:text-slate-900"
            >
              <div className="relative">
                <Bell className="w-5 h-5 text-amber-500" />
                {pendingAssignmentsCount !== undefined && pendingAssignmentsCount > 0 ? (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center">
                    {pendingAssignmentsCount}
                  </span>
                ) : (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
                )}
              </div>
              <span>ภาระงาน</span>
            </button>
          )}

          {/* Button 3: ส่งเอกสาร (Large Center Action: สีแสดทอง #F59E0B โดดเด่น) */}
          {!isAdmin ? (
            <button
              onClick={() => {
                setSubmitModalInitialType(undefined);
                setIsSubmitModalOpen(true);
              }}
              className="-mt-5 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-[#F59E0B] hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 border-3 border-white active:scale-90 transition-transform cursor-pointer"
              title="ส่งเอกสารแผนการสอน"
            >
              <PlusCircle className="w-6 h-6 text-slate-950" />
            </button>
          ) : (
            <button
              onClick={() => setIsAdminTrackerModalOpen(true)}
              className="-mt-5 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-[#0B1329] text-amber-400 shadow-lg shadow-slate-950/30 border-3 border-white active:scale-90 transition-transform cursor-pointer"
              title="ติดตามงานรายบุคคล"
            >
              <ClipboardList className="w-6 h-6 text-amber-400" />
            </button>
          )}

          {/* Button 4: บุคลากร */}
          <button
            onClick={() => setIsDirectoryModalOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer active:scale-95 text-slate-500 hover:text-slate-900"
          >
            <Users className="w-5 h-5 text-slate-600" />
            <span>บุคลากร</span>
          </button>

          {/* Button 5: เมนูแผงควบคุม (เปิด Sidebar Drawer สีกรมท่า #0B1329) */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer active:scale-95 text-slate-500 hover:text-slate-900"
            title="เปิดเมนูเพิ่มเติม"
          >
            <Menu className="w-5 h-5 text-slate-700" />
            <span>เมนู</span>
          </button>
        </nav>
      )}
    </div>
  </div>
  );
}
