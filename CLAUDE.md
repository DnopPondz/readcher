# StudyReader (ชื่อชั่วคราว)

เว็บไซต์ช่วยอ่านและเรียนรู้จากเอกสาร ผู้ใช้อัปโหลดไฟล์ PDF, Word, TXT หรือ Excel แล้วระบบจะดึงเนื้อหา แบ่งเป็นบทเรียน สรุปแบบคัดประโยค อ่านออกเสียง สร้างแฟลชการ์ดและแบบทดสอบ และค้นหารายละเอียดในเอกสารได้

ไฟล์นี้คือข้อกำหนดหลักของโปรเจกต์ อ่านให้ครบก่อนเริ่มงานทุกครั้ง

Next.js เวอร์ชันที่ใช้ (16) มี API ต่างจากเวอร์ชันเก่า ก่อนเขียนโค้ด Next.js ให้อ่านเอกสารใน `node_modules/next/dist/docs/` ตามที่ระบุใน AGENTS.md:

@AGENTS.md

---

## 1. กฎหลักที่ห้ามละเมิด

1. **ห้ามใช้ AI** ห้ามเรียก LLM API ใดๆ (Anthropic, OpenAI, Gemini ฯลฯ) ห้ามใช้โมเดล machine learning หรือ embedding และห้ามใช้บริการ AI ภายนอก ทุกฟีเจอร์ต้องทำด้วยอัลกอริทึมและโค้ดปกติ ถ้างานไหนดูเหมือนต้องใช้ AI ให้หยุดและถามก่อน
2. **ห้ามเก็บไฟล์อัปโหลดใน `public/`** ไฟล์ต้องอยู่ใน `STORAGE_DIR` นอกโปรเจกต์เว็บ และส่งให้ผู้ใช้ผ่าน API ที่ตรวจสิทธิ์แล้วเท่านั้น
3. **ทุก query ที่เกี่ยวกับเอกสารต้องกรองด้วย `userId`** ผู้ใช้ต้องเห็นเฉพาะข้อมูลของตัวเอง ทั้งใน PostgreSQL และ Meilisearch
4. **ห้ามบันทึกเนื้อหาเอกสารลง log** log ได้เฉพาะ id, สถานะ, ขนาดไฟล์ และข้อความ error ที่ไม่มีเนื้อหาเอกสาร
5. **ห้ามสั่งรันเนื้อหาจากไฟล์อัปโหลด** และห้ามประมวลผลมาโคร
6. **งานหนักต้องรันใน worker** การอ่านไฟล์ สรุป และสร้างดัชนี ห้ามทำใน request ของ Next.js
7. **ก่อนเพิ่ม dependency ใหม่ ให้อธิบายเหตุผลสั้นๆ** และเลือกไลบรารีที่ยังมีการดูแลอยู่

---

## 2. Tech Stack

| ส่วน | เครื่องมือ |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict mode) |
| UI | Tailwind CSS + shadcn/ui |
| ฐานข้อมูล | PostgreSQL + Prisma |
| ค้นหา | Meilisearch |
| Queue | BullMQ + Redis |
| Auth | Auth.js (credentials + email) |
| Validation | Zod |
| แสดง PDF | react-pdf |
| อ่านออกเสียง | Web Speech API (`speechSynthesis`) ฝั่งเบราว์เซอร์ |
| 3D (Phase 4) | three.js ผ่าน `@react-three/fiber`, `@react-three/drei`, `react-force-graph-3d` |
| ทดสอบ | Vitest (unit), Playwright (e2e) |
| Infra สำหรับ dev | Docker Compose (postgres, redis, meilisearch, clamav) |

ไลบรารีอ่านไฟล์ฝั่ง worker:

| ชนิดไฟล์ | ไลบรารี |
|---|---|
| PDF | `pdfjs-dist` (ดึงข้อความพร้อมเลขหน้าและ outline) |
| DOCX | `mammoth` (แปลงเป็น HTML โดยเก็บ Heading ไว้) |
| XLSX, CSV | `exceljs` |
| TXT | `chardet` + `iconv-lite` (รองรับ UTF-8 และ TIS-620) |
| ตรวจชนิดไฟล์ | `file-type` (magic bytes) |
| ตรวจ ZIP | `yauzl` (นับขนาดหลังแตกไฟล์และจำนวน entry) |
| สแกนมัลแวร์ | `clamscan` เชื่อมกับ ClamAV daemon |

