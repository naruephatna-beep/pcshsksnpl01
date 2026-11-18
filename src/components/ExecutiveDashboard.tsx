import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, LessonPlan, isTeacherAdmin, PlanTypeDeadlineConfig } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import { getSavedDeadlineConfigs } from '../utils/deadlineUtils';
import { resolvePrimaryPlanFileUrl, isValidHttpFileUrl } from '../utils/fileLinkUtils';
import { DataDrivenOrgView } from './DataDrivenOrgView';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Search,
  Printer,
  ChevronRight,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
  BellRing,
  X,
  BrainCircuit,
  Trophy,
  ChevronDown,
  Check,
  MoreHorizontal,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { DepartmentRankingLeaderboard } from './DepartmentRankingLeaderboard';
import { IndividualTrackerPrintModal } from './IndividualTrackerPrintModal';
import { InfographicPromptModal } from './InfographicPromptModal';
import { AnimatedCounter } from './AnimatedCounter';
import { PrintModalShell } from './PrintModalShell';
import {
  InfographicPromptPayload,
  generateEnglishInfographicPrompt,
} from '../utils/aiInfographicPrompt';

interface ExecutiveDashboardProps {
  teachers: Teacher[];
  plans: LessonPlan[];
  currentTeacher: Teacher;
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  executiveMode?: 'standard' | 'ranking' | 'ddo';
  onExecutiveModeChange?: (mode: 'standard' | 'ranking' | 'ddo') => void;
  onOpenPlan?: (plan: LessonPlan) => void;
  onOpenDeadlineManager?: () => void;
  onOpenDirectoryModal?: () => void;
  onOpenReviewerWorkload?: () => void;
}

export interface DocTypeColorConfig {
  bg: string;
  barGradient: string;
  lightBg: string;
  border: string;
  text: string;
  dot: string;
}

export const DOC_TYPE_COLORS: DocTypeColorConfig[] = [
  {
    bg: 'bg-blue-600',
    barGradient: 'from-blue-600 to-indigo-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-600',
  },
  {
    bg: 'bg-purple-600',
    barGradient: 'from-purple-600 to-violet-600',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-600',
  },
  {
    bg: 'bg-emerald-600',
    barGradient: 'from-emerald-600 to-teal-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-600',
  },
  {
    bg: 'bg-amber-500',
    barGradient: 'from-amber-500 to-orange-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    bg: 'bg-rose-500',
    barGradient: 'from-rose-500 to-pink-600',
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  {
    bg: 'bg-cyan-600',
    barGradient: 'from-cyan-600 to-sky-600',
    lightBg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    dot: 'bg-cyan-600',
  },
  {
    bg: 'bg-fuchsia-600',
    barGradient: 'from-fuchsia-600 to-pink-600',
    lightBg: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    text: 'text-fuchsia-700',
    dot: 'bg-fuchsia-600',
  },
  {
    bg: 'bg-indigo-600',
    barGradient: 'from-indigo-600 to-blue-700',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    dot: 'bg-indigo-600',
  },
  {
    bg: 'bg-teal-600',
    barGradient: 'from-teal-600 to-emerald-700',
    lightBg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    dot: 'bg-teal-600',
  },
];

export const getDocTypeColorConfig = (docType: string, allTypes: string[]): DocTypeColorConfig => {
  const index = allTypes.indexOf(docType);
  if (index >= 0) {
    return DOC_TYPE_COLORS[index % DOC_TYPE_COLORS.length];
  }
  let hash = 0;
  for (let i = 0; i < docType.length; i++) {
    hash = (hash << 5) - hash + docType.charCodeAt(i);
    hash |= 0;
  }
  return DOC_TYPE_COLORS[Math.abs(hash) % DOC_TYPE_COLORS.length];
};

const shortDocTypeLabel = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed === 'แผนการจัดการเรียนรู้ฉบับย่อ') return 'แผนฉบับย่อ';
  if (trimmed === 'แผนการจัดการเรียนรู้ฉบับสมบูรณ์') return 'แผนฉบับสมบูรณ์';
  if (trimmed === 'กำหนดการจัดการเรียนรู้') return 'กำหนดการสอน';
  if (trimmed === 'บันทึกหลังการสอน') return 'บันทึกหลังสอน';
  if (trimmed.includes('วิจัยในชั้นเรียน')) return 'วิจัยในชั้นเรียน';
  return trimmed;
};

