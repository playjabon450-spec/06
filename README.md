# 🤖 StoreBot — بوت ديسكورد متجر + دعم + حماية (بالعربية)

بوت واحد مع لوحة تحكم ويب، يعمل **بالأزرار والقوائم والنوافذ فقط** (بدون أوامر سلاش)، وكل نصوصه عربية وقابلة للتعديل من اللوحة.

| الوحدة | ماذا تفعل |
|---|---|
| 🛒 المتجر | منتجات وباقات وكوبونات، طلب آلي داخل تذكرة خاصة، دفع (فودافون كاش / ProBot / عملة مخصصة)، تسليم آلي (رتبة، مفتاح، رسالة، يدوي)، اشتراكات وتجديد |
| 🎫 التذاكر | أقسام، استلام ونقل وأولوية، سجل HTML، تقييم، قاعدة معرفة، SLA، ملخص AI |
| 🛡️ الحماية | حجب الروابط الاحتيالية، كشف الحسابات المخترقة، درع الغارات، ملف العضو، استئناف الحظر |
| 👥 فريق العمل | إحصاءات ولوحة صدارة، تقارير أسبوعية/شهرية، تنبيهات خمول، نظام تقديمات |
| 📈 التحليلات | تجميع ليلي، ملخص أسبوعي للمالك، تنبيه تسرّب، أفضل وقت للنشر، صحة السيرفر |
| 🔧 لوحة المالك | `/admin`: السيرفرات، القائمة السوداء، حالة البوت، وضع الصيانة |

> الهيكل: `bot/` (discord.js) · `dashboard/` (Next.js) · `prisma/schema.prisma` (قاعدة بيانات PostgreSQL مشتركة). التواصل بينهما عبر قاعدة البيانات (جدول المهام `BotJob` + إصدار الإعدادات)، فلا يحتاجان لاتصال مباشر.

---
## 1) المتطلبات
Node.js 20 أو أحدث · حساب Discord · قاعدة PostgreSQL (Supabase أو Neon مجاناً) · (اختياري) مفتاح Groq أو Gemini المجاني للذكاء الاصطناعي.

## 2) إنشاء تطبيق ديسكورد
1. افتح <https://discord.com/developers/applications> ← **New Application**.
2. **Bot** ← **Reset Token** وانسخ التوكن (سرّي!). فعّل **Privileged Gateway Intents**: ✅ *Server Members Intent* و ✅ *Message Content Intent*.
3. **OAuth2** ← انسخ `Client ID` و`Client Secret`، وأضف في *Redirects*: `https://رابط-اللوحة/api/auth/callback/discord` (ومحلياً `http://localhost:3000/api/auth/callback/discord`).
4. رابط دعوة البوت (OAuth2 URL Generator): scopes `bot` و`applications.commands`، والصلاحيات: Manage Roles, Manage Channels, Kick Members, Ban Members, Moderate Members, Manage Messages, View Channels, Send Messages, Embed Links, Attach Files, Read Message History. (أو Administrator للتجربة.)
5. **مهم:** ضع رتبة البوت **أعلى** من الرتب التي سيمنحها أو يسحبها ومن رتبة العزل.

## 3) قاعدة البيانات
أنشئ مشروعاً على Supabase (أو Neon) وانسخ سلسلتين: `DATABASE_URL` (الاتصال المجمّع/pooler، المنفذ 6543 مع `?pgbouncer=true`) و`DIRECT_URL` (الاتصال المباشر، المنفذ 5432).

## 4) ملف البيئة
```bash
cp .env.example .env     # ثم املأ القيم
openssl rand -base64 32  # ← NEXTAUTH_SECRET
```
أهم المتغيرات: `DISCORD_TOKEN` `DISCORD_CLIENT_ID` `DISCORD_CLIENT_SECRET` `DATABASE_URL` `DIRECT_URL` `NEXTAUTH_URL` `NEXTAUTH_SECRET` `OWNER_IDS` (معرّفك على ديسكورد) — وللوحة نفس المتغيرات تُضاف في إعدادات الاستضافة.

