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
  sampleUrl?: string;
  sampleTitle?: string;
  exampleDocuments?: Array<{ title: string; url: string }>;
  onSampleDocumentsChange?: (sampleData: {
    sample_url?: string;
    sample_title?: string;
    example_documents?: Array<{ title: string; url: string }>;
  }) => void;
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
    type: 'link_reference',
    label: 'ลิงก์เอกสารตัวอย่าง / แบบฟอร์ม',
    icon: ExternalLink,
    description: 'การ์ดปุ่มกดลิงก์ตัวอย่างเอกสาร/ดาวน์โหลดแบบฟอร์ม สำหรับให้ครูเปิดดู',
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
  sampleUrl = '',
  sampleTitle = '',
  exampleDocuments = [],
  onSampleDocumentsChange,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [newOptionTexts, setNewOptionTexts] = useState<Record<string, string>>({});
  const [showGlobalSampleEditor, setShowGlobalSampleEditor] = useState<boolean>(
    Boolean(sampleUrl || (exampleDocuments && exampleDocuments.length > 0))
  );

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
          : type === 'link_reference'
          ? 'ลิงก์เอกสารตัวอย่าง / แบบฟอร์มต้นแบบ'
          : `ช่องข้อมูลที่ ${fields.length + 1}`),
      description:
        preset?.description ||
        (type === 'link_reference'
          ? 'คลิกปุ่มด้านล่างเพื่อเปิดดูเอกสารตัวอย่าง หรือดาวน์โหลดแบบฟอร์มต้นแบบ'
          : ''),
      placeholder:
        preset?.placeholder ||
        (type === 'file'
          ? 'https://drive.google.com/file/d/... หรือลิงก์ตรง .pdf'
          : type === 'link_reference'
          ? 'https://drive.google.com/... หรือ ลิงก์ตรง .pdf'
          : ''),
      required: preset?.required ?? (type === 'link_reference' ? false : true),
      order: fields.length + 1,
      options:
        preset?.options ||
        (type === 'select' || type === 'radio' || type === 'checkbox'
          ? ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2', 'ตัวเลือกที่ 3']
          : undefined),
      profile_key: preset?.profile_key || (type === 'user_profile' ? 'name' : undefined),
      example_title:
        preset?.example_title || (type === 'link_reference' ? 'เปิดดูตัวอย่างเอกสาร' : undefined),
      example_url: preset?.example_url || undefined,
      example_links: preset?.example_links || undefined,
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

      {/* Global Sample / Template Documents for this Assignment (เผื่อครูอยากดูตัวอย่าง) */}
      {onSampleDocumentsChange && (
        <div className="bg-sky-50/80 rounded-2xl border-2 border-sky-200/90 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700">
                <LinkIcon className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <span>แปะลิงก์เอกสารตัวอย่าง & แบบฟอร์มต้นแบบประจำประเภทนี้</span>
                  {(sampleUrl || (exampleDocuments && exampleDocuments.length > 0)) && (
                    <span className="text-[10px] bg-sky-200 text-sky-900 px-2 py-0.2 rounded-full font-bold">
                      มี {(sampleUrl ? 1 : 0) + (exampleDocuments?.length || 0)} ลิงก์
                    </span>
                  )}
                </h5>
                <p className="text-[11px] text-sky-800">
                  แปะลิงก์ Google Docs, PDF, Google Drive หรือเว็บตัวอย่าง เพื่อให้ครูคลิกเปิดดูตัวอย่างก่อนกรอกส่ง
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGlobalSampleEditor(!showGlobalSampleEditor)}
              className="px-3 py-1 bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {showGlobalSampleEditor ? 'ย่อแผงตัวอย่าง' : '+ แปะลิงก์ตัวอย่างเอกสาร'}
            </button>
          </div>

          {showGlobalSampleEditor && (
            <div className="pt-2 space-y-3 border-t border-sky-200/70">
              {/* Primary Sample Link */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-sky-950 mb-1">
                    ชื่อเอกสารตัวอย่างหลัก
                  </label>
                  <input
                    type="text"
                    value={sampleTitle}
                    onChange={(e) =>
                      onSampleDocumentsChange({
                        sample_url: sampleUrl,
                        sample_title: e.target.value,
                        example_documents: exampleDocuments,
                      })
                    }
                    placeholder="เช่น ตัวอย่างแบบฟอร์มวิจัยในชั้นเรียนหน้าเดียว (Google Docs)"
                    className="w-full px-3 py-1.5 border border-sky-300 rounded-xl text-xs bg-white text-slate-800 font-medium"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-sky-950 mb-1">
                    ลิงก์ตัวอย่าง (URL)
                  </label>
                  <input
                    type="url"
                    value={sampleUrl}
                    onChange={(e) =>
                      onSampleDocumentsChange({
                        sample_url: e.target.value,
                        sample_title: sampleTitle,
                        example_documents: exampleDocuments,
                      })
                    }
                    placeholder="https://docs.google.com/... หรือ drive.google.com/..."
                    className="w-full px-3 py-1.5 border border-sky-300 rounded-xl text-xs bg-white font-mono text-slate-800"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    disabled={!sampleUrl}
                    onClick={() => {
                      if (!sampleUrl) return;
                      let url = sampleUrl.trim();
                      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>ทดสอบเปิด</span>
                  </button>
                </div>
              </div>

              {/* Additional Sample Documents list */}
              {exampleDocuments && exampleDocuments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-sky-950 block">
                    เอกสารตัวอย่างเพิ่มเติม ({exampleDocuments.length} รายการ):
                  </span>
                  {exampleDocuments.map((doc, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-sky-200 text-xs">
                      <input
                        type="text"
                        value={doc.title}
                        onChange={(e) => {
                          const updated = [...exampleDocuments];
                          updated[dIdx] = { ...updated[dIdx], title: e.target.value };
                          onSampleDocumentsChange({
                            sample_url: sampleUrl,
                            sample_title: sampleTitle,
                            example_documents: updated,
                          });
                        }}
                        placeholder="ชื่อเอกสารตัวอย่างเพิ่มเติม..."
                        className="w-1/3 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                      />
                      <input
                        type="url"
                        value={doc.url}
                        onChange={(e) => {
                          const updated = [...exampleDocuments];
                          updated[dIdx] = { ...updated[dIdx], url: e.target.value };
                          onSampleDocumentsChange({
                            sample_url: sampleUrl,
                            sample_title: sampleTitle,
                            example_documents: updated,
                          });
                        }}
                        placeholder="URL ตัวอย่าง..."
                        className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          let url = (doc.url || '').trim();
                          if (!url) return;
                          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1 text-sky-600 hover:text-sky-800 cursor-pointer"
                        title="ทดสอบเปิดลิงก์"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = exampleDocuments.filter((_, i) => i !== dIdx);
                          onSampleDocumentsChange({
                            sample_url: sampleUrl,
                            sample_title: sampleTitle,
                            example_documents: updated,
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="ลบลิงก์นี้"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const updated = [...(exampleDocuments || [])];
                  updated.push({
                    title: `เอกสารตัวอย่าง ${updated.length + 2}`,
                    url: '',
                  });
                  onSampleDocumentsChange({
                    sample_url: sampleUrl,
                    sample_title: sampleTitle,
                    example_documents: updated,
                  });
                }}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ เพิ่มลิงก์เอกสารตัวอย่างอีก 1 รายการ</span>
              </button>
            </div>
          )}
        </div>
      )}

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

                  {/* Required Checkbox or Link Reference badge */}
                  <div className="sm:col-span-3 flex items-center sm:justify-center pt-2 sm:pt-4">
                    {field.type === 'link_reference' ? (
                      <span className="text-[11px] font-bold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200">
                        🔗 การ์ดตัวอย่าง (อ่านอย่างเดียว)
                      </span>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>จำเป็นต้องกรอก</span>
                      </label>
                    )}
                  </div>

                  {/* Link Reference explanatory note */}
                  {field.type === 'link_reference' && (
                    <div className="sm:col-span-12 bg-sky-50/90 p-3 rounded-xl border border-sky-300 text-xs text-sky-950 flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                      <div>
                        <strong>การ์ดแสดงลิงก์เอกสารตัวอย่าง:</strong> ในหน้าส่งงาน ช่องนี้จะแสดงเป็นการ์ดสีฟ้าพร้อมปุ่มให้ครูกดคลิกเปิดดูตัวอย่างเอกสาร หรือดาวน์โหลดแบบฟอร์มต้นแบบที่แอดมินแปะไว้ (ไม่ต้องกรอกข้อมูลกลับ)
                      </div>
                    </div>
                  )}

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

                  {/* Sample / Reference Document Links for this Field (เผื่อครูอยากดูตัวอย่าง) */}
                  <div className="sm:col-span-12 bg-sky-50/70 p-3 sm:p-3.5 rounded-2xl border border-sky-200/90 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                        <LinkIcon className="w-4 h-4 text-sky-600" />
                        <span>แปะลิงก์เอกสารตัวอย่าง / ไฟล์ต้นแบบ (เผื่อครูอยากดูตัวอย่างก่อนกรอก)</span>
                      </div>
                      <span className="text-[10px] text-sky-700 font-medium">Google Drive, Docs, PDF, หรือเว็บไซต์</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                      {/* Example Link Title */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                          ชื่อตัวอย่างเอกสาร
                        </label>
                        <input
                          type="text"
                          value={field.example_title || ''}
                          onChange={(e) => handleUpdateField(field.id, { example_title: e.target.value })}
                          placeholder="เช่น ตัวอย่างแบบฟอร์ม (PDF)"
                          className="w-full px-3 py-1.5 border border-sky-300 rounded-xl text-xs bg-white text-slate-800 font-medium placeholder:text-slate-400 focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      {/* Example Link URL */}
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                          ลิงก์ตัวอย่าง (URL)
                        </label>
                        <input
                          type="url"
                          value={field.example_url || ''}
                          onChange={(e) => handleUpdateField(field.id, { example_url: e.target.value })}
                          placeholder="https://drive.google.com/... หรือ ลิงก์ตรง .pdf"
                          className="w-full px-3 py-1.5 border border-sky-300 rounded-xl text-xs bg-white font-mono text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      {/* Test Link Button */}
                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          disabled={!field.example_url}
                          onClick={() => {
                            if (!field.example_url) return;
                            let url = field.example_url.trim();
                            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                          title="ทดสอบเปิดลิงก์ตัวอย่างเอกสารนี้"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>ทดสอบ</span>
                        </button>
                      </div>
                    </div>

                    {/* Additional Example Links (if admin wants to add more than 1 sample document) */}
                    {field.example_links && field.example_links.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-sky-900 block">ลิงก์ตัวอย่างเพิ่มเติม ({field.example_links.length} รายการ):</span>
                        {field.example_links.map((link, lIdx) => (
                          <div key={lIdx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-sky-200">
                            <input
                              type="text"
                              value={link.title}
                              onChange={(e) => {
                                const updated = [...(field.example_links || [])];
                                updated[lIdx] = { ...updated[lIdx], title: e.target.value };
                                handleUpdateField(field.id, { example_links: updated });
                              }}
                              placeholder="ชื่อเอกสารตัวอย่าง..."
                              className="w-1/3 px-2 py-1 text-xs border border-slate-200 rounded-lg"
                            />
                            <input
                              type="url"
                              value={link.url}
                              onChange={(e) => {
                                const updated = [...(field.example_links || [])];
                                updated[lIdx] = { ...updated[lIdx], url: e.target.value };
                                handleUpdateField(field.id, { example_links: updated });
                              }}
                              placeholder="URL ตัวอย่าง..."
                              className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                let url = link.url.trim();
                                if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-1 text-sky-600 hover:text-sky-800"
                              title="ทดสอบเปิด"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (field.example_links || []).filter((_, i) => i !== lIdx);
                                handleUpdateField(field.id, { example_links: updated });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="ลบลิงก์นี้"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const current = field.example_links || [];
                          handleUpdateField(field.id, {
                            example_links: [...current, { title: `เอกสารตัวอย่าง ${current.length + 2}`, url: '' }],
                          });
                        }}
                        className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ เพิ่มลิงก์เอกสารตัวอย่างเพิ่มเติม</span>
                      </button>
                      <span className="text-[10px] text-slate-500">
                        💡 ลิงก์ตัวอย่างจะแสดงเป็นปุ่มให้ครูกดคลิกดูตัวอย่างขณะกรอกข้อมูล
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Field Button Bar */}
      <div className="p-3.5 bg-gradient-to-r from-slate-100 via-indigo-50/40 to-slate-100 rounded-2xl border-2 border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
            <Plus className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-slate-800">เพิ่มช่องกรอกข้อมูลประเภท:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FIELD_TYPE_OPTIONS.map((t) => {
            const Icon = t.icon;
            const isSample = t.type === 'link_reference';
            return (
              <button
                type="button"
                key={t.type}
                onClick={() => handleAddField(t.type)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  isSample
                    ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600 font-bold shadow-sky-600/20'
                    : 'bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-300'
                }`}
                title={t.description}
              >
                <Icon className={`w-3.5 h-3.5 ${isSample ? 'text-white' : 'text-indigo-600'}`} />
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
              {/* Preview Global Sample Documents Banner */}
              {(sampleUrl || (exampleDocuments && exampleDocuments.length > 0)) && (
                <div className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 text-sky-950 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                    <LinkIcon className="w-4 h-4 text-sky-600" />
                    <span>เอกสารตัวอย่าง & แบบฟอร์มต้นแบบสำหรับงานนี้</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sampleUrl && (
                      <a
                        href={/^https?:\/\//i.test(sampleUrl) ? sampleUrl : `https://${sampleUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{sampleTitle || 'เปิดดูตัวอย่างเอกสารหลัก'}</span>
                      </a>
                    )}
                    {(exampleDocuments || [])
                      .filter((d) => d.url)
                      .map((doc, dIdx) => (
                        <a
                          key={dIdx}
                          href={/^https?:\/\//i.test(doc.url) ? doc.url : `https://${doc.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                          <span>{doc.title || `เอกสารตัวอย่าง ${dIdx + 2}`}</span>
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {fields.map((f, idx) => (
                <div key={f.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-slate-800">
                      {idx + 1}. {f.label} {f.required && <span className="text-rose-500">*</span>}
                    </label>
                  </div>
                  {f.description && <p className="text-[11px] text-slate-500">{f.description}</p>}

                  {/* Sample links attached to this field */}
                  {(f.example_url || (f.example_links && f.example_links.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                      <span className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3 text-sky-600" />
                        <span>ตัวอย่าง:</span>
                      </span>
                      {f.example_url && (
                        <a
                          href={/^https?:\/\//i.test(f.example_url) ? f.example_url : `https://${f.example_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-sky-700" />
                          <span>{f.example_title || 'ดูตัวอย่างเอกสาร'}</span>
                        </a>
                      )}
                      {(f.example_links || []).filter((l) => l.url).map((link, lIdx) => (
                        <a
                          key={lIdx}
                          href={/^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-sky-600" />
                          <span>{link.title || `เอกสารตัวอย่าง ${lIdx + 2}`}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Preview: Link Reference Card */}
                  {f.type === 'link_reference' && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border-2 border-sky-200 text-sky-950 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-sky-600 shrink-0" />
                          <span className="text-xs font-bold text-sky-950">{f.label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-sky-800 bg-white/80 px-2 py-0.5 rounded-full border border-sky-200">
                          เอกสารอ้างอิง
                        </span>
                      </div>
                      {f.description && (
                        <p className="text-[11px] text-sky-800 leading-relaxed">{f.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {f.example_url ? (
                          <a
                            href={/^https?:\/\//i.test(f.example_url) ? f.example_url : `https://${f.example_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{f.example_title || 'เปิดดูตัวอย่างเอกสารนี้'}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            (ยังไม่ได้ใส่ลิงก์ตัวอย่างในช่องนี้)
                          </span>
                        )}
                        {(f.example_links || [])
                          .filter((l) => l.url)
                          .map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={/^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-sky-600" />
                              <span>{link.title || `เอกสาร ${lIdx + 2}`}</span>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}

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