const shortAreaLabel = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed === 'วิทยาศาสตร์และเทคโนโลยี') return 'วิทยาศาสตร์ฯ';
  if (trimmed === 'สังคมศึกษา ศาสนา และวัฒนธรรม') return 'สังคมศึกษาฯ';
  if (trimmed === 'สุขศึกษาและพลศึกษา') return 'สุขศึกษาและพละฯ';
  return trimmed;
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  teachers,
  plans,
  currentTeacher,
  deadlineConfigs,
  executiveMode = 'standard',
  onExecutiveModeChange,
  onOpenPlan,
  onOpenDeadlineManager,
  onOpenDirectoryModal,
  onOpenReviewerWorkload,
}) => {
  // Mode switcher: standard overview vs ranking vs DDO
  const [currentMode, setCurrentMode] = useState<'standard' | 'ranking' | 'ddo'>(executiveMode);

  useEffect(() => {
    if (executiveMode) {
      setCurrentMode(executiveMode);
    }
  }, [executiveMode]);

  useEffect(() => {
    const handleSwitch = (e: CustomEvent<{ mode: 'standard' | 'ranking' | 'ddo' }>) => {
      if (e.detail?.mode) {
        setCurrentMode(e.detail.mode);
        if (onExecutiveModeChange) onExecutiveModeChange(e.detail.mode);
      }
    };
    window.addEventListener('switch-executive-mode', handleSwitch as EventListener);
    return () => window.removeEventListener('switch-executive-mode', handleSwitch as EventListener);
  }, [onExecutiveModeChange]);

  const handleModeChange = (newMode: 'standard' | 'ranking' | 'ddo') => {
    setCurrentMode(newMode);
    if (onExecutiveModeChange) {
      onExecutiveModeChange(newMode);
    }
  };

  // Filters (Multi-select enabled for Document Types and Learning Areas)
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['ทั้งหมด']);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ontime' | 'late' | 'pending'>('all');
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>(['ทั้งหมด']);
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reminderSentMap, setReminderSentMap] = useState<Record<string, boolean>>({});
  const [selectedDetailTeacherId, setSelectedDetailTeacherId] = useState<string | null>(null);
  const [isIndividualPrintModalOpen, setIsIndividualPrintModalOpen] = useState(false);
  const [isInfographicModalOpen, setIsInfographicModalOpen] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);

  // Popover state
  const [isDocTypeDropdownOpen, setIsDocTypeDropdownOpen] = useState<boolean>(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState<boolean>(false);

  // Teaching staff (excluding admins)
  const teachingStaff = useMemo(() => {
    return teachers.filter((t) => !isTeacherAdmin(t));
  }, [teachers]);

  const areas = useMemo(
    () => [
      'ทั้งหมด',
      'วิทยาศาสตร์และเทคโนโลยี',
      'คณิตศาสตร์',
      'ภาษาต่างประเทศ',
      'ภาษาไทย',
      'สังคมศึกษา ศาสนา และวัฒนธรรม',
      'ศิลปะ',
      'สุขศึกษาและพลศึกษา',
      'การงานอาชีพ',
    ],
    []
  );

  // Dynamic document types based on deadline configs + plans
  const docTypes = useMemo(() => {
    const list: string[] = ['ทั้งหมด'];
    const seen = new Set<string>();

    const activeDeadlines =
      deadlineConfigs && deadlineConfigs.length > 0 ? deadlineConfigs : getSavedDeadlineConfigs();
    activeDeadlines.forEach((cfg) => {
      const name = (cfg.name || '').trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push(name);
      }
    });

    plans.forEach((p) => {
      if (p.plan_type && !seen.has(p.plan_type.trim())) {
        seen.add(p.plan_type.trim());
        list.push(p.plan_type.trim());
      }
    });

    const standardDefaults = [
      'แผนการจัดการเรียนรู้ฉบับย่อ',
      'แผนการจัดการเรียนรู้ฉบับสมบูรณ์',
      'กำหนดการจัดการเรียนรู้',
      'บันทึกหลังการสอน',
      'วิจัยในชั้นเรียน',
    ];
    standardDefaults.forEach((t) => {
      if (!seen.has(t)) {
        seen.add(t);
        list.push(t);
      }
    });

    return list;
  }, [plans, deadlineConfigs]);

  const isAllDocTypes = selectedDocTypes.length === 0 || selectedDocTypes.includes('ทั้งหมด');
  const isAllAreas = selectedAreas.length === 0 || selectedAreas.includes('ทั้งหมด');
  const allRealDocTypes = useMemo(() => docTypes.filter((d) => d !== 'ทั้งหมด'), [docTypes]);

  const matchesDocType = (plan: LessonPlan, dt: string): boolean => {
    const pType = (plan.plan_type || '').trim();
    if (dt === pType) return true;
    if (dt === 'แผนการจัดการเรียนรู้' && (pType.includes('แผนการจัดการเรียนรู้') || !pType)) {
      return true;
    }
    return false;
  };

  // Multi-select handlers
  const toggleDocType = (dt: string) => {
    if (dt === 'ทั้งหมด') {
      setSelectedDocTypes(['ทั้งหมด']);
      return;
    }
    const realTypes = docTypes.filter((d) => d !== 'ทั้งหมด');
    let next: string[];
    if (isAllDocTypes) {
      next = [dt];
    } else if (selectedDocTypes.includes(dt)) {
      next = selectedDocTypes.filter((d) => d !== dt);
      if (next.length === 0) next = ['ทั้งหมด'];
    } else {
      next = [...selectedDocTypes.filter((d) => d !== 'ทั้งหมด'), dt];
      if (next.length === realTypes.length) next = ['ทั้งหมด'];
    }
    setSelectedDocTypes(next);
  };

  const selectSingleOrToggleDocType = (dt: string) => {
    if (!isAllDocTypes && selectedDocTypes.length === 1 && selectedDocTypes[0] === dt) {
      setSelectedDocTypes(['ทั้งหมด']);
    } else {
      setSelectedDocTypes([dt]);
    }
  };

  const toggleArea = (area: string) => {
    if (area === 'ทั้งหมด') {
      setSelectedAreas(['ทั้งหมด']);
      return;
    }
    // Single-click department selection makes 1-screen cockpit intuitive for newcomers
    if (!isAllAreas && selectedAreas.length === 1 && selectedAreas[0] === area) {
      setSelectedAreas(['ทั้งหมด']);
    } else {
      setSelectedAreas([area]);
    }
  };

  const resetAllFilters = () => {
    setSelectedDocTypes(['ทั้งหมด']);
    setSelectedAreas(['ทั้งหมด']);
    setSelectedStatus('all');
    setSearchTeacher('');
  };

  // Filtered plans based on selected docTypes
  const activePlans = useMemo(() => {
    if (isAllDocTypes) return plans;
    return plans.filter((p) => selectedDocTypes.some((selected) => matchesDocType(p, selected)));
  }, [plans, selectedDocTypes, isAllDocTypes]);

  // Scoped teaching staff according to selected areas
  const scopedTeachingStaff = useMemo(() => {
    if (isAllAreas) return teachingStaff;
    return teachingStaff.filter((t) => selectedAreas.includes(t.Learning_Area));
  }, [teachingStaff, isAllAreas, selectedAreas]);

  const totalTeachersCount = scopedTeachingStaff.length;

  const submittedTeachers = useMemo(() => {
    return scopedTeachingStaff.filter((t) => activePlans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [scopedTeachingStaff, activePlans]);

  const pendingTeachers = useMemo(() => {
    return scopedTeachingStaff.filter((t) => !activePlans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [scopedTeachingStaff, activePlans]);

  const submissionRate =
    totalTeachersCount > 0 ? Math.round((submittedTeachers.length / totalTeachersCount) * 100) : 0;

  // Scoped plans (by both docTypes & areas)
  const scopedPlans = useMemo(() => {
    if (isAllAreas) return activePlans;
    return activePlans.filter((p) => selectedAreas.includes(p.learning_area || ''));
  }, [activePlans, isAllAreas, selectedAreas]);

  const totalPlansCount = scopedPlans.length;
  const onTimePlans = scopedPlans.filter((p) => !p.is_late);
  const latePlans = scopedPlans.filter((p) => p.is_late);

  const onTimeRate = totalPlansCount > 0 ? Math.round((onTimePlans.length / totalPlansCount) * 100) : 0;
  const lateRate = totalPlansCount > 0 ? Math.round((latePlans.length / totalPlansCount) * 100) : 0;

  const approvedPlansCount = useMemo(
    () =>
      scopedPlans.filter((p) => {
        const s = String(p.status || '').toLowerCase().trim();
        return s === 'approved' || s === 'passed' || s === 'completed';
      }).length,
    [scopedPlans]
  );

  const pendingReviewPlansCount = useMemo(
    () =>
      scopedPlans.filter((p) => {
        const s = String(p.status || '').toLowerCase().trim();
        return s === 'submitted' || s === 'late' || s === 'pending';
      }).length,
    [scopedPlans]
  );

  const plansWithScore = scopedPlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
  const avgScore =
    plansWithScore.length > 0
      ? (plansWithScore.reduce((acc, p) => acc + (p.total_score || 0), 0) / plansWithScore.length).toFixed(1)
      : '-';

  // Area statistics breakdown (always show all 8 learning areas in left panel so user can compare & click-to-filter!)
  const allAreaStats = useMemo(() => {
    const list = areas.filter((a) => a !== 'ทั้งหมด');

    return list
      .map((area) => {
        const areaTeachers = teachingStaff.filter((t) => t.Learning_Area === area);
        const areaPlans = activePlans.filter((p) => p.learning_area === area);
        const submittedAreaTeachers = areaTeachers.filter((t) =>
          areaPlans.some((p) => p.teacher_id === t.Teacher_ID)
        );
        const areaOnTimePlans = areaPlans.filter((p) => !p.is_late);
        const areaLatePlans = areaPlans.filter((p) => p.is_late);

        const onTimeTeachers = areaTeachers.filter((t) => {
          const tPlans = areaPlans.filter((p) => p.teacher_id === t.Teacher_ID);
          return tPlans.length > 0 && !tPlans.some((p) => p.is_late);
        });
        const lateTeachers = areaTeachers.filter((t) => {
          const tPlans = areaPlans.filter((p) => p.teacher_id === t.Teacher_ID);
          return tPlans.some((p) => p.is_late);
        });

        const rate =
          areaTeachers.length > 0
            ? Math.round((submittedAreaTeachers.length / areaTeachers.length) * 100)
            : 0;

        const scored = areaPlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
        const areaAvgScore =
          scored.length > 0
            ? (scored.reduce((acc, p) => acc + (p.total_score || 0), 0) / scored.length).toFixed(1)
            : '-';

        return {
          name: area,
          totalTeachers: areaTeachers.length,
          submittedTeachers: submittedAreaTeachers.length,
          pendingTeachers: areaTeachers.length - submittedAreaTeachers.length,
          onTimeTeachersCount: onTimeTeachers.length,
          lateTeachersCount: lateTeachers.length,
          totalPlans: areaPlans.length,
          onTimePlans: areaOnTimePlans.length,
          latePlans: areaLatePlans.length,
          submissionRate: rate,
          avgScore: areaAvgScore,
          isCompleted: rate === 100 && areaTeachers.length > 0,
        };
      })
      .sort((a, b) => {
        if (b.submissionRate !== a.submissionRate) return b.submissionRate - a.submissionRate;
        return a.pendingTeachers - b.pendingTeachers;
      });
  }, [areas, teachingStaff, activePlans]);

  // Scoped areaStats for Printout & AI Prompt
  const areaStats = useMemo(() => {
    if (isAllAreas) return allAreaStats;
    return allAreaStats.filter((a) => selectedAreas.includes(a.name));
  }, [allAreaStats, isAllAreas, selectedAreas]);

  // Quick summary per document type (scoped to current learning area filter)
  const docTypeStats = useMemo(() => {
    const areaFilteredPlans = isAllAreas
      ? plans
      : plans.filter((p) => selectedAreas.includes(p.learning_area || ''));

    return allRealDocTypes
      .map((dt) => {
        const matchingPlans = areaFilteredPlans.filter((p) => matchesDocType(p, dt));
        const submittedTeacherIds = new Set(matchingPlans.map((p) => p.teacher_id));
        const submittedTeacherCount = scopedTeachingStaff.filter((t) =>
          submittedTeacherIds.has(t.Teacher_ID)
        ).length;
        const rate =
          totalTeachersCount > 0 ? Math.round((submittedTeacherCount / totalTeachersCount) * 100) : 0;
        return {
          name: dt,
          shortName: shortDocTypeLabel(dt),
          planCount: matchingPlans.length,
          submittedTeachers: submittedTeacherCount,
          rate,
        };
      })
      .filter((d) => d.planCount > 0 || deadlineConfigs?.some((c) => c.name === d.name))
      .slice(0, 5);
  }, [allRealDocTypes, plans, isAllAreas, selectedAreas, scopedTeachingStaff, totalTeachersCount, deadlineConfigs]);

  // Active academic term label from actual plans
  const activeTermLabel = useMemo(() => {
    const first = plans.find((p) => p.semester && p.academic_year);
    if (first) {
      return `ภาคเรียนที่ ${first.semester}/${first.academic_year}`;
    }
    return 'ปีการศึกษาปัจจุบัน';
  }, [plans]);

  // Payload for AI Infographic Prompt Generator
  const promptPayload: InfographicPromptPayload = useMemo(
    () => ({
      schoolNameTh: 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์',
      schoolNameEn: 'Princess Chulabhorn Science High School Kalasin',
      academicYear: activeTermLabel,
      selectedDocTypes,
      areaStats,
      totalTeachers: totalTeachersCount,
      totalSubmittedTeachers: submittedTeachers.length,
      overallSubmissionRate: submissionRate,
      onTimeRate,
      lateRate,
      pendingTeachersCount: pendingTeachers.length,
      aspectRatio: '4:5',
      style: 'official_science',
    }),
    [
      activeTermLabel,
      selectedDocTypes,
      areaStats,
      totalTeachersCount,
      submittedTeachers,
      submissionRate,
      onTimeRate,
      lateRate,
      pendingTeachers,
    ]
  );

  const handleInstantCopyPrompt = async () => {
    try {
      const text = generateEnglishInfographicPrompt(promptPayload);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyToastMessage('คัดลอก Prompt สถิติจริงเรียบร้อยแล้ว');
      setTimeout(() => setCopyToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setIsInfographicModalOpen(true);
    }
  };

  // Filtered + Priority-sorted teachers (Pending first -> Late -> On-time)
  const filteredTeachers = useMemo(() => {
    const list = teachingStaff.filter((teacher) => {
      if (!isAllAreas && !selectedAreas.includes(teacher.Learning_Area)) {
        return false;
      }

      const teacherPlans = activePlans.filter((p) => p.teacher_id === teacher.Teacher_ID);
      const hasSubmitted = teacherPlans.length > 0;
      const hasLate = teacherPlans.some((p) => p.is_late);

      if (selectedStatus === 'ontime' && (!hasSubmitted || hasLate)) return false;
      if (selectedStatus === 'late' && !hasLate) return false;
      if (selectedStatus === 'pending' && hasSubmitted) return false;

      if (searchTeacher.trim()) {
        const q = searchTeacher.toLowerCase();
        const matchName = teacher.Name.toLowerCase().includes(q);
        const matchId = teacher.Teacher_ID.toLowerCase().includes(q);
        const matchArea = teacher.Learning_Area.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchArea) return false;
      }

      return true;
    });

    // Always surface Pending -> Late -> On-time so urgent follow-ups are visible first
    return list.sort((a, b) => {
      const aPlans = activePlans.filter((p) => p.teacher_id === a.Teacher_ID);
      const bPlans = activePlans.filter((p) => p.teacher_id === b.Teacher_ID);
      const rankOf = (tPlans: LessonPlan[]) => {
        if (tPlans.length === 0) return 0; // Pending first
        if (tPlans.some((p) => p.is_late)) return 1; // Late second
        return 2; // On-time third
      };
      const diff = rankOf(aPlans) - rankOf(bPlans);
      if (diff !== 0) return diff;
      return a.Name.localeCompare(b.Name, 'th');
    });
  }, [teachingStaff, activePlans, isAllAreas, selectedAreas, selectedStatus, searchTeacher]);

  const individualCounts = useMemo(() => {
    let pending = 0;
    let ontime = 0;
    let late = 0;

    teachingStaff.forEach((t) => {
      if (!isAllAreas && !selectedAreas.includes(t.Learning_Area)) return;
      const tPlans = activePlans.filter((p) => p.teacher_id === t.Teacher_ID);
      if (tPlans.length === 0) {
        pending++;
      } else if (tPlans.some((p) => p.is_late)) {
        late++;
      } else {
        ontime++;
      }
    });

    const total = isAllAreas
      ? teachingStaff.length
      : teachingStaff.filter((t) => selectedAreas.includes(t.Learning_Area)).length;

    return { total, pending, ontime, late };
  }, [teachingStaff, activePlans, isAllAreas, selectedAreas]);

  const handleSendReminder = (teacherId: string) => {
    setReminderSentMap((prev) => ({ ...prev, [teacherId]: true }));
  };

  const selectedDetailTeacher = useMemo(
    () => teachers.find((t) => t.Teacher_ID === selectedDetailTeacherId) || null,
    [teachers, selectedDetailTeacherId]
  );

  const selectedDetailPlans = useMemo(() => {
    if (!selectedDetailTeacher) return [];
    return activePlans.filter((p) => p.teacher_id === selectedDetailTeacher.Teacher_ID);
  }, [selectedDetailTeacher, activePlans]);

  const hasActiveFilter = !isAllDocTypes || !isAllAreas || selectedStatus !== 'all' || Boolean(searchTeacher.trim());

  const completedDeptNames = useMemo(
    () => allAreaStats.filter((a) => a.isCompleted).map((a) => shortAreaLabel(a.name)),
    [allAreaStats]
  );
  const topPendingDept = useMemo(
    () => [...allAreaStats].sort((a, b) => b.pendingTeachers - a.pendingTeachers)[0],
    [allAreaStats]
  );

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Backdrop to close dropdown popovers */}
      {(isDocTypeDropdownOpen || isSecondaryMenuOpen) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setIsDocTypeDropdownOpen(false);
            setIsSecondaryMenuOpen(false);
          }}
        />
      )}

      {/* TOP COCKPIT BAR: Single compact row combining Title, Mode Switcher, Primary Filter & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        {/* Left: Plain Title + Inline Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
            ติดตามการส่งเอกสารวิชาการ
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span>{activeTermLabel}</span>
            <span aria-hidden="true">·</span>
            <span>ครู {totalTeachersCount} ท่าน</span>
            <span aria-hidden="true">·</span>
            <span>ส่งแล้ว {totalPlansCount} ฉบับ</span>
          </div>
        </div>

        {/* Center/Right Controls: Mode Tabs + Doc Filter + Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Clean Segmented Mode Switcher (Plain Thai Labels) */}
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleModeChange('standard')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentMode === 'standard'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-700" />
              <span>ภาพรวมหน้าเดียว</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('ranking')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentMode === 'ranking'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>จัดอันดับกลุ่มสาระ</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('ddo')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentMode === 'ddo'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
              <span>วิเคราะห์เชิงลึก</span>
            </button>
          </div>

          {/* Document Type Filter Dropdown (in standard mode) */}
          {currentMode === 'standard' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen);
                  setIsSecondaryMenuOpen(false);
                }}
                className={`h-8 px-2.5 text-xs font-semibold border rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  !isAllDocTypes
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="max-w-[130px] truncate">
                  {isAllDocTypes
                    ? 'เอกสาร: ทุกประเภท'
                    : selectedDocTypes.length === 1
                    ? shortDocTypeLabel(selectedDocTypes[0])
                    : `เลือก ${selectedDocTypes.length} ประเภท`}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDocTypeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-2">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-xs">
                    <span className="font-semibold text-slate-800">กรองตามประเภทเอกสาร</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDocTypes(['ทั้งหมด'])}
                      className="text-indigo-600 hover:underline font-medium cursor-pointer"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5 pt-1">
                    {docTypes.map((dt) => {
                      const isSelected =
                        dt === 'ทั้งหมด' ? isAllDocTypes : !isAllDocTypes && selectedDocTypes.includes(dt);
                      const count =
                        dt === 'ทั้งหมด' ? plans.length : plans.filter((p) => matchesDocType(p, dt)).length;

                      return (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => toggleDocType(dt)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <div
                              className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{dt === 'ทั้งหมด' ? 'ทุกประเภทเอกสาร' : dt}</span>
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-slate-400">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset Filters Button (only when filtered) */}
          {currentMode === 'standard' && hasActiveFilter && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-8 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
              title="ล้างตัวกรองทั้งหมดกลับเป็นภาพรวมทั้งโรงเรียน"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}

          {/* Primary Action: Print Official Report */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>

          {/* Secondary Executive Tools Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSecondaryMenuOpen(!isSecondaryMenuOpen);
                setIsDocTypeDropdownOpen(false);
              }}
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer whitespace-nowrap ${
                isSecondaryMenuOpen
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title="เครื่องมือผู้บริหารเพิ่มเติม"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">เพิ่มเติม</span>
            </button>

            {isSecondaryMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-1.5 text-xs divide-y divide-slate-100">
                <div className="space-y-0.5 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsIndividualPrintModalOpen(true);
                      setIsSecondaryMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-slate-700"
                  >
                    <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">พิมพ์สรุปรายบุคคล</div>
                      <div className="text-[11px] text-slate-500">ใบติดตามการส่งรายชื่อครู</div>
                    </div>
                  </button>

                  {onOpenReviewerWorkload && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenReviewerWorkload();
                        setIsSecondaryMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-slate-700"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900">เช็กภาระงานผู้ตรวจ</div>
                        <div className="text-[11px] text-slate-500">ดูยอดตรวจจริงและคิวรอตรวจ</div>
                      </div>
                    </button>
                  )}

                  {onOpenDeadlineManager && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDeadlineManager();
                        setIsSecondaryMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-slate-700"
                    >
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900">กำหนดส่ง &amp; จัดการสถานะ</div>
                        <div className="text-[11px] text-slate-500">ตั้งค่าเดดไลน์เอกสารแต่ละชนิด</div>
                      </div>
                    </button>
                  )}

                  {onOpenDirectoryModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDirectoryModal();
                        setIsSecondaryMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-slate-700"
                    >
                      <Users className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900">ทำเนียบบุคลากร ({teachingStaff.length} ท่าน)</div>
                        <div className="text-[11px] text-slate-500">รายชื่อครูและกลุ่มสาระทั้งหมด</div>
                      </div>
                    </button>
                  )}
                </div>

                <div className="pt-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleInstantCopyPrompt();
                      setIsSecondaryMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-slate-700"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">คัดลอก Prompt ทำอินโฟกราฟิก AI</div>
                      <div className="text-[11px] text-slate-500">ส่งสถิติจริงไปสร้างภาพสรุปทันที</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODE ROUTING: DDO / Ranking / Standard 1-Screen Cockpit */}
      {currentMode === 'ddo' ? (
        <DataDrivenOrgView
          teachers={teachers}
          plans={plans}
          currentTeacher={currentTeacher}
          deadlineConfigs={deadlineConfigs}
          onOpenPlan={onOpenPlan}
          onOpenDirectoryModal={onOpenDirectoryModal}
        />
      ) : currentMode === 'ranking' ? (
        <DepartmentRankingLeaderboard
          teachers={teachers}
          plans={plans}
          deadlineConfigs={deadlineConfigs}
          onOpenPlan={onOpenPlan}
        />
      ) : (
        /* STANDARD 1-SCREEN COCKPIT: Fits inside desktop viewport without outer vertical scrolling */
        <div className="flex flex-col gap-2.5 lg:h-[calc(100vh-200px)] lg:min-h-[470px] lg:max-h-[720px]">
          {/* ROW 1: 4 Interactive KPI Summary Cards (1 Big Metric + 1 Plain Subtitle each) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            {/* KPI 1: Overall Submission */}
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`text-left bg-white rounded-xl p-3.5 border transition-colors cursor-pointer ${
                selectedStatus === 'all'
                  ? 'border-slate-300 ring-1 ring-slate-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">
                  ส่งงานแล้ว{!isAllAreas ? ` (${shortAreaLabel(selectedAreas[0])})` : 'ทั้งโรงเรียน'}
                </span>
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                  <AnimatedCounter value={submissionRate} suffix="%" />
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {submittedTeachers.length}/{totalTeachersCount} ท่าน
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${submissionRate}%` }}
                />
              </div>
            </button>

            {/* KPI 2: Timeliness */}
            <button
              type="button"
              onClick={() => setSelectedStatus((prev) => (prev === 'ontime' ? 'late' : 'ontime'))}
              className={`text-left bg-white rounded-xl p-3.5 border transition-colors cursor-pointer ${
                selectedStatus === 'ontime' || selectedStatus === 'late'
                  ? 'border-emerald-400 ring-1 ring-emerald-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              title="คลิกเพื่อสลับกรองดูครูที่ส่งตรงเวลา / ส่งช้า"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">ส่งตรงเวลา</span>
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-emerald-700">
                  <AnimatedCounter value={onTimeRate} suffix="%" />
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  ตรงเวลา {onTimePlans.length} · ช้า {latePlans.length} ฉบับ
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden flex">
                <div
                  className="bg-emerald-600 h-1.5 transition-all duration-500"
                  style={{ width: `${onTimeRate}%` }}
                />
                <div
                  className="bg-amber-500 h-1.5 transition-all duration-500"
                  style={{ width: `${lateRate}%` }}
                />
              </div>
            </button>

            {/* KPI 3: Pending / Action Required */}
            <button
              type="button"
              onClick={() => setSelectedStatus((prev) => (prev === 'pending' ? 'all' : 'pending'))}
              className={`text-left bg-white rounded-xl p-3.5 border transition-colors cursor-pointer ${
                selectedStatus === 'pending'
                  ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/30'
                  : 'border-slate-200 hover:border-rose-300'
              }`}
              title="คลิกเพื่อแสดงเฉพาะรายชื่อครูที่ยังไม่ส่ง"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">ยังไม่ส่ง (ต้องติดตาม)</span>
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    pendingTeachers.length > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold tabular-nums tracking-tight ${
                    pendingTeachers.length > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  <AnimatedCounter value={pendingTeachers.length} suffix=" ท่าน" />
                </span>
                <span className="text-xs text-slate-500">
                  {pendingTeachers.length > 0
                    ? selectedStatus === 'pending'
                      ? 'กำลังแสดงเฉพาะผู้ค้างส่ง'
                      : 'คลิกเพื่อดูรายชื่อ'
                    : 'ส่งครบทุกคนแล้ว'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    pendingTeachers.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width:
                      totalTeachersCount > 0
                        ? `${Math.round((pendingTeachers.length / totalTeachersCount) * 100) || 100}%`
                        : '0%',
                  }}
                />
              </div>
            </button>

            {/* KPI 4: Reviewed & Approved */}
            <button
              type="button"
              onClick={() => {
                if (onOpenReviewerWorkload) onOpenReviewerWorkload();
              }}
              className="text-left bg-white rounded-xl p-3.5 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
              title="คลิกเพื่อดูรายละเอียดภาระงานผู้ตรวจ"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">ตรวจอนุมัติแล้ว</span>
                <UserCheck className="w-4 h-4 text-slate-600 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                  {approvedPlansCount}
                  <span className="text-sm font-medium text-slate-400"> / {totalPlansCount}</span>
                </span>
                <span className="text-xs text-slate-500 tabular-nums">ฉบับ</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>รอตรวจ {pendingReviewPlansCount} ฉบับ</span>
                <span>คะแนนเฉลี่ย {avgScore !== '-' ? `${avgScore}/100` : 'รอประเมิน'}</span>
              </div>
            </button>
          </div>

          {/* ROW 2: Main 2-Column Single-Screen Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
            {/* LEFT COLUMN (~42%): All 8 Learning Areas Comparison (No Chart Noise, Click to Filter) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    ความคืบหน้า 8 กลุ่มสาระ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    คลิกชื่อกลุ่มสาระเพื่อเจาะดูรายชื่อครูฝั่งขวา
                  </p>
                </div>
                {!isAllAreas && (
                  <button
                    type="button"
                    onClick={() => setSelectedAreas(['ทั้งหมด'])}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer shrink-0"
                  >
                    แสดงครบ 8 สาระ
                  </button>
                )}
              </div>

              {/* 8 Departments Progress List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {allAreaStats.map((stat, idx) => {
                  const isSelected = !isAllAreas && selectedAreas.includes(stat.name);
                  const barColor =
                    stat.submissionRate === 100
                      ? 'bg-emerald-600'
                      : stat.submissionRate >= 70
                      ? 'bg-indigo-600'
                      : stat.submissionRate >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500';

                  return (
                    <button
                      key={stat.name}
                      type="button"
                      onClick={() => toggleArea(stat.name)}
                      className={`w-full px-3.5 py-2 text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                        isSelected ? 'bg-indigo-50/80 ring-1 ring-inset ring-indigo-300' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {shortAreaLabel(stat.name)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-[11px] tabular-nums">
                          {stat.isCompleted ? (
                            <span className="font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ครบ 100%</span>
                            </span>
                          ) : (
                            <span
                              className={`font-semibold ${
                                stat.pendingTeachers > 0 ? 'text-rose-600' : 'text-amber-700'
                              }`}
                            >
                              ค้าง {stat.pendingTeachers} ท่าน
                            </span>
                          )}
                          <span className="font-mono font-bold text-slate-900 w-9 text-right">
                            {stat.submissionRate}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 pl-6">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${stat.submissionRate}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                          {stat.submittedTeachers}/{stat.totalTeachers}
                          {stat.latePlans > 0 ? ` · ช้า ${stat.latePlans}` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 1-Line Plain Executive Takeaway Footer */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-600 shrink-0 truncate">
                {completedDeptNames.length === allAreaStats.length && allAreaStats.length > 0 ? (
                  <span className="text-emerald-700 font-semibold">
                    ส่งครบ 100% ครบทุกกลุ่มสาระการเรียนรู้แล้ว
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">สรุปเร็ว: </span>
                    {completedDeptNames.length > 0
                      ? `ครบแล้ว ${completedDeptNames.length} สาระ`
                      : 'ยังไม่มีสาระที่ครบ 100%'}
                    {topPendingDept && topPendingDept.pendingTeachers > 0
                      ? ` · ต้องเร่งติดตามที่ ${shortAreaLabel(topPendingDept.name)} (ค้าง ${topPendingDept.pendingTeachers} ท่าน)`
                      : ''}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (~58%): Document Progress Strip + Priority-Sorted Teacher List */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 flex flex-col min-h-0 overflow-hidden">
              {/* Top Strip: Document Types Overview (Click to filter by Doc Type) */}
              {docTypeStats.length > 0 && (
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">
                      ความคืบหน้าแยกตามประเภทเอกสาร (คลิกเพื่อกรอง)
                    </span>
                    {!isAllDocTypes && (
                      <button
                        type="button"
                        onClick={() => setSelectedDocTypes(['ทั้งหมด'])}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        ดูทุกประเภท
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {docTypeStats.map((dt) => {
                      const isActive =
                        !isAllDocTypes && selectedDocTypes.length === 1 && selectedDocTypes[0] === dt.name;
                      return (
                        <button
                          key={dt.name}
                          type="button"
                          onClick={() => selectSingleOrToggleDocType(dt.name)}
                          className={`text-left px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-950'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                          }`}
                          title={dt.name}
                        >
                          <div className="text-[11px] font-semibold truncate">{dt.shortName}</div>
                          <div className="flex items-baseline justify-between gap-1 mt-0.5 tabular-nums">
                            <span className="text-sm font-bold text-slate-900">{dt.rate}%</span>
                            <span className="text-[10px] text-slate-500">{dt.planCount} ฉบับ</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Teacher Table Filter Controls */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200/70 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      selectedStatus === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({individualCounts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('pending')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      selectedStatus === 'pending'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    ยังไม่ส่ง ({individualCounts.pending})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('late')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      selectedStatus === 'late'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    ส่งช้า ({individualCounts.late})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('ontime')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      selectedStatus === 'ontime'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    ตรงเวลา ({individualCounts.ontime})
                  </button>
                </div>

                {/* Compact Search */}
                <div className="relative w-full sm:w-48 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อครู..."
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {searchTeacher && (
                    <button
                      type="button"
                      onClick={() => setSearchTeacher('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Teacher List (Internal Scroll Only) */}
              <div className="flex-1 overflow-y-auto">
                {filteredTeachers.length === 0 ? (
                  <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      ไม่พบรายชื่อครูตามเงื่อนไขที่เลือก
                    </p>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="mt-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      ดูรายชื่อทั้งหมด
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 z-10">
                      <tr>
                        <th className="py-2 px-3.5">ครูผู้สอน · กลุ่มสาระ</th>
                        <th className="py-2 px-2.5 text-center w-24">สถานะ</th>
                        <th className="py-2 px-2.5 text-right w-20">จำนวน</th>
                        <th className="py-2 px-3.5 text-right w-24">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTeachers.map((teacher) => {
                        const teacherPlans = activePlans.filter((p) => p.teacher_id === teacher.Teacher_ID);
                        const hasSubmitted = teacherPlans.length > 0;
                        const hasLate = teacherPlans.some((p) => p.is_late);
                        const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
                        const isReminderSent = !!reminderSentMap[teacher.Teacher_ID];
                        const scoredPlans = teacherPlans.filter(
                          (p) => typeof p.total_score === 'number' && p.total_score > 0
                        );
                        const teacherAvgScore =
                          scoredPlans.length > 0
                            ? (
                                scoredPlans.reduce((acc, p) => acc + (p.total_score || 0), 0) /
                                scoredPlans.length
                              ).toFixed(0)
                            : null;

                        return (
                          <tr
                            key={teacher.Teacher_ID}
                            onClick={() => {
                              if (hasSubmitted) setSelectedDetailTeacherId(teacher.Teacher_ID);
                            }}
                            className={`transition-colors ${
                              hasSubmitted ? 'hover:bg-slate-50 cursor-pointer' : 'bg-rose-50/20 hover:bg-rose-50/40'
                            }`}
                          >
                            {/* Teacher Name & Dept */}
                            <td className="py-2 px-3.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                  {photoUrl ? (
                                    <img
                                      src={photoUrl}
                                      alt={teacher.Name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-600">
                                      {getInitials(teacher.Name)}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">{teacher.Name}</div>
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {shortAreaLabel(teacher.Learning_Area)}
                                    {teacherAvgScore && ` · คะแนนเฉลี่ย ${teacherAvgScore}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Traffic-Light Status */}
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              {!hasSubmitted ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>ยังไม่ส่ง</span>
                                </span>
                              ) : hasLate ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>ส่งช้า</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ตรงเวลา</span>
                                </span>
                              )}
                            </td>

                            {/* Submitted Count */}
                            <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {hasSubmitted ? `${teacherPlans.length} ฉบับ` : '-'}
                            </td>

                            {/* Quick Action */}
                            <td className="py-2 px-3.5 text-right whitespace-nowrap">
                              {hasSubmitted ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailTeacherId(teacher.Teacher_ID);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>ดูเอกสาร</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendReminder(teacher.Teacher_ID);
                                  }}
                                  disabled={isReminderSent}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                                    isReminderSent
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                                  }`}
                                  title="ส่งการแจ้งเตือนครูท่านนี้"
                                >
                                  <BellRing className="w-3 h-3" />
                                  <span>{isReminderSent ? 'เตือนแล้ว' : 'แจ้งเตือน'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER DETAIL POPUP: Clean Drill-Down Modal when clicking any teacher row */}
      {selectedDetailTeacher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedDetailTeacherId(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {selectedDetailTeacher.Name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDetailTeacher.Learning_Area} · ส่งแล้ว {selectedDetailPlans.length} ฉบับ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailTeacherId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
              {selectedDetailPlans.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  ยังไม่มีเอกสารส่งเข้ามาในเงื่อนไขที่เลือก
                </div>
              ) : (
                selectedDetailPlans.map((plan) => {
                  const resolvedUrl = resolvePrimaryPlanFileUrl(plan);
                  return (
                    <div
                      key={plan.id}
                      className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                          <span className="truncate">
                            {plan.subject_code} {plan.subject_name || plan.plan_title}
                          </span>
                          <span className={plan.is_late ? 'text-amber-700 shrink-0' : 'text-emerald-700 shrink-0'}>
                            {plan.is_late ? '· ส่งช้า' : '· ตรงเวลา'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {plan.plan_type} · ส่งเมื่อ{' '}
                          {new Date(plan.submitted_at).toLocaleDateString('th-TH')}
                          {typeof plan.total_score === 'number' && ` · คะแนน ${plan.total_score}/100`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isValidHttpFileUrl(resolvedUrl) && (
                          <a
                            href={resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>เปิดไฟล์</span>
                          </a>
                        )}
                        {onOpenPlan && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDetailTeacherId(null);
                              onOpenPlan(plan);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{plan.status === 'submitted' ? 'ตรวจอนุมัติ' : 'ดูผลตรวจ'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE EXECUTIVE REPORT MODAL */}
      <PrintModalShell
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="รายงานสรุปผู้บริหาร (สำหรับพิมพ์ / บันทึก PDF)"
        subtitle={`โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ • ${activeTermLabel}`}
        icon={<Printer className="w-4 h-4" />}
      >
        <div className="space-y-6 text-slate-900 bg-white">
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
            <img
              src="/logo.svg"
              alt="โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
              className="h-20 mx-auto object-contain"
            />
            <h1 className="text-xl font-bold tracking-tight">
              รายงานสรุปผลการส่งและประเมินคุณภาพแผนการจัดการเรียนรู้
            </h1>
            <p className="text-sm font-semibold text-slate-700">
              โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </p>
            <p className="text-xs text-slate-500">
              {activeTermLabel} • เอกสารสำหรับฝ่ายบริหารและคณะกรรมการสถานศึกษา
            </p>
            <p className="text-xs text-slate-400">
              วันที่ออกรายงาน:{' '}
              {new Date().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-slate-200 pb-6 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-500">จำนวนครูทั้งหมด</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{totalTeachersCount} ท่าน</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-500">ส่งแผนแล้ว</div>
              <div className="text-xl font-bold text-indigo-600 mt-1 tabular-nums">
                {submittedTeachers.length} ({submissionRate}%)
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-500">ส่งตรงเวลา</div>
              <div className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">
                {onTimePlans.length} ({onTimeRate}%)
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-500">คะแนนเฉลี่ยรวม</div>
              <div className="text-xl font-bold text-amber-600 mt-1 tabular-nums">{avgScore} / 100</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">
              1. ตารางสรุปการส่งงานจำแนกตามกลุ่มสาระการเรียนรู้
            </h3>
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th className="p-2 border-r border-slate-300">กลุ่มสาระการเรียนรู้</th>
                  <th className="p-2 text-center border-r border-slate-300">จำนวนครู</th>
                  <th className="p-2 text-center border-r border-slate-300">ส่งแล้ว</th>
                  <th className="p-2 text-center border-r border-slate-300">% ความสำเร็จ</th>
                  <th className="p-2 text-center border-r border-slate-300">ตรงเวลา</th>
                  <th className="p-2 text-center border-r border-slate-300">ส่งช้า</th>
                  <th className="p-2 text-center">คะแนนเฉลี่ย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 tabular-nums">
                {areaStats.map((stat) => (
                  <tr key={stat.name} className="page-break-avoid">
                    <td className="p-2 border-r border-slate-200 font-medium">{stat.name}</td>
                    <td className="p-2 text-center border-r border-slate-200">{stat.totalTeachers}</td>
                    <td className="p-2 text-center border-r border-slate-200">{stat.submittedTeachers}</td>
                    <td className="p-2 text-center border-r border-slate-200 font-bold">{stat.submissionRate}%</td>
                    <td className="p-2 text-center border-r border-slate-200 text-emerald-700">{stat.onTimePlans}</td>
                    <td className="p-2 text-center border-r border-slate-200 text-amber-700">{stat.latePlans}</td>
                    <td className="p-2 text-center font-bold">{stat.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pendingTeachers.length > 0 && (
            <div className="space-y-2 pt-2 page-break-avoid">
              <h3 className="text-sm font-bold text-rose-800">
                2. รายชื่อครูผู้สอนที่ยังค้างส่งแผนการจัดการเรียนรู้ ({pendingTeachers.length} ท่าน)
              </h3>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                {pendingTeachers.map((t, i) => (
                  <div key={t.Teacher_ID} className="flex items-center justify-between">
                    <span>
                      {i + 1}. {t.Name} ({t.Teacher_ID})
                    </span>
                    <span className="font-medium text-rose-700">{t.Learning_Area}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs page-break-avoid">
            <div className="space-y-14">
              <p>ลงชื่อ............................................................</p>
              <div>
                <p className="font-bold">({currentTeacher.Name})</p>
                <p className="text-slate-500 mt-1">ผู้จัดทำรายงาน / ฝ่ายบริหารสถานศึกษา</p>
              </div>
            </div>

            <div className="space-y-14">
              <p>ลงชื่อ............................................................</p>
              <div>
                <p className="font-bold">(ผู้อำนวยการสถานศึกษา)</p>
                <p className="text-slate-500 mt-1">ผู้อำนวยการโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
              </div>
            </div>
          </div>
        </div>
      </PrintModalShell>

      {/* MODAL: Printable Individual Tracker Summary */}
      <IndividualTrackerPrintModal
        isOpen={isIndividualPrintModalOpen}
        onClose={() => setIsIndividualPrintModalOpen(false)}
        teachers={teachers}
        plans={plans}
        deadlineConfigs={deadlineConfigs}
        currentTeacher={currentTeacher}
        initialArea={selectedAreas.length === 1 ? selectedAreas[0] : 'ทั้งหมด'}
        initialStatus={selectedStatus}
      />

      {/* MODAL: AI Infographic Prompt Generator */}
      <InfographicPromptModal
        isOpen={isInfographicModalOpen}
        onClose={() => setIsInfographicModalOpen(false)}
        payload={promptPayload}
      />

      {/* FLOATING TOAST */}
      {copyToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-bold">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>{copyToastMessage}</span>
          <button
            type="button"
            onClick={() => setIsInfographicModalOpen(true)}
            className="ml-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-indigo-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            ดูข้อความ
          </button>
        </div>
      )}
    </div>
  );
};
