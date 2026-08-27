# تشغيل الحاسبة مع Telegram

## 1) اعمل Bot على Telegram

افتح Telegram وابحث عن **@BotFather**.

أرسل `/newbot` واتبع الخطوات.
في النهاية سيعطيك **Bot Token** شكله قريب من:

`123456789:AA...`

## 2) هات Chat ID

افتح المحادثة مع الـBot الذي أنشأته وأرسل له أي رسالة مثل `test`.

بعدها افتح:

`https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates`

واستبدل `YOUR_BOT_TOKEN` بالتوكن الحقيقي.

في JSON ابحث عن:

`message.chat.id`

والرقم الموجود هناك هو **Chat ID**.

## 3) ضع البيانات في config.js

افتح `config.js` واكتب:

```js
const TELEGRAM_CONFIG = {
  botToken: "ضع_التوكن_هنا",
  chatId: "ضع_الـchat_id_هنا",
  recipientLabel: "Telegram"
};
```

## 4) شغّل الموقع

الأفضل تشغيله من Local Server بدل فتح `index.html` مباشرة.

لو عندك Python:

```bash
python -m http.server 5500
```

ثم افتح:

`http://localhost:5500`

## النتيجة

بعد تسجيل الدخول، عند كل ضغطة `=`:

1. العملية تتحسب.
2. تضاف للسجل.
3. يتم أخذ Screenshot للحاسبة.
4. يتم إرسال الصورة مباشرة إلى الـTelegram Chat ID المحدد.
5. لا يتم فتح Telegram أو Gmail.

## تنبيه أمني

وضع Bot Token داخل JavaScript يعني أن أي شخص يستطيع رؤية ملفات الموقع يمكنه استخراج التوكن واستخدام البوت.
هذه الطريقة مناسبة لمشروع شخصي محلي على جهازك. لو ستنشر الموقع للعامة، ضع الإرسال خلف Backend ولا تضع Bot Token في Frontend.
