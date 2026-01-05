# ReWear (HTML/CSS/JavaScript + Node.js + SQLite)

## تشغيل المشروع
1) افتح Terminal داخل المجلد:
```bash
npm install
npm run dev
```

2) افتح المتصفح:
- http://localhost:3000

## إعدادات
- انسخ `.env.example` إلى `.env` وعدّل `JWT_SECRET` إذا بتحب.

## ملاحظات
- قاعدة البيانات SQLite اسمها `rewear.sqlite` وتتولد تلقائياً أول تشغيل.
- الصور حالياً كـ `imageUrl` (رابط). إذا بدك رفع ملفات حقيقية بنضيف `multer` بسهولة.
