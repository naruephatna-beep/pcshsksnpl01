import React, { useState } from 'react';
import {
  DynamicFormField,
  DynamicFieldType,
  Teacher,
  PlanTypeDeadlineConfig,
  SubmissionMode,
} from '../types';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Copy,
  Layers,
  FileText,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Upload,
  UserCheck,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';

interface DynamicFormBuilderProps {
  fields: DynamicFormField[];
  onChange: (fields: DynamicFormField[]) => void;
  availableTemplates?: PlanTypeDeadlineConfig[];
  currentTeacher?: Teacher | null;
}

const FIELD_TYPE_OPTIONS: {
  type: DynamicFieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    type: 'text',
    label: 'ข้อความสั้น',
    icon: FileText,
    description: 'ข้อความบรรทัดเดียว เช่น รหัสวิชา, ชื่อวิชา, หัวข้อ',
  },
  {
    type: 'textarea',
    label: 'ข้อความยาว',
    icon: FileText,
    description: 'กล่องข้อความหลายบรรทัด สำหรับรายละเอียด ประเด็น หรือวิธีดำเนินงาน',
  },
  {
    type: 'select',
    label: 'Dropdown (เลือก 1 จากรายการ)',
    icon: List,
    description: 'เมนูเลือกรายการแบบดรอปดาวน์',
  },
  {
    type: 'radio',
    label: 'Radio (ตัวเลือกวงกลม)',
    icon: CheckCircle2,
    description: 'เลือกได้เพียง 1 ข้อจากตัวเลือกที่กำหนด',
  },
  {
    type: 'checkbox',
    label: 'Checkbox (เลือกได้หลายข้อ)',
    icon: CheckSquare,
    description: 'เลือกได้มากกว่า 1 ตัวเลือก',
  },
  {
    type: 'file',
    label: 'อัปโหลดไฟล์ / ลิงก์ PDF',
    icon: Upload,
    description: 'เลือกได้ว่าจะให้ส่งไฟล์ตรง, วางลิงก์ PDF หรือบังคับส่งแค่ลิงก์',
  },
  {
    type: 'user_profile',
    label: 'ข้อมูลบัญชีครู (อ่านอย่างเดียว)',
    icon: UserCheck,
    description: 'ดึงชื่อ-นามสกุล หรือกลุ่มสาระฯ จากบัญชีครูอัตโนมัติ ห้ามแก้ไข',
  },
  {
    type: 'number',
    label: 'ตัวเลข',
    icon: Hash,
    description: 'กรอกเฉพาะตัวเลข เช่น จำนวนชั่วโมง จำนวนนักเรียน',
  },
  {
    type: 'date',
    label: 'วันที่',
    icon: Calendar,
    description: 'เลือกวันเดือนปีจากปฏิทิน',
  },
];

