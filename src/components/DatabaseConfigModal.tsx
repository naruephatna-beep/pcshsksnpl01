import React, { useState } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Server,
  Key,
  ShieldCheck,
  AlertCircle,
  Upload,
  Cloud,
  FileCode2,
  Download,
  Terminal,
  Zap,
  ArrowRight,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Teacher, LessonPlan } from '../types';
import {
  getLocalTeachers,
  getLocalPlans,
} from '../services/supabaseClient';
import {
  getDatabaseProvider,
  getSavedCloudflareConfig,
  saveCloudflareConfig,
  testCloudflareConnection,
  migrateAllDataToCloudflare,
  generateCloudflareD1SqlScript,
  generateCloudflareWorkerScript,
  generateWranglerToml,
} from '../services/cloudflareClient';
import { getSavedDeadlineConfigs, getSavedStatusConfigs, getSavedSubmissions } from '../utils/deadlineUtils';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  teachers?: Teacher[];
  plans?: LessonPlan[];
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  teachers = [],
  plans = [],
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'd1_sql' | 'worker_code' | 'guide' | 'export'>('config');

  // Cloudflare States
  const cfConfig = getSavedCloudflareConfig();
  const [cfWorkerUrl, setCfWorkerUrl] = useState(cfConfig.workerUrl);
  const [cfApiKey, setCfApiKey] = useState(cfConfig.apiKey || '');
  const [cfTestStatus, setCfTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [cfTestMessage, setCfTestMessage] = useState('');
  const [isMigratingToCf, setIsMigratingToCf] = useState(false);
  const [cfMigrateMessage, setCfMigrateMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [copiedCfSql, setCopiedCfSql] = useState(false);
  const [copiedCfWorker, setCopiedCfWorker] = useState(false);
  const [copiedWrangler, setCopiedWrangler] = useState(false);

  if (!isOpen) return null;

  const effectiveTeachers = teachers.length > 0 ? teachers : getLocalTeachers();
  const effectivePlans = plans.length > 0 ? plans : getLocalPlans();
  const deadlineConfigs = getSavedDeadlineConfigs();
  const statusConfigs = getSavedStatusConfigs();
  const submissions = getSavedSubmissions();

  // Handlers
  const handleSaveCloudflare = () => {
    saveCloudflareConfig({
      workerUrl: cfWorkerUrl.trim(),
      apiKey: cfApiKey.trim(),
    });
    onConfigSaved();
    setCfTestStatus('success');
    setCfTestMessage('บันทึกการตั้งค่า Cloudflare D1 เรียบร้อยแล้ว (เปิดใช้งานฐานข้อมูลหลัก)');
  };

  const handleTestCloudflare = async () => {
    if (!cfWorkerUrl.trim()) {
      setCfTestStatus('error');
      setCfTestMessage('กรุณากรอก Cloudflare Worker URL ก่อนทดสอบ');
      return;
    }

    setCfTestStatus('testing');
    setCfTestMessage('กำลังทดสอบการเชื่อมต่อไปยัง Cloudflare Worker & D1...');
    saveCloudflareConfig({
      workerUrl: cfWorkerUrl.trim(),
      apiKey: cfApiKey.trim(),
    });

    const res = await testCloudflareConnection();
    if (res.success) {
      setCfTestStatus('success');
      setCfTestMessage(res.message);
    } else {
      setCfTestStatus('error');
      setCfTestMessage(res.message);
    }
  };

  const handleMigrateToCloudflare = async () => {
    if (!cfWorkerUrl.trim()) {
      setCfMigrateMessage({
        type: 'error',
        text: 'กรุณากรอก Cloudflare Worker URL และทดสอบการเชื่อมต่อให้สำเร็จก่อนทำการย้ายข้อมูล',
      });
      return;
    }

    setIsMigratingToCf(true);
    setCfMigrateMessage(null);
    saveCloudflareConfig({
      workerUrl: cfWorkerUrl.trim(),
      apiKey: cfApiKey.trim(),
    });

    const res = await migrateAllDataToCloudflare(
      effectiveTeachers,
      effectivePlans,
      submissions,
      deadlineConfigs,
      statusConfigs
    );

    if (res.success) {
      setCfMigrateMessage({
        type: 'success',
        text: res.message,
      });
      onConfigSaved();
    } else {
      setCfMigrateMessage({
        type: 'error',
        text: res.message,
      });
    }
    setIsMigratingToCf(false);
  };

  const handleCopyCfSql = () => {
    const sql = generateCloudflareD1SqlScript(effectiveTeachers, effectivePlans, deadlineConfigs);
    navigator.clipboard.writeText(sql);
    setCopiedCfSql(true);
    setTimeout(() => setCopiedCfSql(false), 2000);
  };

  const handleDownloadCfSql = () => {
    const sql = generateCloudflareD1SqlScript(effectiveTeachers, effectivePlans, deadlineConfigs);
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-cloudflare-d1-export-${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCfWorker = () => {
    const code = generateCloudflareWorkerScript();
    navigator.clipboard.writeText(code);
    setCopiedCfWorker(true);
    setTimeout(() => setCopiedCfWorker(false), 2000);
  };

  const handleCopyWrangler = () => {
    const toml = generateWranglerToml();
    navigator.clipboard.writeText(toml);
    setCopiedWrangler(true);
    setTimeout(() => setCopiedWrangler(false), 2000);
  };

  const handleExportFullJson = () => {
    const fullBackup = {
      system: 'PCSHS Kalasin Lesson Plan Submission System',
      version: '2.5.0',
      database_type: 'Cloudflare D1',
      exported_at: new Date().toISOString(),
      teachers: effectiveTeachers,
      lesson_plans: effectivePlans,
      assignment_submissions: submissions,
      deadline_configs: deadlineConfigs,
      status_configs: statusConfigs,
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pcshsksn-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-slate-900 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shadow-inner">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-amber-200">
                    Database Manager
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                    ☁️ Cloudflare D1 (Serverless)
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  จัดการฐานข้อมูล Cloudflare D1 & Worker
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-5 bg-black/25 p-1 rounded-2xl text-xs font-semibold overflow-x-auto touch-scroll">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'config'
                  ? 'bg-white text-orange-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Server className="w-4 h-4 text-orange-500" />
              <span>1. เชื่อมต่อ & ย้ายข้อมูล</span>
            </button>

            <button
              onClick={() => setActiveTab('d1_sql')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'd1_sql'
                  ? 'bg-white text-orange-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Database className="w-4 h-4 text-orange-500" />
              <span>2. โครงสร้าง D1 (SQL)</span>
            </button>

            <button
              onClick={() => setActiveTab('worker_code')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'worker_code'
                  ? 'bg-white text-orange-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileCode2 className="w-4 h-4 text-orange-500" />
              <span>3. โค้ด Worker</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-white text-orange-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Info className="w-4 h-4 text-orange-500" />
              <span>คู่มือ 3 ขั้นตอน</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'export'
                  ? 'bg-white text-orange-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Download className="w-4 h-4 text-orange-500" />
              <span>สำรองข้อมูล JSON</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 touch-scroll text-slate-800">
          {/* TAB 1: CONNECTION & MIGRATION */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Cloudflare Overview Banner */}
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-orange-950">
                      Cloudflare D1 (Serverless Edge SQL)
                    </strong>
                    <span className="bg-orange-200/80 text-orange-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                      Zero-Egress Free
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    ระบบผูกกับฐานข้อมูล Cloudflare D1 เป็นหลัก ฟรีพื้นที่ 5GB อ่านข้อมูลได้ 5 ล้านครั้ง/วัน รองรับการใช้งานของโรงเรียนอย่างเสถียร รวดเร็ว และไม่มีค่าธรรมเนียมแบนด์วิดท์
                  </p>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-orange-600" />
                      Cloudflare Worker API URL (ผูกกับ D1)
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal lowercase font-sans">
                      (เช่น https://pcshs-d1.xxx.workers.dev)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={cfWorkerUrl}
                    onChange={(e) => setCfWorkerUrl(e.target.value)}
                    placeholder="https://pcshs-d1.your-account.workers.dev"
                    className="w-full px-3.5 py-2.5 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    URL ของ Cloudflare Worker ที่ท่านนำโค้ดจากแท็บ <strong>"3. โค้ด Worker"</strong> ไป Deploy ไว้
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-orange-600" />
                    API Token / Secret Key (ไม่บังคับ - ปล่อยว่างได้ถ้าไม่ได้ตั้งค่า env.API_KEY)
                  </label>
                  <input
                    type="password"
                    value={cfApiKey}
                    onChange={(e) => setCfApiKey(e.target.value)}
                    placeholder="Optional Secret Token"
                    className="w-full px-3.5 py-2.5 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  />
                </div>

                {/* Test status banner */}
                {cfTestMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      cfTestStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : cfTestStatus === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {cfTestStatus === 'testing' && (
                      <RefreshCw className="w-4 h-4 animate-spin text-orange-600 shrink-0" />
                    )}
                    {cfTestStatus === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {cfTestStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{cfTestMessage}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestCloudflare}
                    disabled={cfTestStatus === 'testing'}
                    className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cfTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                    ทดสอบการเชื่อมต่อ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCloudflare}
                    className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    บันทึก & ใช้งาน Cloudflare D1
                  </button>
                </div>
              </div>

              {/* 1-Click Migration Card */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        ย้ายข้อมูลทั้งหมดไป Cloudflare D1 ทันที (One-Click Migration)
                      </h4>
                      <p className="text-xs text-slate-300">
                        ส่งข้อมูลครู {effectiveTeachers.length} ท่าน, แผน {effectivePlans.length} รายการ และการตั้งค่าระบบทั้งหมดขึ้น D1
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-orange-300 border border-white/15">
                    Auto-Sync
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  กดปุ่มนี้เพื่อให้อินเตอร์เฟซระบบย้ายข้อมูลปัจจุบัน (ทั้งบัญชีผู้ใช้, แผนการสอน, ภาระงานมอบหมาย, วันกำหนดส่ง) ขึ้นไปบันทึกบน Cloudflare D1 โดยอัตโนมัติ
                </p>

                {cfMigrateMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      cfMigrateMessage.type === 'success'
                        ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-200 border border-rose-500/40'
                    }`}
                  >
                    {cfMigrateMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{cfMigrateMessage.text}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleMigrateToCloudflare}
                  disabled={isMigratingToCf || !cfWorkerUrl.trim()}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isMigratingToCf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>กำลังส่งข้อมูลขึ้น Cloudflare D1...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 text-slate-950" />
                      <span>เริ่มการย้ายข้อมูลขึ้น Cloudflare D1 ทันที</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: D1 SQL SCHEMA */}
          {activeTab === 'd1_sql' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    โครงสร้างตาราง D1 SQL Schema (schema.sql)
                  </h3>
                  <p className="text-xs text-slate-500">
                    คำสั่ง SQLite D1 สำหรับสร้างตาราง teachers, lesson_plans, assignment_submissions, system_settings
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadCfSql}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด .sql</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCfSql}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    {copiedCfSql ? (
                      <>
                        <Check className="w-4 h-4" />
                        คัดลอกเรียบร้อย!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        คัดลอกคำสั่ง SQL
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 text-amber-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800 select-all leading-relaxed">
                <pre>{generateCloudflareD1SqlScript(effectiveTeachers, effectivePlans, deadlineConfigs)}</pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>วิธีรันบน Cloudflare Dashboard:</strong> ไปที่ <em>Workers & Pages &gt; D1 SQL Database &gt; (เลือกฐานข้อมูลของคุณ) &gt; แท็บ Console</em> แล้ววางโค้ด SQL นี้ลงไปและกด <strong>Execute</strong>
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: WORKER CODE */}
          {activeTab === 'worker_code' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    สคริปต์ Cloudflare Worker API (worker.js)
                  </h3>
                  <p className="text-xs text-slate-500">
                    โค้ด Worker REST API สำหรับรับส่งข้อมูลจากเบราว์เซอร์ไปยังฐานข้อมูล D1 (รองรับ CORS และ Bearer Auth)
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyWrangler}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedWrangler ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>คัดลอก wrangler.toml</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCfWorker}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    {copiedCfWorker ? (
                      <>
                        <Check className="w-4 h-4" />
                        คัดลอกเรียบร้อย!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        คัดลอกโค้ด worker.js
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800 select-all leading-relaxed">
                <pre>{generateCloudflareWorkerScript()}</pre>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-orange-950">
                  <Terminal className="w-4 h-4 text-orange-600" />
                  การผูกตัวแปร Binding ใน Cloudflare:
                </div>
                <p>
                  ในหน้า Cloudflare Worker &gt; <strong>Settings</strong> &gt; <strong>Bindings</strong> ให้เพิ่ม D1 Database binding โดยตั้งชื่อ Variable name เป็น <code>DB</code> และเลือก D1 Database ที่สร้างไว้
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: QUICK SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-orange-950">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  คู่มือเชื่อมต่อ Cloudflare D1 ใน 3 ขั้นตอน (ใช้เวลา ~3 นาที)
                </h3>
                <p className="text-orange-900/80 leading-relaxed">
                  Cloudflare D1 ให้บริการฟรี ไม่มีค่าใช้จ่าย และรองรับปริมาณงานของโรงเรียนได้อย่างราบรื่น
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs">
                      1
                    </span>
                    สร้าง D1 Database และรัน SQL
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-2">
                    <li>เข้าสู่ <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-orange-600 font-bold underline">Cloudflare Dashboard</a></li>
                    <li>ไปที่ <strong>Workers & Pages</strong> &gt; <strong>D1 SQL Database</strong> &gt; กด <strong>Create Database</strong></li>
                    <li>ตั้งชื่อฐานข้อมูล เช่น <code>pcshs-eduplan-db</code> แล้วกดสร้าง</li>
                    <li>เปิดแท็บ <strong>Console</strong> ของ D1 ที่สร้าง นำคำสั่งจากแท็บ <strong>2. โครงสร้าง D1 (SQL)</strong> ไปวางแล้วกด <strong>Execute</strong></li>
                  </ol>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    สร้าง Cloudflare Worker และผูกตัวแปร DB
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-2">
                    <li>ไปที่ <strong>Workers & Pages</strong> &gt; กด <strong>Create Worker</strong> &gt; ตั้งชื่อ เช่น <code>pcshs-eduplan-worker</code></li>
                    <li>กด <strong>Edit code</strong> นำโค้ดจากแท็บ <strong>3. โค้ด Worker</strong> ไปวางแทนที่ทั้งหมด แล้วกด <strong>Deploy</strong></li>
                    <li>ไปที่แท็บ <strong>Settings</strong> ของ Worker &gt; <strong>Bindings</strong> &gt; กด <strong>Add</strong> เลือก <strong>D1 database</strong></li>
                    <li>ตั้งชื่อ Variable name เป็น <code>DB</code> และเลือก D1 Database ที่สร้างไว้ในข้อ 1 แล้วกด Save and Deploy</li>
                  </ol>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs">
                      3
                    </span>
                    นำ Worker URL มาบันทึกในระบบนี้
                  </div>
                  <p className="text-slate-600 pl-2">
                    คัดลอก URL ของ Worker (เช่น <code>https://pcshs-eduplan-worker.xxx.workers.dev</code>) มากรอกในช่อง <strong>Cloudflare Worker API URL</strong> ในแท็บ <strong>1. เชื่อมต่อ & ย้ายข้อมูล</strong> แล้วกด <strong>ทดสอบการเชื่อมต่อ</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EXPORT & BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 flex items-start gap-3">
                <Download className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm font-bold text-slate-900 mb-1">
                    ศูนย์สำรองและส่งออกข้อมูล (Data Backup Hub)
                  </strong>
                  ท่านสามารถดาวน์โหลดข้อมูลทั้งหมดของระบบเก็บไว้เป็นไฟล์ หรือนำไปเก็บสำรองได้ตลอดเวลา
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Full JSON Backup */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      Complete JSON Backup
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      สำรองข้อมูลทั้งระบบ (.json)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      รวมข้อมูลบุคลากร 27 ท่าน, แผนการสอนทั้งหมด, ภาระงานมอบหมาย, และการตั้งค่าระบบ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportFullJson}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์ JSON ทั้งระบบ</span>
                  </button>
                </div>

                {/* Option 2: Cloudflare D1 SQL Dump */}
                <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/40 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      Cloudflare D1 SQL
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      ส่งออก SQL สำหรับ Cloudflare D1
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      ไฟล์สคริปต์ SQLite พร้อม CREATE TABLE และ INSERT ข้อมูลปัจจุบันครบถ้วน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCfSql}
                    className="w-full py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>ดาวน์โหลด D1 SQL Script</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>ฐานข้อมูลระบบ:</span>
            <span className="font-bold text-orange-700 flex items-center gap-1.5 bg-orange-100/80 px-2 py-0.5 rounded-md">
              <Cloud className="w-3.5 h-3.5 text-orange-600" />
              <span>Cloudflare D1 (Edge SQL)</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
