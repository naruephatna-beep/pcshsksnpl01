import React from 'react';
import { LessonPlan, Teacher, isTeacherAdmin, PlanTypeDeadlineConfig, isPlanOwnedByTeacher } from '../types';
import { classifyDocumentType, isPlanMatchingAssignment } from '../utils/deadlineUtils';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  Lock,
  Layers,
} from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';

interface DashboardStatsProps {
  plans: LessonPlan[];
  teachers: Teacher[];
  currentTeacher: Teacher;
  selectedArea?: string;
  onSelectArea: (area: string) => void;
  selectedDocType?: string;
  onSelectDocType?: (docType: string) => void;
  deadlineConfigs?: PlanTypeDeadlineConfig[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  plans,
  teachers,
  currentTeacher,
  selectedArea,
  onSelectArea,
  selectedDocType,
  onSelectDocType,
  deadlineConfigs,
}) => {
  const isAdmin = isTeacherAdmin(currentTeacher);

  // Relevant plans based on role (admins see filtered or all, teachers see only their own)
  const relevantPlans = isAdmin
    ? plans
    : plans.filter((p) => isPlanOwnedByTeacher(p, currentTeacher));

  const totalPlans = relevantPlans.length;
  const approvedPlans = relevantPlans.filter((p) => p.status === 'approved').length;
  const pendingPlans = relevantPlans.filter((p) => p.status === 'submitted').length;
  const revisionPlans = relevantPlans.filter((p) => p.status === 'needs_revision').length;
  const latePlans = relevantPlans.filter((p) => p.is_late).length;

  const approvalRate = totalPlans > 0 ? Math.round((approvedPlans / totalPlans) * 100) : 0;

  // Extract unique learning areas
  const learningAreas = Array.from(
    new Set(
      teachers
        .filter((t) => !isTeacherAdmin(t))
        .map((t) => t.Learning_Area)
        .filter(
          (a) =>
            a &&
            a !== '-' &&
            !a.includes('กลุ่มบริหาร') &&
            !a.includes('ฝ่ายบริหาร')
        )
    )
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top 4 KPI Cards: Clean 60-30-10 Hierarchy & Tabular Figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Plans */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 card-interactive group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isAdmin ? 'แผนการสอนทั้งหมด' : 'แผนการสอนของฉัน'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1329] group-hover:text-amber-400 transition-colors">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              <AnimatedCounter value={totalPlans} />
            </span>
            <span className="text-xs text-slate-400 font-medium">ฉบับ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 truncate">
            {isAdmin
              ? `จากครูผู้สอน ${teachers.length} ท่าน`
              : currentTeacher.Name}
          </p>
        </div>

        {/* Card 2: Approved Plans with inline progress bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300/80 card-interactive group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              อนุมัติแล้ว
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums tracking-tight">
                <AnimatedCounter value={approvedPlans} />
              </span>
              <span className="text-xs text-slate-400 font-medium">ฉบับ</span>
            </div>
            <span className="text-xs text-emerald-700 font-bold tabular-nums">
              <AnimatedCounter value={approvalRate} suffix="%" />
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, approvalRate)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300/80 card-interactive group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              รอตรวจสอบ
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 tabular-nums tracking-tight">
              <AnimatedCounter value={pendingPlans} />
            </span>
            <span className="text-xs text-slate-400 font-medium">ฉบับ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 truncate">
            {isAdmin ? 'รอผู้ตรวจประเมินตามลำดับขั้น' : 'อยู่ระหว่างรอการตรวจ'}
          </p>
        </div>

        {/* Card 4: Needs Revision */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-rose-300/80 card-interactive group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              ส่งกลับแก้ไข
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 tabular-nums tracking-tight">
              <AnimatedCounter value={revisionPlans} />
            </span>
            <span className="text-xs text-slate-400 font-medium">ฉบับ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 truncate">
            {isAdmin ? 'รอครูผู้สอนปรับปรุงส่งใหม่' : 'มีข้อเสนอแนะให้ปรับปรุง'}
          </p>
        </div>
      </div>

      {/* Late submissions concise warning bar */}
      {latePlans > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3 sm:px-4 flex items-center justify-between gap-2.5 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              {isAdmin ? 'พบแผนการสอนที่ส่งช้ากว่ากำหนด:' : 'แผนของท่านที่ส่งช้ากว่ากำหนด:'}
            </span>
            <span className="tabular-nums font-bold text-amber-800">
              {latePlans} ฉบับ
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-800">
            ส่งช้ากว่ากำหนด
          </span>
        </div>
      )}

      {/* Document Types Breakdown Strip (แยกประเภทเอกสารชัดเจน) */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>จำแนกตามประเภทเอกสารวิชาการ:</span>
          </div>
          {selectedDocType && selectedDocType !== 'all' && onSelectDocType && (
            <button
              onClick={() => onSelectDocType('all')}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
            >
              ล้างการกรองประเภท
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {(() => {
            interface CatDef {
              key: string;
              label: string;
              short: string;
              config?: PlanTypeDeadlineConfig;
              planType?: string;
            }

            const categoriesList: CatDef[] = [
              { key: 'summary_plan', label: 'แผนการจัดการเรียนรู้ฉบับย่อ', short: '📄 แผนฯ ฉบับย่อ' },
              { key: 'full_plan', label: 'แผนการจัดการเรียนรู้ฉบับสมบูรณ์', short: '📘 แผนฯ ฉบับสมบูรณ์' },
              { key: 'classroom_research', label: 'ประเด็นการวิจัยในชั้นเรียน', short: '🔬 วิจัยในชั้นเรียน' },
            ];

            // Add newly configured assignments from deadlineConfigs
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

                categoriesList.push({
                  key: cfg.id,
                  label: cfg.name,
                  short: `📑 ${cfg.name.length > 18 ? cfg.name.slice(0, 16) + '...' : cfg.name}`,
                  config: cfg,
                });
              });
            }

            // Also detect distinct plan_type from existing plans not covered above
            const registeredTypes = new Set<string>();
            relevantPlans.forEach((p) => {
              const pType = (p.plan_type || '').trim();
              if (!pType) return;
              const meta = classifyDocumentType(pType);
              if (meta.key === 'summary_plan' || meta.key === 'full_plan' || meta.key === 'classroom_research') {
                return;
              }
              const matchedByConfig = categoriesList.some((c) => c.config && isPlanMatchingAssignment(p, c.config));
              if (!matchedByConfig) {
                registeredTypes.add(pType);
              }
            });

            registeredTypes.forEach((pType) => {
              categoriesList.push({
                key: `custom_${pType}`,
                label: pType,
                short: `📋 ${pType.length > 18 ? pType.slice(0, 16) + '...' : pType}`,
                planType: pType,
              });
            });

            // Calculate count function
            const getCatCount = (cat: CatDef) => {
              return relevantPlans.filter((p) => {
                if (cat.config) {
                  return isPlanMatchingAssignment(p, cat.config);
                }
                if (cat.planType) {
                  return (p.plan_type || '').trim() === cat.planType;
                }
                if (cat.key === 'general_academic') {
                  const meta = classifyDocumentType(p.plan_type);
                  if (meta.key === 'summary_plan' || meta.key === 'full_plan' || meta.key === 'classroom_research') {
                    return false;
                  }
                  const matchedOther = categoriesList.some((c) => {
                    if (c.key === 'general_academic') return false;
                    if (c.config) return isPlanMatchingAssignment(p, c.config);
                    if (c.planType) return (p.plan_type || '').trim() === c.planType;
                    return false;
                  });
                  return !matchedOther;
                }
                const meta = classifyDocumentType(p.plan_type);
                return meta.key === cat.key;
              }).length;
            };

            // Check if there are any remaining plans that didn't match any category
            const hasUncategorized = relevantPlans.some((p) => {
              return !categoriesList.some((c) => {
                if (c.config) return isPlanMatchingAssignment(p, c.config);
                if (c.planType) return (p.plan_type || '').trim() === c.planType;
                return classifyDocumentType(p.plan_type).key === c.key;
              });
            });

            if (hasUncategorized) {
              categoriesList.push({
                key: 'general_academic',
                label: 'เอกสารวิชาการอื่นๆ',
                short: '📑 เอกสารอื่นๆ',
              });
            }

            return categoriesList.map((cat) => {
              const count = getCatCount(cat);
              const isSelected = selectedDocType === cat.key;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onSelectDocType && onSelectDocType(isSelected ? 'all' : cat.key)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200/90 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 text-slate-800'
                  }`}
                  title={cat.label}
                >
                  <span className={`text-[11px] font-semibold truncate ${isSelected ? 'text-slate-200' : 'text-slate-700'}`} title={cat.label}>
                    {cat.short}
                  </span>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className={`text-lg font-extrabold tabular-nums ${isSelected ? 'text-amber-300' : 'text-slate-900'}`}>
                      {count}
                    </span>
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>ฉบับ</span>
                  </div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Breakdown per Learning Area (Admin Only) or Privacy Note for Teachers */}
      {isAdmin ? (
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                สถิติการส่งแผนแยกตามกลุ่มสาระการเรียนรู้
              </h3>
            </div>
            {selectedArea && (
              <button
                onClick={() => onSelectArea('')}
                className="text-xs text-amber-700 hover:text-amber-900 font-bold underline self-start sm:self-auto"
              >
                แสดงทุกกลุ่มสาระ
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {learningAreas.map((area) => {
              const countTeachers = teachers.filter((t) => t.Learning_Area === area).length;
              const areaPlans = plans.filter((p) => p.learning_area === area);
              const isSelected = selectedArea === area;

              return (
                <button
                  key={area}
                  onClick={() => onSelectArea(isSelected ? '' : area)}
                  className={`p-2.5 sm:p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`} title={area}>
                    {area}
                  </div>
                  <div className={`mt-1.5 flex items-center justify-between text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    <span>ครู {countTeachers} คน</span>
                    <span className={`font-bold tabular-nums ${isSelected ? 'text-amber-300' : 'text-slate-700'}`}>
                      {areaPlans.length} ฉบับ
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900">
                โหมดความปลอดภัยส่วนบุคคล:
              </span>{' '}
              <span>แสดงเฉพาะแผนการสอนของท่าน (รหัส {currentTeacher.Teacher_ID})</span>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-auto">
            <span className="inline-block bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-semibold text-slate-700 text-[11px]">
              {currentTeacher.Learning_Area}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
