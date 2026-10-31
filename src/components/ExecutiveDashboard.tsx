import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, LessonPlan, isTeacherAdmin, PlanTypeDeadlineConfig } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import { getSavedDeadlineConfigs } from '../utils/deadlineUtils';
import { DataDrivenOrgView } from './DataDrivenOrgView';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Users,
  Search,
  Filter,
  Printer,
  ChevronRight,
  ShieldCheck,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
  BellRing,
  Download,
  Info,
  Layers,
  ArrowUpRight,
  X,
  FileCheck2,
  BrainCircuit,
  Trophy,
  Table as TableIcon,
  LayoutGrid,
  ChevronDown,
  CheckSquare,
  Square,
  Check,
  Eye,
  Copy,
  MoreHorizontal,
  UserCheck,
} from 'lucide-react';
import { DepartmentRankingLeaderboard } from './DepartmentRankingLeaderboard';
import { IndividualTrackerPrintModal } from './IndividualTrackerPrintModal';
import { InfographicPromptModal } from './InfographicPromptModal';
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
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [individualViewMode, setIndividualViewMode] = useState<'table' | 'cards'>('table');
  const [isIndividualPrintModalOpen, setIsIndividualPrintModalOpen] = useState(false);
  const [isInfographicModalOpen, setIsInfographicModalOpen] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);

  // Popover state for multi-select dropdowns & secondary actions
  const [isDocTypeDropdownOpen, setIsDocTypeDropdownOpen] = useState<boolean>(false);
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState<boolean>(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState<boolean>(false);

  // Graph 1 View Mode: 'by_doctype' (คนละประเภทเอกสารคนละสีคนละแท่ง) vs 'by_timeliness' (สรุปสัดส่วนตรงเวลา/ล่าช้า)
  const [graph1ViewMode, setGraph1ViewMode] = useState<'by_doctype' | 'by_timeliness'>('by_doctype');

  // Teaching staff (excluding admins)
  const teachingStaff = useMemo(() => {
    return teachers.filter((t) => !isTeacherAdmin(t));
  }, [teachers]);

  const areas = [
    'ทั้งหมด',
    'วิทยาศาสตร์และเทคโนโลยี',
    'คณิตศาสตร์',
    'ภาษาต่างประเทศ',
    'ภาษาไทย',
    'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'ศิลปะ',
    'สุขศึกษาและพลศึกษา',
    'การงานอาชีพ',
  ];

  // Dynamic document types based on deadline configs + plans
  const docTypes = useMemo(() => {
    const list: string[] = ['ทั้งหมด'];
    const seen = new Set<string>();

    // 1. Types from deadline settings configured by academic admin (synced from Cloud/state)
    const activeDeadlines = deadlineConfigs && deadlineConfigs.length > 0 ? deadlineConfigs : getSavedDeadlineConfigs();
    activeDeadlines.forEach((cfg) => {
      const name = (cfg.name || '').trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push(name);
      }
    });

    // 2. Types from actual submitted plans
    plans.forEach((p) => {
      if (p.plan_type && !seen.has(p.plan_type.trim())) {
        seen.add(p.plan_type.trim());
        list.push(p.plan_type.trim());
      }
    });

    // 3. Fallback standard academic document types if not already included
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
  const activeTypesForBars = useMemo(() => {
    if (isAllDocTypes) return allRealDocTypes;
    return allRealDocTypes.filter((dt) => selectedDocTypes.includes(dt));
  }, [isAllDocTypes, allRealDocTypes, selectedDocTypes]);

  // Multi-select handlers for Document Types
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

  const selectAllDocTypes = () => setSelectedDocTypes(['ทั้งหมด']);
  const clearDocTypes = () => setSelectedDocTypes(['ทั้งหมด']);

  // Multi-select handlers for Learning Areas
  const toggleArea = (area: string) => {
    if (area === 'ทั้งหมด') {
      setSelectedAreas(['ทั้งหมด']);
      return;
    }
    const realAreas = areas.filter((a) => a !== 'ทั้งหมด');
    let next: string[];
    if (isAllAreas) {
      next = [area];
    } else if (selectedAreas.includes(area)) {
      next = selectedAreas.filter((a) => a !== area);
      if (next.length === 0) next = ['ทั้งหมด'];
    } else {
      next = [...selectedAreas.filter((a) => a !== 'ทั้งหมด'), area];
      if (next.length === realAreas.length) next = ['ทั้งหมด'];
    }
    setSelectedAreas(next);
  };

  const selectAllAreas = () => setSelectedAreas(['ทั้งหมด']);
  const clearAreas = () => setSelectedAreas(['ทั้งหมด']);

  // Filtered plans based on multi-selected docTypes
  const activePlans = useMemo(() => {
    if (isAllDocTypes) return plans;
    return plans.filter((p) => {
      const pType = (p.plan_type || '').trim();
      return selectedDocTypes.some((selected) => {
        if (selected === pType) return true;
        if (
          selected === 'แผนการจัดการเรียนรู้' &&
          (pType.includes('แผนการจัดการเรียนรู้') || !pType)
        ) {
          return true;
        }
        return false;
      });
    });
  }, [plans, selectedDocTypes, isAllDocTypes]);

  // Scoped teaching staff according to multi-selected areas
  const scopedTeachingStaff = useMemo(() => {
    if (isAllAreas) return teachingStaff;
    return teachingStaff.filter((t) => selectedAreas.includes(t.Learning_Area));
  }, [teachingStaff, isAllAreas, selectedAreas]);

  // Overall Statistics for scoped staff
  const totalTeachersCount = scopedTeachingStaff.length;

  // Teachers who submitted at least 1 plan
  const submittedTeachers = useMemo(() => {
    return scopedTeachingStaff.filter((t) => activePlans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [scopedTeachingStaff, activePlans]);

  // Teachers who have not submitted any plan
  const pendingTeachers = useMemo(() => {
    return scopedTeachingStaff.filter((t) => !activePlans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [scopedTeachingStaff, activePlans]);

  // Submission rate %
  const submissionRate = totalTeachersCount > 0
    ? Math.round((submittedTeachers.length / totalTeachersCount) * 100)
    : 0;

  // On-time vs Late plans within scoped areas & doc types
  const scopedPlans = useMemo(() => {
    if (isAllAreas) return activePlans;
    return activePlans.filter((p) => selectedAreas.includes(p.learning_area || ''));
  }, [activePlans, isAllAreas, selectedAreas]);

  const totalPlansCount = scopedPlans.length;
  const onTimePlans = scopedPlans.filter((p) => !p.is_late);
  const latePlans = scopedPlans.filter((p) => p.is_late);

  const onTimeRate = totalPlansCount > 0
    ? Math.round((onTimePlans.length / totalPlansCount) * 100)
    : 0;
  const lateRate = totalPlansCount > 0
    ? Math.round((latePlans.length / totalPlansCount) * 100)
    : 0;

  // Average Score across school (from real evaluated plans only)
  const plansWithScore = scopedPlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
  const avgScore = plansWithScore.length > 0
    ? (plansWithScore.reduce((acc, p) => acc + (p.total_score || 0), 0) / plansWithScore.length).toFixed(1)
    : '-';

  // Area statistics breakdown (dynamically filtered by multi-selected areas!)
  const areaStats = useMemo(() => {
    const list = areas.filter((a) => a !== 'ทั้งหมด');
    const targetAreas = isAllAreas ? list : list.filter((a) => selectedAreas.includes(a));

    return targetAreas.map((area) => {
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

      const rate = areaTeachers.length > 0
        ? Math.round((submittedAreaTeachers.length / areaTeachers.length) * 100)
        : 0;

      const scored = areaPlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
      const areaAvgScore = scored.length > 0
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
    }).sort((a, b) => b.submissionRate - a.submissionRate);
  }, [areas, teachingStaff, activePlans, isAllAreas, selectedAreas]);

  // Payload for AI Infographic Prompt Generator (grounded in real school data)
  const promptPayload: InfographicPromptPayload = useMemo(() => ({
    schoolNameTh: 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์',
    schoolNameEn: 'Princess Chulabhorn Science High School Kalasin',
    academicYear: 'ปีการศึกษา 2568',
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
  }), [selectedDocTypes, areaStats, totalTeachersCount, submittedTeachers, submissionRate, onTimeRate, lateRate, pendingTeachers]);

  // 1-Click Instant Copy Handler for AI Infographic Prompt
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
      setCopyToastMessage('คัดลอก Prompt สำหรับ AI เจนอินโฟกราฟิกเรียบร้อยแล้ว!');
      setTimeout(() => setCopyToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setIsInfographicModalOpen(true);
    }
  };

  // Score distribution tiers
  const scoreDistribution = useMemo(() => {
    const excellent = plansWithScore.filter((p) => (p.total_score || 0) >= 90).length;
    const veryGood = plansWithScore.filter((p) => (p.total_score || 0) >= 80 && (p.total_score || 0) < 90).length;
    const good = plansWithScore.filter((p) => (p.total_score || 0) >= 70 && (p.total_score || 0) < 80).length;
    const needsImprovement = plansWithScore.filter((p) => (p.total_score || 0) < 70).length;
    const totalScored = plansWithScore.length;

    return {
      excellent,
      veryGood,
      good,
      needsImprovement,
      totalScored,
      excellentPct: totalScored > 0 ? Math.round((excellent / totalScored) * 100) : 0,
      veryGoodPct: totalScored > 0 ? Math.round((veryGood / totalScored) * 100) : 0,
      goodPct: totalScored > 0 ? Math.round((good / totalScored) * 100) : 0,
      needsImprovementPct: totalScored > 0 ? Math.round((needsImprovement / totalScored) * 100) : 0,
    };
  }, [plansWithScore]);

  // Filtered teachers list for Individual tracking
  const filteredTeachers = useMemo(() => {
    return teachingStaff.filter((teacher) => {
      // Area filter (multi-select)
      if (!isAllAreas && !selectedAreas.includes(teacher.Learning_Area)) {
        return false;
      }

      const teacherPlans = activePlans.filter((p) => p.teacher_id === teacher.Teacher_ID);
      const hasSubmitted = teacherPlans.length > 0;
      const hasLate = teacherPlans.some((p) => p.is_late);

      // Status filter
      if (selectedStatus === 'ontime' && (!hasSubmitted || hasLate)) return false;
      if (selectedStatus === 'late' && !hasLate) return false;
      if (selectedStatus === 'pending' && hasSubmitted) return false;

      // Search filter
      if (searchTeacher.trim()) {
        const q = searchTeacher.toLowerCase();
        const matchName = teacher.Name.toLowerCase().includes(q);
        const matchId = teacher.Teacher_ID.toLowerCase().includes(q);
        const matchArea = teacher.Learning_Area.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchArea) return false;
      }

      return true;
    });
  }, [teachingStaff, activePlans, isAllAreas, selectedAreas, selectedStatus, searchTeacher]);

  // Counts for individual tracking status tabs
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

  const handleSendReminder = (teacherId: string, teacherName: string) => {
    setReminderSentMap((prev) => ({ ...prev, [teacherId]: true }));
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      {/* Executive Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 shadow-lg border border-indigo-900/50">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ศูนย์บัญชาการข้อมูลผู้บริหาร • Executive Analytics</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>แดชบอร์ดติดตามและประเมินผลฝ่ายบริหาร</span>
            </h2>
            <p className="text-indigo-200/90 text-xs max-w-xl leading-relaxed">
              ภาพรวมการส่งเอกสารวิชาการ วิเคราะห์ความตรงต่อเวลา สรุปรายกลุ่มสาระและรายบุคคล
              โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </p>
          </div>

          {/* Grouped Action Buttons with Uniform Heights & Secondary Dropdown */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
            {/* Primary Action 1: Instant AI Infographic Prompt */}
            <button
              type="button"
              onClick={handleInstantCopyPrompt}
              className="h-8.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer border border-amber-300 shrink-0"
              title="คลิกเดียวคัดลอก Prompt สถิติจริงเพื่อนำไปสร้างอินโฟกราฟิกด้วย AI ทันที"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>✨ คัดลอก Prompt AI</span>
            </button>

            {/* Primary Action 2: Individual Printable Summary */}
            <button
              type="button"
              onClick={() => setIsIndividualPrintModalOpen(true)}
              className="h-8.5 px-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
              title="พิมพ์รายงานสรุปผลการส่งเอกสารรายบุคคล"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>พิมพ์สรุปรายบุคคล</span>
            </button>

            {/* Secondary Actions Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSecondaryMenuOpen(!isSecondaryMenuOpen);
                  setIsDocTypeDropdownOpen(false);
                  setIsAreaDropdownOpen(false);
                }}
                className={`h-8.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
                  isSecondaryMenuOpen
                    ? 'bg-white text-slate-900 border-white shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm'
                }`}
                title="ตัวเลือกและการจัดการเพิ่มเติม"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>ตัวเลือกเพิ่มเติม</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isSecondaryMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSecondaryMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-1.5 text-slate-800 text-xs animate-in fade-in slide-in-from-top-1 divide-y divide-slate-100">
                  <div className="space-y-0.5 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPrintModalOpen(true);
                        setIsSecondaryMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 font-medium hover:text-slate-900"
                    >
                      <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="font-bold text-xs text-slate-900">พิมพ์รายงานภาพรวมผู้บริหาร</div>
                        <div className="text-[10px] text-slate-400">แบบฟอร์มทางการ A4 มีลายเซ็น</div>
                      </div>
                    </button>

                    {onOpenDeadlineManager && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenDeadlineManager();
                          setIsSecondaryMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 font-medium hover:text-slate-900"
                      >
                        <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-slate-900">กำหนดส่ง & จัดการสถานะ</div>
                          <div className="text-[10px] text-slate-400">ตั้งค่าเดดไลน์แต่ละประเภทเอกสาร</div>
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
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 font-medium hover:text-slate-900"
                      >
                        <Users className="w-4 h-4 text-sky-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-slate-900">ทำเนียบบุคลากร ({totalTeachersCount} ท่าน)</div>
                          <div className="text-[10px] text-slate-400">รายชื่อครูและกลุ่มสาระทั้งหมด</div>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsInfographicModalOpen(true);
                        setIsSecondaryMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50/70 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 font-medium hover:text-amber-950"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="font-bold text-xs text-amber-950">ดู/ปรับแต่ง AI Infographic Prompt</div>
                        <div className="text-[10px] text-amber-700/80">ตรวจทาน Prompt ภาษาไทย & อังกฤษ</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Executive View Mode Switcher: Standard Operational vs Ranking Leaderboard vs Data-Driven Organization */}
      <div className="bg-white rounded-xl p-1.5 sm:p-2 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => handleModeChange('standard')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentMode === 'standard'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>ภาพรวมการดำเนินงาน</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('ranking')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentMode === 'ranking'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-2xs font-black'
                : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-900" />
            <span>ทำเนียบจัดอันดับกลุ่มสาระ</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${currentMode === 'ranking' ? 'bg-slate-950 text-amber-300' : 'bg-amber-200 text-amber-900'}`}>
              เร็ว & ตรงเวลา
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('ddo')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentMode === 'ddo'
                ? 'bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-2xs'
                : 'text-slate-600 hover:text-indigo-950'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
            <span>วิเคราะห์ Data-Driven</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
              DDO
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 px-2 flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">มุมมอง:</span>
          <span className="font-bold text-indigo-600">
            {currentMode === 'ddo'
              ? 'การวินิจฉัยจุดติดขัด · เรดาร์ความเสี่ยง · ข้อเสนอแนะเชิงยุทธศาสตร์'
              : currentMode === 'ranking'
              ? 'จัดอันดับกลุ่มสาระส่งครบ 100% ตรงเวลาก่อน'
              : 'สถิติการส่งงาน · ราย 8 กลุ่มสาระ · รายการครูรายบุคคล'}
          </span>
        </div>
      </div>

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
        <>
          {/* Top 4 KPI Cards: Compact, Prominent Stats, Micro Labels */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* KPI 1: Submission Rate */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-indigo-300 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  อัตราการส่งทั้งโรงเรียน
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-slate-900">{submissionRate}%</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({submittedTeachers.length}/{totalTeachersCount} ท่าน)
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${submissionRate}%` }}
                ></div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>ส่งแล้ว {totalPlansCount} ฉบับ</span>
                <span className="font-semibold text-rose-600 font-mono">
                  {pendingTeachers.length > 0 ? `ค้าง ${pendingTeachers.length} ท่าน` : 'ครบ 100%'}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
            </div>

            {/* KPI 2: Punctuality Breakdown */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-emerald-300 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  ความตรงต่อเวลา
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-emerald-600">{onTimeRate}%</span>
                <span className="text-[11px] text-slate-400 font-medium">({onTimePlans.length} ฉบับ)</span>
              </div>
              {/* Progress bar with ontime and late segments */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-1.5 transition-all duration-500"
                  style={{ width: `${onTimeRate}%` }}
                ></div>
                <div
                  className="bg-amber-500 h-1.5 transition-all duration-500"
                  style={{ width: `${lateRate}%` }}
                ></div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-semibold font-mono">✓ ตรงเวลา: {onTimePlans.length}</span>
                <span className="text-amber-700 font-semibold font-mono">⚠️ ช้า: {latePlans.length}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
            </div>

            {/* KPI 3: Average Quality Score */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-amber-300 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  คะแนนคุณภาพเฉลี่ย
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-slate-900">{avgScore}</span>
                {avgScore !== '-' && <span className="text-[11px] text-slate-400 font-medium">/ 100</span>}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                {avgScore === '-' ? (
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                    รอผลประเมินจริง
                  </span>
                ) : Number(avgScore) >= 90 ? (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    ดีเยี่ยม (90+) ★★★★★
                  </span>
                ) : Number(avgScore) >= 80 ? (
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-md">
                    ดีมาก (80-89) ★★★★☆
                  </span>
                ) : Number(avgScore) >= 70 ? (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded-md">
                    ดี (70-79) ★★★☆☆
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-700 font-bold bg-rose-100/70 px-2 py-0.5 rounded-md">
                    ปรับปรุง (&lt;70)
                  </span>
                )}
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-400 truncate">
                <span>ประเมินแล้ว:</span>
                <span className="font-mono font-bold text-slate-600">{plansWithScore.length} ฉบับ</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>
            </div>

            {/* KPI 4: Department Completion */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-sky-300 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  กลุ่มสาระส่งครบ 100%
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-sky-600">
                  {areaStats.filter((a) => a.isCompleted).length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">/ {areaStats.length} กลุ่มสาระ</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-sky-500 h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (areaStats.filter((a) => a.isCompleted).length / (areaStats.length || 1)) * 100
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>กลุ่มสาระดีเด่น</span>
                <span className="font-semibold text-indigo-600 font-mono">
                  {areaStats.filter((a) => a.isCompleted).length} กลุ่มสำเร็จ
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"></div>
            </div>
          </div>

          {/* Quick Leaderboard Announcement Banner: Compact strip */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/90 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0B1329] text-amber-400 flex items-center justify-center shrink-0 shadow-2xs border border-amber-400/20">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    ทำเนียบจัดอันดับกลุ่มสาระยอดเยี่ยม (Leaderboard)
                  </h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-200 text-amber-950">
                    ความเร็ว & ตรงเวลา
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  เช็คกลุ่มสาระที่ส่งเอกสารครบ 100% ตรงเวลาทุกคนก่อนเป็นกลุ่มแรก พร้อมสถิติเวลาจริงและแท่นรางวัล
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleModeChange('ranking')}
              className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-slate-950" />
              <span>เปิดดูอันดับ</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>

          {/* Backdrop to close popovers on outside click */}
          {(isDocTypeDropdownOpen || isAreaDropdownOpen || isSecondaryMenuOpen) && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => {
                setIsDocTypeDropdownOpen(false);
                setIsAreaDropdownOpen(false);
                setIsSecondaryMenuOpen(false);
              }}
            />
          )}

      {/* Filter Controls Bar with Multi-Select: Compact Layout */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>ตัวกรอง:</span>
            </div>

            {/* Doc Type Multi-Select Dropdown Popover */}
            <div className="relative" title="เลือกประเภทเอกสารที่ต้องการดู (สามารถเลือกได้หลายประเภทพร้อมกัน)">
              <button
                type="button"
                onClick={() => {
                  setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen);
                  setIsAreaDropdownOpen(false);
                  setIsSecondaryMenuOpen(false);
                }}
                className={`h-8 px-2.5 text-xs font-bold border rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                  !isAllDocTypes
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-200'
                    : 'border-indigo-200 bg-indigo-50/70 hover:bg-white text-indigo-950'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-none">
                  {isAllDocTypes
                    ? 'เอกสาร: ทั้งหมด'
                    : selectedDocTypes.length === 1
                    ? `ประเภท: ${selectedDocTypes[0]}`
                    : `ประเภท (${selectedDocTypes.length})`}
                </span>
                {!isAllDocTypes && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                    {selectedDocTypes.length}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 text-indigo-500 transition-transform ${isDocTypeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDocTypeDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200/90 z-30 p-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">
                      ประเภทเอกสาร ({isAllDocTypes ? 'ทุกประเภท' : `${selectedDocTypes.length} ที่เลือก`})
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={selectAllDocTypes}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        เลือกทั้งหมด
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearDocTypes}
                        className="text-slate-500 hover:text-rose-600 font-medium hover:underline cursor-pointer"
                      >
                        รีเซ็ต
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 p-1 mt-1">
                    <button
                      type="button"
                      onClick={() => toggleDocType('ทั้งหมด')}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isAllDocTypes ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAllDocTypes ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {isAllDocTypes && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>ทั้งหมด (ทุกประเภทเอกสาร)</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {plans.length} ฉบับ
                      </span>
                    </button>

                    {docTypes.filter(dt => dt !== 'ทั้งหมด').map((dt) => {
                      const isSelected = !isAllDocTypes && selectedDocTypes.includes(dt);
                      const docCount = plans.filter((p) => {
                        const pType = (p.plan_type || '').trim();
                        if (pType === dt) return true;
                        if (dt === 'แผนการจัดการเรียนรู้' && (pType.includes('แผนการจัดการเรียนรู้') || !pType)) return true;
                        return false;
                      }).length;

                      return (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => toggleDocType(dt)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isSelected ? 'bg-indigo-50 text-indigo-950 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{dt}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0 font-normal">
                            {docCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Learning Area Multi-Select Dropdown Popover */}
            <div className="relative" title="เลือกกลุ่มสาระการเรียนรู้ที่ต้องการเปรียบเทียบ (สามารถเลือกได้หลายกลุ่มสาระ)">
              <button
                type="button"
                onClick={() => {
                  setIsAreaDropdownOpen(!isAreaDropdownOpen);
                  setIsDocTypeDropdownOpen(false);
                  setIsSecondaryMenuOpen(false);
                }}
                className={`h-8 px-2.5 text-xs font-bold border rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                  !isAllAreas
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-none">
                  {isAllAreas
                    ? 'กลุ่มสาระ: ทั้งหมด (8 สาระ)'
                    : selectedAreas.length === 1
                    ? `กลุ่มสาระ: ${selectedAreas[0]}`
                    : `กลุ่มสาระ (${selectedAreas.length} สาระ)`}
                </span>
                {!isAllAreas && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                    {selectedAreas.length}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isAreaDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAreaDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl border border-slate-200/90 shadow-xl z-30 p-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">
                      กลุ่มสาระการเรียนรู้ ({isAllAreas ? 'ครบ 8 สาระ' : `${selectedAreas.length} ที่เลือก`})
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={selectAllAreas}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        เลือกทั้งหมด
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearAreas}
                        className="text-slate-500 hover:text-rose-600 font-medium hover:underline cursor-pointer"
                      >
                        รีเซ็ต
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 p-1 mt-1">
                    <button
                      type="button"
                      onClick={() => toggleArea('ทั้งหมด')}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isAllAreas ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAllAreas ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {isAllAreas && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>ทั้งหมด (8 กลุ่มสาระ)</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {teachingStaff.length} คน
                      </span>
                    </button>

                    {areas.filter(a => a !== 'ทั้งหมด').map((area) => {
                      const isSelected = !isAllAreas && selectedAreas.includes(area);
                      const staffCount = teachingStaff.filter((t) => t.Learning_Area === area).length;

                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleArea(area)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isSelected ? 'bg-indigo-50 text-indigo-950 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{area}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0 font-normal">
                            {staffCount} คน
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Status Tabs */}
            <div className="h-8 inline-flex rounded-lg bg-slate-100 p-0.5 text-xs items-center">
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`h-7 px-2.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedStatus === 'all' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({totalTeachersCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('ontime')}
                className={`h-7 px-2.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedStatus === 'ontime' ? 'bg-white shadow-2xs text-emerald-700 font-bold' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                ตรงเวลา
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('late')}
                className={`h-7 px-2.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedStatus === 'late' ? 'bg-white shadow-2xs text-amber-700 font-bold' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                ส่งล่าช้า
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('pending')}
                className={`h-7 px-2.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedStatus === 'pending' ? 'bg-white shadow-2xs text-rose-700 font-bold' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                ยังไม่ส่ง ({pendingTeachers.length})
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative min-w-[200px] lg:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTeacher}
              onChange={(e) => setSearchTeacher(e.target.value)}
              placeholder="ค้นหาชื่อครู, รหัส, สาระ..."
              className="w-full h-8 pl-8 pr-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(!isAllDocTypes || !isAllAreas) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            <span className="font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-indigo-600" />
              <span>หัวข้อที่เลือก:</span>
            </span>

            {/* Doc Type Chips */}
            {!isAllDocTypes &&
              selectedDocTypes.map((dt) => {
                const colorCfg = getDocTypeColorConfig(dt, allRealDocTypes);
                return (
                  <span
                    key={`chip-dt-${dt}`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 ${colorCfg.lightBg} border ${colorCfg.border} ${colorCfg.text} rounded-md text-[11px] font-semibold shadow-2xs`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${colorCfg.dot}`} />
                    <span>{dt}</span>
                    <button
                      type="button"
                      onClick={() => toggleDocType(dt)}
                      className="hover:text-rose-600 p-0.5 rounded hover:bg-white/80 transition-colors cursor-pointer"
                      title={`ยกเลิกการกรอง ${dt}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}

            {/* Area Chips */}
            {!isAllAreas &&
              selectedAreas.map((area) => (
                <span
                  key={`chip-area-${area}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-md text-[11px] font-semibold shadow-2xs"
                >
                  <Users className="w-3 h-3 text-blue-600" />
                  <span>{area}</span>
                  <button
                    type="button"
                    onClick={() => toggleArea(area)}
                    className="hover:text-rose-600 p-0.5 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                    title={`ยกเลิกการกรอง ${area}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}

            {/* Reset All Filters Button */}
            <button
              type="button"
              onClick={() => {
                selectAllDocTypes();
                selectAllAreas();
              }}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline px-1.5 py-0.5 cursor-pointer transition-colors"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: CHARTS & VISUAL GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* GRAPH 1: Departmental Comparison Bar Chart (2 columns on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-2.5 gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  กราฟเปรียบเทียบอัตราการส่งงาน {isAllAreas ? '8 กลุ่มสาระ' : `${areaStats.length} กลุ่มสาระที่เลือก`}
                </h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {graph1ViewMode === 'by_doctype' ? (
                    <span>แยกแท่งตามประเภทเอกสาร ({activeTypesForBars.length} ประเภท) — <span className="font-semibold text-indigo-700">คนละประเภทคนละสีคนละแท่ง</span></span>
                  ) : (
                    <span>แสดงสัดส่วนส่งตรงเวลา (เขียว), ส่งช้า (ส้ม), ยังไม่ส่ง (เทา)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Controls: View Mode Toggle & Actions Group */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start lg:self-center">
              {/* Toggle: แยกประเภทเอกสาร VS สรุปตรงเวลา/ล่าช้า */}
              <div className="h-8 inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold items-center">
                <button
                  type="button"
                  onClick={() => setGraph1ViewMode('by_doctype')}
                  className={`h-7 px-2.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    graph1ViewMode === 'by_doctype'
                      ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แสดงคนละประเภทเอกสารเป็นคนละสีคนละแท่ง"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>แยกประเภท</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGraph1ViewMode('by_timeliness')}
                  className={`h-7 px-2.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    graph1ViewMode === 'by_timeliness'
                      ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="สรุปภาพรวมสัดส่วนส่งตรงเวลาและล่าช้า"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>ตรงเวลา/ช้า</span>
                </button>
              </div>

              {/* AI Infographic Prompt Copy Button */}
              <button
                type="button"
                onClick={handleInstantCopyPrompt}
                className="h-8 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer border border-amber-400 shrink-0"
                title="คลิกเดียวคัดลอก Prompt สถิติจริงเพื่อนำไปสร้างอินโฟกราฟิกด้วย AI ทันที"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>AI Prompt</span>
              </button>

              {/* Inspect & Customize Prompt Button */}
              <button
                type="button"
                onClick={() => setIsInfographicModalOpen(true)}
                className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="เปิดดูและปรับแต่ง Prompt ละเอียด (ภาษาไทย/อังกฤษ)"
              >
                <Eye className="w-3.5 h-3.5 text-slate-700" />
              </button>

              <span className="h-8 px-2 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-semibold flex items-center shrink-0">
                {isAllAreas ? '8 กลุ่มสาระ' : `${areaStats.length} สาระ`}
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          {graph1ViewMode === 'by_doctype' ? (
            /* VIEW 1: SEPARATE BARS & DISTINCT COLORS FOR EACH DOC TYPE */
            <div className="space-y-2.5 pt-0.5">
              {areaStats.map((stat) => {
                const deptTeachers = teachingStaff.filter((t) => t.Learning_Area === stat.name);
                const totalStaffInDept = deptTeachers.length;

                return (
                  <div
                    key={stat.name}
                    className="p-2.5 sm:p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2 shadow-2xs"
                  >
                    {/* Department Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs border-b border-slate-200/70 pb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {stat.isCompleted && (
                          <span className="text-amber-500 text-xs" title="ส่งครบทุกรายการ">🏆</span>
                        )}
                        <span className="text-slate-900 font-bold text-xs truncate">{stat.name}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.2 rounded-md font-mono shrink-0">
                          ครู {totalStaffInDept} ท่าน
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-500">ส่งแล้ว:</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-md">
                          {stat.submittedTeachers}/{totalStaffInDept} ท่าน ({stat.submissionRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Distinct Bar for Each Document Type */}
                    <div className="space-y-1.5 pt-0.5">
                      {activeTypesForBars.map((dt) => {
                        const colorCfg = getDocTypeColorConfig(dt, allRealDocTypes);

                        const submittedCount = deptTeachers.filter((t) =>
                          plans.some((p) => {
                            if (p.teacher_id !== t.Teacher_ID) return false;
                            const pType = (p.plan_type || '').trim();
                            if (pType === dt) return true;
                            if (dt === 'แผนการจัดการเรียนรู้' && (pType.includes('แผนการจัดการเรียนรู้') || !pType)) return true;
                            return false;
                          })
                        ).length;

                        const docPlans = plans.filter((p) => {
                          const isDeptTeacher = deptTeachers.some((t) => t.Teacher_ID === p.teacher_id);
                          if (!isDeptTeacher) return false;
                          const pType = (p.plan_type || '').trim();
                          if (pType === dt) return true;
                          if (dt === 'แผนการจัดการเรียนรู้' && (pType.includes('แผนการจัดการเรียนรู้') || !pType)) return true;
                          return false;
                        });

                        const lateCount = docPlans.filter((p) => p.is_late).length;
                        const rate = totalStaffInDept > 0 ? Math.round((submittedCount / totalStaffInDept) * 100) : 0;

                        return (
                          <div key={`${stat.name}-${dt}`} className="space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate max-w-[240px] sm:max-w-[320px]">
                                <span className={`w-2 h-2 rounded-full ${colorCfg.dot} shrink-0`} />
                                <span className="font-semibold text-slate-800 text-[11px] truncate">{dt}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                {lateCount > 0 && (
                                  <span className="text-amber-800 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded font-medium text-[9px]">
                                    ช้า {lateCount}
                                  </span>
                                )}
                                <span className="text-slate-400 font-mono text-[10px]">
                                  {submittedCount}/{totalStaffInDept}
                                </span>
                                <span className={`font-mono font-bold ${colorCfg.text} min-w-[32px] text-right text-xs`}>
                                  {rate}%
                                </span>
                              </div>
                            </div>

                            {/* Distinct Colored Bar */}
                            <div className="w-full bg-slate-200/80 rounded-md h-2.5 overflow-hidden flex shadow-2xs">
                              {rate > 0 && (
                                <div
                                  className={`bg-gradient-to-r ${colorCfg.barGradient} h-2.5 rounded-md transition-all duration-500`}
                                  style={{ width: `${rate}%` }}
                                  title={`${stat.name} - ${dt}: ${rate}% (${submittedCount}/${totalStaffInDept} ท่าน)`}
                                ></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Color Legend for Document Types */}
              <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                  <Layers className="w-3 h-3 text-indigo-600" />
                  <span>สัญลักษณ์ประเภทเอกสาร ({activeTypesForBars.length} ประเภท):</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {activeTypesForBars.map((dt) => {
                    const color = getDocTypeColorConfig(dt, allRealDocTypes);
                    return (
                      <div
                        key={`legend-doctype-${dt}`}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${color.lightBg} border ${color.border} shadow-2xs`}
                      >
                        <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                        <span className={`font-semibold ${color.text}`}>{dt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: STACKED TIMELINESS OVERVIEW */
            <div className="space-y-2.5 pt-0.5">
              {areaStats.map((stat) => {
                const onTimeWidth = stat.totalTeachers > 0
                  ? Math.round((stat.onTimeTeachersCount / stat.totalTeachers) * 100)
                  : 0;
                const lateWidth = stat.totalTeachers > 0
                  ? Math.round((stat.lateTeachersCount / stat.totalTeachers) * 100)
                  : 0;
                const pendingWidth = Math.max(0, 100 - onTimeWidth - lateWidth);

                return (
                  <div key={stat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[240px]">
                        {stat.isCompleted && (
                          <span className="text-amber-500 text-[11px]" title="ส่งครบ 100%">🏆</span>
                        )}
                        <span>{stat.name}</span>
                      </span>
                      <div className="flex items-center gap-2.5 text-[11px]">
                        <span className="text-slate-400 font-mono text-[10px]">ครู {stat.totalTeachers} คน</span>
                        <span className="font-bold text-indigo-600 font-mono">
                          {stat.submissionRate}% ({stat.submittedTeachers}/{stat.totalTeachers})
                        </span>
                      </div>
                    </div>

                    {/* Stacked Bar with tooltips */}
                    <div className="w-full bg-slate-100 rounded-md h-4 overflow-hidden flex shadow-2xs">
                      {onTimeWidth > 0 && (
                        <div
                          className="bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center text-[9px] font-bold text-white px-1"
                          style={{ width: `${onTimeWidth}%` }}
                          title={`ตรงเวลา ${onTimeWidth}% (${stat.onTimeTeachersCount} ท่าน)`}
                        >
                          {onTimeWidth >= 15 ? `${onTimeWidth}%` : ''}
                        </div>
                      )}
                      {lateWidth > 0 && (
                        <div
                          className="bg-amber-500 hover:bg-amber-600 transition-all flex items-center justify-center text-[9px] font-bold text-white px-1"
                          style={{ width: `${lateWidth}%` }}
                          title={`ส่งช้า ${lateWidth}% (${stat.lateTeachersCount} ท่าน)`}
                        >
                          {lateWidth >= 12 ? `ช้า` : ''}
                        </div>
                      )}
                      {pendingWidth > 0 && (
                        <div
                          className="bg-slate-200/90 transition-all flex items-center justify-center text-[9px] font-medium text-slate-500 px-1"
                          style={{ width: `${pendingWidth}%` }}
                          title={`ยังไม่ส่ง ${pendingWidth}% (${stat.pendingTeachers} ท่าน)`}
                        >
                          {pendingWidth >= 15 ? `${pendingWidth}%` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2.5 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-medium">ส่งตรงเวลา</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600 font-medium">ส่งล่าช้า</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  <span className="text-slate-600 font-medium">ยังไม่ส่ง</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GRAPH 2: Donut Chart - Punctuality & Timeliness Proportion (Compact, Zero Dead Space) */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <PieChart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  สัดส่วนความตรงต่อเวลา
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  วิเคราะห์จาก {totalPlansCount} ฉบับ ({totalTeachersCount} บุคลากร)
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                onTimeRate >= 80
                  ? 'bg-emerald-100 text-emerald-800'
                  : onTimeRate >= 60
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {onTimeRate >= 80 ? 'เกณฑ์ดีเยี่ยม' : onTimeRate >= 60 ? 'เฝ้าระวัง' : 'ต้องเร่งรัด'}
            </span>
          </div>

          {/* Circular SVG Donut Chart (Compact proportions) */}
          <div className="flex flex-col items-center justify-center py-0.5 relative">
            <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="38"
                className="text-slate-100 stroke-current"
                strokeWidth="11"
                fill="transparent"
              />
              {/* On-Time Arc (Emerald) */}
              {onTimeRate > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="text-emerald-500 stroke-current transition-all duration-700"
                  strokeWidth="11"
                  strokeDasharray={`${(onTimeRate * 238.76) / 100} 238.76`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  fill="transparent"
                />
              )}
              {/* Late Arc (Amber) */}
              {lateRate > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="text-amber-500 stroke-current transition-all duration-700"
                  strokeWidth="11"
                  strokeDasharray={`${(lateRate * 238.76) / 100} 238.76`}
                  strokeDashoffset={`-${(onTimeRate * 238.76) / 100}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              )}
            </svg>

            {/* Inner Center Badge: Prominent Stat Number */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {totalPlansCount === 0 ? (
                <>
                  <span className="text-base font-bold text-slate-400">0 ฉบับ</span>
                  <span className="text-[10px] text-slate-400">ยังไม่มีเอกสาร</span>
                </>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight leading-none">
                    {onTimeRate}%
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                    ส่งตรงเวลา
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">รวม {totalPlansCount} ฉบับ</span>
                </>
              )}
            </div>
          </div>

          {/* Donut Legend (High scanability) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-semibold text-emerald-900 text-xs">ส่งตรงเวลา (On-Time)</span>
              </div>
              <span className="font-mono font-bold text-emerald-700 text-xs">
                {onTimePlans.length} ฉบับ ({onTimeRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <span className="font-semibold text-amber-900 text-xs">ส่งล่าช้า (Late)</span>
              </div>
              <span className="font-mono font-bold text-amber-700 text-xs">
                {latePlans.length} ฉบับ ({lateRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                <span className="font-semibold text-rose-900 text-xs">ยังไม่ส่ง (Pending)</span>
              </div>
              <span className="font-mono font-bold text-rose-700 text-xs">
                {pendingTeachers.length} ท่าน ({Math.round(((pendingTeachers.length) / (totalTeachersCount || 1)) * 100)}%)
              </span>
            </div>
          </div>

          {/* Compact Department Insights (Eliminates dead space with actionable executive intelligence) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            {/* Top Punctual Departments */}
            {areaStats.filter((a) => a.submissionRate === 100).length > 0 && (
              <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/90 text-[11px] space-y-1">
                <div className="flex items-center gap-1 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>กลุ่มสาระที่ส่งครบ 100%:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {areaStats
                    .filter((a) => a.submissionRate === 100)
                    .map((a) => (
                      <span
                        key={`punctual-${a.name}`}
                        className="px-1.5 py-0.2 bg-white text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold"
                      >
                        ✓ {a.name}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Actionable Watchlist: Areas with pending submissions */}
            {pendingTeachers.length > 0 && (
              <div className="p-2 rounded-lg bg-rose-50/50 border border-rose-100/90 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-rose-900 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>กลุ่มที่ยังมีงานค้างส่ง ({pendingTeachers.length} ท่าน):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('pending')}
                    className="text-[10px] text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
                  >
                    ดูรายคน
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {areaStats
                    .filter((a) => a.pendingTeachers > 0)
                    .map((a) => (
                      <span
                        key={`pending-dept-${a.name}`}
                        className="px-1.5 py-0.2 bg-white text-rose-800 border border-rose-200 rounded text-[10px] font-medium"
                      >
                        {a.name} (ค้าง {a.pendingTeachers})
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GRAPH 3 & 4: Score Distribution & Document Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* GRAPH 3: Quality Score Distribution Histogram */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                การกระจายคะแนนคุณภาพแผน
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              {avgScore !== '-' ? `เฉลี่ย ${avgScore} / 100` : 'รอผลตรวจ'}
            </span>
          </div>

          {scoreDistribution.totalScored === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 space-y-1">
              <Award className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 text-xs">ยังไม่มีข้อมูลการประเมินคะแนนจริง</p>
              <p className="text-[10px] text-slate-400">ระบบจะแสดงผลเมื่อผู้ตรวจวิชาการบันทึกคะแนน</p>
            </div>
          ) : (
            <div className="space-y-2 pt-0.5">
              {/* Tier 1: ดีเยี่ยม (90-100) */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 text-[11px]">ระดับดีเยี่ยม (90 - 100)</span>
                  <span className="font-mono font-bold text-emerald-600 text-xs">
                    {scoreDistribution.excellent} ฉบับ ({scoreDistribution.excellentPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-md h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-md transition-all"
                    style={{ width: `${scoreDistribution.excellentPct}%` }}
                  ></div>
                </div>
              </div>

              {/* Tier 2: ดีมาก (80-89) */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 text-[11px]">ระดับดีมาก (80 - 89)</span>
                  <span className="font-mono font-bold text-blue-600 text-xs">
                    {scoreDistribution.veryGood} ฉบับ ({scoreDistribution.veryGoodPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-md h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-md transition-all"
                    style={{ width: `${scoreDistribution.veryGoodPct}%` }}
                  ></div>
                </div>
              </div>

              {/* Tier 3: ดี (70-79) */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 text-[11px]">ระดับดี (70 - 79)</span>
                  <span className="font-mono font-bold text-amber-600 text-xs">
                    {scoreDistribution.good} ฉบับ ({scoreDistribution.goodPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-md h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-md transition-all"
                    style={{ width: `${scoreDistribution.goodPct}%` }}
                  ></div>
                </div>
              </div>

              {/* Tier 4: ต้องปรับปรุง (<70) */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 text-[11px]">ระดับปรับปรุง (&lt; 70)</span>
                  <span className="font-mono font-bold text-rose-600 text-xs">
                    {scoreDistribution.needsImprovement} ฉบับ ({scoreDistribution.needsImprovementPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-md h-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2 rounded-md transition-all"
                    style={{ width: `${scoreDistribution.needsImprovementPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GRAPH 4: Breakdown by Document Type */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                สถิติแยกตามประเภทเอกสาร
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              ทั้งหมด {plans.length} ฉบับ
            </span>
          </div>

          <div className="space-y-2 pt-0.5">
            {(() => {
              const typesToRender = docTypes.filter((d) => {
                if (d === 'ทั้งหมด') return false;
                const hasPlans = plans.some((p) => p.plan_type === d);
                const hasConfig = (deadlineConfigs || []).some((c) => c.name === d);
                return hasPlans || hasConfig;
              });

              if (typesToRender.length === 0) {
                return (
                  <div className="py-6 text-center text-xs text-slate-400">
                    ยังไม่มีข้อมูลประเภทเอกสารในระบบ
                  </div>
                );
              }

              return typesToRender.map((type) => {
                const count = plans.filter((p) => p.plan_type === type).length;
                const typeLate = plans.filter((p) => p.plan_type === type && p.is_late).length;
                const pct = plans.length > 0 ? Math.round((count / plans.length) * 100) : 0;
                const colorCfg = getDocTypeColorConfig(type, allRealDocTypes);

                return (
                  <div key={type} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[190px] flex items-center gap-1.5 text-[11px]">
                        <span className={`w-2 h-2 rounded-full ${colorCfg.dot} shrink-0`} />
                        <span className="truncate">{type}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {typeLate > 0 && (
                          <span className="text-[9px] text-amber-800 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded font-semibold">
                            ช้า {typeLate}
                          </span>
                        )}
                        <span className={`font-mono font-bold ${colorCfg.text} text-xs`}>
                          {count} ฉบับ ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-md h-2 overflow-hidden shadow-2xs">
                      <div
                        className={`bg-gradient-to-r ${colorCfg.barGradient} h-2 rounded-md transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* SECTION 3: DEPARTMENTAL LEADERBOARD (ตารางสรุปรายกลุ่มสาระ) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                ตารางจัดอันดับและสถิติราย 8 กลุ่มสาระการเรียนรู้
              </h3>
              <p className="text-[11px] text-slate-500">
                เปรียบเทียบจำนวนครู สถิติส่งตรงเวลา/ล่าช้า และคะแนนประเมินคุณภาพ
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            เรียงตามร้อยละความสำเร็จ (% การส่งงาน)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">อันดับ</th>
                <th className="py-2.5 px-3">กลุ่มสาระการเรียนรู้</th>
                <th className="py-2.5 px-3 text-center">จำนวนครู</th>
                <th className="py-2.5 px-3 text-center">ส่งแล้ว</th>
                <th className="py-2.5 px-3 w-36">อัตราความสำเร็จ</th>
                <th className="py-2.5 px-3 text-center">ตรงเวลา</th>
                <th className="py-2.5 px-3 text-center">ส่งช้า</th>
                <th className="py-2.5 px-3 text-center">คะแนนเฉลี่ย</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areaStats.map((stat, idx) => {
                const isSelected = !isAllAreas && selectedAreas.includes(stat.name);
                return (
                  <tr
                    key={stat.name}
                    onClick={() => toggleArea(stat.name)}
                    className={`hover:bg-indigo-50/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/80 font-semibold ring-1 ring-indigo-200' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center font-mono">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-800'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-800'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{stat.name}</span>
                      {isSelected && (
                        <span className="text-[9px] text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded font-bold">
                          เลือก
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-600">
                      {stat.totalTeachers} ท่าน
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-indigo-700">
                      {stat.submittedTeachers} ท่าน
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              stat.submissionRate === 100
                                ? 'bg-emerald-500'
                                : stat.submissionRate >= 80
                                ? 'bg-indigo-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${stat.submissionRate}%` }}
                          ></div>
                        </div>
                        <span className="font-mono font-bold text-[11px] min-w-[28px] text-right">
                          {stat.submissionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-emerald-600 font-bold">
                      {stat.onTimePlans}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-amber-600 font-bold">
                      {stat.latePlans > 0 ? stat.latePlans : '-'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                      {stat.avgScore}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {stat.isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ครบ 100%
                        </span>
                      ) : stat.pendingTeachers > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          ค้าง {stat.pendingTeachers}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
                          เรียบร้อย
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: INDIVIDUAL TEACHER TRACKING (การส่งงานรายคน) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Section 4 Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>การติดตามการส่งงานรายบุคคล</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md font-mono">
                    {filteredTeachers.length} / {individualCounts.total} ท่าน
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  ตรวจสอบสถานะส่งงานรายบุคคล ความตรงต่อเวลา และส่งสัญญาณเตือนครูที่มีงานค้าง
                </p>
              </div>
            </div>

            {/* View Mode Switcher & Print Summary Button */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start sm:self-auto">
              <div className="h-8 inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIndividualViewMode('table')}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    individualViewMode === 'table'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="มุมมองตาราง"
                >
                  <TableIcon className="w-3 h-3" />
                  <span>ตาราง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIndividualViewMode('cards')}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    individualViewMode === 'cards'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="มุมมองการ์ด"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>การ์ด</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsIndividualPrintModalOpen(true)}
                className="h-8 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer border border-amber-300 shrink-0"
                title="พิมพ์รายงานสรุปผลการส่งเอกสารรายบุคคล"
              >
                <Printer className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>พิมพ์สรุปรายบุคคล</span>
              </button>
            </div>
          </div>

          {/* Controls: Quick Status Filter Tabs + In-Section Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-0.5">
            {/* Quick Status Tabs */}
            <div className="h-8 inline-flex rounded-lg bg-slate-100 p-0.5 text-xs items-center">
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({individualCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('pending')}
                className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'pending'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>ยังไม่ส่ง ({individualCounts.pending})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('ontime')}
                className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'ontime'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>ตรงเวลา ({individualCounts.ontime})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('late')}
                className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'late'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>ส่งช้า ({individualCounts.late})</span>
              </button>
            </div>

            {/* In-Section Quick Search */}
            <div className="relative w-full md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัสครู..."
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                className="w-full h-8 pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {searchTeacher && (
                <button
                  type="button"
                  onClick={() => setSearchTeacher('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">ไม่พบบุคลากรครูที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-xs mt-1 text-slate-400">ลองเปลี่ยนตัวกรองสถานะ หรือเคลียร์คำค้นหา</p>
            {(selectedStatus !== 'all' || searchTeacher) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('all');
                  setSearchTeacher('');
                }}
                className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        ) : individualViewMode === 'table' ? (
          /* TABLE VIEW: Clean, High-Scanability Rows */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 min-w-[180px]">ครูผู้สอน</th>
                  <th className="py-2.5 px-3 min-w-[130px]">กลุ่มสาระ</th>
                  <th className="py-2.5 px-3 min-w-[110px] text-center">สถานะ</th>
                  <th className="py-2.5 px-3 min-w-[240px]">
                    เอกสารที่ส่ง ({isAllDocTypes ? 'ทุกประเภท' : selectedDocTypes.length === 1 ? selectedDocTypes[0] : `${selectedDocTypes.length} ประเภท`})
                  </th>
                  <th className="py-2.5 px-2.5 min-w-[80px] text-center">คะแนน</th>
                  <th className="py-2.5 px-3 min-w-[100px] text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTeachers.map((teacher) => {
                  const teacherPlans = activePlans.filter((p) => p.teacher_id === teacher.Teacher_ID);
                  const hasSubmitted = teacherPlans.length > 0;
                  const hasLate = teacherPlans.some((p) => p.is_late);
                  const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
                  const isReminderSent = !!reminderSentMap[teacher.Teacher_ID];
                  const isExpanded = expandedTeacherId === teacher.Teacher_ID;

                  // Average score for this teacher
                  const scoredPlans = teacherPlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
                  const teacherAvgScore = scoredPlans.length > 0
                    ? (scoredPlans.reduce((acc, p) => acc + (p.total_score || 0), 0) / scoredPlans.length).toFixed(1)
                    : '-';

                  return (
                    <React.Fragment key={teacher.Teacher_ID}>
                      <tr className={`hover:bg-indigo-50/30 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                        {/* 1. Teacher Profile */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                                <span className="text-[10px] font-bold text-indigo-700">
                                  {getInitials(teacher.Name)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate">{teacher.Name}</div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.2">
                                <span className="bg-slate-100 px-1 py-0.2 rounded font-bold text-slate-700">{teacher.Teacher_ID}</span>
                                {teacher.position && (
                                  <span className="truncate max-w-[90px] text-slate-400 font-sans">• {teacher.position}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Department */}
                        <td className="py-2 px-3">
                          <span className="inline-block px-1.5 py-0.2 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 max-w-[140px] truncate" title={teacher.Learning_Area}>
                            {teacher.Learning_Area}
                          </span>
                        </td>

                        {/* 3. Status Badge */}
                        <td className="py-2 px-3 text-center">
                          {hasSubmitted ? (
                            hasLate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>มีส่งช้า</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>ตรงเวลา</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-300">
                              <Clock className="w-3 h-3 text-rose-600" />
                              <span>ยังไม่ส่ง</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Submitted Plans Chips */}
                        <td className="py-2 px-3">
                          {hasSubmitted ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {teacherPlans.slice(0, 3).map((plan) => (
                                <div
                                  key={plan.id}
                                  onClick={() => onOpenPlan && onOpenPlan(plan)}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer transition-colors max-w-[160px] ${
                                    plan.is_late
                                      ? 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100/70'
                                      : 'bg-emerald-50/60 text-emerald-900 border-emerald-200 hover:bg-emerald-100/60'
                                  }`}
                                  title={`${plan.subject_code} ${plan.subject_name || plan.plan_title} (${plan.is_late ? 'ส่งช้า' : 'ตรงเวลา'})`}
                                >
                                  <span className="font-mono font-bold text-[9px]">{plan.subject_code || 'แผน'}</span>
                                  <span className="truncate">{plan.subject_name || plan.plan_title}</span>
                                  {plan.file_url && (
                                    <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                  )}
                                </div>
                              ))}
                              {teacherPlans.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.Teacher_ID)}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-1 py-0.2 rounded bg-indigo-50"
                                >
                                  +{teacherPlans.length - 3}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">- ยังไม่มีเอกสารในระบบ -</span>
                          )}
                        </td>

                        {/* 5. Average Score */}
                        <td className="py-2 px-2.5 text-center">
                          {hasSubmitted && teacherAvgScore !== '-' ? (
                            <span className={`inline-block px-1.5 py-0.2 rounded font-mono font-bold text-[11px] ${
                              Number(teacherAvgScore) >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : Number(teacherAvgScore) >= 70
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {teacherAvgScore}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">-</span>
                          )}
                        </td>

                        {/* 6. Actions */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {hasSubmitted ? (
                              <button
                                type="button"
                                onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.Teacher_ID)}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-0.5"
                              >
                                <span>{isExpanded ? 'ซ่อน' : 'ดูฉบับ'}</span>
                                <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendReminder(teacher.Teacher_ID, teacher.Name)}
                                disabled={isReminderSent}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                                  isReminderSent
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs active:scale-95'
                                }`}
                                title="ส่งอีเมลแจ้งเตือนให้ส่งงาน"
                              >
                                <BellRing className="w-3 h-3 text-slate-950" />
                                <span>{isReminderSent ? 'เตือนแล้ว' : 'เตือน'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Plan List Drawer inside Table */}
                      {isExpanded && hasSubmitted && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={6} className="p-4 pl-14">
                            <div className="space-y-2">
                              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                <span>รายการเอกสารทั้งหมดของ {teacher.Name} ({teacherPlans.length} ฉบับ)</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {teacherPlans.map((plan) => (
                                  <div
                                    key={plan.id}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors flex items-start justify-between gap-2 shadow-2xs"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-800 truncate">
                                          {plan.subject_code} {plan.subject_name}
                                        </span>
                                        {plan.is_late ? (
                                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded shrink-0">
                                            ส่งช้า
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded shrink-0">
                                            ตรงเวลา
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                        {plan.plan_title}
                                      </p>
                                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                        <span>ส่ง: {new Date(plan.submitted_at).toLocaleDateString('th-TH')}</span>
                                        {typeof plan.total_score === 'number' && (
                                          <span className="font-bold text-indigo-600">
                                            • คะแนน: {plan.total_score}/100
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {plan.file_url && (
                                        <a
                                          href={plan.file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0 transition-colors"
                                          title="เปิดดูไฟล์เอกสาร"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      {onOpenPlan && (
                                        <button
                                          type="button"
                                          onClick={() => onOpenPlan(plan)}
                                          className="px-2 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                                          title="ตรวจและประเมิน / อนุมัติเอกสารนี้"
                                        >
                                          <UserCheck className="w-3 h-3 text-amber-300" />
                                          <span>{plan.status === 'submitted' ? 'ตรวจอนุมัติ' : 'ดูผลตรวจ'}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARDS VIEW: Sleek Modular Cards */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTeachers.map((teacher) => {
              const teacherPlans = activePlans.filter((p) => p.teacher_id === teacher.Teacher_ID);
              const hasSubmitted = teacherPlans.length > 0;
              const hasLate = teacherPlans.some((p) => p.is_late);
              const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
              const isReminderSent = !!reminderSentMap[teacher.Teacher_ID];
              const isExpanded = expandedTeacherId === teacher.Teacher_ID;

              // Average score for this teacher
              const scoredPlans = teacherPlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
              const teacherAvgScore = scoredPlans.length > 0
                ? (scoredPlans.reduce((acc, p) => acc + (p.total_score || 0), 0) / scoredPlans.length).toFixed(1)
                : '-';

              return (
                <div
                  key={teacher.Teacher_ID}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all p-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Info */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                            <span className="text-xs font-bold text-indigo-700">
                              {getInitials(teacher.Name)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate">{teacher.Name}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">{teacher.Teacher_ID}</span>
                            <span className="text-slate-600 truncate max-w-[120px] font-sans">{teacher.Learning_Area}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        {hasSubmitted ? (
                          hasLate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>ส่งช้า</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ตรงเวลา</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-300">
                            <Clock className="w-3 h-3 text-rose-600" />
                            <span>ยังไม่ส่ง</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Plans Chips */}
                    {hasSubmitted ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>เอกสารที่ส่ง:</span>
                          <span className="font-bold text-slate-700 font-mono">{teacherPlans.length} ฉบับ</span>
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {teacherPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                            >
                              <div className="min-w-0 pr-1.5">
                                <div className="font-semibold text-slate-800 text-[11px] truncate">
                                  {plan.subject_code} {plan.subject_name || plan.plan_title}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {plan.is_late ? 'ส่งล่าช้า' : 'ตรงเวลา'} • {new Date(plan.submitted_at).toLocaleDateString('th-TH')}
                                </div>
                              </div>
                              {plan.file_url && (
                                <a
                                  href={plan.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-rose-600 bg-rose-50/50 rounded-xl border border-rose-100 font-medium">
                        ยังไม่มีการส่งเอกสารในระบบ
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {hasSubmitted && teacherAvgScore !== '-' ? (
                      <span className="font-mono text-xs text-slate-600 font-bold">
                        คะแนน: <span className="text-indigo-600">{teacherAvgScore}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}

                    {!hasSubmitted ? (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(teacher.Teacher_ID, teacher.Name)}
                        disabled={isReminderSent}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isReminderSent
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs active:scale-95'
                        }`}
                      >
                        <BellRing className="w-3.5 h-3.5 text-slate-950" />
                        <span>{isReminderSent ? 'เตือนแล้ว ✓' : 'ส่งเตือน'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.Teacher_ID)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                      >
                        {isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียด'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: EXECUTIVE STRATEGIC INSIGHTS (ข้อเสนอแนะเชิงบริหาร) */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white rounded-xl p-3.5 sm:p-4 border border-indigo-100 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2 text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold">
            ข้อสรุปและข้อเสนอแนะเชิงบริหาร (Executive Strategic Insights)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
          <div className="bg-white/90 p-3 rounded-lg border border-indigo-100/80 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ความตรงต่อเวลา</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {totalPlansCount === 0 ? (
                'ยังไม่มีข้อมูลการส่งแผนการสอนในระบบ'
              ) : (
                <>
                  อัตราการส่งงานตรงเวลาอยู่ที่ {onTimeRate}% ({onTimePlans.length} จาก {totalPlansCount} ฉบับ)
                  {areaStats.some((a) => a.isCompleted) ? (
                    ` โดยมีกลุ่มสาระ ${areaStats.filter((a) => a.isCompleted).map((a) => a.name).join(', ')} ส่งครบ 100%`
                  ) : (
                    ' อยู่ระหว่างการติดตามการส่งให้ครบทุกกลุ่มสาระ'
                  )}
                  {latePlans.length > 0 && ` และพบการส่งล่าช้า ${latePlans.length} ฉบับ (${lateRate}%)`}
                </>
              )}
            </p>
          </div>

          <div className="bg-white/90 p-3 rounded-lg border border-indigo-100/80 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 text-xs">
              <Award className="w-3.5 h-3.5" />
              <span>คุณภาพการจัดการเรียนรู้</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {plansWithScore.length === 0 ? (
                'ยังไม่มีข้อมูลคะแนนประเมินคุณภาพจริงในระบบ (รอฝ่ายวิชาการตรวจบันทึกคะแนน)'
              ) : (
                <>
                  คะแนนคุณภาพเฉลี่ยของแผนที่ตรวจประเมินแล้วอยู่ที่ {avgScore}/100 
                  (ตรวจแล้ว {plansWithScore.length} จาก {totalPlansCount} ฉบับ) 
                  {Number(avgScore) >= 90
                    ? ' อยู่ในเกณฑ์ดีเยี่ยม'
                    : Number(avgScore) >= 80
                    ? ' อยู่ในเกณฑ์ดีมาก'
                    : Number(avgScore) >= 70
                    ? ' อยู่ในเกณฑ์ดี'
                    : ' อยู่ในเกณฑ์ควรได้รับการพัฒนา'}
                </>
              )}
            </p>
          </div>

          <div className="bg-white/90 p-3 rounded-lg border border-indigo-100/80 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>มาตรการเร่งรัดติดตาม</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {pendingTeachers.length === 0 ? (
                'บุคลากรครูทุกคนส่งแผนการสอนเข้าระบบครบถ้วน 100% แล้ว'
              ) : (
                `ตรวจพบบุคลากรค้างส่งจำนวน ${pendingTeachers.length} ท่าน ฝ่ายบริหารสามารถกดส่งสัญญาณแจ้งเตือนผ่านระบบหรือประสานหัวหน้ากลุ่มสาระติดตามโดยตรง`
              )}
            </p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* PRINTABLE EXECUTIVE REPORT MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header Controls */}
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold">รายงานสรุปผู้บริหาร (สำหรับพิมพ์ / บันทึก PDF)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Report Content (Printable Layout) */}
            <div className="p-8 sm:p-12 space-y-6 text-slate-900 bg-white">
              {/* Official School Header */}
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
                  ภาคเรียนที่ 1 ปีการศึกษา 2569 • เอกสารสำหรับฝ่ายบริหารและคณะกรรมการสถานศึกษา
                </p>
                <p className="text-xs text-slate-400">
                  วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-4 gap-4 text-center border-b border-slate-200 pb-6 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">จำนวนครูทั้งหมด</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{totalTeachersCount} ท่าน</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">ส่งแผนแล้ว</div>
                  <div className="text-xl font-bold text-indigo-600 mt-1">
                    {submittedTeachers.length} ({submissionRate}%)
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">ส่งตรงเวลา</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">
                    {onTimePlans.length} ({onTimeRate}%)
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">คะแนนเฉลี่ยรวม</div>
                  <div className="text-xl font-bold text-amber-600 mt-1">{avgScore} / 100</div>
                </div>
              </div>

              {/* Department Table in Printout */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">
                  1. ตารางสรุปการส่งงานจำแนกตามกลุ่มสาระการเรียนรู้
                </h3>
                <table className="w-full text-left text-xs border border-slate-300">
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
                  <tbody className="divide-y divide-slate-200">
                    {areaStats.map((stat) => (
                      <tr key={stat.name}>
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

              {/* Pending Teachers List if any */}
              {pendingTeachers.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-sm font-bold text-rose-800">
                    2. รายชื่อครูผู้สอนที่ยังค้างส่งแผนการจัดการเรียนรู้ ({pendingTeachers.length} ท่าน)
                  </h3>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                    {pendingTeachers.map((t, i) => (
                      <div key={t.Teacher_ID} className="flex items-center justify-between">
                        <span>{i + 1}. {t.Name} ({t.Teacher_ID})</span>
                        <span className="font-medium text-rose-700">{t.Learning_Area}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Signature Lines */}
              <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
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
          </div>
        </div>
      )}

      {/* MODAL: Printable Individual Tracker Summary with School Logo */}
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

      {/* FLOATING TOAST: Instant Copy Feedback */}
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
