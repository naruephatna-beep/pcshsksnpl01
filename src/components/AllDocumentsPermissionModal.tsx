import React, { useState, useMemo } from 'react';
import {
  Teacher,
  DepartmentConfig,
  AllDocumentsAccessConfig,
  isDepartmentHead,
  isBranchHead,
} from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Users,
  Search,
  Check,
  CheckCircle2,
  Lock,
  Unlock,
  Building2,
  GitFork,
  Save,
  AlertTriangle,
  Info,
  Filter,
} from 'lucide-react';

interface AllDocumentsPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AllDocumentsAccessConfig;
  onSaveConfig: (newConfig: AllDocumentsAccessConfig) => Promise<void> | void;
  teachers: Teacher[];
  departments: DepartmentConfig[];
}

export const AllDocumentsPermissionModal: React.FC<AllDocumentsPermissionModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  teachers,
  departments,
}) => {
  const [allowAll, setAllowAll] = useState<boolean>(config.allow_all_teachers || false);
  const [allowDeptHeads, setAllowDeptHeads] = useState<boolean>(config.allow_dept_heads || false);
  const [allowBranchHeads, setAllowBranchHeads] = useState<boolean>(config.allow_branch_heads || false);
  const [allowedTeacherIds, setAllowedTeacherIds] = useState<string[]>(config.allowed_teacher_ids || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if modal is reopened with new props
  React.useEffect(() => {
    setAllowAll(config.allow_all_teachers || false);
    setAllowDeptHeads(config.allow_dept_heads || false);
    setAllowBranchHeads(config.allow_branch_heads || false);
    setAllowedTeacherIds(config.allowed_teacher_ids || []);
  }, [config, isOpen]);

  // Filtered teachers list for individual selection
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Exclude admin accounts from individual selection as they always have permission
      const id = (t.Teacher_ID || '').toLowerCase();
      if (id.startsWith('admin')) return false;

      if (selectedDeptFilter && t.Learning_Area !== selectedDeptFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (t.Name || '').toLowerCase().includes(q);
        const matchId = (t.Teacher_ID || '').toLowerCase().includes(q);
        const matchArea = (t.Learning_Area || '').toLowerCase().includes(q);
        const matchBranch = (t.branch || '').toLowerCase().includes(q);
        const matchPosition = (t.position || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchArea && !matchBranch && !matchPosition) {
          return false;
        }
      }

      return true;
    });
  }, [teachers, selectedDeptFilter, searchQuery]);

  const toggleTeacherPermission = (teacherId: string) => {
    setAllowedTeacherIds((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredTeachers.map((t) => t.Teacher_ID);
    setAllowedTeacherIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredTeachers.map((t) => t.Teacher_ID));
    setAllowedTeacherIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newConfig: AllDocumentsAccessConfig = {
        allow_all_teachers: allowAll,
        allow_dept_heads: allowDeptHeads,
        allow_branch_heads: allowBranchHeads,
        allowed_teacher_ids: allowedTeacherIds,
      };
      await onSaveConfig(newConfig);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-indigo-900/60 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  ตั้งค่าสิทธิ์การดูเอกสารทั้งหมดในระบบ
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Security Access Control
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                กำหนดว่าครูท่านใดสามารถเข้าถึงและเปิดดูเอกสารทั้งโรงเรียนได้บ้าง (ค่าเริ่มต้น: ปิดไม่ให้ครูเห็น)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Privacy Note Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs sm:text-sm flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">นโยบายความเป็นส่วนตัวของระบบวิชาการ</p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                ตามคำสั่งของผู้ดูแลระบบ คุณครูทั่วไปจะมองเห็นเฉพาะเอกสารของตนเองและเอกสารที่ได้รับมอบหมายให้ตรวจเท่านั้น
                เพื่อรักษาความเป็นส่วนตัวและลดความสับสน จะไม่มีการแสดงเอกสารของครูท่านอื่น เว้นแต่จะเปิดสิทธิ์ด้านล่างนี้
              </p>
            </div>
          </div>

          {/* Section 1: Role-level toggles */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>1. สิทธิ์การเข้าถึงระดับบทบาท (Role Settings)</span>
            </div>

            {/* Toggle 1: Allow all teachers */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    เปิดให้ครูทุกคนดูเอกสารทั้งหมดในระบบได้
                  </span>
                  {allowAll ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      เปิดใช้งาน
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      ปิดใช้งาน (ค่าเริ่มต้น)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  หากเปิดใช้งาน คุณครูทุกคนจะมองเห็นแท็บ &ldquo;เอกสารทั้งโรงเรียน&rdquo; และสามารถกดดูการ์ดแผนการสอนของทุกกลุ่มสาระได้
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowAll}
                  onChange={(e) => setAllowAll(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Toggle 2: Allow Department Heads */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    <span>อนุญาตให้หัวหน้ากลุ่มสาระการเรียนรู้ทุกคนดูได้</span>
                  </span>
                  {allowDeptHeads && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      อนุมัติ
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  หัวหน้ากลุ่มสาระทั้ง 8 กลุ่มสาระจะสามารถเข้าถึงเอกสารทั้งหมดในระบบเพื่อตรวจติดตามภาพรวมวิชาการ
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowDeptHeads}
                  onChange={(e) => setAllowDeptHeads(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Toggle 3: Allow Branch Heads */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-indigo-500" />
                    <span>อนุญาตให้หัวหน้ากลุ่มสาขาวิชาทุกคนดูได้</span>
                  </span>
                  {allowBranchHeads && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      อนุมัติ
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  หัวหน้าสาขาวิชาประจำแต่ละกลุ่มวิชา (เช่น ฟิสิกส์, เคมี, ชีวะ, เทคโนโลยี) จะสามารถดูเอกสารทั้งหมดในระบบได้
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowBranchHeads}
                  onChange={(e) => setAllowBranchHeads(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Section 2: Specific Individual Permissions */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>2. รายชื่อครูที่ได้รับอนุญาตเฉพาะบุคคล (Specific Allowed Teachers)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกติ๊กอนุญาตคุณครูที่ท่านต้องการให้สิทธิ์เปิดดูเอกสารทั้งหมดเป็นรายคน
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/80">
                  ได้รับสิทธิ์แล้ว {allowedTeacherIds.length} ท่าน
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  ล้างที่เลือก
                </button>
              </div>
            </div>

            {/* Search and Department Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อครู, รหัสครู, หรือตำแหน่ง..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="">ทุกกลุ่มสาระการเรียนรู้</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teachers List */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {filteredTeachers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ไม่พบรายชื่อคุณครูที่ตรงกับเงื่อนไขการค้นหา
                </div>
              ) : (
                filteredTeachers.map((teacher) => {
                  const isChecked = allowedTeacherIds.includes(teacher.Teacher_ID);
                  const isDeptHeadRole = isDepartmentHead(teacher);
                  const isBranchHeadRole = isBranchHead(teacher);

                  // Has effective permission via role?
                  const hasRolePermission =
                    allowAll ||
                    (allowDeptHeads && isDeptHeadRole) ||
                    (allowBranchHeads && isBranchHeadRole);

                  return (
                    <div
                      key={teacher.Teacher_ID}
                      onClick={() => toggleTeacherPermission(teacher.Teacher_ID)}
                      className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-50/50 hover:bg-emerald-50'
                          : hasRolePermission
                          ? 'bg-amber-50/30 hover:bg-amber-50/60'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {teacher.photo ? (
                            <img
                              src={formatGoogleDriveImageUrl(teacher.photo)}
                              alt={teacher.Name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            getInitials(teacher.Name)
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {teacher.Name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({teacher.Teacher_ID})
                            </span>
                            {isDeptHeadRole && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                หัวหน้ากลุ่มสาระ
                              </span>
                            )}
                            {isBranchHeadRole && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                หัวหน้าสาขา
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {teacher.Learning_Area}
                            {teacher.branch ? ` • ${teacher.branch}` : ''}
                            {teacher.position ? ` (${teacher.position})` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Eye className="w-3 h-3" />
                            <span>ได้รับสิทธิ์</span>
                          </span>
                        ) : hasRolePermission ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            <span>ได้สิทธิ์ตามบทบาท</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-400 bg-slate-100">
                            <EyeOff className="w-3 h-3" />
                            <span>ไม่เห็น</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกการตั้งค่าเรียบร้อย</span>
              </span>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าสิทธิ์'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
