## الهدف

تحسين تجربة PWA وتصميم المشغّل على كل الشاشات، وضمان تشغيل التريلر تلقائياً في السلايدر.

## 1) المشغّل (`src/routes/videos.$id.tsx`)

- جعل حاوية المشغّل متجاوبة: `aspect-video` على الموبايل، وحد أقصى للارتفاع على الديسكتوب (`max-h-[80vh]`) مع `w-full`.
- زر ملء الشاشة أكبر وأوضح (أيقونة + نص "ملء الشاشة") مع دعم `webkitEnterFullscreen` لـ iOS عبر تمريره لعنصر iframe.
- إضافة زر "تشغيل/إيقاف" مرئي فوق الـ iframe على الموبايل.
- شريط أدوات سفلي ثابت على الموبايل: إعجاب/حفظ/ملء الشاشة.
- تحويل تخطيط الصفحة إلى عمود واحد على الموبايل، وعمودَين (مشغّل + لقطات) من `lg:` فقط.
- اللقطات تظهر أسفل المشغّل على الموبايل بشكل أفقي قابل للتمرير (chips) بدلاً من قائمة طويلة.
- صنع زر يصنع لقطات لكل الافلام بشكل تلقائي بضغطة واحد ويظهر شريط تقدم للادمن وايضا الانتباه على التوليد بين فلم وآخر .

## 2) السلايدر/التريلر (`src/components/TrailersHero.tsx`)

- التأكد من بدء التريلر تلقائياً: تقليل التأخير إلى 800ms وإضافة `&autoplay=1&mute=1` إلى رابط `drivePreviewUrl` (تحديث `src/lib/drive.ts` لقبول خيار autoplay).
- إضافة fallback: لو فشل تحميل الـ thumbnail نستخدم `driveThumbnailUrl` بحجم أكبر.
- ضمان عرض الصور: إضافة `loading="eager"` للسلايد الحالي و`onError` يستبدل بصورة احتياطية من Drive.
- تحسين تجاوب: ارتفاع `aspect-[16/10]` على الموبايل بدل `aspect-video` ليظهر النص بوضوح، و`aspect-[21/9]` على الديسكتوب.
- إضافة swipe gestures (touch) للتنقل بين السلايدات.
- مؤشرات السلايدات تظهر عدد محدود (6) على الموبايل.

## 3) PWA (`public/manifest.webmanifest` + `src/routes/__root.tsx`)

- إضافة `id: "/"` و `categories: ["entertainment", "video"]` و `lang: "ar"` لتثبيت أفضل.
- إضافة `screenshots` (اختياري) ومسارات `shortcuts` (الصفحة الرئيسية، ماريا شات).
- التأكد من وجود meta `viewport-fit=cover` للتعامل مع notch.
- إضافة `apple-mobile-web-app-status-bar-style` = `black-translucent` للحصول على شريط حالة شفاف.
- إضافة CSS safe-area: `padding-top: env(safe-area-inset-top)` على `AppNav` و `padding-bottom: env(safe-area-inset-bottom)` على الشريط السفلي للمشغّل.

## 4) `src/styles.css`

- إضافة utility `safe-top` و `safe-bottom` لاستخدام `env(safe-area-inset-*)`.
- منع التحديد على عناصر التحكم بالفيديو (`user-select: none` على الأزرار).

## 5) ContinueWatching / ClipsMarquee (تأكيد فقط)

- مراجعة سريعة لضمان أن البطاقات متجاوبة (grid يتحول إلى عمود واحد على < 380px).

## الملفات المعدّلة

- `src/routes/videos.$id.tsx`
- `src/components/TrailersHero.tsx`
- `src/lib/drive.ts`
- `public/manifest.webmanifest`
- `src/routes/__root.tsx`
- `src/styles.css`

لا تعديلات على قاعدة البيانات ولا على السيرفر.