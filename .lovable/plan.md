## الهدف

تحويل الصفحة الرئيسية إلى تجربة ديناميكية تعتمد على سلوك المستخدم، مع إزالة قسم الاهتمامات الظاهر واستبداله بـ"متابعة المشاهدة"، وإضافة شريط لقطات متحركة، وعرض تريلرات الأفلام بدل ترويسة الترحيب، وتفعيل PWA.

---

## 1) ترتيب ذكي للفيديوهات في الصفحة الرئيسية

خوارزمية تقييم (score) لكل فيديو تُحسب على الخادم في `listVideos`:

```text
score =
    3.0 * interest_match        (تطابق تصنيف الفيديو مع اهتمامات anon_id)
  + 2.0 * repeat_factor         (عدد جلسات المشاهدة السابقة لنفس الفيديو، مع سقف)
  + 1.5 * completion_rate       (متوسط seconds_watched / duration_sec)
  + 1.0 * view_type_bonus       (مكتمل > طويل > قصير)
  + 0.5 * freshness             (حداثة created_at)
  - 2.0 * dislike_penalty
```

- يُمرَّر `anon_id` إلى `listVideos` ويُرتَّب الناتج تنازليًا بالـ score.
- تُحسب الإحصائيات من `view_sessions` و`reactions` و`user_interests` و`video_categories` عبر استعلامات مجمّعة.

## 2) إزالة قسم الاهتمامات من الواجهة الرئيسية

- حذف شريط التصنيفات (أزرار الاهتمامات) من `src/routes/index.tsx`.
- إبقاء صفحة `/interests` كما هي للوصول من القائمة العلوية فقط.

## 3) استبدالها بقسم "متابعة المشاهدة"

- سيرفر فنكشن جديد `getContinueWatching({ anon_id })`:
  - يقرأ آخر `view_sessions` غير مكتملة (`completed = false` و `seconds_watched > 10`) مرتبة بـ `updated_at desc` (حد 6).
  - يُرجع: الفيديو + ثانية التوقف + نسبة الإنجاز.
- بطاقات أفقية قابلة للتمرير تعرض الغلاف + شريط تقدم + زر "تابع من د:ث"، تنقل إلى `/videos/$id?t=<sec>` وتُمرَّر للـ iframe.
- في حال عدم وجود جلسات: عرض "آخر فيلم تمت مشاهدته" (آخر `view_sessions` بشكل عام).

## 4) شريط لقطات متحركة عشوائية (Marquee)

- سيرفر فنكشن `getRandomClips({ limit: 20 })` يختار لقطات من جداول `clips` بشكل عشوائي مع الـ video_id.
- مكوّن `ClipsMarquee` يعرض بطاقات صغيرة تنزلق أفقيًا (CSS animation `@keyframes scroll-x` مع `prefers-reduced-motion: reduce` كـ fallback ثابت).
- كل بطاقة فيها عنوان اللقطة + الوسوم، وعند النقر تنتقل إلى `/videos/$id?t=start_sec`.

## 5) استبدال ترويسة الترحيب بتريلرات الأفلام

- سيرفر فنكشن `getTrailers({ limit: 5 })`: يأخذ أحدث/أعلى الفيديوهات تقييمًا ويبني "تريلر" من أول لقطة من كل فيلم (start_sec للقطة الأولى).
- وايضا الأفلام التي بدون تقييم
- مكوّن `TrailersHero`:
  - كاروسيل تلقائي (تبديل كل 8 ثوانٍ) يعرض iframe لـ Drive preview مع `start=start_sec` وبدون صوت (يضاف `&mute=1`)، يعلوها العنوان وزر "شاهد الآن".
  - نقاط تنقّل + إيقاف تلقائي عند `prefers-reduced-motion`.
- استقبال `?t=` في `/videos/$id` لتطبيقها على `startSec` تلقائيًا.

## 6) دعم PWA

- إضافة `public/manifest.webmanifest` (الاسم: "منصّة المشاهدة"، short_name، theme/background بألوان النظام الداكنة، display: standalone، start_url "/").
- أيقونات `public/icon-192.png` و`public/icon-512.png` (تُولَّد بـ imagegen).
- روابط `manifest` و`theme-color` و`apple-touch-icon` في `__root.tsx`.
- **بدون service worker** (لا حاجة لوضع offline في هذه المرحلة، تجنبًا لمشاكل المعاينة).

## 7) تحسين التشغيل

- في `videos.$id.tsx`:
  - إضافة `preload="metadata"` غير متاح لـ iframe، لكن سنضيف `loading="lazy"` للـ iframe قبل التفاعل و"poster" بصورة الغلاف ثم تحميل iframe عند النقر (تقليل الحمل عند فتح الصفحة).
  - استخدام `referrerPolicy="no-referrer"` و`sandbox` آمن لـ Drive.
  - تقليل heartbeat إلى كل 15 ثانية بدل 10، وإلغاء عند إخفاء التبويب (`document.visibilitychange`) لتجنب احتساب وقت غير حقيقي.
  - حفظ آخر `startSec` في الرابط (`?t=`) ليعمل زر "تابع" بدقة.
- في الكاروسيل والـ marquee: استخدام `IntersectionObserver` لإيقاف الحركة خارج الشاشة.

---

## الملفات المتأثرة

- تعديل: `src/routes/index.tsx`, `src/routes/videos.$id.tsx`, `src/lib/video.functions.ts`, `src/routes/__root.tsx`, `src/styles.css`
- إنشاء: `src/components/TrailersHero.tsx`, `src/components/ClipsMarquee.tsx`, `src/components/ContinueWatching.tsx`, `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`

## ملاحظات تقنية

- لا تغييرات على مخطط قاعدة البيانات؛ كل شيء يُحسب من الجداول الحالية.
- ترتيب الفيديوهات يتم على الخادم لتقليل البيانات المُرسلة وتجنب الحسابات على العميل.
- امكانية التعرف على ترتيب الافلام من تاريخ التحميل وغيرها لتسهيل على المستخدم الترتيب حسب الرغبة
- الحركات تستخدم CSS فقط (بدون مكتبات إضافية) للحفاظ على الأداء.

هل أبدأ التنفيذ؟