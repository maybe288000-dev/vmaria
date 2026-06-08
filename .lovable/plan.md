
## الهدف
- الإدارة فقط (كلمة سر `6969`) تنشئ المستخدمين وتراقبهم حيّاً مع سجلّهم.
- التصفّح مسموح للجميع. **تشغيل أي فلم يتطلب تسجيل دخول مستخدم.**

---

## 1) قاعدة البيانات
جدول جديد `app_users` لتخزين الحسابات التي ينشئها الأدمن:

```
app_users:
  id uuid PK (=identity used everywhere)
  username text unique (lower-case)
  display_name text
  password_hash text   -- bcrypt
  created_at, last_login_at, last_seen_at timestamptz
  blocked boolean default false
```

- لا نغيّر باقي الجداول؛ سنستخدم `app_users.id` بدلاً من `anon_id` الحالي. كلاهما `uuid` فيتوافق دون migration بيانات.
- تفعيل Realtime على `view_sessions` و `chat_messages` و `app_users` للوحة الإدارة الحيّة:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE
    public.app_users, public.view_sessions, public.chat_messages;
  ```
- جدول `blocked_users` يصبح غير مستخدم — نستبدله بحقل `blocked` في `app_users` (نُبقي الجدول كما هو لعدم كسر شيء، ونتجاهله في الكود الجديد).

> ملاحظة: السياسات الحالية `*_all` تسمح للجميع — لن نشدّدها الآن لتجنّب تعطيل الواجهة. كل الكتابات الحساسة تمر عبر serverFn بكلمة سر الأدمن.

---

## 2) واجهات السيرفر (`src/lib/video.functions.ts` + ملف جديد `auth.functions.ts`)
- `userLogin({ username, password })` → يتحقق من bcrypt، يعيد `{ id, username, display_name }` (أو خطأ).
- `userMe({ user_id })` → تأكيد أن الحساب موجود وغير محظور (للتحقق عند كل تحميل).
- `adminCreateUser({ admin_password, username, password, display_name })` → يتحقق `admin_password==="6969"` ثم ينشئ السجل (bcrypt).
- `adminResetUserPassword({ admin_password, user_id, new_password })`.
- `adminSetBlocked({ admin_password, user_id, blocked })`.
- `adminListAppUsers({ admin_password })` → كل المستخدمين مع: آخر نشاط، عدد الجلسات، إجمالي المشاهدة، آخر فلم.
- `adminUserDetail({ admin_password, user_id })` → سجلّ المشاهدات والرسائل.
- نضيف `bcryptjs` كاعتمادية (`bun add bcryptjs @types/bcryptjs`).

---

## 3) هويّة العميل (`src/lib/auth-gate.ts` و `anon-id.ts`)
- `maria_user_v1` في localStorage: `{ id, username, display_name }`.
- `getCurrentUser()` ، `isUserAuthed()` → بناءً على هذا المفتاح.
- `getAnonId()` يعيد `user.id` إن وُجد، وإلا يعيد سلسلة فارغة (لا نُسجّل نشاطاً للزوّار).
- `isAdminAuthed()` يبقى منفصلاً عبر مفتاح `maria_admin_v1` يُضبط بعد تمرير `6969` في `/admin/login`.

---

## 4) المسارات والتدفّق

### `/` (تصفّح حر)
- يظهر للجميع بدون تسجيل. عند الضغط على فلم: إن لم يكن المستخدم مسجلاً، تحويل إلى `/login`. لا redirect على مجرد فتح الصفحة.

### `/login` (مستخدم)
- نموذج: اسم المستخدم + كلمة المرور → `userLogin`. عند النجاح: حفظ `maria_user_v1` + توجيه إلى `redirect` أو `/`.
- يحتوي رابطاً: "هل أنت الأدمن؟ ادخل من هنا" → `/admin/login`.

### `/admin/login` (إدارة)
- إدخال `6969` فقط. يضبط `maria_admin_v1`. كل صفحات `/admin/*` تتطلّبه (وليس تسجيل مستخدم).

### `/videos/$id`
- يتطلّب `isUserAuthed()`. خلاف ذلك → `/login?redirect=...`.

### استبدال `/auth`
- المسار القديم `/auth` سيُحوّل إلى `/login` (back-compat).

### لوحة الإدارة `/admin/users`
- جدول المستخدمين مع أعمدة: الاسم، آخر نشاط، الحالة (متّصل الآن إن كانت `view_sessions` تتحدّث خلال آخر 60 ثانية)، إجمالي المشاهدة، آخر فلم، أزرار: عرض السجلّ، إعادة تعيين كلمة المرور، حظر، حذف.
- **زرّ "مستخدم جديد"** يفتح نافذة لإدخال اسم/كلمة سر/اسم العرض.
- اشتراك Realtime على `view_sessions` و `chat_messages` يبثّ التحديثات فوراً (`useEffect` + `supabase.channel(...).on('postgres_changes', ...)` + invalidate React Query).

---

## 5) ملفات سيتم تعديلها/إنشاؤها
- إنشاء: `src/routes/login.tsx`, `src/routes/admin/login.tsx`, `src/lib/auth.functions.ts`.
- تعديل: `src/lib/auth-gate.ts`, `src/lib/anon-id.ts`, `src/routes/index.tsx`, `src/routes/videos.$id.tsx`, `src/routes/admin.tsx`, `src/routes/admin.users.tsx`, `src/components/AppNav.tsx` (إظهار اسم المستخدم وزر خروج)، `src/components/TrailersHero.tsx` (زر "شاهد الآن" يعتمد على تسجيل دخول المستخدم).
- إضافة dependency: `bcryptjs`.

---

## نقاط أمنيّة
- كلمة سر الأدمن `6969` ضعيفة لكنها طلب صريح من المستخدم — تُحفظ مهشّمة في الكود السيرفري ويتم التحقق عبر `timingSafeEqual`.
- كل serverFn إدارية تطلب `admin_password` في الـ payload وتفشل بـ 401 إن كان خطأ.
- كلمات سر المستخدمين تُهشّم bcrypt (10 جولات) ولا تُعاد إطلاقاً للعميل.
- حدود طول/أحرف عبر zod لكل المدخلات.
