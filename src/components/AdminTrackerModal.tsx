import React, { useState, useMemo } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig, PlanStatusConfig, isTeacherAdmin } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  constructDateTime,
  formatThaiDateTime,
  getSavedDeadlineConfigs,
  calculateTaskTimeStatus,
  TaskTimeStatus,
  buildGmailComposeUrl,
  buildMailtoUrl,
  isPlanMatchingAssignment,
} from '../utils/deadlineUtils';
import {
  openGmailComposeTab,
  buildReminderPlainMessage,
  sendEmailViaApi,
  ACADEMIC_SENDER_EMAIL,
  ACADEMIC_SENDER_NAME,
} from '../services/emailService';
import {
  X,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Edit,
  Printer,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Trash2,
  LayoutGrid,
  List,
  Sparkles,
  Send,
  Clock,
  Mail,
  Bell,
  AlertTriangle,
  Flame,
  Users,
  Loader2,
  Zap,
  Trophy,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  SlidersHorizontal,
  Settings,
} from 'lucide-react';
import { DepartmentRankingLeaderboard } from './DepartmentRankingLeaderboard';
import { IndividualTrackerPrintModal } from './IndividualTrackerPrintModal';

interface AdminTrackerModalProps {
  teachers: Teacher[];
  plans: LessonPlan[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  statusConfigs?: PlanStatusConfig[];
  isOpen: boolean;
  onClose: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onEditPlan: (plan: LessonPlan) => void;
  onDeletePlan: (planId: string) => void;
  onOpenDeadlineManager?: () => void;
}

export interface TeacherMissingTask {
  config: PlanTypeDeadlineConfig;
  timeStatus: TaskTimeStatus;
}

export interface TeacherReminderData {
  teacher: Teacher;
  missingTasks: TeacherMissingTask[];
  primaryMissingTask?: TeacherMissingTask;
}

export const AdminTrackerModal: React.FC<AdminTrackerModalProps> = ({
  teachers,
  plans,
  deadlineConfigs,
  statusConfigs,
  isOpen,
  onClose,
  onEditTeacher,
  onEditPlan,
  onDeletePlan,
  onOpenDeadlineManager,
}) => {
  const [filterArea, setFilterArea] = useState<string>('ทั้งหมด');
  const [filterStatus, setFilterStatus] = useState<'all' | 'uncompleted' | 'completed' | 'late'>('all');
  const [filterTask, setFilterTask] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'matrix' | 'ranking'>('table');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPrintSummaryModalOpen, setIsPrintSummaryModalOpen] = useState(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

  // Direct email sending states
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccessReceipt, setEmailSuccessReceipt] = useState<{
    recipient: string;
    teacherName: string;
    timestamp: string;
    taskCount: number;
    method: string;
  } | null>(null);

  // Bulk email sending state
  const [bulkSendingProgress, setBulkSendingProgress] = useState<{
    inProgress: boolean;
    current: number;
    total: number;
    currentName: string;
    successCount: number;
  } | null>(null);


  // Modal states
  const [reminderModalData, setReminderModalData] = useState<TeacherReminderData | null>(null);
  const [showBulkReminderModal, setShowBulkReminderModal] = useState<boolean>(false);
  const [selectedTeacherForPlans, setSelectedTeacherForPlans] = useState<Teacher | null>(null);
  const [selectedSubmittedPlan, setSelectedSubmittedPlan] = useState<{
    teacher: Teacher;
    config: PlanTypeDeadlineConfig;
    plan: LessonPlan;
    allMatching: LessonPlan[];
  } | null>(null);

  // Background sending & App Password state
  const [isSendingBackground, setIsSendingBackground] = useState<boolean>(false);
  const [backgroundSendError, setBackgroundSendError] = useState<string | null>(null);
  const [showAppPassConfig, setShowAppPassConfig] = useState<boolean>(false);
  const [sendingTeacherId, setSendingTeacherId] = useState<string | null>(null);
  const [appPassword, setAppPassword] = useState<string>(() => {
    try {
      return localStorage.getItem('academic_smtp_app_pass') || '';
    } catch {
      return '';
    }
  });
  const [quickSendMode, setQuickSendMode] = useState<'gmail' | 'smtp'>(() => {
    try {
      const saved = localStorage.getItem('academic_quick_send_mode');
      if (saved === 'gmail' || saved === 'smtp') return saved;
      return localStorage.getItem('academic_smtp_app_pass') ? 'smtp' : 'gmail';
    } catch {
      return 'gmail';
    }
  });

