import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Teacher,
  LessonPlan,
  PlanStatus,
  isTeacherAdmin,
  isTeacherExecutive,
  PlanTypeDeadlineConfig,
  PlanStatusConfig,
  AssignmentSubmission,
  DepartmentConfig,
  BranchConfig,
  ReviewWorkflowConfig,
  AllDocumentsAccessConfig,
  DEFAULT_ALL_DOCS_ACCESS_CONFIG,
  canTeacherViewAllDocuments,
  ActiveTermConfig,
  DEFAULT_ACTIVE_TERM_CONFIG,
  isSameTeacherIdentity,
  isPlanOwnedByTeacher,
} from './types';
import {
  getLocalActiveTerm,
  saveLocalActiveTerm,
  isPlanInActiveTerm,
} from './utils/academicTermUtils';
import { AcademicTermModal } from './components/AcademicTermModal';
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
  getDeletedPlanIds,
  recordDeletedPlanId,
  syncDeletedPlanIdsWithCloud,
  saveAssignmentSubmissionRecord,
  getPendingPlanSyncIds,
  filterPlansForTeacherScope,
  sanitizeTeacherForClient,
} from './services/supabaseClient';
import { updateServerTeacherPassword } from './services/authService';
import {
  getSavedDeadlineConfigs,
  saveDeadlineConfigs,
  getSavedStatusConfigs,
  saveStatusConfigs,
  checkSubmissionTimeliness,
  getPlanStatusInfo,
  getSavedSubmissions,
  classifyDocumentType,
  isPlanMatchingAssignment,
  DEFAULT_DEADLINE_CONFIGS,
  DEFAULT_STATUS_CONFIGS,
} from './utils/deadlineUtils';
import { Navbar } from './components/Navbar';
import { triggerSchoolCelebration } from './utils/confettiUtils';
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
import { getDatabaseProvider, savePlanToCloudflare } from './services/cloudflareClient';
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
import { GoogleDriveConfigModal } from './components/GoogleDriveConfigModal';
import {
  DEFAULT_GDRIVE_WEBHOOK_URL,
  STORAGE_KEY_GDRIVE_WEBHOOK,
  archiveReviewedPlanToGoogleDrive,
  trashGoogleDriveFile,
  syncLessonPlanDriveEditors,
  fetchGoogleDriveNamingPattern,
} from './services/googleDriveService';
import {
  SeasonalThemeConfig,
  DEFAULT_SEASONAL_THEME_CONFIG,
  getLocalSeasonalThemeConfig,
  saveLocalSeasonalThemeConfig,
  resolveActiveSeasonalTheme,
  getUserSeasonalMuted,
  setUserSeasonalMuted,
} from './services/seasonalThemeService';
import {
  SeasonalParticlesOverlay,
  SeasonalBannerBar,
} from './components/SeasonalDecorations';
import { SeasonalThemeModal } from './components/SeasonalThemeModal';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_BRANCHES,
  DEFAULT_WORKFLOWS,
  getLocalDepartments,
  saveLocalDepartments,
  getLocalBranches,
  saveLocalBranches,
  saveBranches,
  getLocalWorkflows,
  saveLocalWorkflows,
  getLocalWorkflowAssignments,
  saveLocalWorkflowAssignments,
  getWorkflowForPlan,
  assignWorkflowToPlan,
  resolveReviewersForStage,
  isTeacherBranchHeadOfPlan,
  isTeacherDeptHeadOfPlan,
  isTeacherInDept,
  isAdminAllowedOnStage,
  sanitizeStaleAdminAssignments,
} from './services/departmentWorkflowService';
import { StaffStructureManagerModal } from './components/StaffStructureManagerModal';
import { WorkflowManagerModal } from './components/WorkflowManagerModal';
import { AllDocumentsPermissionModal } from './components/AllDocumentsPermissionModal';
import { ReviewerWorkloadModal } from './components/ReviewerWorkloadModal';
import { Sidebar } from './components/Sidebar';
import { LessonPlanTableRow } from './components/LessonPlanTableRow';
import { DeadlineCountdownBanner } from './components/DeadlineCountdownBanner';
import { findFirstHttpUrlInObject } from './utils/fileLinkUtils';
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
  ChevronDown,
  ChevronUp,
  Upload,
  RefreshCw,
  BrainCircuit,
  Cloud,
  Trophy,
  UserCheck,
  Building2,
  Workflow as WorkflowIcon,
  ArrowUp,
} from 'lucide-react';
import { CommandPaletteModal } from './components/CommandPaletteModal';

