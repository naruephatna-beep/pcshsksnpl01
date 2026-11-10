import React, { useState } from 'react';
import { AllDocumentsAccessConfig, Teacher, DepartmentConfig } from '../types';
import {
  X,
  ShieldCheck,
  Check,
  Users,
  Eye,
  Crown,
  GitFork,
  Search,
  Lock,
  Sparkles,
} from 'lucide-react';

interface AllDocumentsPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AllDocumentsAccessConfig;
  onSaveConfig: (newConfig: AllDocumentsAccessConfig) => void;
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
  const [allowAll, setAllowAll] = useState(config.allow_all_teachers || false);
  const [allowDeptHeads, setAllowDeptHeads] = useState(config.allow_dept_heads || false);
  const [allowBranchHeads, setAllowBranchHeads] = useState(config.allow_branch_heads || false);
  const [allowedTeacherIds, setAllowedTeacherIds] = useState<string[]>(config.allowed_teacher_ids || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggleTeacher = (id: string) => {
    setAllowedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    const newConfig: AllDocumentsAccessConfig = {
      allow_all_teachers: allowAll,
      allow_dept_heads: allowDeptHeads,
      allow_branch_heads: allowBranchHeads,
      allowed_teacher_ids: allowedTeacherIds,
    };
    onSaveConfig(newConfig);
    setIsSaving(false);
    onClose();
  };

  const filteredTeachers = teachers.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.Name.toLowerCase().includes(q) ||
      t.Teacher_ID.toLowerCase().includes(q) ||
      (t.Learning_Area && t.Learning_Area.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0B1329] text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-400/20 shrink-0">
              <Eye className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
                  System Permission Control
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300">จ.ภ. กาฬสินธุ์</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                สิทธิ์การเข้าถึง "เอกสารทั้งหมดในระบบ"
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          {/* Info Banner */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>นโยบายความเป็นส่วนตัวของโรงเรียน:</strong> โดยค่าเริ่มต้น ครูทั่วไปจะเห็นเฉพาะแผนของตนเองและแผนที่ตนได้รับมอบหมายให้ตรวจเท่านั้น แอดมินสามารถอนุญาตเพิ่มเติมได้จากแผงควบคุมนี้
            </div>
          </div>

          {/* Group Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. สิทธิ์ตามกลุ่มบทบาท
            </h4>

            {/* Option A: Allow all teachers */}
            <label className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              allowAll
                ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={allowAll}
                  onChange={(e) => setAllowAll(e.target.checked)}
                  className="mt-1 rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>อนุญาตให้คุณครูทุกคนในโรงเรียนดูเอกสารทั้งหมดได้ (Open Access)</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เปิดแท็บ "เอกสารทั้งหมด" ให้ครูทุกคนเข้าดูไฟล์แผนการสอนและรายงานวิจัยของเพื่อนครูได้
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                allowAll ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {allowAll ? 'เปิดใช้งาน' : 'ปิด'}
              </span>
            </label>

            {/* Option B: Allow Department Heads */}
            <label className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              allowDeptHeads
                ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-xs'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={allowDeptHeads}
                  onChange={(e) => setAllowDeptHeads(e.target.checked)}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>อนุญาตให้หัวหน้ากลุ่มสาระการเรียนรู้ทุกคนดูเอกสารทั้งหมดได้</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    หัวหน้ากลุ่มสาระทั้ง 10 กลุ่มสาระจะสามารถสลับไปดูเอกสารของกลุ่มสาระอื่นได้
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                allowDeptHeads ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {allowDeptHeads ? 'เปิดใช้งาน' : 'ปิด'}
              </span>
            </label>

            {/* Option C: Allow Branch Heads */}
            <label className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              allowBranchHeads
                ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-xs'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={allowBranchHeads}
                  onChange={(e) => setAllowBranchHeads(e.target.checked)}
                  className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-purple-600" />
                    <span>อนุญาตให้หัวหน้ากลุ่มสาขาวิชาทุกคนดูเอกสารทั้งหมดได้</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    หัวหน้าสาขาวิชา (เช่น เทคโนโลยี, เคมี, ฟิสิกส์, ชีววิทยา ฯลฯ) สามารถดูเอกสารทั้งหมดได้
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                allowBranchHeads ? 'bg-purple-200 text-purple-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {allowBranchHeads ? 'เปิดใช้งาน' : 'ปิด'}
              </span>
            </label>
          </div>

          {/* Specific Teachers Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. อนุญาตครูเป็นรายบุคคล ({allowedTeacherIds.length} ท่าน)
              </h4>
              <span className="text-[11px] text-slate-500">
                เลือกครูที่ต้องการให้สิทธิ์พิเศษ
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อครู หรือรหัสประจำตัว..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 bg-white p-2 rounded-2xl border border-slate-200">
              {filteredTeachers.map((t) => {
                const isSelected = allowedTeacherIds.includes(t.Teacher_ID);
                return (
                  <label
                    key={t.Teacher_ID}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 text-amber-950 font-bold border border-amber-300'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTeacher(t.Teacher_ID)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>{t.Name} ({t.Teacher_ID})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {t.Learning_Area || 'ไม่ระบุกลุ่มสาระ'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#0B1329] hover:bg-slate-900 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>บันทึกการตั้งค่าสิทธิ์</span>
          </button>
        </div>
      </div>
    </div>
  );
};
