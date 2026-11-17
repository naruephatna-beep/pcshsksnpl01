import React, { useState, useEffect, useMemo } from 'react';
import {
  ActiveTermConfig,
  LessonPlan,
  PlanTypeDeadlineConfig,
  Teacher,
  AssignmentSubmission,
} from '../types';
import {
  saveActiveTerm,
  isPlanInActiveTerm,
  isSubmissionInActiveTerm,
  getDriveTermFolderNames,
} from '../utils/academicTermUtils';
import {
  ensureDriveTermFolderExists,
  migrateDriveFilesToTermStructure,
} from '../services/googleDriveService';
import {
  purgeOldTermRecordsFromDatabase,
} from '../services/supabaseClient';
import { getSavedSubmissions } from '../utils/deadlineUtils';
import {
  X,
  Calendar,
  FolderOpen,
  FolderPlus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Cloud,
  ArrowRight,
  Database,
  ShieldAlert,
  ExternalLink,
  FolderSync,
  Sparkles,
} from 'lucide-react';

interface AcademicTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTerm: ActiveTermConfig;
  currentTeacher: Teacher | null;
  allPlans: LessonPlan[];
  deadlineConfigs: PlanTypeDeadlineConfig[];
  onTermApplied: (
    nextTerm: ActiveTermConfig,
    purgedIds: string[],
    updatedDeadlines?: PlanTypeDeadlineConfig[]
  ) => void;
  onOpenGoogleDriveConfig: () => void;
}

const YEAR_OPTIONS = ['2568', '2569', '2570', '2571', '2572', '2573'];

