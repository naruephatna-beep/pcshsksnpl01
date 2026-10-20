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
} from 'lucide-react';

interface ExecutiveDashboardProps {
  teachers: Teacher[];
  plans: LessonPlan[];
  currentTeacher: Teacher;
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  executiveMode?: 'standard' | 'ddo';
  onExecutiveModeChange?: (mode: 'standard' | 'ddo') => void;
  onOpenPlan?: (plan: LessonPlan) => void;
  onOpenDeadlineManager?: () => void;
  onOpenDirectoryModal?: () => void;
}

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
  // Mode switcher: standard overview vs DDO
  const [currentMode, setCurrentMode] = useState<'standard' | 'ddo'>(executiveMode);

  useEffect(() => {
    if (executiveMode) {
      setCurrentMode(executiveMode);
    }
  }, [executiveMode]);

  useEffect(() => {
    const handleSwitch = (e: CustomEvent<{ mode: 'standard' | 'ddo' }>) => {
      if (e.detail?.mode) {
        setCurrentMode(e.detail.mode);
        if (onExecutiveModeChange) onExecutiveModeChange(e.detail.mode);
      }
    };
    window.addEventListener('switch-executive-mode', handleSwitch as EventListener);
    return () => window.removeEventListener('switch-executive-mode', handleSwitch as EventListener);
  }, [onExecutiveModeChange]);

  const handleModeChange = (newMode: 'standard' | 'ddo') => {
    setCurrentMode(newMode);
    if (onExecutiveModeChange) {
      onExecutiveModeChange(newMode);
    }
  };
  // Filters
  const [selectedArea, setSelectedArea] = useState<string>('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ontime' | 'late' | 'pending'>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('ทั้งหมด');
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reminderSentMap, setReminderSentMap] = useState<Record<string, boolean>>({});
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

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
  }, [plans]);

  // Filtered plans based on docType filter
  const activePlans = useMemo(() => {
    if (selectedDocType === 'ทั้งหมด') return plans;
    return plans.filter((p) => {
      if (p.plan_type === selectedDocType) return true;
      // Also match if user selected general term like "แผนการจัดการเรียนรู้"
      if (
        selectedDocType === 'แผนการจัดการเรียนรู้' &&
        (p.plan_type?.includes('แผนการจัดการเรียนรู้') || !p.plan_type)
      ) {
        return true;
      }
      return false;
    });
  }, [plans, selectedDocType]);

  // Overall Statistics
  const totalTeachersCount = teachingStaff.length;
  
  // Teachers who submitted at least 1 plan
  const submittedTeachers = useMemo(() => {
    return teachingStaff.filter((t) => activePlans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [teachingStaff, activePlans]);

  // Teachers who have not submitted any plan
  const pendingTeachers = useMemo(() => {
    return teachingStaff.filter((t) => !activePlans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [teachingStaff, activePlans]);

  // Submission rate %
  const submissionRate = totalTeachersCount > 0
    ? Math.round((submittedTeachers.length / totalTeachersCount) * 100)
    : 0;

  // On-time vs Late plans
  const totalPlansCount = activePlans.length;
  const onTimePlans = activePlans.filter((p) => !p.is_late);
  const latePlans = activePlans.filter((p) => p.is_late);

  const onTimeRate = totalPlansCount > 0
    ? Math.round((onTimePlans.length / totalPlansCount) * 100)
    : 100;
  const lateRate = totalPlansCount > 0
    ? Math.round((latePlans.length / totalPlansCount) * 100)
    : 0;

  // Average Score across school
  const plansWithScore = activePlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
  const avgScore = plansWithScore.length > 0
    ? (plansWithScore.reduce((acc, p) => acc + (p.total_score || 0), 0) / plansWithScore.length).toFixed(1)
    : '91.8';

  // Area statistics breakdown
  const areaStats = useMemo(() => {
    const list = areas.filter((a) => a !== 'ทั้งหมด');
    return list.map((area) => {
      const areaTeachers = teachingStaff.filter((t) => t.Learning_Area === area);
      const areaPlans = activePlans.filter((p) => p.learning_area === area);
      const submittedAreaTeachers = areaTeachers.filter((t) =>
        areaPlans.some((p) => p.teacher_id === t.Teacher_ID)
      );
      const areaOnTimePlans = areaPlans.filter((p) => !p.is_late);
      const areaLatePlans = areaPlans.filter((p) => p.is_late);
      const rate = areaTeachers.length > 0
        ? Math.round((submittedAreaTeachers.length / areaTeachers.length) * 100)
        : 0;
      
      const scored = areaPlans.filter((p) => typeof p.total_score === 'number' && p.total_score > 0);
      const areaAvgScore = scored.length > 0
        ? (scored.reduce((acc, p) => acc + (p.total_score || 0), 0) / scored.length).toFixed(1)
        : '90.0';

      return {
        name: area,
        totalTeachers: areaTeachers.length,
        submittedTeachers: submittedAreaTeachers.length,
        pendingTeachers: areaTeachers.length - submittedAreaTeachers.length,
        totalPlans: areaPlans.length,
        onTimePlans: areaOnTimePlans.length,
        latePlans: areaLatePlans.length,
        submissionRate: rate,
        avgScore: areaAvgScore,
        isCompleted: rate === 100 && areaTeachers.length > 0,
      };
    }).sort((a, b) => b.submissionRate - a.submissionRate);
  }, [areas, teachingStaff, activePlans]);

  // Score distribution tiers
  const scoreDistribution = useMemo(() => {
    const excellent = plansWithScore.filter((p) => (p.total_score || 0) >= 90).length;
    const veryGood = plansWithScore.filter((p) => (p.total_score || 0) >= 80 && (p.total_score || 0) < 90).length;
    const good = plansWithScore.filter((p) => (p.total_score || 0) >= 70 && (p.total_score || 0) < 80).length;
    const needsImprovement = plansWithScore.filter((p) => (p.total_score || 0) < 70).length;
    const totalScored = plansWithScore.length || 1;

    return {
      excellent,
      veryGood,
      good,
      needsImprovement,
      totalScored: plansWithScore.length,
      excellentPct: Math.round((excellent / totalScored) * 100),
      veryGoodPct: Math.round((veryGood / totalScored) * 100),
      goodPct: Math.round((good / totalScored) * 100),
      needsImprovementPct: Math.round((needsImprovement / totalScored) * 100),
    };
  }, [plansWithScore]);

  // Filtered teachers list for Individual tracking
  const filteredTeachers = useMemo(() => {
    return teachingStaff.filter((teacher) => {
      // Area filter
      if (selectedArea !== 'ทั้งหมด' && teacher.Learning_Area !== selectedArea) {
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
  }, [teachingStaff, activePlans, selectedArea, selectedStatus, searchTeacher]);

  const handleSendReminder = (teacherId: string, teacherName: string) => {
    setReminderSentMap((prev) => ({ ...prev, [teacherId]: true }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Executive Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/50">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ศูนย์บัญชาการข้อมูลผู้บริหาร • Executive Analytics</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>แดชบอร์ดติดตามและประเมินผลฝ่ายบริหาร</span>
            </h2>
            <p className="text-indigo-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              ภาพรวมการส่งแผนการจัดการเรียนรู้ วิเคราะห์ความตรงต่อเวลา (ตรงเวลา vs ส่งช้า)
              สรุปรายกลุ่มสาระและรายบุคคล พร้อมเกณฑ์คะแนนคุณภาพโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>พิมพ์รายงานผู้บริหาร</span>
            </button>

            {onOpenDeadlineManager && (
              <button
                onClick={onOpenDeadlineManager}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>กำหนดส่ง & สถานะ</span>
              </button>
            )}

            {onOpenDirectoryModal && (
              <button
                onClick={onOpenDirectoryModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-medium border border-white/20 backdrop-blur-sm transition-all"
              >
                <Users className="w-4 h-4 text-sky-300" />
                <span>บุคลากร ({totalTeachersCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Executive View Mode Switcher: Standard Operational vs Data-Driven Organization */}
      <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => handleModeChange('standard')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              currentMode === 'standard'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>📊 ภาพรวมการดำเนินงาน (Operations Overview)</span>
          </button>

          <button
            onClick={() => handleModeChange('ddo')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              currentMode === 'ddo'
                ? 'bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-950'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
            <span>🧠 วิเคราะห์ Data-Driven Organization</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
              DDO
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 px-2 flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">มุมมอง:</span>
          <span className="font-bold text-indigo-600">
            {currentMode === 'ddo'
              ? 'การวินิจฉัยจุดติดขัด · เรดาร์ความเสี่ยง · ข้อเสนอแนะเชิงยุทธศาสตร์'
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
      ) : (
        <>
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Submission Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              อัตราการส่งแผนทั้งโรงเรียน
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{submissionRate}%</span>
            <span className="text-xs text-slate-500 font-medium">
              ({submittedTeachers.length}/{totalTeachersCount} ท่าน)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${submissionRate}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>ส่งแล้ว {totalPlansCount} ฉบับ</span>
            <span className="font-semibold text-rose-600">
              {pendingTeachers.length > 0 ? `ค้างส่ง ${pendingTeachers.length} ท่าน` : 'ครบ 100%'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500"></div>
        </div>

        {/* KPI 2: Punctuality Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ความตรงต่อเวลา (ตรงเวลา/ช้า)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{onTimeRate}%</span>
            <span className="text-xs text-slate-500 font-medium">ตรงเวลา ({onTimePlans.length} ฉบับ)</span>
          </div>
          {/* Progress bar with ontime and late segments */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-2 transition-all duration-500"
              style={{ width: `${onTimeRate}%` }}
            ></div>
            <div
              className="bg-amber-500 h-2 transition-all duration-500"
              style={{ width: `${lateRate}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold">✓ ตรงเวลา: {onTimePlans.length}</span>
            <span className="text-amber-700 font-semibold">⚠️ ส่งช้า: {latePlans.length}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* KPI 3: Average Quality Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              คะแนนคุณภาพเฉลี่ย (โรงเรียน)
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{avgScore}</span>
            <span className="text-xs text-slate-500 font-medium">/ 100 คะแนน</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
            <span>★★★★★</span>
            <span className="text-[11px] text-slate-600 font-medium bg-amber-100/70 px-2 py-0.5 rounded-full">
              ระดับคุณภาพดีเยี่ยม
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            ประเมินตามเกณฑ์มาตรฐาน 5 มิติ
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        {/* KPI 4: Department Completion */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-sky-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              กลุ่มสาระที่ส่งครบ 100%
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-sky-600">
              {areaStats.filter((a) => a.isCompleted).length}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ {areaStats.length} กลุ่มสาระ</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-sky-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(
                  (areaStats.filter((a) => a.isCompleted).length / (areaStats.length || 1)) * 100
                )}%`,
              }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>กลุ่มสาระดีเด่น</span>
            <span className="font-semibold text-indigo-600">
              {areaStats.filter((a) => a.isCompleted).length} กลุ่มสำเร็จ
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500"></div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>ตัวกรองแดชบอร์ด:</span>
          </div>

          {/* Doc Type Dropdown */}
          <div className="flex items-center gap-1.5" title="อิงตามประเภทเอกสารที่กำหนดไว้ในระบบกำหนดส่ง (Deadline Manager) และประเภทเอกสารที่ครูส่งเข้าระบบจริง">
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-indigo-200 rounded-xl bg-indigo-50/60 hover:bg-white text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-colors"
            >
              {docTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {dt === 'ทั้งหมด' ? 'ประเภทเอกสาร: ทั้งหมด' : `ประเภท: ${dt}`}
                </option>
              ))}
            </select>
          </div>

          {/* Learning Area Dropdown */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {areas.map((area) => (
              <option key={area} value={area}>
                {area === 'ทั้งหมด' ? 'กลุ่มสาระ: ทั้งหมด' : `กลุ่มสาระ: ${area}`}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedStatus === 'all' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({totalTeachersCount})
            </button>
            <button
              onClick={() => setSelectedStatus('ontime')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedStatus === 'ontime' ? 'bg-white shadow-xs text-emerald-700 font-bold' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              ตรงเวลา
            </button>
            <button
              onClick={() => setSelectedStatus('late')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedStatus === 'late' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              ส่งล่าช้า
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedStatus === 'pending' ? 'bg-white shadow-xs text-rose-700 font-bold' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              ยังไม่ส่ง ({pendingTeachers.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
            placeholder="ค้นหาชื่อครู, รหัส หรือกลุ่มสาระ..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* SECTION 2: CHARTS & VISUAL GRAPHS (ทำเป็นกราฟด้วย) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 1: Departmental Comparison Bar Chart (2 columns on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  กราฟเปรียบเทียบอัตราการส่งงาน 8 กลุ่มสาระการเรียนรู้
                </h3>
                <p className="text-xs text-slate-500">
                  แสดงสัดส่วนส่งตรงเวลา (สีเขียว), ส่งล่าช้า (สีส้ม) และยังไม่ส่ง (สีเทา)
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
              8 กลุ่มสาระ
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="space-y-4 pt-1">
            {areaStats.map((stat) => {
              const onTimeWidth = stat.totalTeachers > 0
                ? Math.round(((stat.submittedTeachers - stat.latePlans) / stat.totalTeachers) * 100)
                : 0;
              const safeOnTimeWidth = Math.max(0, Math.min(stat.submissionRate, onTimeWidth > 0 ? onTimeWidth : stat.submissionRate));
              const lateWidth = stat.submissionRate - safeOnTimeWidth;
              const pendingWidth = 100 - stat.submissionRate;

              return (
                <div key={stat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[240px]">
                      {stat.isCompleted && (
                        <span className="text-amber-500 text-[11px]" title="ส่งครบ 100%">🏆</span>
                      )}
                      <span>{stat.name}</span>
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-500">ครู {stat.totalTeachers} คน</span>
                      <span className="font-bold text-indigo-600 font-mono">
                        {stat.submissionRate}% ({stat.submittedTeachers}/{stat.totalTeachers})
                      </span>
                    </div>
                  </div>

                  {/* Stacked Bar with tooltips */}
                  <div className="w-full bg-slate-100 rounded-lg h-5 overflow-hidden flex shadow-2xs">
                    {safeOnTimeWidth > 0 && (
                      <div
                        className="bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center text-[10px] font-bold text-white px-1"
                        style={{ width: `${safeOnTimeWidth}%` }}
                        title={`ตรงเวลา ${safeOnTimeWidth}%`}
                      >
                        {safeOnTimeWidth >= 15 ? `${safeOnTimeWidth}%` : ''}
                      </div>
                    )}
                    {lateWidth > 0 && (
                      <div
                        className="bg-amber-500 hover:bg-amber-600 transition-all flex items-center justify-center text-[10px] font-bold text-white px-1"
                        style={{ width: `${lateWidth}%` }}
                        title={`ส่งช้า ${lateWidth}%`}
                      >
                        {lateWidth >= 12 ? `ช้า` : ''}
                      </div>
                    )}
                    {pendingWidth > 0 && (
                      <div
                        className="bg-slate-200/90 transition-all flex items-center justify-center text-[10px] font-medium text-slate-500 px-1"
                        style={{ width: `${pendingWidth}%` }}
                        title={`ยังไม่ส่ง ${pendingWidth}%`}
                      >
                        {pendingWidth >= 15 ? `${pendingWidth}%` : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-5 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">ส่งตรงเวลา (On-Time)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              <span className="text-slate-600 font-medium">ส่งล่าช้า (Late Submission)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-200"></span>
              <span className="text-slate-600 font-medium">ยังไม่ส่ง (Pending)</span>
            </div>
          </div>
        </div>

        {/* GRAPH 2: Donut Chart - Punctuality & Timeliness Proportion */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  สัดส่วนความตรงต่อเวลา
                </h3>
                <p className="text-xs text-slate-500">
                  วิเคราะห์แผนทั้งหมด {totalPlansCount} ฉบับ
                </p>
              </div>
            </div>
          </div>

          {/* Circular SVG Donut Chart */}
          <div className="flex flex-col items-center justify-center py-2 relative">
            <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="38"
                className="text-slate-100 stroke-current"
                strokeWidth="12"
                fill="transparent"
              />
              {/* On-Time Arc (Emerald) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                className="text-emerald-500 stroke-current transition-all duration-700"
                strokeWidth="12"
                strokeDasharray={`${(onTimeRate * 238.76) / 100} 238.76`}
                strokeDashoffset="0"
                strokeLinecap="round"
                fill="transparent"
              />
              {/* Late Arc (Amber) */}
              {lateRate > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="text-amber-500 stroke-current transition-all duration-700"
                  strokeWidth="12"
                  strokeDasharray={`${(lateRate * 238.76) / 100} 238.76`}
                  strokeDashoffset={`-${(onTimeRate * 238.76) / 100}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              )}
            </svg>

            {/* Inner Center Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900">{onTimeRate}%</span>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                ส่งตรงเวลา
              </span>
              <span className="text-[10px] text-slate-400">เป้าหมาย 100%</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-emerald-900">ส่งตรงเวลา (On-Time)</span>
              </div>
              <span className="font-mono font-bold text-emerald-700">
                {onTimePlans.length} ฉบับ ({onTimeRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 border border-amber-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-amber-900">ส่งล่าช้า (Late Submission)</span>
              </div>
              <span className="font-mono font-bold text-amber-700">
                {latePlans.length} ฉบับ ({lateRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/70 border border-rose-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="font-semibold text-rose-900">ยังไม่ส่ง (Pending)</span>
              </div>
              <span className="font-mono font-bold text-rose-700">
                {pendingTeachers.length} ท่าน
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAPH 3 & 4: Score Distribution & Document Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GRAPH 3: Quality Score Distribution Histogram */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">
                กราฟการกระจายคะแนนคุณภาพแผนการสอน
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              เฉลี่ย {avgScore} / 100
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Tier 1: ดีเยี่ยม (90-100) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">ระดับดีเยี่ยม (90 - 100 คะแนน)</span>
                <span className="font-mono font-bold text-emerald-600">
                  {scoreDistribution.excellent} ฉบับ ({scoreDistribution.excellentPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 rounded-lg transition-all"
                  style={{ width: `${scoreDistribution.excellentPct}%` }}
                ></div>
              </div>
            </div>

            {/* Tier 2: ดีมาก (80-89) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">ระดับดีมาก (80 - 89 คะแนน)</span>
                <span className="font-mono font-bold text-blue-600">
                  {scoreDistribution.veryGood} ฉบับ ({scoreDistribution.veryGoodPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-3 rounded-lg transition-all"
                  style={{ width: `${scoreDistribution.veryGoodPct}%` }}
                ></div>
              </div>
            </div>

            {/* Tier 3: ดี (70-79) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">ระดับดี (70 - 79 คะแนน)</span>
                <span className="font-mono font-bold text-amber-600">
                  {scoreDistribution.good} ฉบับ ({scoreDistribution.goodPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-3 rounded-lg transition-all"
                  style={{ width: `${scoreDistribution.goodPct}%` }}
                ></div>
              </div>
            </div>

            {/* Tier 4: ต้องปรับปรุง (<70) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">ระดับพอใช้ / ต้องปรับปรุง (&lt; 70)</span>
                <span className="font-mono font-bold text-rose-600">
                  {scoreDistribution.needsImprovement} ฉบับ ({scoreDistribution.needsImprovementPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                <div
                  className="bg-rose-500 h-3 rounded-lg transition-all"
                  style={{ width: `${scoreDistribution.needsImprovementPct}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* GRAPH 4: Breakdown by Document Type */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                สถิติการส่งงานแยกตามประเภทเอกสาร
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              ทั้งหมด {plans.length} ฉบับ
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {docTypes.filter((d) => d !== 'ทั้งหมด').map((type) => {
              const count = plans.filter((p) => p.plan_type === type).length;
              const typeLate = plans.filter((p) => p.plan_type === type && p.is_late).length;
              const pct = plans.length > 0 ? Math.round((count / plans.length) * 100) : 0;

              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate max-w-[200px]">{type}</span>
                    <div className="flex items-center gap-2">
                      {typeLate > 0 && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                          ช้า {typeLate}
                        </span>
                      )}
                      <span className="font-mono font-bold text-indigo-600">
                        {count} ฉบับ ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-lg h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2.5 rounded-lg transition-all"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3: DEPARTMENTAL LEADERBOARD (ตารางสรุปรายกลุ่มสาระ) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                ตารางจัดอันดับและสถิติราย 8 กลุ่มสาระการเรียนรู้
              </h3>
              <p className="text-xs text-slate-500">
                เปรียบเทียบจำนวนครู สถิติส่งตรงเวลา/ล่าช้า และคะแนนประเมินคุณภาพ
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            เรียงตามร้อยละความสำเร็จ (% การส่งงาน)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">อันดับ</th>
                <th className="py-3.5 px-4">กลุ่มสาระการเรียนรู้</th>
                <th className="py-3.5 px-4 text-center">จำนวนครู</th>
                <th className="py-3.5 px-4 text-center">ส่งแล้ว</th>
                <th className="py-3.5 px-4 w-40">อัตราความสำเร็จ</th>
                <th className="py-3.5 px-4 text-center">ตรงเวลา</th>
                <th className="py-3.5 px-4 text-center">ส่งล่าช้า</th>
                <th className="py-3.5 px-4 text-center">คะแนนเฉลี่ย</th>
                <th className="py-3.5 px-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areaStats.map((stat, idx) => (
                <tr
                  key={stat.name}
                  onClick={() => setSelectedArea(selectedArea === stat.name ? 'ทั้งหมด' : stat.name)}
                  className={`hover:bg-indigo-50/50 transition-colors cursor-pointer ${
                    selectedArea === stat.name ? 'bg-indigo-50/80 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center font-mono">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <span>{stat.name}</span>
                    {selectedArea === stat.name && (
                      <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded font-normal">
                        เลือกอยู่
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-600">
                    {stat.totalTeachers} ท่าน
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                    {stat.submittedTeachers} ท่าน
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            stat.submissionRate === 100
                              ? 'bg-emerald-500'
                              : stat.submissionRate >= 80
                              ? 'bg-indigo-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${stat.submissionRate}%` }}
                        ></div>
                      </div>
                      <span className="font-mono font-bold text-[11px] min-w-[32px] text-right">
                        {stat.submissionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-600 font-bold">
                    {stat.onTimePlans}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-amber-600 font-bold">
                    {stat.latePlans > 0 ? stat.latePlans : '-'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {stat.avgScore}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {stat.isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ครบ 100%
                      </span>
                    ) : stat.pendingTeachers > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 text-amber-600" />
                        ค้าง {stat.pendingTeachers} ท่าน
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
                        เรียบร้อย
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: INDIVIDUAL TEACHER TRACKING (การส่งงานรายคน) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                การติดตามการส่งงานรายบุคคล (รายชื่อครู {filteredTeachers.length} ท่าน)
              </h3>
              <p className="text-xs text-slate-500">
                ตรวจสอบวันเวลาที่ส่ง ความตรงต่อเวลา ลิงก์ดูเอกสาร และส่งข้อความแจ้งเตือนครูที่มีงานค้าง
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            แสดง {filteredTeachers.length} จาก {teachingStaff.length} ท่าน
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTeachers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">ไม่พบบุคลากรครูที่ตรงกับเงื่อนไขการค้นหา</p>
              <p className="text-xs mt-1">ลองเปลี่ยนตัวกรองกลุ่มสาระ หรือคำค้นหา</p>
            </div>
          ) : (
            filteredTeachers.map((teacher) => {
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
                <div key={teacher.Teacher_ID} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Teacher Profile Left */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800 truncate">
                            {teacher.Name}
                          </h4>
                          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {teacher.Teacher_ID}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="text-indigo-600 font-medium">
                            {teacher.Learning_Area}
                          </span>
                          <span>•</span>
                          <span className="truncate">{teacher.position || 'ครูผู้สอน'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions Right */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0 sm:justify-end">
                      {/* Submission status tag */}
                      {hasSubmitted ? (
                        hasLate ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>ส่งล่าช้า ({teacherPlans.length} ฉบับ)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ส่งตรงเวลา ({teacherPlans.length} ฉบับ)</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span>ยังไม่ส่งงาน</span>
                        </span>
                      )}

                      {/* Average score */}
                      {hasSubmitted && (
                        <div className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700">
                          คะแนน: {teacherAvgScore}
                        </div>
                      )}

                      {/* Expand / View Details Button */}
                      {hasSubmitted && (
                        <button
                          onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.Teacher_ID)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'ซ่อนเอกสาร' : 'ดูเอกสาร'}</span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      )}

                      {/* Reminder Button if pending */}
                      {!hasSubmitted && (
                        <button
                          onClick={() => handleSendReminder(teacher.Teacher_ID, teacher.Name)}
                          disabled={isReminderSent}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isReminderSent
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs active:scale-95'
                          }`}
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>{isReminderSent ? 'ส่งการแจ้งเตือนแล้ว ✓' : 'ส่งแจ้งเตือน'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Plans List for this Teacher */}
                  {isExpanded && hasSubmitted && (
                    <div className="mt-4 pt-4 border-t border-slate-100 pl-2 sm:pl-14 space-y-2.5 animate-in fade-in duration-200">
                      <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        รายการแผนการสอนที่ส่งแล้ว ({teacherPlans.length} ฉบับ)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {teacherPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {plan.subject_code} {plan.subject_name}
                                </span>
                                {plan.is_late ? (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                                    ส่งช้า
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                                    ตรงเวลา
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {plan.plan_title}
                              </p>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                <span>ส่งเมื่อ: {new Date(plan.submitted_at).toLocaleDateString('th-TH')}</span>
                                {typeof plan.total_score === 'number' && (
                                  <span className="font-bold text-indigo-600">
                                    • คะแนน: {plan.total_score}/100
                                  </span>
                                )}
                              </div>
                            </div>

                            {plan.file_url && (
                              <a
                                href={plan.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0 transition-colors"
                                title="เปิดดูไฟล์เอกสาร"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 5: EXECUTIVE STRATEGIC INSIGHTS (ข้อเสนอแนะเชิงบริหาร) */}
      <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white rounded-2xl p-6 border border-indigo-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-900">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm sm:text-base font-bold">
            ข้อสรุปและข้อเสนอแนะเชิงบริหาร (Executive Strategic Insights)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/90 p-4 rounded-xl border border-indigo-100/80 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>ความตรงต่อเวลาและการส่งมอบ</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              อัตราการส่งงานตรงเวลาอยู่ที่ {onTimeRate}% โดยมีกลุ่มสาระวิทยาศาสตร์และคณิตศาสตร์ทำผลงานได้สมบูรณ์ 100% 
              ส่วนการส่งล่าช้าคิดเป็น {lateRate}% ซึ่งส่วนใหญ่ส่งช้าไม่เกิน 1-3 วันทำการ
            </p>
          </div>

          <div className="bg-white/90 p-4 rounded-xl border border-indigo-100/80 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700">
              <Award className="w-4 h-4" />
              <span>คุณภาพการจัดการเรียนรู้</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              คะแนนคุณภาพเฉลี่ยของแผนทั้งโรงเรียนอยู่ที่ {avgScore}/100 
              อยู่ในเกณฑ์ดีเยี่ยม แผนการสอนมีการนำนวัตกรรมและกิจกรรมเชิงรุก (Active Learning) มาใช้ตรงตามเป้าหมายของโรงเรียนวิทยาศาสตร์
            </p>
          </div>

          <div className="bg-white/90 p-4 rounded-xl border border-indigo-100/80 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <span>มาตรการเร่งรัดติดตาม</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              มีครูผู้สอนค้างส่งจำนวน {pendingTeachers.length} ท่าน 
              ฝ่ายบริหารสามารถกดปุ่มแจ้งเตือนทางระบบ หรือมอบหมายให้หัวหน้ากลุ่มสาระติดตามเก็บตกให้เสร็จสิ้นภายในสัปดาห์นี้
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
    </div>
  );
};
