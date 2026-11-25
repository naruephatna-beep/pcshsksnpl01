import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Teacher,
  isBranchHead,
  isDepartmentHead,
  isTeacherAdmin,
  isTeacherExecutive,
} from '../types';
import {
  BookOpen,
  X,
  Search,
  LogIn,
  GraduationCap,
  UserCheck,
  BarChart3,
  ShieldCheck,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Play,
  ListChecks,
} from 'lucide-react';
import { PrintModalShell } from './PrintModalShell';
import { UserManualVisual, ManualVisualId } from './UserManualVisuals';
import { UserManualInteractivePlayer } from './UserManualInteractivePlayer';

export type ManualRoleId = 'auth' | 'teacher' | 'reviewer' | 'executive' | 'admin';

interface ManualStep {
  number: string;
  title: string;
  summary: string;
  details: string[];
  menuLocation?: string;
  tip?: string;
  visualId: ManualVisualId;
  visualCaption: string;
}

interface ManualFaq {
  question: string;
  answer: string;
}

interface RoleManualContent {
  id: ManualRoleId;
  tabLabel: string;
  title: string;
  audience: string;
  description: string;
  quickHighlights: string[];
  steps: ManualStep[];
  faqs: ManualFaq[];
}

const ROLE_MANUALS: RoleManualContent[] = [
  {
    id: 'auth',
    tabLabel: 'เริ่มต้น & ล็อกอิน',
    title: 'การเข้าสู่ระบบและตั้งค่าบัญชีผู้ใช้เบื้องต้น',
    audience: 'บุคลากรทุกตำแหน่ง · ก่อนเริ่มใช้งาน',
    description:
      'ขั้นตอนการลงชื่อเข้าใช้ครั้งแรก การเปลี่ยนรหัสผ่านเพื่อความปลอดภัย และการเตรียมไฟล์ลิงก์เอกสารก่อนส่งเข้าระบบ',
    quickHighlights: [
      'เข้าสู่ระบบด้วยอีเมลโรงเรียน หรือรหัสครู (Teacher_ID เช่น te028)',
      'รหัสผ่านเริ่มต้นสำหรับเข้าใช้ครั้งแรกคือ 12345 และระบบจะให้ตั้งรหัสใหม่ทันที',
      'ตรวจสอบชื่อ นามสกุล กลุ่มสาระฯ สาขาวิชา และอัปโหลดลายเซ็นในเมนู ข้อมูลส่วนตัว',
    ],
    steps: [
      {
        number: '01',
        title: 'กรอกอีเมลหรือรหัสครูเพื่อเข้าสู่ระบบ',
        menuLocation: 'หน้าเข้าสู่ระบบ (Login)',
        summary: 'ระบุตัวตนด้วยอีเมลของโรงเรียนหรือรหัสประจำตัวครู',
        details: [
          'พิมพ์อีเมลโรงเรียน (เช่น name@pcshsksn.ac.th) หรือพิมพ์รหัสครู (เช่น te028) ในช่องแรก ระบบจะแสดงชื่อ-กลุ่มสาระฯ เพื่อยืนยันบัญชีให้อัตโนมัติ',
          'กรอกรหัสผ่านในช่องที่สอง (หากเข้าใช้งานครั้งแรกให้ใช้รหัสเริ่มต้น 12345) จากนั้นกดปุ่ม "เข้าสู่ระบบส่งเอกสารวิชาการ"',
        ],
        tip: 'สามารถกดไอคอนรูปดวงตาด้านขวาของช่องรหัสผ่านเพื่อตรวจสอบตัวอักษรก่อนกดเข้าสู่ระบบได้',
        visualId: 'auth-01',
        visualCaption: 'ภาพตัวอย่าง: กรอกรหัสครู ระบบจะขึ้นแถบสีเขียวแสดงชื่อยืนยัน',
      },
      {
        number: '02',
        title: 'เปลี่ยนรหัสผ่านใหม่เมื่อเข้าใช้ครั้งแรก',
        menuLocation: 'หน้าต่างตั้งรหัสผ่านใหม่ (Force Password)',
        summary: 'เพิ่มความปลอดภัยให้บัญชีและเอกสารของตนเอง',
        details: [
          'หากยังใช้รหัสผ่านเริ่มต้น 12345 ระบบจะแสดงหน้าต่างให้ตั้งรหัสผ่านใหม่อัตโนมัติหลังล็อกอิน',
          'ตั้งรหัสผ่านใหม่ที่มีความยาวเหมาะสมและจำได้ง่าย กดยืนยัน ระบบจะบันทึกข้อมูลลงฐานข้อมูลทันที',
        ],
        tip: 'หากลืมรหัสผ่านในภายหลัง สามารถติดต่อผู้ดูแลระบบฝ่ายวิชาการเพื่อรีเซ็ตรหัสผ่านให้ใหม่ได้',
        visualId: 'auth-02',
        visualCaption: 'ภาพตัวอย่าง: หน้าต่างบังคับเปลี่ยนรหัสผ่านเมื่อเข้าใช้งานครั้งแรก',
      },
      {
        number: '03',
        title: 'ตรวจสอบโปรไฟล์และลายเซ็นอิเล็กทรอนิกส์',
        menuLocation: 'เมนู "ข้อมูลส่วนตัว" (แถบด้านข้างหรือมุมขวาบน)',
        summary: 'ทำให้ชื่อ กลุ่มสาระฯ และเอกสารรับรองแสดงผลถูกต้อง',
        details: [
          'คลิกที่ชื่อหรือการ์ดโปรไฟล์ของตนเอง เพื่อตรวจดูชื่อ-สกุล ตำแหน่ง วิทยฐานะ กลุ่มสาระการเรียนรู้ และสาขาวิชา',
          'สามารถเปลี่ยนรหัสผ่าน แก้ไขเบอร์ติดต่อ หรือแนบลิงก์รูปภาพลายเซ็นเพิ่มเติมได้จากหน้าต่างนี้',
        ],
        visualId: 'auth-03',
        visualCaption: 'ภาพตัวอย่าง: การตรวจเช็กข้อมูลสังกัดและแนบลิงก์รูปภาพลายเซ็น',
      },
      {
        number: '04',
        title: 'เตรียมสิทธิ์ไฟล์ Google Drive ก่อนส่ง (สำคัญ)',
        menuLocation: 'Google Drive ของครูผู้ส่ง',
        summary: 'ป้องกันปัญหาผู้ตรวจเปิดอ่านไฟล์ไม่ได้',
        details: [
          'กรณีส่งงานด้วยการวางลิงก์ (Google Drive / Google Docs / PDF) ให้กด "แชร์ (Share)" ที่ไฟล์ต้นฉบับ',
          'ตั้งค่าการเข้าถึงเป็น "ทุกคนที่มีลิงก์ (Anyone with the link)" แบบผู้มีสิทธิ์อ่าน (Viewer) หรือแสดงความคิดเห็น (Commenter)',
        ],
        tip: 'หากเลือกอัปโหลดไฟล์จากเครื่องผ่านระบบโดยตรง ระบบจะจัดเก็บและจัดการสิทธิ์ให้โดยอัตโนมัติ',
        visualId: 'auth-04',
        visualCaption: 'ภาพตัวอย่าง: การเปิดสิทธิ์ "ทุกคนที่มีลิงก์" ใน Google Drive ก่อนคัดลอกลิงก์',
      },
    ],
    faqs: [
      {
        question: 'พิมพ์รหัสครูแล้วไม่พบชื่อ หรือรหัสผ่าน 12345 เข้าไม่ได้ ต้องทำอย่างไร?',
        answer:
          'ตรวจสอบว่าไม่ได้เปิด Caps Lock หรือมีช่องว่างหน้า-หลังข้อความ หากเคยเปลี่ยนรหัสผ่านไปแล้วให้ใช้รหัสที่ตั้งใหม่ หรือแจ้งผู้ดูแลระบบวิชาการเพื่อตรวจสอบบัญชีและรีเซ็ตรหัส',
      },
      {
        question: 'ทำไมหน้าเว็บมีแถบสีหรือไอคอนเทศกาลเปลี่ยนไปตามช่วงเวลา?',
        answer:
          'เป็นระบบธีมเทศกาลและวันสำคัญอัตโนมัติของโรงเรียน ไม่กระทบข้อมูลหรือสิทธิ์การใช้งาน สามารถกดปิดแถบข้อความทักทายชั่วคราวได้ตามต้องการ',
      },
    ],
  },
  {
    id: 'teacher',
    tabLabel: 'ครูผู้สอน',
    title: 'คู่มือการใช้งานสำหรับครูผู้สอน',
    audience: 'บทบาท ครูผู้สอน (Teacher)',
    description:
      'วิธีดูภาระงานที่ต้องส่ง กำหนดส่ง (Deadline) การส่งเอกสารใหม่ ติดตามผลตรวจ การแก้ไขส่งซ้ำเมื่อถูกตีกลับ และพิมพ์ใบรับรองการส่ง',
    quickHighlights: [
      'ดูรายการงานที่รอส่งจากแอดมินได้ที่แถบนับถอยหลังด้านบน หรือเมนู "งานที่ฉันต้องส่ง"',
      'ส่งเอกสารได้ทั้งแบบกรอกฟอร์มภาระงานโดยตรง หรือกดปุ่ม "ส่งเอกสาร" เพื่อส่งแผน/เอกสารทั่วไป',
      'หากงานถูกตีกลับ (ส่งกลับแก้ไข) ให้กดปุ่ม "แก้ไข / ส่งใหม่" ที่การ์ดงานเดิม เพื่อรักษาประวัติและสายงานตรวจเดิมไว้',
    ],
    steps: [
      {
        number: '01',
        title: 'ตรวจสอบภาระงานและกำหนดส่ง (Deadline)',
        menuLocation: 'แถบนับถอยหลังด้านบน / เมนู "งานที่ฉันต้องส่ง"',
        summary: 'เช็กให้ครบว่าภาคเรียนนี้มีเอกสารอะไรบ้างที่ถึงกำหนดส่ง',
        details: [
          'ด้านบนสุดของหน้าหลักจะมีแถบแจ้งเตือนงานที่ใกล้ถึงกำหนดส่ง สามารถคลิกเพื่อเปิดหน้าส่งงานประเภทนั้นได้ทันที',
          'ในเมนูด้านข้าง (Sidebar) ช่อง "งานที่ฉันต้องส่ง" จะแสดงตัวเลขจำนวนงานที่ยังไม่ได้ส่ง หากส่งครบแล้วจะขึ้นสถานะ "ครบ"',
        ],
        visualId: 'teacher-01',
        visualCaption: 'ภาพตัวอย่าง: แถบแจ้งเตือนกำหนดส่งด้านบนและตัวเลขงานรอส่งในแถบด้านข้าง',
      },
      {
        number: '02',
        title: 'ส่งเอกสาร / แผนการจัดการเรียนรู้',
        menuLocation: 'การ์ด "งานที่ฉันต้องส่ง" หรือปุ่ม "+ ส่งเอกสาร"',
        summary: 'กรอกรายละเอียดตามแบบฟอร์มและแนบไฟล์หรือลิงก์งาน',
        details: [
          'กดปุ่ม "ส่งงานนี้" จากรายการภาระงานที่ได้รับมอบหมาย (แนะนำ) หรือกดปุ่มส่งเอกสารจากแถบเครื่องมือ',
          'กรอกข้อมูลให้ครบตามช่องที่กำหนด เลือกรูปแบบการแนบไฟล์ (อัปโหลดจากเครื่อง หรือวางลิงก์ Google Drive / PDF)',
          'ตรวจสอบความถูกต้องแล้วกดยืนยันส่ง ระบบจะบันทึกเวลาส่งและส่งเข้าคิวผู้ตรวจตามสายงานอนุมัติอัตโนมัติ',
        ],
        tip: 'หลีกเลี่ยงการส่งงานซ้ำเป็นรายการใหม่สำหรับภาระงานเดียวกัน เพราะระบบอาจนับแยกจากงานที่ได้รับมอบหมายเดิม',
        visualId: 'teacher-02',
        visualCaption: 'ภาพตัวอย่าง: การกรอกฟอร์ม แนบไฟล์หรือวางลิงก์ Google Drive และยืนยันส่ง',
      },
      {
        number: '03',
        title: 'ติดตามสถานะผลตรวจและความคิดเห็น',
        menuLocation: 'แท็บ "เอกสารของฉัน" และตัวกรองสถานะด้านซ้าย',
        summary: 'แยกดูงานรอตรวจ อนุมัติแล้ว และส่งกลับแก้ไขได้ชัดเจน',
        details: [
          'กดดูเฉพาะรายการของตนเองผ่านเมนูย่อย: "แผนของฉันที่รอตรวจ", "อนุมัติแล้ว" และ "ส่งกลับแก้ไข"',
          'คลิกเข้าไปในการ์ดเอกสารเพื่อดูความคืบหน้าทีละด่าน (Stage) คะแนนรูบริก (ถ้ามี) และข้อเสนอแนะจากผู้ตรวจ',
        ],
        visualId: 'teacher-03',
        visualCaption: 'ภาพตัวอย่าง: แถบกรองสถานะและลำดับความคืบหน้าของแต่ละด่านตรวจ',
      },
      {
        number: '04',
        title: 'วิธีแก้ไขและส่งลิงก์ใหม่เมื่อถูกตีกลับ (ส่งกลับแก้ไข)',
        menuLocation: 'การ์ดเอกสารสถานะ "ส่งกลับแก้ไข" -> ปุ่ม "ส่งแก้ไขใหม่"',
        summary: 'ส่งงานแก้บนรายการเดิม เพื่อให้ผู้ตรวจเห็นลิงก์ใหม่ล่าสุดทันที',
        details: [
          'เมื่อพบเอกสารที่มีสถานะ "ส่งกลับแก้ไข" ให้เปิดอ่านข้อเสนอแนะของผู้ตรวจก่อนปรับปรุงไฟล์',
          'กดปุ่ม "ส่งแก้ไขใหม่" (Resubmit) หรือปุ่ม "แก้ไข" บนการ์ดงานเดิม แล้ววางลิงก์ไฟล์ฉบับแก้ไขใหม่หรืออัปโหลดไฟล์ใหม่แทนของเดิม',
          'บันทึกการส่งใหม่ ระบบจะเปลี่ยนสถานะกลับเป็น "รอตรวจ" พร้อมอัปเดตลิงก์ใหม่ให้ผู้ตรวจและแอดมินเปิดดูได้ทันที',
        ],
        tip: 'ควรใช้วิธี "ส่งแก้ไขใหม่" บนการ์ดงานเดิม ไม่ควรกดส่งเป็นงานชิ้นใหม่แยกต่างหาก',
        visualId: 'teacher-04',
        visualCaption: 'ภาพตัวอย่าง: กด "ส่งแก้ไขใหม่" บนการ์ดที่ถูกตีกลับเพื่อวางลิงก์ใหม่แทนของเดิม',
      },
      {
        number: '05',
        title: 'พิมพ์ใบยืนยัน / หลักฐานการส่งเอกสาร',
        menuLocation: 'ปุ่ม "ใบยืนยันส่งงาน / เกียรติบัตร" บนการ์ดงานที่ส่งหรืออนุมัติแล้ว',
        summary: 'ออกเอกสารสรุปสำหรับเก็บเป็นหลักฐานหรือรายงาน',
        details: [
          'ที่รายการงานที่ส่งแล้วหรือผ่านการอนุมัติแล้ว สามารถกดปุ่มดูใบรับรอง/ใบยืนยัน เพื่อเปิดหน้าพิมพ์ A4',
          'กดปุ่ม "พิมพ์เอกสาร / บันทึก PDF" หรือกดปุ่ม "ปิด / ย้อนกลับ" มุมขวาบนเพื่อกลับสู่หน้าหลัก',
        ],
        visualId: 'teacher-05',
        visualCaption: 'ภาพตัวอย่าง: หน้าต่างพิมพ์ใบยืนยันขนาด A4 พร้อมปุ่มพิมพ์และปุ่มปิดด้านบน',
      },
    ],
    faqs: [
      {
        question: 'ส่งงานไปแล้ว แต่ลืมเปลี่ยนลิงก์หรือแนบลิงก์ผิด ต้องลบส่งใหม่ไหม?',
        answer:
          'ไม่จำเป็นต้องลบครับ หากงานยังอยู่ในสถานะรอตรวจหรือถูกส่งกลับแก้ไข สามารถกดปุ่มแก้ไขหรือส่งแก้ไขใหม่บนการ์ดเดิมเพื่อเปลี่ยนลิงก์ได้ทันที',
      },
      {
        question: 'ใช้งานบนมือถือเข้าเมนูส่งงานและดูงานได้จากตรงไหน?',
        answer:
          'ใช้แถบเมนูด้านล่างหน้าจอได้เลย ปุ่ม "+" สีเหลืองตรงกลางใช้สำหรับส่งเอกสารใหม่ ส่วนปุ่มด้านบนซ้าย (ขีด 3 ขีด) ใช้เปิดแถบเมนูด้านข้างทั้งหมด',
      },
    ],
  },
  {
    id: 'reviewer',
    tabLabel: 'ผู้ตรวจ / หัวหน้า',
    title: 'คู่มือผู้ตรวจงาน หัวหน้าสาขา และหัวหน้ากลุ่มสาระ',
    audience: 'ผู้ตรวจงาน · หัวหน้ากลุ่มสาขา · หัวหน้ากลุ่มสาระการเรียนรู้',
    description:
      'แนวทางการตรวจเอกสารตามสายงานอนุมัติ การเปิดดูไฟล์แนบ การให้คะแนนแบบรูบริกหรืออนุมัติ และการส่งกลับแก้ไขอย่างเป็นระบบ',
    quickHighlights: [
      'เข้าคิวงานตรวจของตนเองได้ที่เมนู "เอกสารที่รอฉันตรวจ" (มีตัวเลขสีเหลืองแจ้งจำนวนงานค้าง)',
      'ตรวจเปิดลิงก์งานทุกไฟล์ที่ครูแนบมา รองรับทั้งงานไฟล์เดียวและงานหลายไฟล์ในชุดเดียว',
      'บันทึกผลการตรวจได้ทั้งแบบ อนุมัติอย่างเดียว และแบบประเมินคะแนนรูบริก (Rubric) พร้อมส่งกลับแก้ไขรายไฟล์ได้',
    ],
    steps: [
      {
        number: '01',
        title: 'เปิดคิวงานที่ได้รับมอบหมายให้ตรวจ',
        menuLocation: 'แถบด้านข้าง "เอกสารที่รอฉันตรวจ" / ปุ่ม "รอฉันตรวจ" มุมขวาบน',
        summary: 'ดูเฉพาะเอกสารที่ถึงคิวของท่านในสายงานอนุมัติ',
        details: [
          'คลิกที่เมนู "เอกสารที่รอฉันตรวจ" (บนมือถือแตะที่แท็บ "งานตรวจ" ด้านล่าง)',
          'ระบบจะแสดงเอกสารที่ตรงกับด่านตรวจของท่าน เช่น ด่านหัวหน้ากลุ่มสาขา ด่านหัวหน้ากลุ่มสาระ หรือผู้ตรวจที่ได้รับสุ่ม/ระบุรายชื่อ',
        ],
        visualId: 'reviewer-01',
        visualCaption: 'ภาพตัวอย่าง: เมนูคิวงานรอตรวจและการกดปุ่ม "ตรวจเอกสาร" บนการ์ดงาน',
      },
      {
        number: '02',
        title: 'เปิดดูเอกสารแนบและรายละเอียดที่ครูส่ง',
        menuLocation: 'คลิกปุ่ม "ตรวจเอกสาร / ประเมิน" บนการ์ดงาน',
        summary: 'ตรวจสอบความครบถ้วนของไฟล์ ลิงก์ และข้อมูลแบบฟอร์ม',
        details: [
          'ในหน้าต่างตรวจงาน จะแสดงลิงก์ไฟล์ทั้งหมดที่ครูล่าสุดส่งเข้ามา (หากครูแก้ไขส่งลิงก์ใหม่เข้ามา ระบบจะแสดงลิงก์ล่าสุดให้ทันที)',
          'เลื่อนดูรายละเอียดคำตอบจากฟอร์มที่ครูกรอกส่งประกอบการพิจารณา',
        ],
        visualId: 'reviewer-02',
        visualCaption: 'ภาพตัวอย่าง: ปุ่มเปิดดูไฟล์แนบฉบับล่าสุดพร้อมรายละเอียดที่ครูกรอกส่ง',
      },
      {
        number: '03',
        title: 'ประเมินผล อนุมัติ หรือส่งกลับแก้ไข',
        menuLocation: 'ส่วนบันทึกผลการตรวจในหน้าต่าง ReviewPlanModal',
        summary: 'เลือกสถานะตามเกณฑ์ของด่านตรวจนั้นๆ',
        details: [
          'หากด่านนั้นตั้งค่าเป็น "ประเมินคะแนนรูบริก (Rubric)" ให้เลือกคะแนนแต่ละข้อ ระบบจะคำนวณคะแนนรวมและร้อยละให้อัตโนมัติ',
          'หากด่านนั้นตั้งค่าเป็น "อนุมัติอย่างเดียว" ให้ระบุสถานะ "อนุมัติ/ผ่าน" หรือ "ส่งกลับแก้ไข" พร้อมเขียนข้อเสนอแนะให้ครูทราบชัดเจน',
          'หากเอกสารมีหลายไฟล์ สามารถประเมินแยกเป็นรายไฟล์ได้ และเมื่อกดอนุมัติด่านปัจจุบัน งานจะเลื่อนไปยังผู้ตรวจด่านถัดไปโดยอัตโนมัติ',
        ],
        tip: 'กรณีส่งกลับแก้ไข ควรระบุจุดที่ต้องปรับปรุงในช่องความเห็น เพื่อให้ครูนำไปแก้ไขและส่งลิงก์ใหม่ได้ตรงจุด',
        visualId: 'reviewer-03',
        visualCaption: 'ภาพตัวอย่าง: การประเมินคะแนนรูบริก ระบุความเห็น และปุ่มอนุมัติ/ส่งกลับแก้ไข',
      },
      {
        number: '04',
        title: 'ดูเอกสารทั้งโรงเรียน (สำหรับผู้ที่ได้รับสิทธิ์)',
        menuLocation: 'เมนู "เอกสารทั้งโรงเรียน" (Sidebar)',
        summary: 'เรียกดูและค้นหาเอกสารในภาพรวมเมื่อได้รับอนุญาตจากแอดมิน',
        details: [
          'หากผู้ดูแลระบบเปิดสิทธิ์ให้หัวหน้ากลุ่มสาระ หัวหน้าสาขา หรือรายบุคคล จะมีเมนู "เอกสารทั้งโรงเรียน" ปรากฏขึ้นอัตโนมัติ',
          'ใช้สำหรับติดตามภาพรวมภายในกลุ่มสาระ/สาขา หรือค้นหาเอกสารอ้างอิงตามกลุ่มสาระและสถานะ',
        ],
        visualId: 'reviewer-04',
        visualCaption: 'ภาพตัวอย่าง: เมนู "เอกสารทั้งโรงเรียน" และตัวกรองกลุ่มสาระ/สถานะ',
      },
    ],
    faqs: [
      {
        question: 'ตรวจงานไปแล้ว 1 ครั้ง ทำไมงานหายไปจากแท็บ "เอกสารที่รอฉันตรวจ"?',
        answer:
          'เพราะระบบย้ายงานที่ตรวจเสร็จแล้วออกจากคิวรอตรวจ (Pending) ไปยังประวัติ "ตรวจแล้ว" เพื่อให้คิวรอตรวจเหลือเฉพาะงานที่ยังค้างอยู่จริงครับ',
      },
      {
        question: 'เปิดลิงก์งานของครูไม่ได้ ขึ้นว่าต้องขอสิทธิ์เข้าถึง (Access Denied) ทำอย่างไร?',
        answer:
          'ให้กด "ส่งกลับแก้ไข" และแจ้งให้ครูผู้ส่งเข้าไปเปิดการแชร์ Google Drive ของไฟล์นั้นเป็น "ทุกคนที่มีลิงก์สามารถดูได้" แล้วกดส่งแก้ไขใหม่ครับ',
      },
    ],
  },
  {
    id: 'executive',
    tabLabel: 'ผู้บริหาร',
    title: 'คู่มือการใช้งานสำหรับผู้บริหารสถานศึกษา',
    audience: 'ผู้อำนวยการ · รองผู้อำนวยการ (Executive)',
    description:
      'ติดตามภาพรวมการส่งเอกสารวิชาการทั้งโรงเรียน วิเคราะห์สถิติตามกลุ่มสาระ ภาระงาน และอนุมัติด่านผู้บริหาร',
    quickHighlights: [
      'เข้าสู่ระบบแล้วจะเปิดหน้า "แดชบอร์ดภาพรวมผู้บริหาร" ให้อัตโนมัติ ดูครบทั้งโรงเรียนได้ในหน้าเดียว',
      'สามารถสลับดูมุมมอง "จัดอันดับกลุ่มสาระ" และ "วิเคราะห์ Data-Driven Org" ได้จากแถบด้านข้าง',
      'รองรับการกดพิมพ์รายงานสำหรับผู้บริหารและตรวจสอบรายละเอียดรายคน/รายกลุ่มสาระได้ทันที',
    ],
    steps: [
      {
        number: '01',
        title: 'อ่านภาพรวมจากแดชบอร์ดผู้บริหาร',
        menuLocation: 'เมนู "แดชบอร์ดภาพรวมผู้บริหาร"',
        summary: 'ดูสรุปยอดส่ง ตรงเวลา ส่งช้า รอตรวจ และผ่านการอนุมัติ',
        details: [
          'หน้าจอหลักจะแสดง KPI สรุปทั้งโรงเรียน กราฟสัดส่วนสถานะ และตารางความคืบหน้าแยกตามกลุ่มสาระการเรียนรู้',
          'สามารถกรองข้อมูลตามประเภทเอกสาร หรือคลิกดูรายชื่อครูในแต่ละกลุ่มสาระที่ยังค้างส่งได้',
        ],
        visualId: 'executive-01',
        visualCaption: 'ภาพตัวอย่าง: แผงตัวเลขสรุปทั้งโรงเรียนและความคืบหน้ารายกลุ่มสาระ',
      },
      {
        number: '02',
        title: 'ดูอันดับกลุ่มสาระและ Data-Driven Org',
        menuLocation: 'Sidebar หมวด "การติดตาม & สถิติ (Analytics)"',
        summary: 'เปรียบเทียบผลการดำเนินงานเชิงลึกเพื่อวางแผนกำกับติดตาม',
        details: [
          'เลือก "จัดอันดับกลุ่มสาระ" เพื่อดูอัตราการส่งและคุณภาพงานเปรียบเทียบระหว่างกลุ่มสาระฯ',
          'เลือก "วิเคราะห์ Data-Driven Org" เพื่อดูแนวโน้มและสถิติเชิงวิเคราะห์สำหรับการบริหารงานวิชาการ',
        ],
        visualId: 'executive-02',
        visualCaption: 'ภาพตัวอย่าง: ปุ่มสลับมุมมองภาพรวม จัดอันดับกลุ่มสาระ และ Data-Driven Org',
      },
      {
        number: '03',
        title: 'อนุมัติเอกสารในด่านผู้บริหารและพิมพ์รายงาน',
        menuLocation: 'แท็บ "เอกสารที่รอฉันตรวจ" / ปุ่ม "พิมพ์รายงาน" ในแดชบอร์ด',
        summary: 'ลงนามอนุมัติขั้นสุดท้ายและออกรายงานสรุป',
        details: [
          'หากสายงานอนุมัติกำหนดให้ผู้บริหารตรวจในด่านสุดท้าย รายการจะเข้ามาที่ "เอกสารที่รอฉันตรวจ" และแจ้งเตือนมุมขวาบน',
          'เมื่อต้องการนำเอกสารเข้าประชุม สามารถกดปุ่มพิมพ์รายงานในหน้าแดชบอร์ดหรือหน้ารายบุคคล เพื่อสั่งพิมพ์หรือบันทึกเป็น PDF ได้',
        ],
        visualId: 'executive-03',
        visualCaption: 'ภาพตัวอย่าง: การอนุมัติในด่านผู้บริหารและปุ่มพิมพ์รายงานสรุป',
      },
    ],
    faqs: [
      {
        question: 'ต้องการสลับจากหน้าแดชบอร์ดไปดูรายการเอกสารทั้งหมดทำอย่างไร?',
        answer:
          'กดปุ่มสลับมุมมอง "รายการเอกสารทั้งหมด" ที่ด้านบนใต้การ์ดต้อนรับ หรือคลิกเมนู "เอกสารทั้งหมด" ในแถบด้านข้างได้เลยครับ',
      },
    ],
  },
  {
    id: 'admin',
    tabLabel: 'ผู้ดูแลระบบ',
    title: 'คู่มือผู้ดูแลระบบและเจ้าหน้าที่งานวิชาการ',
    audience: 'ผู้ดูแลระบบ (Admin / Super Admin / Academic Director)',
    description:
      'การบริหารจัดการระบบครบวงจร ตั้งแต่กำหนดภาระงาน สร้างฟอร์ม สร้างสายงานอนุมัติ ติดตามรายบุคคล จนถึงตั้งค่าปีการศึกษาและ Google Drive',
    quickHighlights: [
      'สร้างภาระงานและกำหนดวันส่งได้ที่เมนู "เพิ่ม / แก้ไขงานที่ให้ครูส่ง" พร้อมออกแบบช่องกรอกฟอร์มได้เอง',
      'กำหนดลำดับขั้นตอนการตรวจและกระจายงานอัตโนมัติได้ที่ "สายงานอนุมัติ & ผู้ตรวจ"',
      'ตรวจสอบความคืบหน้าได้ 3 มุมมองหลัก: ติดตามงานรายบุคคล, สรุปจำแนกประเภทเอกสาร และภาระงานผู้ตรวจ',
    ],
    steps: [
      {
        number: '01',
        title: 'ตั้งค่าปีการศึกษา ภาคเรียน และโครงสร้างบุคลากร',
        menuLocation: 'Sidebar: "ปีการศึกษา & ภาคเรียน" และ "โครงสร้างสาขา & หัวหน้าสาระ"',
        summary: 'วางฐานข้อมูลให้ตรงตามปีการศึกษาและโครงสร้างปัจจุบันก่อนเปิดรับงาน',
        details: [
          'ตรวจสอบภาคเรียน/ปีการศึกษาปัจจุบันที่แถบด้านบน หรือตั้งค่าเปลี่ยนเทอมและผูกโฟลเดอร์ Google Drive ประจำเทอม',
          'กำหนดหัวหน้ากลุ่มสาระการเรียนรู้ หัวหน้ากลุ่มสาขาวิชา และสังกัดของครูแต่ละท่านใน "โครงสร้างสาขา & หัวหน้าสาระ" เพื่อให้ระบบสายงานดึงผู้ตรวจได้ถูกต้อง',
        ],
        visualId: 'admin-01',
        visualCaption: 'ภาพตัวอย่าง: ตัวบอกภาคเรียนปัจจุบันและโครงสร้างหัวหน้าสาขา/หัวหน้ากลุ่มสาระ',
      },
      {
        number: '02',
        title: 'สร้างภาระงาน กำหนดส่ง และออกแบบฟอร์มส่งเอกสาร',
        menuLocation: 'เมนู "เพิ่ม / แก้ไขงานที่ให้ครูส่ง"',
        summary: 'กำหนดว่าครูต้องส่งเอกสารอะไรบ้าง ส่งเมื่อไหร่ และกรอกข้อมูลใดบ้าง',
        details: [
          'เพิ่มประเภทเอกสาร/ภาระงาน ตั้งวัน-เวลาเปิดและหมดเขตส่ง รวมถึงเลือกว่ามอบหมายให้ครูทุกคนหรือเฉพาะกลุ่ม',
          'ออกแบบช่องกรอกข้อมูลแบบ Dynamic (เช่น ช่องข้อความ ตัวเลือก ช่องแนบไฟล์/ลิงก์ และแนบลิงก์ตัวอย่างแบบฟอร์มให้ครูดาวน์โหลด)',
        ],
        visualId: 'admin-02',
        visualCaption: 'ภาพตัวอย่าง: การกำหนดวันหมดเขตส่งและสร้างช่องกรอกข้อมูลแบบ Dynamic',
      },
      {
        number: '03',
        title: 'ตั้งค่าสายงานอนุมัติและกระจายงานผู้ตรวจอัตโนมัติ',
        menuLocation: 'เมนู "สายงานอนุมัติ & ผู้ตรวจ"',
        summary: 'กำหนดลำดับด่านการตรวจและเกณฑ์การประเมินของแต่ละประเภทเอกสาร',
        details: [
          'สร้างสายงานและผูกกับประเภทเอกสาร กำหนดจำนวนด่าน (เช่น ด่าน 1 หัวหน้าสาขา -> ด่าน 2 หัวหน้ากลุ่มสาระ -> ด่าน 3 วิชาการ/ผู้บริหาร)',
          'เลือกรูปแบบการตรวจแต่ละด่าน (อนุมัติอย่างเดียว หรือ คะแนนรูบริก) และโหมดเลือกผู้ตรวจ (ตามตำแหน่งหัวหน้า, สุ่มข้ามกลุ่ม หรือระบุรายบุคคล)',
        ],
        tip: 'หากมีการเปลี่ยนหัวหน้าหรือปรับด่านตรวจ สามารถกดซิงค์สายงานกับงานที่รอดำเนินการได้จากหน้าต่างนี้',
        visualId: 'admin-03',
        visualCaption: 'ภาพตัวอย่าง: แผนผังสายงานอนุมัติหลายด่านตั้งแต่ครูส่งงานจนถึงอนุมัติสมบูรณ์',
      },
      {
        number: '04',
        title: 'ติดตามผล ตรวจสอบภาระงานผู้ตรวจ และจัดการสิทธิ์',
        menuLocation: 'เมนู "ติดตามงานรายบุคคล", "สรุปจำแนกประเภทเอกสาร", "ภาระงานผู้ตรวจ"',
        summary: 'ตรวจสอบทั้งฝั่งผู้ส่งและผู้ตรวจไม่ให้มีงานตกค้าง',
        details: [
          'ใช้ "ติดตามงานรายบุคคล" เพื่อดูตารางเมทริกซ์ว่าครูคนใดส่ง/ยังไม่ส่งชิ้นไหน พร้อมพิมพ์รายงานรายบุคคล',
          'ใช้ "ภาระงานผู้ตรวจ" เพื่อดูว่าผู้ตรวจแต่ละท่านตรวจไปกี่ฉบับและเหลือค้างตรวจกี่ฉบับ',
          'ใช้ "สิทธิ์ดูเอกสารทั้งโรงเรียน", "ทำเนียบบุคลากร", "ตั้งค่า Google Drive" และ "ธีมเทศกาลอัตโนมัติ" สำหรับดูแลระบบโดยรวม',
        ],
        visualId: 'admin-04',
        visualCaption: 'ภาพตัวอย่าง: มุมมองตารางติดตามรายบุคคล ภาระงานผู้ตรวจ และทางลัด ⌘K',
      },
    ],
    faqs: [
      {
        question: 'ถ้าต้องการแก้ไขข้อมูลบัญชีครู รีเซ็ตรหัสผ่าน หรือย้ายกลุ่มสาระทำที่ไหน?',
        answer:
          'เข้าไปที่เมนู "ทำเนียบบุคลากร" เลือกรายชื่อครูที่ต้องการแล้วกดแก้ไขข้อมูลหรือรีเซ็ตรหัสผ่านได้ทันที',
      },
      {
        question: 'กดเปิดเมนูจัดการระบบอย่างรวดเร็วบนคอมพิวเตอร์ได้อย่างไร?',
        answer:
          'สามารถกดปุ่ม Ctrl+K (หรือ ⌘K บน Mac) หรือคลิกช่อง "ค้นหา / คำสั่งลัด" ด้านบน เพื่อกระโดดไปยังหน้าต่างๆ หรือค้นหาเอกสารได้ทันที',
      },
    ],
  },
];

