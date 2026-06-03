# خطة بناء منصة الفيديو والاهتمامات

## نظرة عامة

منصة ويب تعرض فيديوهات (أفلام/مقاطع) من مجلد Google Drive واحد، تستخرج لقطات ذكية لكل فيديو عبر الذكاء الاصطناعي، وتسمح للمستخدم — بدون تسجيل دخول — بالإعجاب/الحفظ/التعليق/التقييم واختيار اهتمامات، مع تتبّع مدة المشاهدة وعدد المرات ونوع المشاهدة (كاملة/جزئية).

## التدفق العام

1. **الإدارة (Admin بسيط بدون كلمة سر)**: يُلصق رابط مجلد Google Drive ويُشغَّل مزامنة لجلب الفيديوهات ومعالجتها.
2. **الواجهة العامة**: شبكة فيديوهات → صفحة فيديو فيها المشغل + شريط اللقطات (Chapters) + التفاعلات + توصيات بحسب الاهتمامات.
3. **هوية المستخدم**: مُعرّف مجهول مُخزَّن في `localStorage` (UUID)، يُرسَل مع كل تفاعل ليتم ربط الإحصاءات والاهتمامات بدون تسجيل دخول.

## الميزات

### 1) إدارة مصدر الفيديو (Google Drive)

- ربط موصّل **Google Drive** عبر `standard_connectors--connect` (يستخدم Connector Gateway تلقائياً).
- صفحة `/admin` (محمية بكلمة سر بسيطة من Secret) فيها:
  - حقل لرابط مجلد Drive → استخراج `folderId`.
  - زر «مزامنة الآن» → يستدعي Server Function تقرأ ملفات المجلد (mimeType فيديو) وتخزنها في الجدول `videos`.
- التشغيل في الواجهة عبر `https://drive.google.com/file/d/{id}/preview` داخل `<iframe>` (الأبسط ولا يحتاج تنزيل/تحويل).

### 2) استخراج اللقطات الذكية

- لكل فيديو جديد بعد المزامنة، Server Function تستدعي **Lovable AI Gateway** (Gemini) مع عنوان الفيديو والوصف لتقترح قائمة لقطات مقترحة (عنوان + وصف + توقيت تقديري + وسوم). تُحفظ في جدول `clips`.
- ملاحظة صريحة في الواجهة: التوقيتات تقديرية لأن قراءة محتوى الفيديو من Drive داخل Worker غير مدعومة؛ يمكن للأدمن تعديل التوقيتات يدوياً من `/admin/videos/$id`.
- اللقطات تظهر كـ Chapters تحت المشغل؛ الضغط على لقطة يقفز للتوقيت (عبر تمرير `?t=SECONDS` لرابط Drive preview حيثما أمكن، وإلا عرض البطاقة فقط).

### 3) التفاعلات

- إعجاب / عدم إعجاب / حفظ (Bookmark) على الفيديو واللقطة.
- تعليقات نصية + تقييم بالنجوم (1–5) للفيديو.
- صفحة «المحفوظات» تعرض ما حفظه المستخدم الحالي (بحسب `anon_id`).

### 4) الاهتمامات والتوصيات

- جدول `categories` (يديره الأدمن) وربط كل فيديو بفئة/فئات (`video_categories`).
- المستخدم يختار اهتماماته من Onboarding خفيف عند أول زيارة (محفوظ في `user_interests` بـ `anon_id`).
- الصفحة الرئيسية ترتّب الفيديوهات بحسب: تطابق الاهتمامات → ثم الأكثر مشاهدة → ثم الأحدث.

### 5) تتبّع المشاهدة

- جدول `view_sessions`: `anon_id`, `video_id`, `started_at`, `seconds_watched`, `completed` (bool), `device`.
- Server Function `recordWatchHeartbeat` تُستدعى كل 10 ثوانٍ أثناء التشغيل لتجميع المدة.
- جدول `video_stats` (محسوب): إجمالي المشاهدات، إجمالي الثواني، عدد الإكمالات، عدد التكرار لكل مستخدم.
- صفحة `/admin/analytics` تعرض ملخصاً لكل فيديو ولقطة.

## الواجهات (Routes)

```
/                          → الصفحة الرئيسية (شبكة فيديوهات مفلترة بالاهتمامات)
/onboarding                → اختيار الاهتمامات أول مرة
/videos/$id                → مشغل + لقطات + تفاعلات + تعليقات
/saved                     → المحفوظات
/interests                 → تعديل الاهتمامات
/admin                     → تسجيل دخول الأدمن (كلمة سر)
/admin/sync                → ربط/مزامنة مجلد Drive
/admin/videos              → قائمة الفيديوهات
/admin/videos/$id          → تحرير اللقطات والفئات
/admin/analytics           → الإحصاءات
```

## التفاصيل التقنية

- **الستاك**: TanStack Start (الحالي) + Tailwind + shadcn/ui.
- **Backend**: Lovable Cloud (Supabase) عبر `createServerFn` فقط — لا Edge Functions.
- **AI**: Lovable AI Gateway مع `google/gemini-3-flash-preview` لاستخراج اللقطات والوسوم.
- **Drive**: عبر موصّل Google Drive (Connector Gateway). تنبيه: الموصّل يستخدم حساب صاحب المنصة (وليس حساب كل مستخدم) — وهذا مناسب لأن المصدر مجلد واحد مشترك.
- **هوية مجهولة**: UUID في `localStorage` يُرسل في كل طلب RPC كـ `anon_id`.
- **حماية الأدمن**: Secret اسمه `ADMIN_PASSWORD` يُتحقق منه داخل Server Functions الإدارية + جلسة مشفّرة بكوكي (`useSession`).
- **RTL/العربية**: الواجهة بالعربية مع `dir="rtl"` افتراضياً، خط Cairo أو Tajawal.

### مخطط قاعدة البيانات (مبسّط)

```
videos(id, drive_file_id, title, description, thumbnail_url, duration_sec, created_at)
clips(id, video_id, title, description, start_sec, end_sec, tags[], order)
categories(id, name, slug)
video_categories(video_id, category_id)
user_interests(anon_id, category_id)
reactions(id, anon_id, target_type[video|clip], target_id, kind[like|dislike|save])
comments(id, anon_id, video_id, body, rating, created_at)
view_sessions(id, anon_id, video_id, started_at, seconds_watched, completed)
```

- RLS مفعّل + سياسات تسمح بالقراءة العامة للفيديوهات/اللقطات/الفئات والكتابة الموجّهة بـ `anon_id` للتفاعلات.
- GRANTs لكل جدول لـ `anon` و`authenticated` حسب الحاجة.

## نقاط تحتاج تأكيدك قبل البدء (سأفترض الافتراضي إن لم تردّ)

1. **تشغيل Drive في الواجهة**: استخدام `iframe preview` من Drive (الأبسط، يتطلب أن تكون الملفات «أي شخص لديه الرابط»). الافتراضي: نعم.
2. **اللغة**: الواجهة بالعربية RTL افتراضياً.
3. **بدون كلمة سر الأدمن**: سأطلبها كـ Secret اسمه `ADMIN_PASSWORD` بعد التفعيل.

عند الموافقة، سأبدأ بـ: تفعيل Lovable Cloud → ربط Google Drive → إنشاء الجداول → الواجهات.

هذا الرابط :  
[https://drive.google.com/drive/folders/1opTNzcGHQ5lMbNWMv-PLAw83aA0He6i-?usp=sharing](https://drive.google.com/drive/folders/1opTNzcGHQ5lMbNWMv-PLAw83aA0He6i-?usp=sharing)