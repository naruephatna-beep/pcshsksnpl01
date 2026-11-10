import React, { useState, useMemo } from 'react';
import { Teacher, DepartmentConfig, BranchConfig, isDepartmentHead, isBranchHead } from '../types';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_BRANCHES,
  saveDepartments,
  saveBranches,
  appointDepartmentHead,
  removeDepartmentHead,
  appointBranchHead,
  removeBranchHead,
  assignTeacherToDepartment,
  assignTeacherToBranch,
  assignTeacherToDepartmentAndBranch,
  removeTeacherFromDepartment,
  removeTeacherFromBranch,
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
  GitFork,
  BookOpen,
  UserPlus,
  UserMinus,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface StaffStructureManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  departments: DepartmentConfig[];
  onUpdateDepartments: (departments: DepartmentConfig[]) => void;
  branches?: BranchConfig[];
  onUpdateBranches?: (branches: BranchConfig[]) => void;
}

export const isTeacherInDept = (teacherDept?: string | null, deptName?: string | null): boolean => {
  const t = (teacherDept || '').trim().toLowerCase();
  const d = (deptName || '').trim().toLowerCase();
  if (!t || !d) return false;
  return t === d || t.includes(d) || d.includes(t);
};

export const isTeacherInBranch = (teacherBranch?: string | null, branchName?: string | null): boolean => {
  const t = (teacherBranch || '').trim().toLowerCase();
  const b = (branchName || '').trim().toLowerCase();
  if (!t || !b) return false;
  return t === b || t.includes(b) || b.includes(t);
};