export function resolveDefaultManualRole(teacher?: Teacher | null): ManualRoleId {
  if (!teacher) return 'auth';
  if (isTeacherExecutive(teacher)) return 'executive';
  if (isTeacherAdmin(teacher)) return 'admin';
  if (isDepartmentHead(teacher) || isBranchHead(teacher)) return 'reviewer';
  return 'teacher';
}

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeacher?: Teacher | null;
  initialRole?: ManualRoleId;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  currentTeacher,
  initialRole,
}) => {
  const recommendedRole = useMemo(
    () => initialRole || resolveDefaultManualRole(currentTeacher),
    [initialRole, currentTeacher]
  );

  const [activeRole, setActiveRole] = useState<ManualRoleId>(recommendedRole);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqKey, setOpenFaqKey] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printScope, setPrintScope] = useState<'active' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'guide' | 'demo'>('guide');
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveRole(recommendedRole);
      setSearchQuery('');
      setOpenFaqKey(null);
      setViewMode('guide');
      setDemoStepIndex(0);
      setIsDemoPlaying(false);
    }
  }, [isOpen, recommendedRole]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPrintOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPrintOpen, onClose]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    const results: Array<{
      roleId: ManualRoleId;
      roleLabel: string;
      kind: 'step' | 'faq';
      number?: string;
      title: string;
      menuLocation?: string;
      lines: string[];
      tip?: string;
      visualId?: ManualVisualId;
      visualCaption?: string;
    }> = [];

    for (const manual of ROLE_MANUALS) {
      for (const step of manual.steps) {
        const haystack = [
          manual.tabLabel,
          manual.title,
          step.title,
          step.summary,
          step.menuLocation || '',
          step.tip || '',
          ...step.details,
        ]
          .join(' ')
          .toLowerCase();
        if (haystack.includes(normalizedQuery)) {
          results.push({
            roleId: manual.id,
            roleLabel: manual.tabLabel,
            kind: 'step',
            number: step.number,
            title: step.title,
            menuLocation: step.menuLocation,
            lines: step.details,
            tip: step.tip,
            visualId: step.visualId,
            visualCaption: step.visualCaption,
          });
        }
      }

      for (const faq of manual.faqs) {
        const haystack = `${manual.tabLabel} ${faq.question} ${faq.answer}`.toLowerCase();
        if (haystack.includes(normalizedQuery)) {
          results.push({
            roleId: manual.id,
            roleLabel: manual.tabLabel,
            kind: 'faq',
            title: faq.question,
            lines: [faq.answer],
          });
        }
      }
    }

    return results;
  }, [normalizedQuery]);

  if (!isOpen) return null;

  const activeManual = ROLE_MANUALS.find((m) => m.id === activeRole) || ROLE_MANUALS[0];

  const getRoleIcon = (id: ManualRoleId, className = 'w-4 h-4') => {
    switch (id) {
      case 'auth':
        return <LogIn className={className} />;
      case 'teacher':
        return <GraduationCap className={className} />;
      case 'reviewer':
        return <UserCheck className={className} />;
      case 'executive':
        return <BarChart3 className={className} />;
      case 'admin':
        return <ShieldCheck className={className} />;
    }
  };

  const manualsToPrint =
    printScope === 'all' ? ROLE_MANUALS : [activeManual];

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-manual-modal-title"
        className="fixed inset-0 z-[95] flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 font-['Prompt',sans-serif] print:hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-panel-enter">
          {/* Header */}
          <div className="bg-[#0B1329] text-white px-4 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2
                  id="user-manual-modal-title"
                  className="text-base sm:text-lg font-bold tracking-tight text-white truncate"
                >
                  คู่มือการใช้งานระบบส่งเอกสารวิชาการ
                </h2>
                <p className="text-xs text-slate-300 truncate">
                  {currentTeacher
                    ? `ผู้ใช้งานปัจจุบัน: ${currentTeacher.Name} · เลือกอ่านคู่มือได้ครบทุกบทบาท`
                    : 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ · ครอบคลุมทุกบทบาท'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPrintScope('active');
                  setIsPrintOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-100 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="เปิดหน้าพิมพ์หรือบันทึกเป็น PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">พิมพ์คู่มือ</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="ปิดคู่มือการใช้งาน"
                title="ปิดหน้าต่าง (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Role Switcher Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาหัวข้อในคู่มือทุกบทบาท เช่น ตีกลับ, ส่งงานใหม่, รหัสผ่าน, Google Drive, รูบริก..."
                  className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    aria-label="ล้างคำค้นหา"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {currentTeacher && activeRole !== recommendedRole && !normalizedQuery && (
                <button
                  type="button"
                  onClick={() => setActiveRole(recommendedRole)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>กลับไปคู่มือบทบาทของฉัน</span>
                </button>
              )}
            </div>

            {/* Segmented Role Tabs */}
            <div
              role="tablist"
              aria-label="เลือกบทบาทในคู่มือ"
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5 touch-scroll"
            >
              {ROLE_MANUALS.map((role) => {
                const isActive = !normalizedQuery && activeRole === role.id;
                const isRecommended = role.id === recommendedRole;
                return (
                  <button
                    key={role.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => {
                      setSearchQuery('');
                      setActiveRole(role.id);
                      setDemoStepIndex(0);
                      setIsDemoPlaying(false);
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                      isActive
                        ? 'bg-[#0B1329] text-amber-300 border-[#0B1329] shadow-xs'
                        : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {getRoleIcon(role.id, `w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-500'}`)}
                    <span>{role.tabLabel}</span>
                    {isRecommended && currentTeacher && (
                      <span
                        className={`text-[10px] font-medium ${
                          isActive ? 'text-amber-200/90' : 'text-amber-700'
                        }`}
                      >
                        · บทบาทของฉัน
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Body */}
          <div
            ref={bodyScrollRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6 bg-white touch-scroll"
          >
            {normalizedQuery ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      ผลการค้นหา "{searchQuery.trim()}"
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      พบ {searchResults.length} รายการจากคู่มือทุกบทบาท
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    ดูตามแท็บบทบาท
                  </button>
                </div>

                {searchResults.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl border border-slate-200 bg-slate-50/70">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
                    <p className="text-sm font-bold text-slate-800">ไม่พบหัวข้อที่ตรงกับ "{searchQuery.trim()}"</p>
                    <p className="text-xs text-slate-500 mt-1">
                      ลองค้นด้วยคำสั้นลง เช่น "ส่งงาน", "ตีกลับ", "รหัสผ่าน", "รูบริก", "Google Drive"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((item, idx) => (
                      <div
                        key={`${item.roleId}-${item.kind}-${idx}`}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-bold text-amber-800">{item.roleLabel}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.kind === 'step' ? `ขั้นตอนที่ ${item.number}` : 'คำถามที่พบบ่อย'}</span>
                            {item.menuLocation && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-slate-600">{item.menuLocation}</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRole(item.roleId);
                              setSearchQuery('');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <span>เปิดบทบาทนี้</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <div className="flex flex-col lg:flex-row gap-4 items-start">
                          <div className="flex-1 min-w-0 space-y-2">
                            <ul className="space-y-1 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc pl-5">
                              {item.lines.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                            {item.tip && (
                              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
                                <span className="font-bold">คำแนะนำ: </span>
                                {item.tip}
                              </p>
                            )}
                          </div>

                          {item.visualId && (
                            <div className="w-full lg:w-[330px] shrink-0">
                              <UserManualVisual
                                visualId={item.visualId}
                                caption={item.visualCaption}
                                compact
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Role Overview Hero Section */}
                <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-amber-800">
                        {activeManual.audience}
                      </p>
                      <h3 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                        {activeManual.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                        {activeManual.description}
                      </p>
                    </div>

                    {/* Mode Switcher: Reading Guide vs Animated Interactive Demo */}
                    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 border border-slate-300/70 shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('guide');
                          setIsDemoPlaying(false);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          viewMode === 'guide'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ListChecks className="w-3.5 h-3.5 text-slate-600" />
                        <span>อ่านทีละขั้น</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('demo');
                          setIsDemoPlaying(true);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          viewMode === 'demo'
                            ? 'bg-[#0B1329] text-amber-300 shadow-xs'
                            : 'text-slate-700 hover:text-slate-950'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>ภาพเคลื่อนไหวจำลอง</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      สรุปสิ่งสำคัญสำหรับบทบาทนี้
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {activeManual.quickHighlights.map((highlight, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 bg-white border border-slate-200/90 rounded-xl p-3 text-xs text-slate-700 leading-relaxed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Animated Interactive Walkthrough Mode */}
                {viewMode === 'demo' && (
                  <UserManualInteractivePlayer
                    roleTitle={activeManual.tabLabel}
                    steps={activeManual.steps}
                    activeStepIndex={demoStepIndex}
                    onSelectStep={(idx) => setDemoStepIndex(idx)}
                    isPlaying={isDemoPlaying}
                    onTogglePlay={() => setIsDemoPlaying((p) => !p)}
                  />
                )}

                {/* Step-by-Step Workflow */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      ขั้นตอนการใช้งานทีละขั้น
                    </h4>
                    <span className="text-xs text-slate-500 tabular-nums">
                      ทั้งหมด {activeManual.steps.length} ขั้นตอน
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeManual.steps.map((step, stepIdx) => (
                      <article
                        key={step.number}
                        className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2.5 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-[#0B1329] text-amber-300 font-mono tabular-nums text-xs font-bold flex items-center justify-center shrink-0">
                              {step.number}
                            </span>
                            <div className="min-w-0">
                              <h5 className="text-sm sm:text-base font-bold text-slate-900">
                                {step.title}
                              </h5>
                              <p className="text-xs text-slate-500">
                                {step.summary}
                              </p>
                            </div>
                          </div>

                          {step.menuLocation && (
                            <div className="text-xs text-slate-600 sm:text-right shrink-0 pl-11 sm:pl-0">
                              <span className="text-slate-400">ตำแหน่งเมนู: </span>
                              <span className="font-semibold text-slate-800">{step.menuLocation}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start pt-1">
                          <div className="flex-1 min-w-0 space-y-2.5">
                            <ul className="pl-11 lg:pl-11 space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc">
                              {step.details.map((detail, dIdx) => (
                                <li key={dIdx}>{detail}</li>
                              ))}
                            </ul>

                            {step.tip && (
                              <div className="ml-0 sm:ml-11 text-xs text-amber-950 bg-amber-50/80 border border-amber-200 rounded-lg px-3.5 py-2.5 leading-relaxed">
                                <span className="font-bold text-amber-900">ข้อควรระวัง / เคล็ดลับ: </span>
                                {step.tip}
                              </div>
                            )}
                          </div>

                          <div className="w-full lg:w-[340px] shrink-0 space-y-2">
                            <UserManualVisual
                              visualId={step.visualId}
                              caption={step.visualCaption}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('demo');
                                setDemoStepIndex(stepIdx);
                                setIsDemoPlaying(true);
                                bodyScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-950 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Play className="w-3 h-3 text-amber-600" />
                              <span>เล่นภาพเคลื่อนไหวขั้นตอนนี้</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* FAQ Section */}
                {activeManual.faqs.length > 0 && (
                  <section className="space-y-2.5 pt-2 border-t border-slate-200">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      คำถามที่พบบ่อย (FAQ)
                    </h4>
                    <div className="space-y-2">
                      {activeManual.faqs.map((faq, idx) => {
                        const key = `${activeManual.id}-faq-${idx}`;
                        const isExpanded = openFaqKey === key;
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setOpenFaqKey(isExpanded ? null : key)}
                              aria-expanded={isExpanded}
                              className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-100/70 transition-colors cursor-pointer"
                            >
                              <span>{faq.question}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-3.5 pt-1 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-200/70 bg-white">
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-slate-500">
              กลุ่มบริหารวิชาการ · โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPrintScope('all');
                  setIsPrintOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>พิมพ์รวมทุกบทบาท</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#0B1329] hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable View via PrintModalShell (prevents blank page / missing close button issues) */}
      <PrintModalShell
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={
          printScope === 'all'
            ? 'คู่มือการใช้งานระบบส่งเอกสารวิชาการ (ครบทุกบทบาท)'
            : `คู่มือการใช้งาน: ${activeManual.tabLabel}`
        }
        subtitle="โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"
        icon={<BookOpen className="w-4 h-4 text-amber-400" />}
        printButtonLabel="พิมพ์คู่มือ / บันทึก PDF"
        subHeader={
          <div className="flex items-center justify-between gap-3 text-xs text-slate-700">
            <span>ขอบเขตเอกสาร: {printScope === 'all' ? 'ครบทุกบทบาท (5 หมวด)' : activeManual.tabLabel}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPrintScope('active')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                  printScope === 'active'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                เฉพาะบทบาทที่เลือก
              </button>
              <button
                type="button"
                onClick={() => setPrintScope('all')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                  printScope === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                รวมทุกบทบาท
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6 text-slate-900 font-['Prompt',sans-serif]">
          <header className="border-b-2 border-slate-900 pb-4">
            <h1 className="text-xl font-bold text-slate-900">
              คู่มือการใช้งานระบบส่งเอกสารวิชาการออนไลน์
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </p>
          </header>

          {manualsToPrint.map((manual, mIdx) => (
            <section
              key={manual.id}
              className={`space-y-3 ${mIdx > 0 ? 'pt-6 border-t border-slate-300' : ''}`}
            >
              <div>
                <p className="text-[11px] font-semibold text-amber-800">{manual.audience}</p>
                <h2 className="text-base font-bold text-slate-900">{manual.title}</h2>
                <p className="text-xs text-slate-600 mt-0.5">{manual.description}</p>
              </div>

              <div className="space-y-2.5">
                {manual.steps.map((step) => (
                  <div
                    key={step.number}
                    className="border border-slate-300 rounded-lg p-3 space-y-1 break-inside-avoid"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900">
                        {step.number}. {step.title}
                      </h3>
                      {step.menuLocation && (
                        <span className="text-[10px] text-slate-500">{step.menuLocation}</span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-start pt-1">
                      <div className="flex-1 min-w-0 space-y-1">
                        <ul className="list-disc pl-5 space-y-0.5 text-xs text-slate-700">
                          {step.details.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                        {step.tip && (
                          <p className="text-[11px] text-slate-700 pt-0.5">
                            <strong>หมายเหตุ:</strong> {step.tip}
                          </p>
                        )}
                      </div>
                      <div className="w-full sm:w-[250px] shrink-0">
                        <UserManualVisual visualId={step.visualId} compact />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PrintModalShell>
    </>
  );
};
