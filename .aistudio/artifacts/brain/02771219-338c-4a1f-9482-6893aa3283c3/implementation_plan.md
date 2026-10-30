# ฟีเจอร์สร้างและคัดลอก Prompt สำหรับส่งให้ AI เจนภาพอินโฟกราฟิกสถิติการส่งงาน

สร้างปุ่มฟังก์ชันพิเศษบนหัวการ์ดกราฟเปรียบเทียบอัตราการส่งงาน 8 กลุ่มสาระการเรียนรู้ ที่ช่วยประมวลผลข้อมูลสถิติจริงในระบบ ณ ปัจจุบัน เป็นข้อความ Prompt คุณภาพสูงทั้งภาษาไทยและภาษาอังกฤษ เพื่อให้ผู้บริหารหรือครูฝ่ายวิชาการสามารถกดคัดลอก (1-Click Instant Copy) นำไปวางในเครื่องมือ AI สร้างภาพ (เช่น Midjourney, ChatGPT/DALL-E 3, Canva Magic Media, หรือ Gemini) เพื่อสร้างแผ่นภาพอินโฟกราฟิกสรุปผลงานระดับมืออาชีพตามอัตลักษณ์โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์

---

## User Review & Critical Decisions

> [!IMPORTANT] สรุปผลการยืนยันรูปแบบความต้องการจากผู้ใช้งาน
> - **การทำงานของปุ่ม**: ผู้ใช้เลือก **"ปุ่มที่กดแล้วจะคัดลอกพรอมต์ให้เลย"** (1-Click Copy to Clipboard พร้อม Toast แจ้งเตือนความสำเร็จ และมีปุ่มเปิดดู/ปรับแต่งเนื้อหา Prompt แบบละเอียดได้)
> - **สไตล์และโทนภาพของ Prompt**: ผู้ใช้เลือก **"สไตล์ทางการและอัตลักษณ์โรงเรียนวิทยาศาสตร์"** (โทนสีกรมท่า-น้ำเงินเข้ม Royal Navy, สีทอง Royal Gold, สีขาวสะอาดตา, จัดวางโครงสร้างภาพแบบ Academic Scientific Infographic Poster มีข้อมูลตัวเลขสถิติ 8 กลุ่มสาระ อัตราความสำเร็จ และสัดส่วนความตรงต่อเวลาอย่างแม่นยำ)

---

## 1. Overview & Core Concept

### What It Does
- ติดตั้งปุ่ม **"✨ คัดลอก Prompt ทำอินโฟกราฟิก (AI)"** ไว้ที่ส่วนควบคุมของหัวการ์ด Graph 1 (กราฟเปรียบเทียบอัตราการส่งงาน 8 กลุ่มสาระการเรียนรู้)
- เมื่อคลิกปุ่ม ระบบจะ:
  1. ดึงสถิติจริงของกลุ่มสาระการเรียนรู้ที่เลือกอยู่ (ครบทั้ง 8 กลุ่มสาระ หรือเฉพาะกลุ่มสาระที่เลือกเปรียบเทียบ)
  2. ดึงสถิติประเภทเอกสาร (ตามประเภทที่กรองอยู่ เช่น แผนการจัดการเรียนรู้, บันทึกหลังสอน ฯลฯ)
  3. คำนวณยอดครูทั้งหมด, จำนวนครูที่ส่งแล้ว, ร้อยละความสำเร็จรายกลุ่มสาระ, สัดส่วนตรงเวลา/ล่าช้า
  4. สร้าง Prompt ที่มีโครงสร้างละเอียด (Prompt Engineering) ทั้งฉบับภาษาไทย และฉบับภาษาอังกฤษสำหรับโมเดลระดับสากล เช่น Midjourney V6 / DALL-E 3
  5. **คัดลอกลง Clipboard ของผู้ใช้ทันที** พร้อมแสดง Toast แจ้งเตือนแบบโมเดิร์น
  6. มีปุ่มกดดูตัวอย่าง Prompt (Prompt Preview Modal) หากต้องการตรวจทานข้อความ, เลือกสลับระหว่าง Prompt ภาษาไทย/ภาษาอังกฤษ, หรือเพิ่มคำสั่งพิเศษก่อนนำไปใช้งาน

### Target Audience & Persona
- ผู้บริหารสถานศึกษา, รองผู้อำนวยการกลุ่มบริหารวิชาการ, และหัวหน้ากลุ่มสาระการเรียนรู้ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ ที่ต้องการสรุปรายงานผลการปฏิบัติงานเป็นภาพอินโฟกราฟิกสวยงามเพื่อนำเสนอในการประชุม หรือเผยแพร่บนสื่อประชาสัมพันธ์ของโรงเรียน

---

## 2. User Experience & Visual Design

### Key User Flows
1. **คลิกเดียวคัดลอก (Instant 1-Click Copy)**:
   - ผู้ใช้งานดูสถิติในกราฟเปรียบเทียบ แล้วกดปุ่ม `✨ คัดลอก Prompt ทำอินโฟกราฟิก (AI)`
   - ระบบคัดลอก Prompt ภาษาอังกฤษ (หรือภาษาไทยที่พร้อมใช้งานทันที) เข้าสู่ Clipboard ทันที
   - แสดง Toast นุ่มนวลมุมขวาบน: *"คัดลอก Prompt สำหรับ AI เจนอินโฟกราฟิกเรียบร้อยแล้ว!"*
