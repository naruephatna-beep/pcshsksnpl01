import React, { useMemo, useState } from 'react';
import { Teacher, LessonPlan, PlanTypeDeadlineConfig } from '../types';
import { TaskTimeStatus } from '../utils/deadlineUtils';
import {
  Check,
  AlertTriangle,
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
  'สุขศึกษาและพลศึกษา': 'สุขศึกษาฯ',
  'กลุ่มบริหารวิชาการ': 'วิชาการ',
};

export const TrackerSingleScreenOverview: React.FC<TrackerSingleScreenOverviewProps> = ({
  rows,
  activeAssignments,
  onClickSubmitted,
  onClickMissing,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [groupMode, setGroupMode] = useState<'by_area' | 'flat_columns'>('by_area');
  const [ultraCompact, setUltraCompact] = useState<boolean>(rows.length > 28);

  // Group rows by Learning Area for balanced masonry columns
  const areaGroups = useMemo(() => {
    const map = new Map<string, OverviewMatrixRow[]>();
    rows.forEach((row) => {
      const area = (row.teacher.Learning_Area || 'ไม่ระบุกลุ่มสาระ').trim() || 'ไม่ระบุกลุ่มสาระ';
      const list = map.get(area) || [];
      list.push(row);
      map.set(area, list);
    });

    return Array.from(map.entries())
      .map(([area, list]) => {
        const sorted = [...list].sort((a, b) =>
          a.teacher.Name.localeCompare(b.teacher.Name, 'th')
        );
        const completedCount = sorted.filter((r) => r.isAllCompleted).length;
        return { area, rows: sorted, completedCount };
      })
      .sort((a, b) => b.rows.length - a.rows.length || a.area.localeCompare(b.area, 'th'));
  }, [rows]);

  // Balanced 3-column or 4-column split for flat mode
  const flatColumns = useMemo(() => {
    const colCount = rows.length >= 24 ? 4 : rows.length >= 12 ? 3 : 2;
    const cols: OverviewMatrixRow[][] = Array.from({ length: colCount }, () => []);
    const perCol = Math.ceil(rows.length / colCount) || 1;
    rows.forEach((row, idx) => {
      const colIdx = Math.min(colCount - 1, Math.floor(idx / perCol));
      cols[colIdx].push(row);
    });
    return cols.filter((c) => c.length > 0);
  }, [rows]);

  const renderTeacherRow = (row: OverviewMatrixRow, displayIndex: number, showAreaTag: boolean) => {
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
        className={`flex items-center justify-between gap-1.5 border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50 ${
          ultraCompact ? 'py-0.5 px-1.5 text-[11px]' : 'py-1 px-2 text-xs'
        }`}
      >
        {/* Left: Number + Name */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] font-mono text-slate-400 w-4 text-right shrink-0">
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
            className="font-semibold text-slate-800 truncate"
            title={`${teacher.Name} (${teacher.Teacher_ID}) • ${teacher.Learning_Area}`}
          >
            {teacher.Name}
          </span>
          {showAreaTag && shortArea && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0 hidden sm:inline">
              {shortArea}
            </span>
          )}
        </div>

        {/* Right: Task status pills + Fraction */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-0.5">
            {taskResults.map((result, tIdx) => {
              const { config, isSubmitted, submittedPlan, matchingPlans, timeStatus } = result;
              const taskNum = tIdx + 1;

              if (isSubmitted && submittedPlan) {
                const isLate = !!submittedPlan.is_late;
                return (
                  <button
                    key={config.id}
                    type="button"
                    onClick={() => onClickSubmitted(teacher, config, submittedPlan, matchingPlans)}
                    title={`${taskNum}. ${config.name}: ${
                      isLate ? 'ส่งแล้ว (ส่งช้า)' : 'ส่งแล้วตรงเวลา'
                    } — คลิกเพื่อดูเอกสาร`}
                    className={`${
                      ultraCompact ? 'h-4 min-w-[20px] px-1 text-[9px]' : 'h-5 min-w-[24px] px-1 text-[10px]'
                    } rounded font-mono font-bold inline-flex items-center justify-center gap-0.5 transition-transform hover:scale-105 cursor-pointer ${
                      isLate
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-500'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    <span>{taskNum}</span>
                    {isLate ? (
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <Check className="w-2.5 h-2.5 stroke-[3] shrink-0" />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={config.id}
                  type="button"
                  onClick={() => onClickMissing(teacher, missingTasks, config)}
                  title={`${taskNum}. ${config.name}: ยังไม่ส่ง (${timeStatus.statusText}) — คลิกส่งอีเมลเตือน`}
                  className={`${
                    ultraCompact ? 'h-4 min-w-[20px] px-1 text-[9px]' : 'h-5 min-w-[24px] px-1 text-[10px]'
                  } rounded font-mono font-bold inline-flex items-center justify-center gap-0.5 bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors cursor-pointer`}
                >
                  <span>{taskNum}</span>
                  <X className="w-2.5 h-2.5 stroke-[3] shrink-0" />
                </button>
              );
            })}
          </div>

          <span
            className={`font-mono font-bold text-[10px] w-7 text-right shrink-0 ${
              isAllCompleted ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {submittedTasksCount}/{totalTasksCount}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Compact Legend & View Controls Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Task Number Reference Legend */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="font-bold text-slate-700 shrink-0">รหัสงาน:</span>
          {activeAssignments.map((cfg, idx) => (
            <span
              key={cfg.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium max-w-[190px]"
              title={cfg.name}
            >
              <span className="w-4 h-4 rounded bg-[#0B1329] text-amber-400 font-mono font-bold text-[10px] inline-flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="truncate">{cfg.name}</span>
            </span>
          ))}
          <span className="hidden xl:inline-flex items-center gap-2 ml-1 pl-2 border-l border-slate-200 text-[10px] text-slate-600">
            <span className="inline-flex items-center gap-0.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> ส่งแล้ว
            </span>
            <span className="inline-flex items-center gap-0.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" /> ส่งช้า
            </span>
            <span className="inline-flex items-center gap-0.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400 inline-block" /> ยังไม่ส่ง
            </span>
          </span>
        </div>

        {/* Sub-layout & Fullscreen Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setGroupMode('by_area')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                groupMode === 'by_area'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="จัดกลุ่มตาม 8 กลุ่มสาระแบบเรียงคอลัมน์"
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
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="เรียงทุกคนแบ่งเป็นคอลัมน์เท่ากันเพื่อลดความสูง"
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
                ? 'bg-[#0B1329] text-amber-400 border-[#0B1329]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="ย่อระยะบรรทัดให้กะทัดรัดยิ่งขึ้นเพื่อให้พอดีใน 1 หน้าจอ"
          >
            {ultraCompact ? 'กระชับพิเศษ' : 'ระยะปกติ'}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isFullscreen
                ? 'bg-amber-400 text-slate-950 border-amber-500'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'ย่อกลับขนาดหน้าต่างปกติ' : 'ขยายเต็มหน้าจอเพื่อดูครบทุกคนแบบไม่ต้องเลื่อน'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>ย่อหน้าต่าง</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>เต็มหน้าจอ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Overview Board */}
      {groupMode === 'by_area' ? (
        <div className="columns-1 md:columns-2 lg:columns-3 2xl:columns-4 gap-2.5 space-y-2.5">
          {areaGroups.map(({ area, rows: groupRows, completedCount }) => (
            <div
              key={area}
              className="break-inside-avoid bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
            >
              {/* Department Header */}
              <div className="bg-[#0B1329] text-white px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold truncate" title={area}>
                  {area}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] shrink-0 ${
                    completedCount === groupRows.length
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  ครบ {completedCount}/{groupRows.length}
                </span>
              </div>

              {/* Compact Teacher List */}
              <div>
                {groupRows.map((row, idx) => renderTeacherRow(row, idx + 1, false))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-2.5 ${
            flatColumns.length >= 4
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
              : flatColumns.length === 3
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {flatColumns.map((colRows, colIdx) => {
            const offset = flatColumns
              .slice(0, colIdx)
              .reduce((sum, c) => sum + c.length, 0);
            return (
              <div
                key={`flat-col-${colIdx}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
              >
                <div className="bg-[#0B1329] text-slate-200 px-2.5 py-1 flex items-center justify-between text-[10px] font-bold">
                  <span>
                    ลำดับ {offset + 1}–{offset + colRows.length}
                  </span>
                  <span className="text-amber-300">คลิกตัวเลขงานเพื่อดู/เตือน</span>
                </div>
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