export const DynamicFormBuilder: React.FC<DynamicFormBuilderProps> = ({
  fields,
  onChange,
  availableTemplates = [],
  currentTeacher,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [newOptionTexts, setNewOptionTexts] = useState<Record<string, string>>({});

  // Helper to add a new blank field or with preset
  const handleAddField = (
    type: DynamicFieldType = 'text',
    preset?: Partial<DynamicFormField>
  ) => {
    const newField: DynamicFormField = {
      id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      label:
        preset?.label ||
        (type === 'user_profile'
          ? 'ครูผู้สอน'
          : type === 'file'
          ? 'ลิงก์ไฟล์เอกสาร / PDF (Google Drive)'
          : `ช่องข้อมูลที่ ${fields.length + 1}`),
      description: preset?.description || '',
      placeholder:
        preset?.placeholder ||
        (type === 'file' ? 'https://drive.google.com/file/d/... หรือลิงก์ตรง .pdf' : ''),
      required: preset?.required ?? true,
      order: fields.length + 1,
      options:
        preset?.options ||
        (type === 'select' || type === 'radio' || type === 'checkbox'
          ? ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2', 'ตัวเลือกที่ 3']
          : undefined),
      profile_key: preset?.profile_key || (type === 'user_profile' ? 'name' : undefined),
      file_config:
        type === 'file'
          ? {
              max_files: 1,
              allowed_types: ['.pdf'],
              max_size_mb: 25,
              submission_mode: 'link_only',
              require_link_only: true,
              allow_link: true,
              ...(preset?.file_config || {}),
            }
          : undefined,
      ...preset,
    };
    onChange([...fields, newField]);
  };

  // Update a single field
  const handleUpdateField = (id: string, updates: Partial<DynamicFormField>) => {
    onChange(
      fields.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };

        // Auto-initialize options if changed to choice type
        if (
          (updated.type === 'select' || updated.type === 'radio' || updated.type === 'checkbox') &&
          (!updated.options || updated.options.length === 0)
        ) {
          updated.options = ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2'];
        }

        // Auto-initialize profile_key if changed to user_profile
        if (updated.type === 'user_profile' && !updated.profile_key) {
          updated.profile_key = 'name';
          updated.label = updated.label.startsWith('ช่องข้อมูล') ? 'ครูผู้สอน' : updated.label;
        }

        // Auto-initialize file_config if changed to file
        if (updated.type === 'file' && !updated.file_config) {
          updated.label = updated.label.startsWith('ช่องข้อมูล') ? 'ลิงก์ไฟล์เอกสาร / PDF (Google Drive)' : updated.label;
          updated.placeholder = updated.placeholder || 'https://drive.google.com/file/d/... หรือลิงก์ตรง .pdf';
          updated.file_config = {
            max_files: 1,
            allowed_types: ['.pdf'],
            max_size_mb: 25,
            submission_mode: 'link_only',
            require_link_only: true,
            allow_link: true,
          };
        }

        return updated;
      })
    );
  };

  // Remove field
  const handleDeleteField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  // Move field order up or down
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    // re-assign orders
    const reordered = newFields.map((f, i) => ({ ...f, order: i + 1 }));
    onChange(reordered);
  };

  // Duplicate a field
  const handleDuplicateField = (field: DynamicFormField) => {
    const copy: DynamicFormField = {
      ...JSON.parse(JSON.stringify(field)),
      id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${field.label} (สำเนา)`,
      order: fields.length + 1,
    };
    onChange([...fields, copy]);
  };

  // Add an option to select / radio / checkbox
  const handleAddOption = (fieldId: string) => {
    const text = (newOptionTexts[fieldId] || '').trim();
    if (!text) return;
    const target = fields.find((f) => f.id === fieldId);
    if (!target) return;
    const currentOptions = target.options || [];
    handleUpdateField(fieldId, { options: [...currentOptions, text] });
    setNewOptionTexts({ ...newOptionTexts, [fieldId]: '' });
  };

  // Remove an option
  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const target = fields.find((f) => f.id === fieldId);
    if (!target || !target.options) return;
    const filtered = target.options.filter((_, i) => i !== optIndex);
    handleUpdateField(fieldId, { options: filtered });
  };

  // Load preset: Classroom research (วิจัยในชั้นเรียน 9 ช่อง)
  const handleLoadResearchPreset = () => {
    const preset: DynamicFormField[] = [
      {
        id: 'fld_teacher_name',
        type: 'user_profile',
        label: 'ครูผู้สอน',
        description: 'ดึงชื่อและนามสกุลจากบัญชีผู้ใช้โดยอัตโนมัติ (อ่านอย่างเดียว)',
        required: true,
        profile_key: 'name',
        order: 1,
      },
      {
        id: 'fld_learning_area',
        type: 'user_profile',
        label: 'กลุ่มสาระการเรียนรู้',
        description: 'ดึงจากข้อมูลครูเดิมเมื่อมี (อ่านอย่างเดียว)',
        required: true,
        profile_key: 'learning_area',
        order: 2,
      },
      {
        id: 'fld_research_format',
        type: 'select',
        label: 'รูปแบบรายงานวิจัย',
        description: 'เลือกรูปแบบการจัดทำรายงานวิจัยในชั้นเรียน',
        required: true,
        options: [
          'วิจัยในชั้นเรียนแบบหน้าเดียว',
          'วิจัยในชั้นเรียนแบบกึ่งทางการ',
          'วิจัยในชั้นเรียนแบบ 5 บท',
        ],
        order: 3,
      },
      {
        id: 'fld_subject',
        type: 'text',
        label: 'รายวิชา',
        placeholder: 'เช่น ว31101 ฟิสิกส์ 1 หรือ ค22101 คณิตศาสตร์พื้นฐาน',
        required: true,
        order: 4,
      },
      {
        id: 'fld_content_topic',
        type: 'text',
        label: 'เนื้อหา / เรื่อง',
        placeholder: 'เช่น การเคลื่อนที่ในหนึ่งมิติ หรือ วงจรไฟฟ้า',
        required: true,
        order: 5,
      },
      {
        id: 'fld_target_students',
        type: 'text',
        label: 'นักเรียนกลุ่มเป้าหมาย',
        placeholder: 'เช่น นักเรียนชั้น ม.4/1 จำนวน 30 คน',
        required: true,
        order: 6,
      },
      {
        id: 'fld_research_issue',
        type: 'textarea',
        label: 'ประเด็นการวิจัย',
        description: 'ระบุว่าต้องการแก้ปัญหา ส่งเสริม หรือพัฒนาอะไร ในการจัดการเรียนรู้',
        placeholder: 'อธิบายปัญหาที่พบในชั้นเรียน หรือจุดที่ต้องการส่งเสริมพัฒนาการเรียนรู้...',
        required: true,
        order: 7,
      },
      {
        id: 'fld_methodology',
        type: 'textarea',
        label: 'วิธีการดำเนินงาน',
        description: 'ระบุว่าจะใช้วิธีใดในการแก้ปัญหา ส่งเสริม หรือพัฒนา (เช่น นวัตกรรม เทคนิคการสอน สื่อ)',
        placeholder: 'อธิบายกระบวนการ ขั้นตอน นวัตกรรม หรือเทคนิคการสอนที่จะนำมาใช้...',
        required: true,
        order: 8,
      },
      {
        id: 'fld_attachment',
        type: 'file',
        label: 'ไฟล์เอกสาร',
        description: 'อัปโหลดไฟล์เอกสารโครงร่างวิจัย (PDF, Word DOCX หรือ DOC ขนาดไม่เกิน 25MB)',
        required: true,
        file_config: {
          max_files: 1,
          allowed_types: ['.pdf', '.docx', '.doc'],
          max_size_mb: 25,
        },
        order: 9,
      },
    ];
    onChange(preset);
  };

  // Copy from another assignment
  const handleCopyFromTemplate = (templateId: string) => {
    const found = availableTemplates.find((t) => t.id === templateId);
    if (found && found.fields && found.fields.length > 0) {
      const cloned = JSON.parse(JSON.stringify(found.fields)).map((f: DynamicFormField, i: number) => ({
        ...f,
        id: `fld_${Date.now()}_${i}`,
      }));
      onChange(cloned);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Top Header of Builder */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>กำหนดข้อมูลที่ต้องการให้ผู้ส่งกรอก</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                {fields.length} ช่องข้อมูล
              </span>
            </h4>
            <p className="text-[11px] text-indigo-200">
              กำหนดช่องข้อมูลที่ครูต้องกรอกสำหรับงานนี้ โดยแต่ละงานสามารถมีช่องกรอกแตกต่างกันได้
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleLoadResearchPreset}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
            title="โหลดตัวอย่าง: วิจัยในชั้นเรียน (9 ช่อง)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">โหลดชุดวิจัย 9 ช่อง</span>
            <span className="sm:hidden">ชุดวิจัย</span>
          </button>

          {availableTemplates.some((t) => t.fields && t.fields.length > 0) && (
            <select
              onChange={(e) => {
                if (e.target.value) handleCopyFromTemplate(e.target.value);
                e.target.value = '';
              }}
              defaultValue=""
              className="px-2.5 py-1.5 rounded-xl bg-white/15 text-white text-xs font-semibold border border-white/25 cursor-pointer max-w-[150px] truncate"
            >
              <option value="" disabled className="text-slate-900">
                คัดลอกจากงานอื่น...
              </option>
              {availableTemplates
                .filter((t) => t.fields && t.fields.length > 0)
                .map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-900">
                    {t.name} ({t.fields?.length} ช่อง)
                  </option>
                ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>ดูตัวอย่างฟอร์มจริง</span>
          </button>
        </div>
      </div>

      {/* Fields List */}
      <div className="space-y-3">
        {fields.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700">ยังไม่ได้กำหนดช่องกรอกข้อมูลสำหรับงานนี้</p>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกปุ่มด้านล่างเพื่อเพิ่มช่องข้อมูล หรือคลิก &ldquo;โหลดชุดวิจัย 9 ช่อง&rdquo; ด้านบน
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleAddField('text')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มช่องแรก</span>
              </button>
              <button
                type="button"
                onClick={handleLoadResearchPreset}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>ใช้ฟอร์มวิจัย 9 ช่องตามโจทย์</span>
              </button>
            </div>
          </div>
        ) : (
          fields.map((field, index) => {
            const typeConfig = FIELD_TYPE_OPTIONS.find((t) => t.type === field.type) || FIELD_TYPE_OPTIONS[0];
            const Icon = typeConfig.icon;

            return (
              <div
                key={field.id}
                className="bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-300 p-4 shadow-2xs space-y-3 transition-colors relative"
              >
                {/* Header row of field card */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {field.label || `ช่องที่ ${index + 1}`}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      <Icon className="w-3 h-3 text-indigo-600" />
                      <span>{typeConfig.label}</span>
                    </span>
                    {field.required && (
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        บังคับ
                      </span>
                    )}
                  </div>

                  {/* Field Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveField(index, 'up')}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => handleMoveField(index, 'down')}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateField(field)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="คัดลอกช่องนี้"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(field.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบช่องนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Field Configuration Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  {/* Field Label */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ชื่อช่องกรอกข้อมูล <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      placeholder="เช่น รายวิชา, ประเด็นการวิจัย, วิธีดำเนินงาน"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Field Type Selector */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ประเภทข้อมูล
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(field.id, { type: e.target.value as DynamicFieldType })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.type} value={opt.type}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Required Checkbox */}
                  <div className="sm:col-span-3 flex items-center sm:justify-center pt-2 sm:pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>จำเป็นต้องกรอก</span>
                    </label>
                  </div>

                  {/* Field Description / Instruction */}
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      คำอธิบาย / ชี้แจงสำหรับผู้ส่ง (ไม่บังคับ)
                    </label>
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) => handleUpdateField(field.id, { description: e.target.value })}
                      placeholder="เช่น ระบุว่าต้องการแก้ปัญหา ส่งเสริม หรือพัฒนาอะไร"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-600"
                    />
                  </div>

                  {/* Placeholder (for text, textarea, number) */}
                  {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        ข้อความตัวอย่างจางๆ (Placeholder)
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                        placeholder="เช่น เช่น ว31101 ฟิสิกส์ 1..."
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-600"
                      />
                    </div>
                  )}

                  {/* User Profile Key Selector (for user_profile) */}
                  {field.type === 'user_profile' && (
                    <div className="sm:col-span-5 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200">
                      <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                        ดึงข้อมูลส่วนตัวของครูอัตโนมัติ:
                      </label>
                      <select
                        value={field.profile_key || 'name'}
                        onChange={(e) => handleUpdateField(field.id, { profile_key: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg text-xs bg-white font-bold text-indigo-900"
                      >
                        <option value="name">ชื่อ - นามสกุลครูผู้สอน (Name)</option>
                        <option value="learning_area">กลุ่มสาระการเรียนรู้ (Learning Area)</option>
                        <option value="teacher_id">รหัสประจำตัวครู (Teacher ID)</option>
                        <option value="position">ตำแหน่ง (Position)</option>
                        <option value="email">อีเมล (Email)</option>
                      </select>
                      <span className="text-[10px] text-indigo-700 block mt-1">
                        * ระบบจะดึงจากบัญชีครูที่เข้าสู่ระบบและล็อคเป็นแบบอ่านอย่างเดียว ป้องกันการแก้ไข
                      </span>
                    </div>
                  )}

                  {/* Choice Options Config (for select, radio, checkbox) */}
                  {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                    <div className="sm:col-span-12 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-800">
                        รายการตัวเลือก ({field.options?.length || 0} ตัวเลือก):
                      </label>

                      <div className="flex flex-wrap gap-1.5">
                        {(field.options || []).map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium shadow-2xs"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(field.id, optIdx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="ลบตัวเลือกนี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1 max-w-md">
                        <input
                          type="text"
                          value={newOptionTexts[field.id] || ''}
                          onChange={(e) =>
                            setNewOptionTexts({ ...newOptionTexts, [field.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOption(field.id);
                            }
                          }}
                          placeholder="พิมพ์ชื่อตัวเลือกแล้วกดเพิ่ม..."
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddOption(field.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          + เพิ่มตัวเลือก
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File Upload Config (for file) */}
                  {field.type === 'file' && (
                    <div className="sm:col-span-12 bg-amber-50/70 p-4 rounded-2xl border-2 border-amber-200/90 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-amber-700" />
                          <span>เงื่อนไขและรูปแบบการส่งเอกสาร (Submission Mode)</span>
                          <span className="text-rose-500">*</span>
                        </span>
                        <span className="text-[11px] font-semibold text-amber-800">
                          {field.file_config?.submission_mode === 'link_only' || field.file_config?.require_link_only
                            ? '🔗 บังคับส่งเฉพาะลิงก์ PDF'
                            : field.file_config?.submission_mode === 'file_only'
                            ? '📁 อัปโหลดไฟล์ตรงเท่านั้น'
                            : '📁+🔗 เลือกได้ทั้งสองแบบ'}
                        </span>
                      </div>

                      {/* 3-Mode Selection Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Option 1: Link Only (บังคับส่งแค่ลิงก์) */}
                        <label
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            field.file_config?.submission_mode === 'link_only' || !!field.file_config?.require_link_only
                              ? 'border-rose-500 bg-rose-50/90 text-rose-950 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="radio"
                              name={`submission_mode_${field.id}`}
                              value="link_only"
                              checked={field.file_config?.submission_mode === 'link_only' || !!field.file_config?.require_link_only}
                              onChange={() => {
                                handleUpdateField(field.id, {
                                  placeholder: field.placeholder || 'https://drive.google.com/file/d/... หรือ ลิงก์ตรง .pdf',
                                  file_config: {
                                    ...field.file_config,
                                    submission_mode: 'link_only',
                                    require_link_only: true,
                                  },
                                });
                              }}
                              className="mt-0.5 text-rose-600 focus:ring-rose-500"
                            />
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1 text-rose-900">
                                <LinkIcon className="w-3.5 h-3.5 text-rose-600" />
                                <span>บังคับส่งแค่ลิงก์ PDF</span>
                              </div>
                              <p className="text-[11px] text-rose-800/90 mt-1 leading-relaxed">
                                บังคับให้วางเฉพาะลิงก์ PDF / Google Drive เท่านั้น (ซ่อนปุ่มอัปโหลดไฟล์ตรง)
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded mt-2 self-start">
                            🔗 บังคับลิงก์เท่านั้น
                          </span>
                        </label>

                        {/* Option 2: Both (ยืดหยุ่น ทั้งสองแบบ) */}
                        <label
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            (!field.file_config?.submission_mode || field.file_config?.submission_mode === 'both') && !field.file_config?.require_link_only
                              ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="radio"
                              name={`submission_mode_${field.id}`}
                              value="both"
                              checked={(!field.file_config?.submission_mode || field.file_config?.submission_mode === 'both') && !field.file_config?.require_link_only}
                              onChange={() => {
                                handleUpdateField(field.id, {
                                  file_config: {
                                    ...field.file_config,
                                    submission_mode: 'both',
                                    require_link_only: false,
                                  },
                                });
                              }}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1 text-emerald-900">
                                <span>📁+🔗 ทั้งสองแบบ (ยืดหยุ่น)</span>
                              </div>
                              <p className="text-[11px] text-emerald-800/90 mt-1 leading-relaxed">
                                ครูเลือกได้ว่าจะอัปโหลดไฟล์จากเครื่อง หรือจะวางลิงก์ Google Drive
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded mt-2 self-start">
                            แนะนำสำหรับงานทั่วไป
                          </span>
                        </label>

                        {/* Option 3: File Only (อัปโหลดไฟล์จากเครื่องเท่านั้น) */}
                        <label
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            field.file_config?.submission_mode === 'file_only'
                              ? 'border-indigo-500 bg-indigo-50/90 text-indigo-950 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="radio"
                              name={`submission_mode_${field.id}`}
                              value="file_only"
                              checked={field.file_config?.submission_mode === 'file_only'}
                              onChange={() => {
                                handleUpdateField(field.id, {
                                  file_config: {
                                    ...field.file_config,
                                    submission_mode: 'file_only',
                                    require_link_only: false,
                                  },
                                });
                              }}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1 text-indigo-900">
                                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                <span>ไฟล์จากเครื่องเท่านั้น</span>
                              </div>
                              <p className="text-[11px] text-indigo-800/90 mt-1 leading-relaxed">
                                ผู้ส่งต้องเลือกไฟล์อัปโหลดตรงจากอุปกรณ์เท่านั้น (ปิดช่องใส่ลิงก์)
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded mt-2 self-start">
                            📁 ไฟล์ตรงเท่านั้น
                          </span>
                        </label>
                      </div>

                      {/* File Upload Settings (for Both & File Only modes) */}
                      {field.file_config?.submission_mode !== 'link_only' && !field.file_config?.require_link_only ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-amber-200/60">
                          <div>
                            <label className="block text-[11px] font-bold text-amber-950 mb-1">
                              ประเภทไฟล์ที่อนุญาต
                            </label>
                            <input
                              type="text"
                              value={(field.file_config?.allowed_types || []).join(', ')}
                              onChange={(e) => {
                                const types = e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                handleUpdateField(field.id, {
                                  file_config: { ...field.file_config, allowed_types: types },
                                });
                              }}
                              placeholder=".pdf, .docx, .doc, .png"
                              className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-amber-950 mb-1">
                              ขนาดไฟล์สูงสุด (MB)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={field.file_config?.max_size_mb || 25}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  file_config: { ...field.file_config, max_size_mb: Number(e.target.value) || 25 },
                                })
                              }
                              className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-amber-950 mb-1">
                              จำนวนไฟล์สูงสุด
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={field.file_config?.max_files || 1}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  file_config: { ...field.file_config, max_files: Number(e.target.value) || 1 },
                                })
                              }
                              className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white font-mono"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                          <LinkIcon className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                          <div className="leading-relaxed">
                            <strong>โหมดบังคับส่งเฉพาะลิงก์:</strong> ในหน้าส่งงาน ครูจะเห็นเฉพาะช่องกรอกลิงก์ไฟล์ PDF (เช่น ลิงก์ Google Drive หรือ direct URL .pdf) พร้อมปุ่มทดสอบเปิดลิงก์ เพื่อยืนยันว่าเปิดดูไฟล์ได้จริงก่อนส่ง
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Field Button Bar */}
      <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-indigo-600" />
          <span>เพิ่มช่องกรอกข้อมูลประเภท:</span>
        </span>

        <div className="flex flex-wrap gap-1.5">
          {FIELD_TYPE_OPTIONS.slice(0, 7).map((t) => {
            const Icon = t.icon;
            return (
              <button
                type="button"
                key={t.type}
                onClick={() => handleAddField(t.type)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ {t.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LIVE PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">ตัวอย่างแบบฟอร์มเสมือนจริงที่ครูจะเห็น</h3>
                  <p className="text-[11px] text-blue-200">จำลองการกรอกข้อมูลและตรวจสอบความถูกต้อง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 touch-scroll flex-1">
              {fields.map((f, idx) => (
                <div key={f.id} className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {idx + 1}. {f.label} {f.required && <span className="text-rose-500">*</span>}
                  </label>
                  {f.description && <p className="text-[11px] text-slate-500">{f.description}</p>}

                  {f.type === 'user_profile' && (
                    <div className="px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>
                        {f.profile_key === 'learning_area'
                          ? currentTeacher?.Learning_Area || 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี'
                          : currentTeacher?.Name || 'นายทดสอบ ครูผู้สอน'}
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                        อัตโนมัติ (อ่านอย่างเดียว)
                      </span>
                    </div>
                  )}

                  {f.type === 'text' && (
                    <input
                      type="text"
                      placeholder={f.placeholder || `กรอก${f.label}`}
                      value={previewValues[f.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                    />
                  )}

                  {f.type === 'textarea' && (
                    <textarea
                      rows={3}
                      placeholder={f.placeholder || `กรอก${f.label}...`}
                      value={previewValues[f.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                    />
                  )}

                  {f.type === 'number' && (
                    <input
                      type="number"
                      placeholder={f.placeholder || '0'}
                      value={previewValues[f.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                    />
                  )}

                  {f.type === 'date' && (
                    <input
                      type="date"
                      value={previewValues[f.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                    />
                  )}

                  {f.type === 'select' && (
                    <select
                      value={previewValues[f.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
                    >
                      <option value="">-- โปรดเลือก --</option>
                      {(f.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {f.type === 'radio' && (
                    <div className="space-y-1.5 pt-1">
                      {(f.options || []).map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                          <input
                            type="radio"
                            name={`prev_${f.id}`}
                            value={opt}
                            checked={previewValues[f.id] === opt}
                            onChange={() => setPreviewValues({ ...previewValues, [f.id]: opt })}
                            className="text-indigo-600"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {f.type === 'checkbox' && (
                    <div className="space-y-1.5 pt-1">
                      {(f.options || []).map((opt) => {
                        const currentArr: string[] = Array.isArray(previewValues[f.id])
                          ? previewValues[f.id]
                          : [];
                        const isChecked = currentArr.includes(opt);
                        return (
                          <label
                            key={opt}
                            className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = isChecked
                                  ? currentArr.filter((x) => x !== opt)
                                  : [...currentArr, opt];
                                setPreviewValues({ ...previewValues, [f.id]: next });
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {f.type === 'file' && (
                    <div className="space-y-2">
                      {f.file_config?.submission_mode === 'link_only' || f.file_config?.require_link_only ? (
                        /* Preview: Link Only Mode */
                        <div className="space-y-2 p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-rose-900 flex items-center gap-1.5">
                              <LinkIcon className="w-3.5 h-3.5 text-rose-600" />
                              <span>วางลิงก์ไฟล์ PDF / Google Drive</span>
                            </span>
                            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                              🔗 บังคับเฉพาะลิงก์ PDF
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder={f.placeholder || 'https://drive.google.com/file/d/... หรือ ลิงก์ตรง .pdf'}
                              value={previewValues[f.id] || ''}
                              onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                              className="flex-1 px-3 py-1.5 border border-rose-300 rounded-xl text-xs bg-white font-mono focus:ring-1 focus:ring-rose-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (previewValues[f.id]) {
                                  let url = String(previewValues[f.id]).trim();
                                  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-white text-rose-700 border border-rose-300 rounded-xl text-xs font-semibold hover:bg-rose-50 cursor-pointer"
                            >
                              ทดสอบเปิด
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            * ครูผู้ส่งจะต้องวางลิงก์เท่านั้น ไม่มีปุ่มอัปโหลดไฟล์ตรงจากเครื่อง
                          </span>
                        </div>
                      ) : f.file_config?.submission_mode === 'file_only' ? (
                        /* Preview: File Only Mode */
                        <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-3.5 text-center space-y-1">
                          <Upload className="w-5 h-5 text-indigo-500 mx-auto" />
                          <p className="text-xs font-bold text-indigo-900">อัปโหลดไฟล์เอกสารจากเครื่องเท่านั้น</p>
                          <p className="text-[10px] text-slate-500">
                            นามสกุลที่อนุญาต: {(f.file_config?.allowed_types || []).join(', ') || 'PDF, DOCX'} · สูงสุด{' '}
                            {f.file_config?.max_size_mb || 25} MB
                          </p>
                        </div>
                      ) : (
                        /* Preview: Both Allowed Mode */
                        <div className="space-y-2">
                          <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-3 text-center space-y-1">
                            <Upload className="w-4 h-4 text-indigo-500 mx-auto" />
                            <p className="text-xs font-bold text-indigo-900">อัปโหลดไฟล์เอกสารจากเครื่อง</p>
                            <p className="text-[10px] text-slate-500">
                              นามสกุลที่อนุญาต: {(f.file_config?.allowed_types || []).join(', ') || 'PDF, DOCX'} · สูงสุด{' '}
                              {f.file_config?.max_size_mb || 25} MB
                            </p>
                          </div>
                          <div className="text-center text-[10px] font-bold text-slate-400">หรือวางลิงก์ PDF / Drive</div>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="https://drive.google.com/file/d/... หรือ ลิงก์ตรง .pdf"
                              value={previewValues[f.id] || ''}
                              onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (previewValues[f.id]) {
                                  let url = String(previewValues[f.id]).trim();
                                  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              ทดสอบเปิด
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 cursor-pointer"
              >
                ปิดตัวอย่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
