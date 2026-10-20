import React, { useState } from 'react';
import { LessonPlan } from '../types';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  plan: LessonPlan | null;
  onClose: () => void;
  onConfirm: (planId: string) => Promise<void>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  plan,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !plan) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(plan.id);
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (!isDeleting && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">ยืนยันการลบแผนการสอน</h3>
              <p className="text-xs text-rose-100">โปรดยืนยันการลบข้อมูลนี้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 leading-relaxed">
              <p className="font-semibold mb-1">คุณแน่ใจหรือไม่ว่าต้องการลบแผนการสอนนี้?</p>
              <p>
                ข้อมูลจะถูกลบออกจากระบบ และจะซิงก์ลบออกจากฐานข้อมูล Supabase SQL (ตาราง <code className="font-mono bg-rose-100 px-1 rounded">lesson_plans</code>) โดยอัตโนมัติทันที
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">รหัสเอกสาร:</span>
              <span className="font-mono font-bold text-slate-800">{plan.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">วิชา:</span>
              <span className="font-medium text-slate-800 text-right">
                {plan.subject_code} - {plan.subject_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ชื่อแผน:</span>
              <span className="font-medium text-slate-800 text-right line-clamp-1 max-w-[200px]">
                {plan.plan_title}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ครูผู้สอน:</span>
              <span className="font-medium text-slate-800">{plan.teacher_name}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังลบข้อมูล...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบแผน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