## 5) التشغيل محلياً
```bash
cd bot && npm install && npm run db:push        # إنشاء الجداول (يُعاد بعد كل تحديث للمخطط)
npm test                                         # اختبارات الوحدة
npm start                                        # تشغيل البوت
cd ../dashboard && npm install && npm run dev    # اللوحة على http://localhost:3000
npm run seed:store -- <guildId>                  # (اختياري، من مجلد bot) بيانات تجريبية للمتجر
```

## 6) الإعداد الأولي
سجّل الدخول للّوحة وافتح سيرفرك ← **«الإعداد الأولي»** وأكمل الخطوات بالترتيب: رتب الستاف ← قنوات السجلات ← طرق الدفع ← أول منتج ← نشر لوحة المتجر ← نشر لوحة التذاكر. بعدها نفّذ دورة اختبار كاملة حسب `docs/MANUAL_TEST_STORE.md`.

## 7) النشر (المسار المجاني)
**اللوحة → Vercel:** استورد المستودع واجعل **Root Directory = `dashboard`** (مهم: الـ `Dockerfile` في الجذر خاص بالبوت فقط). أضف متغيرات البيئة، و`NEXTAUTH_URL` = رابط الدومين النهائي. أمر البناء الافتراضي يكفي (`postinstall` يولّد Prisma).

**البوت** يحتاج عملية تعمل 24 ساعة. خيارات شائعة (الحدود المجانية تتغير، تحقق منها وقت النشر):
- **Oracle Cloud Always Free (VM):** الأكثر استقراراً للتشغيل الدائم. ثبّت Node 20 وPM2 ثم: `cd bot && npm i --omit=dev && npx prisma generate --schema=../prisma/schema.prisma && cd .. && pm2 start ecosystem.config.js && pm2 save && pm2 startup`.
- **Docker:** `docker compose up -d --build` (الملف جاهز، المنفذ 3001).
- **منصات مجانية تُنيم الخدمة عند الخمول (Render/Koyeb…):** استخدم خدمة ويب تشغّل `node bot/index.js` وافتح لها فحص صحة `/health`، ثم أضف مراقباً في **UptimeRobot** (HTTP(s) كل 5 دقائق) على `https://رابط-البوت/health` حتى لا تنام. ملاحظة: النوم المتكرر يوقف الجداول الزمنية (تقارير/اشتراكات) مؤقتاً لكنها تستكمل عند الاستيقاظ.

## 8) النسخ الاحتياطي لقاعدة البيانات
```bash
chmod +x scripts/backup.sh
set -a && . ./.env && set +a && ./scripts/backup.sh ./backups 14   # نسخة مضغوطة + حذف ما يزيد عن 14 يوماً
# جدولة يومية (cron):  30 3 * * * cd /path/to/project && set -a && . ./.env && set +a && ./scripts/backup.sh /var/backups/storebot 14
# الاستعادة في قاعدة فارغة:  gunzip -c backup.sql.gz | psql "$DIRECT_URL"
```
جرّب الاستعادة مرة واحدة على الأقل قبل الاعتماد على النسخ. خدمات Supabase/Neon لها نسخ خاصة بها (تختلف حسب الخطة) لكنها لا تغني عن نسخة تملكها.

## 9) ملفات مفيدة
- `docs/PRODUCTION_CHECKLIST.md` — قائمة الجاهزية قبل الإطلاق
- `docs/TROUBLESHOOTING.md` — جدول استكشاف الأخطاء (البوت متوقف، الأزرار لا تستجيب، ProBot لا يُكتشف، اللوحة لا تتزامن…)
- `docs/FUTURE_ROADMAP.md` — خارطة التطوير
- `docs/MANUAL_TEST_STORE.md` — اختبار يدوي لدورة الطلب · `docs/PROGRESS.md` — سجل البناء والقرارات

## 10) قواعد أمان سريعة
لا تشارك `.env` أبداً · غيّر التوكن فوراً إن تسرّب · لا تعطِ رتبة «إدارة اللوحة» إلا لمن تثق به · أي تغيير في `schema.prisma` يتبعه `npm run db:push`.
