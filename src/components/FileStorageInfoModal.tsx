import React from 'react';
import { LessonPlan } from '../types';
import {
  X,
  HardDrive,
  Cloud,
  Database,
  ExternalLink,
  Download,
  FileText,
  CheckCircle2,
  FolderOpen,
  Info,
  Server,
  ArrowRight,
} from 'lucide-react';

interface FileStorageInfoModalProps {
  plans: LessonPlan[];
  isOpen: boolean;
  onClose: () => void;
  onOpenSupabaseModal?: () => void;
}

export const FileStorageInfoModal: React.FC<FileStorageInfoModalProps> = ({
  plans,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-700 via-indigo-700 to-blue-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-sky-200">
                File Storage Architecture
              </span>
              <h2 className="text-xl font-bold">คลังจัดเก็บไฟล์แผนการสอน</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Explanation Cards: Where are files stored? */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              ส่งแผนแล้วไฟล์ไปเก็บอยู่ที่ไหน?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Box 1 */}
              <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sky-900 text-sm">1. Supabase Storage</h4>
                <p className="text-sky-800 leading-relaxed">
                  จัดเก็บใน <strong>Bucket</strong> ชื่อ <code className="bg-sky-200/70 px-1 py-0.5 rounded font-mono">lesson-plans</code> บนคลาวด์ Supabase ของท่านอย่างปลอดภัย ไฟล์มี URL เข้าถึงได้ตลอดเวลา
                </p>
              </div>

              {/* Box 2 */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-indigo-900 text-sm">2. ฐานข้อมูลตารางแผน</h4>
                <p className="text-indigo-800 leading-relaxed">
                  ในตาราง <code className="bg-indigo-200/70 px-1 py-0.5 rounded font-mono">lesson_plans</code> คอลัมน์ <strong>file_url</strong> จะเก็บลิงก์ชี้ไปยังไฟล์ พร้อมชื่อไฟล์และขนาด
                </p>
              </div>

              {/* Box 3 */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-emerald-900 text-sm">3. Google Drive / ลิงก์</h4>
                <p className="text-emerald-800 leading-relaxed">
                  กรณีครูระบุเป็นลิงก์ Google Drive ไฟล์จะยังคงอยู่ใน Drive ของครู และเปิดดู/ตรวจผ่านลิงก์ได้โดยตรง
                </p>
              </div>
            </div>
          </div>



          {/* List of Files uploaded currently */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <span>รายการไฟล์ในระบบขณะนี้ ({plans.length} ไฟล์)</span>
              </h3>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">
                        {p.file_name || `${p.subject_code}_แผนการสอน.pdf`}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        วิชา {p.subject_code} • ครูผู้สอน: {p.teacher_name} ({p.teacher_id}) • ขนาด {p.file_size || '2.4 MB'}
                      </div>
                    </div>
                  </div>

                  <a
                    href={p.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg font-medium transition-colors shrink-0"
                  >
                    <span>เปิดดูไฟล์</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
