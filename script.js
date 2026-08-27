// ==========================================
// حاسبة عبدالله
// Calculator + History + Telegram Screenshot
// ==========================================

const $ = (id) => document.getElementById(id);

let expression = "";
let result = "0";
let justCalculated = false;

// ==========================================
// Local Storage
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
  return String(text).replace(/[&<>"']/g, (char) => {
    const chars = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return chars[char];
  });
}

// ==========================================
// Calculator
// ==========================================

function safeEvaluate(input) {
  if (!/^[0-9+\-*/%.()\s]+$/.test(input)) {
    throw new Error("invalid");
  }

  // تحويل 50% إلى 0.5
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
    : String(Number(value.toFixed(12)));
}

function addValue(value) {
  // بعد الحساب، لو ضغط رقم يبدأ عملية جديدة
  if (
    justCalculated &&
    /[0-9.]/.test(value)
  ) {
    expression = "";
  }

  // لو ضغط operator بعد النتيجة، نكمل على النتيجة
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

    const lastChar = expression.at(-1);

    if (/[+\-*/%]/.test(lastChar)) {
      expression = expression.slice(0, -1) + value;
      render();
      return;
    }
  }

  // منع أكثر من decimal في الرقم نفسه
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
// Equals
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

    // حفظ العملية
    const history = getHistory();

    history.unshift({
      expression: currentExpression,
      result: calculated,
      time: new Date().toLocaleString("ar-EG")
    });

    saveHistory(history.slice(0, 100));

    render();

    // ننتظر شوية عشان الـScreenshot يلتقط النتيجة الجديدة
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
// Telegram
// ==========================================

async function captureAndSendToTelegram(exp, res) {
  // التأكد من وجود html2canvas
  if (!window.html2canvas) {
    setTelegramStatus(
      "html2canvas لم يتم تحميله",
      true
    );
    return;
  }

  // التأكد من config.js
  if (
    typeof TELEGRAM_CONFIG === "undefined"
  ) {
    setTelegramStatus(
      "ملف config.js غير موجود أو فيه خطأ",
      true
    );
    return;
  }

  const botToken =
    TELEGRAM_CONFIG.botToken;

  const chatId =
    TELEGRAM_CONFIG.chatId;

  if (
    !botToken ||
    botToken === "PUT_YOUR_BOT_TOKEN_HERE"
  ) {
    setTelegramStatus(
      "ضع Bot Token في config.js",
      true
    );
    return;
  }

  if (
    !chatId ||
    chatId === "PUT_YOUR_CHAT_ID_HERE"
  ) {
    setTelegramStatus(
      "ضع Chat ID في config.js",
      true
    );
    return;
  }

  try {
    setTelegramStatus(
      "جاري إرسال Screenshot..."
    );

    // أخذ Screenshot
    const canvas =
      await html2canvas(
        $("captureArea"),
        {
          backgroundColor: "#ffffff",
          scale: Math.min(
            2,
            window.devicePixelRatio || 1
          ),
          useCORS: true
        }
      );

    // تحويل الصورة إلى Blob
    const blob =
      await new Promise((resolve) => {
        canvas.toBlob(
          resolve,
          "image/png",
          0.92
        );
      });

    if (!blob) {
      throw new Error(
        "تعذر إنشاء الصورة"
      );
    }

    const caption =
      `🧮 حاسبة عبدالله\n` +
      `العملية: ${exp}\n` +
      `النتيجة: ${res}\n` +
      `الوقت: ${new Date().toLocaleString("ar-EG")}`;

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

    if (!response.ok || !data.ok) {
      throw new Error(
        data.description ||
          " "
      );
    }

    setTelegramStatus(
    );

  } catch (error) {
    console.error(
      "Telegram Error:",
      error
    );

    setTelegramStatus(
      true
    );
  }
}

// ==========================================
// Telegram Status
// ==========================================

function setTelegramStatus(
  text,
  isError = false
) {
  const element =
    $("telegramStatus");

  if (!element) {
    return;
  }

  element.textContent = text;

  element.style.color =
    isError
      ? "#b42318"
      : "#138a4b";
}

// ==========================================
// Calculator Buttons
// ==========================================

const keysContainer =
  document.querySelector(".keys");

if (keysContainer) {
  keysContainer.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest("button");

      if (!button) {
        return;
      }

      const value =
        button.dataset.value;

      const action =
        button.dataset.action;

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
    }
  );
}

// ==========================================
// Keyboard
// ==========================================

document.addEventListener(
  "keydown",
  (event) => {
    // الأرقام والعمليات
    if (
      /^[0-9+\-*/%.()]$/.test(
        event.key
      )
    ) {
      addValue(event.key);
      return;
    }

    // Enter أو =
    if (
      event.key === "Enter" ||
      event.key === "="
    ) {
      event.preventDefault();
      equals();
      return;
    }

    // Backspace
    if (
      event.key === "Backspace"
    ) {
      backspace();
      return;
    }

    // Escape
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
      const confirmed =
        confirm(
          "متأكد إنك عايز تمسح سجل العمليات؟"
        );

      if (!confirmed) {
        return;
      }

      saveHistory([]);
      render();
    }
  );
}

// ==========================================
// Initial
// ==========================================

render();

if (
  typeof TELEGRAM_CONFIG !== "undefined" &&
  TELEGRAM_CONFIG.botToken &&
  TELEGRAM_CONFIG.chatId
) {
  setTelegramStatus(
  );
} else {
  setTelegramStatus(
    true
  );
}
