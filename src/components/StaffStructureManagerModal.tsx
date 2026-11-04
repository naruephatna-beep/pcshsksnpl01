import React, { useState, useMemo } from 'react';
import { Teacher, DepartmentConfig } from '../types';
import {
  DEFAULT_DEPARTMENTS,
  saveDepartments,
  appointDepartmentHead,
  removeDepartmentHead,
  assignTeacherToDepartment,
} from '../services/departmentWorkflowService';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  Users,
  Award,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Building2,
  Layers,
  ChevronRight,
  ArrowRightLeft,
  Crown,
  Info,
} from 'lucide-react';

interface StaffStructureManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  departments: DepartmentConfig[];
  onUpdateDepartments: (departments: DepartmentConfig[]) => void;
}

export const StaffStructureManagerModal: React.FC<StaffStructureManagerModalProps> = ({
  isOpen,
  onClose,
  teachers,
  onUpdateTeachers,
  departments,
  onUpdateDepartments,
}) => {
  const [activeTab, setActiveTab] = useState<'departments' | 'assignments'>('departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments[0]?.id || DEFAULT_DEPARTMENTS[0].id
  );

  // New Department Form state
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptFormName, setDeptFormName] = useState('');
  const [deptFormCode, setDeptFormCode] = useState('');
  const [deptFormColor, setDeptFormColor] = useState('#0284C7');
  const [deptFormDesc, setDeptFormDesc] = useState('');

  // Appointing head state
  const [appointingDeptId, setAppointingDeptId] = useState<string | null>(null);

  // Toast status feedback
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  const selectedDepartment = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0];
  }, [departments, selectedDeptId]);

  // Teachers grouped by learning area / department
  const teachersInSelectedDept = useMemo(() => {
    if (!selectedDepartment) return [];
    const deptName = selectedDepartment.name.trim().toLowerCase();
    return teachers.filter((t) => {
      const teacherDept = (t.Learning_Area || '').trim().toLowerCase();
      return (
        teacherDept === deptName ||
        teacherDept.includes(deptName) ||
        deptName.includes(teacherDept)
      );
    });
  }, [teachers, selectedDepartment]);

  // All teachers filtered by search
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.Name.toLowerCase().includes(q) ||
        t.Teacher_ID.toLowerCase().includes(q) ||
        t.Email.toLowerCase().includes(q) ||
        (t.Learning_Area && t.Learning_Area.toLowerCase().includes(q))
    );
  }, [teachers, searchQuery]);

  // Handle add/edit department
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormName.trim()) {
      showToast('กรุณากรอกชื่อกลุ่มสาระ/สาขา', 'error');
      return;
    }

    let updated: DepartmentConfig[];
    if (editingDeptId) {
      updated = departments.map((d) =>
        d.id === editingDeptId
          ? {
              ...d,
              name: deptFormName.trim(),
              code: deptFormCode.trim().toUpperCase() || 'DEPT',
              color: deptFormColor,
              description: deptFormDesc.trim(),
            }
          : d
      );
      showToast(`บันทึกการแก้ไข "${deptFormName.trim()}" สำเร็จ`);
    } else {
      const newDept: DepartmentConfig = {
        id: `dept_${Date.now()}`,
        name: deptFormName.trim(),
        code: deptFormCode.trim().toUpperCase() || 'NEW',
        color: deptFormColor,
        description: deptFormDesc.trim(),
        created_at: new Date().toISOString(),
      };
      updated = [...departments, newDept];
      showToast(`เพิ่มสาขา/กลุ่มสาระ "${deptFormName.trim()}" เรียบร้อยแล้ว`);
    }

    onUpdateDepartments(updated);
    await saveDepartments(updated);
    setIsAddingDept(false);
    setEditingDeptId(null);
    setDeptFormName('');
    setDeptFormCode('');
    setDeptFormDesc('');
  };

  // Handle delete department
  const handleDeleteDepartment = async (dept: DepartmentConfig) => {
    const memberCount = teachers.filter((t) =>
      (t.Learning_Area || '').toLowerCase().includes(dept.name.toLowerCase())
    ).length;

    if (memberCount > 0) {
      if (
        !window.confirm(
          `กลุ่มสาระ "${dept.name}" มีครูสังกัดอยู่ ${memberCount} ท่าน คุณแน่ใจหรือไม่ที่จะลบ? (แนะนำให้ย้ายสังกัดครูก่อน)`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`ยืนยันการลบกลุ่มสาระ "${dept.name}" หรือไม่?`)) return;
    }

    const updated = departments.filter((d) => d.id !== dept.id);
    onUpdateDepartments(updated);
    await saveDepartments(updated);
    if (selectedDeptId === dept.id && updated.length > 0) {
      setSelectedDeptId(updated[0].id);
    }
    showToast(`ลบกลุ่มสาระ "${dept.name}" เรียบร้อยแล้ว`);
  };

  // Handle appointing a department head
  const handleAppointHead = async (deptId: string, teacherId: string) => {
    const res = await appointDepartmentHead(deptId, teacherId, teachers, departments);
    if (res.success) {
      onUpdateDepartments(res.updatedDepartments);
      onUpdateTeachers(res.updatedTeachers);
      const appointedTeacher = teachers.find((t) => t.Teacher_ID === teacherId);
      showToast(`แต่งตั้งคุณครู "${appointedTeacher?.Name}" เป็นหัวหน้าสาขาเรียบร้อยแล้ว!`);
      setAppointingDeptId(null);
    }
  };

  // Handle removing a department head
  const handleRemoveHead = async (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    if (!window.confirm(`ยืนยันการปลดหัวหน้าสาขาของ "${dept?.name}" หรือไม่?`)) return;

    const res = await removeDepartmentHead(deptId, teachers, departments);
    if (res.success) {
      onUpdateDepartments(res.updatedDepartments);
      onUpdateTeachers(res.updatedTeachers);
      showToast('ปลดหัวหน้าสาขาเรียบร้อยแล้ว');
    }
  };

  // Handle moving teacher to another department
  const handleMoveTeacher = async (teacherId: string, newDeptName: string) => {
    const res = await assignTeacherToDepartment(teacherId, newDeptName, teachers);
    if (res.success) {
      onUpdateTeachers(res.updatedTeachers);
      const teacher = teachers.find((t) => t.Teacher_ID === teacherId);
      showToast(`ย้ายสังกัดคุณครู "${teacher?.Name}" ไปยัง "${newDeptName}" เรียบร้อยแล้ว`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-[#0B1329] text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-400/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
                  โครงสร้างบุคลากร & สายงานบริหาร
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300">จ.ภ. กาฬสินธุ์</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                การจัดโครงสร้างสาขา / กลุ่มสาระ & แต่งตั้งหัวหน้าสาขา
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

        {/* Notice Banner */}
        {notice && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-b border-rose-200'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{notice.message}</span>
          </div>
        )}

        {/* Subheader / Tabs */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'departments'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>โครงสร้างสาขา & หัวหน้าสาขา ({departments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'assignments'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>จัดสังกัดครูรายบุคคล ({teachers.length} ท่าน)</span>
            </button>
          </div>

          {activeTab === 'departments' && (
            <button
              onClick={() => {
                setIsAddingDept(true);
                setEditingDeptId(null);
                setDeptFormName('');
                setDeptFormCode('');
                setDeptFormColor('#0284C7');
                setDeptFormDesc('');
              }}
              className="px-3.5 py-2 bg-[#0B1329] hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>เพิ่มสาขา / กลุ่มสาระใหม่</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50">
          {activeTab === 'departments' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Department List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    รายการสาขาและกลุ่มสาระ
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ทั้งหมด {departments.length} กลุ่ม
                  </span>
                </div>

                <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                  {departments.map((dept) => {
                    const isSelected = selectedDeptId === dept.id;
                    const memberCount = teachers.filter((t) => {
                      const teacherDept = (t.Learning_Area || '').trim().toLowerCase();
                      const dName = dept.name.trim().toLowerCase();
                      return teacherDept === dName || teacherDept.includes(dName) || dName.includes(teacherDept);
                    }).length;

                    return (
                      <div
                        key={dept.id}
                        onClick={() => setSelectedDeptId(dept.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: dept.color || '#0284C7' }}
                            >
                              {dept.code || dept.name.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {dept.name}
                              </h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>สมาชิก {memberCount} ท่าน</span>
                                {dept.head_teacher_name ? (
                                  <>
                                    <span>·</span>
                                    <span className="text-amber-800 font-semibold truncate flex items-center gap-1">
                                      <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                                      {dept.head_teacher_name.split(' ')[0]}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>·</span>
                                    <span className="text-rose-600 font-medium">ยังไม่มีหัวหน้าสาขา</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDeptId(dept.id);
                                setIsAddingDept(true);
                                setDeptFormName(dept.name);
                                setDeptFormCode(dept.code || '');
                                setDeptFormColor(dept.color || '#0284C7');
                                setDeptFormDesc(dept.description || '');
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="แก้ไขข้อมูลสาขา"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDepartment(dept);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="ลบสาขา"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Department Details & Head Appointment */}
              <div className="lg:col-span-7">
                {selectedDepartment ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
                    {/* Header of selected department */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: selectedDepartment.color || '#0284C7' }}
                        >
                          {selectedDepartment.code || 'DEPT'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500">
                              รหัส: {selectedDepartment.code}
                            </span>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-500">
                              สมาชิก {teachersInSelectedDept.length} ท่าน
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                            {selectedDepartment.name}
                          </h3>
                          {selectedDepartment.description && (
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {selectedDepartment.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section: แต่งตั้งหัวหน้าสาขา (Head of Department) */}
                    <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                            <Crown className="w-4 h-4 text-slate-950" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              หัวหน้ากลุ่มสาระ / หัวหน้าสาขา
                            </h4>
                            <p className="text-[11px] text-amber-900/80">
                              ผู้มีอำนาจตรวจและอนุมัติแผนการจัดการเรียนรู้ของสมาชิกในกลุ่มสาระนี้
                            </p>
                          </div>
                        </div>

                        {selectedDepartment.head_teacher_id && (
                          <button
                            onClick={() => handleRemoveHead(selectedDepartment.id)}
                            className="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                          >
                            ปลดตำแหน่ง
                          </button>
                        )}
                      </div>

                      {/* Current Head Display or Appoint Button */}
                      {selectedDepartment.head_teacher_id ? (
                        <div className="bg-white rounded-xl p-3.5 border border-amber-200 flex items-center justify-between gap-3 shadow-2xs">
                          {(() => {
                            const head = teachers.find(
                              (t) => t.Teacher_ID === selectedDepartment.head_teacher_id
                            );
                            const photo = head ? formatGoogleDriveImageUrl(head.photo) : '';
                            return (
                              <>
                                <div className="flex items-center gap-3 min-w-0">
                                  {photo ? (
                                    <img
                                      src={photo}
                                      alt={head?.Name || ''}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#0B1329] text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                                      {getInitials(head?.Name || 'หัวหน้า')}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-bold text-slate-900 truncate">
                                        {head?.Name || selectedDepartment.head_teacher_name}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
                                        หัวหน้ากลุ่มสาระ
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono">
                                      {head?.Email || ''} · รหัส: {head?.Teacher_ID}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => setAppointingDeptId(selectedDepartment.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0 cursor-pointer"
                                >
                                  เปลี่ยนตัวบุคคล
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="bg-white/80 rounded-xl p-4 border border-dashed border-amber-300 text-center space-y-2">
                          <p className="text-xs text-amber-900 font-medium">
                            ยังไม่ได้แต่งตั้งหัวหน้าสาขาสำหรับกลุ่มสาระนี้
                          </p>
                          <button
                            onClick={() => setAppointingDeptId(selectedDepartment.id)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>เลือกแต่งตั้งหัวหน้าสาขาทันที</span>
                          </button>
                        </div>
                      )}

                      {/* Dropdown to appoint head if open */}
                      {appointingDeptId === selectedDepartment.id && (
                        <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-indigo-600" />
                              <span>เลือกครูในสาขาเพื่อแต่งตั้งเป็นหัวหน้า</span>
                            </h5>
                            <button
                              onClick={() => setAppointingDeptId(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              ยกเลิก
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {teachersInSelectedDept.length === 0 ? (
                              <p className="text-xs text-slate-500 py-2 text-center">
                                ไม่มีครูสังกัดในสาขานี้ กรุณาย้ายครูเข้าสังกัดก่อน
                              </p>
                            ) : (
                              teachersInSelectedDept.map((teacher) => (
                                <div
                                  key={teacher.Teacher_ID}
                                  onClick={() =>
                                    handleAppointHead(selectedDepartment.id, teacher.Teacher_ID)
                                  }
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                                      {getInitials(teacher.Name)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 truncate">
                                        {teacher.Name}
                                      </p>
                                      <p className="text-[11px] text-slate-400 font-mono">
                                        {teacher.Teacher_ID} · {teacher.position}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                                    <span>แต่งตั้ง</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Member Teachers in this department */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          คุณครูผู้สอนในสังกัด ({teachersInSelectedDept.length} ท่าน)
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          สามารถเปลี่ยนสังกัดได้ที่แท็บ "จัดสังกัดครู"
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                        {teachersInSelectedDept.map((teacher) => {
                          const isHead =
                            selectedDepartment.head_teacher_id === teacher.Teacher_ID;
                          const photo = formatGoogleDriveImageUrl(teacher.photo);

                          return (
                            <div
                              key={teacher.Teacher_ID}
                              className="py-2.5 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={teacher.Name}
                                    className="w-8 h-8 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {getInitials(teacher.Name)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-slate-800 truncate">
                                      {teacher.Name}
                                    </p>
                                    {isHead && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        หัวหน้าสาขา
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono truncate">
                                    {teacher.Email} · {teacher.position}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {!isHead && (
                                  <button
                                    onClick={() =>
                                      handleAppointHead(selectedDepartment.id, teacher.Teacher_ID)
                                    }
                                    className="px-2 py-1 rounded text-[11px] font-semibold text-slate-600 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 transition-colors cursor-pointer"
                                    title="แต่งตั้งเป็นหัวหน้าสาขานี้"
                                  >
                                    ตั้งเป็นหัวหน้า
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    เลือกสาขาจากฝั่งซ้ายเพื่อดูและจัดการข้อมูล
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: จัดสังกัดครูรายบุคคล (Teacher Assignment) */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อครู, อีเมล, รหัสครู..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>เลือกกลุ่มสาระในดรอปดาวน์เพื่อย้ายสังกัดครูทันที</span>
                </div>
              </div>

              {/* Table of teachers */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">คุณครูผู้สอน</th>
                        <th className="py-3 px-4">รหัส / ตำแหน่ง</th>
                        <th className="py-3 px-4">สาขา / กลุ่มสาระปัจจุบัน</th>
                        <th className="py-3 px-4">บทบาทในสาขา</th>
                        <th className="py-3 px-4 text-right">ย้ายสังกัดสาขา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTeachers.map((teacher) => {
                        const photo = formatGoogleDriveImageUrl(teacher.photo);
                        const isHead =
                          teacher.role === 'head_of_department' ||
                          teacher.is_head_of_department === true ||
                          departments.some((d) => d.head_teacher_id === teacher.Teacher_ID);

                        return (
                          <tr key={teacher.Teacher_ID} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={teacher.Name}
                                    className="w-8 h-8 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {getInitials(teacher.Name)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-slate-900">{teacher.Name}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    {teacher.Email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              <span className="font-bold">{teacher.Teacher_ID}</span>
                              <span className="block text-[11px] text-slate-400">{teacher.position}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800">
                                {teacher.Learning_Area || 'ยังไม่ระบุ'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isHead ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  หัวหน้าสาขา
                                </span>
                              ) : teacher.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-amber-400">
                                  Admin
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">ครูผู้สอน</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <select
                                value={teacher.Learning_Area}
                                onChange={(e) => handleMoveTeacher(teacher.Teacher_ID, e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                              >
                                {departments.map((d) => (
                                  <option key={d.id} value={d.name}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal for Add / Edit Department */}
        {isAddingDept && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#0B1329] text-white p-5 flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>
                    {editingDeptId ? 'แก้ไขข้อมูลกลุ่มสาระ / สาขา' : 'เพิ่มสาขา / กลุ่มสาระใหม่'}
                  </span>
                </h4>
                <button
                  onClick={() => setIsAddingDept(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveDepartment} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อกลุ่มสาระ / สาขา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deptFormName}
                    onChange={(e) => setDeptFormName(e.target.value)}
                    placeholder="เช่น วิทยาศาสตร์และเทคโนโลยี"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัสย่อ (Code)
                    </label>
                    <input
                      type="text"
                      value={deptFormCode}
                      onChange={(e) => setDeptFormCode(e.target.value.toUpperCase())}
                      placeholder="เช่น SCI, MATH"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      สีประจำกลุ่มสาระ
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={deptFormColor}
                        onChange={(e) => setDeptFormColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-500 uppercase">
                        {deptFormColor}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    คำอธิบาย / รายละเอียดเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={deptFormDesc}
                    onChange={(e) => setDeptFormDesc(e.target.value)}
                    placeholder="ระบุขอบข่ายรายวิชาหรือรายละเอียดของสาขา..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingDept(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0B1329] hover:bg-slate-900 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    {editingDeptId ? 'บันทึกการแก้ไข' : 'เพิ่มสาขานี้'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>โครงสร้างและหัวหน้าสาขาจะถูกใช้ในสายงานอนุมัติและการกระจายงานตรวจอัตโนมัติ</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