export const StaffStructureManagerModal: React.FC<StaffStructureManagerModalProps> = ({
  isOpen,
  onClose,
  teachers,
  onUpdateTeachers,
  departments,
  onUpdateDepartments,
  branches = DEFAULT_BRANCHES,
  onUpdateBranches,
}) => {
  const [activeTab, setActiveTab] = useState<'departments' | 'branches' | 'assignments'>('departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments[0]?.id || DEFAULT_DEPARTMENTS[0].id
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0]?.id || DEFAULT_BRANCHES[0].id
  );

  // Department Form state (Add/Edit)
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptFormName, setDeptFormName] = useState('');
  const [deptFormCode, setDeptFormCode] = useState('');
  const [deptFormColor, setDeptFormColor] = useState('#0284C7');
  const [deptFormDesc, setDeptFormDesc] = useState('');

  // Branch Form state (Add/Edit)
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormCode, setBranchFormCode] = useState('');
  const [branchFormColor, setBranchFormColor] = useState('#6366F1');
  const [branchFormLearningArea, setBranchFormLearningArea] = useState(
    departments[0]?.name || 'วิทยาศาสตร์และเทคโนโลยี'
  );
  const [branchFormDesc, setBranchFormDesc] = useState('');

  // Head appointment selector
  const [appointingDeptId, setAppointingDeptId] = useState<string | null>(null);
  const [appointingBranchId, setAppointingBranchId] = useState<string | null>(null);

  // Member Management States for Selected Department
  const [isAddingMemberToDept, setIsAddingMemberToDept] = useState(false);
  const [memberDeptSearchQuery, setMemberDeptSearchQuery] = useState('');

  // Member Management States for Selected Branch
  const [isAddingMemberToBranch, setIsAddingMemberToBranch] = useState(false);
  const [memberBranchSearchQuery, setMemberBranchSearchQuery] = useState('');

  // Filters in Tab 3 (Assignments)
  const [assignDeptFilter, setAssignDeptFilter] = useState<string>('all');
  const [assignBranchFilter, setAssignBranchFilter] = useState<string>('all');

  // Toast notice
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  const selectedDepartment = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0];
  }, [departments, selectedDeptId]);

  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId) || branches[0];
  }, [branches, selectedBranchId]);

  // Teachers currently in selected department
  const teachersInSelectedDept = useMemo(() => {
    if (!selectedDepartment) return [];
    return teachers.filter((t) => isTeacherInDept(t.Learning_Area, selectedDepartment.name));
  }, [teachers, selectedDepartment]);

  // Teachers available to be added into selected department (not already in it)
  const teachersAvailableForDept = useMemo(() => {
    if (!selectedDepartment) return [];
    const q = memberDeptSearchQuery.trim().toLowerCase();

    return teachers
      .filter((t) => {
        const isInDept = isTeacherInDept(t.Learning_Area, selectedDepartment.name);
        if (isInDept) return false;
        if (!q) return true;
        return (
          t.Name.toLowerCase().includes(q) ||
          t.Teacher_ID.toLowerCase().includes(q) ||
          (t.Learning_Area && t.Learning_Area.toLowerCase().includes(q)) ||
          (t.branch && t.branch.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Unassigned teachers first, then alphabetical
        const aEmpty = !a.Learning_Area || !a.Learning_Area.trim();
        const bEmpty = !b.Learning_Area || !b.Learning_Area.trim();
        if (aEmpty && !bEmpty) return -1;
        if (!aEmpty && bEmpty) return 1;
        return a.Name.localeCompare(b.Name, 'th');
      });
  }, [teachers, selectedDepartment, memberDeptSearchQuery]);

  // Teachers currently in selected branch
  const teachersInSelectedBranch = useMemo(() => {
    if (!selectedBranch) return [];
    return teachers.filter((t) => isTeacherInBranch(t.branch, selectedBranch.name));
  }, [teachers, selectedBranch]);

  // Teachers available to be added into selected branch (not already in it)
  const teachersAvailableForBranch = useMemo(() => {
    if (!selectedBranch) return [];
    const parentArea = (selectedBranch.learning_area_name || '').trim().toLowerCase();
    const q = memberBranchSearchQuery.trim().toLowerCase();

    return teachers
      .filter((t) => {
        const isInBranch = isTeacherInBranch(t.branch, selectedBranch.name);
        if (isInBranch) return false;
        if (!q) return true;
        return (
          t.Name.toLowerCase().includes(q) ||
          t.Teacher_ID.toLowerCase().includes(q) ||
          (t.Learning_Area && t.Learning_Area.toLowerCase().includes(q)) ||
          (t.branch && t.branch.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Teachers in parent learning area first
        const aInParent = Boolean(parentArea && (a.Learning_Area || '').toLowerCase().includes(parentArea));
        const bInParent = Boolean(parentArea && (b.Learning_Area || '').toLowerCase().includes(parentArea));
        if (aInParent && !bInParent) return -1;
        if (!aInParent && bInParent) return 1;
        return a.Name.localeCompare(b.Name, 'th');
      });
  }, [teachers, selectedBranch, memberBranchSearchQuery]);

  // Filtered teachers for assignments tab (Tab 3)
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teachers.filter((t) => {
      // Dept filter
      if (assignDeptFilter === 'unassigned') {
        if (t.Learning_Area && t.Learning_Area.trim()) return false;
      } else if (assignDeptFilter !== 'all') {
        if (t.Learning_Area !== assignDeptFilter) return false;
      }

      // Branch filter
      if (assignBranchFilter === 'unassigned') {
        if (t.branch && t.branch.trim()) return false;
      } else if (assignBranchFilter !== 'all') {
        if (t.branch !== assignBranchFilter) return false;
      }

      // Query
      if (!q) return true;
      return (
        t.Name.toLowerCase().includes(q) ||
        t.Teacher_ID.toLowerCase().includes(q) ||
        t.Email.toLowerCase().includes(q) ||
        (t.Learning_Area && t.Learning_Area.toLowerCase().includes(q)) ||
        (t.branch && t.branch.toLowerCase().includes(q))
      );
    });
  }, [teachers, searchQuery, assignDeptFilter, assignBranchFilter]);

  // Save Department (Add or Edit)
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormName.trim()) {
      showToast('กรุณากรอกชื่อกลุ่มสาระการเรียนรู้', 'error');
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
      showToast(`บันทึกการแก้ไขกลุ่มสาระ "${deptFormName.trim()}" สำเร็จ`);
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
      showToast(`เพิ่มกลุ่มสาระ "${deptFormName.trim()}" เรียบร้อยแล้ว`);
    }

    onUpdateDepartments(updated);
    await saveDepartments(updated);
    setIsAddingDept(false);
    setEditingDeptId(null);
    setDeptFormName('');
    setDeptFormCode('');
    setDeptFormDesc('');
  };

  // Delete Department
  const handleDeleteDepartment = async (dept: DepartmentConfig) => {
    const updated = departments.filter((d) => d.id !== dept.id);
    onUpdateDepartments(updated);
    await saveDepartments(updated);
    if (selectedDeptId === dept.id && updated.length > 0) {
      setSelectedDeptId(updated[0].id);
    }
    showToast(`ลบกลุ่มสาระ "${dept.name}" เรียบร้อยแล้ว`);
  };

  // Appoint / Remove Department Head
  const handleAppointDeptHead = async (deptId: string, teacherId: string) => {
    const res = await appointDepartmentHead(deptId, teacherId, teachers, departments);
    if (res.success) {
      onUpdateDepartments(res.updatedDepartments);
      onUpdateTeachers(res.updatedTeachers);
      const appointedTeacher = teachers.find((t) => t.Teacher_ID === teacherId);
      showToast(`แต่งตั้งคุณครู "${appointedTeacher?.Name}" เป็นหัวหน้ากลุ่มสาระเรียบร้อยแล้ว!`);
      setAppointingDeptId(null);
    }
  };

  const handleRemoveDeptHead = async (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    const res = await removeDepartmentHead(deptId, teachers, departments);
    if (res.success) {
      onUpdateDepartments(res.updatedDepartments);
      onUpdateTeachers(res.updatedTeachers);
      showToast(`ปลดหัวหน้ากลุ่มสาระของ "${dept?.name || ''}" เรียบร้อยแล้ว`);
    }
  };

  // 1-Click: Add Teacher to Department
  const handleAddTeacherToDept = async (teacherId: string, deptName: string) => {
    const res = await assignTeacherToDepartment(teacherId, deptName, teachers);
    if (res.success) {
      onUpdateTeachers(res.updatedTeachers);
      const teacher = teachers.find((t) => t.Teacher_ID === teacherId);
      showToast(`เพิ่มคุณครู "${teacher?.Name || teacherId}" เข้ากลุ่มสาระ "${deptName}" เรียบร้อยแล้ว`);
    }
  };

  // 1-Click: Remove Teacher from Department
  const handleRemoveTeacherFromDept = async (teacherId: string, deptName: string) => {
    const teacher = teachers.find((t) => t.Teacher_ID === teacherId);
    const res = await removeTeacherFromDepartment(teacherId, teachers, departments);
    if (res.success) {
      onUpdateTeachers(res.updatedTeachers);
      onUpdateDepartments(res.updatedDepartments);
      showToast(`นำคุณครู "${teacher?.Name || teacherId}" ออกจากกลุ่มสาระ "${deptName}" เรียบร้อยแล้ว`);
    }
  };

  // Save Branch (Add or Edit)
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchFormName.trim()) {
      showToast('กรุณากรอกชื่อกลุ่มสาขาวิชา', 'error');
      return;
    }

    let updated: BranchConfig[];
    if (editingBranchId) {
      updated = branches.map((b) =>
        b.id === editingBranchId
          ? {
              ...b,
              name: branchFormName.trim(),
              code: branchFormCode.trim().toUpperCase() || 'BRANCH',
              color: branchFormColor,
              learning_area_name: branchFormLearningArea,
              description: branchFormDesc.trim(),
            }
          : b
      );
      showToast(`บันทึกการแก้ไขกลุ่มสาขาวิชา "${branchFormName.trim()}" สำเร็จ`);
    } else {
      const newBranch: BranchConfig = {
        id: `branch_${Date.now()}`,
        name: branchFormName.trim(),
        code: branchFormCode.trim().toUpperCase() || 'BR',
        color: branchFormColor,
        learning_area_name: branchFormLearningArea,
        description: branchFormDesc.trim(),
        created_at: new Date().toISOString(),
      };
      updated = [...branches, newBranch];
      showToast(`เพิ่มกลุ่มสาขาวิชา "${branchFormName.trim()}" เรียบร้อยแล้ว`);
    }

    if (onUpdateBranches) {
      onUpdateBranches(updated);
    }
    await saveBranches(updated);
    setIsAddingBranch(false);
    setEditingBranchId(null);
    setBranchFormName('');
    setBranchFormCode('');
    setBranchFormDesc('');
  };

  // Delete Branch
  const handleDeleteBranch = async (branch: BranchConfig) => {
    const updated = branches.filter((b) => b.id !== branch.id);
    if (onUpdateBranches) {
      onUpdateBranches(updated);
    }
    await saveBranches(updated);
    if (selectedBranchId === branch.id && updated.length > 0) {
      setSelectedBranchId(updated[0].id);
    }
    showToast(`ลบสาขาวิชา "${branch.name}" เรียบร้อยแล้ว`);
  };

  // Appoint / Remove Branch Head
  const handleAppointBranchHeadAction = async (branchId: string, teacherId: string) => {
    const res = await appointBranchHead(branchId, teacherId, teachers, branches);
    if (res.success) {
      if (onUpdateBranches) {
        onUpdateBranches(res.updatedBranches);
      }
      onUpdateTeachers(res.updatedTeachers);
      const appointedTeacher = teachers.find((t) => t.Teacher_ID === teacherId);
      showToast(`แต่งตั้งคุณครู "${appointedTeacher?.Name}" เป็นหัวหน้ากลุ่มสาขาวิชาเรียบร้อยแล้ว!`);
      setAppointingBranchId(null);
    }
  };

  const handleRemoveBranchHeadAction = async (branchId: string) => {
    const b = branches.find((item) => item.id === branchId);
    const res = await removeBranchHead(branchId, teachers, branches);
    if (res.success) {
      if (onUpdateBranches) {
        onUpdateBranches(res.updatedBranches);
      }
      onUpdateTeachers(res.updatedTeachers);
      showToast(`ปลดหัวหน้าสาขาวิชา "${b?.name || ''}" เรียบร้อยแล้ว`);
    }
  };

  // 1-Click: Add Teacher to Branch
  const handleAddTeacherToBranch = async (teacherId: string, branchName: string) => {
    const teacher = teachers.find((t) => t.Teacher_ID === teacherId);
    if (!teacher) return;

    // If teacher currently has no learning area and branch specifies parent area, assign both!
    const parentArea = selectedBranch?.learning_area_name;
    let res;
    if (parentArea && (!teacher.Learning_Area || !teacher.Learning_Area.trim())) {
      res = await assignTeacherToDepartmentAndBranch(teacherId, parentArea, branchName, teachers);
    } else {
      res = await assignTeacherToBranch(teacherId, branchName, teachers);
    }

    if (res.success) {
      onUpdateTeachers(res.updatedTeachers);
      showToast(`เพิ่มคุณครู "${teacher?.Name || teacherId}" เข้าสาขาวิชา "${branchName}" เรียบร้อยแล้ว`);
    }
  };

  // 1-Click: Remove Teacher from Branch
  const handleRemoveTeacherFromBranchAction = async (teacherId: string, branchName: string) => {
    const teacher = teachers.find((t) => t.Teacher_ID === teacherId);
    const res = await removeTeacherFromBranch(teacherId, teachers, branches);
    if (res.success) {
      onUpdateTeachers(res.updatedTeachers);
      if (onUpdateBranches) {
        onUpdateBranches(res.updatedBranches);
      }
      showToast(`นำคุณครู "${teacher?.Name || teacherId}" ออกจากสาขาวิชา "${branchName}" เรียบร้อยแล้ว`);
    }
  };

  // Update teacher department & branch
  const handleUpdateTeacherAssignment = async (
    teacherId: string,
    newDept: string,
    newBranch: string
  ) => {
    const res = await assignTeacherToDepartmentAndBranch(
      teacherId,
      newDept,
      newBranch,
      teachers
    );
    if (res.success) {
      onUpdateTeachers(res.updatedTeachers);
      const t = teachers.find((item) => item.Teacher_ID === teacherId);
      showToast(
        `บันทึกสังกัดคุณครู "${t?.Name || teacherId}" (${newDept || 'ยังไม่ระบุกลุ่มสาระ'} • ${
          newBranch || 'ยังไม่ระบุสาขา'
        }) เรียบร้อย`
      );
    }
  };

  // Clear/Reset Teacher Assignment
  const handleResetTeacherAssignment = async (teacherId: string) => {
    const t = teachers.find((item) => item.Teacher_ID === teacherId);
    const res = await assignTeacherToDepartmentAndBranch(teacherId, '', '', teachers);
    if (res.success) {
      onUpdateTeachers(res.updatedTeachers);
      showToast(`ล้างสังกัดคุณครู "${t?.Name || teacherId}" เรียบร้อยแล้ว`);
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
                  โครงสร้างบุคลากร & เพิ่มลดสมาชิกในกลุ่มสาระและสาขา
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300">PCSHS Kalasin</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                การจัดการสมาชิกกลุ่มสาระ & กลุ่มสาขาวิชา & แต่งตั้งหัวหน้า
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

        {/* 3 Main Tabs: 1. กลุ่มสาระ | 2. กลุ่มสาขาวิชา | 3. จัดสังกัดครู */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            {/* Tab 1: กลุ่มสาระ */}
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'departments'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>1. กลุ่มสาระการเรียนรู้ ({departments.length})</span>
            </button>

            {/* Tab 2: กลุ่มสาขาวิชา */}
            <button
              onClick={() => setActiveTab('branches')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'branches'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-indigo-500" />
              <span>2. กลุ่มสาขาวิชา ({branches.length})</span>
            </button>

            {/* Tab 3: จัดสังกัดครู */}
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'assignments'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. จัดสังกัดครูรายบุคคล ({teachers.length})</span>
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
              <span>เพิ่มกลุ่มสาระใหม่</span>
            </button>
          )}

          {activeTab === 'branches' && (
            <button
              onClick={() => {
                setIsAddingBranch(true);
                setEditingBranchId(null);
                setBranchFormName('');
                setBranchFormCode('');
                setBranchFormColor('#6366F1');
                setBranchFormLearningArea(departments[0]?.name || 'วิทยาศาสตร์และเทคโนโลยี');
                setBranchFormDesc('');
              }}
              className="px-3.5 py-2 bg-[#0B1329] hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>เพิ่มสาขาวิชาใหม่</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50">
          {/* TAB 1: กลุ่มสาระการเรียนรู้ (Learning Areas) & หัวหน้ากลุ่มสาระ */}
          {activeTab === 'departments' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Department List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    รายการกลุ่มสาระการเรียนรู้
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ทั้งหมด {departments.length} กลุ่ม
                  </span>
                </div>

                <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                  {departments.map((dept) => {
                    const isSelected = selectedDeptId === dept.id;
                    const memberCount = teachers.filter((t) => isTeacherInDept(t.Learning_Area, dept.name)).length;

                    return (
                      <div
                        key={dept.id}
                        onClick={() => {
                          setSelectedDeptId(dept.id);
                          setIsAddingMemberToDept(false);
                          setMemberDeptSearchQuery('');
                        }}
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
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  สมาชิก {memberCount} ท่าน
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDeptId(dept.id);
                                setDeptFormName(dept.name);
                                setDeptFormCode(dept.code || '');
                                setDeptFormColor(dept.color || '#0284C7');
                                setDeptFormDesc(dept.description || '');
                                setIsAddingDept(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="แก้ไขชื่อ/สีกลุ่มสาระ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {departments.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDepartment(dept);
                                }}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="ลบกลุ่มสาระนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Head summary indicator */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-[11px] text-slate-600 truncate">
                              หัวหน้ากลุ่มสาระ:{' '}
                              <strong className="text-slate-900">
                                {dept.head_teacher_name || 'ยังไม่ได้แต่งตั้ง'}
                              </strong>
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                              กำลังเลือก
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Department Details, Head Appointment & Members */}
              <div className="lg:col-span-7 space-y-4">
                {selectedDepartment ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-6">
                    {/* Header of selected dept */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shadow-sm"
                          style={{ backgroundColor: selectedDepartment.color || '#0284C7' }}
                        >
                          {selectedDepartment.code || 'DEPT'}
                        </div>
                        <div>
                          <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                            กลุ่มสาระการเรียนรู้
                          </span>
                          <h3 className="text-lg font-bold text-slate-900">
                            {selectedDepartment.name}
                          </h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                          ครูสังกัด {teachersInSelectedDept.length} ท่าน
                        </span>
                      </div>
                    </div>

                    {/* Department Head Spotlight Card */}
                    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/80 p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                            หัวหน้ากลุ่มสาระการเรียนรู้ (Head of Learning Area)
                          </h4>
                        </div>
                        {selectedDepartment.head_teacher_id && (
                          <button
                            onClick={() => handleRemoveDeptHead(selectedDepartment.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
                          >
                            ปลดตำแหน่ง
                          </button>
                        )}
                      </div>

                      {selectedDepartment.head_teacher_id ? (
                        (() => {
                          const head = teachers.find(
                            (t) => t.Teacher_ID === selectedDepartment.head_teacher_id
                          );
                          const photo = formatGoogleDriveImageUrl(head?.photo);
                          return (
                            <div className="flex items-center gap-3.5 bg-white/90 p-3 rounded-xl border border-amber-200">
                              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center font-bold text-amber-800 shrink-0 overflow-hidden border border-amber-300">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={head?.Name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  getInitials(head?.Name || 'T')
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {head?.Name || selectedDepartment.head_teacher_name}
                                  </p>
                                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                                    หัวหน้ากลุ่มสาระ
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  รหัส: {head?.Teacher_ID} · {head?.position || 'ครู'} · {head?.Email}
                                </p>
                              </div>
                              <button
                                onClick={() => setAppointingDeptId(selectedDepartment.id)}
                                className="px-3 py-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg cursor-pointer transition-colors"
                              >
                                เปลี่ยน
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center py-4 bg-white/70 rounded-xl border border-dashed border-amber-300">
                          <p className="text-xs text-slate-600 mb-2">
                            ยังไม่ได้แต่งตั้งหัวหน้ากลุ่มสาระสำหรับกลุ่มสาระนี้
                          </p>
                          <button
                            onClick={() => setAppointingDeptId(selectedDepartment.id)}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                          >
                            + แต่งตั้งหัวหน้ากลุ่มสาระ
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Appoint Department Head Dropdown Picker (If triggered) */}
                    {appointingDeptId === selectedDepartment.id && (
                      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>เลือกคุณครูเพื่อแต่งตั้งเป็นหัวหน้ากลุ่มสาระ {selectedDepartment.name}:</span>
                          <button
                            onClick={() => setAppointingDeptId(null)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            ยกเลิก
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {teachersInSelectedDept.length > 0 ? (
                            teachersInSelectedDept.map((t) => (
                              <button
                                key={t.Teacher_ID}
                                onClick={() => handleAppointDeptHead(selectedDepartment.id, t.Teacher_ID)}
                                className="w-full text-left px-3 py-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <span className="font-semibold text-slate-800">
                                  {t.Name} ({t.Teacher_ID})
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {t.branch ? `สาขา: ${t.branch}` : t.position || 'ครู'}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 p-2">ไม่มีครูในสังกัดกลุ่มสาระนี้</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Members List in Selected Dept with Add / Remove Actions */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span>สมาชิกในกลุ่มสาระนี้ ({teachersInSelectedDept.length} ท่าน)</span>
                        </h4>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingMemberToDept(!isAddingMemberToDept);
                            setMemberDeptSearchQuery('');
                          }}
                          className={`px-3 py-1.5 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 ${
                            isAddingMemberToDept
                              ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                              : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isAddingMemberToDept ? 'ปิดแผงเพิ่มสมาชิก' : '+ เพิ่มครูเข้ากลุ่มสาระนี้'}</span>
                        </button>
                      </div>

                      {/* Interactive Add Member to Department Panel */}
                      {isAddingMemberToDept && (
                        <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <UserPlus className="w-4 h-4 text-amber-600" />
                              เลือกครูเพื่อเพิ่มเข้ากลุ่มสาระ "{selectedDepartment.name}"
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAddingMemberToDept(false)}
                              className="text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={memberDeptSearchQuery}
                              onChange={(e) => setMemberDeptSearchQuery(e.target.value)}
                              placeholder="ค้นหาชื่อ, รหัสครู, กลุ่มสาระเดิม..."
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {teachersAvailableForDept.map((t) => (
                              <div
                                key={t.Teacher_ID}
                                className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-2 hover:border-amber-400 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{t.Name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {t.Teacher_ID} · สังกัดปัจจุบัน:{' '}
                                    <strong className="text-slate-700">
                                      {t.Learning_Area || 'ยังไม่มีสังกัดกลุ่มสาระ'}
                                    </strong>
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddTeacherToDept(t.Teacher_ID, selectedDepartment.name)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shrink-0 flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-2xs"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>เพิ่มเข้ากลุ่มสาระ</span>
                                </button>
                              </div>
                            ))}
                            {teachersAvailableForDept.length === 0 && (
                              <p className="text-xs text-slate-500 text-center py-3">
                                ไม่พบคุณครูที่สามารถเพิ่มได้ หรือคุณครูทุกคนสังกัดกลุ่มสาระนี้แล้ว
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Current Members List with Remove Buttons */}
                      <div className="max-h-[34vh] overflow-y-auto space-y-2 pr-1">
                        {teachersInSelectedDept.map((t) => {
                          const isHead = t.Teacher_ID === selectedDepartment.head_teacher_id;
                          const isBranchH = isBranchHead(t);
                          return (
                            <div
                              key={t.Teacher_ID}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                                isHead
                                  ? 'bg-amber-50/60 border-amber-300'
                                  : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                                  {getInitials(t.Name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-bold text-slate-900 truncate">{t.Name}</p>
                                    {isHead && (
                                      <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                                        👑 หัวหน้ากลุ่มสาระ
                                      </span>
                                    )}
                                    {isBranchH && (
                                      <span className="text-[10px] bg-indigo-100 text-indigo-900 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                                        🎖️ หัวหน้าสาขา
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {t.Teacher_ID} · สาขาวิชา:{' '}
                                    <strong className="text-slate-700">{t.branch || 'ยังไม่ระบุ'}</strong>
                                  </p>
                                </div>
                              </div>

                              {/* Remove Member Action Button */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTeacherFromDept(t.Teacher_ID, selectedDepartment.name)}
                                  className="px-2 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`นำคุณครู ${t.Name} ออกจากกลุ่มสาระนี้`}
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">นำออก</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {teachersInSelectedDept.length === 0 && (
                          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                            ยังไม่มีครูในสังกัดกลุ่มสาระนี้ คลิกปุ่ม "+ เพิ่มครูเข้ากลุ่มสาระนี้" ด้านบนเพื่อเพิ่มสมาชิก
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                    โปรดเลือกกลุ่มสาระจากรายการด้านซ้าย
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: กลุ่มสาขาวิชา (Branches / Disciplines) & หัวหน้ากลุ่มสาขา */}
          {activeTab === 'branches' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Branch List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    รายการกลุ่มสาขาวิชา (Discipline Branches)
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ทั้งหมด {branches.length} สาขา
                  </span>
                </div>

                <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                  {branches.map((branch) => {
                    const isSelected = selectedBranchId === branch.id;
                    const memberCount = teachers.filter((t) => isTeacherInBranch(t.branch, branch.name)).length;

                    return (
                      <div
                        key={branch.id}
                        onClick={() => {
                          setSelectedBranchId(branch.id);
                          setIsAddingMemberToBranch(false);
                          setMemberBranchSearchQuery('');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: branch.color || '#6366F1' }}
                            >
                              {branch.code || branch.name.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {branch.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                  {branch.learning_area_name || 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี'}
                                </span>
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  สมาชิก {memberCount} ท่าน
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBranchId(branch.id);
                                setBranchFormName(branch.name);
                                setBranchFormCode(branch.code || '');
                                setBranchFormColor(branch.color || '#6366F1');
                                setBranchFormLearningArea(
                                  branch.learning_area_name || departments[0]?.name || 'วิทยาศาสตร์และเทคโนโลยี'
                                );
                                setBranchFormDesc(branch.description || '');
                                setIsAddingBranch(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="แก้ไขสาขาวิชา"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {branches.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBranch(branch);
                                }}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="ลบสาขาวิชานี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Head summary indicator */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="text-[11px] text-slate-600 truncate">
                              หัวหน้ากลุ่มสาขา:{' '}
                              <strong className="text-slate-900">
                                {branch.head_teacher_name || 'ยังไม่ได้แต่งตั้ง'}
                              </strong>
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                              กำลังเลือก
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Branch Details, Head Appointment & Members */}
              <div className="lg:col-span-7 space-y-4">
                {selectedBranch ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shadow-sm"
                          style={{ backgroundColor: selectedBranch.color || '#6366F1' }}
                        >
                          {selectedBranch.code || 'BR'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                              กลุ่มสาขาวิชา
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                              สังกัดกลุ่มสาระ: {selectedBranch.learning_area_name || 'วิทยาศาสตร์และเทคโนโลยี'}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                            {selectedBranch.name}
                          </h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold">
                          ครูสังกัด {teachersInSelectedBranch.length} ท่าน
                        </span>
                      </div>
                    </div>

                    {/* Branch Head Spotlight Card */}
                    <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent rounded-2xl border border-indigo-200/80 p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                            หัวหน้ากลุ่มสาขาวิชา (Head of Academic Discipline)
                          </h4>
                        </div>
                        {selectedBranch.head_teacher_id && (
                          <button
                            onClick={() => handleRemoveBranchHeadAction(selectedBranch.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
                          >
                            ปลดตำแหน่ง
                          </button>
                        )}
                      </div>

                      {selectedBranch.head_teacher_id ? (
                        (() => {
                          const head = teachers.find(
                            (t) => t.Teacher_ID === selectedBranch.head_teacher_id
                          );
                          const photo = formatGoogleDriveImageUrl(head?.photo);
                          return (
                            <div className="flex items-center gap-3.5 bg-white/90 p-3 rounded-xl border border-indigo-200">
                              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-800 shrink-0 overflow-hidden border border-indigo-300">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={head?.Name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  getInitials(head?.Name || 'T')
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {head?.Name || selectedBranch.head_teacher_name}
                                  </p>
                                  <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                                    หัวหน้าสาขา
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  รหัส: {head?.Teacher_ID} · {head?.position || 'ครู'} · {head?.Email}
                                </p>
                              </div>
                              <button
                                onClick={() => setAppointingBranchId(selectedBranch.id)}
                                className="px-3 py-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg cursor-pointer transition-colors"
                              >
                                เปลี่ยน
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center py-4 bg-white/70 rounded-xl border border-dashed border-indigo-300">
                          <p className="text-xs text-slate-600 mb-2">
                            ยังไม่ได้แต่งตั้งหัวหน้ากลุ่มสาขาสำหรับสาขาวิชานี้
                          </p>
                          <button
                            onClick={() => setAppointingBranchId(selectedBranch.id)}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                          >
                            + แต่งตั้งหัวหน้ากลุ่มสาขา
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Appoint Branch Head Dropdown Picker */}
                    {appointingBranchId === selectedBranch.id && (
                      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>เลือกคุณครูเพื่อแต่งตั้งเป็นหัวหน้ากลุ่มสาขา {selectedBranch.name}:</span>
                          <button
                            onClick={() => setAppointingBranchId(null)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            ยกเลิก
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {teachersInSelectedBranch.length > 0 ? (
                            teachersInSelectedBranch.map((t) => (
                              <button
                                key={t.Teacher_ID}
                                onClick={() => handleAppointBranchHeadAction(selectedBranch.id, t.Teacher_ID)}
                                className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <span className="font-semibold text-slate-800">
                                  {t.Name} ({t.Teacher_ID})
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {t.Learning_Area}
                                </span>
                              </button>
                            ))
                          ) : (
                            teachers
                              .filter((t) => {
                                const parent = (selectedBranch.learning_area_name || '').trim();
                                if (!parent) return true;
                                return isTeacherInDept(t.Learning_Area, parent);
                              })
                              .map((t) => (
                                <button
                                  key={t.Teacher_ID}
                                  onClick={() => handleAppointBranchHeadAction(selectedBranch.id, t.Teacher_ID)}
                                  className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {t.Name} ({t.Teacher_ID})
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {t.Learning_Area}
                                  </span>
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Members List in Selected Branch with Add / Remove Actions */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span>สมาชิกในสาขาวิชานี้ ({teachersInSelectedBranch.length} ท่าน)</span>
                        </h4>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingMemberToBranch(!isAddingMemberToBranch);
                            setMemberBranchSearchQuery('');
                          }}
                          className={`px-3 py-1.5 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 ${
                            isAddingMemberToBranch
                              ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isAddingMemberToBranch ? 'ปิดแผงเพิ่มสมาชิก' : '+ เพิ่มครูเข้าสาขาวิชานี้'}</span>
                        </button>
                      </div>

                      {/* Interactive Add Member to Branch Panel */}
                      {isAddingMemberToBranch && (
                        <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                            <span className="flex items-center gap-1.5">
                              <UserPlus className="w-4 h-4 text-indigo-600" />
                              เลือกครูเพื่อเพิ่มเข้ากลุ่มสาขา "{selectedBranch.name}"
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAddingMemberToBranch(false)}
                              className="text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={memberBranchSearchQuery}
                              onChange={(e) => setMemberBranchSearchQuery(e.target.value)}
                              placeholder="ค้นหาชื่อ, รหัสครู, กลุ่มสาระ..."
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {teachersAvailableForBranch.map((t) => (
                              <div
                                key={t.Teacher_ID}
                                className="p-2.5 bg-white rounded-xl border border-indigo-200 flex items-center justify-between gap-2 hover:border-indigo-400 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{t.Name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {t.Teacher_ID} · กลุ่มสาระ: {t.Learning_Area || 'ยังไม่มีสังกัด'} · สาขาเดิม: {t.branch || 'ยังไม่ระบุ'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddTeacherToBranch(t.Teacher_ID, selectedBranch.name)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shrink-0 flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-2xs"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>เพิ่มเข้าสาขานี้</span>
                                </button>
                              </div>
                            ))}
                            {teachersAvailableForBranch.length === 0 && (
                              <p className="text-xs text-slate-500 text-center py-3">
                                ไม่พบคุณครูที่สามารถเพิ่มได้ หรือคุณครูทุกคนสังกัดสาขาวิชานี้แล้ว
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Current Branch Members with Remove Buttons */}
                      <div className="max-h-[34vh] overflow-y-auto space-y-2 pr-1">
                        {teachersInSelectedBranch.map((t) => {
                          const isHead = t.Teacher_ID === selectedBranch.head_teacher_id;
                          const isDeptH = isDepartmentHead(t);
                          return (
                            <div
                              key={t.Teacher_ID}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                                isHead
                                  ? 'bg-indigo-50/60 border-indigo-300'
                                  : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                                  {getInitials(t.Name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-bold text-slate-900 truncate">{t.Name}</p>
                                    {isHead && (
                                      <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                                        🎖️ หัวหน้าสาขา
                                      </span>
                                    )}
                                    {isDeptH && (
                                      <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                                        👑 หัวหน้ากลุ่มสาระ
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {t.Teacher_ID} · กลุ่มสาระ:{' '}
                                    <strong className="text-slate-700">{t.Learning_Area || 'ยังไม่ระบุ'}</strong>
                                  </p>
                                </div>
                              </div>

                              {/* Remove from Branch Action Button */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTeacherFromBranchAction(t.Teacher_ID, selectedBranch.name)}
                                  className="px-2 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`นำคุณครู ${t.Name} ออกจากสาขาวิชานี้`}
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">นำออก</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {teachersInSelectedBranch.length === 0 && (
                          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                            ยังไม่มีครูในสังกัดสาขานี้ คลิกปุ่ม "+ เพิ่มครูเข้าสาขาวิชานี้" ด้านบนเพื่อเพิ่มสมาชิก
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                    โปรดเลือกกลุ่มสาขาวิชาจากรายการด้านซ้าย
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: จัดสังกัดครูรายบุคคล (กลุ่มสาระ & กลุ่มสาขาวิชา) */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="relative sm:col-span-5">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ, รหัสครู, กลุ่มสาระ, สาขาวิชา..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                    />
                  </div>

                  {/* Filter by Department */}
                  <div className="sm:col-span-3">
                    <select
                      value={assignDeptFilter}
                      onChange={(e) => setAssignDeptFilter(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="all">กลุ่มสาระ: ทั้งหมด</option>
                      <option value="unassigned">⚠️ ยังไม่สังกัดกลุ่มสาระ</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Branch */}
                  <div className="sm:col-span-3">
                    <select
                      value={assignBranchFilter}
                      onChange={(e) => setAssignBranchFilter(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="all">สาขาวิชา: ทั้งหมด</option>
                      <option value="unassigned">⚠️ ยังไม่สังกัดสาขา</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1 text-right text-xs text-slate-500 font-mono">
                    {filteredTeachers.length}/{teachers.length}
                  </div>
                </div>
              </div>

              {/* Assignment Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B1329] text-white">
                      <tr>
                        <th className="py-3 px-4 font-bold">ครูผู้สอน</th>
                        <th className="py-3 px-4 font-bold">ตำแหน่ง / บทบาทบริหาร</th>
                        <th className="py-3 px-4 font-bold">กลุ่มสาระการเรียนรู้ (Department)</th>
                        <th className="py-3 px-4 font-bold">กลุ่มสาขาวิชา (Branch)</th>
                        <th className="py-3 px-4 font-bold text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTeachers.map((t) => {
                        const isDeptH = isDepartmentHead(t);
                        const isBranchH = isBranchHead(t);
                        const currentDept = t.Learning_Area || '';
                        const currentBranch = t.branch || '';

                        // Get matching branches for this teacher's learning area
                        const relevantBranches = branches.filter((b) => {
                          if (!b.learning_area_name) return true;
                          if (!currentDept) return true;
                          return isTeacherInDept(currentDept, b.learning_area_name);
                        });

                        return (
                          <tr key={t.Teacher_ID} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 border border-slate-200">
                                  {getInitials(t.Name)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{t.Name}</p>
                                  <p className="text-[10px] font-mono text-slate-400">
                                    {t.Teacher_ID} · {t.Email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isDeptH && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow-2xs">
                                    👑 หัวหน้ากลุ่มสาระ
                                  </span>
                                )}
                                {isBranchH && (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] shadow-2xs">
                                    🎖️ หัวหน้าสาขา
                                  </span>
                                )}
                                {!isDeptH && !isBranchH && (
                                  <span className="text-slate-500 text-[11px]">
                                    {t.position || 'ครูผู้สอน'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Dropdown: กลุ่มสาระ (รวมตัวเลือกไม่สังกัด) */}
                            <td className="py-3 px-4">
                              <select
                                value={currentDept}
                                onChange={(e) =>
                                  handleUpdateTeacherAssignment(
                                    t.Teacher_ID,
                                    e.target.value,
                                    currentBranch
                                  )
                                }
                                className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-full max-w-[210px] ${
                                  !currentDept
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : 'bg-white text-slate-800 border-slate-200'
                                }`}
                              >
                                <option value="">-- ยังไม่สังกัดกลุ่มสาระ --</option>
                                {departments.map((d) => (
                                  <option key={d.id} value={d.name}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Dropdown: กลุ่มสาขาวิชา (รวมตัวเลือกไม่สังกัด) */}
                            <td className="py-3 px-4">
                              <select
                                value={currentBranch}
                                onChange={(e) =>
                                  handleUpdateTeacherAssignment(
                                    t.Teacher_ID,
                                    currentDept,
                                    e.target.value
                                  )
                                }
                                className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full max-w-[210px] ${
                                  !currentBranch
                                    ? 'bg-slate-50 text-slate-500 border-slate-200'
                                    : 'bg-white text-slate-800 border-slate-200'
                                }`}
                              >
                                <option value="">-- ยังไม่ระบุสาขา --</option>
                                {relevantBranches.map((b) => (
                                  <option key={b.id} value={b.name}>
                                    {b.name}
                                  </option>
                                ))}
                                {relevantBranches.length === 0 &&
                                  branches.map((b) => (
                                    <option key={b.id} value={b.name}>
                                      {b.name}
                                    </option>
                                  ))}
                              </select>
                            </td>

                            {/* Actions Column */}
                            <td className="py-3 px-4 text-center">
                              {(currentDept || currentBranch) ? (
                                <button
                                  type="button"
                                  onClick={() => handleResetTeacherAssignment(t.Teacher_ID)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="ล้างสังกัดกลุ่มสาระและสาขา (ปลดออก)"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400">-</span>
                              )}
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

        {/* Modal: Add/Edit Department Form */}
        {isAddingDept && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>{editingDeptId ? 'แก้ไขกลุ่มสาระการเรียนรู้' : 'เพิ่มกลุ่มสาระใหม่'}</span>
                </h3>
                <button
                  onClick={() => setIsAddingDept(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveDepartment} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อกลุ่มสาระการเรียนรู้ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deptFormName}
                    onChange={(e) => setDeptFormName(e.target.value)}
                    placeholder="เช่น กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี"
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
                    คำอธิบายเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={deptFormDesc}
                    onChange={(e) => setDeptFormDesc(e.target.value)}
                    placeholder="ระบุรายละเอียด..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingDept(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0B1329] hover:bg-slate-900 text-amber-400 font-bold rounded-xl text-xs shadow-xs"
                  >
                    {editingDeptId ? 'บันทึกการแก้ไข' : 'เพิ่มกลุ่มสาระ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Branch Form */}
        {isAddingBranch && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-indigo-600" />
                  <span>{editingBranchId ? 'แก้ไขกลุ่มสาขาวิชา' : 'เพิ่มกลุ่มสาขาวิชาใหม่'}</span>
                </h3>
                <button
                  onClick={() => setIsAddingBranch(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBranch} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อกลุ่มสาขาวิชา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={branchFormName}
                    onChange={(e) => setBranchFormName(e.target.value)}
                    placeholder="เช่น สาขาเทคโนโลยี, สาขาเคมี, สาขาฟิสิกส์"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สังกัดกลุ่มสาระการเรียนรู้หลัก <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={branchFormLearningArea}
                    onChange={(e) => setBranchFormLearningArea(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัสย่อ (Code)
                    </label>
                    <input
                      type="text"
                      value={branchFormCode}
                      onChange={(e) => setBranchFormCode(e.target.value.toUpperCase())}
                      placeholder="เช่น TECH, CHEM, PHYS"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      สีประจำสาขา
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branchFormColor}
                        onChange={(e) => setBranchFormColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-500 uppercase">
                        {branchFormColor}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    คำอธิบายเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={branchFormDesc}
                    onChange={(e) => setBranchFormDesc(e.target.value)}
                    placeholder="ระบุคำอธิบายสาขาวิชา..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingBranch(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0B1329] hover:bg-slate-900 text-indigo-300 font-bold rounded-xl text-xs shadow-xs"
                  >
                    {editingBranchId ? 'บันทึกการแก้ไข' : 'เพิ่มสาขาวิชา'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>แอดมินสามารถเพิ่ม-ลดและย้ายสังกัดสมาชิกในกลุ่มสาระและสาขาวิชาได้แบบเรียลไทม์</span>
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