ใช้เวอร์ชันเสถียรล่าสุดของทุกแพ็กเกจ และตรวจเอกสารของเวอร์ชันที่ติดตั้งจริงก่อนเขียนโค้ด โดยเฉพาะ Next.js และ Auth.js ที่ API เปลี่ยนบ่อย

---

## 3. โครงสร้างโปรเจกต์

```
/
├── CLAUDE.md
├── docker-compose.yml
├── .env.example
├── prisma.config.ts                           # Prisma 7: ที่ตั้ง schema, migrations และ DATABASE_URL
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── proxy.ts                               # Next.js 16 (แทน middleware): CSP nonce + redirect หน้าที่ต้องล็อกอิน
│   ├── generated/prisma/                      # Prisma client (generate อัตโนมัติ อยู่ใน .gitignore)
│   ├── types/next-auth.d.ts                   # เพิ่ม session.user.id
│   ├── app/
│   │   ├── (auth)/login/  (auth)/register/
│   │   ├── (app)/library/                     # รายการเอกสารของผู้ใช้
│   │   ├── (app)/documents/[id]/              # ภาพรวมเอกสารและรายการบท
│   │   ├── (app)/documents/[id]/lessons/[lessonId]/   # หน้าอ่าน + สรุป + อ่านออกเสียง
│   │   ├── (app)/flashcards/
│   │   ├── (app)/quiz/[lessonId]/
│   │   └── api/
│   │       ├── upload/route.ts                # รับไฟล์แบบ stream
│   │       ├── files/[id]/route.ts            # ส่งไฟล์ต้นฉบับหลังตรวจสิทธิ์
│   │       ├── documents/[id]/route.ts        # GET, DELETE
│   │       └── search/route.ts                # ค้นหาผ่าน Meilisearch
│   ├── components/
│   │   ├── reader/  tts/  flashcards/  quiz/  upload/  three/
│   ├── lib/
│   │   ├── db.ts  auth.ts  storage.ts  queue.ts  search.ts  rate-limit.ts
│   │   ├── auth.config.ts   # ส่วนของ Auth.js ที่ proxy ใช้ได้ (ห้าม import DB, argon2, Redis)
│   │   ├── session.ts       # requireUser() ตรวจสิทธิ์จริงก่อนแตะข้อมูลผู้ใช้ทุกครั้ง
│   │   ├── limits.ts        # ค่า rate limit ทั้งหมด + ผูกกับ Redis
│   │   ├── env.ts  redis.ts  password.ts  csp.ts  request-ip.ts  safe-redirect.ts
│   │   └── validation/
│   └── messages/th.json                       # ข้อความ UI แยกไว้ เพิ่มภาษาอังกฤษภายหลัง
├── worker/
│   ├── index.ts
│   ├── jobs/        scan.ts  extract.ts  structure.ts  analyze.ts  index-search.ts
│   ├── parsers/     pdf.ts  docx.ts  xlsx.ts  txt.ts
│   └── nlp/         segment.ts  stopwords.ts  tfidf.ts  textrank.ts
│                    definitions.ts  cloze.ts  mcq.ts  leitner.ts
├── tests/
│   ├── fixtures/    # ไฟล์ตัวอย่างภาษาไทยและอังกฤษ ทุกชนิด รวมไฟล์อันตรายสำหรับทดสอบ
│   └── unit/  e2e/
└── storage/         # อยู่ใน .gitignore ใช้ตอน dev เท่านั้น
```

---

## 4. Pipeline การประมวลผลเอกสาร

สถานะเอกสาร: `UPLOADED → SCANNING → PROCESSING → READY` หรือ `REJECTED` / `FAILED`

