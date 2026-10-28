import React, { useState, useMemo } from 'react';
import { Teacher, LessonPlan, isTeacherAdmin, PlanTypeDeadlineConfig } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  Users,
  Compass,
  FileCheck,
  Send,
  Layers,
  ChevronRight,
  Printer,
  ShieldCheck,
  AlertCircle,
  FileText,
  BarChart2,
  BrainCircuit,
  Lightbulb,
  Building2,
  Sliders,
  CheckCheck,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';

interface DataDrivenOrgViewProps {
  teachers: Teacher[];
  plans: LessonPlan[];
  currentTeacher: Teacher;
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  onOpenPlan?: (plan: LessonPlan) => void;
  onOpenDirectoryModal?: () => void;
}

export const DataDrivenOrgView: React.FC<DataDrivenOrgViewProps> = ({
  teachers,
  plans,
  currentTeacher,
  deadlineConfigs,
  onOpenPlan,
  onOpenDirectoryModal,
}) => {
  // Selected department filter in DDO
  const [selectedArea, setSelectedArea] = useState<string>('ทั้งหมด');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [targetSlaGoal, setTargetSlaGoal] = useState<number>(95); // Interactive simulation slider
  const [alertSentMap, setAlertSentMap] = useState<Record<string, boolean>>({});
  const [isDdoPrintModalOpen, setIsDdoPrintModalOpen] = useState<boolean>(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4'>('all');
  const [selectedChartTab, setSelectedChartTab] = useState<'all' | 'scatter' | 'radar' | 'velocity' | 'friction'>('all');
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  // Filter teaching staff
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

  // 1. Core DDO Computations & Data Maturity
  const totalTeachers = teachingStaff.length;
  const submittedTeachers = useMemo(() => {
    return teachingStaff.filter((t) => plans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [teachingStaff, plans]);

  const pendingTeachers = useMemo(() => {
    return teachingStaff.filter((t) => !plans.some((p) => p.teacher_id === t.Teacher_ID));
  }, [teachingStaff, plans]);

  const totalPlans = plans.length;
  const onTimePlans = useMemo(() => plans.filter((p) => !p.is_late), [plans]);
  const latePlans = useMemo(() => plans.filter((p) => !!p.is_late), [plans]);

  // Overall rates
  const submissionRate = totalTeachers > 0 ? Math.round((submittedTeachers.length / totalTeachers) * 100) : 0;
  const onTimeRate = totalPlans > 0 ? Math.round((onTimePlans.length / totalPlans) * 100) : 0;
  const lateRate = totalPlans > 0 ? Math.round((latePlans.length / totalPlans) * 100) : 0;

  // First-Time Approval Rate (FTAR): plans approved without needing revision
  const approvedPlans = useMemo(() => plans.filter((p) => p.status === 'approved'), [plans]);
  const revisionPlans = useMemo(() => plans.filter((p) => p.status === 'needs_revision'), [plans]);
  const ftaRate = totalPlans > 0
    ? Math.round(((totalPlans - revisionPlans.length) / totalPlans) * 100)
    : 0;

  // Average Quality Score (only from real evaluated plans)
  const scoredPlans = useMemo(
    () => plans.filter((p) => typeof p.total_score === 'number' && (p.total_score || 0) > 0),
    [plans]
  );
  const avgScore = scoredPlans.length > 0
    ? Number((scoredPlans.reduce((sum, p) => sum + (p.total_score || 0), 0) / scoredPlans.length).toFixed(1))
    : 0;

  // Verified digital files (Google Drive links)
  const filesWithUrl = useMemo(
    () => plans.filter((p) => p.file_url && p.file_url.trim().length > 5),
    [plans]
  );
  const digitalIntegrityRate = totalPlans > 0 ? Math.round((filesWithUrl.length / totalPlans) * 100) : 0;

  // DDO Organizational Health Score (Composite Index 0-100)
  // Weights: Completeness (30%), On-Time Velocity (30%), Pedagogical Quality (25%), Digital Integrity (15%)
  const ddoHealthScore = useMemo(() => {
    if (totalPlans === 0) {
      return Number((submissionRate * 0.30).toFixed(1));
    }
    const completenessScore = submissionRate;
    const velocityScore = onTimeRate;
    const qualityScore = Math.min(100, Math.round((avgScore / 100) * 100));
    const integrityScore = digitalIntegrityRate;

    const composite = (
      completenessScore * 0.30 +
      velocityScore * 0.30 +
      qualityScore * 0.25 +
      integrityScore * 0.15
    );
    return Number(composite.toFixed(1));
  }, [submissionRate, onTimeRate, avgScore, digitalIntegrityRate, totalPlans]);

  // DDO Maturity Stage
  const ddoMaturityLevel = useMemo(() => {
    if (ddoHealthScore >= 85) return { stage: 4, name: 'ระดับ 4: ขับเคลื่อนเชิงยุทธศาสตร์และคาดการณ์ล่วงหน้า (Prescriptive & Predictive Leader)', badgeColor: 'bg-emerald-500 text-slate-950', border: 'border-emerald-300', grade: 'เกรด A' };
    if (ddoHealthScore >= 70) return { stage: 3, name: 'ระดับ 3: วินิจฉัยและตัดสินใจด้วยข้อมูลเชิงลึก (Insight & Diagnostic Driven)', badgeColor: 'bg-indigo-500 text-white', border: 'border-indigo-300', grade: 'เกรด B' };
    if (ddoHealthScore >= 50) return { stage: 2, name: 'ระดับ 2: ติดตามและรายงานผลเชิงบรรยาย (Descriptive Reporting)', badgeColor: 'bg-amber-500 text-slate-950', border: 'border-amber-300', grade: 'เกรด C' };
    return { stage: 1, name: 'ระดับ 1: จัดเก็บข้อมูลเบื้องต้น (Foundational Data Collection)', badgeColor: 'bg-rose-500 text-white', border: 'border-rose-300', grade: 'เกรด D' };
  }, [ddoHealthScore]);

  // 2. Department Analytics Matrix (8 กลุ่มสาระ)
  const departmentMatrix = useMemo(() => {
    return areas
      .filter((a) => a !== 'ทั้งหมด')
      .map((areaName) => {
        const areaTeachers = teachingStaff.filter((t) => t.Learning_Area === areaName);
        const areaSubmittedTeachers = areaTeachers.filter((t) =>
          plans.some((p) => p.teacher_id === t.Teacher_ID)
        );
        const areaPendingTeachers = areaTeachers.filter(
          (t) => !plans.some((p) => p.teacher_id === t.Teacher_ID)
        );
        const areaPlans = plans.filter((p) => p.learning_area === areaName);
        const areaOnTimePlans = areaPlans.filter((p) => !p.is_late);
        const areaLatePlans = areaPlans.filter((p) => !!p.is_late);
        const areaScoredPlans = areaPlans.filter(
          (p) => typeof p.total_score === 'number' && (p.total_score || 0) > 0
        );

        const subRate = areaTeachers.length > 0
          ? Math.round((areaSubmittedTeachers.length / areaTeachers.length) * 100)
          : 0;
        const hasScoredPlans = areaScoredPlans.length > 0;
        const areaAvgScore = hasScoredPlans
          ? Number((areaScoredPlans.reduce((sum, p) => sum + (p.total_score || 0), 0) / areaScoredPlans.length).toFixed(1))
          : 0;
        const onTimePct = areaPlans.length > 0
          ? Math.round((areaOnTimePlans.length / areaPlans.length) * 100)
          : 0;

        // Assign Quadrant based on REAL data
        let quadrant: 'q1' | 'q2' | 'q3' | 'q4' = 'q4';
        let quadrantTitle = 'ยังไม่มีการส่งแผน (No Submissions)';
        let quadrantBadge = 'bg-slate-100 text-slate-700 border-slate-200';

        if (areaPlans.length === 0) {
          quadrant = 'q4';
          quadrantTitle = 'ยังไม่มีการส่งแผน (No Submissions)';
          quadrantBadge = 'bg-slate-100 text-slate-700 border-slate-200';
        } else if (subRate >= 80 && areaAvgScore >= 80) {
          quadrant = 'q1';
          quadrantTitle = 'ความเป็นเลิศ (Role Model)';
          quadrantBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        } else if (subRate < 80 && areaAvgScore >= 80) {
          quadrant = 'q2';
          quadrantTitle = 'คุณภาพสูง/ควรเร่งเวลา (Quality Focus)';
          quadrantBadge = 'bg-blue-100 text-blue-800 border-blue-200';
        } else if (subRate >= 80 && (areaAvgScore < 80 || !hasScoredPlans)) {
          quadrant = 'q3';
          quadrantTitle = 'ส่งตรงเวลา/รอผลประเมิน (Fast Delivery)';
          quadrantBadge = 'bg-amber-100 text-amber-800 border-amber-200';
        } else {
          quadrant = 'q4';
          quadrantTitle = 'ต้องการการสนับสนุนเร่งด่วน (Intervention Needed)';
          quadrantBadge = 'bg-rose-100 text-rose-800 border-rose-200';
        }

        return {
          name: areaName,
          totalTeachers: areaTeachers.length,
          submittedTeachers: areaSubmittedTeachers.length,
          pendingTeachers: areaPendingTeachers.length,
          pendingTeachersList: areaPendingTeachers,
          plansCount: areaPlans.length,
          submissionRate: subRate,
          onTimeRate: onTimePct,
          avgScore: areaAvgScore,
          hasScoredPlans,
          hasSubmissions: areaPlans.length > 0,
          quadrant,
          quadrantTitle,
          quadrantBadge,
          lateCount: areaLatePlans.length,
        };
      })
      .sort((a, b) => b.submissionRate - a.submissionRate || b.avgScore - a.avgScore);
  }, [teachingStaff, plans, areas]);

  // 3. Early Warning & Predictive Risk Radar for Teachers
  const teacherRiskProfiles = useMemo(() => {
    return teachingStaff.map((teacher) => {
      const teacherPlans = plans.filter((p) => p.teacher_id === teacher.Teacher_ID);
      const hasSubmitted = teacherPlans.length > 0;
      const lateCount = teacherPlans.filter((p) => p.is_late).length;
      const revisionCount = teacherPlans.filter((p) => p.status === 'needs_revision').length;

      // Risk score: 0 (No risk) to 100 (High risk)
      let riskScore = 0;
      const riskReasons: string[] = [];

      if (!hasSubmitted) {
        riskScore += 70;
        riskReasons.push('ยังไม่มีการส่งเอกสารแผนในระบบ');
      }
      if (lateCount > 0) {
        riskScore += 25;
        riskReasons.push(`พบประวัติส่งล่าช้า ${lateCount} ฉบับ`);
      }
      if (revisionCount > 0) {
        riskScore += 20;
        riskReasons.push(`มีงานส่งกลับแก้ไข ${revisionCount} ฉบับ`);
      }

      const scored = teacherPlans.filter((p) => typeof p.total_score === 'number' && (p.total_score || 0) > 0);
      if (scored.length > 0) {
        const avg = scored.reduce((sum, p) => sum + (p.total_score || 0), 0) / scored.length;
        if (avg < 80) {
          riskScore += 15;
          riskReasons.push(`คะแนนประเมินเฉลี่ยต่ำกว่าเกณฑ์ (${avg.toFixed(1)}/100)`);
        }
      }

      riskScore = Math.min(100, riskScore);

      let riskTier: 'low' | 'medium' | 'high' = 'low';
      if (riskScore >= 60) riskTier = 'high';
      else if (riskScore >= 25) riskTier = 'medium';

      return {
        teacher,
        plans: teacherPlans,
        riskScore,
        riskTier,
        riskReasons,
        hasSubmitted,
      };
    });
  }, [teachingStaff, plans]);

  // Filtered risk profiles
  const filteredRiskTeachers = useMemo(() => {
    return teacherRiskProfiles.filter((item) => {
      if (selectedArea !== 'ทั้งหมด' && item.teacher.Learning_Area !== selectedArea) {
        return false;
      }
      if (selectedRiskFilter !== 'all' && item.riskTier !== selectedRiskFilter) {
        return false;
      }
      return true;
    });
  }, [teacherRiskProfiles, selectedArea, selectedRiskFilter]);

  // Risk counts
  const highRiskCount = teacherRiskProfiles.filter((t) => t.riskTier === 'high').length;
  const mediumRiskCount = teacherRiskProfiles.filter((t) => t.riskTier === 'medium').length;
  const lowRiskCount = teacherRiskProfiles.filter((t) => t.riskTier === 'low').length;

  // 4. Strategic Prescriptive Actions generated from live data
  const prescriptiveActions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: 'Support' | 'Recognition' | 'Policy' | 'Process';
      urgency: 'high' | 'medium' | 'low';
      target: string;
      evidence: string;
      recommendation: string;
      actionLabel: string;
      onAction?: () => void;
    }> = [];

    // Check if any high risk teachers
    if (highRiskCount > 0) {
      list.push({
        id: 'act-1',
        title: 'จัดมาตรการช่วยเหลือและเร่งรัดค้างส่งเชิงรุก (Proactive Academic Outreach)',
        category: 'Support',
        urgency: 'high',
        target: `ครูค้างส่ง ${highRiskCount} ท่าน`,
        evidence: `ตรวจพบบุคลากร ${highRiskCount} ท่าน ที่ยังไม่บันทึกส่งเอกสารในระบบรอบปัจจุบัน`,
        recommendation:
          'มอบหมายให้หัวหน้ากลุ่มบริหารวิชาการเปิดคลินิกช่วยเหลือด้านการจัดเตรียมเอกสาร และตรวจสอบอุปสรรครายบุคคลภายใน 48 ชั่วโมง',
        actionLabel: 'ส่งบันทึกข้อความประสานงานด่วน',
      });
    }

    // Check top performing departments (100% on time)
    const starDepts = departmentMatrix.filter((d) => d.submissionRate === 100);
    if (starDepts.length > 0) {
      list.push({
        id: 'act-2',
        title: 'ประกาศเกียรติคุณกลุ่มสาระต้นแบบ (Excellence Recognition Program)',
        category: 'Recognition',
        urgency: 'low',
        target: `${starDepts.map((d) => d.name).join(', ')}`,
        evidence: `กลุ่มสาระดังกล่าวบรรลุเป้าหมายการส่งแผน 100% ครบทุกท่าน`,
        recommendation:
          'มอบเกียรติบัตรเชิดชูเกียรติในที่ประชุมประจำเดือน และเชิญเป็นวิทยากรแลกเปลี่ยน Best Practice ในการบริหารจัดการแผนการจัดการเรียนรู้เชิงรุก',
        actionLabel: 'จัดทำประกาศเกียรติคุณ',
      });
    }

    // Check revision rates
    if (revisionPlans.length > 0) {
      list.push({
        id: 'act-3',
        title: 'ยกระดับการเขียนแผนด้วย Rubrics Workshop',
        category: 'Process',
        urgency: 'medium',
        target: 'แผนที่ถูกส่งกลับแก้ไข',
        evidence: `มีแผนการสอนถูกส่งกลับแก้ไข ${revisionPlans.length} ฉบับ คิดเป็น ${100 - ftaRate}% ของแผนทั้งหมด`,
        recommendation:
          'จัดการอบรมทบทวนเกณฑ์รูบริก 5 มิติของโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย โดยเฉพาะด้านการวัดและประเมินผลตามสภาพจริง',
        actionLabel: 'กำหนดปฏิทิน Workshop',
      });
    }

    // Late submissions policy action
    if (latePlans.length > 0) {
      list.push({
        id: 'act-4',
        title: 'การทบทวนกำหนดส่งและสนับสนุนกลุ่มสาระที่ส่งล่าช้า',
        category: 'Policy',
        urgency: 'medium',
        target: `แผนที่ส่งล่าช้า ${latePlans.length} ฉบับ`,
        evidence: `ตรวจพบเอกสารส่งล่าช้ากว่ากำหนด ${latePlans.length} ฉบับ คิดเป็น ${lateRate}% ของเอกสารทั้งหมด`,
        recommendation:
          'ฝ่ายบริหารวิชาการควรทบทวนปฏิทินเดดไลน์และจัดเวลาให้คำปรึกษาแก่กลุ่มสาระที่มีประวัติการส่งล่าช้า',
        actionLabel: 'เปิดระบบตั้งค่ากำหนดส่ง (Deadline Manager)',
      });
    }

    return list;
  }, [highRiskCount, departmentMatrix, revisionPlans.length, ftaRate, latePlans.length, lateRate]);

  // Helper for short department tags
  const getDeptShortName = (name: string) => {
    if (name.includes('วิทยาศาสตร์')) return 'วิทย์';
    if (name.includes('คณิต')) return 'คณิต';
    if (name.includes('ต่างประเทศ')) return 'Eng';
    if (name.includes('ไทย')) return 'ไทย';
    if (name.includes('สังคม')) return 'สังคม';
    if (name.includes('ศิลปะ')) return 'ศิลป์';
    if (name.includes('สุขศึกษา')) return 'สุขฯ';
    if (name.includes('การงาน')) return 'การงาน';
    return name.slice(0, 4);
  };

  // Plans that actually have real rubric scores evaluated
  const plansWithRubrics = useMemo(() => {
    return plans.filter((p) => p.rubric_scores && typeof p.rubric_scores === 'object');
  }, [plans]);

  // 5. 5-Dimension Rubrics Radar Chart Data (คำนวณจากคะแนนประเมินจริงในระบบเท่านั้น)
  const rubricStats = useMemo(() => {
    const count = plansWithRubrics.length;
    if (count === 0) {
      return [
        { key: 'standards', label: '1. มาตรฐานและตัวชี้วัด', score: 0, count: 0 },
        { key: 'activities', label: '2. กิจกรรมเชิงรุก Active Learning', score: 0, count: 0 },
        { key: 'media', label: '3. สื่อดิจิทัลและนวัตกรรม', score: 0, count: 0 },
        { key: 'assessment', label: '4. การวัดประเมินตามสภาพจริง', score: 0, count: 0 },
        { key: 'recording', label: '5. บันทึกสะท้อนคิด & วิจัย', score: 0, count: 0 },
      ];
    }

    const standardsSum = plansWithRubrics.reduce((acc, p) => acc + (p.rubric_scores?.standards || 0), 0);
    const activitiesSum = plansWithRubrics.reduce((acc, p) => acc + (p.rubric_scores?.activities || 0), 0);
    const mediaSum = plansWithRubrics.reduce((acc, p) => acc + (p.rubric_scores?.media || 0), 0);
    const assessmentSum = plansWithRubrics.reduce((acc, p) => acc + (p.rubric_scores?.assessment || 0), 0);
    const recordingSum = plansWithRubrics.reduce((acc, p) => acc + (p.rubric_scores?.recording || 0), 0);

    return [
      { key: 'standards', label: '1. มาตรฐานและตัวชี้วัด', score: Number((standardsSum / count).toFixed(2)), count },
      { key: 'activities', label: '2. กิจกรรมเชิงรุก Active Learning', score: Number((activitiesSum / count).toFixed(2)), count },
      { key: 'media', label: '3. สื่อดิจิทัลและนวัตกรรม', score: Number((mediaSum / count).toFixed(2)), count },
      { key: 'assessment', label: '4. การวัดประเมินตามสภาพจริง', score: Number((assessmentSum / count).toFixed(2)), count },
      { key: 'recording', label: '5. บันทึกสะท้อนคิด & วิจัย', score: Number((recordingSum / count).toFixed(2)), count },
    ];
  }, [plansWithRubrics]);

  // 6. Submission Timeline Data (สร้างจากวัน-เวลาที่ส่งจริงใน submitted_at ของ plans)
  const submissionTimeline = useMemo(() => {
    if (plans.length === 0) return [];

    const sorted = [...plans].sort((a, b) => {
      const da = new Date(a.submitted_at).getTime() || 0;
      const db = new Date(b.submitted_at).getTime() || 0;
      return da - db;
    });

    const dateMap: Record<string, { label: string; count: number }> = {};
    sorted.forEach((p) => {
      let label = 'ไม่ระบุ';
      try {
        const d = new Date(p.submitted_at);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        } else if (p.submitted_at) {
          label = p.submitted_at.split(' ')[0] || p.submitted_at;
        }
      } catch {
        label = 'ไม่ระบุ';
      }
      if (!dateMap[label]) {
        dateMap[label] = { label, count: 0 };
      }
      dateMap[label].count++;
    });

    let cumulative = 0;
    const total = totalTeachers || 1;
    return Object.values(dateMap).map((item) => {
      cumulative += item.count;
      return {
        label: item.label,
        count: item.count,
        cumulative,
        cumulativePct: Math.min(100, Math.round((cumulative / total) * 100)),
      };
    });
  }, [plans, totalTeachers]);

  // 7. Real Document Status Statistics Data (คำนวณจากสถานะจริงของแผน ไม่ใช้ Lead Days สมมุติ)
  const docStatusStats = useMemo(() => {
    const typesSet = new Set<string>();
    (deadlineConfigs || []).forEach((c) => {
      if (c.name?.trim()) typesSet.add(c.name.trim());
    });
    plans.forEach((p) => {
      if (p.plan_type?.trim()) typesSet.add(p.plan_type.trim());
    });

    const typesList = typesSet.size > 0
      ? Array.from(typesSet)
      : ['แผนการจัดการเรียนรู้ฉบับย่อ', 'แผนการจัดการเรียนรู้ฉบับสมบูรณ์'];

    return typesList.map((typeName) => {
      const matching = plans.filter((p) => p.plan_type === typeName || (typeName.includes('แผนการจัดการเรียนรู้') && p.plan_type?.includes(typeName)));
      const count = matching.length;
      const onTime = matching.filter((p) => !p.is_late).length;
      const late = matching.filter((p) => !!p.is_late).length;
      const revisions = matching.filter((p) => p.status === 'needs_revision').length;
      const approved = matching.filter((p) => p.status === 'approved').length;

      return {
        name: typeName,
        total: count,
        onTime,
        late,
        revisions,
        approved,
        onTimePct: count > 0 ? Math.round((onTime / count) * 100) : 0,
        latePct: count > 0 ? Math.round((late / count) * 100) : 0,
        revisionPct: count > 0 ? Math.round((revisions / count) * 100) : 0,
      };
    }).filter((t) => t.total > 0 || (deadlineConfigs || []).some((c) => c.name === t.name));
  }, [plans, deadlineConfigs]);

  // Selected department details from hover
  const hoveredDeptData = useMemo(() => {
    if (!hoveredDept) return null;
    return departmentMatrix.find((d) => d.name === hoveredDept) || null;
  }, [hoveredDept, departmentMatrix]);

  // Helper for Radar chart coordinates (5 vertices)
  const getRadarCoords = (index: number, value: number, maxVal = 5) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    const r = (Math.min(maxVal, Math.max(0, value)) / maxVal) * 85;
    const x = 175 + r * Math.cos(angle);
    const y = 145 + r * Math.sin(angle);
    return { x, y };
  };

  // Helper for Scatter plot coordinates (honest 0-100% and 0-100 score mapping)
  const getScatterCoords = (onTimePct: number, qualityScore: number) => {
    const clampedX = Math.max(0, Math.min(100, onTimePct));
    const x = 50 + (clampedX / 100) * 480;
    const clampedY = Math.max(0, Math.min(100, qualityScore));
    const y = 250 - (clampedY / 100) * 220;
    return { x, y };
  };

  // Handle reminder click
  const handleTriggerAlert = (teacherId: string, teacherName: string) => {
    setAlertSentMap((prev) => ({ ...prev, [teacherId]: true }));
    const event = new CustomEvent('show-toast', {
      detail: {
        type: 'success',
        title: 'ส่งสัญญาณเตือนเชิงยุทธศาสตร์แล้ว',
        message: `ระบบได้ส่งข้อความแจ้งเตือนด่วนไปยัง ${teacherName} เรียบร้อยแล้ว`,
      },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. DDO Executive Strategic Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-[#0B1329] to-indigo-950 text-white p-6 sm:p-8 border border-indigo-900/60 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
              <span>Data-Driven Organization (DDO) Executive Intelligence</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>ศูนย์วิเคราะห์ข้อมูลองค์กรขับเคลื่อนด้วยข้อมูล</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              การบริหารจัดการโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ ยุคดิจิทัลด้วยข้อมูลจริง
              (Real-Time Analytics) ประเมินจุดติดขัดเชิงกระบวนการ พยากรณ์ความเสี่ยง และสนับสนุนการตัดสินใจเชิงยุทธศาสตร์ของผู้บริหาร (Admin 03)
            </p>
          </div>

          {/* DDO Health Gauge Box */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-white/10 stroke-current"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-amber-400 stroke-current transition-all duration-1000"
                  strokeWidth="10"
                  strokeDasharray={`${(ddoHealthScore * 251.32) / 100} 251.32`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-amber-400 font-mono">
                  {ddoHealthScore}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Index</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ดัชนีสุขภาพองค์กร DDO
              </div>
              <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>{ddoMaturityLevel.name.split(':')[0]}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {ddoHealthScore >= 85 ? 'เกรด A+' : 'เกรด A'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 max-w-[200px] leading-tight">
                ขับเคลื่อนด้วย 4 เสาหลัก: ความสมบูรณ์, ความเร็ว, คุณภาพ, และธรรมาภิบาล
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">มุมมองการวิเคราะห์:</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
              Descriptive · Diagnostic · Predictive · Prescriptive
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDdoPrintModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน DDO Executive Brief</span>
            </button>
            {onOpenDirectoryModal && (
              <button
                onClick={onOpenDirectoryModal}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-sky-300" />
                <span>ทำเนียบ ({totalTeachers} ท่าน)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Four Pillars of DDO Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Data Completeness */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. ความสมบูรณ์ของคลังข้อมูล
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{submissionRate}%</span>
            <span className="text-xs text-slate-500 font-medium">({submittedTeachers.length}/{totalTeachers} ท่าน)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${submissionRate}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>เอกสารในระบบ: {totalPlans} ฉบับ</span>
            <span className="font-semibold text-emerald-600">ลิงก์ครบ {digitalIntegrityRate}%</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"></div>
        </div>

        {/* Pillar 2: Turnaround Velocity & SLA */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. ความเร็วและการตรงต่อเวลา
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{onTimeRate}%</span>
            <span className="text-xs text-slate-500 font-medium">SLA Compliance</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${onTimeRate}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>ส่งตรงเวลา: {onTimePlans.length} ฉบับ</span>
            <span className="font-semibold text-amber-600">ล่าช้า: {latePlans.length}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* Pillar 3: First-Time Approval Rate (FTAR) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. อัตราผ่านเกณฑ์รอบแรก (FTAR)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">{ftaRate}%</span>
            <span className="text-xs text-slate-500 font-medium">First-Time Pass</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${ftaRate}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>ไม่ต้องส่งแก้ซ้ำ: {totalPlans - revisionPlans.length}</span>
            <span className="font-semibold text-rose-500">ส่งกลับแก้: {revisionPlans.length}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
        </div>

        {/* Pillar 4: Pedagogical Quality Standard */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-amber-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              4. ดัชนีคุณภาพการจัดการเรียนรู้
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{avgScore}</span>
            <span className="text-xs text-slate-500 font-medium">/ 100 คะแนน</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, avgScore)}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>มาตรฐาน จ.ภ. กาฬสินธุ์</span>
            <span className="font-semibold text-amber-700">เกณฑ์ดีเยี่ยม (5 มิติ)</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>
      </div>

      {/* 2.5 ADVANCED DDO VISUAL ANALYTICS & GRAPHS HUB (ศูนย์รวม 4 กราฟวิเคราะห์ขั้นสูง) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  ศูนย์รวมกราฟวิเคราะห์เชิงลึก (Advanced DDO Visual Analytics Hub)
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  4 กราฟยุทธศาสตร์
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ทัศนมิติข้อมูลเชิงลึก: เมทริกซ์การกระจายตัว 2D, ใยแมงมุมรูบริก 5 มิติ, แนวโน้มอัตราเร่ง Velocity, และวิเคราะห์ความเสียดทาน
              </p>
            </div>
          </div>

          {/* Chart Filter Selector */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedChartTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedChartTab === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แสดงทั้งหมด
            </button>
            <button
              onClick={() => setSelectedChartTab('scatter')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedChartTab === 'scatter'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              🎯 เมทริกซ์ 2D
            </button>
            <button
              onClick={() => setSelectedChartTab('radar')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedChartTab === 'radar'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              🕸️ ใยแมงมุมรูบริก
            </button>
            <button
              onClick={() => setSelectedChartTab('velocity')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedChartTab === 'velocity'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              📈 อัตราเร่ง Velocity
            </button>
            <button
              onClick={() => setSelectedChartTab('friction')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedChartTab === 'friction'
                  ? 'bg-white text-amber-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              📑 ความเสียดทาน
            </button>
          </div>
        </div>

        {/* ROW 1: 2D Quadrant Scatter Plot + 5D Rubrics Radar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* GRAPH 1: 2D Quadrant Scatter Plot (lg:col-span-7) */}
          {(selectedChartTab === 'all' || selectedChartTab === 'scatter') && (
            <div className={`p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4 ${
              selectedChartTab === 'scatter' ? 'lg:col-span-12' : 'lg:col-span-7'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      1. กราฟเมทริกซ์การกระจายตัว 8 กลุ่มสาระ (2D Quadrant Scatter Plot)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      แกน X: ความตรงต่อเวลา (0%-100%) vs แกน Y: คะแนนคุณภาพเฉลี่ยจริง (0-100)
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">คลิกหรือชี้ที่วงกลมเพื่อดูข้อมูล</span>
              </div>

              {/* Vector SVG Scatter Plot */}
              <div className="relative w-full overflow-hidden bg-slate-50/70 rounded-xl p-2 border border-slate-100">
                <svg viewBox="0 0 560 280" className="w-full h-auto select-none">
                  {/* Quadrant Shaded Zones */}
                  {/* Top-Right: Q1 Role Model (Stars) */}
                  <rect x="434" y="25" width="96" height="110" fill="#ecfdf5" fillOpacity="0.65" rx="4" />
                  <text x="525" y="40" textAnchor="end" className="text-[9px] fill-emerald-700 font-bold">
                    ⭐ Q1: บทบาทผู้นำ (Role Model)
                  </text>

                  {/* Top-Left: Q2 Deep Planners / Quality Focus */}
                  <rect x="50" y="25" width="384" height="110" fill="#eff6ff" fillOpacity="0.65" rx="4" />
                  <text x="58" y="40" textAnchor="start" className="text-[9px] fill-blue-700 font-bold">
                    🔷 Q2: เน้นคุณภาพ (Quality Focus)
                  </text>

                  {/* Bottom-Right: Q3 Fast Delivery */}
                  <rect x="434" y="135" width="96" height="115" fill="#fffbeb" fillOpacity="0.65" rx="4" />
                  <text x="525" y="240" textAnchor="end" className="text-[9px] fill-amber-700 font-bold">
                    ⚡ Q3: ส่งงานไว (Fast Delivery)
                  </text>

                  {/* Bottom-Left: Q4 Action Required */}
                  <rect x="50" y="135" width="384" height="115" fill="#fff1f2" fillOpacity="0.65" rx="4" />
                  <text x="58" y="240" textAnchor="start" className="text-[9px] fill-rose-700 font-bold">
                    ⚠️ Q4: เร่งรัดสนับสนุน (Attention)
                  </text>

                  {/* Grid Lines (0, 20, 40, 60, 80, 100%) */}
                  {[0, 20, 40, 60, 80, 100].map((val) => {
                    const xPos = 50 + (val / 100) * 480;
                    return (
                      <g key={val}>
                        <line x1={xPos} y1="25" x2={xPos} y2="250" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                        <text x={xPos} y="265" textAnchor="middle" className="text-[9px] fill-slate-400 font-mono">
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Y Grid Lines (0, 20, 40, 60, 80, 100) */}
                  {[0, 20, 40, 60, 80, 100].map((val) => {
                    const yPos = 250 - (val / 100) * 220;
                    return (
                      <g key={val}>
                        <line x1="50" y1={yPos} x2="530" y2={yPos} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                        <text x="44" y={yPos + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Strategic Benchmark Crosshairs (X=80%, Y=80) */}
                  <line x1="434" y1="20" x2="434" y2="255" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" />
                  <line x1="45" y1="74" x2="535" y2="74" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" />
                  <text x="438" y="32" className="text-[8px] fill-indigo-600 font-bold font-mono">
                    เกณฑ์เป้าหมาย 80%
                  </text>
                  <text x="50" y="70" className="text-[8px] fill-indigo-600 font-bold font-mono">
                    เกณฑ์คุณภาพ 80 คะแนน
                  </text>

                  {/* Department Bubbles - Plot ONLY departments that have real submitted plans */}
                  {departmentMatrix.filter((d) => d.plansCount > 0).map((dept) => {
                    const { x, y } = getScatterCoords(dept.onTimeRate, dept.avgScore);
                    const isHovered = hoveredDept === dept.name;
                    const r = 16 + (dept.totalTeachers > 3 ? 3 : 0);
                    const shortName = getDeptShortName(dept.name);

                    // Colors by quadrant
                    let fillColor = '#10b981';
                    let strokeColor = '#059669';
                    if (dept.quadrant === 'q2') {
                      fillColor = '#3b82f6';
                      strokeColor = '#2563eb';
                    } else if (dept.quadrant === 'q3') {
                      fillColor = '#f59e0b';
                      strokeColor = '#d97706';
                    } else if (dept.quadrant === 'q4') {
                      fillColor = '#f43f5e';
                      strokeColor = '#e11d48';
                    }

                    return (
                      <g
                        key={dept.name}
                        className="cursor-pointer transition-transform duration-200"
                        onMouseEnter={() => setHoveredDept(dept.name)}
                        onClick={() => {
                          setHoveredDept(dept.name);
                          setSelectedArea(selectedArea === dept.name ? 'ทั้งหมด' : dept.name);
                        }}
                      >
                        {/* Glow halo when hovered */}
                        {isHovered && (
                          <circle cx={x} cy={y} r={r + 6} fill={fillColor} fillOpacity="0.3" className="animate-pulse" />
                        )}
                        {/* Main Bubble */}
                        <circle
                          cx={x}
                          cy={y}
                          r={r}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          className="shadow-sm"
                        />
                        {/* Department Label */}
                        <text
                          x={x}
                          y={y + 3.5}
                          textAnchor="middle"
                          className="text-[9px] fill-white font-extrabold pointer-events-none"
                        >
                          {shortName}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Note for departments with zero submissions yet */}
              {departmentMatrix.some((d) => d.plansCount === 0) && (
                <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700">กลุ่มสาระที่ยังไม่มีการส่งแผน:</span>
                  <span className="text-slate-500">
                    {departmentMatrix.filter((d) => d.plansCount === 0).map((d) => d.name).join(', ')}
                  </span>
                </div>
              )}

              {/* Hovered / Clicked Department Quick Detail Strip */}
              {hoveredDeptData ? (
                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                    <span className="font-bold text-indigo-950">{hoveredDeptData.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hoveredDeptData.quadrantBadge}`}>
                      {hoveredDeptData.quadrantTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span>ความตรงเวลา: <strong className="text-emerald-700 font-mono">{hoveredDeptData.onTimeRate}%</strong></span>
                    <span>คะแนนเฉลี่ย: <strong className="text-amber-700 font-mono">{hoveredDeptData.avgScore}</strong>/100</span>
                    <span>ครู: <strong className="text-slate-800 font-mono">{hoveredDeptData.totalTeachers} ท่าน</strong></span>
                    <button
                      onClick={() => setSelectedArea(hoveredDeptData.name)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                    >
                      ดูรายคน
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>แกนแนวตั้งแสดงคะแนนคุณภาพ 5 มิติ • แกนแนวนอนแสดงความตรงต่อเวลา SLA</span>
                  <span className="font-medium">ขนาดวงกลมสัมพันธ์กับจำนวนครูในกลุ่มสาระ</span>
                </div>
              )}
            </div>
          )}

          {/* GRAPH 2: 5-Dimension Rubrics Radar / Spider Chart (lg:col-span-5) */}
          {(selectedChartTab === 'all' || selectedChartTab === 'radar') && (
            <div className={`p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4 ${
              selectedChartTab === 'radar' ? 'lg:col-span-12' : 'lg:col-span-5'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      2. กราฟใยแมงมุมสมรรถนะ 5 มิติ (5D Rubric Radar)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {plansWithRubrics.length > 0
                        ? `คะแนนเฉลี่ยจริงจากแผนที่ประเมินแล้ว ${plansWithRubrics.length} ฉบับ (เต็ม 5.0)`
                        : 'รอผลการตรวจประเมินเกณฑ์รูบริกจากฝ่ายวิชาการ'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-lg">
                  5 มิติ
                </span>
              </div>

              {plansWithRubrics.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Award className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">ยังไม่มีข้อมูลคะแนนประเมินรูบริก 5 มิติจากแผนจริงในระบบ</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    กราฟใยแมงมุมจะคำนวณและวาดจุดตามคะแนนจริงเมื่อผู้ตรวจวิชาการให้คะแนนรูบริกในแผนการสอน
                  </p>
                </div>
              ) : (
                <>
                  {/* Vector SVG Radar Chart */}
                  <div className="relative w-full overflow-hidden flex flex-col items-center justify-center py-1">
                    <svg viewBox="0 0 350 280" className="w-full max-w-[320px] h-auto select-none">
                      {/* Concentric Web Rings (levels 1, 2, 3, 4, 5) */}
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const points = [0, 1, 2, 3, 4]
                          .map((i) => {
                            const { x, y } = getRadarCoords(i, lvl, 5);
                            return `${x},${y}`;
                          })
                          .join(' ');
                        return (
                          <polygon
                            key={lvl}
                            points={points}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth={lvl === 5 ? '1.5' : '1'}
                          />
                        );
                      })}

                      {/* 5 Radial Spoke Lines */}
                      {[0, 1, 2, 3, 4].map((i) => {
                        const { x, y } = getRadarCoords(i, 5, 5);
                        return <line key={i} x1="175" y1="145" x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />;
                      })}

                      {/* Standard Baseline Target (4.0 Level) */}
                      <polygon
                        points={[0, 1, 2, 3, 4].map((i) => {
                          const { x, y } = getRadarCoords(i, 4.0, 5);
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />

                      {/* Actual Score Polygon (Filled Indigo) */}
                      <polygon
                        points={rubricStats.map((item, i) => {
                          const { x, y } = getRadarCoords(i, item.score, 5);
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="#6366f1"
                        fillOpacity="0.28"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                      />

                      {/* Actual Score Vertex Points & Numerical Badges */}
                      {rubricStats.map((item, i) => {
                        const { x, y } = getRadarCoords(i, item.score, 5);
                        return (
                          <g key={item.key}>
                            <circle cx={x} cy={y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                          </g>
                        );
                      })}

                      {/* Axis Vertex Outer Labels with Thai dimension names */}
                      {rubricStats.map((item, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                        const lx = 175 + 115 * Math.cos(angle);
                        const ly = 145 + 115 * Math.sin(angle);
                        const textAnchor = Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';

                        return (
                          <g key={`lbl-${item.key}`}>
                            <text
                              x={lx}
                              y={ly}
                              textAnchor={textAnchor}
                              className="text-[9px] fill-slate-700 font-bold"
                            >
                              {item.label.split(' ')[0]} {item.label.split(' ')[1] || ''}
                            </text>
                            <text
                              x={lx}
                              y={ly + 10}
                              textAnchor={textAnchor}
                              className="text-[8px] fill-indigo-600 font-mono font-bold"
                            >
                              {item.score} / 5.0
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Legend & Summary */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-indigo-600"></span>
                      <span className="font-semibold text-slate-700">
                        คะแนนจริงเฉลี่ย {(rubricStats.reduce((acc, r) => acc + r.score, 0) / 5).toFixed(2)}/5.0 ({plansWithRubrics.length} ฉบับ)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-amber-500 border-t border-dashed border-amber-600"></span>
                      <span className="font-semibold text-amber-700">เกณฑ์มาตรฐาน 4.0/5.0</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ROW 2: Actual Submission Timeline + Document Type Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* GRAPH 3: Actual Submission Timeline (lg:col-span-6) */}
          {(selectedChartTab === 'all' || selectedChartTab === 'velocity') && (
            <div className={`p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4 ${
              selectedChartTab === 'velocity' ? 'lg:col-span-12' : 'lg:col-span-6'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      3. กราฟไทม์ไลน์การส่งงานจริง (Actual Submission Timeline)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      บันทึกความก้าวหน้าสะสมตามวัน-เวลาจริงที่ครูส่งแผนเข้าระบบ
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded-lg">
                  {plans.length} ฉบับ ({submissionRate}%)
                </span>
              </div>

              {submissionTimeline.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <TrendingUp className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">ยังไม่มีประวัติการส่งแผนการสอนจริงในระบบ</p>
                  <p className="text-[11px] text-slate-400">กราฟไทม์ไลน์จะแสดงความก้าวหน้าสะสมทันทีเมื่อมีการส่งแผน</p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Visual Timeline Date Blocks */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    {submissionTimeline.slice(-4).map((item) => (
                      <div key={item.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="text-[10px] text-slate-400 font-medium truncate">{item.label}</div>
                        <div className="text-base font-extrabold text-slate-900 font-mono">
                          +{item.count} <span className="text-[10px] font-normal text-slate-500">ฉบับ</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${item.cumulativePct}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono pt-0.5">
                          <span>สะสม {item.cumulative}</span>
                          <span className="text-indigo-600 font-bold">{item.cumulativePct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SVG Cumulative Progress Curve */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                    <svg viewBox="0 0 500 120" className="w-full h-auto select-none">
                      <defs>
                        <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* 100% Target line */}
                      <line x1="30" y1="20" x2="470" y2="20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="475" y="24" textAnchor="start" className="text-[8px] fill-slate-400 font-mono">
                        100%
                      </text>

                      {/* Dynamic Dots & Line from real timeline */}
                      {(() => {
                        const pts = submissionTimeline.map((item, idx) => {
                          const px = submissionTimeline.length === 1
                            ? 250
                            : 50 + (idx / (submissionTimeline.length - 1)) * 400;
                          const py = 100 - (item.cumulativePct * 0.8);
                          return { px, py, item };
                        });

                        const pathStr = pts.length > 1
                          ? `M ${pts[0].px} ${pts[0].py} ` + pts.slice(1).map(p => `L ${p.px} ${p.py}`).join(' ')
                          : `M 50 ${pts[0]?.py || 100} L 450 ${pts[0]?.py || 100}`;

                        const areaStr = pts.length > 1
                          ? `M ${pts[0].px} 100 L ${pts[0].px} ${pts[0].py} ` + pts.slice(1).map(p => `L ${p.px} ${p.py}`).join(' ') + ` L ${pts[pts.length - 1].px} 100 Z`
                          : '';

                        return (
                          <>
                            {areaStr && <path d={areaStr} fill="url(#velocityGrad)" />}
                            <path d={pathStr} fill="none" stroke="#2563eb" strokeWidth="2.5" />
                            {pts.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.px} cy={p.py} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                                <text x={p.px} y={p.py - 8} textAnchor="middle" className="text-[9px] fill-blue-800 font-bold font-mono">
                                  {p.item.cumulative} ฉบับ
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ข้อมูลการส่งสะสมตามวัน-เวลาจริง ({plans.length} ฉบับ จากครู {submittedTeachers.length} ท่าน)</span>
                    </span>
                    <span className="font-mono text-slate-600">ส่งตรงเวลา: {onTimePlans.length} ฉบับ</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GRAPH 4: Document Type Status Breakdown (lg:col-span-6) */}
          {(selectedChartTab === 'all' || selectedChartTab === 'friction') && (
            <div className={`p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4 ${
              selectedChartTab === 'friction' ? 'lg:col-span-12' : 'lg:col-span-6'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      4. กราฟวิเคราะห์สถานะจำแนกตามประเภทเอกสาร (Document Type Status Breakdown)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      สัดส่วนตรงเวลา / ส่งช้า / ส่งกลับแก้ไข จากแผนการสอนจริงในระบบ
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded-lg">
                  {docStatusStats.length} ประเภท
                </span>
              </div>

              {docStatusStats.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">ยังไม่มีข้อมูลประเภทเอกสารในระบบ</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {docStatusStats.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[240px]" title={item.name}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-slate-600 font-bold">
                            {item.total} ฉบับ
                          </span>
                          {item.onTime > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold font-mono">
                              ตรงเวลา {item.onTime}
                            </span>
                          )}
                          {item.late > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold font-mono">
                              ช้า {item.late}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stacked Bar with real color segments */}
                      <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden flex shadow-2xs">
                        {item.onTimePct > 0 && (
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{ width: `${item.onTimePct}%` }}
                            title={`ตรงเวลา ${item.onTimePct}% (${item.onTime} ฉบับ)`}
                          ></div>
                        )}
                        {item.latePct > 0 && (
                          <div
                            className="bg-amber-500 transition-all"
                            style={{ width: `${item.latePct}%` }}
                            title={`ส่งช้า ${item.latePct}% (${item.late} ฉบับ)`}
                          ></div>
                        )}
                        {item.revisionPct > 0 && (
                          <div
                            className="bg-rose-500 transition-all"
                            style={{ width: `${item.revisionPct}%` }}
                            title={`ส่งกลับแก้ ${item.revisionPct}% (${item.revisions} ฉบับ)`}
                          ></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legend & Real Diagnostic Insight */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                    <span>ตรงเวลา (On-Time)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
                    <span>ส่งล่าช้า (Late)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                    <span>ส่งกลับแก้ไข (Needs Revision)</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[11px] text-indigo-900 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>ข้อสรุปเชิงข้อมูลจริง:</strong>{' '}
                    {plans.length > 0 ? (
                      `ประเภทเอกสารที่มีการส่งมากที่สุดคือ "${
                        docStatusStats.reduce((max, cur) => (cur.total > max.total ? cur : max), docStatusStats[0] || { name: '-', total: 0 }).name
                      }" รวม ${
                        docStatusStats.reduce((max, cur) => (cur.total > max.total ? cur : max), docStatusStats[0] || { name: '-', total: 0 }).total
                      } ฉบับ (อนุมัติแล้ว ${approvedPlans.length} ฉบับ, รอตรวจ ${plans.filter((p) => p.status === 'submitted').length} ฉบับ)`
                    ) : (
                      'ยังไม่มีข้อมูลการส่งเอกสารในระบบ'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Diagnostic Section: 8 Departments Strategic Quadrant Matrix */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>เมทริกซ์วินิจฉัย 8 กลุ่มสาระการเรียนรู้ (Strategic Performance Matrix)</span>
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">| วิเคราะห์สาเหตุและจุดคอขวด</span>
              </h3>
              <p className="text-xs text-slate-500">
                จำแนก 4 จตุภาคตามความตรงต่อเวลา (Timeliness) และคุณภาพของแผนการสอน (Pedagogical Quality)
              </p>
            </div>
          </div>

          {/* Quadrant Quick Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setSelectedQuadrant('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedQuadrant === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด (8)
            </button>
            <button
              onClick={() => setSelectedQuadrant('q1')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedQuadrant === 'q1' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              ⭐ ต้นแบบ
            </button>
            <button
              onClick={() => setSelectedQuadrant('q2')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedQuadrant === 'q2' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              🔷 คุณภาพสูง
            </button>
            <button
              onClick={() => setSelectedQuadrant('q4')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedQuadrant === 'q4' ? 'bg-white text-rose-700 font-bold shadow-xs' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              ⚠️ เฝ้าระวัง
            </button>
          </div>
        </div>

        {/* Quadrant Visual Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departmentMatrix
            .filter((d) => selectedQuadrant === 'all' || d.quadrant === selectedQuadrant)
            .map((dept) => (
              <div
                key={dept.name}
                className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all space-y-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{dept.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">({dept.totalTeachers} ท่าน)</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${dept.quadrantBadge}`}>
                      {dept.quadrantTitle}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-indigo-700 text-lg">
                      {dept.submissionRate}%
                    </span>
                    <div className="text-[10px] text-slate-400">ส่งแล้ว {dept.submittedTeachers}/{dept.totalTeachers} ท่าน</div>
                  </div>
                </div>

                {/* Progress & Quality Metrics Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>ความก้าวหน้าการส่งงาน</span>
                    <span className="font-mono font-bold text-slate-800">{dept.submissionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                    <div
                      className={`h-2 transition-all duration-500 ${
                        dept.submissionRate === 100
                          ? 'bg-emerald-500'
                          : dept.submissionRate >= 75
                          ? 'bg-indigo-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${dept.submissionRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Micro Stats Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">ส่งตรงเวลา</span>
                    <span className="font-bold text-emerald-700 font-mono">{dept.onTimeRate}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">คะแนนเฉลี่ย</span>
                    <span className="font-bold text-amber-700 font-mono">{dept.avgScore}/100</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">ค้างส่ง</span>
                    <span className={`font-bold font-mono ${dept.pendingTeachers > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {dept.pendingTeachers > 0 ? `${dept.pendingTeachers} ท่าน` : 'ครบ 100%'}
                    </span>
                  </div>
                </div>

                {/* Action trigger if pending teachers exist */}
                {dept.pendingTeachers > 0 && (
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="text-rose-600 font-medium">
                      ค้างส่ง: {dept.pendingTeachersList.map((t) => t.Name).join(', ')}
                    </span>
                    <button
                      onClick={() => setSelectedArea(dept.name)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>กรองดูรายคน</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* 4. Predictive Intelligence: Early Warning Risk Radar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>ระบบเตือนภัยล่วงหน้าและพยากรณ์ความเสี่ยง (Early Warning Risk Radar)</span>
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">| Predictive Intelligence</span>
              </h3>
              <p className="text-xs text-slate-500">
                วิเคราะห์พฤติกรรมการส่งงาน อัตราค้างส่ง และคะแนนย้อนหลัง เพื่อแจ้งเตือนก่อนถึงกำหนดเดดไลน์
              </p>
            </div>
          </div>

          {/* Risk Level Toggles */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
              <button
                onClick={() => setSelectedRiskFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedRiskFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({teachingStaff.length})
              </button>
              <button
                onClick={() => setSelectedRiskFilter('high')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedRiskFilter === 'high' ? 'bg-white text-rose-700 font-bold shadow-xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                🔴 เสี่ยงสูง ({highRiskCount})
              </button>
              <button
                onClick={() => setSelectedRiskFilter('medium')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedRiskFilter === 'medium' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                🟡 เฝ้าระวัง ({mediumRiskCount})
              </button>
              <button
                onClick={() => setSelectedRiskFilter('low')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedRiskFilter === 'low' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                🟢 เสถียรภาพสูง ({lowRiskCount})
              </button>
            </div>
          </div>
        </div>

        {/* Risk Teachers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">บุคลากรครู</th>
                <th className="py-3 px-4">กลุ่มสาระการเรียนรู้</th>
                <th className="py-3 px-4 text-center">ระดับความเสี่ยง (Risk Score)</th>
                <th className="py-3 px-4">ปัจจัยเสี่ยงที่ตรวจพบ</th>
                <th className="py-3 px-4 text-center">สถานะเอกสาร</th>
                <th className="py-3 px-4 text-center">การดำเนินการเชิงรุก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRiskTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <CheckCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="font-semibold text-slate-700">ไม่พบบุคลากรที่มีความเสี่ยงในตัวกรองนี้</p>
                    <p className="text-xs text-slate-400 mt-0.5">บุคลากรทุกคนมีสถานะเอกสารเป็นไปตามมาตรฐาน</p>
                  </td>
                </tr>
              ) : (
                filteredRiskTeachers.map(({ teacher, riskScore, riskTier, riskReasons, hasSubmitted, plans: tPlans }) => {
                  const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
                  const isSent = !!alertSentMap[teacher.Teacher_ID];

                  return (
                    <tr key={teacher.Teacher_ID} className="hover:bg-slate-50/70 transition-colors">
                      {/* Teacher Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                          <div>
                            <div className="font-bold text-slate-900">{teacher.Name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{teacher.Teacher_ID}</div>
                          </div>
                        </div>
                      </td>

                      {/* Area */}
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {teacher.Learning_Area}
                      </td>

                      {/* Risk Score */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] font-mono">
                          {riskTier === 'high' ? (
                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                              🔴 สูง ({riskScore}%)
                            </span>
                          ) : riskTier === 'medium' ? (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              🟡 ปานกลาง ({riskScore}%)
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              🟢 เสถียร ({riskScore}%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reasons */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {riskReasons.length > 0 ? (
                            riskReasons.map((r, i) => (
                              <div key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                <span>{r}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-medium">
                              ส่งงานครบถ้วน ตรงต่อเวลา คุณภาพดี
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {hasSubmitted ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            ส่งแล้ว ({tPlans.length} ฉบับ)
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            ยังไม่ส่ง
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        {!hasSubmitted ? (
                          <button
                            onClick={() => handleTriggerAlert(teacher.Teacher_ID, teacher.Name)}
                            disabled={isSent}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer ${
                              isSent
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-xs active:scale-95'
                            }`}
                          >
                            <Send className="w-3 h-3" />
                            <span>{isSent ? 'แจ้งแล้ว ✓' : 'ส่งเตือนด่วน'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">เป็นไปตามแผน</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Prescriptive Analytics: Strategic Decisions for Leadership (ข้อเสนอแนะเชิงยุทธศาสตร์) */}
      <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 rounded-3xl p-6 sm:p-7 border border-indigo-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-indigo-950 flex items-center gap-2">
                <span>ข้อเสนอแนะเชิงยุทธศาสตร์เพื่อการตัดสินใจของผู้บริหาร (Prescriptive Decision Engine)</span>
              </h3>
              <p className="text-xs text-slate-600">
                สังเคราะห์ข้อเสนอแนะอัตโนมัติจากข้อมูลเชิงประจักษ์ (Data-Informed Policy & Intervention)
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-indigo-900 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>สร้างจากข้อมูลจริง {totalPlans} ฉบับ</span>
          </div>
        </div>

        {/* 4 Decision Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptiveActions.map((action) => (
            <div
              key={action.id}
              className="p-5 rounded-2xl bg-white border border-indigo-100/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    action.urgency === 'high'
                      ? 'bg-rose-100 text-rose-800'
                      : action.urgency === 'medium'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {action.urgency === 'high' ? '🚨 เร่งด่วน' : action.urgency === 'medium' ? '⚡ สำคัญ' : '💡 ต่อยอด'} · {action.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">เป้าหมาย: {action.target}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {action.title}
                </h4>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="text-slate-500 font-medium">หลักฐานเชิงประจักษ์:</div>
                  <div className="text-slate-700 font-semibold">{action.evidence}</div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {action.recommendation}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">ระดับฝ่ายบริหาร: ผู้อำนวยการสถานศึกษา</span>
                <button
                  onClick={() => {
                    const event = new CustomEvent('show-toast', {
                      detail: {
                        type: 'info',
                        title: 'บันทึกการตัดสินใจเชิงยุทธศาสตร์',
                        message: `ได้บันทึกมาตรการ: "${action.title}" สู่แผนปฏิบัติการวิชาการแล้ว`,
                      },
                    });
                    window.dispatchEvent(event);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{action.actionLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 6. Interactive Executive SLA Simulator */}
        <div className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                เครื่องมือจำลองเป้าหมายเชิงยุทธศาสตร์ (Strategic SLA Simulation Sandbox)
              </h4>
            </div>
            <div className="text-xs text-slate-500">
              ทดลองปรับค่าเป้าหมายเพื่อคำนวณการจัดสรรทรัพยากร
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Slider */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">เป้าหมายอัตราการส่งงานตรงเวลา (SLA Target):</span>
                <span className="font-mono font-black text-indigo-600 text-base">{targetSlaGoal}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="100"
                step="5"
                value={targetSlaGoal}
                onChange={(e) => setTargetSlaGoal(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>70% (พื้นฐาน)</span>
                <span>85% (มาตรฐาน)</span>
                <span>95% (เป้าหมาย PCSHS)</span>
                <span>100% (สมบูรณ์แบบ)</span>
              </div>
            </div>

            {/* Simulated Result Box */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider">
                การเร่งรัดที่ต้องดำเนินการ
              </span>
              <div className="text-xl font-black text-indigo-900 font-mono">
                {Math.max(0, Math.ceil((targetSlaGoal / 100) * totalTeachers - submittedTeachers.length))} ท่าน
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                {targetSlaGoal > onTimeRate
                  ? `ต้องติดตามเพิ่มอีก ${Math.max(0, Math.ceil((targetSlaGoal / 100) * totalTeachers - submittedTeachers.length))} ท่าน เพื่อบรรลุเป้า ${targetSlaGoal}%`
                  : 'ปัจจุบันผลการดำเนินงานอยู่ในเกณฑ์เป้าหมายที่กำหนดแล้ว'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DDO PRINTABLE EXECUTIVE REPORT MODAL */}
      {isDdoPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Controls */}
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold">รายงานสรุปองค์กรขับเคลื่อนด้วยข้อมูล (DDO Executive Brief)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร A4</span>
                </button>
                <button
                  onClick={() => setIsDdoPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document */}
            <div className="p-8 sm:p-12 space-y-6 text-slate-900 bg-white">
              <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
                <img
                  src="/logo.svg"
                  alt="โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
                  className="h-20 mx-auto object-contain"
                />
                <h1 className="text-xl font-bold tracking-tight">
                  รายงานสรุปผลการประเมินองค์กรขับเคลื่อนด้วยข้อมูล (Data-Driven Organization Brief)
                </h1>
                <p className="text-sm font-semibold text-slate-700">
                  โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
                </p>
                <p className="text-xs text-slate-500">
                  เอกสารประกอบการตัดสินใจเชิงยุทธศาสตร์ของผู้อำนวยการสถานศึกษา (Admin 03) • ภาคเรียนที่ 1/2569
                </p>
                <p className="text-xs text-slate-400">
                  วันที่จัดพิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* DDO Score Overview in Printout */}
              <div className="grid grid-cols-4 gap-4 text-center border-b border-slate-200 pb-6 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">ดัชนีสุขภาพ DDO</div>
                  <div className="text-2xl font-black text-indigo-700 mt-1">{ddoHealthScore} / 100</div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-0.5">ระดับยุทธศาสตร์</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">อัตราส่งงานสำเร็จ</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{submissionRate}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{submittedTeachers.length}/{totalTeachers} ท่าน</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">ความตรงต่อเวลา (SLA)</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{onTimeRate}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">ตรงเวลา {onTimePlans.length} ฉบับ</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">คะแนนคุณภาพเฉลี่ย</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">{avgScore} / 100</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">เกณฑ์มาตรฐาน 5 มิติ</div>
                </div>
              </div>

              {/* Departmental Matrix in Printout */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">
                  1. ผลการวินิจฉัยเชิงกระบวนการ 8 กลุ่มสาระการเรียนรู้
                </h3>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-300">กลุ่มสาระการเรียนรู้</th>
                      <th className="p-2 text-center border-r border-slate-300">จำนวนครู</th>
                      <th className="p-2 text-center border-r border-slate-300">ความสำเร็จ (%)</th>
                      <th className="p-2 text-center border-r border-slate-300">ความตรงต่อเวลา</th>
                      <th className="p-2 text-center border-r border-slate-300">คะแนนเฉลี่ย</th>
                      <th className="p-2 text-center">จตุภาคเชิงยุทธศาสตร์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {departmentMatrix.map((d) => (
                      <tr key={d.name}>
                        <td className="p-2 border-r border-slate-200 font-medium">{d.name}</td>
                        <td className="p-2 text-center border-r border-slate-200">{d.totalTeachers}</td>
                        <td className="p-2 text-center border-r border-slate-200 font-bold">{d.submissionRate}%</td>
                        <td className="p-2 text-center border-r border-slate-200 text-emerald-700">{d.onTimeRate}%</td>
                        <td className="p-2 text-center border-r border-slate-200 font-bold">{d.avgScore}</td>
                        <td className="p-2 text-center font-semibold text-[11px]">{d.quadrantTitle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Prescriptive Directives in Printout */}
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold text-slate-800">
                  2. ข้อเสนอแนะเชิงยุทธศาสตร์เพื่อการตัดสินใจ
                </h3>
                <div className="space-y-2">
                  {prescriptiveActions.map((act, i) => (
                    <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-slate-900">
                        {i + 1}. {act.title}
                      </div>
                      <p className="text-slate-600">{act.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5-Dimension Rubrics & Document Status Summary in Printout */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2 border border-slate-300 p-3 rounded-lg">
                  <h4 className="text-xs font-bold text-slate-800">
                    สมรรถนะการเขียนแผน 5 มิติ (Rubrics Evaluation)
                  </h4>
                  {plansWithRubrics.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center">
                      ยังไม่มีข้อมูลคะแนนประเมินจริงในระบบ
                    </p>
                  ) : (
                    <table className="w-full text-[11px] text-left">
                      <tbody>
                        {rubricStats.map((r) => (
                          <tr key={r.key} className="border-b border-slate-100">
                            <td className="py-1">{r.label}</td>
                            <td className="py-1 text-right font-bold text-indigo-700">{r.score > 0 ? `${r.score} / 5.0` : '-'}</td>
                            <td className="py-1 text-right text-slate-400 font-mono">(เป้า 4.0)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="space-y-2 border border-slate-300 p-3 rounded-lg">
                  <h4 className="text-xs font-bold text-slate-800">
                    สถานะการส่งมอบจำแนกตามประเภทเอกสาร
                  </h4>
                  {docStatusStats.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center">
                      ยังไม่มีข้อมูลประเภทเอกสารในระบบ
                    </p>
                  ) : (
                    <table className="w-full text-[11px] text-left">
                      <tbody>
                        {docStatusStats.map((d) => (
                          <tr key={d.name} className="border-b border-slate-100">
                            <td className="py-1 truncate max-w-[140px]">{d.name}</td>
                            <td className="py-1 text-center font-bold text-slate-800">{d.total} ฉบับ</td>
                            <td className="py-1 text-right font-mono text-emerald-600">
                              ตรงเวลา {d.onTime} ({d.onTimePct}%)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Signature Line */}
              <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
                <div className="space-y-14">
                  <p>ลงชื่อ............................................................</p>
                  <div>
                    <p className="font-bold">({currentTeacher.Name})</p>
                    <p className="text-slate-500 mt-1">ผู้อำนวยการสถานศึกษา / ผู้กำกับนโยบาย DDO</p>
                  </div>
                </div>

                <div className="space-y-14">
                  <p>ลงชื่อ............................................................</p>
                  <div>
                    <p className="font-bold">(ประธานคณะกรรมการสถานศึกษาขั้นพื้นฐาน)</p>
                    <p className="text-slate-500 mt-1">โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
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
