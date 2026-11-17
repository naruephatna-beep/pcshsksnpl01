import React, { useMemo, useState } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig } from '../types';
import { TaskTimeStatus } from '../utils/deadlineUtils';
import {
  Check,
  Clock,
  X,
  Maximize2,
  Minimize2,
  Columns3,
  LayoutGrid,
} from 'lucide-react';

export interface OverviewTaskResult {
  config: PlanTypeDeadlineConfig;
  isSubmitted: boolean;
  submittedPlan?: LessonPlan;
  matchingPlans: LessonPlan[];
  timeStatus: TaskTimeStatus;
}

export interface OverviewMissingTask {
  config: PlanTypeDeadlineConfig;
  timeStatus: TaskTimeStatus;
}

export interface OverviewMatrixRow {
  teacher: Teacher;
  taskResults: OverviewTaskResult[];
  missingTasks: OverviewMissingTask[];
  submittedTasksCount: number;
  totalTasksCount: number;
  isAllCompleted: boolean;
  hasUnsubmitted: boolean;
  hasLateSubmission: boolean;
}

interface TrackerSingleScreenOverviewProps {
  rows: OverviewMatrixRow[];
  activeAssignments: PlanTypeDeadlineConfig[];
  onClickSubmitted: (
    teacher: Teacher,
    config: PlanTypeDeadlineConfig,
    plan: LessonPlan,
    allMatching: LessonPlan[]
  ) => void;
  onClickMissing: (
    teacher: Teacher,
    missingTasks: OverviewMissingTask[],
    config: PlanTypeDeadlineConfig
  ) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const SHORT_AREA_LABELS: Record<string, string> = {
  'วิทยาศาสตร์และเทคโนโลยี': 'วิทย์ฯ',
  'คณิตศาสตร์': 'คณิต',
  'ภาษาต่างประเทศ': 'ตปท.',
  'ภาษาไทย': 'ไทย',
  'สังคมศึกษา ศาสนา และวัฒนธรรม': 'สังคม',
  'ศิลปะ': 'ศิลปะ',
  'สุขศึกษาและพลศึกษา': 'สุขศึกษา',
  'การงานอาชีพ': 'การงานฯ',
  'กลุ่มบริหารวิชาการ': 'วิชาการ',
};

function getShortTaskLabel(name: string, index: number): string {
  const n = (name || '').trim();
  if (!n) return `งาน ${index + 1}`;
  if (n.includes('วิจัย')) return 'วิจัย';
  if (n.includes('ฉบับย่อ') || n.includes('แผนย่อ')) return 'แผนย่อ';
  if (n.includes('ฉบับสมบูรณ์') || n.includes('แผนสมบูรณ์')) return 'แผนเต็ม';
  if (n.includes('ปพ.5') || n.includes('ปพ5')) return 'ปพ.5';
  if (n.includes('กำหนดการสอน')) return 'กำหนดการ';
  if (n.includes('บันทึกหลังสอน')) return 'หลังสอน';
  if (n.includes('โครงสร้างรายวิชา')) return 'โครงสร้าง';
  const cleaned = n
    .replace(/^แผนการจัดการเรียนรู้/g, '')
    .replace(/^แบบรายงาน/g, '')
    .replace(/^ประเด็นการ/g, '')
    .trim();
  const base = cleaned || n;
  return base.length > 8 ? base.slice(0, 7) + '…' : base;
}

export const TrackerSingleScreenOverview: React.FC<TrackerSingleScreenOverviewProps> = ({
  rows,
  activeAssignments,
  onClickSubmitted,
  onClickMissing,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [groupMode, setGroupMode] = useState<'by_area' | 'flat_columns'>('by_area');
  const [ultraCompact, setUltraCompact] = useState<boolean>(rows.length > 36);

  const shortTasks = useMemo(
    () =>
      activeAssignments.map((cfg, idx) => ({
        cfg,
        short: getShortTaskLabel(cfg.name, idx),
        index: idx + 1,
      })),
    [activeAssignments]
  );

  // Dynamic CSS grid columns template so task dots align like a razor-sharp Swiss matrix
  const gridTemplateColumns = useMemo(() => {
    const colWidth = ultraCompact ? '26px' : '32px';
    const count = Math.max(1, activeAssignments.length);
    return `minmax(0, 1fr) repeat(${count}, ${colWidth}) 34px`;
  }, [activeAssignments.length, ultraCompact]);

  // Group rows by Learning Area and pack into 4 balanced columns (shortest-column-first)
  const packedAreaColumns = useMemo(() => {
    const map = new Map<string, OverviewMatrixRow[]>();
    rows.forEach((row) => {
      const area = (row.teacher.Learning_Area || 'ไม่ระบุกลุ่มสาระ').trim() || 'ไม่ระบุกลุ่มสาระ';
      const list = map.get(area) || [];
      list.push(row);
      map.set(area, list);
    });

    const groups = Array.from(map.entries())
      .map(([area, list]) => {
        const sorted = [...list].sort((a, b) =>
          a.teacher.Name.localeCompare(b.teacher.Name, 'th')
        );
        const completedCount = sorted.filter((r) => r.isAllCompleted).length;
        // Estimate visual vertical weight: card header + column subheader (~2.4 rows) + N rows + gap
        const weight = 2.6 + sorted.length;
        return { area, rows: sorted, completedCount, weight };
      })
      .sort((a, b) => b.rows.length - a.rows.length || a.area.localeCompare(b.area, 'th'));

    const colCount = groups.length >= 4 ? 4 : Math.max(1, groups.length);
    const cols: typeof groups[] = Array.from({ length: colCount }, () => []);
    const heights = new Array(colCount).fill(0);

    groups.forEach((group) => {
      let minIdx = 0;
      for (let i = 1; i < colCount; i++) {
        if (heights[i] < heights[minIdx]) minIdx = i;
      }
      cols[minIdx].push(group);
      heights[minIdx] += group.weight;
    });

    return cols.filter((c) => c.length > 0);
  }, [rows]);

  // Balanced 3-4 columns for flat mode
  const flatColumns = useMemo(() => {
    const colCount = rows.length >= 20 ? 4 : rows.length >= 10 ? 3 : 2;
    const cols: OverviewMatrixRow[][] = Array.from({ length: colCount }, () => []);
    const perCol = Math.ceil(rows.length / colCount) || 1;
    rows.forEach((row, idx) => {
      const colIdx = Math.min(colCount - 1, Math.floor(idx / perCol));
      cols[colIdx].push(row);
    });
    return cols.filter((c) => c.length > 0);
  }, [rows]);

  const renderColumnSubheader = (showAreaColLabel: boolean) => (
    <div
      style={{ gridTemplateColumns }}
      className="grid items-center gap-1 px-2.5 py-1 bg-slate-50/60 border-b border-slate-100 text-[10px] font-semibold text-slate-400 select-none"
    >
      <span className="truncate">
        {showAreaColLabel ? 'รายชื่อครู / สาระ' : 'รายชื่อครู'}
      </span>
      {shortTasks.map((t) => (
        <span
          key={`hdr-${t.cfg.id}`}
          title={t.cfg.name}
          className="text-center truncate tracking-tight text-slate-500 font-semibold"
        >
          {t.short}
        </span>
      ))}
      <span className="text-right">รวม</span>
    </div>
  );

  const renderTeacherRow = (
    row: OverviewMatrixRow,
    displayIndex: number,
    showAreaTag: boolean
  ) => {
    const {
      teacher,
      taskResults,
      missingTasks,
      submittedTasksCount,
      totalTasksCount,
      isAllCompleted,
      hasLateSubmission,
    } = row;

    const shortArea =
      SHORT_AREA_LABELS[teacher.Learning_Area] ||
      (teacher.Learning_Area || '').slice(0, 6);

    return (
      <div
        key={`overview-${teacher.Teacher_ID}`}
        style={{ gridTemplateColumns }}
        className={`grid items-center gap-1 px-2.5 border-b border-slate-100/80 last:border-b-0 transition-colors hover:bg-indigo-50/40 ${
          ultraCompact ? 'py-[3px] text-[11px]' : 'py-[5px] text-xs'
        }`}
      >
        {/* Name cell */}
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <span className="text-[10px] font-mono text-slate-400 w-3.5 text-right shrink-0 tabular-nums">
            {displayIndex}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isAllCompleted
                ? hasLateSubmission
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
                : 'bg-rose-500'
            }`}
          />
          <span
            className="font-medium text-slate-800 truncate"
            title={`${teacher.Name} (${teacher.Teacher_ID}) • ${teacher.Learning_Area}`}
          >
            {teacher.Name}
          </span>
          {showAreaTag && shortArea && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0 hidden sm:inline font-medium">
              {shortArea}
            </span>
          )}
        </div>

        {/* Aligned Task Status Cells */}
        {taskResults.map((result, tIdx) => {
          const { config, isSubmitted, submittedPlan, matchingPlans, timeStatus } = result;
          const btnSize = ultraCompact ? 'w-5 h-[18px]' : 'w-6 h-[20px]';

          if (isSubmitted && submittedPlan) {
            const isLate = !!submittedPlan.is_late;
            return (
              <div key={config.id} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => onClickSubmitted(teacher, config, submittedPlan, matchingPlans)}
                  title={`${tIdx + 1}. ${config.name} — ${
                    isLate ? 'ส่งแล้ว (ส่งช้า)' : 'ส่งแล้วตรงเวลา'
                  } (คลิกเพื่อดูเอกสาร)`}
                  className={`${btnSize} rounded-md inline-flex items-center justify-center transition-all cursor-pointer ${
                    isLate
                      ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-300/90 hover:bg-amber-400 hover:text-slate-950'
                      : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/90 hover:bg-emerald-500 hover:text-white'
                  }`}
                >
                  {isLate ? (
                    <Clock className="w-3 h-3 stroke-[2.2]" />
                  ) : (
                    <Check className="w-3 h-3 stroke-[2.7]" />
                  )}
                </button>
              </div>
            );
          }

          return (
            <div key={config.id} className="flex justify-center">
              <button
                type="button"
                onClick={() => onClickMissing(teacher, missingTasks, config)}
                title={`${tIdx + 1}. ${config.name} — ยังไม่ส่ง (${timeStatus.statusText}) (คลิกส่งอีเมลเตือน)`}
                className={`${btnSize} rounded-md inline-flex items-center justify-center bg-rose-50 text-rose-500 ring-1 ring-rose-200/90 hover:bg-rose-600 hover:text-white hover:ring-rose-600 transition-all cursor-pointer`}
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          );
        })}

        {/* Progress fraction */}
        <div className="flex justify-end">
          <span
            className={`font-mono font-bold text-[10px] tabular-nums px-1.5 py-0.5 rounded-md ${
              isAllCompleted
                ? 'bg-emerald-50 text-emerald-700'
                : submittedTasksCount === 0
                ? 'bg-rose-50 text-rose-700'
                : 'text-slate-600'
            }`}
          >
            {submittedTasksCount}/{totalTasksCount}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Sleek Top Sub-bar: Full task names legend + layout switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
        {/* Full task chips + soft legend */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div className="inline-flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 inline-flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[2.7]" />
              </span>
              <span>ส่งแล้ว</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-amber-50 text-amber-600 ring-1 ring-amber-300 inline-flex items-center justify-center">
                <Clock className="w-2.5 h-2.5 stroke-[2.2]" />
              </span>
              <span>ส่งช้า</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-rose-50 text-rose-500 ring-1 ring-rose-200 inline-flex items-center justify-center">
                <X className="w-2.5 h-2.5 stroke-[2.5]" />
              </span>
              <span>ยังไม่ส่ง</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-500">
            {shortTasks.map((t) => (
              <span
                key={`legend-${t.cfg.id}`}
                title={t.cfg.name}
                className="px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600"
              >
                <strong className="text-slate-800">{t.short}</strong> = {t.cfg.name}
              </span>
            ))}
          </div>
        </div>

        {/* Layout & Fullscreen Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setGroupMode('by_area')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                groupMode === 'by_area'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>แยกกลุ่มสาระ</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupMode('flat_columns')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                groupMode === 'flat_columns'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Columns3 className="w-3 h-3" />
              <span>แบ่งคอลัมน์เท่ากัน</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setUltraCompact((prev) => !prev)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
              ultraCompact
                ? 'bg-slate-900 text-amber-400 border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="สลับความหนาแน่นของบรรทัด"
          >
            {ultraCompact ? 'กระชับ' : 'สบายตา'}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isFullscreen
                ? 'bg-amber-400 text-slate-950 border-amber-500'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>ย่อกลับ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>เต็มจอ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Executive Bento Board */}
      {groupMode === 'by_area' ? (
        <div
          className={`grid gap-2.5 items-start ${
            packedAreaColumns.length >= 4
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
              : packedAreaColumns.length === 3
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              : packedAreaColumns.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {packedAreaColumns.map((colGroups, colIdx) => (
            <div key={`packed-col-${colIdx}`} className="space-y-2.5 min-w-0">
              {colGroups.map(({ area, rows: groupRows, completedCount }) => {
                const areaRate =
                  groupRows.length > 0
                    ? Math.round((completedCount / groupRows.length) * 100)
                    : 0;
                const isAreaComplete = completedCount === groupRows.length && groupRows.length > 0;

                return (
                  <div
                    key={area}
                    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                  >
                    {/* Refined Light Executive Card Header */}
                    <div className="bg-slate-50/90 px-3 py-2 border-b border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-4 rounded-full shrink-0 ${
                            isAreaComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                        />
                        <h4
                          className="font-bold text-slate-900 text-xs truncate"
                          title={area}
                        >
                          {area}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          {areaRate}%
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                            isAreaComplete
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200/80 text-slate-700'
                          }`}
                        >
                          ครบ {completedCount}/{groupRows.length}
                        </span>
                      </div>
                    </div>

                    {/* Subtle progress hairline */}
                    <div className="h-[2px] w-full bg-slate-100">
                      <div
                        className={`h-full transition-all ${
                          isAreaComplete ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${areaRate}%` }}
                      />
                    </div>

                    {renderColumnSubheader(false)}

                    <div>
                      {groupRows.map((row, idx) => renderTeacherRow(row, idx + 1, false))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-2.5 items-start ${
            flatColumns.length >= 4
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
              : flatColumns.length === 3
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {flatColumns.map((colRows, colIdx) => {
            const offset = flatColumns
              .slice(0, colIdx)
              .reduce((sum, c) => sum + c.length, 0);
            const completedInCol = colRows.filter((r) => r.isAllCompleted).length;

            return (
              <div
                key={`flat-col-${colIdx}`}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
              >
                <div className="bg-slate-50/90 px-3 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    ลำดับที่ {offset + 1}–{offset + colRows.length}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-mono font-bold text-[10px]">
                    ครบ {completedInCol}/{colRows.length}
                  </span>
                </div>

                {renderColumnSubheader(true)}

                <div>
                  {colRows.map((row, idx) =>
                    renderTeacherRow(row, offset + idx + 1, true)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