1. **upload** (Next.js route): ตรวจสิทธิ์, rate limit, ขนาดไฟล์, นามสกุล, magic bytes แล้ว stream ลง `STORAGE_DIR` ด้วยชื่อสุ่ม จากนั้นสร้าง record และส่ง job `scan`
2. **scan**: สแกน ClamAV และตรวจ ZIP สำหรับ DOCX/XLSX ถ้าไม่ผ่านให้ตั้ง `REJECTED` และลบไฟล์
3. **extract**: เรียก parser ตามชนิดไฟล์ ได้ผลลัพธ์รูปแบบเดียวกัน (ดูหัวข้อ 4.1)
4. **structure**: แบ่งเป็นบทเรียนและ passage
5. **analyze**: คำนวณ TF-IDF, คำสำคัญ, สรุป, แฟลชการ์ด และคำถาม
6. **index-search**: ส่ง passage เข้า Meilisearch แล้วตั้งสถานะ `READY`

ทุก job ต้องมี timeout (ค่าเริ่มต้น 120 วินาที), retry สูงสุด 2 ครั้ง และถ้าล้มเหลวให้ตั้ง `FAILED` พร้อมข้อความ error ที่ผู้ใช้เข้าใจได้

### 4.1 รูปแบบผลลัพธ์ของ parser

```ts
type ExtractedDoc = {
  pageCount?: number;
  outline?: { title: string; level: number; page?: number }[];
  blocks: {
    type: "heading" | "paragraph" | "table" | "list";
    level?: number;        // สำหรับ heading
    text: string;
    page?: number;
    bold?: string[];       // คำที่เป็นตัวหนาใน block นี้
  }[];
  sheets?: { name: string; headers: string[]; rows: string[][] }[]; // Excel
};
```

### 4.2 การแบ่งบทเรียน (เรียงตามลำดับความสำคัญ)

1. Heading 1 และ Heading 2 จาก DOCX
2. Outline (bookmark) จาก PDF ผ่าน `getOutline()`
3. รูปแบบข้อความ เช่น `^บทที่\s*\d+`, `^Chapter\s+\d+`, `^ส่วนที่\s*\d+`
4. ถ้าไม่พบเลย: แบ่งทุกประมาณ 1,500 คำ โดยตัดที่ขอบย่อหน้า

---

## 5. ข้อกำหนด NLP (ไม่ใช้ AI)

### 5.1 การตัดคำและประโยค (`nlp/segment.ts`)

- ตัดคำด้วย `Intl.Segmenter` locale `"th"` หรือ `"en"` ตามภาษาของข้อความ ใช้เฉพาะ segment ที่ `isWordLike`
- ตรวจภาษาแบบง่าย: ถ้าตัวอักษรไทย (U+0E00 ถึง U+0E7F) มากกว่า 30% ถือเป็นภาษาไทย
- แปลงภาษาอังกฤษเป็นตัวพิมพ์เล็ก และตัด stopword ทั้งไทยและอังกฤษ (`nlp/stopwords.ts`)
- ตัดประโยคภาษาอังกฤษด้วย `Intl.Segmenter` แบบ `"sentence"`
- ภาษาไทยไม่มีเครื่องหมายจบประโยค ให้ตัดที่การขึ้นบรรทัดใหม่ และที่ช่องว่างระหว่างข้อความ (ภาษาไทยใช้ช่องว่างคั่นประโยคหรือวลี) แล้วรวมช่วงที่สั้นกว่า 5 คำเข้ากับช่วงถัดไป

### 5.2 TF-IDF (`nlp/tfidf.ts`)

- ถือแต่ละบทเรียนเป็นหนึ่ง "เอกสาร" ในการคำนวณ IDF ภายในไฟล์เดียวกัน
- `tf = จำนวนครั้งของคำ / จำนวนคำทั้งหมดในบท`
- `idf = ln((N + 1) / (df + 1)) + 1`

### 5.3 สรุปแบบคัดประโยค (`nlp/textrank.ts`)

