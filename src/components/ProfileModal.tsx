import React, { useState } from 'react';
import { Teacher } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  User,
  Mail,
  Lock,
  BookOpen,
  Phone,
  CreditCard,
  Briefcase,
  Award,
  Building2,
  Calendar,
  Camera,
  Upload,
  Check,
  FileCheck,
} from 'lucide-react';

interface ProfileModalProps {
  teacher: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Teacher) => Promise<void>;
}

const LEARNING_AREAS = [
  'วิทยาศาสตร์และเทคโนโลยี',
  'คณิตศาสตร์',
  'ภาษาต่างประเทศ',
  'ภาษาไทย',
  'สังคมศึกษา ศาสนา และวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'กิจกรรมพัฒนาผู้เรียน',
];

const DEPARTMENTS = [
  'กลุ่มบริหารวิชาการ',
  'กลุ่มบริหารแผนงานและงบประมาณ',
  'กลุ่มบริหารทั่วไป',
  'กลุ่มบริหารกิจการและหอพัก',
];

const POSITIONS = ['ครู', 'ครูผู้ช่วย', 'รองผู้อำนวยการสถานศึกษา', 'ผู้อำนวยการสถานศึกษา'];

const ACADEMIC_STANDINGS = [
  'ยังไม่มีวิทยฐานะ',
  'ครูชำนาญการ',
  'ครูชำนาญการพิเศษ',
  'ครูเชี่ยวชาญ',
  'รองผู้อำนวยการสถานศึกษาชำนาญการ',
  'รองผู้อำนวยการสถานศึกษาชำนาญการพิเศษ',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  teacher,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Teacher>({ ...teacher });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;
  // Helper to compress image before saving as Data URL (cuts bandwidth/Egress by 99%)
  const compressImage = (file: File, maxWidth: number = 320, quality: number = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('รูปภาพมีขนาดใหญ่เกิน 10MB');
        return;
      }
      try {
        const compressed = await compressImage(file, 160, 0.65);
        setFormData((prev) => ({ ...prev, photo: compressed }));
        setImageError(false);
      } catch {
        setErrorMsg('ไม่สามารถแปลงรูปภาพได้');
      }
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 240, 0.6);
        setFormData((prev) => ({ ...prev, signature_url: compressed }));
      } catch {
        // ignore
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onSave(formData);
      setSuccessMsg('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const previewPhotoUrl = formatGoogleDriveImageUrl(formData.photo);
  const previewSignatureUrl = formatGoogleDriveImageUrl(formData.signature_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 p-4 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-4 ring-white/30 bg-indigo-900/40 flex items-center justify-center shadow-lg">
                {previewPhotoUrl && !imageError ? (
                  <img
                    src={previewPhotoUrl}
                    alt={formData.Name}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-lg sm:text-xl font-bold">
                    {getInitials(formData.Name)}
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-amber-400 hover:bg-amber-300 text-slate-900 p-1.5 rounded-xl cursor-pointer shadow-md transition-transform active:scale-95">
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold">{formData.Name || 'ข้อมูลส่วนตัว'}</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                  รหัส {formData.Teacher_ID}
                </span>
              </div>
              <p className="text-indigo-100 text-xs mt-0.5">
                {formData.position} {formData.academic_standing !== 'ยังไม่มีวิทยฐานะ' ? `(${formData.academic_standing})` : ''} • {formData.Learning_Area}
              </p>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Teacher_ID เป็นคีย์หลักที่ผูกกับแผนการสอนและเอกสารในระบบ
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto touch-scroll p-4 sm:p-6 space-y-4 sm:space-y-5">
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
              {errorMsg}
            </div>
          )}

          {/* Section 1: ข้อมูลหลักที่ต้องใช้ล็อกอิน */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              ข้อมูลบัญชีผู้ใช้และสาระการเรียนรู้
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อ - นามสกุล (Name) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="เช่น นายสมชาย ใจดี"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  E-mail (ใช้ล็อกอินเข้าเว็บ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="example@pcshsksn.ac.th"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  รหัสผ่าน (Pass) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.Pass}
                    onChange={(e) => setFormData({ ...formData, Pass: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 font-mono border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="รหัสผ่านเข้าสู่ระบบ"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  หากรหัสผ่านเป็น 12345 ระบบจะบังคับให้เปลี่ยนรหัส
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  กลุ่มสาระการเรียนรู้ (Learning Area) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={formData.Learning_Area}
                    onChange={(e) => setFormData({ ...formData, Learning_Area: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    {LEARNING_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: รูปภาพและลายเซ็น */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              รูปถ่ายประจำตัว (photo) และลายเซ็น (signature)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  URL รูปถ่ายหน้าตรง หรือ ลิงก์ Google Drive
                </label>
                <input
                  type="text"
                  value={formData.photo || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, photo: e.target.value });
                    setImageError(false);
                  }}
                  placeholder="https://drive.google.com/open?id=..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    อัปโหลดรูปภาพใหม่จากเครื่อง
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ลิงก์รูปลายเซ็น (signature_url)
                </label>
                <input
                  type="text"
                  value={formData.signature_url || ''}
                  onChange={(e) => setFormData({ ...formData, signature_url: e.target.value })}
                  placeholder="https://drive.google.com/open?id=..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    อัปโหลดรูปลายเซ็น
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>
                  {previewSignatureUrl && (
                    <div className="h-8 px-2 bg-slate-50 border border-slate-200 rounded flex items-center">
                      <img
                        src={previewSignatureUrl}
                        alt="Signature preview"
                        className="h-6 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: ข้อมูลตำแหน่งและข้อมูลส่วนตัว */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              ตำแหน่ง กลุ่มงาน และข้อมูลการติดต่อ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ตำแหน่ง
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={formData.position || 'ครู'}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  วิทยฐานะ
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={formData.academic_standing || 'ยังไม่มีวิทยฐานะ'}
                    onChange={(e) => setFormData({ ...formData, academic_standing: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    {ACADEMIC_STANDINGS.map((standing) => (
                      <option key={standing} value={standing}>
                        {standing}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  กลุ่มงาน
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={formData.department || 'กลุ่มบริหารวิชาการ'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เบอร์โทรศัพท์ (กรอกแค่ตัวเลข)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เลขบัตรประจำตัวประชาชน
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.national_id || ''}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    placeholder="13 หลัก"
                    className="w-full pl-9 pr-3 py-2 font-mono border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  วัน เดือน ปีเกิด
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.birth_date || ''}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    placeholder="วัน/เดือน/ปี เช่น 21/07/1981"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="border-t border-slate-100 pt-3 pb-safe flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors text-center cursor-pointer active:scale-98"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