export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>(() => getLocalTeachers());
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const currentTeacherRef = useRef<Teacher | null>(null);
  useEffect(() => {
    currentTeacherRef.current = currentTeacher;
  }, [currentTeacher]);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Views
  const [viewTab, setViewTab] = useState<'all' | 'my' | 'pending_review' | 'approved' | 'needs_revision' | 'assigned_to_me' | 'school_all'>('all');
  const [mainView, setMainView] = useState<'plans' | 'executive'>('plans');
  const [executiveMode, setExecutiveMode] = useState<'standard' | 'ranking' | 'ddo'>('standard');
  const [planDisplayMode, setPlanDisplayMode] = useState<'board' | 'table'>('board');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [assignedReviewSubTab, setAssignedReviewSubTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [isTeacherStatsOpen, setIsTeacherStatsOpen] = useState<boolean>(false);
  const [groupByLearningArea, setGroupByLearningArea] = useState<boolean>(true);
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({});
  const [areaTypeFilters, setAreaTypeFilters] = useState<Record<string, string>>({});

  // Auto-switch to executive dashboard for leadership accounts
  useEffect(() => {
    if (currentTeacher && isTeacherExecutive(currentTeacher)) {
      setMainView('executive');
    }
  }, [currentTeacher]);

  // Ensure assigned review queue always opens on 'pending' (รอตรวจ) where reviewed plans are cleared
  useEffect(() => {
    if (viewTab === 'assigned_to_me') {
      setAssignedReviewSubTab('pending');
    }
  }, [viewTab]);

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
  const [isReviewerWorkloadModalOpen, setIsReviewerWorkloadModalOpen] = useState(false);
  const [adminTrackerInitialView, setAdminTrackerInitialView] = useState<
    'overview' | 'table' | 'cards' | 'matrix' | 'ranking' | 'breakdown'
  >('overview');

  const handleOpenAdminTracker = (
    view: 'overview' | 'table' | 'cards' | 'matrix' | 'ranking' | 'breakdown' = 'overview'
  ) => {
    setAdminTrackerInitialView(view);
    setIsAdminTrackerModalOpen(true);
  };
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isStaffStructureModalOpen, setIsStaffStructureModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isAllDocsPermissionModalOpen, setIsAllDocsPermissionModalOpen] = useState(false);
  const [isAcademicTermModalOpen, setIsAcademicTermModalOpen] = useState(false);
  const [isSeasonalThemeModalOpen, setIsSeasonalThemeModalOpen] = useState(false);
  const [seasonalThemeConfig, setSeasonalThemeConfig] = useState<SeasonalThemeConfig>(() =>
    getLocalSeasonalThemeConfig()
  );
  const [isSeasonalMuted, setIsSeasonalMuted] = useState<boolean>(() => getUserSeasonalMuted());
  const [isAdminTopMenuOpen, setIsAdminTopMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeTerm, setActiveTerm] = useState<ActiveTermConfig>(() => getLocalActiveTerm());

  const activeSeasonalTheme = useMemo(
    () => resolveActiveSeasonalTheme(seasonalThemeConfig),
    [seasonalThemeConfig]
  );

  // Global keyboard shortcut (Ctrl+K / Cmd+K) for Command Palette & scroll listener for Back-to-Top
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 420);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  const [allDocsAccessConfig, setAllDocsAccessConfig] = useState<AllDocumentsAccessConfig>(() => {
    try {
      const raw = localStorage.getItem('school_all_docs_access_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            allow_all_teachers: Boolean(parsed.allow_all_teachers),
            allow_dept_heads: Boolean(parsed.allow_dept_heads),
            allow_branch_heads: Boolean(parsed.allow_branch_heads),
            allowed_teacher_ids: Array.isArray(parsed.allowed_teacher_ids) ? parsed.allowed_teacher_ids : [],
          };
        }
      }
    } catch {}
    return DEFAULT_ALL_DOCS_ACCESS_CONFIG;
  });

  const canViewAllDocs = useMemo(() => {
    return canTeacherViewAllDocuments(currentTeacher, allDocsAccessConfig);
  }, [currentTeacher, allDocsAccessConfig]);
  const [departments, setDepartments] = useState<DepartmentConfig[]>(() => getLocalDepartments());
  const [branches, setBranches] = useState<BranchConfig[]>(() => getLocalBranches());
  const [workflows, setWorkflows] = useState<ReviewWorkflowConfig[]>(() => getLocalWorkflows());
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

  // Cloud-authoritative sync and re-fetch across all devices
  const syncWithDatabase = async (silent: boolean = true, overrideTeacher?: Teacher | null) => {
    setIsSyncing(true);
    try {
      // Snapshot pending offline writes BEFORE fetchPlans overwrites lp_local_plans
      const preSyncLocalPlans = getLocalPlans();
      const pendingSyncIds = getPendingPlanSyncIds();
      const localWorkflowAssignBefore = getLocalWorkflowAssignments();

      // Execute all database fetches concurrently in a single parallel batch
      const [
        teachersRes,
        plansRes,
        dlSettingsRes,
        statusSettingsRes,
        submissionsRes,
        gdriveRes,
        deletedIds,
        deptRes,
        branchRes,
        wfRes,
        allDocsAccessRes,
        activeTermRes,
        wfAssignRes,
        _gdrivePat,
        seasonalThemeRes,
      ] = await Promise.all([
        fetchTeachers(),
        fetchPlans(null),
        fetchSystemSetting<PlanTypeDeadlineConfig[]>('deadline_configs', getSavedDeadlineConfigs()),
        fetchSystemSetting<PlanStatusConfig[]>('status_configs', getSavedStatusConfigs()),
        fetchAssignmentSubmissionsList(),
        fetchSystemSetting<string>('gdrive_webhook_url', DEFAULT_GDRIVE_WEBHOOK_URL),
        syncDeletedPlanIdsWithCloud(),
        fetchSystemSetting<DepartmentConfig[]>('school_departments', getLocalDepartments()),
        fetchSystemSetting<BranchConfig[]>('school_branches', getLocalBranches()),
        fetchSystemSetting<ReviewWorkflowConfig[]>('review_workflows', getLocalWorkflows()),
        fetchSystemSetting<AllDocumentsAccessConfig>('school_all_docs_access_config', DEFAULT_ALL_DOCS_ACCESS_CONFIG),
        fetchSystemSetting<ActiveTermConfig>('school_active_term', getLocalActiveTerm()),
        fetchSystemSetting<Record<string, any>>('plan_workflow_assignments', {}),
        fetchGoogleDriveNamingPattern(),
        fetchSystemSetting<SeasonalThemeConfig>('seasonal_theme_config', DEFAULT_SEASONAL_THEME_CONFIG),
      ]);

      setTeachers(teachersRes.data);
      setIsSupabaseConnected(teachersRes.isSupabase || plansRes.isSupabase);

      // Sync plan_workflow_assignments from Cloud into localStorage
      const remoteWfAssign =
        wfAssignRes?.data && typeof wfAssignRes.data === 'object' && !Array.isArray(wfAssignRes.data)
          ? wfAssignRes.data
          : {};
      const mergedWfAssign: Record<string, any> = {};
      if (wfAssignRes?.isSupabase) {
        // Cloud is authoritative; only preserve local workflow metadata for pending offline plans
        Object.keys(localWorkflowAssignBefore).forEach((pid) => {
          if (pendingSyncIds.has(pid)) {
            mergedWfAssign[pid] = localWorkflowAssignBefore[pid];
          }
        });
        Object.entries(remoteWfAssign).forEach(([pid, meta]) => {
          if (meta && typeof meta === 'object') {
            mergedWfAssign[pid] = pendingSyncIds.has(pid) && mergedWfAssign[pid]
              ? mergedWfAssign[pid]
              : meta;
          }
        });
      } else {
        Object.assign(mergedWfAssign, localWorkflowAssignBefore);
      }
      saveLocalWorkflowAssignments(mergedWfAssign);

      let currentActiveTerm = getLocalActiveTerm();
      if (activeTermRes?.data && activeTermRes.data.academic_year && activeTermRes.data.semester) {
        currentActiveTerm = {
          academic_year: String(activeTermRes.data.academic_year).trim(),
          semester: String(activeTermRes.data.semester).trim(),
          updated_at: activeTermRes.data.updated_at,
          updated_by: activeTermRes.data.updated_by,
        };
        setActiveTerm(currentActiveTerm);
        saveLocalActiveTerm(currentActiveTerm);
      }

      if (allDocsAccessRes?.data && typeof allDocsAccessRes.data === 'object') {
        setAllDocsAccessConfig(allDocsAccessRes.data);
        try {
          localStorage.setItem('school_all_docs_access_config', JSON.stringify(allDocsAccessRes.data));
        } catch {}
      }

      if (seasonalThemeRes?.data && typeof seasonalThemeRes.data === 'object' && seasonalThemeRes.data.mode) {
        setSeasonalThemeConfig(seasonalThemeRes.data);
        saveLocalSeasonalThemeConfig(seasonalThemeRes.data);
      }

      if (deptRes?.data && Array.isArray(deptRes.data) && deptRes.data.length > 0) {
        setDepartments(deptRes.data);
        saveLocalDepartments(deptRes.data);
      }
      if (branchRes?.data && Array.isArray(branchRes.data) && branchRes.data.length > 0) {
        setBranches(branchRes.data);
        saveLocalBranches(branchRes.data);
      }
      if (wfRes?.data && Array.isArray(wfRes.data) && wfRes.data.length > 0) {
        setWorkflows(wfRes.data);
        saveLocalWorkflows(wfRes.data);
      }

      let effectiveDl = getSavedDeadlineConfigs();
      if (dlSettingsRes.isSupabase && Array.isArray(dlSettingsRes.data) && dlSettingsRes.data.length > 0) {
        effectiveDl = dlSettingsRes.data;
        saveDeadlineConfigs(dlSettingsRes.data);
        setDeadlineConfigs(dlSettingsRes.data);
      } else if (dlSettingsRes.isSupabase && (!dlSettingsRes.data || (Array.isArray(dlSettingsRes.data) && dlSettingsRes.data.length === 0))) {
        saveSystemSetting('deadline_configs', DEFAULT_DEADLINE_CONFIGS);
      }

      if (statusSettingsRes.isSupabase && Array.isArray(statusSettingsRes.data) && statusSettingsRes.data.length > 0) {
        saveStatusConfigs(statusSettingsRes.data);
        setStatusConfigs(statusSettingsRes.data);
      } else if (statusSettingsRes.isSupabase && (!statusSettingsRes.data || (Array.isArray(statusSettingsRes.data) && statusSettingsRes.data.length === 0))) {
        saveSystemSetting('status_configs', DEFAULT_STATUS_CONFIGS);
      }

      // Sync Google Drive permanent webhook URL across all devices
      const activeGdriveUrl = (gdriveRes?.data && typeof gdriveRes.data === 'string' && gdriveRes.data.trim())
        ? gdriveRes.data.trim()
        : DEFAULT_GDRIVE_WEBHOOK_URL;
      try {
        localStorage.setItem(STORAGE_KEY_GDRIVE_WEBHOOK, activeGdriveUrl);
        if (gdriveRes?.isSupabase && (!gdriveRes.data || !String(gdriveRes.data).trim())) {
          saveSystemSetting('gdrive_webhook_url', DEFAULT_GDRIVE_WEBHOOK_URL);
        }
      } catch {
        // ignore
      }

      // Resolve & refresh active user anchored by canonical Teacher_ID (fallback Email)
      let resolvedTeacher: Teacher | null =
        overrideTeacher !== undefined ? overrideTeacher : currentTeacherRef.current;

      if (resolvedTeacher) {
        const refreshed = teachersRes.data.find(
          (t) =>
            String(t.Teacher_ID || '').trim().toLowerCase() ===
            String(resolvedTeacher!.Teacher_ID || '').trim().toLowerCase()
        );
        if (refreshed) {
          const sanitized = sanitizeTeacherForClient(refreshed);
          const prevJson = currentTeacherRef.current ? JSON.stringify(currentTeacherRef.current) : '';
          const nextJson = JSON.stringify(sanitized);
          resolvedTeacher = prevJson === nextJson && currentTeacherRef.current
            ? currentTeacherRef.current
            : sanitized;
          if (prevJson !== nextJson) {
            currentTeacherRef.current = sanitized;
            setCurrentTeacher(sanitized);
          }
          try {
            localStorage.setItem('lp_current_user_id', resolvedTeacher.Teacher_ID);
            localStorage.setItem('lp_current_user_email', resolvedTeacher.Email);
          } catch {}
        }
      } else if (overrideTeacher === undefined) {
        const savedUserId = localStorage.getItem('lp_current_user_id');
        const savedUserEmail = localStorage.getItem('lp_current_user_email');
        let found: Teacher | undefined;
        if (savedUserId) {
          const targetId = savedUserId.trim().toLowerCase();
          found = teachersRes.data.find(
            (t) => String(t.Teacher_ID || '').trim().toLowerCase() === targetId
          );
        }
        if (!found && savedUserEmail) {
          const targetEmail = savedUserEmail.trim().toLowerCase();
          found = teachersRes.data.find(
            (t) =>
              String(t.Email || '').trim().toLowerCase() === targetEmail ||
              String(t.Teacher_ID || '').trim().toLowerCase() === targetEmail
          );
        }
        if (found) {
          resolvedTeacher = sanitizeTeacherForClient(found);
          currentTeacherRef.current = resolvedTeacher;
          setCurrentTeacher(resolvedTeacher);
          try {
            localStorage.setItem('lp_current_user_id', resolvedTeacher.Teacher_ID);
            localStorage.setItem('lp_current_user_email', resolvedTeacher.Email);
          } catch {}
        }
      }

      // Merge remote plans + dynamic submissions + cloud workflow metadata
      const remotePlans = (plansRes.data || [])
        .filter((p) => !deletedIds.has(p.id) && p.status !== 'deleted')
        .map((p) => {
          const wfMeta = mergedWfAssign[p.id];
          if (!wfMeta) return p;
          return {
            ...p,
            assigned_reviewer_id: p.assigned_reviewer_id || wfMeta.assigned_reviewer_id,
            assigned_reviewer_name: p.assigned_reviewer_name || wfMeta.assigned_reviewer_name,
            current_stage_order: p.current_stage_order || wfMeta.current_stage_order || 1,
            workflow_id: p.workflow_id || wfMeta.workflow_id,
            stage_reviews: (p.stage_reviews && p.stage_reviews.length > 0) ? p.stage_reviews : (wfMeta.stage_reviews || []),
            branch: p.branch || wfMeta.branch,
          };
        });
      const remotePlanIds = new Set(remotePlans.map((p) => p.id));

      // 1. Convert dynamic submissions that are not yet in lesson_plans table
      const convertedDynamicPlans: LessonPlan[] = (submissionsRes || [])
        .filter((sub) => !remotePlanIds.has(sub.id) && !deletedIds.has(sub.id) && sub.status !== 'deleted')
        .map((sub) => {
          const firstAtt = sub.attachments?.[0];
          const dlConfig = effectiveDl.find((d) => d.id === sub.assignment_id || d.name === sub.assignment_name);
          const fields = dlConfig?.fields || [];
          const answers = sub.answers || {};
          const wfMeta = mergedWfAssign[sub.id];

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
            branch: wfMeta?.branch || '',
            subject_code: String(answers['fld_subject_code'] || 'ภาระงาน'),
            subject_name: String(answers['fld_subject_name'] || sub.assignment_name),
            grade_level: String(answers['fld_grade_level'] || 'มัธยมศึกษา'),
            semester: dlConfig?.semester || currentActiveTerm.semester || DEFAULT_ACTIVE_TERM_CONFIG.semester,
            academic_year: dlConfig?.academic_year || currentActiveTerm.academic_year || DEFAULT_ACTIVE_TERM_CONFIG.academic_year,
            plan_title: String(titleCandidate).substring(0, 120),
            plan_type: sub.assignment_name,
            total_hours: Number(answers['fld_hours']) || 1,
            file_url: firstAtt?.file_url || answers[fields.find((f) => f.type === 'file')?.id || ''] || findFirstHttpUrlInObject(answers) || '#',
            file_name: firstAtt?.file_name || 'เอกสารภาระงาน',
            submitted_at: sub.submitted_at || new Date().toISOString(),
            status: sub.status || 'submitted',
            is_late: sub.is_late ?? false,
            submission_delay_text: sub.submission_delay_text,
            reviewed_by: sub.reviewed_by || undefined,
            reviewer_name: sub.reviewer_name || undefined,
            reviewed_at: sub.reviewed_at || undefined,
            review_comment: sub.review_comment || undefined,
            admin_notes: sub.admin_notes || undefined,
            evaluation_type: dlConfig?.evaluation_type || 'approval_only',
            notes: JSON.stringify(answers),
            assigned_reviewer_id: wfMeta?.assigned_reviewer_id,
            assigned_reviewer_name: wfMeta?.assigned_reviewer_name,
            current_stage_order: wfMeta?.current_stage_order || 1,
            workflow_id: wfMeta?.workflow_id,
            stage_reviews: wfMeta?.stage_reviews || [],
          };
        });

      // 2. Cloud-authoritative reconciliation:
      // Only let local edits override cloud or stay in missingLocals if they are explicitly tracked in pendingSyncIds
      // (meaning an earlier save failed to reach Cloudflare D1 and still needs to be flushed).
      const localPlans = preSyncLocalPlans.filter((lp) => !deletedIds.has(lp.id) && lp.status !== 'deleted');
      const localPlanMap = new Map(localPlans.map((lp) => [lp.id, lp]));

      const resolvedRemotePlans = remotePlans.map((rp) => {
        if (!pendingSyncIds.has(rp.id)) return rp;
        const lp = localPlanMap.get(rp.id);
        if (!lp) return rp;
        savePlanRecord(lp).catch(() => {});
        return { ...rp, ...lp };
      });

      const resolvedDynamicPlans = convertedDynamicPlans.map((dp) => {
        if (!pendingSyncIds.has(dp.id)) return dp;
        const lp = localPlanMap.get(dp.id);
        if (!lp) return dp;
        savePlanRecord(lp).catch(() => {});
        return { ...dp, ...lp };
      });

      const knownIds = new Set([...resolvedRemotePlans.map((p) => p.id), ...resolvedDynamicPlans.map((p) => p.id)]);
      const missingLocals = plansRes.isSupabase
        ? localPlans.filter((lp) => !knownIds.has(lp.id) && pendingSyncIds.has(lp.id))
        : localPlans.filter((lp) => !knownIds.has(lp.id));

      if (plansRes.isSupabase && missingLocals.length > 0) {
        missingLocals.forEach((lp) => savePlanRecord(lp).catch(() => {}));
      }

      const mergedPlans = [...resolvedRemotePlans, ...resolvedDynamicPlans, ...missingLocals].filter(
        (p) => !deletedIds.has(p.id) && p.status !== 'deleted'
      );
      saveLocalPlans(mergedPlans, plansRes.isSupabase);

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

      const scopedPlans = resolvedTeacher
        ? filterPlansForTeacherScope(evaluated, resolvedTeacher)
        : [];
      setPlans(scopedPlans);

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

  // Load initial data (single pass, zero destructive overwrite)
  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        syncWithDatabase(true),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Targeted Table Sync (uses latest active teacher & cloud-authoritative merge)
  const syncTable = async (table: string) => {
    try {
      const activeUser = currentTeacherRef.current;
      if (table === 'lesson_plans') {
        const deletedIds = getDeletedPlanIds();
        const preSyncLocalPlans = getLocalPlans();
        const pendingSyncIds = getPendingPlanSyncIds();
        const [plansRes, wfAssignRes] = await Promise.all([
          fetchPlans(null),
          fetchSystemSetting<Record<string, any>>('plan_workflow_assignments', {}),
        ]);
        if (plansRes.data) {
          const effectiveDl = deadlineConfigs.length > 0 ? deadlineConfigs : getSavedDeadlineConfigs();
          const remoteWfAssign =
            wfAssignRes?.data && typeof wfAssignRes.data === 'object' && !Array.isArray(wfAssignRes.data)
              ? wfAssignRes.data
              : getLocalWorkflowAssignments();
          saveLocalWorkflowAssignments(remoteWfAssign);

          const remotePlans = (plansRes.data || [])
            .filter((p) => !deletedIds.has(p.id) && p.status !== 'deleted')
            .map((p) => {
              const wfMeta = remoteWfAssign[p.id];
              return wfMeta
                ? {
                    ...p,
                    assigned_reviewer_id: p.assigned_reviewer_id || wfMeta.assigned_reviewer_id,
                    assigned_reviewer_name: p.assigned_reviewer_name || wfMeta.assigned_reviewer_name,
                    current_stage_order: p.current_stage_order || wfMeta.current_stage_order || 1,
                    workflow_id: p.workflow_id || wfMeta.workflow_id,
                    stage_reviews: (p.stage_reviews && p.stage_reviews.length > 0) ? p.stage_reviews : (wfMeta.stage_reviews || []),
                    branch: p.branch || wfMeta.branch,
                  }
                : p;
            });
          const remotePlanIds = new Set(remotePlans.map((p) => p.id));
          const localSubmissions = await fetchAssignmentSubmissionsList();
          const convertedDynamicPlans: LessonPlan[] = (localSubmissions || [])
            .filter((sub: AssignmentSubmission) => !remotePlanIds.has(sub.id) && !deletedIds.has(sub.id) && sub.status !== 'deleted')
            .map((sub: AssignmentSubmission) => {
              const firstAtt = sub.attachments?.[0];
              const dlConfig = effectiveDl.find((d) => d.id === sub.assignment_id || d.name === sub.assignment_name);
              const fields = dlConfig?.fields || [];
              const answers = sub.answers || {};
              const wfMeta = remoteWfAssign[sub.id];
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
                branch: wfMeta?.branch || '',
                subject_code: String(answers['fld_subject_code'] || 'ภาระงาน'),
                subject_name: String(answers['fld_subject_name'] || sub.assignment_name),
                grade_level: String(answers['fld_grade_level'] || 'มัธยมศึกษา'),
                semester: dlConfig?.semester || activeTerm.semester || DEFAULT_ACTIVE_TERM_CONFIG.semester,
                academic_year: dlConfig?.academic_year || activeTerm.academic_year || DEFAULT_ACTIVE_TERM_CONFIG.academic_year,
                plan_title: String(titleCandidate).substring(0, 120),
                plan_type: sub.assignment_name,
                total_hours: Number(answers['fld_hours']) || 1,
                file_url: firstAtt?.file_url || answers[fields.find((f) => f.type === 'file')?.id || ''] || findFirstHttpUrlInObject(answers) || '#',
                file_name: firstAtt?.file_name || 'เอกสารภาระงาน',
                submitted_at: sub.submitted_at || new Date().toISOString(),
                status: sub.status || 'submitted',
                is_late: sub.is_late ?? false,
                submission_delay_text: sub.submission_delay_text,
                evaluation_type: dlConfig?.evaluation_type || 'approval_only',
                notes: JSON.stringify(answers),
                assigned_reviewer_id: wfMeta?.assigned_reviewer_id,
                assigned_reviewer_name: wfMeta?.assigned_reviewer_name,
                current_stage_order: wfMeta?.current_stage_order || 1,
                workflow_id: wfMeta?.workflow_id,
                stage_reviews: wfMeta?.stage_reviews || [],
              };
            });

          const localPlans = preSyncLocalPlans.filter((lp) => !deletedIds.has(lp.id) && lp.status !== 'deleted');
          const localPlanMap = new Map(localPlans.map((lp) => [lp.id, lp]));

          const resolvedRemotePlans = remotePlans.map((rp) => {
            if (!pendingSyncIds.has(rp.id)) return rp;
            const lp = localPlanMap.get(rp.id);
            if (!lp) return rp;
            savePlanRecord(lp).catch(() => {});
            return { ...rp, ...lp };
          });

          const resolvedDynamicPlans = convertedDynamicPlans.map((dp) => {
            if (!pendingSyncIds.has(dp.id)) return dp;
            const lp = localPlanMap.get(dp.id);
            if (!lp) return dp;
            savePlanRecord(lp).catch(() => {});
            return { ...dp, ...lp };
          });

          const knownIds = new Set([...resolvedRemotePlans.map((p) => p.id), ...resolvedDynamicPlans.map((p) => p.id)]);
          const missingLocals = plansRes.isSupabase
            ? localPlans.filter((lp) => !knownIds.has(lp.id) && pendingSyncIds.has(lp.id))
            : localPlans.filter((lp) => !knownIds.has(lp.id));
          const merged = [...resolvedRemotePlans, ...resolvedDynamicPlans, ...missingLocals].filter(
            (p) => !deletedIds.has(p.id) && p.status !== 'deleted'
          );
          saveLocalPlans(merged, plansRes.isSupabase);
          setPlans(activeUser ? filterPlansForTeacherScope(merged, activeUser) : []);
        }
      } else if (table === 'teachers') {
        const teachersRes = await fetchTeachers();
        if (teachersRes.data) {
          setTeachers(teachersRes.data);
          if (activeUser) {
            const refreshed = teachersRes.data.find(
              (t) =>
                String(t.Teacher_ID || '').trim().toLowerCase() ===
                String(activeUser.Teacher_ID || '').trim().toLowerCase()
            );
            if (refreshed) {
              const sanitized = sanitizeTeacherForClient(refreshed);
              const prevJson = currentTeacherRef.current ? JSON.stringify(currentTeacherRef.current) : '';
              if (prevJson !== JSON.stringify(sanitized)) {
                currentTeacherRef.current = sanitized;
                setCurrentTeacher(sanitized);
              }
            }
          }
        }
      } else if (table === 'system_settings') {
        const [dlRes, stRes, termRes] = await Promise.all([
          fetchSystemSetting<PlanTypeDeadlineConfig[]>('deadline_configs', getSavedDeadlineConfigs()),
          fetchSystemSetting<PlanStatusConfig[]>('status_configs', getSavedStatusConfigs()),
          fetchSystemSetting<ActiveTermConfig>('school_active_term', getLocalActiveTerm()),
        ]);
        if (dlRes.data && Array.isArray(dlRes.data)) {
          setDeadlineConfigs(dlRes.data);
          saveDeadlineConfigs(dlRes.data);
        }
        if (stRes.data && Array.isArray(stRes.data)) {
          setStatusConfigs(stRes.data);
          saveStatusConfigs(stRes.data);
        }
        if (termRes?.data && termRes.data.academic_year && termRes.data.semester) {
          const syncedTerm: ActiveTermConfig = {
            academic_year: String(termRes.data.academic_year).trim(),
            semester: String(termRes.data.semester).trim(),
            updated_at: termRes.data.updated_at,
            updated_by: termRes.data.updated_by,
          };
          setActiveTerm(syncedTerm);
          saveLocalActiveTerm(syncedTerm);
        }
      } else {
        syncWithDatabase(true);
      }
    } catch (err) {
      console.warn(`Targeted sync error for ${table}:`, err);
    }
  };

  // Always point refs to latest sync functions so interval/focus listeners never capture stale closures
  const syncWithDatabaseRef = useRef(syncWithDatabase);
  syncWithDatabaseRef.current = syncWithDatabase;
  const syncTableRef = useRef(syncTable);
  syncTableRef.current = syncTable;

  useEffect(() => {
    loadData();

    // 1. Supabase Realtime Subscription (no-op in Cloudflare mode)
    const unsubscribe = subscribeToDatabaseChanges((table) => {
      syncTableRef.current(table);
    });

    // 2. Cross-device polling every 60 seconds when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncWithDatabaseRef.current(true);
      }
    }, 60000);

    // 3. Sync immediately on focus or returning to tab (debounced to 15s)
    let lastFocusSync = Date.now();
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastFocusSync > 15000) {
        lastFocusSync = Date.now();
        syncWithDatabaseRef.current(true);
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  // Update current user in storage when changed (anchored by canonical Teacher_ID)
  const handleSetCurrentUser = (teacher: Teacher) => {
    setIsLoading(true);
    const sanitized = sanitizeTeacherForClient(teacher);
    currentTeacherRef.current = sanitized;
    setCurrentTeacher(sanitized);
    if (isTeacherExecutive(sanitized)) {
      setMainView('executive');
    } else {
      setMainView('plans');
    }
    try {
      localStorage.setItem('lp_current_user_id', sanitized.Teacher_ID);
      localStorage.setItem('lp_current_user_email', sanitized.Email);
    } catch {}
    setIsLoginModalOpen(false);
    Promise.all([
      syncWithDatabase(true, sanitized),
      new Promise((resolve) => setTimeout(resolve, 450)),
    ]).finally(() => {
      setIsLoading(false);
    });
  };

  const handleLogout = () => {
    setIsLoading(true);
    localStorage.removeItem('lp_current_user_id');
    localStorage.removeItem('lp_current_user_email');
    currentTeacherRef.current = null;
    setCurrentTeacher(null);
    setPlans([]);
    setTimeout(() => {
      setIsLoading(false);
    }, 350);
  };

  // Password update enforcement (auto-updates in DB)
  const handlePasswordChanged = async (updated: Teacher) => {
    if (updated.Pass) {
      updateServerTeacherPassword(updated.Teacher_ID, updated.Pass).catch(() => {});
    }
    const res = await updateTeacherRecord(updated);
    const sanitizedUpdated: Teacher = {
      ...sanitizeTeacherForClient(updated),
      has_changed_password: true,
    };
    const updatedKey = String(updated.Teacher_ID || '').trim().toLowerCase();
    setTeachers((prev) =>
      prev.map((t) =>
        String(t.Teacher_ID || '').trim().toLowerCase() === updatedKey ? sanitizedUpdated : t
      )
    );
    currentTeacherRef.current = sanitizedUpdated;
    setCurrentTeacher(sanitizedUpdated);

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
    const sanitizedUpdated = sanitizeTeacherForClient(updated);
    const updatedKey = String(updated.Teacher_ID || '').trim().toLowerCase();

    setTeachers((prev) =>
      prev.map((t) =>
        String(t.Teacher_ID || '').trim().toLowerCase() === updatedKey ? sanitizedUpdated : t
      )
    );
    if (
      currentTeacher &&
      String(currentTeacher.Teacher_ID || '').trim().toLowerCase() === updatedKey
    ) {
      currentTeacherRef.current = sanitizedUpdated;
      setCurrentTeacher(sanitizedUpdated);
      try {
        localStorage.setItem('lp_current_user_id', sanitizedUpdated.Teacher_ID);
        localStorage.setItem('lp_current_user_email', sanitizedUpdated.Email);
      } catch {}
    }
    // Also sync teacher name in existing lesson plans if name/area changed
    setPlans((prev) =>
      prev.map((p) =>
        isPlanOwnedByTeacher(p, sanitizedUpdated)
          ? {
              ...p,
              teacher_name: sanitizedUpdated.Name,
              teacher_photo: sanitizedUpdated.photo,
              learning_area: sanitizedUpdated.Learning_Area,
            }
          : p
      )
    );

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
    const rawList = Array.isArray(newPlanOrPlans) ? newPlanOrPlans : [newPlanOrPlans];
    if (rawList.length === 0) return { success: true, isSupabase: false };

    // Automatically resolve and attach the document-specific workflow and total stages
    const plansList = rawList.map((p) => {
      if (!p.workflow_id || !p.total_stages) {
        return assignWorkflowToPlan(p, workflows, teachers, departments, branches);
      }
      return p;
    });

    let lastRes: any = { success: true, isSupabase: false };
    for (const plan of plansList) {
      lastRes = await savePlanRecord(plan);
      // Option B2: Sync Google Drive Editor permissions strictly to submitter + assigned reviewer emails
      syncLessonPlanDriveEditors(plan, teachers);
    }
    setPlans((prev) => [...plansList, ...prev]);

    // Celebrate successful submission with school-themed confetti
    triggerSchoolCelebration('full');

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

  const handleSaveReview = async (updatedPlan: LessonPlan) => {
    const res = await savePlanRecord(updatedPlan);
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );

    // Option B2: Sync Google Drive Editor permissions when stage advances or reviewer changes
    syncLessonPlanDriveEditors(updatedPlan, teachers);

    // Sync AssignmentSubmission if this plan originated from dynamic assignment submission
    try {
      const savedSubs = getSavedSubmissions();
      const targetSub = savedSubs.find((s) => s.id === updatedPlan.id);
      if (targetSub) {
        const updatedSub: AssignmentSubmission = {
          ...targetSub,
          status: updatedPlan.status,
          reviewed_by: updatedPlan.reviewed_by || currentTeacher?.Teacher_ID || null,
          reviewer_name: updatedPlan.reviewer_name || currentTeacher?.Name || null,
          reviewed_at: updatedPlan.reviewed_at || new Date().toISOString(),
          review_comment: updatedPlan.review_comment || null,
          admin_notes: updatedPlan.admin_notes || null,
        };
        await saveAssignmentSubmissionRecord(updatedSub);
      }
    } catch (e) {
      console.warn('[Sync Assignment Submission Error]', e);
    }

    // If plan was approved or has top score, fire a subtle celebration
    if (updatedPlan.status === 'approved' || updatedPlan.status === 'passed' || (typeof updatedPlan.total_score === 'number' && updatedPlan.total_score >= 90)) {
      triggerSchoolCelebration('light');
    }

    // Auto archive copy into Google Drive "ตรวจแล้ว/ประเภทเอกสาร_สาขาวิชา"
    if (updatedPlan.status === 'approved' || updatedPlan.status === 'passed') {
      const planTeacher = teachers.find((t) => t.Teacher_ID === updatedPlan.teacher_id);
      const teacherBranch =
        updatedPlan.branch ||
        planTeacher?.branch ||
        planTeacher?.Learning_Area ||
        updatedPlan.learning_area ||
        'ทั่วไป';

      archiveReviewedPlanToGoogleDrive({
        planId: updatedPlan.id,
        planTitle: updatedPlan.plan_title || updatedPlan.subject_name || 'เอกสารวิชาการ',
        planType: updatedPlan.plan_type,
        branch: teacherBranch,
        learningArea: updatedPlan.learning_area || planTeacher?.Learning_Area,
        teacherName: updatedPlan.teacher_name || planTeacher?.Name || 'คุณครู',
        teacherId: updatedPlan.teacher_id,
        fileUrl: updatedPlan.file_url,
        fileName: updatedPlan.file_name,
        reviewerName: currentTeacher?.Name,
        reviewerId: currentTeacher?.Teacher_ID,
        academicYear: updatedPlan.academic_year || activeTerm.academic_year,
        semester: updatedPlan.semester || activeTerm.semester,
      }).then((archiveRes) => {
        if (archiveRes.success) {
          setToastNotice({
            type: 'success',
            message: `✓ บันทึกผลการตรวจและสำเนาไฟล์เข้า Google Drive เรียบร้อยแล้ว`,
            details: `จัดเก็บในโฟลเดอร์ "${archiveRes.folderPath}" เรียบร้อยแล้ว`,
          });
        } else if (archiveRes.isLegacyScript) {
          setToastNotice({
            type: 'info',
            message: `✓ บันทึกผลการตรวจเรียบร้อยแล้ว`,
            details: `(หากต้องการให้ทำสำเนาไฟล์เข้า Google Drive อัตโนมัติ กรุณาอัปเดตโค้ดสคริปต์ในเมนู "ตั้งค่า Google Drive (Auto)")`,
          });
        } else {
          console.warn('[GoogleDrive Archive Notice]', archiveRes.error);
        }
      });
    }

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
    // 1. Immediately record in deleted plan IDs & cloud storage to prevent any resurrection
    recordDeletedPlanId(planId);

    // 2. Immediately purge from React state for instant UI responsiveness
    setPlans((prev) => prev.filter((p) => p.id !== planId));

    // 3. Check if the plan has a Google Drive file to move to Trash
    const targetPlan = plans.find((p) => p.id === planId);
    let driveTrashNotice = '';
    if (targetPlan && targetPlan.file_url) {
      try {
        const trashRes = await trashGoogleDriveFile(targetPlan.file_url);
        if (trashRes.success) {
          driveTrashNotice = ' และย้ายไฟล์ PDF ใน Google Drive ลงถังขยะ (Trash) อัตโนมัติเรียบร้อยแล้ว (กู้คืนได้ใน 30 วัน)';
        }
      } catch {
        // Silently proceed so document deletion in the app and DB is never blocked
      }
    }

    const res = await deletePlanRecord(planId);

    setToastNotice({
      type: 'success',
      message: 'ลบเอกสารวิชาการเรียบร้อยแล้ว',
      details:
        (!isAdmin
          ? 'ระบบได้ลบข้อมูลออกจากระบบเรียบร้อยแล้ว'
          : res.isSupabase
          ? 'ระบบได้ลบข้อมูลออกจากฐานข้อมูล Cloudflare D1 (ตาราง lesson_plans และ submissions) อัตโนมัติแล้ว'
          : 'ลบออกจากเครื่องเรียบร้อยแล้ว') + driveTrashNotice,
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

    // Option B2: Sync Google Drive Editor permissions on any resubmitted/newly attached Drive links
    syncLessonPlanDriveEditors(updatedPlan, teachers);

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

  // Save seasonal theme configuration (Admin)
  const handleSaveSeasonalThemeConfig = async (newConfig: SeasonalThemeConfig) => {
    setSeasonalThemeConfig(newConfig);
    saveLocalSeasonalThemeConfig(newConfig);
    if (isSeasonalMuted && newConfig.mode === 'manual') {
      setIsSeasonalMuted(false);
      setUserSeasonalMuted(false);
    }
    const dbRes = await saveSystemSetting('seasonal_theme_config', newConfig);
    const resolved = resolveActiveSeasonalTheme(newConfig);
    setToastNotice({
      type: 'success',
      message:
        newConfig.mode === 'off'
          ? 'ปิดธีมตามเทศกาลแล้ว (ใช้ธีมมาตรฐานโรงเรียน)'
          : newConfig.mode === 'manual'
          ? `เปลี่ยนธีมเป็น "${resolved.name}" แล้ว!`
          : 'เปิดโหมดเปลี่ยนธีมตามเทศกาลอัตโนมัติแล้ว!',
      details: dbRes.isSupabase
        ? 'ซิงค์การตั้งค่าธีมไปยังอุปกรณ์ของครูทุกคนในโรงเรียนเรียบร้อย'
        : 'บันทึกการตั้งค่าธีมในเบราว์เซอร์เรียบร้อย',
    });
  };

  // Save All Documents access permissions (Admin)
  const handleSaveAllDocsAccessConfig = async (newConfig: AllDocumentsAccessConfig) => {
    setAllDocsAccessConfig(newConfig);
    try {
      localStorage.setItem('school_all_docs_access_config', JSON.stringify(newConfig));
    } catch {}
    const dbRes = await saveSystemSetting('school_all_docs_access_config', newConfig);
    if (dbRes.success && dbRes.isSupabase) {
      setToastNotice({
        type: 'success',
        message: 'บันทึกสิทธิ์การดูเอกสารทั้งหมดสำเร็จ!',
        details: newConfig.allow_all_teachers
          ? 'เปิดให้ครูทุกคนในโรงเรียนดูเอกสารทั้งหมดได้'
          : `จำกัดสิทธิ์เฉพาะครู ${newConfig.allowed_teacher_ids.length} ท่าน (และผู้ดูแลระบบ)`,
      });
    } else {
      setToastNotice({
        type: 'success',
        message: 'บันทึกการตั้งค่าสิทธิ์เรียบร้อยแล้ว',
        details: newConfig.allow_all_teachers
          ? 'เปิดให้ครูทุกคนดูเอกสารทั้งหมดในระบบได้'
          : `อนุญาตเฉพาะครู ${newConfig.allowed_teacher_ids.length} ท่าน`,
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

    const isNowApproved = newStatus === 'approved' || newStatus === 'passed';
    const nowIso = new Date().toISOString();

    const updatedPlan: LessonPlan = {
      ...targetPlan,
      status: newStatus,
      is_late: isLateOverride !== undefined ? isLateOverride : targetPlan.is_late,
      admin_notes: adminNotes !== undefined ? adminNotes : targetPlan.admin_notes,
      reviewed_by: isNowApproved ? (targetPlan.reviewed_by || currentTeacher?.Teacher_ID || 'admin') : targetPlan.reviewed_by,
      reviewer_name: isNowApproved ? (targetPlan.reviewer_name || currentTeacher?.Name || 'ผู้ดูแลระบบ') : targetPlan.reviewer_name,
      reviewed_at: isNowApproved ? (targetPlan.reviewed_at || nowIso) : targetPlan.reviewed_at,
    };

    setPlans((prev) => prev.map((p) => (p.id === planId ? updatedPlan : p)));
    await savePlanRecord(updatedPlan);

    // Also update dynamic assignment submission if applicable
    try {
      const savedSubs = getSavedSubmissions();
      const targetSub = savedSubs.find((s) => s.id === planId);
      if (targetSub) {
        const updatedSub: AssignmentSubmission = {
          ...targetSub,
          status: newStatus,
          is_late: isLateOverride !== undefined ? isLateOverride : targetSub.is_late,
          admin_notes: adminNotes !== undefined ? adminNotes : targetSub.admin_notes,
          reviewed_by: isNowApproved ? (targetSub.reviewed_by || currentTeacher?.Teacher_ID || 'admin') : targetSub.reviewed_by,
          reviewer_name: isNowApproved ? (targetSub.reviewer_name || currentTeacher?.Name || 'ผู้ดูแลระบบ') : targetSub.reviewer_name,
          reviewed_at: isNowApproved ? (targetSub.reviewed_at || nowIso) : targetSub.reviewed_at,
        };
        await saveAssignmentSubmissionRecord(updatedSub);
      }
    } catch {
      // ignore
    }

    if (isNowApproved) {
      triggerSchoolCelebration('light');

      // Auto archive copy into Google Drive
      const planTeacher = teachers.find((t) => t.Teacher_ID === updatedPlan.teacher_id);
      const teacherBranch =
        updatedPlan.branch ||
        planTeacher?.branch ||
        planTeacher?.Learning_Area ||
        updatedPlan.learning_area ||
        'ทั่วไป';

      archiveReviewedPlanToGoogleDrive({
        planId: updatedPlan.id,
        planTitle: updatedPlan.plan_title || updatedPlan.subject_name || 'เอกสารวิชาการ',
        planType: updatedPlan.plan_type,
        branch: teacherBranch,
        learningArea: updatedPlan.learning_area || planTeacher?.Learning_Area,
        teacherName: updatedPlan.teacher_name || planTeacher?.Name || 'คุณครู',
        teacherId: updatedPlan.teacher_id,
        fileUrl: updatedPlan.file_url,
        fileName: updatedPlan.file_name,
        reviewerName: currentTeacher?.Name,
        reviewerId: currentTeacher?.Teacher_ID,
        academicYear: updatedPlan.academic_year || activeTerm.academic_year,
        semester: updatedPlan.semester || activeTerm.semester,
      }).catch((err) => {
        console.warn('[Quick Status GoogleDrive Archive Error]', err);
      });
    }

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

    setToastNotice({
      type: 'info',
      message: nextLate ? 'ทำเครื่องหมายเป็น "ส่งช้า" แล้ว' : 'ทำเครื่องหมายเป็น "ส่งตรงเวลา" แล้ว',
      details: `แผนรหัส ${plan.id} (${plan.subject_code})`,
    });
  };

  // Must force password change if current logged-in teacher has default password
  const mustForceChangePassword = Boolean(
    currentTeacher &&
      !isTeacherAdmin(currentTeacher) &&
      (currentTeacher.Pass === '12345' || currentTeacher.has_changed_password === false)
  );
  const isAdmin = isTeacherAdmin(currentTeacher);

  // Prevent unauthorized teachers from accessing all school documents
  useEffect(() => {
    if (!isAdmin && !canViewAllDocs && viewTab === 'school_all') {
      setViewTab('all');
    }
  }, [isAdmin, canViewAllDocs, viewTab]);

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

  // Active Academic Year & Semester plans filter: web UI always shows only active term plans
  // Also sanitize stale admin assignments on pending plans whose current stage does not select that admin via 'individual'
  const activeTermPlans = useMemo(() => {
    const termPlans = plans.filter((p) => p.status !== 'deleted' && isPlanInActiveTerm(p, activeTerm));
    return sanitizeStaleAdminAssignments(termPlans, workflows, teachers, departments, branches).updatedPlans;
  }, [plans, activeTerm, workflows, teachers, departments, branches]);

  const pendingAssignmentsCount = useMemo(() => {
    if (!currentTeacher || isAdmin) return 0;
    const activeConfigs = (deadlineConfigs || []).filter((c) => c.is_active !== false);
    const normalize = (val?: string) => String(val || '').trim().toLowerCase();
    const currentTeacherId = normalize(currentTeacher.Teacher_ID);
    const currentTeacherName = normalize(currentTeacher.Name);

    const myPlans = activeTermPlans.filter((p) => {
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
  }, [currentTeacher, isAdmin, deadlineConfigs, activeTermPlans]);

  const handleScrollToAssignments = (filter?: 'pending' | 'all' | React.MouseEvent) => {
    // Default to 'all' so teacher's submitted assignments don't disappear when clicking notification
    const filterType = filter === 'pending' ? 'pending' : 'all';
    window.dispatchEvent(new CustomEvent('filter-assignments', { detail: { filter: filterType } }));
    const el = document.getElementById('assigned-documents-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper to check if two teacher identities match (anchors on canonical Teacher_ID, supports email alias)
  const isSameTeacherIdOrName = (tId?: string, tName?: string, teacher?: Teacher | null) => {
    return isSameTeacherIdentity(tId, tName, teacher);
  };

  // Helper to check if a teacher has already reviewed this plan
  const hasTeacherReviewedPlan = (plan: LessonPlan, teacher: Teacher | null): boolean => {
    if (!teacher) return false;
    // 1. Directly recorded reviewer on the plan
    if (isSameTeacherIdOrName(plan.reviewed_by, plan.reviewer_name, teacher)) {
      return true;
    }
    // 2. Any stage review submitted by this teacher
    if (
      plan.stage_reviews &&
      plan.stage_reviews.some((r) => isSameTeacherIdOrName(r.reviewer_id, r.reviewer_name, teacher))
    ) {
      return true;
    }
    return false;
  };

  // Helper to check if plan review has reached completion/revision state
  const isPlanReviewCompleted = (plan: LessonPlan): boolean => {
    const s = String(plan.status || '').toLowerCase().trim();
    return (
      s === 'approved' ||
      s === 'passed' ||
      s === 'needs_revision' ||
      s === 'rejected' ||
      s === 'completed'
    );
  };

  // Helper to check if a plan is currently pending review by this teacher
  const isPlanPendingForMe = (
    plan: LessonPlan,
    teacher: Teacher | null,
    allWorkflows: ReviewWorkflowConfig[],
    allTeachers: Teacher[],
    depts: DepartmentConfig[]
  ): boolean => {
    if (!teacher || plan.status === 'deleted') return false;

    // 1. If the plan has already completed review or returned for revision, it MUST NOT appear as pending!
    if (isPlanReviewCompleted(plan)) {
      return false;
    }

    // 2. If this teacher has already submitted a review for this plan, they are done with this review!
    if (hasTeacherReviewedPlan(plan, teacher)) {
      return false;
    }

    // 3. Check if this is the teacher's own plan
    const isOwner = isSameTeacherIdOrName(plan.teacher_id, plan.teacher_name, teacher);
    if (isOwner) {
      const isDirectlyAssigned = isSameTeacherIdOrName(
        plan.assigned_reviewer_id,
        plan.assigned_reviewer_name,
        teacher
      );

      // A submitter cannot peer-review their own plan unless an admin explicitly forced direct assignment
      if (!isDirectlyAssigned) {
        return false;
      }
    }

    // 4. Resolve the exact workflow specifically designated for THIS plan's document type
    const planWorkflow = getWorkflowForPlan(plan, allWorkflows);
    const currentStageOrder = plan.current_stage_order || 1;
    const stage = planWorkflow?.stages?.find((s) => s.order === currentStageOrder);

    // Strict Admin Rule: Admins (admin01, admin02, admin03) are ONLY allowed to review a stage
    // when that stage uses 'individual' selection AND explicitly selects that admin.
    if (isTeacherAdmin(teacher) && !isAdminAllowedOnStage(stage, teacher)) {
      return false;
    }

    // 5. Check direct assignment (ignoring stale admin assignments when current stage does not allow that admin)
    const isDirectlyAssigned = isSameTeacherIdOrName(
      plan.assigned_reviewer_id,
      plan.assigned_reviewer_name,
      teacher
    );
    const assignedTeacherObj = plan.assigned_reviewer_id
      ? allTeachers.find((t) =>
          isSameTeacherIdOrName(plan.assigned_reviewer_id, plan.assigned_reviewer_name, t)
        )
      : undefined;
    const isStaleAdminAssignment =
      Boolean(plan.assigned_reviewer_id) &&
      ((assignedTeacherObj && isTeacherAdmin(assignedTeacherObj) && !isAdminAllowedOnStage(stage, assignedTeacherObj)) ||
        (!assignedTeacherObj &&
          ['admin01', 'admin02', 'admin03'].includes(String(plan.assigned_reviewer_id || '').trim().toLowerCase()) &&
          !(stage?.reviewer_selection_type === 'individual' &&
            (stage.assigned_teacher_ids || []).some(
              (id) => String(id || '').trim().toLowerCase() === String(plan.assigned_reviewer_id || '').trim().toLowerCase()
            ))));

    // If a valid assigned reviewer has been set specifically for this plan, only they should see it as pending
    if (plan.assigned_reviewer_id && !isStaleAdminAssignment) {
      return isDirectlyAssigned;
    }

    if (!stage) return false;

    const candidates = resolveReviewersForStage(stage, plan, allTeachers, depts, branches);
    if (stage.scope_mode === 'random_all' || stage.scope_mode === 'random_cross_only') {
      // Deterministically select exactly ONE reviewer from candidates based on plan.id
      // to guarantee NO TWO TEACHERS ever see the same plan simultaneously in their pending queue
      if (candidates.length > 0) {
        let hash = 0;
        const seed = plan.id || plan.plan_title || 'plan_seed';
        for (let i = 0; i < seed.length; i++) {
          hash = (hash << 5) - hash + seed.charCodeAt(i);
          hash |= 0;
        }
        const picked = candidates[Math.abs(hash) % candidates.length];
        return isSameTeacherIdOrName(picked.Teacher_ID, picked.Name, teacher);
      }
      return false;
    }

    const isEligible = candidates.some((c) =>
      isSameTeacherIdOrName(c.Teacher_ID, c.Name, teacher)
    );

    if (isEligible) return true;

    // Direct check for branch head or dept head on their own plan when stage role matches (non-admins only)
    if (isOwner && !isTeacherAdmin(teacher)) {
      const isBranchHead = isTeacherBranchHeadOfPlan(teacher, plan, branches);
      const isBranchStage =
        stage.assigned_role === 'submitter_branch_head' ||
        stage.assigned_role === 'all_branch_heads' ||
        stage.title?.toLowerCase().includes('สาขา');
      if (isBranchHead && isBranchStage) return true;

      const isDeptHead = isTeacherDeptHeadOfPlan(teacher, plan, depts);
      const isDeptStage =
        stage.assigned_role === 'submitter_department_head' ||
        stage.assigned_role === 'all_department_heads' ||
        stage.title?.toLowerCase().includes('กลุ่มสาระ');
      if (isDeptHead && isDeptStage) return true;
    }

    return false;
  };

  // Helper to check if a plan was reviewed by this teacher or finished
  const isPlanCompletedForMe = (
    plan: LessonPlan,
    teacher: Teacher | null,
    allWorkflows: ReviewWorkflowConfig[],
    allTeachers: Teacher[],
    depts: DepartmentConfig[]
  ): boolean => {
    if (!teacher || plan.status === 'deleted') return false;

    // 1. If this teacher personally reviewed this plan
    if (hasTeacherReviewedPlan(plan, teacher)) {
      return true;
    }

    // 2. If this plan has completed review and this teacher was an eligible/assigned reviewer
    if (isPlanReviewCompleted(plan)) {
      const planWorkflow = getWorkflowForPlan(plan, allWorkflows);
      if (isTeacherAdmin(teacher)) {
        return (planWorkflow?.stages || []).some((stg) => isAdminAllowedOnStage(stg, teacher));
      }
      const isDirectlyAssigned = isSameTeacherIdOrName(
        plan.assigned_reviewer_id,
        plan.assigned_reviewer_name,
        teacher
      );
      if (plan.assigned_reviewer_id) {
        return isDirectlyAssigned;
      }

      const isEligibleAnyStage = (planWorkflow?.stages || []).some((stg) =>
        resolveReviewersForStage(stg, plan, allTeachers, depts, branches).some((c) =>
          isSameTeacherIdOrName(c.Teacher_ID, c.Name, teacher)
        )
      );
      if (isEligibleAnyStage) {
        return true;
      }

      const isOwner = isSameTeacherIdOrName(plan.teacher_id, plan.teacher_name, teacher);
      if (isOwner) {
        if (isTeacherBranchHeadOfPlan(teacher, plan, branches) || isTeacherDeptHeadOfPlan(teacher, plan, depts)) {
          return true;
        }
      }
    }

    return false;
  };

  // Helper to accurately match document types against category or specific name
  const matchesDocumentTypeFilter = (plan: LessonPlan, filter: string): boolean => {
    if (!filter || filter === 'all') return true;

    const rawType = String(plan.plan_type || plan.plan_title || '').trim();
    if (!rawType) return false;

    const lowerType = rawType.toLowerCase();
    const lowerFilter = filter.trim().toLowerCase();

    // 1. Direct match with exact filter string or plan type
    if (lowerType === lowerFilter) return true;
    if (plan.plan_type === filter) return true;

    // Check if filter matches a deadlineConfig
    const matchingConfig = deadlineConfigs.find(
      (c) => c.id === filter || c.name.toLowerCase() === lowerFilter
    );
    if (matchingConfig && isPlanMatchingAssignment(plan, matchingConfig)) {
      return true;
    }

    // Check custom prefix match
    if (filter.startsWith('custom_')) {
      const customName = filter.replace('custom_', '').trim().toLowerCase();
      if (lowerType === customName || (plan.plan_title || '').toLowerCase().includes(customName)) {
        return true;
      }
    }

    // 2. Classify plan into canonical category
    const meta = classifyDocumentType(plan.plan_type || plan.plan_title);
    const planCatKey = meta.key;

    // Filter by canonical category key or Thai keyword
    if (filter === 'summary_plan' || filter === 'type_summary' || lowerFilter.includes('ย่อ')) {
      return (
        planCatKey === 'summary_plan' ||
        lowerType.includes('ย่อ') ||
        lowerType.includes('summary')
      );
    }
    if (filter === 'full_plan' || filter === 'type_full' || lowerFilter.includes('สมบูรณ์')) {
      return (
        planCatKey === 'full_plan' ||
        lowerType.includes('สมบูรณ์') ||
        lowerType.includes('full') ||
        lowerType.includes('active learning')
      );
    }
    if (
      filter === 'classroom_research' ||
      filter.includes('research') ||
      lowerFilter.includes('วิจัย')
    ) {
      return (
        planCatKey === 'classroom_research' ||
        lowerType.includes('วิจัย') ||
        lowerType.includes('research') ||
        lowerType.includes('car')
      );
    }
    if (filter === 'syllabus' || lowerFilter.includes('กำหนดการ') || lowerFilter.includes('โครงการสอน')) {
      return (
        planCatKey === 'syllabus' ||
        lowerType.includes('กำหนดการ') ||
        lowerType.includes('โครงการสอน') ||
        lowerType.includes('syllabus')
      );
    }
    if (filter === 'post_teaching' || lowerFilter.includes('บันทึกหลังสอน')) {
      return (
        planCatKey === 'post_teaching' ||
        lowerType.includes('บันทึกหลังสอน') ||
        lowerType.includes('บันทึกหลังการสอน')
      );
    }
    if (filter === 'general_academic' || lowerFilter.includes('ทั่วไป') || lowerFilter.includes('วิชาการ')) {
      return (
        planCatKey === 'general_academic' ||
        (planCatKey !== 'summary_plan' &&
          planCatKey !== 'full_plan' &&
          planCatKey !== 'classroom_research')
      );
    }

    // Direct metadata key match
    if (planCatKey === lowerFilter) return true;

    // Substring match only if filter is descriptive
    if (lowerType.includes(lowerFilter)) return true;

    return false;
  };

  // Helper to accurately match grade level (ม.1 - ม.6)
  const matchesGradeFilter = (planGrade?: string, filter?: string): boolean => {
    if (!filter || filter === 'all') return true;
    if (!planGrade) return false;
    const pg = planGrade.trim().toLowerCase();
    const f = filter.trim().toLowerCase();
    const gradeNum = f.replace(/[^0-9]/g, '');
    if (gradeNum) {
      if (
        pg.includes(`ม.${gradeNum}`) ||
        pg.includes(`ม. ${gradeNum}`) ||
        pg.includes(`ปีที่ ${gradeNum}`) ||
        pg.includes(`ปีที่${gradeNum}`) ||
        pg.includes(`มัธยมศึกษาปีที่ ${gradeNum}`) ||
        pg.includes(`ชั้นมัธยมศึกษาปีที่ ${gradeNum}`) ||
        pg.includes(`ม${gradeNum}/`) ||
        pg.includes(`ม.${gradeNum}/`) ||
        pg === `ม.${gradeNum}` ||
        pg === `ม${gradeNum}` ||
        pg.startsWith(`ม.${gradeNum} `) ||
        pg.startsWith(`ม.${gradeNum}/`)
      ) {
        return true;
      }
    }
    return pg.includes(f);
  };

  // Review queues memoization
  const { assignedPendingPlans, assignedCompletedPlans, allAssignedReviewPlans } = useMemo(() => {
    if (!currentTeacher) {
      return { assignedPendingPlans: [], assignedCompletedPlans: [], allAssignedReviewPlans: [] };
    }
    const pendingList: LessonPlan[] = [];
    const completedList: LessonPlan[] = [];
    const allList: LessonPlan[] = [];

    for (const p of activeTermPlans) {
      if (p.status === 'deleted') continue;

      const isPending = isPlanPendingForMe(p, currentTeacher, workflows, teachers, departments);
      const isCompleted = isPlanCompletedForMe(p, currentTeacher, workflows, teachers, departments);

      if (isPending) {
        pendingList.push(p);
      }
      if (isCompleted) {
        completedList.push(p);
      }
      if (isPending || isCompleted) {
        allList.push(p);
      }
    }

    return {
      assignedPendingPlans: pendingList,
      assignedCompletedPlans: completedList,
      allAssignedReviewPlans: allList,
    };
  }, [activeTermPlans, currentTeacher, workflows, teachers, departments]);

  const assignedPendingCount = assignedPendingPlans.length;
  const assignedCompletedCount = assignedCompletedPlans.length;
  const assignedToMeCount = assignedPendingCount;

  // Contextual plans for category counts so buttons reflect the active tab
  const contextPlansForCategoryCounts = useMemo(() => {
    if (viewTab === 'assigned_to_me') {
      if (assignedReviewSubTab === 'pending') return assignedPendingPlans;
      if (assignedReviewSubTab === 'completed') return assignedCompletedPlans;
      return allAssignedReviewPlans;
    }
    if (isAdmin || (canViewAllDocs && viewTab === 'school_all')) {
      if (areaFilter) return activeTermPlans.filter((p) => p.learning_area === areaFilter && p.status !== 'deleted');
      return activeTermPlans.filter((p) => p.status !== 'deleted');
    }
    return activeTermPlans.filter(
      (p) => isSameTeacherIdOrName(p.teacher_id, p.teacher_name, currentTeacher) && p.status !== 'deleted'
    );
  }, [
    viewTab,
    assignedReviewSubTab,
    assignedPendingPlans,
    assignedCompletedPlans,
    allAssignedReviewPlans,
    isAdmin,
    canViewAllDocs,
    areaFilter,
    activeTermPlans,
    currentTeacher,
  ]);

  // Dynamic list of custom document categories from deadlineConfigs and existing plans
  const customFilterCategories = useMemo(() => {
    interface FilterCat {
      id: string;
      label: string;
      short: string;
      count: number;
    }
    const list: FilterCat[] = [];

    // Custom assignments from deadlineConfigs
    if (deadlineConfigs && deadlineConfigs.length > 0) {
      deadlineConfigs.forEach((cfg) => {
        const lowerId = (cfg.id || '').toLowerCase();
        const lowerName = (cfg.name || '').toLowerCase();
        if (
          lowerId === 'type_summary' ||
          lowerId === 'type_full' ||
          lowerId.includes('classroom_research') ||
          lowerName.includes('ฉบับย่อ') ||
          lowerName.includes('ฉบับสมบูรณ์') ||
          lowerName.includes('วิจัยในชั้นเรียน')
        ) {
          return;
        }

        const count = contextPlansForCategoryCounts.filter((p) => isPlanMatchingAssignment(p, cfg)).length;
        list.push({
          id: cfg.id,
          label: cfg.name,
          short: cfg.name.length > 18 ? cfg.name.slice(0, 16) + '...' : cfg.name,
          count,
        });
      });
    }

    // Custom distinct plan types from existing plans
    const customTypes = new Set<string>();
    contextPlansForCategoryCounts.forEach((p) => {
      const pType = (p.plan_type || '').trim();
      if (!pType) return;
      const meta = classifyDocumentType(pType);
      if (meta.key === 'summary_plan' || meta.key === 'full_plan' || meta.key === 'classroom_research') {
        return;
      }
      const matched = list.some((c) => {
        const cfg = deadlineConfigs.find((dc) => dc.id === c.id);
        return cfg && isPlanMatchingAssignment(p, cfg);
      });
      if (!matched) {
        customTypes.add(pType);
      }
    });

    customTypes.forEach((pType) => {
      const count = contextPlansForCategoryCounts.filter((p) => (p.plan_type || '').trim() === pType).length;
      list.push({
        id: `custom_${pType}`,
        label: pType,
        short: pType.length > 18 ? pType.slice(0, 16) + '...' : pType,
        count,
      });
    });

    return list;
  }, [deadlineConfigs, contextPlansForCategoryCounts]);

  const docCategoryCounts = useMemo(() => {
    let summary = 0;
    let full = 0;
    let research = 0;
    let general = 0;
    for (const p of contextPlansForCategoryCounts) {
      const meta = classifyDocumentType(p.plan_type || p.plan_title);
      if (meta.key === 'summary_plan') summary++;
      else if (meta.key === 'full_plan') full++;
      else if (meta.key === 'classroom_research') research++;
      else {
        const matchedCustom = customFilterCategories.some((c) => {
          const cfg = deadlineConfigs.find((dc) => dc.id === c.id);
          if (cfg) return isPlanMatchingAssignment(p, cfg);
          if (c.id.startsWith('custom_')) {
            return (p.plan_type || '').trim() === c.label;
          }
          return false;
        });
        if (!matchedCustom) {
          general++;
        }
      }
    }
    return {
      all: contextPlansForCategoryCounts.length,
      summary,
      full,
      research,
      general,
    };
  }, [contextPlansForCategoryCounts, customFilterCategories, deadlineConfigs]);

  // Counts for each grade level (ม.1 - ม.6)
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: contextPlansForCategoryCounts.length,
      'ม.1': 0,
      'ม.2': 0,
      'ม.3': 0,
      'ม.4': 0,
      'ม.5': 0,
      'ม.6': 0,
    };
    for (const p of contextPlansForCategoryCounts) {
      (['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'] as const).forEach((g) => {
        if (matchesGradeFilter(p.grade_level, g)) {
          counts[g]++;
        }
      });
    }
    return counts;
  }, [contextPlansForCategoryCounts]);

  // Filtered plans logic (memoized to eliminate redundant computations on every keystroke/render)
  const filteredPlans = useMemo(() => {
    return activeTermPlans.filter((plan) => {
      if (plan.status === 'deleted') return false;

      // 1. Tab-level filter
      if (viewTab === 'assigned_to_me') {
        if (!currentTeacher) return false;

        if (assignedReviewSubTab === 'pending') {
          if (!isPlanPendingForMe(plan, currentTeacher, workflows, teachers, departments)) {
            return false;
          }
        } else if (assignedReviewSubTab === 'completed') {
          if (!isPlanCompletedForMe(plan, currentTeacher, workflows, teachers, departments)) {
            return false;
          }
        } else {
          const isPending = isPlanPendingForMe(plan, currentTeacher, workflows, teachers, departments);
          const isCompleted = isPlanCompletedForMe(plan, currentTeacher, workflows, teachers, departments);
          if (!isPending && !isCompleted) {
            return false;
          }
        }
      } else if (!isAdmin && (!canViewAllDocs || viewTab !== 'school_all')) {
        // Regular teacher's personal view
        const isOwner = isSameTeacherIdOrName(plan.teacher_id, plan.teacher_name, currentTeacher);
        if (!isOwner) {
          return false;
        }

        // Waiting for review tab: show unreviewed plans
        if (viewTab === 'pending_review' && isPlanReviewCompleted(plan)) {
          return false;
        }
        if (viewTab === 'approved' && plan.status !== 'approved' && plan.status !== 'passed') {
          return false;
        }
        if (viewTab === 'needs_revision' && plan.status !== 'needs_revision') {
          return false;
        }
        if ((viewTab as any) === 'late' && !plan.is_late) {
          return false;
        }
      } else {
        // Admin filters
        if (statusFilter !== 'all') {
          if (statusFilter === 'late') {
            if (!plan.is_late) return false;
          } else if (plan.status !== statusFilter) {
            return false;
          }
        }
        if (areaFilter && plan.learning_area !== areaFilter) {
          return false;
        }
      }

      // 2. Document Type Filter (แยกประเภทเอกสาร)
      if (!matchesDocumentTypeFilter(plan, docTypeFilter)) {
        return false;
      }

      // 3. Grade Level Filter (แยกตามระดับชั้น ม.1 - ม.6)
      if (gradeFilter !== 'all' && !matchesGradeFilter(plan.grade_level, gradeFilter)) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSubject =
          (plan.subject_code || '').toLowerCase().includes(q) ||
          (plan.subject_name || '').toLowerCase().includes(q);
        const matchTitle = (plan.plan_title || '').toLowerCase().includes(q);
        const matchTeacher =
          (plan.teacher_name || '').toLowerCase().includes(q) ||
          (plan.teacher_id || '').toLowerCase().includes(q);
        const matchArea =
          (plan.learning_area || '').toLowerCase().includes(q) ||
          (plan.branch || '').toLowerCase().includes(q);
        const matchNotes = (plan.notes || '').toLowerCase().includes(q);

        if (!isAdmin && viewTab !== 'assigned_to_me') {
          if (!matchSubject && !matchTitle && !matchNotes) return false;
        } else {
          if (!matchSubject && !matchTitle && !matchTeacher && !matchArea && !matchNotes) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    activeTermPlans,
    viewTab,
    assignedReviewSubTab,
    currentTeacher,
    workflows,
    teachers,
    departments,
    isAdmin,
    canViewAllDocs,
    statusFilter,
    areaFilter,
    docTypeFilter,
    gradeFilter,
    searchQuery,
  ]);

  // Check if a plan can be reviewed by current teacher
  // Admins can inspect completed results ('ผลตรวจ'), but only get active 'ตรวจ' on pending plans
  // if they are explicitly selected via 'individual' mode on the current workflow stage.
  const checkCanReviewPlan = (plan: LessonPlan): boolean => {
    const isCompleted = isPlanReviewCompleted(plan);
    if (isAdmin) {
      if (isCompleted) return true;
      return isPlanPendingForMe(plan, currentTeacher, workflows, teachers, departments);
    }
    return (
      isPlanPendingForMe(plan, currentTeacher, workflows, teachers, departments) ||
      isPlanCompletedForMe(plan, currentTeacher, workflows, teachers, departments) ||
      (Boolean(currentTeacher) &&
        isSameTeacherIdOrName(plan.assigned_reviewer_id, plan.assigned_reviewer_name, currentTeacher) &&
        (isTeacherBranchHeadOfPlan(currentTeacher, plan, branches) ||
          isTeacherDeptHeadOfPlan(currentTeacher, plan, departments) ||
          !isPlanOwnedByTeacher(plan, currentTeacher)))
    );
  };

  // Visual Theme helper for each Learning Area
  const getDeptTheme = (deptCode?: string, deptName?: string) => {
    const name = (deptName || '').toLowerCase();
    const code = (deptCode || '').toUpperCase();

    if (code === 'SCI' || name.includes('วิทยาศาสตร์') || name.includes('เทคโนโลยี')) {
      return {
        bg: 'bg-sky-50 text-sky-900 border-sky-200',
        badge: 'bg-sky-600 text-white',
        border: 'border-sky-300',
        accentBar: 'bg-sky-500',
        gradient: 'from-sky-500/10 via-sky-50/40 to-white',
        icon: '🧪',
      };
    }
    if (code === 'MATH' || name.includes('คณิต')) {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-200',
        badge: 'bg-amber-600 text-white',
        border: 'border-amber-300',
        accentBar: 'bg-amber-500',
        gradient: 'from-amber-500/10 via-amber-50/40 to-white',
        icon: '📐',
      };
    }
    if (code === 'THA' || name.includes('ไทย')) {
      return {
        bg: 'bg-rose-50 text-rose-900 border-rose-200',
        badge: 'bg-rose-600 text-white',
        border: 'border-rose-300',
        accentBar: 'bg-rose-500',
        gradient: 'from-rose-500/10 via-rose-50/40 to-white',
        icon: '📖',
      };
    }
    if (code === 'ENG' || name.includes('ต่างประเทศ') || name.includes('อังกฤษ')) {
      return {
        bg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
        badge: 'bg-indigo-600 text-white',
        border: 'border-indigo-300',
        accentBar: 'bg-indigo-500',
        gradient: 'from-indigo-500/10 via-indigo-50/40 to-white',
        icon: '🌐',
      };
    }
    if (code === 'SOC' || name.includes('สังคม')) {
      return {
        bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        badge: 'bg-emerald-600 text-white',
        border: 'border-emerald-300',
        accentBar: 'bg-emerald-500',
        gradient: 'from-emerald-500/10 via-emerald-50/40 to-white',
        icon: '🏛️',
      };
    }
    if (code === 'HPE' || name.includes('สุขศึกษา') || name.includes('พลศึกษา')) {
      return {
        bg: 'bg-orange-50 text-orange-900 border-orange-200',
        badge: 'bg-orange-600 text-white',
        border: 'border-orange-300',
        accentBar: 'bg-orange-500',
        gradient: 'from-orange-500/10 via-orange-50/40 to-white',
        icon: '⚽',
      };
    }
    if (code === 'ART' || name.includes('ศิลปะ')) {
      return {
        bg: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
        badge: 'bg-fuchsia-600 text-white',
        border: 'border-fuchsia-300',
        accentBar: 'bg-fuchsia-500',
        gradient: 'from-fuchsia-500/10 via-fuchsia-50/40 to-white',
        icon: '🎨',
      };
    }
    if (code === 'OCC' || name.includes('การงานอาชีพ')) {
      return {
        bg: 'bg-teal-50 text-teal-900 border-teal-200',
        badge: 'bg-teal-600 text-white',
        border: 'border-teal-300',
        accentBar: 'bg-teal-500',
        gradient: 'from-teal-500/10 via-teal-50/40 to-white',
        icon: '🛠️',
      };
    }
    if (code === 'ACT' || name.includes('กิจกรรม') || name.includes('แนะแนว')) {
      return {
        bg: 'bg-violet-50 text-violet-900 border-violet-200',
        badge: 'bg-violet-600 text-white',
        border: 'border-violet-300',
        accentBar: 'bg-violet-500',
        gradient: 'from-violet-500/10 via-violet-50/40 to-white',
        icon: '🧭',
      };
    }
    return {
      bg: 'bg-slate-50 text-slate-900 border-slate-200',
      badge: 'bg-slate-700 text-white',
      border: 'border-slate-300',
      accentBar: 'bg-slate-500',
      gradient: 'from-slate-500/10 via-slate-50/40 to-white',
      icon: '📁',
    };
  };

  // Groups filtered plans by Learning Area with type counts breakdown
  interface AreaGroup {
    id: string;
    name: string;
    code: string;
    color: string;
    headName?: string;
    plans: LessonPlan[];
    typeCounts: {
      all: number;
      summary: number;
      full: number;
      research: number;
      other: number;
    };
  }

  const plansGroupedByArea = useMemo(() => {
    const groups: AreaGroup[] = [];
    const assignedPlanIds = new Set<string>();

    departments.forEach((dept) => {
      const deptPlans = filteredPlans.filter((p) => {
        const pArea = (p.learning_area || '').trim();
        if (pArea && isTeacherInDept(pArea, dept.name)) return true;
        const planTeacher = teachers.find((t) => isSameTeacherIdOrName(p.teacher_id, p.teacher_name, t));
        if (planTeacher?.Learning_Area && isTeacherInDept(planTeacher.Learning_Area, dept.name)) return true;
        return false;
      });

      deptPlans.forEach((p) => assignedPlanIds.add(p.id));

      if (deptPlans.length > 0) {
        let summary = 0;
        let full = 0;
        let research = 0;
        let other = 0;

        deptPlans.forEach((p) => {
          const typeMeta = classifyDocumentType(p.plan_type);
          if (typeMeta.key === 'summary_plan') summary++;
          else if (typeMeta.key === 'full_plan') full++;
          else if (typeMeta.key === 'classroom_research') research++;
          else other++;
        });

        groups.push({
          id: dept.id,
          name: dept.name,
          code: dept.code || dept.name.slice(0, 3).toUpperCase(),
          color: dept.color || '#4F46E5',
          headName: dept.head_teacher_name,
          plans: deptPlans,
          typeCounts: {
            all: deptPlans.length,
            summary,
            full,
            research,
            other,
          },
        });
      }
    });

    // Unassigned / General plans
    const unassignedPlans = filteredPlans.filter((p) => !assignedPlanIds.has(p.id));
    if (unassignedPlans.length > 0) {
      let summary = 0;
      let full = 0;
      let research = 0;
      let other = 0;

      unassignedPlans.forEach((p) => {
        const typeMeta = classifyDocumentType(p.plan_type);
        if (typeMeta.key === 'summary_plan') summary++;
        else if (typeMeta.key === 'full_plan') full++;
        else if (typeMeta.key === 'classroom_research') research++;
        else other++;
      });

      groups.push({
        id: 'dept_other',
        name: 'กลุ่มสาระอื่นๆ / ไม่ระบุกลุ่มสาระ',
        code: 'GEN',
        color: '#64748B',
        headName: 'งานวิชาการ',
        plans: unassignedPlans,
        typeCounts: {
          all: unassignedPlans.length,
          summary,
          full,
          research,
          other,
        },
      });
    }

    return groups;
  }, [departments, filteredPlans, teachers]);

  const toggleAreaCollapse = (areaId: string) => {
    setCollapsedAreas((prev) => ({
      ...prev,
      [areaId]: !prev[areaId],
    }));
  };

  const handleSetAreaTypeFilter = (areaId: string, filterType: string) => {
    setAreaTypeFilters((prev) => ({
      ...prev,
      [areaId]: filterType,
    }));
  };

  // If data is initializing, show full-page LoadingScreen with dancing dinosaur
  if (isLoading) {
    return (
      <LoadingScreen
        message="กำลังโหลดข้อมูลระบบ..."
        subMessage="โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
        seasonalTheme={activeSeasonalTheme}
      />
    );
  }

  // If user is not logged in, show full-page LoginScreen with school logo & seasonal atmosphere
  if (!currentTeacher) {
    return (
      <LoginScreen
        teachers={teachers}
        isSupabaseConnected={isSupabaseConnected}
        onLogin={handleSetCurrentUser}
        seasonalTheme={activeSeasonalTheme}
        seasonalConfig={seasonalThemeConfig}
        showSeasonalParticles={!isSeasonalMuted && seasonalThemeConfig.show_particles && seasonalThemeConfig.mode !== 'off'}
        onShowLoadingDemo={() => {
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 2200);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-['Prompt',sans-serif]">
      {/* Monochrome / Mourning Overlay (uses backdrop-filter on a pointer-events-none sibling so position:fixed modals never break) */}
      {activeSeasonalTheme.grayscaleRoot && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[9999] pointer-events-none print:hidden"
          style={{
            backdropFilter: 'grayscale(85%)',
            WebkitBackdropFilter: 'grayscale(85%)',
          }}
        />
      )}

      {/* Non-intrusive GPU-composited seasonal background particles (pointer-events-none) */}
      <SeasonalParticlesOverlay
        theme={activeSeasonalTheme}
        enabled={!isSeasonalMuted && seasonalThemeConfig.show_particles && seasonalThemeConfig.mode !== 'off'}
      />

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
          totalPlansCount={activeTermPlans.length}
          myPlansCount={activeTermPlans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher)).length}
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
          onOpenAdminTrackerModal={handleOpenAdminTracker}
          onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
          onOpenGoogleDriveConfig={() => setIsGoogleDriveModalOpen(true)}
          onOpenAcademicTerm={() => setIsAcademicTermModalOpen(true)}
          activeTerm={activeTerm}
          onOpenStaffStructure={() => setIsStaffStructureModalOpen(true)}
          onOpenWorkflowManager={() => setIsWorkflowModalOpen(true)}
          onOpenReviewerWorkload={() => setIsReviewerWorkloadModalOpen(true)}
          canViewAllDocs={canViewAllDocs}
          onOpenAllDocsPermission={() => setIsAllDocsPermissionModalOpen(true)}
          assignedToMeCount={assignedToMeCount}
          onScrollToAssignments={handleScrollToAssignments}
          onLogout={handleLogout}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onManualSync={() => syncWithDatabase(false)}
          seasonalTheme={activeSeasonalTheme}
          onOpenSeasonalTheme={() => setIsSeasonalThemeModalOpen(true)}
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
              totalPlansCount={activeTermPlans.length}
              myPlansCount={activeTermPlans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher)).length}
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
              onOpenAdminTrackerModal={handleOpenAdminTracker}
              onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
              onOpenGoogleDriveConfig={() => setIsGoogleDriveModalOpen(true)}
              onOpenAcademicTerm={() => setIsAcademicTermModalOpen(true)}
              activeTerm={activeTerm}
              onOpenStaffStructure={() => setIsStaffStructureModalOpen(true)}
              onOpenWorkflowManager={() => setIsWorkflowModalOpen(true)}
              onOpenReviewerWorkload={() => setIsReviewerWorkloadModalOpen(true)}
              canViewAllDocs={canViewAllDocs}
              onOpenAllDocsPermission={() => setIsAllDocsPermissionModalOpen(true)}
              assignedToMeCount={assignedToMeCount}
              onScrollToAssignments={handleScrollToAssignments}
              onLogout={handleLogout}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
              onManualSync={() => syncWithDatabase(false)}
              seasonalTheme={activeSeasonalTheme}
              onOpenSeasonalTheme={() => setIsSeasonalThemeModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* 3. Right Workspace: สีขาวบริสุทธิ์ (Pure White / Crisp Slate Canvas) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-50/70">
        {/* Mobile Header: สีกรมท่าเข้ม (#0B1329) */}
        <header className={`md:hidden sticky top-0 z-30 bg-[#0B1329] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-md ${activeSeasonalTheme.sidebarTopClass}`}>
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
                  จ.ภ. กาฬสินธุ์ · ภาคเรียนที่ {activeTerm.semester}/{activeTerm.academic_year}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
              aria-label="ค้นหาด่วน"
              title="ค้นหาด่วน"
            >
              <Search className="w-4 h-4 text-amber-400" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsReviewerWorkloadModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all shadow-2xs cursor-pointer"
                title="ตรวจสอบภาระงานผู้ตรวจ: ใครตรวจแล้วกี่อัน ค้างตรวจกี่อัน"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-[11px]">ภาระงาน</span>
              </button>
            )}
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

        {/* Desktop Top Sub-header (Clean Academic Workspace Bar) */}
        <div className={`hidden md:flex sticky top-0 z-20 bg-white/90 backdrop-blur-md px-6 py-2.5 border-b items-center justify-between gap-4 transition-colors duration-300 ${activeSeasonalTheme.headerBorderClass}`}>
          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <span className="font-semibold text-slate-700 whitespace-nowrap shrink-0">จ.ภ. กาฬสินธุ์</span>
            <span className="text-slate-300" aria-hidden="true">/</span>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setIsAcademicTermModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="คลิกเพื่อเปลี่ยนปีการศึกษา / ภาคเรียน และจัดการโฟลเดอร์ Google Drive"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>ภาคเรียนที่ {activeTerm.semester}/{activeTerm.academic_year}</span>
              </button>
            ) : (
              <span className="text-amber-800 font-semibold text-xs whitespace-nowrap shrink-0">
                ภาคเรียนที่ {activeTerm.semester}/{activeTerm.academic_year}
              </span>
            )}
            <span className="text-slate-300" aria-hidden="true">/</span>
            <span className="font-bold text-slate-900 truncate">
              {mainView === 'executive'
                ? executiveMode === 'ddo'
                  ? 'วิเคราะห์ Data-Driven Org'
                  : 'แดชบอร์ดภาพรวมผู้บริหาร'
                : 'รายการแผนการจัดการเรียนรู้'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Modern Quick Command / Search Trigger (⌘K) */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/90 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="เปิดค้นหาด่วนและคำสั่งลัด (Ctrl+K / ⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">ค้นหา / คำสั่งลัด</span>
              <kbd className="px-1.5 py-0.2 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-500">
                ⌘K
              </kbd>
            </button>

            {/* Clean Sync Control */}
            <button
              type="button"
              onClick={() => syncWithDatabase(false)}
              disabled={isSyncing}
              title={`ซิงค์ล่าสุด ${lastSyncTime} (คลิกเพื่อซิงค์กับ Cloud ทันที)`}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-emerald-600'}`} />
              <span className="font-mono tabular-nums text-[11px] font-medium text-slate-700">{lastSyncTime}</span>
            </button>

            {/* Quick Button: งานที่ได้รับมอบหมายให้ตรวจ */}
            {assignedToMeCount > 0 && (
              <button
                onClick={() => {
                  setMainView('plans');
                  setViewTab('assigned_to_me' as any);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 text-xs font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                title="งานที่ได้รับมอบหมายให้ฉันตรวจ"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>รอฉันตรวจ</span>
                <span className="min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black tabular-nums">
                  {assignedToMeCount}
                </span>
              </button>
            )}

            {/* Unified Admin Tools Menu for Desktop */}
            {isAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAdminTopMenuOpen(!isAdminTopMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isAdminTopMenuOpen
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                  title="เครื่องมือและการจัดการผู้ดูแลระบบ"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>จัดการระบบ</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isAdminTopMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAdminTopMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsAdminTopMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200/90 z-40 p-2 text-xs text-slate-800 animate-in fade-in slide-in-from-top-2 divide-y divide-slate-100">
                      {/* Group 1: Analytics & Tracking */}
                      <div className="p-1 space-y-0.5">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          สถิติ & ติดตามงาน
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsReviewerWorkloadModalOpen(true);
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">ภาระงานผู้ตรวจ</div>
                            <div className="text-[10px] text-slate-400">ตรวจสอบยอดตรวจจริงและงานค้าง</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenAdminTracker('overview');
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">ติดตามงานรายบุคคล</div>
                            <div className="text-[10px] text-slate-400">ตารางติดตามการส่งเอกสารของครู</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenAdminTracker('breakdown');
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">จำแนกประเภทเอกสาร</div>
                            <div className="text-[10px] text-slate-400">สรุปจำนวนส่งรายประเภทต่อคน</div>
                          </div>
                        </button>
                      </div>

                      {/* Group 2: Settings */}
                      <div className="p-1 space-y-0.5 pt-1.5">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          ตั้งค่าระบบ
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAcademicTermModalOpen(true);
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-950 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs flex items-center justify-between gap-2">
                              <span>ปีการศึกษา &amp; ภาคเรียน</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                {activeTerm.semester}/{activeTerm.academic_year}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">เปลี่ยนเทอม/ปี • จัดการโฟลเดอร์ Drive</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsWorkflowModalOpen(true);
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <WorkflowIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">สายงานอนุมัติ & ผู้ตรวจ</div>
                            <div className="text-[10px] text-slate-400">กำหนดลำดับขั้นตอนและผู้ตรวจ</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsStaffStructureModalOpen(true);
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">โครงสร้างสาขาวิชา & สาระ</div>
                            <div className="text-[10px] text-slate-400">แต่งตั้งหัวหน้าและจัดกลุ่มครู</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDeadlineModalOpen(true);
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">กำหนดส่ง & สถานะ</div>
                            <div className="text-[10px] text-slate-400">ตั้งวันหมดเขตและสถานะเอกสาร</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDirectoryModalOpen(true);
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-sky-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">ทำเนียบบุคลากร</div>
                            <div className="text-[10px] text-slate-400">รายชื่อครูทั้งหมด {teachers.length} ท่าน</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSeasonalThemeModalOpen(true);
                            setIsAdminTopMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-950 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs">ธีมเทศกาลอัตโนมัติ</div>
                            <div className="text-[10px] text-slate-400">ปีใหม่, วันครู, สงกรานต์, ฮาโลวีน, ลอยกระทง ฯลฯ</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

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

        {/* Compact Seasonal Greeting Strip (Non-sticky, dismissible, never blocks work) */}
        <SeasonalBannerBar
          theme={activeSeasonalTheme}
          config={seasonalThemeConfig}
          isAdmin={isAdmin}
          isDismissed={isSeasonalMuted}
          onDismiss={() => {
            setIsSeasonalMuted(true);
            setUserSeasonalMuted(true);
          }}
          onOpenSettings={() => setIsSeasonalThemeModalOpen(true)}
        />

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
            plans={activeTermPlans}
            deadlineConfigs={deadlineConfigs}
            onOpenSubmitForType={handleOpenSubmitForType}
            isAdmin={isAdmin}
            onScrollToAssignments={handleScrollToAssignments}
          />

          {/* Welcome & Overview Header Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                    : `ระบบจัดส่งเอกสารและติดตามผลการตรวจแผนการจัดการเรียนรู้ ประจำภาคเรียนที่ ${activeTerm.semester}/${activeTerm.academic_year}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsDirectoryModalOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                  title="ดูรายชื่อครูและข้อมูลติดต่อ"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>ทำเนียบบุคลากร ({teachers.length} ท่าน)</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => {
                  setMainView('executive');
                  setExecutiveMode('standard');
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mainView === 'executive'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <span>แดชบอร์ดภาพรวมบริหาร</span>
              </button>

              <button
                onClick={() => setMainView('plans')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mainView === 'plans'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>รายการเอกสารทั้งหมด</span>
                <span className="font-mono text-[11px] text-slate-400">({activeTermPlans.length})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium px-1 flex items-center gap-1.5">
              <span>มุมมอง:</span>
              <span className="font-semibold text-slate-800 truncate">
                {mainView === 'executive'
                  ? executiveMode === 'ddo'
                    ? 'วิเคราะห์ Data-Driven Org'
                    : executiveMode === 'ranking'
                    ? 'จัดอันดับกลุ่มสาระ'
                    : 'แดชบอร์ดภาพรวมผู้บริหาร'
                  : 'รายการเอกสารและการประเมิน'}
              </span>
            </div>
          </div>
        )}

        {/* Special Admin Control Notification Bar (shown on plans view) */}
        {isAdmin && mainView === 'plans' && (
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0B1329] text-amber-400 flex items-center justify-center shrink-0 font-bold shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>โหมดผู้ดูแลระบบ (Admin)</span>
                  <span className="text-[10px] text-amber-900 font-mono font-medium">
                    ID: {currentTeacher?.Teacher_ID}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate max-w-xl">
                  ท่านมีสิทธิ์ตรวจสอบความคืบหน้าของครูทุกคน และจัดการสายงานอนุมัติในระบบ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => handleOpenAdminTracker('overview')}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#0B1329] hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="ตารางติดตามดูสถานะการส่งเอกสารของบุคลากรทุกคน"
              >
                <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                <span>ติดตามส่งรายบุคคล</span>
              </button>
              <button
                onClick={() => setIsReviewerWorkloadModalOpen(true)}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="ตรวจสอบยอดตรวจจริงของผู้ตรวจทุกคน"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>ภาระงานผู้ตรวจ</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Display: Either Executive Dashboard OR Plans Grid */}
        {isAdmin && mainView === 'executive' ? (
          <div id="executive-dashboard-section" className="scroll-mt-20">
            <ExecutiveDashboard
              teachers={teachers}
              plans={activeTermPlans}
              currentTeacher={currentTeacher}
              deadlineConfigs={deadlineConfigs}
              executiveMode={executiveMode}
              onExecutiveModeChange={setExecutiveMode}
              onOpenPlan={(plan) => setSelectedPlanForReview(plan)}
              onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
              onOpenDirectoryModal={() => setIsDirectoryModalOpen(true)}
              onOpenReviewerWorkload={() => setIsReviewerWorkloadModalOpen(true)}
            />
          </div>
        ) : (
          <>
            {/* Role-Based Smart Overview Banner for Teachers (Matte #0B1329 Executive Surface) */}
            {!isAdmin && currentTeacher && (
              <div className="bg-[#0B1329] rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-sm mb-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Teacher Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                      {currentTeacher.photo ? (
                        <img src={currentTeacher.photo} alt={currentTeacher.Name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-amber-400 font-bold text-base">{currentTeacher.Name.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                          สวัสดีครับ/ค่ะ, {currentTeacher.Name}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-amber-300 border border-white/15 tabular-nums">
                          {currentTeacher.Teacher_ID}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 truncate">
                        {currentTeacher.position} · กลุ่มสาระ{currentTeacher.Learning_Area} {currentTeacher.branch ? `(สาขา${currentTeacher.branch})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Primary Call to Action Buttons */}
                  <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitModalInitialType(undefined);
                        setIsSubmitModalOpen(true);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 stroke-[2.2]" />
                      <span>ส่งแผนการสอน / ภาระงาน</span>
                    </button>
                    {assignedToMeCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewTab('assigned_to_me')}
                        className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-amber-300" />
                        <span>เอกสารที่รอฉันตรวจ ({assignedToMeCount})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* For regular users: Show assigned documents notification & deadline alert */}
            {!isAdmin && currentTeacher && (
              <TeacherAssignmentNotification
                currentTeacher={currentTeacher}
                plans={activeTermPlans}
                deadlineConfigs={deadlineConfigs}
                statusConfigs={statusConfigs}
                onOpenSubmitForType={handleOpenSubmitForType}
                onOpenReceipt={(plan) => setSelectedPlanForReceipt(plan)}
              />
            )}

            {/* Prominent Assigned Review Alert for Reviewers & Branch Heads (Swiss Bento Alert) */}
            {!isAdmin && currentTeacher && assignedToMeCount > 0 && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/90 flex items-center justify-center font-bold shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-slate-900">
                        คุณครูมีเอกสารวิชาการที่ได้รับมอบหมายให้ตรวจ {assignedToMeCount} รายการ
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-300/90 text-xs font-bold tabular-nums">
                        รอตรวจ {assignedToMeCount} รายการ
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      ในฐานะหัวหน้ากลุ่มสาขาวิชา / กรรมการผู้ตรวจตามขั้นตอนการประเมิน กรุณาตรวจสอบและบันทึกผลการตรวจ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMainView('plans');
                    setViewTab('assigned_to_me');
                    const targetEl = document.getElementById('lesson-plans-section');
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <FileCheck2 className="w-4 h-4 text-amber-400" />
                  <span>เปิดคิวตรวจเอกสารทันที ({assignedToMeCount})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dashboard Statistics (Collapsible for teachers to prevent cognitive overload, full for Admin) */}
            <div id="dashboard-stats-section" className="scroll-mt-20">
              {!isAdmin ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setIsTeacherStatsOpen(!isTeacherStatsOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-indigo-950 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span>สถิติภาพรวมการส่งเอกสารของโรงเรียน & กลุ่มสาระ</span>
                      <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">(คลิกเพื่อเปิด/ปิดดูสถิติกลุ่มสาระ)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                      <span>{isTeacherStatsOpen ? 'ย่อซ่อนสถิติ' : 'ขยายดูสถิติ'}</span>
                      {isTeacherStatsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {isTeacherStatsOpen && (
                    <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 animate-in fade-in duration-150">
                      <DashboardStats
                        plans={activeTermPlans}
                        teachers={teachers}
                        currentTeacher={currentTeacher}
                        selectedArea={areaFilter}
                        onSelectArea={(area) => setAreaFilter(area)}
                        selectedDocType={docTypeFilter}
                        onSelectDocType={(dt) => setDocTypeFilter(dt)}
                        deadlineConfigs={deadlineConfigs}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <DashboardStats
                  plans={activeTermPlans}
                  teachers={teachers}
                  currentTeacher={currentTeacher}
                  selectedArea={areaFilter}
                  onSelectArea={(area) => setAreaFilter(area)}
                  selectedDocType={docTypeFilter}
                  onSelectDocType={(dt) => setDocTypeFilter(dt)}
                  deadlineConfigs={deadlineConfigs}
                />
              )}
            </div>

        {/* Lesson Plans Control Bar */}
        <div id="lesson-plans-section" className="scroll-mt-20 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
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
                  เอกสารของฉัน ({activeTermPlans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher)).length})
                </button>
                {canViewAllDocs && (
                  <button
                    onClick={() => setViewTab('school_all')}
                    className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      viewTab === 'school_all'
                        ? 'bg-white text-indigo-950 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="ดูเอกสารทั้งหมดของโรงเรียน แยกตามกลุ่มสาระการเรียนรู้ (ได้รับสิทธิ์)"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>เอกสารทั้งโรงเรียน</span>
                    <span className="text-slate-500 font-mono text-xs">
                      ({activeTermPlans.filter((p) => p.status !== 'deleted').length})
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setViewTab('pending_review')}
                  className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    viewTab === 'pending_review'
                      ? 'bg-white text-amber-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แผนการสอนและเอกสารของฉันที่ส่งไปแล้วและกำลังรอผู้ตรวจประเมิน"
                >
                  <span>แผนของฉันที่รอตรวจ</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-500 font-mono text-xs">({activeTermPlans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher) && p.status === 'submitted').length})</span>
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
                  <span className="text-slate-500 font-mono text-xs">({activeTermPlans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher) && p.status === 'approved').length})</span>
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
                  <span className="text-slate-500 font-mono text-xs">({activeTermPlans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher) && p.status === 'needs_revision').length})</span>
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
                  <span className="text-slate-500 font-mono text-xs">({activeTermPlans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher) && p.is_late).length})</span>
                </button>
                <button
                  onClick={() => setViewTab('assigned_to_me')}
                  className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    viewTab === 'assigned_to_me'
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : assignedToMeCount > 0
                      ? 'text-amber-900 bg-amber-100 hover:bg-amber-200/80 font-bold'
                      : 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 font-semibold'
                  }`}
                  title="เอกสารของคณะครูที่มอบหมายให้ฉันเป็นผู้ตรวจ / ประเมิน"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>เอกสารที่รอฉันตรวจ</span>
                  {assignedToMeCount > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-950 text-white font-black text-[10px]">
                      {assignedToMeCount}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-75 font-mono">
                      (0)
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xs">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>เอกสารทั้งหมดในระบบ ({activeTermPlans.length} รายการ)</span>
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
                  buttons.push({ id: 'late', label: 'ส่งช้า' });
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

          {/* Document Type Category Filter (Quiet Slate Surface -> Highlights Active Selection Only) */}
          <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll py-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium text-[11px] shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>ประเภท:</span>
            </span>
            <button
              onClick={() => setDocTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              <span>ทุกประเภท</span>
              <span className={`font-mono tabular-nums text-[10px] ${docTypeFilter === 'all' ? 'text-amber-300' : 'text-slate-400'}`}>
                {docCategoryCounts.all}
              </span>
            </button>
            <button
              onClick={() => setDocTypeFilter((prev) => (prev === 'summary_plan' ? 'all' : 'summary_plan'))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'summary_plan'
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              <span>แผนฯ ฉบับย่อ</span>
              <span className={`font-mono tabular-nums text-[10px] ${docTypeFilter === 'summary_plan' ? 'text-white/90' : 'text-slate-400'}`}>
                {docCategoryCounts.summary}
              </span>
            </button>
            <button
              onClick={() => setDocTypeFilter((prev) => (prev === 'full_plan' ? 'all' : 'full_plan'))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'full_plan'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              <span>แผนฯ ฉบับสมบูรณ์</span>
              <span className={`font-mono tabular-nums text-[10px] ${docTypeFilter === 'full_plan' ? 'text-white/90' : 'text-slate-400'}`}>
                {docCategoryCounts.full}
              </span>
            </button>
            <button
              onClick={() => setDocTypeFilter((prev) => (prev === 'classroom_research' ? 'all' : 'classroom_research'))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docTypeFilter === 'classroom_research'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              <span>วิจัยในชั้นเรียน</span>
              <span className={`font-mono tabular-nums text-[10px] ${docTypeFilter === 'classroom_research' ? 'text-white/90' : 'text-slate-400'}`}>
                {docCategoryCounts.research}
              </span>
            </button>
            {/* Custom dynamically added document types from deadlineConfigs and custom plan types */}
            {customFilterCategories.map((cat) => {
              const isSelected = docTypeFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setDocTypeFilter((prev) => (prev === cat.id ? 'all' : cat.id))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                  }`}
                  title={cat.label}
                >
                  <span className="truncate max-w-[160px]">{cat.short}</span>
                  <span className={`font-mono tabular-nums text-[10px] ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}

            {docCategoryCounts.general > 0 && (
              <button
                onClick={() => setDocTypeFilter((prev) => (prev === 'general_academic' ? 'all' : 'general_academic'))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  docTypeFilter === 'general_academic'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                <span>เอกสารอื่นๆ</span>
                <span className={`font-mono tabular-nums text-[10px] ${docTypeFilter === 'general_academic' ? 'text-white/90' : 'text-slate-400'}`}>
                  {docCategoryCounts.general}
                </span>
              </button>
            )}
          </div>

          {/* Grade Level Filter (Clean Segmented Row) */}
          <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll py-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium text-[11px] shrink-0 mr-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>ระดับชั้น:</span>
            </span>
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                gradeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              <span>ทุกระดับชั้น</span>
              <span className={`font-mono tabular-nums text-[10px] ${gradeFilter === 'all' ? 'text-amber-300' : 'text-slate-400'}`}>
                {gradeCounts.all}
              </span>
            </button>
            {(['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'] as const).map((grade) => {
              const isSelected = gradeFilter === grade;
              return (
                <button
                  key={`grade-btn-${grade}`}
                  onClick={() => setGradeFilter((prev) => (prev === grade ? 'all' : grade))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                  }`}
                  title={`กรองเฉพาะระดับชั้น ${grade}`}
                >
                  <span>{grade}</span>
                  <span className={`font-mono tabular-nums text-[10px] ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                    {gradeCounts[grade] || 0}
                  </span>
                </button>
              );
            })}
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
                className="w-full pl-10 pr-9 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  aria-label="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {gradeFilter !== 'all' && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border border-amber-300">
                <span>ระดับชั้น: {gradeFilter}</span>
                <button
                  onClick={() => setGradeFilter('all')}
                  className="hover:text-amber-950 font-bold ml-1 cursor-pointer"
                  title="แสดงทุกระดับชั้น"
                >
                  ✕
                </button>
              </div>
            )}

            {docTypeFilter !== 'all' && (
              <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border border-purple-200">
                <span>
                  ประเภท:{' '}
                  {(() => {
                    if (docTypeFilter === 'summary_plan') return 'แผนฯ ฉบับย่อ';
                    if (docTypeFilter === 'full_plan') return 'แผนฯ ฉบับสมบูรณ์';
                    if (docTypeFilter === 'classroom_research') return 'วิจัยในชั้นเรียน';
                    if (docTypeFilter === 'general_academic') return 'เอกสารวิชาการอื่นๆ';
                    const customCat = customFilterCategories.find((c) => c.id === docTypeFilter);
                    if (customCat) return customCat.label;
                    const cfg = deadlineConfigs.find((c) => c.id === docTypeFilter);
                    if (cfg) return cfg.name;
                    if (docTypeFilter.startsWith('custom_')) return docTypeFilter.replace('custom_', '');
                    return docTypeFilter;
                  })()}
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
          {/* Review Queue Special Banner & Sub-filter (Matte #0B1329 Executive Strip) */}
          {viewTab === 'assigned_to_me' && (
            <div className="mb-4 bg-[#0B1329] text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      เอกสารที่รอฉันตรวจ (Review Queue)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-amber-300 border border-white/15">
                      {assignedReviewSubTab === 'pending' ? 'เอกสารที่ตรวจแล้วจะหายไปอัตโนมัติ' : 'ประวัติงานตรวจ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>เมื่อตรวจเสร็จ สำเนาไฟล์จะถูกจัดเก็บใน Google Drive:</span>
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded border border-white/15 text-amber-300 font-semibold">
                      ตรวจแล้ว/ประเภทเอกสาร_สาขาวิชา
                    </span>
                  </p>
                </div>
              </div>

              {/* Sub-filter tab switcher */}
              <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setAssignedReviewSubTab('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    assignedReviewSubTab === 'pending'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>รอตรวจ</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${assignedReviewSubTab === 'pending' ? 'bg-slate-950 text-white' : 'bg-white/10 text-amber-300'}`}>
                    {assignedPendingCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignedReviewSubTab('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    assignedReviewSubTab === 'completed'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>ตรวจแล้ว</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${assignedReviewSubTab === 'completed' ? 'bg-slate-950 text-white' : 'bg-white/10 text-emerald-300'}`}>
                    {assignedCompletedCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignedReviewSubTab('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    assignedReviewSubTab === 'all'
                      ? 'bg-white text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>ทั้งหมด</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-500" />
              <span>
                {viewTab === 'assigned_to_me'
                  ? 'รายการเอกสารที่ได้รับมอบหมายให้ตรวจ'
                  : viewTab === 'school_all' || isAdmin
                  ? 'เอกสารทั้งหมดในระบบ (แยกตามกลุ่มสาระการเรียนรู้)'
                  : 'รายการเอกสารวิชาการ / แผนการจัดการเรียนรู้ของฉัน'}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                (พบ {filteredPlans.length} รายการ{plansGroupedByArea.length > 0 && groupByLearningArea ? ` • ${plansGroupedByArea.length} กลุ่มสาระ` : ''})
              </span>
            </h3>

            {/* Controls: Grouping Toggle + Expand/Collapse + View Switcher */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {/* Admin Button: Configure Permissions for viewing All Documents */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAllDocsPermissionModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 shadow-2xs cursor-pointer"
                  title="ตั้งค่าว่าครูท่านใดมีสิทธิ์เข้าถึงและดูเอกสารทั้งหมดในระบบได้บ้าง (ตามคำสั่ง: ค่าเริ่มต้นไม่แสดงให้ครูเห็น)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    สิทธิ์ดูเอกสาร (
                    {allDocsAccessConfig.allow_all_teachers
                      ? 'ครูทุกคน'
                      : allDocsAccessConfig.allow_dept_heads
                      ? 'หัวหน้าสาระ+'
                      : allDocsAccessConfig.allowed_teacher_ids.length > 0
                      ? `${allDocsAccessConfig.allowed_teacher_ids.length} ท่าน`
                      : 'เฉพาะแอดมิน'}
                    )
                  </span>
                </button>
              )}

              {/* Group By Learning Area Toggle Button */}
              <button
                type="button"
                onClick={() => setGroupByLearningArea((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                  groupByLearningArea
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="สลับการจัดกลุ่มตามกลุ่มสาระการเรียนรู้"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>{groupByLearningArea ? 'แยกตามกลุ่มสาระ' : 'แสดงรวมทั้งหมด'}</span>
              </button>

              {groupByLearningArea && plansGroupedByArea.length > 0 && (
                <div className="hidden sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCollapsedAreas({})}
                    className="px-2 py-1 rounded-lg hover:bg-white text-slate-700 font-medium transition-all cursor-pointer"
                    title="ขยายทุกกลุ่มสาระ"
                  >
                    ขยายหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      plansGroupedByArea.forEach((g) => {
                        all[g.id] = true;
                      });
                      setCollapsedAreas(all);
                    }}
                    className="px-2 py-1 rounded-lg hover:bg-white text-slate-700 font-medium transition-all cursor-pointer"
                    title="ย่อทุกกลุ่มสาระ"
                  >
                    ย่อหมด
                  </button>
                </div>
              )}

              {/* View Switcher: บอร์ดการ์ด vs ตารางแถวสรุป */}
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shrink-0 shadow-2xs">
                <button
                  type="button"
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
                  type="button"
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
          </div>

          {/* Department Quick Jump Toolbar */}
          {groupByLearningArea && plansGroupedByArea.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll py-2 px-3 mb-5 bg-white rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
                ทางลัดกลุ่มสาระ:
              </span>
              {plansGroupedByArea.map((group) => (
                <button
                  key={`jump-${group.id}`}
                  type="button"
                  onClick={() => {
                    setCollapsedAreas((prev) => ({ ...prev, [group.id]: false }));
                    const el = document.getElementById(`area-section-${group.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200/80 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer group"
                >
                  <span className="truncate max-w-[140px]">{group.name}</span>
                  <span className="font-mono tabular-nums text-[10px] text-slate-400 group-hover:text-amber-300">
                    {group.plans.length}
                  </span>
                </button>
              ))}
            </div>
          )}

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
            groupByLearningArea && plansGroupedByArea.length > 0 ? (
              <div className="space-y-6">
                {plansGroupedByArea.map((group) => {
                  const isCollapsed = Boolean(collapsedAreas[group.id]);
                  const theme = getDeptTheme(group.code, group.name);
                  const activeTypeFilter = areaTypeFilters[group.id] || 'all';
                  const displayedPlans = group.plans.filter((p) => {
                    if (activeTypeFilter === 'all') return true;
                    const meta = classifyDocumentType(p.plan_type);
                    if (activeTypeFilter === 'summary') return meta.key === 'summary_plan';
                    if (activeTypeFilter === 'full') return meta.key === 'full_plan';
                    if (activeTypeFilter === 'research') return meta.key === 'classroom_research';
                    if (activeTypeFilter === 'other') {
                      return meta.key !== 'summary_plan' && meta.key !== 'full_plan' && meta.key !== 'classroom_research';
                    }
                    return true;
                  });

                  return (
                    <div
                      key={group.id}
                      id={`area-section-${group.id}`}
                      className="scroll-mt-24 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Clean Architectural Department Header */}
                      <div className="px-4 sm:px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-2xs ${theme.badge}`}>
                            {group.code.slice(0, 4)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                {group.name}
                              </h4>
                              <span className="text-xs font-mono tabular-nums font-semibold text-slate-500">
                                ({group.plans.length} รายการ)
                              </span>
                            </div>
                            {group.headName && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                หัวหน้ากลุ่มสาระ: <span className="font-medium text-slate-700">{group.headName}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Concise Breakdown Metadata & Collapse button */}
                        <div className="flex items-center gap-3 flex-wrap self-end md:self-center">
                          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                            {group.typeCounts.summary > 0 && <span>ย่อ {group.typeCounts.summary}</span>}
                            {group.typeCounts.full > 0 && (
                              <>
                                {group.typeCounts.summary > 0 && <span className="text-slate-300">·</span>}
                                <span>สมบูรณ์ {group.typeCounts.full}</span>
                              </>
                            )}
                            {group.typeCounts.research > 0 && (
                              <>
                                {(group.typeCounts.summary > 0 || group.typeCounts.full > 0) && <span className="text-slate-300">·</span>}
                                <span>วิจัย {group.typeCounts.research}</span>
                              </>
                            )}
                            {group.typeCounts.other > 0 && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span>อื่นๆ {group.typeCounts.other}</span>
                              </>
                            )}
                          </div>

                          {/* Collapse/Expand button */}
                          <button
                            type="button"
                            onClick={() => toggleAreaCollapse(group.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <span>{isCollapsed ? 'ขยายดูการ์ด' : 'ย่อ'}</span>
                            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                      </div>

                      {/* Area Content (Cards Grid & Inner Type Filter) */}
                      {!isCollapsed && (
                        <div className="p-4 sm:p-5 space-y-4">
                          {/* Inner Type Filter Segmented Controls */}
                          {(group.typeCounts.summary > 0 || group.typeCounts.full > 0 || group.typeCounts.research > 0 || group.typeCounts.other > 0) && (
                            <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1 text-xs">
                              <span className="text-slate-400 text-[11px] font-medium shrink-0 mr-1">ประเภท:</span>
                              <button
                                type="button"
                                onClick={() => handleSetAreaTypeFilter(group.id, 'all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 tabular-nums ${
                                  activeTypeFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                                    : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                                }`}
                              >
                                ทั้งหมด ({group.plans.length})
                              </button>
                              {group.typeCounts.summary > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAreaTypeFilter(group.id, 'summary')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 tabular-nums ${
                                    activeTypeFilter === 'summary'
                                      ? 'bg-sky-600 text-white shadow-2xs font-bold'
                                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                                  }`}
                                >
                                  <span>แผนฯ ฉบับย่อ</span>
                                  <span className="font-mono text-[10px] opacity-80">({group.typeCounts.summary})</span>
                                </button>
                              )}
                              {group.typeCounts.full > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAreaTypeFilter(group.id, 'full')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 tabular-nums ${
                                    activeTypeFilter === 'full'
                                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                                  }`}
                                >
                                  <span>แผนฯ ฉบับสมบูรณ์</span>
                                  <span className="font-mono text-[10px] opacity-80">({group.typeCounts.full})</span>
                                </button>
                              )}
                              {group.typeCounts.research > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAreaTypeFilter(group.id, 'research')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 tabular-nums ${
                                    activeTypeFilter === 'research'
                                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                                  }`}
                                >
                                  <span>วิจัยในชั้นเรียน</span>
                                  <span className="font-mono text-[10px] opacity-80">({group.typeCounts.research})</span>
                                </button>
                              )}
                              {group.typeCounts.other > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAreaTypeFilter(group.id, 'other')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 tabular-nums ${
                                    activeTypeFilter === 'other'
                                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                                  }`}
                                >
                                  <span>เอกสารอื่นๆ</span>
                                  <span className="font-mono text-[10px] opacity-80">({group.typeCounts.other})</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Cards Grid */}
                          {displayedPlans.length === 0 ? (
                            <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                              ไม่พบเอกสารประเภทนี้ในกลุ่มสาระนี้
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                              {displayedPlans.map((plan) => (
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
                                  canReview={checkCanReviewPlan(plan)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
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
                    canReview={checkCanReviewPlan(plan)}
                  />
                ))}
              </div>
            )
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
                    {groupByLearningArea && plansGroupedByArea.length > 0 ? (
                      plansGroupedByArea.map((group) => {
                        const isCollapsed = Boolean(collapsedAreas[group.id]);
                        const theme = getDeptTheme(group.code, group.name);
                        const activeTypeFilter = areaTypeFilters[group.id] || 'all';
                        const displayedPlans = group.plans.filter((p) => {
                          if (activeTypeFilter === 'all') return true;
                          const meta = classifyDocumentType(p.plan_type);
                          if (activeTypeFilter === 'summary') return meta.key === 'summary_plan';
                          if (activeTypeFilter === 'full') return meta.key === 'full_plan';
                          if (activeTypeFilter === 'research') return meta.key === 'classroom_research';
                          if (activeTypeFilter === 'other') {
                            return meta.key !== 'summary_plan' && meta.key !== 'full_plan' && meta.key !== 'classroom_research';
                          }
                          return true;
                        });

                        return (
                          <React.Fragment key={`dept-table-${group.id}`}>
                            <tr className={`border-y border-slate-200 ${theme.bg}`}>
                              <td colSpan={6} className="py-2.5 px-4 font-bold text-slate-800 text-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${theme.badge}`}>
                                      {group.code}
                                    </span>
                                    <span className="font-bold text-slate-900">{group.name}</span>
                                    <span className="text-slate-600 font-normal">({displayedPlans.length} รายการ)</span>
                                    {group.headName && (
                                      <span className="text-[11px] text-slate-500 hidden md:inline font-normal">
                                        — หัวหน้ากลุ่มสาระ: {group.headName}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleAreaCollapse(group.id)}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
                                  >
                                    <span>{isCollapsed ? 'ขยายดูแถว' : 'ย่อ'}</span>
                                    {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {!isCollapsed &&
                              displayedPlans.map((plan) => (
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
                                  canReview={checkCanReviewPlan(plan)}
                                />
                              ))}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      filteredPlans.map((plan) => (
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
                          canReview={checkCanReviewPlan(plan)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                <span>แสดงทั้งหมด {filteredPlans.length} รายการ</span>
                <span className="text-[11px] text-slate-400">
                  บนจอมือถือสามารถเลื่อนซ้าย-ขวาเพื่อดูข้อมูลครบถ้วน
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
      {currentTeacher && isSubmitModalOpen && (
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
          activeTerm={activeTerm}
          onSwitchToDynamic={(cfg) => {
            setIsSubmitModalOpen(false);
            setSubmitModalInitialType(undefined);
            setSelectedDynamicConfig(cfg);
            setIsDynamicSubmitModalOpen(true);
          }}
        />
      )}

      {/* Profile Modal */}
      {teacherToEdit && (
        <ProfileModal
          teacher={teacherToEdit}
          isOpen={isProfileModalOpen}
          departments={departments}
          branches={branches}
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
          key={selectedPlanForReview.id}
          plan={selectedPlanForReview}
          reviewer={currentTeacher || teachers.find(isTeacherAdmin) || teachers[0]}
          isOpen={!!selectedPlanForReview}
          onClose={() => setSelectedPlanForReview(null)}
          onSaveReview={handleSaveReview}
          statusConfigs={statusConfigs}
          deadlineConfigs={deadlineConfigs}
          teachers={teachers}
          workflows={workflows}
          workflow={getWorkflowForPlan(selectedPlanForReview, workflows)}
        />
      )}

      {/* Staff Structure & Department Head Manager Modal (Admin) */}
      {isStaffStructureModalOpen && (
        <StaffStructureManagerModal
          isOpen={isStaffStructureModalOpen}
          onClose={() => setIsStaffStructureModalOpen(false)}
          teachers={teachers}
          onUpdateTeachers={(updated) => {
            setTeachers(updated);
            if (currentTeacher) {
              const myKey = String(currentTeacher.Teacher_ID || '').trim().toLowerCase();
              const me = updated.find(
                (t) => String(t.Teacher_ID || '').trim().toLowerCase() === myKey
              );
              if (me) {
                const nextMe = sanitizeTeacherForClient(me);
                currentTeacherRef.current = nextMe;
                setCurrentTeacher(nextMe);
              }
            }
          }}
          departments={departments}
          onUpdateDepartments={(updated) => setDepartments(updated)}
          branches={branches}
          onUpdateBranches={(updated) => setBranches(updated)}
        />
      )}

      {/* Multi-stage Review Workflow Manager Modal (Admin) */}
      {isWorkflowModalOpen && (
        <WorkflowManagerModal
          isOpen={isWorkflowModalOpen}
          onClose={() => setIsWorkflowModalOpen(false)}
          workflows={workflows}
          onUpdateWorkflows={(updated) => setWorkflows(updated)}
          teachers={teachers}
          departments={departments}
          branches={branches}
          plans={plans}
          onUpdatePlans={(updated) => {
            setPlans(updated);
            saveLocalPlans(updated);
          }}
          deadlineConfigs={deadlineConfigs}
        />
      )}

      {/* Submission Receipt Modal */}
      {selectedPlanForReceipt && (
        <SubmissionReceiptModal
          plan={selectedPlanForReceipt}
          teacher={teachers.find((t) => isSameTeacherIdOrName(selectedPlanForReceipt.teacher_id, selectedPlanForReceipt.teacher_name, t))}
          isOpen={!!selectedPlanForReceipt}
          onClose={() => setSelectedPlanForReceipt(null)}
        />
      )}

      {/* Teacher Directory Modal */}
      {currentTeacher && isDirectoryModalOpen && (
        <TeacherDirectoryModal
          teachers={teachers}
          currentTeacher={currentTeacher}
          departments={departments}
          branches={branches}
          isOpen={isDirectoryModalOpen}
          onClose={() => setIsDirectoryModalOpen(false)}
          onEditTeacher={(t) => {
            setTeacherToEdit(t);
            setIsProfileModalOpen(true);
          }}
          onOpenStaffStructure={() => setIsStaffStructureModalOpen(true)}
        />
      )}

      {/* File Storage Hub Info Modal */}
      {isFileStorageModalOpen && (
        <FileStorageInfoModal
          plans={activeTermPlans}
          isOpen={isFileStorageModalOpen}
          onClose={() => setIsFileStorageModalOpen(false)}
        />
      )}

      {/* Admin Tracker Matrix Modal */}
      {isAdminTrackerModalOpen && (
        <AdminTrackerModal
          teachers={teachers}
          plans={activeTermPlans}
          deadlineConfigs={deadlineConfigs}
          statusConfigs={statusConfigs}
          initialViewMode={adminTrackerInitialView}
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
          onOpenReviewerWorkload={() => setIsReviewerWorkloadModalOpen(true)}
        />
      )}

      {/* Deadline & Status Manager Modal (Admin) */}
      {isDeadlineModalOpen && (
        <DeadlineManagerModal
          isOpen={isDeadlineModalOpen}
          onClose={() => setIsDeadlineModalOpen(false)}
          deadlineConfigs={deadlineConfigs}
          onSaveDeadlineConfigs={handleSaveDeadlineConfigs}
          statusConfigs={statusConfigs}
          onSaveStatusConfigs={handleSaveStatusConfigs}
          plans={activeTermPlans}
          onUpdatePlanStatus={handleQuickChangePlanStatus}
          onOpenReview={(p) => setSelectedPlanForReview(p)}
          isSupabaseConnected={isSupabaseConnected}
          currentTeacher={currentTeacher}
          teachers={teachers}
          activeTerm={activeTerm}
        />
      )}

      {/* Academic Year & Semester Manager Modal (Admin) */}
      {isAdmin && isAcademicTermModalOpen && (
        <AcademicTermModal
          isOpen={isAcademicTermModalOpen}
          onClose={() => setIsAcademicTermModalOpen(false)}
          activeTerm={activeTerm}
          currentTeacher={currentTeacher}
          allPlans={plans}
          deadlineConfigs={deadlineConfigs}
          onTermApplied={(nextTerm, purgedIds, updatedDeadlines) => {
            setActiveTerm(nextTerm);
            if (purgedIds && purgedIds.length > 0) {
              const purgedSet = new Set(purgedIds);
              setPlans((prev) => prev.filter((p) => !purgedSet.has(p.id)));
            }
            if (updatedDeadlines && updatedDeadlines.length > 0) {
              handleSaveDeadlineConfigs(updatedDeadlines);
            }
            setToastNotice({
              type: 'success',
              message: `ตั้งค่าภาคเรียนที่ ${nextTerm.semester}/${nextTerm.academic_year} เรียบร้อยแล้ว`,
              details:
                purgedIds && purgedIds.length > 0
                  ? `ล้างงานเก่าจากฐานข้อมูล ${purgedIds.length} รายการเรียบร้อย (ไฟล์ทั้งหมดใน Google Drive ยังคงอยู่ครบถ้วน)`
                  : `ระบบแสดงเฉพาะเอกสารของปีการศึกษา ${nextTerm.academic_year} เทอม ${nextTerm.semester}`,
            });
          }}
          onOpenGoogleDriveConfig={() => setIsGoogleDriveModalOpen(true)}
        />
      )}

      {/* Google Drive Automated Uploader Configuration Modal (Admin) */}
      {isGoogleDriveModalOpen && (
        <GoogleDriveConfigModal
          isOpen={isGoogleDriveModalOpen}
          onClose={() => setIsGoogleDriveModalOpen(false)}
          onSaved={(_url) => {
            setToastNotice({
              type: 'success',
              message: 'เชื่อมต่อ Google Drive ของโรงเรียนเรียบร้อยแล้ว!',
              details: 'ระบบพร้อมรับไฟล์ PDF จากคุณครูและสร้างลิงก์ Google Drive อัตโนมัติทันที',
            });
          }}
        />
      )}

      {/* Seasonal Theme Configuration Modal (Admin) */}
      {isAdmin && isSeasonalThemeModalOpen && (
        <SeasonalThemeModal
          isOpen={isSeasonalThemeModalOpen}
          config={seasonalThemeConfig}
          isUserMuted={isSeasonalMuted}
          onToggleUserMuted={(muted) => {
            setIsSeasonalMuted(muted);
            setUserSeasonalMuted(muted);
          }}
          onSave={handleSaveSeasonalThemeConfig}
          onClose={() => setIsSeasonalThemeModalOpen(false)}
        />
      )}

      {/* Dynamic Assignment Submit Modal (when task has custom fields & dropdowns) */}
      {currentTeacher && selectedDynamicConfig && (
        <DynamicSubmitModal
          currentTeacher={currentTeacher}
          config={selectedDynamicConfig}
          isOpen={isDynamicSubmitModalOpen}
          activeTerm={activeTerm}
          onClose={() => {
            setIsDynamicSubmitModalOpen(false);
            setSelectedDynamicConfig(null);
          }}
          onSwitchToStandard={(typeName) => {
            setIsDynamicSubmitModalOpen(false);
            setSelectedDynamicConfig(null);
            setSubmitModalInitialType(typeName);
            setIsSubmitModalOpen(true);
          }}
          onSubmitted={async (submission, correspondingPlan) => {
            if (correspondingPlan) {
              const rawAdded = Array.isArray(correspondingPlan) ? correspondingPlan : [correspondingPlan];
              const resolvedAdded = rawAdded.map((p) => {
                if (!p.assigned_reviewer_id) {
                  const enriched = assignWorkflowToPlan(p, workflows, teachers, departments, branches);
                  if (enriched.assigned_reviewer_id !== p.assigned_reviewer_id) {
                    savePlanRecord(enriched).catch(() => {});
                  }
                  return enriched;
                }
                return p;
              });
              setPlans((prev) => [...resolvedAdded, ...prev]);
              resolvedAdded.forEach((p) => {
                syncLessonPlanDriveEditors(p, teachers);
              });
            }
            const count = Array.isArray(correspondingPlan)
              ? correspondingPlan.length
              : (Array.isArray(submission) ? submission.length : 1);
            setToastNotice({
              type: 'success',
              message: count > 1
                ? `ส่งภาระงาน "${selectedDynamicConfig.name}" สำเร็จทั้งหมด ${count} รายการแล้ว!`
                : `ส่งภาระงาน "${selectedDynamicConfig.name}" เรียบร้อยแล้ว!`,
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
            syncLessonPlanDriveEditors(updatedPlan, teachers);

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
      {planToDelete && (
        <ConfirmDeleteModal
          isOpen={!!planToDelete}
          plan={planToDelete}
          onClose={() => setPlanToDelete(null)}
          onConfirm={async (id) => {
            await executeDeletePlan(id);
          }}
        />
      )}

      {/* Resubmit Plan Modal */}
      {planToResubmit && (
        <ResubmitPlanModal
          isOpen={!!planToResubmit}
          plan={planToResubmit}
          onClose={() => setPlanToResubmit(null)}
          onResubmit={handleResubmitPlan}
        />
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <LoginModal
          teachers={teachers}
          isOpen={isLoginModalOpen}
          onLogin={handleSetCurrentUser}
          seasonalTheme={activeSeasonalTheme}
        />
      )}

      {/* All Documents Visibility & Permission Access Modal (Admin) */}
      {isAllDocsPermissionModalOpen && (
        <AllDocumentsPermissionModal
          isOpen={isAllDocsPermissionModalOpen}
          onClose={() => setIsAllDocsPermissionModalOpen(false)}
          config={allDocsAccessConfig}
          onSaveConfig={handleSaveAllDocsAccessConfig}
          teachers={teachers}
          departments={departments}
        />
      )}

      {/* Reviewer Workload & Audit Tracker Modal (Admin) */}
      {isReviewerWorkloadModalOpen && (
        <ReviewerWorkloadModal
          isOpen={isReviewerWorkloadModalOpen}
          onClose={() => setIsReviewerWorkloadModalOpen(false)}
          teachers={teachers}
          plans={activeTermPlans}
          workflows={workflows}
          departments={departments}
          branches={branches}
          onOpenPlan={(plan) => setSelectedPlanForReview(plan)}
          onOpenReview={(plan) => setSelectedPlanForReview(plan)}
        />
      )}

      {/* Mobile Floating Bottom Navigation Bar: สะดวกใช้งานบนมือถือด้วยนิ้วโป้งเดียว (Style 4: แสด-กรมท่า) */}
      {currentTeacher && (
        <nav
          aria-label="เมนูหลักสำหรับมือถือ"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xl px-2 pt-1 pb-safe flex items-center justify-around text-[10px] font-bold text-slate-600 transition-all select-none"
        >
          {/* Button 1: แผนงาน */}
          {/* Button 1: หน้าหลัก / แผนทั้งหมด */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setMainView('plans');
              setViewTab('all');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors cursor-pointer active:scale-95 ${
              mainView === 'plans' && viewTab === 'all' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px]">หน้าหลัก</span>
          </button>

          {/* Button 2: งานของฉัน */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setMainView('plans');
              setViewTab('my');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors cursor-pointer active:scale-95 ${
              mainView === 'plans' && viewTab === 'my' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">งานของฉัน</span>
          </button>

          {/* Button 3: ส่งเอกสาร (Large Center Action: สีแสดทอง #F59E0B โดดเด่น) */}
          <button
            onClick={() => {
              setSubmitModalInitialType(undefined);
              setIsSubmitModalOpen(true);
            }}
            className="-mt-5 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md border-3 border-white active:scale-95 transition-all cursor-pointer"
            title="ส่งแผนการสอนหรือภาระงานใหม่"
          >
            <PlusCircle className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </button>

          {/* Button 4: งานตรวจที่มอบหมาย (พร้อม Badge แจ้งเตือน) */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setMainView('plans');
              setViewTab('assigned_to_me');
            }}
            className={`relative flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors cursor-pointer active:scale-95 ${
              mainView === 'plans' && viewTab === 'assigned_to_me' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="เอกสารที่รอฉันตรวจ"
          >
            <div className="relative">
              <UserCheck className="w-5 h-5" />
              {assignedToMeCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                  {assignedToMeCount > 99 ? '99+' : assignedToMeCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">งานตรวจ</span>
          </button>

          {/* Button 5: โปรไฟล์ */}
          <button
            onClick={() => {
              setTeacherToEdit(currentTeacher);
              setIsProfileModalOpen(true);
            }}
            className="flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors cursor-pointer active:scale-95 text-slate-500 hover:text-slate-900"
            title="ข้อมูลโปรไฟล์ของฉัน"
          >
            <User className="w-5 h-5 text-slate-600" />
            <span className="text-[10px]">โปรไฟล์</span>
          </button>
        </nav>
      )}

      {/* Command Palette (Ctrl+K / ⌘K) */}
      {currentTeacher && (
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          currentTeacher={currentTeacher}
          isAdmin={isAdmin}
          plans={activeTermPlans}
          teachers={teachers}
          assignedToMeCount={assignedToMeCount}
          onOpenSubmit={() => {
            setSubmitModalInitialType(undefined);
            setIsSubmitModalOpen(true);
          }}
          onJumpToReviewQueue={() => {
            setMainView('plans');
            setViewTab('assigned_to_me');
            setTimeout(() => {
              document.getElementById('lesson-plans-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }}
          onJumpToMyPlans={() => {
            setMainView('plans');
            setViewTab('all');
            setTimeout(() => {
              document.getElementById('lesson-plans-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }}
          onOpenProfile={() => {
            setTeacherToEdit(currentTeacher);
            setIsProfileModalOpen(true);
          }}
          onOpenDirectory={() => setIsDirectoryModalOpen(true)}
          onOpenPlanReview={(plan) => setSelectedPlanForReview(plan)}
          onFilterBySearch={(q) => {
            setMainView('plans');
            setSearchQuery(q);
            setTimeout(() => {
              document.getElementById('lesson-plans-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }}
          onOpenExecutive={() => {
            setMainView('executive');
            setExecutiveMode('standard');
          }}
          onOpenWorkflowManager={() => setIsWorkflowModalOpen(true)}
          onOpenStaffStructure={() => setIsStaffStructureModalOpen(true)}
          onOpenReviewerWorkload={() => setIsReviewerWorkloadModalOpen(true)}
          onOpenDeadlineManager={() => setIsDeadlineModalOpen(true)}
          onOpenAdminTracker={() => handleOpenAdminTracker('overview')}
        />
      )}

      {/* Unobtrusive Floating Back-to-Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30 w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-400 shadow-lg border border-slate-700/80 flex items-center justify-center transition-all duration-200 animate-fade-up cursor-pointer active:scale-95"
          title="เลื่อนกลับขึ้นด้านบน"
          aria-label="เลื่อนกลับขึ้นด้านบน"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
  );
}