- สร้างเวกเตอร์ TF-IDF ของแต่ละประโยค และหาความคล้ายด้วย cosine similarity
- รัน PageRank: damping 0.85, สูงสุด 30 รอบ หรือหยุดเมื่อเปลี่ยนแปลงน้อยกว่า 1e-4
- ข้ามประโยคที่สั้นกว่า 5 คำหรือยาวกว่า 60 คำ
- เลือก `min(5, ceil(จำนวนประโยค × 0.1))` ประโยค และอย่างน้อย 1 ประโยค
- แสดงตามลำดับเดิมในเอกสาร และเก็บ id ของ passage ต้นทางเพื่อให้คลิกกลับไปอ่านได้

### 5.4 คำสำคัญ

- 10 คำที่มีค่า TF-IDF สูงสุดต่อบท
- คูณคะแนน 1.5 ถ้าคำนั้นเป็นตัวหนาหรืออยู่ใน heading
- ตัดคำที่ยาว 1 ตัวอักษรและตัวเลขล้วนออก

### 5.5 แฟลชการ์ด (`nlp/definitions.ts`)

ตรวจจับรูปแบบนิยามระดับประโยค:

- อังกฤษ: `^(.{2,60}?)\s+(is|are|means|refers to|is defined as)\s+(.{10,300})$`
- ไทย: `^(.{2,60}?)\s*(คือ|หมายถึง|หมายความว่า|เรียกว่า)\s*(.{10,300})$`

ด้านหน้าคือคำ ด้านหลังคือนิยาม สำหรับ Excel ที่มี 2 คอลัมน์ ให้ผู้ใช้เลือกได้ว่าจะแปลงเป็นการ์ด (คอลัมน์ A = หน้า, คอลัมน์ B = หลัง)

### 5.6 แบบทดสอบ

- **เติมคำ** (`nlp/cloze.ts`): เลือกประโยคจากสรุปที่มีคำสำคัญ แทนคำนั้นด้วย `_____` คำตอบคือคำที่ถูกลบ
- **ปรนัย** (`nlp/mcq.ts`): ใช้คำถามเติมคำ เพิ่มตัวเลือกผิด 3 ตัวจากคำสำคัญอื่นในเอกสารเดียวกัน เลือกคำที่ความยาวใกล้เคียงกัน แล้วสุ่มลำดับ
- ถ้าเอกสารมีคำสำคัญไม่พอ 4 คำ ไม่ต้องสร้างแบบปรนัย

### 5.7 การทบทวนแบบ Leitner (`nlp/leitner.ts`)

- มี 5 กล่อง ช่วงทบทวน 1, 2, 4, 8 และ 16 วัน
- ตอบถูก: เลื่อนขึ้น 1 กล่อง ตอบผิด: กลับไปกล่อง 1
- `dueAt = วันนี้ + ช่วงของกล่องใหม่`

### 5.8 การค้นหา

- index ชื่อ `passages` มี field: `id, userId, documentId, lessonId, page, text`
- ตั้ง `userId` และ `documentId` เป็น filterable และ **ทุกการค้นหาต้องใส่ filter `userId` ฝั่งเซิร์ฟเวอร์**
- ห้ามส่ง Meilisearch master key หรือ search key ไปที่เบราว์เซอร์ ให้ค้นผ่าน `/api/search` เท่านั้น
- แสดงผล 3 อันดับแรก พร้อมไฮไลต์คำที่ค้น ชื่อบท และเลขหน้า
- ทดสอบการค้นหาภาษาไทยด้วย fixture ก่อน ถ้าผลลัพธ์ไม่ดีให้เพิ่ม field `tokens` ที่ตัดคำด้วย `Intl.Segmenter` แล้วคั่นด้วยช่องว่าง

---

## 6. Database Schema (ร่างแรก)