export const AcademicTermModal: React.FC<AcademicTermModalProps> = ({
  isOpen,
  onClose,
  activeTerm,
  currentTeacher,
  allPlans,
  deadlineConfigs,
  onTermApplied,
  onOpenGoogleDriveConfig,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(activeTerm.academic_year || '2569');
  const [selectedSemester, setSelectedSemester] = useState<string>(activeTerm.semester || '2');
  const [purgeOldOnSwitch, setPurgeOldOnSwitch] = useState<boolean>(true);
  const [updateDeadlinesOnSwitch, setUpdateDeadlinesOnSwitch] = useState<boolean>(true);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState<boolean>(false);
  const [confirmPurgeOnlyOpen, setConfirmPurgeOnlyOpen] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMigratingDrive, setIsMigratingDrive] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    details?: string;
    showUpdateScriptBtn?: boolean;
    folderUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedYear(activeTerm.academic_year || '2569');
      setSelectedSemester(activeTerm.semester || '2');
      setConfirmSwitchOpen(false);
      setConfirmPurgeOnlyOpen(false);
      setFeedback(null);
    }
  }, [isOpen, activeTerm]);

  const targetTerm: ActiveTermConfig = useMemo(
    () => ({
      academic_year: selectedYear.trim() || '2569',
      semester: selectedSemester.trim() || '2',
      updated_by: currentTeacher?.Teacher_ID,
    }),
    [selectedYear, selectedSemester, currentTeacher]
  );

  const isSameAsActive =
    targetTerm.academic_year === activeTerm.academic_year &&
    targetTerm.semester === activeTerm.semester;

  const currentDriveFolders = useMemo(
    () => getDriveTermFolderNames(activeTerm),
    [activeTerm]
  );
  const targetDriveFolders = useMemo(
    () => getDriveTermFolderNames(targetTerm),
    [targetTerm]
  );

  // Statistics for plans against ACTIVE term
  const { currentTermPlans, oldTermPlans, oldSubmissions } = useMemo(() => {
    const cur: LessonPlan[] = [];
    const old: LessonPlan[] = [];
    for (const p of allPlans) {
      if (p.status === 'deleted') continue;
      if (isPlanInActiveTerm(p, activeTerm)) {
        cur.push(p);
      } else {
        old.push(p);
      }
    }
    const allSubs: AssignmentSubmission[] = getSavedSubmissions();
    const oldSubs = allSubs.filter(
      (s) => s.status !== 'deleted' && !isSubmissionInActiveTerm(s, activeTerm, deadlineConfigs)
    );
    return { currentTermPlans: cur, oldTermPlans: old, oldSubmissions: oldSubs };
  }, [allPlans, activeTerm, deadlineConfigs]);

  // Statistics for plans against TARGET term (if Admin switches to targetTerm)
  const targetSwitchPurgeStats = useMemo(() => {
    const plansToPurge = allPlans.filter(
      (p) => p.status !== 'deleted' && !isPlanInActiveTerm(p, targetTerm)
    );
    const allSubs: AssignmentSubmission[] = getSavedSubmissions();
    const subsToPurge = allSubs.filter(
      (s) => s.status !== 'deleted' && !isSubmissionInActiveTerm(s, targetTerm, deadlineConfigs)
    );
    return {
      plansToPurge,
      subsToPurge,
      totalCount: plansToPurge.length,
    };
  }, [allPlans, targetTerm, deadlineConfigs]);

  if (!isOpen) return null;

  // 1. Apply academic year / term switch (and optional purge + Drive folder creation)
  const handleConfirmSwitchTerm = async () => {
    setIsProcessing(true);
    setFeedback(null);

    try {
      // A. Save active term globally to system_settings & localStorage
      const saveRes = await saveActiveTerm(targetTerm);

      // B. Ensure Google Drive folder exists for new year & semester
      const driveRes = await ensureDriveTermFolderExists({
        academicYear: targetTerm.academic_year,
        semester: targetTerm.semester,
      });

      // C. Purge old-term plans & submissions from Database ONLY (if enabled)
      let purgedIds: string[] = [];
      let purgeSummary = '';
      if (purgeOldOnSwitch) {
        const planIds = targetSwitchPurgeStats.plansToPurge.map((p) => p.id);
        const subIds = targetSwitchPurgeStats.subsToPurge.map((s) => s.id);
        const purgeRes = await purgeOldTermRecordsFromDatabase(planIds, subIds);
        purgedIds = Array.from(new Set([...planIds, ...subIds]));
        if (purgedIds.length > 0) {
          purgeSummary = ` และลบงานของเทอม/ปีเก่าออกจาก Database จำนวน ${purgedIds.length} รายการ (ไฟล์ใน Google Drive ยังอยู่ครบ)`;
        }
      }

      // D. Update deadline configs to match new academic year & semester
      let updatedDeadlines: PlanTypeDeadlineConfig[] | undefined;
      if (updateDeadlinesOnSwitch && deadlineConfigs.length > 0) {
        updatedDeadlines = deadlineConfigs.map((dl) => ({
          ...dl,
          academic_year: targetTerm.academic_year,
          semester: targetTerm.semester,
        }));
      }

      onTermApplied(targetTerm, purgedIds, updatedDeadlines);
      setConfirmSwitchOpen(false);

      if (driveRes.isLegacyScript) {
        setFeedback({
          type: 'warning',
          title: `เปลี่ยนระบบเป็น ภาคเรียนที่ ${targetTerm.semester}/${targetTerm.academic_year} สำเร็จแล้ว!${purgeSummary}`,
          details:
            '⚠️ หมายเหตุ: สคริปต์ Google Apps Script ใน Drive ยังเป็นเวอร์ชันเดิม จึงยังไม่สามารถสร้างโฟลเดอร์ปีการศึกษา/เทอมอัตโนมัติบน Drive ได้ กรุณากดปุ่มด้านล่างเพื่ออัปเดตสคริปต์ (Deploy เวอร์ชันใหม่)',
          showUpdateScriptBtn: true,
        });
      } else if (!driveRes.success) {
        setFeedback({
          type: 'warning',
          title: `เปลี่ยนระบบเป็น ภาคเรียนที่ ${targetTerm.semester}/${targetTerm.academic_year} สำเร็จแล้ว!${purgeSummary}`,
          details: `ระบบเปลี่ยนปีการศึกษาในฐานข้อมูลแล้ว${saveRes.isSupabase ? ' (ซิงค์ Cloud เรียบร้อย)' : ''} แต่เชื่อมต่อ Google Drive ไม่สำเร็จ: ${driveRes.error || ''}`,
        });
      } else {
        setFeedback({
          type: 'success',
          title: `เปลี่ยนเป็น ภาคเรียนที่ ${targetTerm.semester}/${targetTerm.academic_year} และสร้างโฟลเดอร์ Google Drive สำเร็จ!`,
          details: `โฟลเดอร์ปลายทาง: ${driveRes.folderPath || targetDriveFolders.fullPathLabel}${purgeSummary}`,
          folderUrl: driveRes.folderUrl,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการเปลี่ยนปีการศึกษา/เทอม',
        details: err?.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Migrate existing Drive files into จภ_กาฬสินธุ์_ปีการศึกษา_<year> / เทอม_<sem>
  const handleMigrateDriveFiles = async () => {
    setIsMigratingDrive(true);
    setFeedback(null);
    try {
      const res = await migrateDriveFilesToTermStructure({
        academicYear: activeTerm.academic_year,
        semester: activeTerm.semester,
      });

      if (res.isLegacyScript) {
        setFeedback({
          type: 'warning',
          title: 'กรุณาอัปเดตโค้ด Google Apps Script ก่อนย้ายไฟล์',
          details:
            'สคริปต์ที่ติดตั้งไว้ใน Google Apps Script ยังเป็นเวอร์ชันเดิม กดปุ่ม "เปิดตั้งค่า Google Drive" เพื่อคัดลอกโค้ดใหม่ไปวางและ Deploy เวอร์ชันใหม่ จากนั้นกลับมากดปุ่มย้ายไฟล์อีกครั้งได้เลยครับ',
          showUpdateScriptBtn: true,
        });
      } else if (!res.success) {
        setFeedback({
          type: 'error',
          title: 'ย้ายไฟล์ใน Google Drive ไม่สำเร็จ',
          details: res.error,
        });
      } else {
        setFeedback({
          type: 'success',
          title: `ย้ายไฟล์เข้าโฟลเดอร์ ${res.targetPath || currentDriveFolders.fullPathLabel} สำเร็จแล้ว!`,
          details: `ย้ายไฟล์สำเร็จ ${res.movedFilesCount || 0} ไฟล์ (จัดระเบียบ ${res.movedFoldersCount || 0} โฟลเดอร์) ลิงก์ URL เดิมของไฟล์ทั้งหมดยังคงใช้งานได้เหมือนเดิม 100%`,
          folderUrl: res.folderUrl,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'เกิดข้อผิดพลาดระหว่างย้ายไฟล์ใน Google Drive',
        details: err?.message,
      });
    } finally {
      setIsMigratingDrive(false);
    }
  };

  // 3. Purge ONLY old-term DB records right now (without changing activeTerm)
  const handlePurgeOldRecordsOnly = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const planIds = oldTermPlans.map((p) => p.id);
      const subIds = oldSubmissions.map((s) => s.id);
      const res = await purgeOldTermRecordsFromDatabase(planIds, subIds);
      const purgedIds = Array.from(new Set([...planIds, ...subIds]));
      onTermApplied(activeTerm, purgedIds);
      setConfirmPurgeOnlyOpen(false);
      setFeedback({
        type: 'success',
        title: `ลบงานของเทอม/ปีเก่าออกจาก Database สำเร็จ (${res.deletedCount} รายการ)`,
        details:
          'ข้อมูลในฐานข้อมูลและหน้าเว็บเหลือเฉพาะงานของปีการศึกษา/เทอมปัจจุบันแล้ว โดยไฟล์ทั้งหมดใน Google Drive ยังคงอยู่ครบสมบูรณ์ ไม่ถูกลบ',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'ไม่สามารถลบรายการเก่าได้',
        details: err?.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0B1329] text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-400/20 shrink-0">
              <Calendar className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                Academic Year & Semester Control
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                จัดการปีการศึกษา ภาคเรียน & คลังเอกสาร Google Drive
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50 touch-scroll">
          {/* Current Status Banner */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  ปีการศึกษา & ภาคเรียนที่ใช้งานอยู่ปัจจุบัน
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                  <span>
                    ภาคเรียนที่ {activeTerm.semester} / ปีการศึกษา {activeTerm.academic_year}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>

              <div className="text-right bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">โฟลเดอร์ Google Drive</div>
                <div className="text-xs font-mono font-bold text-indigo-900 mt-0.5 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{currentDriveFolders.fullPathLabel}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-emerald-950">
                  เอกสารในเทอมปัจจุบัน ({activeTerm.semester}/{activeTerm.academic_year})
                </span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {currentTermPlans.length} รายการ
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  oldTermPlans.length > 0 || oldSubmissions.length > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="font-semibold">เอกสารเทอม/ปีเก่าที่ค้างใน Database</span>
                <span className="font-mono font-black text-sm">
                  {oldTermPlans.length} รายการ
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Alert Box */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in duration-150 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : feedback.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-950'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1.5 min-w-0">
                <p className="font-bold text-sm">{feedback.title}</p>
                {feedback.details && (
                  <p className="leading-relaxed opacity-90">{feedback.details}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {feedback.folderUrl && (
                    <a
                      href={feedback.folderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>เปิดโฟลเดอร์ใน Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {feedback.showUpdateScriptBtn && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenGoogleDriveConfig();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>เปิดตั้งค่า Google Drive เพื่ออัปเดตสคริปต์</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Switch Academic Year & Semester */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FolderPlus className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  เปลี่ยนปีการศึกษา / ภาคเรียน (ขึ้นเทอมใหม่หรือปีการศึกษาใหม่)
                </h3>
                <p className="text-[11px] text-slate-500">
                  เมื่อเปลี่ยน ระบบจะสร้างโฟลเดอร์ใหม่ใน Google Drive และเริ่มเก็บงานของเทอมใหม่อัตโนมัติ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ปีการศึกษา (พ.ศ.)
                </label>
                <div className="flex gap-2">
                  <select
                    value={YEAR_OPTIONS.includes(selectedYear) ? selectedYear : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') setSelectedYear(e.target.value);
                    }}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>
                        ปีการศึกษา {yr}
                      </option>
                    ))}
                    {!YEAR_OPTIONS.includes(selectedYear) && (
                      <option value="custom">กำหนดเอง ({selectedYear})</option>
                    )}
                  </select>
                  <input
                    type="text"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="2569"
                    className="w-24 px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ภาคเรียน (เทอม)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['1', '2'].map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setSelectedSemester(sem)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                        selectedSemester === sem
                          ? 'bg-[#0B1329] text-amber-400 border-[#0B1329] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      ภาคเรียนที่ {sem} (เทอม {sem})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Folder Structure Preview */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
              <div className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>โครงสร้างโฟลเดอร์ Google Drive สำหรับค่าที่เลือก:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-indigo-900 bg-white px-3 py-2 rounded-lg border border-indigo-200">
                <span className="font-bold">📁 {targetDriveFolders.yearFolderName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-amber-800">📁 {targetDriveFolders.termFolderName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">📁 [ประเภทเอกสาร] & 📁 ตรวจแล้ว</span>
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={purgeOldOnSwitch}
                  onChange={(e) => setPurgeOldOnSwitch(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-amber-950 block">
                    ลบรายการเอกสารของเทอม/ปีเก่าออกจาก Database ทันที (แนะนำเมื่อขึ้นเทอม/ปีใหม่)
                  </span>
                  <span className="text-[11px] text-amber-900/90 block mt-0.5">
                    ระบบจะลบเฉพาะข้อมูลตารางใน Database เพื่อให้หน้าเว็บสะอาดเป็นเทอมใหม่ (พบข้อมูลเก่า{' '}
                    <strong>{targetSwitchPurgeStats.totalCount} รายการ</strong>) —{' '}
                    <strong className="text-emerald-800 underline">
                      ไฟล์ทั้งหมดใน Google Drive จะไม่ถูกลบและยังคงอยู่ครบ 100%
                    </strong>
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateDeadlinesOnSwitch}
                  onChange={(e) => setUpdateDeadlinesOnSwitch(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    ปรับปีการศึกษา/เทอมของรายการภาระงาน & กำหนดส่งทั้งหมดให้ตรงกับเทอมใหม่
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    รายชื่อครู โครงสร้างกลุ่มสาระ/สาขา และแบบฟอร์มภาระงานจะยังคงอยู่ครบ ไม่ต้องตั้งค่าใหม่
                  </span>
                </div>
              </label>
            </div>

            {/* Action / Confirmation Button */}
            {!confirmSwitchOpen ? (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmSwitchOpen(true)}
                  disabled={isProcessing || !selectedYear}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    {isSameAsActive
                      ? `สร้างโฟลเดอร์ & อัปเดตเทอม ${selectedSemester}/${selectedYear}`
                      : `เปลี่ยนเป็น ภาคเรียนที่ ${selectedSemester}/${selectedYear}`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5 text-xs text-rose-950">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">
                      ยืนยันการตั้งค่าเป็น ภาคเรียนที่ {selectedSemester} / ปีการศึกษา {selectedYear}
                    </p>
                    <p className="mt-1 leading-relaxed">
                      {purgeOldOnSwitch && targetSwitchPurgeStats.totalCount > 0
                        ? `ระบบจะลบรายการเอกสารเก่าจำนวน ${targetSwitchPurgeStats.totalCount} รายการออกจาก Database (ไฟล์ใน Google Drive ยังคงอยู่ครบ ไม่ถูกลบ) และสร้างโฟลเดอร์ "${targetDriveFolders.fullPathLabel}" บน Google Drive`
                        : `ระบบจะบันทึกค่าและสร้างโฟลเดอร์ "${targetDriveFolders.fullPathLabel}" บน Google Drive โดยไม่ลบข้อมูลใน Database`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmSwitchOpen(false)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSwitchTerm}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยันดำเนินการทันที'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Google Drive Migration & Database Cleanup Utilities */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FolderSync className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  จัดระเบียบย้ายไฟล์เดิมใน Drive & ล้างงานเก่าค้างใน Database
                </h3>
                <p className="text-[11px] text-slate-500">
                  สำหรับย้ายไฟล์ของปี 2569 ที่เคยส่งไว้ก่อนหน้าเข้ามาในโฟลเดอร์ปี/เทอมใหม่ (URL เดิมไม่เปลี่ยน)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Migrate Drive Button */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>1. ย้ายไฟล์เดิมใน Google Drive</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                    ย้ายไฟล์เดิมจากโฟลเดอร์เก่าเข้ามาไว้ใน{' '}
                    <strong className="font-mono">{currentDriveFolders.fullPathLabel}</strong> (รักษา File ID และลิงก์เดิมทุกไฟล์)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleMigrateDriveFiles}
                  disabled={isMigratingDrive || isProcessing}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <FolderSync className={`w-4 h-4 ${isMigratingDrive ? 'animate-spin' : ''}`} />
                  <span>
                    {isMigratingDrive
                      ? 'กำลังย้ายไฟล์ใน Drive...'
                      : `ย้ายไฟล์เข้า ${currentDriveFolders.yearFolderName}/${currentDriveFolders.termFolderName}`}
                  </span>
                </button>
              </div>

              {/* Purge Old DB Records Button */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-slate-600" />
                    <span>2. ลบงานเทอมเก่าออกจาก Database</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ลบรายการที่ไม่ใช่ภาคเรียน {activeTerm.semester}/{activeTerm.academic_year} ออกจากฐานข้อมูลเว็บ (พบ{' '}
                    <strong className="text-rose-700">{oldTermPlans.length} รายการ</strong>) — ไม่ลบไฟล์ใน Drive
                  </p>
                </div>

                {!confirmPurgeOnlyOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmPurgeOnlyOpen(true)}
                    disabled={isProcessing || (oldTermPlans.length === 0 && oldSubmissions.length === 0)}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {oldTermPlans.length === 0 && oldSubmissions.length === 0
                        ? 'ไม่มีงานเก่าค้างใน Database'
                        : `ลบงานเก่า ${oldTermPlans.length} รายการออกจาก DB`}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmPurgeOnlyOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handlePurgeOldRecordsOnly}
                      disabled={isProcessing}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      {isProcessing && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>ยืนยันลบ</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>การตั้งค่านี้ซิงค์ข้ามเครื่องอัตโนมัติผ่าน Cloud Database</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
