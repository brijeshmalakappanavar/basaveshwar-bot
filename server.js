import axios from "axios";
import express from "express";
import fs from "fs";
import path from "path";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── STATE FILE ─────────────────────────────────────────
const STATE_FILE = path.resolve("userState.json");

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Load error:", e.message);
  }
  return {};
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("Save error:", e.message);
  }
}

// ─── LANGUAGE DETECTION ─────────────────────────
function detectLanguage(text) {
  text = text.toLowerCase();

  if (
    text.includes("नमस्कार") ||
    text.includes("नाव") ||
    text.includes("तारीख") ||
    text.includes("वेळ")
  ) {
    return "mr";
  }

  return "en";
}

// ─── VALIDATIONS ─────────────────────────
function isValidName(name) {
  return /^[a-zA-Z ]+$/.test(name);
}

function isValidDate(date) {
  const num = parseInt(date);
  return !isNaN(num) && num >= 1 && num <= 31;
}

const timeOptions = {
  "1": "10AM",
  "2": "12PM",
  "3": "5PM",
};

// ─── MESSAGES ─────────────────────────
const messages = {
  en: {
    menu: `👋 Welcome!

1️⃣ Book Appointment  
2️⃣ Schedule  
3️⃣ Contact  
4️⃣ Help`,

    askName: "Please enter your name:",
    invalidName: "❌ Enter valid name (letters only)",

    askDate: "Enter date (1–31):",
    invalidDate: "❌ Enter valid date (1–31)",

    askTime: "Select time:\n1️⃣ 10AM\n2️⃣ 12PM\n3️⃣ 5PM",
    invalidTime: "❌ Choose 1, 2 or 3",

    success: (n, d, t) =>
      `✅ Appointment booked!\n\nName: ${n}\nDate: ${d} April\nTime: ${t}`,
  },

  mr: {
    menu: `👋 स्वागत आहे!

1️⃣ अपॉइंटमेंट बुक करा  
2️⃣ वेळापत्रक  
3️⃣ संपर्क  
4️⃣ मदत`,

    askName: "तुमचे नाव टाका:",
    invalidName: "❌ योग्य नाव टाका",

    askDate: "तारीख टाका (1–31):",
    invalidDate: "❌ योग्य तारीख टाका (1–31)",

    askTime: "वेळ निवडा:\n1️⃣ 10AM\n2️⃣ 12PM\n3️⃣ 5PM",
    invalidTime: "❌ 1, 2 किंवा 3 निवडा",

    success: (n, d, t) =>
      `✅ अपॉइंटमेंट बुक झाली!\n\nनाव: ${n}\nतारीख: ${d} April\nवेळ: ${t}`,
  },
};

// ─── GOOGLE SHEET ─────────────────────
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxqjgsxCavddi64KHKq7HhWv1ukMccuY3HU5GG7zOG89bxiG6qj0Qj877ARnUH9P1Og/exec";

// ─── MAIN ROUTE ─────────────────────
app.post("/chat", async (req, res) => {
  const rawMsg = (req.body.message || req.body.Body || "").trim();
  const userId = req.body.userId || req.body.From || "default";

  if (!rawMsg) return res.send("No message");

  const allState = loadState();

  if (!allState[userId]) {
    allState[userId] = { step: "none" };
  }

  const state = allState[userId];

  // 🔥 Detect language once
  if (!state.lang) {
    state.lang = detectLanguage(rawMsg);
  }

  const lang = state.lang;
  const msg = messages[lang];
  const input = rawMsg.toLowerCase();

  let reply = "";

  // ─── START ─────────────────────
  if (input === "hi" || input === "hello" || input === "नमस्कार") {
    reply = msg.menu;
  }

  // ─── MENU OPTIONS ─────────────
  else if (input === "1" && state.step === "none") {
    state.step = "name";
    reply = msg.askName;
  }

  else if (input === "2") {
    reply =
      lang === "mr"
        ? "📅 सोम-शनि, 10AM–6PM"
        : "📅 Mon–Sat, 10AM–6PM";
  }

  else if (input === "3") {
    reply =
      lang === "mr"
        ? "📞 संपर्क: +91-XXXXXXXXXX"
        : "📞 Contact: +91-XXXXXXXXXX";
  }

  else if (input === "4") {
    reply =
      lang === "mr"
        ? "ℹ️ अपॉइंटमेंटसाठी 1 टाका"
        : "ℹ️ Press 1 to book appointment";
  }

  // ─── NAME ─────────────────────
  else if (state.step === "name") {
    if (!isValidName(rawMsg)) {
      reply = msg.invalidName;
    } else {
      state.name = rawMsg;
      state.step = "date";
      reply = msg.askDate;
    }
  }

  // ─── DATE ─────────────────────
  else if (state.step === "date") {
    if (!isValidDate(rawMsg)) {
      reply = msg.invalidDate;
    } else {
      state.date = rawMsg;
      state.step = "time";
      reply = msg.askTime;
    }
  }

  // ─── TIME ─────────────────────
  else if (state.step === "time") {
    const selectedTime = timeOptions[rawMsg];

    if (!selectedTime) {
      reply = msg.invalidTime;
    } else {
      state.time = selectedTime;

      const { name, date, time } = state;

      try {
        await axios.post(GOOGLE_SCRIPT_URL, { name, date, time });
        console.log("✅ Sheet saved");
      } catch (err) {
        console.log("❌ Sheet error:", err.message);
      }

      reply = msg.success(name, date, time);

      allState[userId] = { step: "none" }; // reset
    }
  }

  // ─── DEFAULT ───────────────────
  else {
    reply = msg.menu;
  }

  saveState(allState);

  // Twilio
  if (req.body.Body) {
    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Message>${reply}</Message>
      </Response>
    `);
  }

  return res.json({ reply });
});

// ─── START SERVER ───────────────
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000 🚀");
});