```prisma
enum DocStatus { UPLOADED SCANNING PROCESSING READY REJECTED FAILED }
enum CardSource { DEFINITION EXCEL MANUAL }
enum QuestionType { CLOZE MCQ }

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String?
  passwordHash String?
  createdAt    DateTime   @default(now())
  documents    Document[]
  flashcards   Flashcard[]
  attempts     QuizAttempt[]
  progress     ReadingProgress[]
}

model Document {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  originalName String
  mimeType     String
  sizeBytes    Int
  storageKey   String    @unique
  status       DocStatus @default(UPLOADED)
  language     String?
  pageCount    Int?
  errorMessage String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lessons      Lesson[]
  passages     Passage[]
  flashcards   Flashcard[]
  @@index([userId, status])
}

model Lesson {
  id         String    @id @default(cuid())
  documentId String
  document   Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  order      Int
  title      String
  startPage  Int?
  endPage    Int?
  summaryPassageIds String[]
  passages   Passage[]
  keyTerms   KeyTerm[]
  questions  QuizQuestion[]
  progress   ReadingProgress[]
  @@unique([documentId, order])
}

model Passage {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  lessonId   String
  lesson     Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  order      Int
  text       String
  page       Int?
  @@index([lessonId, order])
}

model KeyTerm {
  id       String @id @default(cuid())
  lessonId String
  lesson   Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  term     String
  score    Float
  @@index([lessonId])
}

model Flashcard {
  id         String     @id @default(cuid())
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  documentId String
  document   Document   @relation(fields: [documentId], references: [id], onDelete: Cascade)
  lessonId   String?
  front      String
  back       String
  source     CardSource
  box        Int        @default(1)
  dueAt      DateTime   @default(now())
  @@index([userId, dueAt])
}

model QuizQuestion {
  id        String       @id @default(cuid())
  lessonId  String
  lesson    Lesson       @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  type      QuestionType
  prompt    String
  answer    String
  options   Json?
  passageId String?
  attempts  QuizAttempt[]
}

model QuizAttempt {
  id         String       @id @default(cuid())
  userId     String
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId String
  question   QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  correct    Boolean
  createdAt  DateTime     @default(now())
}

model ReadingProgress {
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId    String
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  lastPassage Int       @default(0)
  completedAt DateTime?
  @@id([userId, lessonId])
}
```

ข้อมูล Excel (Phase 4) ให้เก็บเป็นไฟล์ JSON ใน `STORAGE_DIR` และเก็บเฉพาะ metadata ใน DB

---

## 7. ความปลอดภัยและ PDPA

### การอัปโหลด

- นามสกุลที่รับ: `.pdf .docx .txt .xlsx .csv` เท่านั้น
- ปฏิเสธ `.docm .xlsm .doc .xls` และไฟล์ที่ magic bytes ไม่ตรงกับนามสกุล
- ขนาดสูงสุดตาม `MAX_UPLOAD_MB` (ค่าเริ่มต้น 50)
- DOCX/XLSX: ขนาดหลังแตกไฟล์รวมไม่เกิน 200 MB, ไม่เกิน 10,000 entry และปฏิเสธถ้ามี `vbaProject.bin`
- Rate limit: ไม่เกิน 20 ไฟล์ต่อผู้ใช้ต่อชั่วโมง
- ชื่อไฟล์ที่เก็บจริงใช้ UUID ส่วนชื่อเดิมเก็บใน DB และ sanitize ก่อนแสดงผล

### เว็บ

