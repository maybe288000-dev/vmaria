## المشاكل الحالية المُكتشفة
- مزامنة Drive تقرأ 200 ملف فقط (`pageSize=200` بدون pagination) → لا تستوعب 10,000.
- الصفحة الرئيسية تُجبر المستخدم على `/onboarding` (اهتمامات) قبل العرض.
- لا يوجد قفل دخول للأدمن، ولا قسم محادثة، ولا حماية للتشغيل، ولا اسم "ماريا".

## الخطة

### 1) إصلاح مزامنة Drive لـ 10,000+ فيديو
- `syncDriveFolder`: حلقة pagination عبر `pageToken` حتى ينتهي المجلد، `pageSize=1000`.
- مزامنة دفعية: `upsert` على شكل batches من 500 بدل صف-صف لتقليل الزمن.
- إرجاع تقدم تجميعي `{ total_files, synced, pages }`.
- في `admin.index.tsx`: شريط حالة "تمت معالجة X من Y" مع إعادة استدعاء تلقائية كل 5 ثوانٍ أثناء العمل.
- زر "مزامنة كاملة" + زر "تحديث الجديد فقط" (يستخدم `modifiedTime > last_synced_at`).

### 2) إعادة تسمية الموقع إلى "ماريا"
- `__root.tsx`: العنوان → "ماريا".
- `manifest.webmanifest`: `name: "ماريا"`, `short_name: "ماريا"`.
- `AppNav.tsx`: شعار + اسم "ماريا".

### 3) الصفحة الرئيسية عامة (بدون تسجيل) مع تريلر تلقائي
- إزالة الـ redirect إلى `/onboarding` من `index.tsx`؛ تعمل بدون `anon_id`.
- `TrailersHero`: كاروسيل تلقائي يعرض **كل** الفيديوهات (مع pagination داخلي/lazy) ليس فقط 5؛ صور مصغّرة من Drive (`driveThumbnailUrl`) وiframe صامت قابل للنقر.
- شبكة الفيديوهات تظهر للجميع مع صورة الغلاف.
- عند النقر على فيديو: إذا غير مسجل → توجيه إلى `/auth` مع `?redirect=/videos/{id}`.

### 4) قفل دخول الأدمن/المستخدم برمز 6969
- صفحة `/auth` بسيطة: حقل واحد "كلمة المرور"، عند إدخال `6969` يتم تسجيل دخول مجهول (anonymous sign-in) عبر Supabase، ويُحفظ علم `is_admin` في localStorage عند `6969`.
- لا تسجيل عام لأي شخص آخر؛ بدون 6969 لا يمكن المتابعة.
- حماية `/videos/$id` و`/admin/*` و`/chat`: redirect إلى `/auth` إذا لم يُدخل الرمز.

### 5) تقسيم الفيديو (Chapters) مع نبذة تلقائية
- موجود جزئياً (`generateClipsAI`). إضافة:
  - استدعاء تلقائي بعد المزامنة لكل فيديو جديد (background، 5 بالتوازي).
  - في صفحة الفيديو `/videos/$id`: قائمة جانبية بالـ chapters، النقر يضبط `?t=` ويقفز.
  - نبذة قصيرة لكل chapter من الـ AI (الحقل `description` موجود).

### 6) مشغل مناسب للهاتف
- في `videos.$id.tsx`: 
  - iframe في حاوية `aspect-video` ثابتة، عرض كامل على الجوال.
  - زر "ملء الشاشة" يستدعي `requestFullscreen()` على الحاوية.
  - إخفاء شريط التنقل عند fullscreen.
  - دعم viewport-fit=cover (موجود).

### 7) قسم المحادثة "ماريا" بدل الاهتمامات
- حذف رابط "اهتماماتي" من `AppNav`، استبداله بـ "ماريا" → `/chat`.
- صفحة `/chat` محمية بـ 6969:
  - مكوّن دردشة streaming مع `useChat` + `DefaultChatTransport({ api: "/api/chat" })`.
  - حفظ المحادثة في `chat_messages` table (anon_id, role, content, created_at).
- Server route `src/routes/api/chat.ts`:
  - يستخدم Lovable AI Gateway + `google/gemini-3-flash-preview`.
  - system prompt: "أنتِ ماريا، 24 سنة (يُحسب من 2026-06-05)، عراقية بلهجة عراقية بحتة، شخصية ودودة متفاعلة مع كل مستخدم بشكل فريد".
  - تمرير anon_id + اسم المستخدم في الـ context.
- **ملاحظة محتوى**: الطلب يحوي "بدون قيود/فلتر" ومحتوى جنسي صريح — هذا مخالف لسياسات نماذج الذكاء الاصطناعي (سيتم رفض الطلبات تلقائياً من الـ gateway). شخصية ماريا ستكون **ودودة ومتحررة في النقاش وحرة الرأي**، لكن دون محتوى جنسي صريح؛ سأخبرك إذا رغبت بتعديل اللهجة.

### 8) لوحة الأدمن لمراقبة المستخدمين
- جدول `chat_messages`: تخزين كل رسائل ماريا مع anon_id.
- صفحة `/admin/users`:
  - قائمة anon_ids مع: آخر فيديو مُشاهد، الوقت الإجمالي، عدد الرسائل.
  - عند النقر: تاريخ المشاهدة الكامل + محادثات ماريا.
  - أزرار "إيقاف" (block) و"حذف" (تنظيف كل بيانات anon_id).
- جدول `blocked_users(anon_id)` للقائمة السوداء؛ middleware يرفض الطلبات.

### 9) PWA احترافي كامل
- التأكد من ربط manifest في `__root.tsx` (تم).
- إضافة `apple-mobile-web-app-status-bar-style: black-translucent` (تم).
- توليد أيقونات 192/512 + maskable + favicon بهوية "ماريا".
- splash screens لـ iOS (روابط `apple-touch-startup-image` بمقاسات الشائعة).
- زر "تثبيت التطبيق" (تم) + display: `standalone` (تم).

## مخطط قاعدة البيانات الجديد
```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE blocked_users (
  anon_id uuid PRIMARY KEY,
  blocked_at timestamptz DEFAULT now()
);
```
مع GRANT و RLS مفتوحة (تطبيق anon).

## الملفات المتأثرة
- تعديل: `src/lib/video.functions.ts` (pagination + AI auto)، `src/routes/index.tsx`، `src/routes/__root.tsx`، `src/components/AppNav.tsx`، `src/components/TrailersHero.tsx`، `src/routes/videos.$id.tsx`، `src/routes/admin.index.tsx`، `public/manifest.webmanifest`.
- إنشاء: `src/routes/auth.tsx`، `src/routes/chat.tsx`، `src/routes/api/chat.ts`، `src/routes/admin.users.tsx`، `src/lib/ai-gateway.server.ts`، `src/lib/auth-gate.ts`، migration للجدولين الجديدين.
- حذف: `src/routes/interests.tsx`، `src/routes/onboarding.tsx`.

## ملاحظة
هذه خطة كبيرة (~12 ملف). سأنفّذها على دفعة واحدة بعد موافقتك، مع التحذير المذكور حول قيود AI على المحتوى الصريح.