2. **เปิดดูตัวอย่างและปรับแต่ง (Inspect & Customize Modal)**:
   - ข้างปุ่มคัดลอกด่วน มีปุ่มไอคอนเปิดหน้าต่างตรวจทาน `[📄 ดู Prompt]`
   - หน้าต่าง Modal แสดง Prompt ที่ดึงตัวเลขสถิติจริงมาใส่ในเทมเพลตอย่างเป็นระเบียบ
   - มีแท็บสลับ `Prompt ภาษาอังกฤษ (แนะนำสำหรับ Midjourney/DALL-E)` และ `Prompt ภาษาไทย (สำหรับ ChatGPT/Gemini)`
   - มีสวิตช์เลือกอัตราส่วนภาพสำหรับนำไปใช้งาน: `แนวตั้ง 4:5 / 9:16 (สำหรับโปสเตอร์/โซเชียล)` หรือ `แนวนอน 16:9 (สำหรับสไลด์นำเสนอ)`
   - มีปุ่ม `คัดลอกข้อความ` และ `บันทึกเป็นไฟล์ .txt`

### Visual Identity & Theme
- **Color Palette**: โทนสีกรมท่าลึก (`#0f172a`, `#1e3a8a`), ประกายทองวิชาการ (`#d97706`, `#f59e0b`), และพื้นหลังขาวนวลสะอาดตา สอดคล้องกับตราสัญลักษณ์โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย
- **Prompt Structure Specification**:
  - **Subject**: Official Educational Infographic Poster for Princess Chulabhorn Science High School Kalasin
  - **Visual Hierarchy**: Header with school crest and official academic semester report title, followed by 3 KPI metric cards, central comparative multi-bar infographic representing the 8 learning departments with exact percentages, and a bottom verification signature section.
  - **Color Direction**: Academic royal navy blue, deep sapphire, warm metallic gold, subtle cyan scientific graph gridlines.
  - **Typography & Style**: Crisp modern scientific typography, clean vector flat 2D graphic layout, high-end institutional annual report aesthetic.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real-Data Prompt Synthesizer (ใช้ข้อมูลสถิติจริง 100%)**
  - *เหตุผล*: ป้องกันปัญหา AI หลอนข้อมูลหรือตัวเลขขึ้นเอง โดยระบบจะรวบรวมตัวเลข % การส่งงานจริงของครูแต่ละกลุ่มสาระ และชื่อประเภทเอกสารที่กำลังคัดกรองอยู่ เข้าไปใน Prompt โดยอัตโนมัติ
- **Decision 2: Dual-Mode Action (1-Click Instant Copy + Preview Modal)**
  - *เหตุผล*: ตอบสนองความต้องการของผู้ใช้ที่ต้องการความรวดเร็ว ("กดแล้วจะคัดลอกให้เลย") พร้อมทั้งไม่ปิดกั้นผู้ใช้ที่ต้องการอ่านทบทวนหรือปรับแต่งคำสั่งเพิ่มเติม
- **Decision 3: Zero Dependency Overhead**
  - *เหตุผล*: ใช้ Web Clipboard API (`navigator.clipboard.writeText`) พร้อม Fallback ปกติ ทำงานได้รวดเร็วระดับมิลลิวินาทีโดยไม่ต้องติดตั้งไลบรารีภายนอกเพิ่มเติม

---

## 4. Technical Architecture & Component Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│ ExecutiveDashboard.tsx                                                 │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Graph 1 Header Toolbar                                             │ │
│ │                                                                    │ │
│ │ [✨ คัดลอก Prompt ทำอินโฟกราฟิก (AI)]  [👁️ ดู Prompt ทั้งหมด]      │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                  │                                     │
│                 ┌────────────────┴────────────────┐                    │
│                 ▼                                 ▼                    │
│      generateInfographicPrompt()       isPromptModalOpen State         │
│      - Gathers actual areaStats        - Opens InfographicPromptModal  │
│      - Gathers active docTypes         - Shows Thai & Eng Prompts      │
│      - Formats prompt text             - Customizes aspect ratio       │
│      - Copies directly to clipboard    - Downloads .txt summary        │
└────────────────────────────────────────────────────────────────────────┘
```

### Prompt Generation Formula (ตัวอย่างโครงสร้างข้อความ):
```text
Professional academic infographic poster in official scientific institutional style for Princess Chulabhorn Science High School Kalasin (โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์).
Header: "รายงานและเปรียบเทียบอัตราการส่งเอกสารทางวิชาการ ประจำปีการศึกษา 2568"
Key Metrics: Total Teachers [N] persons, Overall Submission Rate [N]%, On-Time Delivery [N]%.
Comparative Bar Chart of Learning Areas:
1. วิทยาศาสตร์และเทคโนโลยี: [N]% submission rate ([X]/[Y] teachers)
2. คณิตศาสตร์: [N]% submission rate
... [ครบทั้ง 8 กลุ่มสาระ พร้อมตัวเลขจริง]
Style: Royal navy blue, warm gold accents, clean white layout, crisp minimalist scientific graph aesthetics, high resolution 8k graphic design.
```

---

## Verification Plan

1. **การทำงานของปุ่มคัดลอก**: กดปุ่มแล้วข้อความ Prompt สถิติจริงถูกคัดลอกลง Clipboard ทันที พร้อมแสดง Toast แจ้งเตือน
2. **ความถูกต้องของข้อมูล**: ตรวจสอบว่าชื่อกลุ่มสาระและตัวเลข % ใน Prompt ตรงกับข้อมูลจริงบนหน้าจอ
3. **การแสดงผล Modal**: ตรวจสอบว่าสามารถกดเปิดดู Prompt, สลับแท็บภาษาไทย/อังกฤษ และเลือกปรับอัตราส่วนได้ถูกต้อง
4. **การตรวจสอบระบบ**: รัน `lint_applet` (`tsc --noEmit`) และ `compile_applet` ให้ผ่าน 100%