  const handleToggleSendMode = (mode: 'gmail' | 'smtp') => {
    setQuickSendMode(mode);
    try {
      localStorage.setItem('academic_quick_send_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleSaveAppPassword = (val: string) => {
    const clean = val.trim().replace(/\s+/g, '');
    setAppPassword(clean);
    try {
      if (clean) {
        localStorage.setItem('academic_smtp_app_pass', clean);
      } else {
        localStorage.removeItem('academic_smtp_app_pass');
      }
    } catch {
      // ignore
    }
  };


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = async (text: string, key?: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (key) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2500);
      }
      showToast('📋 คัดลอกข้อความแจ้งเตือนเรียบร้อยแล้ว');
    } catch {
      showToast('⚠️ ไม่สามารถคัดลอกข้อความได้');
    }
  };


  // 1. Filter out admin accounts to get the 27 teaching staff
  const teachingStaff = useMemo(() => {
    return teachers.filter((t) => !isTeacherAdmin(t));
  }, [teachers]);

  // 2. Resolve active assignments configured by Admin
  const activeAssignments = useMemo(() => {
    const list = deadlineConfigs && deadlineConfigs.length > 0
      ? deadlineConfigs
      : getSavedDeadlineConfigs();
    return list.filter((c) => c.is_active !== false);
  }, [deadlineConfigs]);

  const areas = [
    'ทั้งหมด',
    'วิทยาศาสตร์และเทคโนโลยี',
    'คณิตศาสตร์',
    'ภาษาต่างประเทศ',
    'ภาษาไทย',
    'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'ศิลปะ',
    'สุขศึกษาและพลศึกษา',
    'กลุ่มบริหารวิชาการ',
  ];

  // Helper: Normalize string for comparison
  const normalize = (val?: string) => String(val || '').trim().toLowerCase();

  // 3. Helper to check if teacher submitted a specific assignment
  const getTeacherAssignmentStatus = (teacher: Teacher, config: PlanTypeDeadlineConfig) => {
    const tId = normalize(teacher.Teacher_ID || (teacher as any).teacher_id);
    const tName = normalize(teacher.Name || (teacher as any).name);

    // Plans belonging to this teacher
    const teacherPlans = plans.filter((p) => {
      const pId = normalize(p.teacher_id || (p as any).Teacher_ID);
      const pName = normalize(p.teacher_name || (p as any).Teacher_Name);
      return (tId && pId === tId) || (tName && pName === tName);
    });

    const matchingPlans = teacherPlans.filter((p) => isPlanMatchingAssignment(p, config));

    const isSubmitted = matchingPlans.length > 0;
    const sorted = [...matchingPlans].sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
    const submittedPlan = sorted[0];

    const timeStatus = calculateTaskTimeStatus(config.end_date, config.end_time || '23:59');

    return {
      isSubmitted,
      submittedPlan,
      matchingPlans: sorted,
      timeStatus,
    };
  };

  // 4. Matrix data compilation
  const matrixData = useMemo(() => {
    return teachingStaff.map((teacher) => {
      const taskResults = activeAssignments.map((config) => {
        const status = getTeacherAssignmentStatus(teacher, config);
        return {
          config,
          ...status,
        };
      });

      const missingTasks: TeacherMissingTask[] = taskResults
        .filter((r) => !r.isSubmitted)
        .map((r) => ({
          config: r.config,
          timeStatus: r.timeStatus,
        }));

      const submittedTasksCount = taskResults.filter((r) => r.isSubmitted).length;
      const totalTasksCount = activeAssignments.length;
      const isAllCompleted = totalTasksCount > 0 && submittedTasksCount === totalTasksCount;
      const hasUnsubmitted = totalTasksCount > 0 && submittedTasksCount < totalTasksCount;
      const hasLateSubmission = taskResults.some((r) => r.submittedPlan?.is_late);

      return {
        teacher,
        taskResults,
        missingTasks,
        submittedTasksCount,
        totalTasksCount,
        isAllCompleted,
        hasUnsubmitted,
        hasLateSubmission,
      };
    });
  }, [teachingStaff, activeAssignments, plans]);

  // 5. Statistics across all teachers
  const stats = useMemo(() => {
    const totalTeachers = teachingStaff.length;
    const completedAllCount = matrixData.filter((m) => m.isAllCompleted).length;
    const uncompletedCount = matrixData.filter((m) => m.hasUnsubmitted).length;
    const lateCount = matrixData.filter((m) => m.hasLateSubmission).length;

    // Per task stats
    const taskStats = activeAssignments.map((config) => {
      const submittedTeachers = matrixData.filter((m) =>
        m.taskResults.some((t) => t.config.id === config.id && t.isSubmitted)
      );
      const unsubmittedTeachers = matrixData.filter(
        (m) => !m.taskResults.some((t) => t.config.id === config.id && t.isSubmitted)
      );
      const rate = totalTeachers > 0 ? Math.round((submittedTeachers.length / totalTeachers) * 100) : 0;
      return {
        config,
        submittedCount: submittedTeachers.length,
        unsubmittedCount: unsubmittedTeachers.length,
        unsubmittedTeachers: unsubmittedTeachers.map((u) => u.teacher),
        rate,
      };
    });

    // All teachers who have any missing tasks
    const allUncompletedTeachersData = matrixData.filter((m) => m.hasUnsubmitted);

    return {
      totalTeachers,
      completedAllCount,
      uncompletedCount,
      lateCount,
      taskStats,
      allUncompletedTeachersData,
    };
  }, [matrixData, teachingStaff.length, activeAssignments]);

  // 6. Filter matrix rows
  const filteredRows = useMemo(() => {
    return matrixData.filter(({ teacher, isAllCompleted, hasUnsubmitted, hasLateSubmission, taskResults }) => {
      // Area filter
      if (filterArea !== 'ทั้งหมด' && teacher.Learning_Area !== filterArea) {
        return false;
      }

      // Status filter
      if (filterStatus === 'completed' && !isAllCompleted) return false;
      if (filterStatus === 'uncompleted' && !hasUnsubmitted) return false;
      if (filterStatus === 'late' && !hasLateSubmission) return false;

      // Task-specific filter: only show teachers who have NOT submitted this selected task
      if (filterTask !== 'all') {
        const taskResult = taskResults.find((t) => t.config.id === filterTask);
        if (!taskResult || taskResult.isSubmitted) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = teacher.Name.toLowerCase().includes(q);
        const matchId = teacher.Teacher_ID.toLowerCase().includes(q);
        const matchArea = teacher.Learning_Area.toLowerCase().includes(q);
        const matchEmail = teacher.Email.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchArea && !matchEmail) return false;
      }

      return true;
    });
  }, [matrixData, filterArea, filterStatus, filterTask, searchQuery]);

  // Helper to construct personalized reminder text for LINE / Chat
  const buildReminderText = (teacher: Teacher, missingTasks: TeacherMissingTask[]) => {
    const lines = [
      `📢 [แจ้งเตือนส่งงาน] ระบบส่งเอกสารวิชาการออนไลน์ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
      `เรียน คุณครู ${teacher.Name} (${teacher.Teacher_ID})`,
      `กลุ่มสาระการเรียนรู้: ${teacher.Learning_Area}`,
      ``,
      `ฝ่ายบริหารวิชาการขอแจ้งเตือนภาระงานที่คุณครูยังไม่ได้ส่ง จำนวน ${missingTasks.length} รายการ ดังนี้:`,
      `---------------------------------`,
      ...missingTasks.map((t, idx) => {
        const statusBadge = t.timeStatus.isOverdue
          ? `🔴 ${t.timeStatus.statusText}`
          : `⏳ ${t.timeStatus.statusText}`;
        return `${idx + 1}. งาน: "${t.config.name}" (ภาค ${t.config.semester}/${t.config.academic_year})\n   - กำหนดส่ง: ${t.timeStatus.deadlineFormatted}\n   - สถานะ: ${statusBadge}`;
      }),
      `---------------------------------`,
      `🔗 เข้าสู่ระบบเพื่อดำเนินการส่งเอกสาร:`,
      typeof window !== 'undefined' ? window.location.origin : '',
      ``,
      `ขอขอบพระคุณเป็นอย่างสูงครับ/ค่ะ 🙏`,
      `กลุ่มบริหารงานวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
    ];
    return lines.join('\n');
  };

  // Helper to open direct reminder modal
  const openTeacherReminderModal = (teacher: Teacher, missingTasks: TeacherMissingTask[], primaryConfig?: PlanTypeDeadlineConfig) => {
    const primary = primaryConfig
      ? missingTasks.find((m) => m.config.id === primaryConfig.id)
      : undefined;
    setEmailSuccessReceipt(null);
    setReminderModalData({
      teacher,
      missingTasks,
      primaryMissingTask: primary,
    });
  };

  // DIRECT 1-CLICK SEND: Opens Gmail compose immediately with sender forced to academics@pcshsksn.ac.th
  const handleSendDirectEmailNow = () => {
    if (!reminderModalData) return;
    const { teacher, missingTasks } = reminderModalData;

    const subject = `[แจ้งเตือนภาระงานค้างส่ง] คุณครู${teacher.Name} มีภาระงานค้างส่ง ${missingTasks.length} รายการ - ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
    const body = buildReminderText(teacher, missingTasks);

    // Open Gmail compose explicitly selecting academics@pcshsksn.ac.th
    openGmailComposeTab({
      to: teacher.Email,
      subject,
      body,
      authUser: ACADEMIC_SENDER_EMAIL,
    });

    setEmailSuccessReceipt({
      recipient: teacher.Email,
      teacherName: teacher.Name,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      taskCount: missingTasks.length,
      method: 'gmail_web',
    });
    showToast(`⚡ เปิด Gmail (${ACADEMIC_SENDER_EMAIL}) พร้อมส่งถึง ${teacher.Name} แล้ว!`);
  };

  // BACKGROUND DIRECT SEND: Sends email automatically in the background via SMTP API
  const handleSendBackgroundEmailNow = async () => {
    if (!reminderModalData) return;
    const { teacher, missingTasks } = reminderModalData;

    setIsSendingBackground(true);
    setBackgroundSendError(null);

    const subject = `[แจ้งเตือนภาระงานค้างส่ง] คุณครู${teacher.Name} มีภาระงานค้างส่ง ${missingTasks.length} รายการ - ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
    const body = buildReminderText(teacher, missingTasks);

    try {
      const result = await sendEmailViaApi({
        to: teacher.Email,
        subject,
        body,
        appPassword: appPassword.trim() || undefined,
      });

      if (result.success) {
        setEmailSuccessReceipt({
          recipient: teacher.Email,
          teacherName: teacher.Name,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          taskCount: missingTasks.length,
          method: 'gmail_web',
        });
        showToast(`⚡ ส่งอีเมลแจ้งเตือนถึงคุณครู ${teacher.Name} สำเร็จแล้ว!`);
      } else {
        if (result.requiresAppPassword) {
          setBackgroundSendError(
            `Google ปฏิเสธการส่งเบื้องหลังด้วยรหัสผ่านปกติ บัญชี ${ACADEMIC_SENDER_EMAIL} จำเป็นต้องใช้ "รหัสผ่านสำหรับแอป 16 หลัก" (App Password) หรือกดส่งผ่านปุ่ม "⚡ เปิดส่งใน Gmail" ด้านล่างได้ทันทีโดยไม่ต้องตั้งค่า`
          );
        } else {
          setBackgroundSendError(result.error || 'ไม่สามารถส่งอีเมลเบื้องหลังได้ แนะนำให้กดส่งผ่าน Gmail โดยตรง');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBackgroundSendError(msg);
    } finally {
      setIsSendingBackground(false);
    }
  };

  // BULK 1-CLICK SEND: Opens Gmail to all uncompleted teachers in 1 click
  const handleSendBulkDirectEmails = () => {
    const list = stats.allUncompletedTeachersData;
    if (list.length === 0) return;

    const emails = list.map((m) => m.teacher.Email).filter(Boolean);
    const subject = `[แจ้งเตือนภาระงานค้างส่ง] สรุปภาระงานที่ยังไม่ได้ส่งในระบบ (${list.length} ท่าน) - ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
    const body = [
      `เรียน คุณครูทุกท่าน โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
      ``,
      `ฝ่ายบริหารวิชาการ (${ACADEMIC_SENDER_EMAIL}) ขอแจ้งเตือนคุณครูที่มีภาระงานค้างส่งในระบบส่งเอกสารวิชาการออนไลน์`,
      `ขอความกรุณาคุณครูทุกท่านเข้าสู่ระบบเพื่อดำเนินการส่งเอกสารตามกำหนดเวลา:`,
      ``,
      `🔗 ลิงก์ระบบ: ${window.location.origin}`,
      ``,
      `จึงเรียนมาเพื่อโปรดทราบและดำเนินการตามกำหนดเวลา`,
      `ขอขอบพระคุณเป็นอย่างสูงครับ/ค่ะ 🙏`,
      `กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
    ].join('\n');

    openGmailComposeTab({
      to: emails.join(','),
      subject,
      body,
      authUser: ACADEMIC_SENDER_EMAIL,
    });

    setShowBulkReminderModal(false);
    showToast(`⚡ เปิด Gmail (${ACADEMIC_SENDER_EMAIL}) พร้อมส่งถึงครูที่ค้างส่งทั้ง ${emails.length} ท่านเรียบร้อยแล้ว!`);
  };

  // BULK BACKGROUND SEND: Sends emails automatically in sequence
  const handleSendBulkBackgroundEmails = async () => {
    const list = stats.allUncompletedTeachersData;
    if (list.length === 0) return;

    setBulkSendingProgress({
      inProgress: true,
      current: 0,
      total: list.length,
      currentName: list[0]?.teacher.Name || '',
      successCount: 0,
    });

    let successCount = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      setBulkSendingProgress({
        inProgress: true,
        current: i + 1,
        total: list.length,
        currentName: item.teacher.Name,
        successCount,
      });

      const subject = `[แจ้งเตือนภาระงานค้างส่ง] คุณครู${item.teacher.Name} มีภาระงานค้างส่ง ${item.missingTasks.length} รายการ - ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
      const body = buildReminderText(item.teacher, item.missingTasks);

      const res = await sendEmailViaApi({
        to: item.teacher.Email,
        subject,
        body,
        appPassword: appPassword.trim() || undefined,
      });

      if (res.success) {
        successCount++;
      } else if (res.requiresAppPassword) {
        // Stop and alert user
        alert(
          `การส่งอัตโนมัติเบื้องหลังหยุดทำงาน: บัญชี ${ACADEMIC_SENDER_EMAIL} จำเป็นต้องใช้ "รหัสผ่านสำหรับแอป (App Password 16 หลัก)" จาก Google Account Security\n\nระบบจะเปิดส่งผ่าน Gmail ให้แทนในคลิกเดียว!`
        );
        setBulkSendingProgress(null);
        handleSendBulkDirectEmails();
        return;
      }
    }

    setBulkSendingProgress(null);
    setShowBulkReminderModal(false);
    showToast(`⚡ ส่งอีเมลแจ้งเตือนอัตโนมัติสำเร็จ ${successCount} จาก ${list.length} ท่าน!`);
  };

  // 1-CLICK INSTANT SENDER:
  // Mode 1 (Gmail): Instantly opens Gmail compose window pre-filled for academics@pcshsksn.ac.th in 1 click (NO passwords, NO errors!)
  // Mode 2 (Background): Sends silently in the background if 16-character App Password is set. If SMTP fails, auto falls back to Gmail so user is never blocked!
  const handleQuickClickSend = async (
    teacher: Teacher,
    missingTasks: TeacherMissingTask[],
    primaryConfig?: PlanTypeDeadlineConfig
  ) => {
    if (missingTasks.length === 0) return;

    const subject = `[แจ้งเตือนภาระงานค้างส่ง] คุณครู${teacher.Name} มีภาระงานค้างส่ง ${missingTasks.length} รายการ - ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
    const body = buildReminderText(teacher, missingTasks);

    // If in Gmail 1-Click mode OR no App Password is set:
    if (quickSendMode === 'gmail' || !appPassword.trim()) {
      openGmailComposeTab({
        to: teacher.Email,
        subject,
        body,
        authUser: ACADEMIC_SENDER_EMAIL,
      });
      showToast(`⚡ เปิด Gmail บัญชี ${ACADEMIC_SENDER_EMAIL} ส่งถึงคุณครู ${teacher.Name} แล้ว!`);
      return;
    }

    // Background silent send mode:
    setSendingTeacherId(teacher.Teacher_ID);
    try {
      const res = await sendEmailViaApi({
        to: teacher.Email,
        subject,
        body,
        appPassword: appPassword.trim(),
      });

      if (res.success) {
        showToast(`⚡ ส่งอีเมลแจ้งเตือนถึงคุณครู ${teacher.Name} (${teacher.Email}) จาก ${ACADEMIC_SENDER_EMAIL} เรียบร้อยแล้ว!`);
      } else {
        // If SMTP rejects (e.g. human password Pcs@12345 instead of 16-char app pass), auto open Gmail fallback!
        showToast(`⚠️ ส่งเบื้องหลังไม่สำเร็จ (ต้องการรหัสแอป 16 หลัก) -> สลับเปิดหน้าต่าง Gmail ให้ทันที!`);
        openGmailComposeTab({
          to: teacher.Email,
          subject,
          body,
          authUser: ACADEMIC_SENDER_EMAIL,
        });
        setBackgroundSendError(res.error || 'Google ไม่อนุญาตให้ใช้รหัสปกติ (Pcs@12345) ส่งตรงผ่าน SMTP ระบบต้องใช้ "รหัสผ่านสำหรับแอป 16 หลัก" หรือส่งผ่านหน้าต่าง Gmail');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`⚠️ สลับเปิด Gmail บัญชี ${ACADEMIC_SENDER_EMAIL} ให้ทันที...`);
      openGmailComposeTab({
        to: teacher.Email,
        subject,
        body,
        authUser: ACADEMIC_SENDER_EMAIL,
      });
      setBackgroundSendError(msg);
    } finally {
      setSendingTeacherId(null);
    }
  };

  // QUICK BULK SEND: Sends to all uncompleted teachers
  const handleQuickBulkSend = () => {
    if (quickSendMode === 'smtp' && appPassword.trim()) {
      if (confirm(`ต้องการกดส่งอีเมลแจ้งเตือนถึงครูทุกคนที่ค้างส่งงาน (${stats.uncompletedCount} ท่าน) จากบัญชี ${ACADEMIC_SENDER_EMAIL} ทันทีหรือไม่?`)) {
        handleSendBulkBackgroundEmails();
      }
    } else {
      setShowBulkReminderModal(true);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-7xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-3 flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header (สีกรมท่าลึก #0B1329 อัตลักษณ์โรงเรียน พร้อมปุ่มขนาดเท่ากันและ Dropdown เมนู) */}
        <div className="bg-gradient-to-r from-[#0B1329] via-indigo-950 to-slate-900 p-3.5 sm:p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          {/* Brand & Sender Info (จัดเรียงสะอาด ไร้ข้อความซ้อนทับ) */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 bg-amber-400/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-amber-400/30 shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] uppercase font-bold text-amber-300 tracking-wider bg-amber-400/15 border border-amber-400/30">
                  Admin Matrix Hub
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-200 border border-white/10">
                  <Mail className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate max-w-[200px]">ส่งจาก: {ACADEMIC_SENDER_EMAIL}</span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1 truncate">
                ติดตามการส่งงานรายบุคคล
              </h2>
            </div>
          </div>

          {/* Action Buttons Toolbar (ความสูง h-9 เท่ากันทุกปุ่ม แบ่งความสำคัญชัดเจน ซ่อนปุ่มรองใน Dropdown) */}
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            {/* View Mode Segmented Control */}
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/15 text-xs font-semibold">
              <button
                onClick={() => setViewMode('table')}
                className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'table' ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title="ตารางรายคน"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>ตาราง</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'cards' ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title="การ์ดรายคน"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>การ์ด</span>
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'matrix' ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title="เมทริกซ์ 2 มิติ"
              >
                <List className="w-3.5 h-3.5" />
                <span>เมทริกซ์</span>
              </button>
            </div>

            {/* Primary Action 1: ส่งเมลเตือนทุกคน (แสดงเมื่อมีคนค้างส่ง) */}
            {stats.uncompletedCount > 0 && (
              <button
                onClick={handleQuickBulkSend}
                className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="คลิกเดียวส่งแจ้งเตือนครูทุกคนที่ยังค้างส่งงาน"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>ส่งเมลเตือน ({stats.uncompletedCount})</span>
              </button>
            )}

            {/* Primary Action 2: พิมพ์สรุปรายบุคคล */}
            <button
              onClick={() => setIsPrintSummaryModalOpen(true)}
              className="h-9 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-300"
              title="พิมพ์รายงานสรุปผลการส่งเอกสารรายบุคคล (พร้อมตราโรงเรียน)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์สรุปรายบุคคล</span>
            </button>

            {/* Secondary Actions Dropdown Menu (ลดความแออัดตามคำขอ) */}
            <div className="relative">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-white/10"
                title="ตัวเลือกเพิ่มเติม"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ตัวเลือก</span>
                <ChevronDown className="w-3 h-3 text-slate-300" />
              </button>

              {isMoreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMoreMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      เครื่องมือเพิ่มเติม
                    </div>

                    <button
                      onClick={() => {
                        setViewMode('ranking');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>🏆 จัดอันดับกลุ่มสาระ</span>
                    </button>

                    {onOpenDeadlineManager && (
                      <button
                        onClick={() => {
                          onOpenDeadlineManager();
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <span>กำหนดส่ง & งานที่มอบหมาย</span>
                      </button>
                    )}

                    <div className="px-3 py-1.5 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-800">
                      โหมดส่งอีเมล
                    </div>

                    <button
                      onClick={() => {
                        handleToggleSendMode('gmail');
                        setIsMoreMenuOpen(false);
                        showToast('เปิดใช้งานโหมด 1-Click Gmail');
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer transition-colors ${
                        quickSendMode === 'gmail'
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>⚡ 1-Click Gmail (แนะนำ)</span>
                      {quickSendMode === 'gmail' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    <button
                      onClick={() => {
                        if (!appPassword.trim()) {
                          if (teachingStaff.length > 0) {
                            openTeacherReminderModal(teachingStaff[0], []);
                            setShowAppPassConfig(true);
                          }
                        } else {
                          handleToggleSendMode('smtp');
                          showToast('เปิดใช้งานโหมดส่งเบื้องหลังอัตโนมัติ');
                        }
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer transition-colors ${
                        quickSendMode === 'smtp'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>🚀 ส่งเบื้องหลัง (รหัสแอป 16 หลัก)</span>
                      {quickSendMode === 'smtp' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Collapse/Expand Dashboard Button */}
            <button
              onClick={() => setIsDashboardCollapsed(!isDashboardCollapsed)}
              className="h-9 px-3 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-white/10"
              title={isDashboardCollapsed ? 'ขยายสถิติแดชบอร์ดด้านบน' : 'ย่อสถิติเพื่อเพิ่มพื้นที่ตารางรายชื่อครู'}
            >
              {isDashboardCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">ขยายสถิติ</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">ย่อสถิติ</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="h-9 w-9 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors active:scale-95 cursor-pointer flex items-center justify-center border border-white/10"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast alert banner if any */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 shadow-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* COLLAPSIBLE DASHBOARD (Stats & Progress bar - เมื่อเลื่อนดูตารางสามารถกดย่อเพื่อขยายตารางได้เต็มจอ) */}
        {!isDashboardCollapsed ? (
          <div className="transition-all duration-300 shrink-0">
            {/* Top KPI Cards (4 Cards Grid ในระบบ Grid ที่สมดุล ตัวเลขเด่นชัด ลดขนาดคำอธิบาย) */}
            <div className="bg-slate-50/80 p-3.5 sm:p-4 border-b border-slate-200/90 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: All Teachers */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                <span className="text-xs text-slate-500 font-semibold block">ครูผู้สอนทั้งหมด</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                    {stats.totalTeachers}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">ท่าน</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 font-medium">
                  ใน 8 กลุ่มสาระการเรียนรู้
                </div>
              </div>

              {/* Card 2: Completed All */}
              <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-2xs bg-gradient-to-br from-white to-emerald-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-semibold block">🟢 ส่งครบทุกงานแล้ว</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                    {stats.completedAllCount}
                  </span>
                  <span className="text-xs text-emerald-600 font-bold">
                    ({stats.totalTeachers > 0 ? Math.round((stats.completedAllCount / stats.totalTeachers) * 100) : 0}%)
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-medium">
                  ผ่านเกณฑ์ครบทุกรายการ
                </div>
              </div>

              {/* Card 3: Uncompleted */}
              <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-2xs bg-gradient-to-br from-white to-rose-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-800 font-semibold block">🔴 ค้างส่งงาน</span>
                  {stats.uncompletedCount > 0 && (
                    <button
                      onClick={() => setShowBulkReminderModal(true)}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      กดส่งเมลทันที
                    </button>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-700 tracking-tight">
                    {stats.uncompletedCount}
                  </span>
                  <span className="text-xs text-rose-600 font-medium">ท่าน</span>
                </div>
                <div className="mt-1 text-[11px] text-rose-500 font-medium">
                  มีช่องสีแดงที่ยังไม่ส่ง
                </div>
              </div>

              {/* Card 4: Assignments Count */}
              <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-2xs bg-gradient-to-br from-white to-indigo-50/30">
                <span className="text-xs text-indigo-800 font-semibold block">ภาระงานที่มอบหมาย</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-700 tracking-tight">
                    {activeAssignments.length}
                  </span>
                  <span className="text-xs text-indigo-600 font-medium">รายการ</span>
                </div>
                <div className="mt-1 text-[11px] text-indigo-500 font-medium">
                  งานที่แอดมินเปิดรับส่ง
                </div>
              </div>
            </div>

            {/* Task Columns Summary Quick Bar (Grid สม่ำเสมอ ไม่เบียดอึดอัด) */}
            <div className="bg-white px-3.5 sm:px-4 py-2.5 border-b border-slate-200/90 overflow-x-auto touch-scroll">
              <div className="flex items-center gap-3 min-w-max">
                <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>ความก้าวหน้ารายงาน:</span>
                </span>

                {stats.taskStats.map((ts) => (
                  <div
                    key={ts.config.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate max-w-[190px]" title={ts.config.name}>
                        {ts.config.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-emerald-700">ส่งแล้ว {ts.submittedCount}/{stats.totalTeachers}</span>
                        <span>•</span>
                        <span className={ts.unsubmittedCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                          ยังไม่ส่ง {ts.unsubmittedCount}
                        </span>
                      </div>
                    </div>

                    <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden shrink-0">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${ts.rate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Slim Banner when Dashboard is Collapsed (คืนพื้นที่ให้ตารางรายชื่อครู) */
          <div className="bg-slate-100/95 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium">
                ครูทั้งหมด: <strong className="font-mono text-slate-900">{stats.totalTeachers}</strong> ท่าน
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-medium">
                ส่งครบ: <strong className="font-mono">{stats.completedAllCount}</strong> ({stats.totalTeachers > 0 ? Math.round((stats.completedAllCount / stats.totalTeachers) * 100) : 0}%)
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-700 font-medium">
                ค้างส่ง: <strong className="font-mono">{stats.uncompletedCount}</strong> ท่าน
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-700 font-medium">
                ภาระงาน: <strong className="font-mono">{activeAssignments.length}</strong> รายการ
              </span>
            </div>

            <button
              onClick={() => setIsDashboardCollapsed(false)}
              className="text-amber-700 hover:text-amber-800 text-xs font-bold flex items-center gap-1 cursor-pointer hover:underline"
            >
              <span>ขยายสถิติ</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter & Search Toolbar (จัดแถบค้นหาและแท็บกลุ่มสาระเป็นเส้นตรงเดียวกันอย่างเป็นระเบียบ) */}
        <div className="p-3 sm:p-4 pb-2.5 border-b border-slate-200 space-y-2.5 shrink-0 bg-slate-50/70">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อครู, รหัสครู, อีเมล, กลุ่มสาระ..."
                className="w-full h-9 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Filter by Specific Task */}
            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
              <select
                value={filterTask}
                onChange={(e) => setFilterTask(e.target.value)}
                className="w-full sm:w-auto h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              >
                <option value="all">ภาระงานทั้งหมด (ดูทุกช่อง)</option>
                {activeAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    🔍 ดูเฉพาะคนยังไม่ส่ง: {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Tabs (ความสูง h-9 สม่ำเสมอ) */}
            <div className="flex h-9 bg-slate-200/80 p-1 rounded-xl text-xs font-bold shrink-0 overflow-x-auto max-w-full touch-scroll w-full lg:w-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                  filterStatus === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({teachingStaff.length})
              </button>
              <button
                onClick={() => setFilterStatus('uncompleted')}
                className={`px-3 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterStatus === 'uncompleted' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-white/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>ค้างส่งงาน ({stats.uncompletedCount})</span>
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-3 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-white/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>ส่งครบแล้ว ({stats.completedAllCount})</span>
              </button>
              <button
                onClick={() => setFilterStatus('late')}
                className={`px-3 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                  filterStatus === 'late' ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'text-amber-800 hover:bg-white/50'
                }`}
              >
                ⚠️ ส่งช้า ({stats.lateCount})
              </button>
            </div>
          </div>

          {/* Learning Area Filter Badges (แท็บกลุ่มสาระเป็นเส้นตรงเดียวกันอย่างเป็นระเบียบ) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs touch-scroll">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0 mr-1 flex items-center">กลุ่มสาระ:</span>
            {areas.map((a) => (
              <button
                key={a}
                onClick={() => setFilterArea(a)}
                className={`h-7 px-3 rounded-xl shrink-0 font-semibold transition-all cursor-pointer text-xs flex items-center whitespace-nowrap ${
                  filterArea === a
                    ? 'bg-[#0B1329] text-amber-400 font-bold shadow-xs'
                    : 'bg-white hover:bg-slate-200/70 text-slate-600 border border-slate-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Content: Main Assignment Matrix Grid / Cards / Department Ranking */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto touch-scroll">
          {viewMode === 'ranking' ? (
            <DepartmentRankingLeaderboard
              teachers={teachers}
              plans={plans}
              deadlineConfigs={deadlineConfigs}
              statusConfigs={statusConfigs}
              embedded={true}
            />
          ) : filteredRows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-base font-bold text-slate-700">ไม่พบรายชื่อคุณครูตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-400">ลองเปลี่ยนตัวกรองกลุ่มสาระหรือล้างคำค้นหา</p>
            </div>
          ) : viewMode === 'table' ? (
            /* 1. TABLE LIST VIEW (ตารางรายการรายคน - หัวตาราง Sticky ติดขอบบนเสมอ และขยายเต็มตาเมื่อย่อแดชบอร์ด) */
            <div className={`border border-slate-200 rounded-2xl overflow-auto shadow-xs bg-white transition-all ${
              isDashboardCollapsed ? 'max-h-[74vh]' : 'max-h-[55vh]'
            }`}>
              <table className="w-full text-left text-xs border-collapse min-w-full">
                <thead className="bg-[#0B1329] text-slate-200 font-bold sticky top-0 z-20 shadow-md">
                  <tr>
                    <th className="py-3 px-3.5 w-12 text-center border-b border-slate-700 text-slate-400 bg-[#0B1329]">#</th>
                    <th className="py-3 px-4 min-w-[220px] border-b border-slate-700 bg-[#0B1329] sticky left-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.15)]">
                      <div className="text-white font-extrabold text-xs sm:text-sm">ครูผู้สอน</div>
                      <div className="text-[10px] text-amber-300 font-normal">รหัสประจำตัว / อีเมล</div>
                    </th>
                      <th className="py-3 px-3.5 min-w-[150px] border-b border-slate-700">กลุ่มสาระการเรียนรู้</th>
                      <th className="py-3 px-3.5 min-w-[130px] text-center border-b border-slate-700">
                        <div>ความก้าวหน้า</div>
                        <div className="text-[10px] text-slate-400 font-normal">ชิ้นงานที่ส่งแล้ว</div>
                      </th>
                      <th className="py-3 px-4 min-w-[320px] border-b border-slate-700">
                        <div>สถานะภาระงานที่มอบหมาย</div>
                        <div className="text-[10px] text-slate-400 font-normal">คลิกเพื่อดูเอกสารหรือส่งแจ้งเตือน</div>
                      </th>
                      <th className="py-3 px-3.5 text-center min-w-[130px] border-b border-slate-700">สถานะรวม</th>
                      <th className="py-3 px-4 text-right min-w-[150px] border-b border-slate-700">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map(({ teacher, taskResults, missingTasks, submittedTasksCount, totalTasksCount, isAllCompleted, hasUnsubmitted, hasLateSubmission }, idx) => {
                      const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
                      const percent = totalTasksCount > 0 ? Math.round((submittedTasksCount / totalTasksCount) * 100) : 0;

                      return (
                        <tr key={`table-row-${teacher.Teacher_ID}`} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Row Number */}
                          <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-semibold">
                            {idx + 1}
                          </td>

                          {/* Teacher Profile */}
                          <td className="py-3 px-4 bg-white group-hover:bg-slate-50/80 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] border-r border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={teacher.Name}
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-indigo-700">
                                    {getInitials(teacher.Name)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate" title={teacher.Name}>
                                  {teacher.Name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                  <span className="bg-slate-100 px-1 rounded text-slate-700 font-bold border border-slate-200">
                                    {teacher.Teacher_ID}
                                  </span>
                                  {teacher.Email && (
                                    <span className="text-slate-400 truncate max-w-[120px]" title={teacher.Email}>
                                      {teacher.Email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Learning Area */}
                          <td className="py-3 px-3.5">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs truncate max-w-[160px]" title={teacher.Learning_Area}>
                              {teacher.Learning_Area}
                            </span>
                          </td>

                          {/* Progress */}
                          <td className="py-3 px-3.5 text-center">
                            <div className="inline-flex flex-col items-center gap-1 min-w-[90px]">
                              <div className="flex items-baseline gap-1 text-xs">
                                <span className={`font-black font-mono ${isAllCompleted ? 'text-emerald-700' : 'text-slate-800'}`}>
                                  {submittedTasksCount}/{totalTasksCount}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">งาน</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                  percent === 100
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : percent > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {percent}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    percent === 100
                                      ? 'bg-emerald-500'
                                      : percent > 0
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          {/* Task Chips (Clean horizontal pills) */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {taskResults.map((result) => {
                                const { config, isSubmitted, submittedPlan, matchingPlans, timeStatus } = result;

                                if (isSubmitted && submittedPlan) {
                                  const isLate = !!submittedPlan.is_late;
                                  return (
                                    <button
                                      key={config.id}
                                      onClick={() =>
                                        setSelectedSubmittedPlan({
                                          teacher,
                                          config,
                                          plan: submittedPlan,
                                          allMatching: matchingPlans,
                                        })
                                      }
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                        isLate
                                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                                      }`}
                                      title={`คลิกดูรายละเอียด ${config.name}`}
                                    >
                                      {isLate ? (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      )}
                                      <span className="font-bold truncate max-w-[130px]">{config.name}</span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        ({submittedPlan.submitted_at?.split('T')[0] || 'ส่งแล้ว'})
                                      </span>
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    key={config.id}
                                    onClick={() => handleQuickClickSend(teacher, missingTasks, config)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200"
                                    title={`คลิกส่งแจ้งเตือน ${config.name}`}
                                  >
                                    <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span className="font-bold truncate max-w-[130px]">{config.name}</span>
                                    <span className="text-[10px] text-rose-700 font-semibold font-mono">
                                      {timeStatus.isOverdue ? `(เลย ${timeStatus.days} ว.)` : `(เหลือ ${timeStatus.days} ว.)`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Overall Status Badge */}
                          <td className="py-3 px-3.5 text-center">
                            {isAllCompleted ? (
                              hasLateSubmission ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>ครบ (มีช้า)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>ตรงเวลา 100%</span>
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                                <Clock className="w-3 h-3 text-rose-600" />
                                <span>ค้าง {totalTasksCount - submittedTasksCount} งาน</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasUnsubmitted ? (
                                <button
                                  onClick={() => handleQuickClickSend(teacher, missingTasks)}
                                  disabled={sendingTeacherId === teacher.Teacher_ID}
                                  className="px-2.5 py-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                  title="ส่งอีเมลแจ้งเตือนภาระงานค้างส่งใน 1 คลิก"
                                >
                                  {sendingTeacherId === teacher.Teacher_ID ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                                  ) : (
                                    <Zap className="w-3 h-3 text-amber-300" />
                                  )}
                                  <span>เตือน</span>
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                  เรียบร้อย
                                </span>
                              )}

                              <button
                                onClick={() => {
                                  const text = buildReminderText(teacher, missingTasks);
                                  copyToClipboard(text, `copy-${teacher.Teacher_ID}`);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="คัดลอกข้อความแจ้งเตือนสำหรับส่ง LINE"
                              >
                                {copiedKey === `copy-${teacher.Teacher_ID}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => onEditTeacher(teacher)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="แก้ไขข้อมูลครู"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          ) : viewMode === 'matrix' ? (
            /* Matrix Grid View (Desktop & Tablet with smooth horizontal scroll & sticky header) */
            <div className={`border border-slate-200 rounded-2xl overflow-auto shadow-xs bg-white transition-all ${
              isDashboardCollapsed ? 'max-h-[74vh]' : 'max-h-[55vh]'
            }`}>
              <table className="w-full text-left text-xs border-collapse min-w-full">
                <thead className="bg-[#0B1329] text-slate-200 font-bold sticky top-0 z-20 shadow-md">
                  <tr>
                    {/* Fixed Col 1: Teacher Info */}
                    <th className="py-3 px-4 min-w-[230px] max-w-[270px] border-b border-slate-700 bg-[#0B1329] sticky left-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.15)]">
                      <div className="text-white font-extrabold text-sm">ครูผู้สอน</div>
                      <div className="text-[10px] text-amber-300 font-medium">รหัส / กลุ่มสาระการเรียนรู้</div>
                    </th>

                      {/* Columns 2..N+1: Assigned Tasks */}
                      {activeAssignments.map((config) => {
                        const taskStat = stats.taskStats.find((s) => s.config.id === config.id);
                        return (
                          <th
                            key={config.id}
                            className="py-3 px-3 min-w-[190px] border-b border-slate-700 text-center font-bold"
                          >
                            <div className="text-white font-bold truncate max-w-[220px] mx-auto text-xs" title={config.name}>
                              {config.name}
                            </div>
                            <div className="text-[10px] text-slate-300 font-normal mt-0.5 flex items-center justify-center gap-1">
                              <span className="bg-slate-800 text-amber-300 px-1 rounded font-mono">
                                ภาค {config.semester}/{config.academic_year}
                              </span>
                              <span>•</span>
                              <span>ส่ง {config.end_date}</span>
                            </div>
                            {taskStat && (
                              <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px]">
                                <span className="text-emerald-400 font-bold">
                                  {taskStat.submittedCount}/{stats.totalTeachers} ส่งแล้ว
                                </span>
                                {taskStat.unsubmittedCount > 0 && (
                                  <span className="text-rose-400 font-bold">
                                    (ค้าง {taskStat.unsubmittedCount})
                                  </span>
                                )}
                              </div>
                            )}
                          </th>
                        );
                      })}

                      {/* Summary Col: ความก้าวหน้ารวม */}
                      <th className="py-3 px-3 text-center min-w-[110px] border-b border-slate-700 font-bold text-amber-300">
                        <div>ความก้าวหน้า</div>
                        <div className="text-[10px] text-slate-400 font-normal">ชิ้นงานที่ส่ง</div>
                      </th>

                      {/* Actions Col */}
                      <th className="py-3 px-4 text-right min-w-[190px] border-b border-slate-700 font-bold text-slate-300">
                        แจ้งเตือน & จัดการ
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map(({ teacher, taskResults, missingTasks, submittedTasksCount, totalTasksCount, isAllCompleted, hasUnsubmitted }) => {
                      const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
                      const percent = totalTasksCount > 0 ? Math.round((submittedTasksCount / totalTasksCount) * 100) : 0;

                      return (
                        <tr key={teacher.Teacher_ID} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Col 1: Teacher Profile (Sticky left) */}
                          <td className="py-3 px-4 bg-white group-hover:bg-slate-50/80 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] border-r border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={teacher.Name}
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-indigo-700">
                                    {getInitials(teacher.Name)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs truncate" title={teacher.Name}>
                                  {teacher.Name}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono mt-0.5 flex-wrap">
                                  <span className="bg-slate-100 px-1 rounded text-slate-700 font-bold border border-slate-200">
                                    {teacher.Teacher_ID}
                                  </span>
                                  <span className="truncate max-w-[120px] text-slate-500" title={teacher.Learning_Area}>
                                    {teacher.Learning_Area}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Task Columns: GREEN if submitted, RED if not submitted */}
                          {taskResults.map((result) => {
                            const { config, isSubmitted, submittedPlan, matchingPlans, timeStatus } = result;

                            if (isSubmitted && submittedPlan) {
                              /* GREEN CELL (ส่งแล้ว) */
                              return (
                                <td
                                  key={config.id}
                                  className="p-1.5 text-center align-middle"
                                >
                                  <div
                                    onClick={() =>
                                      setSelectedSubmittedPlan({
                                        teacher,
                                        config,
                                        plan: submittedPlan,
                                        allMatching: matchingPlans,
                                      })
                                    }
                                    className="h-full min-h-[64px] bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-400 rounded-xl p-2 flex flex-col items-center justify-center gap-1 text-emerald-950 transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-95"
                                    title={`คลิกเพื่อดูรายละเอียด / ไฟล์ / แก้ไขการส่งงาน "${config.name}" ของคุณครู ${teacher.Name}`}
                                  >
                                    <div className="flex items-center gap-1 font-extrabold text-[11px] text-emerald-800">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>ส่งแล้ว</span>
                                      {matchingPlans.length > 1 && (
                                        <span className="bg-emerald-600 text-white text-[9px] px-1 py-0.2 rounded-full font-bold">
                                          {matchingPlans.length}
                                        </span>
                                      )}
                                    </div>

                                    {/* Status / Delay indicator */}
                                    <div className="text-[10px] text-emerald-700 font-medium truncate max-w-[160px]">
                                      {submittedPlan.status === 'approved' ? (
                                        <span className="font-bold text-emerald-700">✓ อนุมัติแล้ว</span>
                                      ) : submittedPlan.status === 'needs_revision' ? (
                                        <span className="font-bold text-rose-600">แก้ไขใหม่</span>
                                      ) : (
                                        <span>รอตรวจ</span>
                                      )}
                                      {submittedPlan.total_score !== undefined && submittedPlan.total_score !== null && (
                                        <span className="ml-1 font-bold text-indigo-700">({submittedPlan.total_score} คะแนน)</span>
                                      )}
                                    </div>

                                    <div className="text-[9px] text-emerald-600/80 font-mono">
                                      {submittedPlan.submitted_at?.split('T')[0] || ''}
                                      {submittedPlan.is_late && (
                                        <span className="ml-1 px-1 bg-amber-100 text-amber-800 rounded font-bold">
                                          ช้า
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            /* RED CELL (ยังไม่ส่ง) - Clearly displays days overdue or remaining time */
                            return (
                              <td
                                key={config.id}
                                className="p-1.5 text-center align-middle"
                              >
                                <div
                                  onClick={() => handleQuickClickSend(teacher, missingTasks, config)}
                                  className="h-full min-h-[64px] bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 rounded-xl p-2 flex flex-col items-center justify-center gap-1 text-rose-950 transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-95 group/cell"
                                  title={`คลิกส่งอีเมลแจ้งเตือนงาน "${config.name}" จาก ${ACADEMIC_SENDER_EMAIL} (${timeStatus.statusText})`}
                                >
                                  <div className="flex items-center gap-1 font-black text-[11px] text-rose-700">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>ยังไม่ส่ง</span>
                                  </div>

                                  {/* Overdue Days vs Remaining Time Notice */}
                                  <div className="text-[10px] font-bold truncate max-w-[160px]">
                                    {timeStatus.isOverdue ? (
                                      <span className="text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                        <Flame className="w-3 h-3 text-rose-600" />
                                        <span>เกิน {timeStatus.days} วัน</span>
                                      </span>
                                    ) : (
                                      <span className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                        <Clock className="w-3 h-3 text-amber-700" />
                                        <span>เหลือ {timeStatus.days} วัน</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[9px] text-rose-600 font-black group-hover/cell:underline flex items-center gap-0.5">
                                    {sendingTeacherId === teacher.Teacher_ID ? (
                                      <>
                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-rose-600" />
                                        <span>กำลังส่ง...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                                        <span>คลิกส่งเมลทันที</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}

                          {/* Summary Column: Progress */}
                          <td className="py-3 px-3 text-center align-middle border-l border-slate-100">
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${
                                  isAllCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {submittedTasksCount}/{totalTasksCount} งาน
                              </span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 mx-auto overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isAllCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono font-bold">
                                {percent}%
                              </div>
                            </div>
                          </td>

                          {/* Actions Column: Notification Button & Teacher Edit */}
                          <td className="py-3 px-4 text-right align-middle">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Dedicated 1-Click Notification Button for Teacher with Missing Work */}
                              {hasUnsubmitted && (
                                <button
                                  onClick={() => handleQuickClickSend(teacher, missingTasks)}
                                  disabled={sendingTeacherId === teacher.Teacher_ID}
                                  className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                                  title={`คลิกเดียวส่งแจ้งเตือนทางอีเมล ${ACADEMIC_SENDER_EMAIL} ให้คุณครู ${teacher.Name} (ค้าง ${missingTasks.length} งาน)`}
                                >
                                  {sendingTeacherId === teacher.Teacher_ID ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                                      <span>กำลังส่ง...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3.5 h-3.5 text-slate-950" />
                                      <span>ส่งเมลเตือน ({missingTasks.length})</span>
                                    </>
                                  )}
                                </button>
                              )}


                              {submittedTasksCount > 0 && (
                                <button
                                  onClick={() => setSelectedTeacherForPlans(teacher)}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  title="ดูแผนที่ส่งแล้ว"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => onEditTeacher(teacher)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                                title="แก้ไขข้อมูลครูท่านนี้"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          ) : (
            /* Cards View: Clean, Modern & Scannable Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredRows.map(({ teacher, taskResults, missingTasks, submittedTasksCount, totalTasksCount, isAllCompleted, hasUnsubmitted }) => {
                const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
                const percent = totalTasksCount > 0 ? Math.round((submittedTasksCount / totalTasksCount) * 100) : 0;
                const hasLateSubmission = taskResults.some((r) => r.isSubmitted && r.submittedPlan?.is_late);

                return (
                  <div
                    key={`card-${teacher.Teacher_ID}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    {/* Card Top / Header */}
                    <div className="p-4 pb-3 space-y-3">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={teacher.Name}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-indigo-700">
                                {getInitials(teacher.Name)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                              <span>{teacher.Name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold text-[10px]">{teacher.Teacher_ID}</span>
                              <span className="truncate max-w-[130px] text-slate-600 font-sans">{teacher.Learning_Area}</span>
                            </div>
                          </div>
                        </div>

                        {/* Top-Right Overall Status */}
                        <div className="shrink-0">
                          {isAllCompleted ? (
                            hasLateSubmission ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>ครบมีช้า</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>ตรงเวลา 100%</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-300">
                              <Clock className="w-3 h-3 text-rose-600" />
                              <span>ค้าง {missingTasks.length} งาน</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1 font-medium text-slate-600">
                          <span className="text-slate-500">ความคืบหน้า</span>
                          <span className="font-mono font-bold text-slate-800">
                            {submittedTasksCount}/{totalTasksCount} งาน ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percent === 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-indigo-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Task Checklist Items */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          รายการเอกสาร ({taskResults.length} รายการ):
                        </div>
                        <div className="space-y-1">
                          {taskResults.map((result) => {
                            const { config, isSubmitted, submittedPlan, matchingPlans, timeStatus } = result;

                            if (isSubmitted && submittedPlan) {
                              const isLate = submittedPlan.is_late;
                              return (
                                <div
                                  key={config.id}
                                  onClick={() =>
                                    setSelectedSubmittedPlan({
                                      teacher,
                                      config,
                                      plan: submittedPlan,
                                      allMatching: matchingPlans,
                                    })
                                  }
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                                    isLate
                                      ? 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/70 text-amber-950'
                                      : 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-100/60 text-emerald-950'
                                  }`}
                                  title="คลิกดูเอกสารที่ส่ง"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                    <Check className={`w-3.5 h-3.5 shrink-0 ${isLate ? 'text-amber-600' : 'text-emerald-600'}`} />
                                    <span className="truncate font-semibold text-[11px]">{config.name}</span>
                                  </div>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                    isLate ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-emerald-100 text-emerald-800 font-medium'
                                  }`}>
                                    {isLate ? 'ส่งช้า' : 'ตรงเวลา'}
                                  </span>
                                </div>
                              );
                            }

                            // Unsubmitted
                            const isOverdue = timeStatus.isOverdue;
                            return (
                              <div
                                key={config.id}
                                onClick={() => handleQuickClickSend(teacher, missingTasks, config)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                                  isOverdue
                                    ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70 text-rose-950'
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                                }`}
                                title="คลิกส่งเตือนงานนี้"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                  {isOverdue ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className="truncate font-semibold text-[11px]">{config.name}</span>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                                  isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {isOverdue ? `เลย ${timeStatus.days} วัน` : `เหลือ ${timeStatus.days} วัน`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {hasUnsubmitted ? (
                          <button
                            onClick={() => handleQuickClickSend(teacher, missingTasks)}
                            disabled={sendingTeacherId === teacher.Teacher_ID}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                            title="ส่งอีเมลแจ้งเตือนทุกงานที่ค้าง"
                          >
                            {sendingTeacherId === teacher.Teacher_ID ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                                <span className="text-[11px]">กำลังส่ง...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-slate-950" />
                                <span className="text-[11px]">เตือน {missingTasks.length} งาน</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>เรียบร้อยครบ</span>
                          </span>
                        )}

                        {hasUnsubmitted && (
                          <button
                            onClick={() => {
                              const text = buildReminderText(teacher, missingTasks);
                              copyToClipboard(text, `card-${teacher.Teacher_ID}`);
                            }}
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                            title="คัดลอกข้อความเตือนสำหรับส่งทาง LINE"
                          >
                            {copiedKey === `card-${teacher.Teacher_ID}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {submittedTasksCount > 0 && (
                          <button
                            onClick={() => setSelectedTeacherForPlans(teacher)}
                            className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1"
                            title="ดูเอกสารที่ส่งแล้วทั้งหมดของครูท่านนี้"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูแผน</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEditTeacher(teacher)}
                          className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg cursor-pointer"
                          title="แก้ไขข้อมูลครู"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL 1: Individual Teacher Reminder Dialog (Direct 1-Click Send) */}
        {reminderModalData && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/75 p-3 sm:p-4 backdrop-blur-xs">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0B1329] via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                      ส่งอีเมลแจ้งเตือนภาระงานค้างส่ง
                    </span>
                    <h3 className="font-extrabold text-base truncate">
                      {reminderModalData.teacher.Name} ({reminderModalData.teacher.Teacher_ID})
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setReminderModalData(null)}
                  className="p-1.5 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                {/* Instant Success Receipt if just sent */}
                {emailSuccessReceipt && (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 space-y-2 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>ส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว! ✓</span>
                    </div>
                    <div className="text-xs space-y-1 text-emerald-800">
                      <div>ผู้รับ: <strong>{emailSuccessReceipt.recipient}</strong></div>
                      <div>เวลาส่ง: <strong>{emailSuccessReceipt.timestamp} น.</strong></div>
                      <div>รายการงานที่แจ้งเตือน: <strong>{emailSuccessReceipt.taskCount} รายการ</strong></div>
                      <div className="text-[11px] text-emerald-700">✓ บันทึกประวัติการส่งเตือนลงในระบบเรียบร้อยแล้ว</div>
                    </div>
                  </div>
                )}

                {/* Teacher Info */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-bold block">กลุ่มสาระการเรียนรู้:</span>
                    <span className="font-bold text-slate-800">{reminderModalData.teacher.Learning_Area}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-bold block">ส่งไปที่อีเมล:</span>
                    <span className="font-mono text-indigo-700 font-bold">{reminderModalData.teacher.Email}</span>
                  </div>
                </div>

                {/* List of ALL unsubmitted tasks with Overdue / Time Remaining details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-rose-800 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>งานที่ยังไม่ได้ส่งทั้งหมด ({reminderModalData.missingTasks.length} รายการ):</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">คำนวณเวลาอัตโนมัติ</span>
                  </div>

                  <div className="space-y-2">
                    {reminderModalData.missingTasks.map((t, idx) => {
                      const isHighlighted = reminderModalData.primaryMissingTask?.config.id === t.config.id;

                      return (
                        <div
                          key={t.config.id}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                            t.timeStatus.isOverdue
                              ? isHighlighted
                                ? 'bg-rose-50 border-2 border-rose-500 shadow-sm'
                                : 'bg-rose-50/70 border border-rose-300'
                              : isHighlighted
                              ? 'bg-amber-50 border-2 border-amber-500 shadow-sm'
                              : 'bg-amber-50/70 border border-amber-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                <span className="bg-slate-800 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{t.config.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5">
                                ภาคเรียนที่ {t.config.semester} / ปีการศึกษา {t.config.academic_year}
                              </div>
                            </div>

                            {/* Overdue vs Remaining Badge */}
                            <div className="shrink-0">
                              {t.timeStatus.isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-2xs">
                                  <Flame className="w-3.5 h-3.5" />
                                  <span>เลยกำหนดส่ง {t.timeStatus.days} วัน</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>เหลือ {t.timeStatus.days} วัน</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time detail description */}
                          <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>กำหนดส่ง: <strong className="text-slate-800">{t.timeStatus.deadlineFormatted}</strong></span>
                            </span>
                            <span className={t.timeStatus.isOverdue ? 'text-rose-700 font-bold' : 'text-amber-800 font-bold'}>
                              {t.timeStatus.statusText}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email Delivery Box & Sender Profile */}
                <div className="p-3.5 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-blue-50/70 text-indigo-950 text-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Mail className="w-4 h-4 text-amber-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-indigo-950 flex items-center gap-1.5 flex-wrap">
                          <span>📧 ผู้ส่ง:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded-lg border border-indigo-200 text-indigo-900 font-bold">
                            {ACADEMIC_SENDER_EMAIL}
                          </span>
                          <span className="text-[10px] text-slate-500">({ACADEMIC_SENDER_NAME})</span>
                        </div>
                        <div className="text-[11px] text-indigo-700 mt-0.5 flex items-center gap-1">
                          <span className="text-emerald-700 font-bold">✓ ไม่มีการบันทึกประวัติการส่งลงดาต้าเบส</span>
                          <span>(ไม่เปลืองพื้นที่/โควต้า)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAppPassConfig(!showAppPassConfig)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-indigo-300 rounded-lg text-[10px] font-bold text-indigo-800 shadow-2xs cursor-pointer transition-colors"
                    >
                      {showAppPassConfig ? '✕ ปิดตั้งค่ารหัสแอป' : '⚙️ รหัสแอปสำหรับส่งเบื้องหลัง'}
                    </button>
                  </div>

                  {/* App Password Setting Expander */}
                  {showAppPassConfig && (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2 animate-in fade-in text-xs">
                      <div className="font-bold text-slate-800 flex items-center justify-between">
                        <span>🔑 รหัสผ่านสำหรับแอป (Google App Password 16 หลัก)</span>
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline text-[10px] font-semibold"
                        >
                          สร้างรหัสแอป Google ↗
                        </a>
                      </div>
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1 text-amber-950">
                          <span>💡 ทำไมรหัสผ่านปกติ (เช่น Pcs@12345) จึงใช้ส่งเบื้องหลังไม่ได้?</span>
                        </div>
                        <p className="leading-relaxed">
                          Google ยกเลิกการใช้รหัสผ่านเว็บปกติกับโปรแกรมส่งเมลภายนอก (SMTP) ทั่วโลก หากต้องการให้ระบบ <strong>&quot;กดส่งเบื้องหลังเงียบๆ 1 คลิก&quot;</strong> Google บังคับให้สร้าง <strong>รหัสผ่านสำหรับแอป (App Password 16 หลัก)</strong> ที่ <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="font-bold underline text-indigo-700">myaccount.google.com/apppasswords</a> (สร้างครั้งเดียว 1 นาที)
                        </p>
                        <p className="text-emerald-800 font-bold">
                          👉 หรือหากไม่ต้องการสร้างรหัส: เลือกโหมด &quot;⚡ 1-Click Gmail&quot; ด้านบน แล้วคลิกปุ่มส่งเมลเตือนได้ทันทีใน 1 คลิก!
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={appPassword}
                          onChange={(e) => handleSaveAppPassword(e.target.value)}
                          placeholder="วางรหัสแอป 16 หลัก เช่น abcd efgh ijkl mnop"
                          className="flex-1 px-3 py-2 border border-indigo-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!appPassword.trim()) {
                              alert('กรุณากรอกรหัสผ่านสำหรับแอป 16 ตัวอักษรก่อนกดส่ง');
                              return;
                            }
                            await handleSendBackgroundEmailNow();
                          }}
                          disabled={!appPassword.trim() || isSendingBackground}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSendingBackground ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                          )}
                          <span>บันทึก & ส่งทันที</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Error banner if background send failed */}
                  {backgroundSendError && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-1.5 animate-in fade-in">
                      <div className="flex items-start gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>การส่งเบื้องหลังอัตโนมัติ:</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-relaxed pl-5">
                        {backgroundSendError}
                      </p>
                      <div className="pl-5 pt-1">
                        <span className="text-[11px] font-bold text-rose-900">
                          👉 วิธีที่ง่ายที่สุด: ให้คลิกปุ่ม &quot;⚡ เปิดส่งใน Gmail&quot; สีทองด้านล่างได้ทันที โดยไม่ต้องตั้งค่ารหัสใดๆ เพิ่มเติม
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message preview toggle */}
                <details className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
                  <summary className="font-bold text-slate-700 cursor-pointer select-none">
                    📄 ดูเนื้อหาข้อความที่จะส่งทางอีเมล (คลิกเพื่อขยาย)
                  </summary>
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-sans text-[11px] leading-relaxed space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                    <p className="text-amber-300 font-bold">
                      หัวข้อ: [แจ้งเตือนภาระงานค้างส่ง] คุณครู{reminderModalData.teacher.Name} มีงานค้างส่ง {reminderModalData.missingTasks.length} รายการ
                    </p>
                    <p className="text-slate-400">จาก: {ACADEMIC_SENDER_NAME} &lt;{ACADEMIC_SENDER_EMAIL}&gt;</p>
                    <p>เรียน คุณครู {reminderModalData.teacher.Name}</p>
                    <p>ฝ่ายบริหารวิชาการขอแจ้งเตือนภาระงานที่ยังไม่ได้ส่งในระบบ จำนวน {reminderModalData.missingTasks.length} รายการ:</p>
                    {reminderModalData.missingTasks.map((t, idx) => (
                      <div key={t.config.id} className="text-amber-200 pl-2 border-l border-amber-400">
                        {idx + 1}. {t.config.name} ({t.timeStatus.statusText})
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              {/* Action Buttons: 1-Click Send Primary Action */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setReminderModalData(null);
                    setBackgroundSendError(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Copy Text Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const body = buildReminderText(reminderModalData.teacher, reminderModalData.missingTasks);
                      navigator.clipboard.writeText(body);
                      showToast('คัดลอกข้อความทวงงานสำหรับ LINE เรียบร้อยแล้ว!');
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>คัดลอกสำหรับ LINE</span>
                  </button>

                  {/* Mailto fallback button */}
                  {(() => {
                    const subject = `[แจ้งเตือนภาระงานค้างส่ง] คุณครู${reminderModalData.teacher.Name} มีงานค้างส่ง ${reminderModalData.missingTasks.length} รายการ - ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;
                    const body = buildReminderText(reminderModalData.teacher, reminderModalData.missingTasks);
                    return (
                      <a
                        href={buildMailtoUrl(reminderModalData.teacher.Email, subject, body)}
                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                        title="เปิดในแอปเมลในเครื่อง"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>แอปเมล</span>
                      </a>
                    );
                  })()}

                  {/* BACKGROUND SEND BUTTON */}
                  <button
                    type="button"
                    onClick={handleSendBackgroundEmailNow}
                    disabled={isSendingBackground}
                    className="px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 transition-all cursor-pointer text-xs disabled:opacity-50"
                    title="ทดลองส่งเบื้องหลังอัตโนมัติผ่าน SMTP API"
                  >
                    {isSendingBackground ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-700" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>{isSendingBackground ? 'กำลังส่ง...' : '🚀 ส่งเบื้องหลังทันที'}</span>
                  </button>

                  {/* PRIMARY 1-CLICK GMAIL COMPOSE BUTTON (Targeting academics@pcshsksn.ac.th) */}
                  <button
                    type="button"
                    onClick={handleSendDirectEmailNow}
                    className="px-5 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer text-xs bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950"
                    title="เปิดส่งใน Gmail จากบัญชี academics@pcshsksn.ac.th โดยตรง 100% แน่นอน"
                  >
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>⚡ เปิดส่งใน Gmail ({ACADEMIC_SENDER_EMAIL})</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL 2: Bulk Reminder to ALL Uncompleted Teachers (Direct 1-Click Send) */}
        {showBulkReminderModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/75 p-3 sm:p-4 backdrop-blur-xs">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
              <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-[#0B1329] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0">
                    <Zap className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                      Bulk Email Dispatch
                    </span>
                    <h3 className="font-extrabold text-base">
                      กดส่งอีเมลแจ้งเตือนครูทุกคนที่ค้างส่ง ({stats.uncompletedCount} ท่าน)
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkReminderModal(false)}
                  className="p-1.5 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                {/* Progress bar if bulk sending is active */}
                {bulkSendingProgress && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between font-bold text-amber-950">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        <span>กำลังส่งอีเมลถึงคุณครู {bulkSendingProgress.currentName}...</span>
                      </div>
                      <span className="font-mono text-sm">
                        {bulkSendingProgress.current} / {bulkSendingProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full transition-all duration-200"
                        style={{ width: `${Math.round((bulkSendingProgress.current / bulkSendingProgress.total) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-900 block">ครูผู้สอนที่ยังค้างส่งงาน:</span>
                    <span className="text-rose-700 text-[11px]">ทั้งหมด {stats.allUncompletedTeachersData.length} ท่าน (มีรายการที่ยังไม่ส่ง)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const emails = stats.allUncompletedTeachersData.map((m) => m.teacher.Email).filter(Boolean);
                      navigator.clipboard.writeText(emails.join(', '));
                      showToast(`คัดลอกอีเมลครูที่ค้างส่ง ${emails.length} รายการแล้ว!`);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>คัดลอกอีเมลทั้งหมด</span>
                  </button>
                </div>

                {/* List of Teachers with their Missing Tasks */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {stats.allUncompletedTeachersData.map(({ teacher, missingTasks }) => (
                    <div
                      key={teacher.Teacher_ID}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm">
                          {teacher.Name} ({teacher.Teacher_ID})
                        </div>
                        <div className="text-[11px] text-slate-500">{teacher.Learning_Area} • {teacher.Email}</div>
                        <div className="text-[11px] text-rose-700 font-bold mt-1">
                          ค้างส่ง {missingTasks.length} งาน: {missingTasks.map((m) => m.config.name).join(', ')}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowBulkReminderModal(false);
                          openTeacherReminderModal(teacher, missingTasks);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-2xs"
                      >
                        ส่งแจ้งเตือนท่านนี้
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkReminderModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold cursor-pointer text-xs"
                >
                  ปิดหน้าต่าง
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendBulkBackgroundEmails}
                    disabled={!!bulkSendingProgress?.inProgress}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                    title="ส่งเบื้องหลังอัตโนมัติทีละท่าน (ต้องการ App Password)"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🚀 ส่งอัตโนมัติเบื้องหลังทุกคน</span>
                  </button>

                  {/* DIRECT 1-CLICK BULK SEND BUTTON */}
                  <button
                    type="button"
                    onClick={handleSendBulkDirectEmails}
                    className="px-5 py-2.5 bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl font-black flex items-center gap-2 shadow-md cursor-pointer active:scale-95 text-xs"
                    title="เปิดส่งใน Gmail จากบัญชี academics@pcshsksn.ac.th ถึงครูที่ค้างส่งทุกคน"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>⚡ เปิดส่งใน Gmail ({ACADEMIC_SENDER_EMAIL}) ถึงทุกคน ({stats.uncompletedCount} ท่าน)</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL 3: View Details of Submitted Plan (Green Cell) */}
        {selectedSubmittedPlan && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-200 block">
                      สถานะ: ส่งเอกสารแล้ว ✓
                    </span>
                    <h3 className="font-extrabold text-base truncate">
                      {selectedSubmittedPlan.teacher.Name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubmittedPlan(null)}
                  className="p-1.5 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Task info */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">ภาระงาน:</span>
                    <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-700 font-bold">
                      ภาค {selectedSubmittedPlan.config.semester}/{selectedSubmittedPlan.config.academic_year}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{selectedSubmittedPlan.config.name}</div>
                </div>

                {/* Plan details */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-sm">
                      {selectedSubmittedPlan.plan.subject_code} - {selectedSubmittedPlan.plan.subject_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                      {selectedSubmittedPlan.plan.status}
                    </span>
                  </div>
                  <div className="text-slate-700 font-medium">{selectedSubmittedPlan.plan.plan_title}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>ส่งเมื่อ: {selectedSubmittedPlan.plan.submitted_at}</span>
                    {selectedSubmittedPlan.plan.total_score !== undefined && selectedSubmittedPlan.plan.total_score !== null && (
                      <span className="text-indigo-700 font-bold">คะแนน: {selectedSubmittedPlan.plan.total_score}</span>
                    )}
                    {selectedSubmittedPlan.plan.is_late && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        ⚠️ ส่งล่าช้า
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {selectedSubmittedPlan.plan.file_url && (
                    <a
                      href={selectedSubmittedPlan.plan.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>เปิดดูไฟล์เอกสาร</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const p = selectedSubmittedPlan.plan;
                      setSelectedSubmittedPlan(null);
                      onEditPlan(p);
                    }}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedSubmittedPlan(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: View All Plans of a Teacher */}
        {selectedTeacherForPlans && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-xs">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="bg-[#0B1329] text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">
                    รายการงานและแผนการสอนของ {selectedTeacherForPlans.Name} ({selectedTeacherForPlans.Teacher_ID})
                  </h3>
                  <p className="text-xs text-amber-300 mt-0.5">
                    กลุ่มสาระ: {selectedTeacherForPlans.Learning_Area}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeacherForPlans(null)}
                  className="p-1.5 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
                {(() => {
                  const tId = normalize(selectedTeacherForPlans.Teacher_ID);
                  const tName = normalize(selectedTeacherForPlans.Name);
                  const currentTeacherPlans = plans.filter((p) => {
                    const pId = normalize(p.teacher_id);
                    const pName = normalize(p.teacher_name);
                    return (tId && pId === tId) || (tName && pName === tName);
                  });

                  if (currentTeacherPlans.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400 space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                        <p className="text-sm font-semibold text-slate-600">คุณครูท่านนี้ยังไม่มีรายการแผนการสอนในระบบ</p>
                      </div>
                    );
                  }

                  return currentTeacherPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm">
                          {plan.subject_code} - {plan.subject_name}
                        </div>
                        <div className="text-slate-600 mt-0.5 font-medium">{plan.plan_title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                            {plan.plan_type}
                          </span>
                          <span>ส่งเมื่อ {plan.submitted_at?.split('T')[0]}</span>
                          <span>•</span>
                          <span>สถานะ: <strong className="text-slate-800">{plan.status}</strong></span>
                          {plan.is_late && (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">
                              ⚠️ ส่งช้า
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {plan.file_url && (
                          <a
                            href={plan.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold flex items-center gap-1 transition-colors"
                            title="เปิดดูไฟล์"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTeacherForPlans(null);
                            onEditPlan(plan);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          onClick={() => {
                            onDeletePlan(plan.id);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                          title="ลบแผนนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ช่องเขียว = ส่งแล้ว
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> ช่องแดง = ยังไม่ส่ง
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
              <Zap className="w-3 h-3 text-amber-600" /> กดส่งอีเมลได้ทันทีใน 1 วินาที
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        {/* MODAL: Printable Individual Tracker Summary with School Logo */}
        <IndividualTrackerPrintModal
          isOpen={isPrintSummaryModalOpen}
          onClose={() => setIsPrintSummaryModalOpen(false)}
          teachers={teachers}
          plans={plans}
          deadlineConfigs={deadlineConfigs}
          initialArea={filterArea}
          initialStatus={filterStatus}
        />
      </div>
    </div>
  );
};