- HTTPS ทุกหน้า, cookie แบบ `HttpOnly`, `Secure`, `SameSite=Lax`
- ตั้ง security headers: CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`
- ตอนส่งไฟล์ต้นฉบับใช้ `Content-Disposition: attachment` ยกเว้น PDF ที่แสดงผ่าน react-pdf
- ตรวจ input ทุกตัวด้วย Zod
- hash รหัสผ่านด้วย argon2 หรือ bcrypt

### PDPA และข้อมูลผู้ใช้

- มีหน้าความยินยอมและข้อกำหนดการใช้งาน รวมถึงเรื่องลิขสิทธิ์ของเอกสารที่อัปโหลด
- การลบเอกสารต้องลบครบ 3 ที่: ไฟล์ใน storage, record ใน DB และข้อมูลใน Meilisearch
- มีปุ่ม "ลบบัญชีและข้อมูลทั้งหมด"
- ตั้งค่าระยะเวลาเก็บข้อมูลได้ (`RETENTION_DAYS`) และมี cron ลบเอกสารที่หมดอายุ
- ห้าม log เนื้อหาเอกสาร (ดูกฎข้อ 4)

---

## 8. Environment Variables (`.env.example`)

```
DATABASE_URL=postgresql://app:app@localhost:5432/studyreader
REDIS_URL=redis://localhost:6379
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=change-me
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
AUTH_SECRET=change-me            # อย่างน้อย 32 ตัวอักษร สร้างด้วย npx auth secret
# AUTH_URL=https://...           # production หลัง reverse proxy ให้ตั้งค่านี้ หรือ AUTH_TRUST_HOST=true
STORAGE_DIR=./storage
MAX_UPLOAD_MB=50
RETENTION_DAYS=365
```

---

## 9. คำสั่ง

```
docker compose up -d        # postgres, redis, meilisearch, clamav
npm install                 # รัน prisma generate อัตโนมัติ (postinstall)
npx prisma migrate dev
npm run dev                 # Next.js
npm run worker              # BullMQ worker (tsx watch worker/index.ts) เพิ่มใน Phase 1
npm run lint
npm run typecheck           # next typegen && tsc --noEmit
npm run test                # vitest
npm run test:e2e            # playwright
npm run format              # prettier
```

- e2e ที่ต้องใช้ DB และ Redis จะข้ามไว้ ถ้าจะรันให้ตั้ง `E2E_WITH_SERVICES=1` หลัง `docker compose up -d`
- ถ้าดาวน์โหลดเบราว์เซอร์ของ Playwright ไม่ได้ ให้ตั้ง `PW_CHANNEL=msedge` (หรือ `chrome`) เพื่อใช้เบราว์เซอร์ที่ติดตั้งในเครื่อง

---

## 10. แนวทางการเขียนโค้ด

- TypeScript strict ห้ามใช้ `any` ถ้าจำเป็นให้ใช้ `unknown` แล้วตรวจชนิด
- ชื่อตัวแปร ฟังก์ชัน และ comment ในโค้ดเป็นภาษาอังกฤษ ส่วนข้อความ UI อยู่ใน `src/messages/th.json`
- ฟังก์ชันใน `worker/nlp/` ต้องเป็น pure function และมี unit test ทั้งข้อความไทยและอังกฤษ
- Server Component เป็นค่าเริ่มต้น ใช้ `"use client"` เฉพาะส่วนที่ต้องโต้ตอบ (reader, tts, quiz, three)
- คอมโพเนนต์ three.js ต้องโหลดด้วย `next/dynamic` และ `ssr: false` และต้องมีมุมมอง 2D สำรอง
- รองรับ `prefers-reduced-motion` และมือถือ
- ทำงานทีละ task ในหัวข้อ 11 จบแต่ละ task ด้วยการรัน lint, typecheck และ test ให้ผ่าน แล้วติ๊ก checkbox ในไฟล์นี้

### Definition of Done ของแต่ละ task

- [ ] โค้ดผ่าน lint, typecheck และ test
- [ ] มี test สำหรับ logic ใหม่
- [ ] ตรวจสิทธิ์ `userId` แล้วในทุก endpoint ที่เกี่ยวข้อง
- [ ] ไม่มีเนื้อหาเอกสารใน log
- [ ] อัปเดต CLAUDE.md ถ้ามีการตัดสินใจหรือเปลี่ยนแปลงโครงสร้าง

---

## 11. แผนงาน

### Phase 0: ตั้งค่าโปรเจกต์

- [x] สร้างโปรเจกต์ Next.js + TypeScript + Tailwind + shadcn/ui
- [x] ตั้งค่า ESLint, Prettier, Vitest, Playwright
- [x] สร้าง `docker-compose.yml` และ `.env.example`
- [x] ตั้งค่า Prisma และ migration แรกตามหัวข้อ 6
- [x] ระบบ Auth (สมัคร ล็อกอิน ออกจากระบบ)
- [x] security headers และ rate limit พื้นฐาน

> หมายเหตุ (2026-10-01): เครื่อง dev ที่สร้าง Phase 0 ยังไม่มี Docker จึงยังไม่ได้รัน `docker compose`, `prisma migrate dev` และ `tests/e2e/auth.spec.ts` กับบริการจริง ต้องรันทั้งสามอย่างให้ผ่านก่อนเริ่ม Phase 1
> งานค้างจาก Phase 0: เข้าสู่ระบบด้วยอีเมล (magic link) ต้องใช้ SMTP และ Prisma adapter ของ Auth.js จะเพิ่มเมื่อมีค่า SMTP

### Phase 1: MVP (อัปโหลด อ่าน ฟัง ค้นหา)

- [ ] `/api/upload` แบบ stream พร้อมการตรวจไฟล์ทั้งหมดในหัวข้อ 7
- [ ] worker และ job `scan`
- [ ] parser สำหรับ PDF, DOCX, TXT ตามรูปแบบหัวข้อ 4.1
- [ ] job `structure` แบ่งบทตามหัวข้อ 4.2
- [ ] หน้า Library แสดงเอกสารและสถานะ (อัปเดตสถานะแบบ polling)
- [ ] หน้าอ่าน: แสดงทีละบท ปรับขนาดตัวอักษร โหมดมืด
- [ ] อ่านออกเสียงด้วย Web Speech API ไฮไลต์ประโยคที่กำลังอ่าน ปรับความเร็ว เลือกเสียงไทยหรืออังกฤษ
- [ ] job `index-search` และหน้าค้นหาที่แสดงเลขหน้าและไฮไลต์
- [ ] ลบเอกสาร (ครบ 3 ที่)

### Phase 2: ชั้นการเรียนรู้

- [ ] `nlp/segment.ts` + stopwords ไทยและอังกฤษ
- [ ] `nlp/tfidf.ts` และคำสำคัญ
- [ ] `nlp/textrank.ts` และแสดงสรุปในหน้าบทเรียน คลิกประโยคแล้วไปยังตำแหน่งเดิม
- [ ] บันทึกความคืบหน้าการอ่าน

### Phase 3: เครื่องมือทบทวน

- [ ] สร้างแฟลชการ์ดจากนิยาม และแก้ไขหรือเพิ่มการ์ดเองได้
- [ ] ระบบ Leitner และหน้า "การ์ดที่ต้องทบทวนวันนี้"
- [ ] แบบทดสอบเติมคำและปรนัย พร้อมลิงก์กลับไปยังข้อความต้นทาง
- [ ] แดชบอร์ดความคืบหน้า (บทที่อ่านแล้ว คะแนน การ์ดที่ค้าง)

### Phase 4: ส่วนเสริม

- [ ] parser XLSX/CSV, หน้าดูตารางที่เรียงและกรองได้ และสถิติคอลัมน์
- [ ] แปลง Excel 2 คอลัมน์เป็นแฟลชการ์ด
- [ ] Concept map 3D ด้วย three.js (เชื่อมคำสำคัญที่อยู่ในย่อหน้าเดียวกัน) พร้อมมุมมอง 2D สำรอง
- [ ] cron ลบข้อมูลตาม `RETENTION_DAYS`
- [ ] ข้อความ UI ภาษาอังกฤษ
- [ ] OCR สำหรับ PDF ที่สแกน: **ต้องขออนุมัติก่อน** เพราะ Tesseract 4+ ใช้ machine learning ภายใน ซึ่งขัดกับกฎข้อ 1

---

## 12. การ Deploy

- ตั้ง `output: "standalone"` ใน `next.config` 
- **Plesk**: ใช้ Node.js extension รัน Next.js ส่วน PostgreSQL, Redis, Meilisearch และ ClamAV ใช้ Docker extension ของ Plesk หรือติดตั้งผ่าน SSH ตั้ง `client_max_body_size` ใน "Additional nginx directives" ให้มากกว่า `MAX_UPLOAD_MB`
- **Linux server**: ใช้ PM2 รัน 2 process (`web` และ `worker`), nginx เป็น reverse proxy, Let's Encrypt สำหรับ HTTPS และ Docker Compose สำหรับบริการอื่น
- `STORAGE_DIR` ต้องอยู่นอก document root และรวมอยู่ในแผน backup เดียวกับฐานข้อมูล
- reverse proxy ต้องตั้ง `proxy_set_header X-Real-IP $remote_addr;` เพราะ rate limit ใช้ IP จาก header นี้ และต้องตั้ง `AUTH_URL` เป็น URL จริงของเว็บ
- Redis ต้องใช้ `maxmemory-policy noeviction` (BullMQ ต้องการ)
- ห้าม expose พอร์ตของ PostgreSQL, Redis, Meilisearch และ ClamAV ออกอินเทอร์เน็ต

---

## 13. บันทึกการตัดสินใจ

บันทึกการตัดสินใจสำคัญไว้ที่นี่ (วันที่, สิ่งที่ตัดสินใจ, เหตุผล)

- เริ่มต้น: ไม่ใช้ AI ทุกส่วน ใช้การสรุปแบบคัดประโยค (TextRank) และค้นหาแบบ full-text แทนการตอบคำถามด้วย AI
- 2026-10-01, เวอร์ชันหลัก: Next.js 16.3, React 19.2, Prisma 7.10 (tag `latest` บน npm เป็น 8.0 RC จึงยังไม่ใช้), Auth.js `next-auth@5.0.0-beta.32` (ล็อกเวอร์ชันตรงตัวเพราะเป็น beta), Zod 4, Vitest 5, Tailwind 4
- 2026-10-01, Next.js 16 เปลี่ยน `middleware.ts` เป็น `src/proxy.ts` ใช้สร้าง CSP แบบ nonce ต่อ request ผลคือทุกหน้าต้อง render แบบ dynamic (root layout เรียก `connection()`)
- 2026-10-01, CSP: script ใช้ nonce + `strict-dynamic` ส่วน style อนุญาต `'unsafe-inline'` เพราะ UI primitive ตั้ง `style` attribute ที่ nonce ครอบไม่ได้ API ใช้ CSP `default-src 'none'`
- 2026-10-01, Auth: credentials + JWT session 7 วัน ไม่ใช้ adapter ตอนนี้ `requireUser()` อ่าน user จาก DB ซ้ำทุก request เพื่อให้บัญชีที่ถูกลบใช้ JWT เดิมต่อไม่ได้ proxy เป็นแค่การตรวจเบื้องต้น
- 2026-10-01, รหัสผ่าน: argon2id ผ่าน `@node-rs/argon2` ค่า OWASP (m=19456, t=2, p=1) นโยบายตาม NIST 800-63B (8 ถึง 128 ตัวอักษร ไม่บังคับรูปแบบ) และ verify กับ hash หลอกเมื่อไม่พบอีเมลเพื่อลดการเดาอีเมลจากเวลาตอบสนอง
- 2026-10-01, Rate limit: fixed window ใน Redis ผ่าน `ioredis` (BullMQ ใช้ ioredis อยู่แล้ว) hash ตัวระบุ (อีเมล, IP) ก่อนเก็บ ทำใน `authorize()` เพราะ `/api/auth/callback/credentials` เรียกตรงได้ ถ้า Redis ล่มจะปฏิเสธ (fail closed) ค่าปัจจุบัน: login 30/15 นาทีต่อ IP และ 10/15 นาทีต่ออีเมล, สมัคร 5/ชั่วโมงต่อ IP, upload 20/ชั่วโมงต่อผู้ใช้
- 2026-10-01, Prisma 7 ไม่โหลด `.env` เอง จึงใช้ `process.loadEnvFile()` ของ Node ใน `prisma.config.ts` แทนการเพิ่ม dotenv และใช้ `overrides` ใน package.json แก้ช่องโหว่ใน Prisma CLI (`deepmerge-ts`, `mysql2`)
- 2026-10-01, shadcn/ui ใช้ style `base-nova` (Base UI) และแพ็กเกจ `cn` ของ shadcn แทน clsx + tailwind-merge ฟอนต์ใช้ Noto Sans Thai ผ่าน `next/font` (โฮสต์เอง ไม่ละเมิด CSP)
- 2026-10-01, dependency ที่เพิ่มนอกตาราง Tech Stack: `ioredis` (rate limit), `@node-rs/argon2` (hash รหัสผ่าน), `server-only` (กันโค้ดเซิร์ฟเวอร์หลุดไป client), `prettier` + `eslint-config-prettier`
