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

// ─── VALIDATIONS ─────────────────────────
function isValidName(name) {
  return /^[a-zA-Z\u0900-\u097F ]+$/.test(name.trim()); // supports Marathi names too
}

function isValidDate(date) {
  const num = parseInt(date);
  return !isNaN(num) && num >= 1 && num <= 31;
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.trim());
}

const timeOptions = {
  "1": "10:00 AM",
  "2": "12:00 PM",
  "3": "02:00 PM",
  "4": "04:00 PM",
  "5": "06:00 PM",
};

// ─── MESSAGES ─────────────────────────
const messages = {
  en: {
    welcome: `🏥 *Welcome to Basaveshwar Opticals!*
_Your Trusted Eye Care & Eyewear Partner_

Please select your preferred language:

1️⃣ English
2️⃣ मराठी`,

    menu: `👁️ *Basaveshwar Opticals — Main Menu*

How can we assist you today?

1️⃣ Book Eye Checkup Appointment
2️⃣ Check Order / Specs Status
3️⃣ Lens & Frame Pricing
4️⃣ Shop Timings & Location
5️⃣ Services We Offer
6️⃣ Contact Us

_Reply with a number to continue_ 😊`,

    askName: "👤 Please enter your *full name*:",
    invalidName: "❌ Please enter a valid name (letters only).",

    askPhone: "📱 Please enter your *10-digit mobile number*:",
    invalidPhone: "❌ Please enter a valid 10-digit mobile number.",

    askDate: "📅 Please enter your preferred *date* (1–31):",
    invalidDate: "❌ Please enter a valid date between 1 and 31.",

    askTime: `⏰ Please select your preferred *time slot*:

1️⃣ 10:00 AM
2️⃣ 12:00 PM
3️⃣ 02:00 PM
4️⃣ 04:00 PM
5️⃣ 06:00 PM`,
    invalidTime: "❌ Please choose a valid option (1–5).",

    askOrderPhone: "📱 Please enter the *mobile number* used at the time of order:",

    success: (n, ph, d, t) =>
      `✅ *Appointment Confirmed!*

👤 Name: ${n}
📱 Phone: ${ph}
📅 Date: ${d} April
⏰ Time: ${t}

_Our team will contact you if needed._
Thank you for choosing *Basaveshwar Opticals!* 🙏`,

    orderFound: (status, name) =>
      `📦 *Order Status*

👤 Name: ${name}
🔄 Status: *${status}*

For more details, call us at 📞 +91-XXXXXXXXXX`,

    orderNotFound: `❌ No order found for this number.

Please check the number or contact us directly:
📞 +91-XXXXXXXXXX`,

    pricing: `💰 *Lens & Frame Pricing*

*Lenses:*
• Single Vision — ₹500 onwards
• Bifocal — ₹800 onwards
• Progressive — ₹2,500 onwards
• Anti-Glare Coating — ₹300 extra
• Blue Light Filter — ₹400 extra
• Photochromic (Transition) — ₹1,200 onwards

*Frames:*
• Regular Frames — ₹500 onwards
• Branded (Titan, Ray-Ban etc.) — ₹1,500 onwards
• Kids Frames — ₹400 onwards

_Prices vary based on power & material._
Visit us for exact quote! 😊

0️⃣ Back to Main Menu`,

    timings: `🕐 *Shop Timings & Location*

⏰ Mon – Sat: 10:00 AM – 8:00 PM
⏰ Sunday: 10:00 AM – 2:00 PM

📍 Address: [Your Shop Address Here]
🗺️ Google Maps: [Your Maps Link Here]

📞 Phone: +91-XXXXXXXXXX

0️⃣ Back to Main Menu`,

    services: `🏥 *Our Services*

👁️ Eye Checkup & Prescription
🕶️ Spectacle Frames (100+ designs)
🔬 Lens Fitting & Modification
💻 Computer / Anti-Glare Glasses
🌞 Sunglasses
👶 Kids Eyewear
🔄 Lens Replacement in Old Frames
📋 Contact Lens Consultation

_All services by experienced optometrist._

0️⃣ Back to Main Menu`,

    contact: `📞 *Contact Basaveshwar Opticals*

📱 WhatsApp / Call: +91-XXXXXXXXXX
📧 Email: [Your Email]
📍 Address: [Your Address]

⏰ Available: Mon–Sat 10AM–8PM

_We typically reply within 30 minutes!_ 😊

0️⃣ Back to Main Menu`,

    fallback: `🤔 Sorry, I didn't understand that.

Please reply with a number from the menu 👇

0️⃣ Go to Main Menu`,
  },

  mr: {
    welcome: `🏥 *बसवेश्वर ऑप्टिकल्समध्ये आपले स्वागत आहे!*
_आपला विश्वासू नेत्र सेवा केंद्र_

कृपया आपली भाषा निवडा:

1️⃣ English
2️⃣ मराठी`,

    menu: `👁️ *बसवेश्वर ऑप्टिकल्स — मुख्य मेनू*

आज आम्ही आपली कशी मदत करू?

1️⃣ डोळे तपासणी अपॉइंटमेंट बुक करा
2️⃣ ऑर्डर / चष्म्याची स्थिती तपासा
3️⃣ लेन्स व फ्रेम किंमत
4️⃣ दुकानाची वेळ व पत्ता
5️⃣ आमच्या सेवा
6️⃣ संपर्क करा

_पुढे जाण्यासाठी नंबर टाका_ 😊`,

    askName: "👤 कृपया आपले *पूर्ण नाव* टाका:",
    invalidName: "❌ कृपया योग्य नाव टाका.",

    askPhone: "📱 कृपया आपला *१०-अंकी मोबाईल नंबर* टाका:",
    invalidPhone: "❌ कृपया योग्य १०-अंकी मोबाईल नंबर टाका.",

    askDate: "📅 कृपया आपली पसंतीची *तारीख* टाका (१–३१):",
    invalidDate: "❌ कृपया १ ते ३१ मधील योग्य तारीख टाका.",

    askTime: `⏰ कृपया आपली पसंतीची *वेळ* निवडा:

1️⃣ सकाळी १०:०० 
2️⃣ दुपारी १२:०० 
3️⃣ दुपारी २:०० 
4️⃣ दुपारी ४:०० 
5️⃣ संध्याकाळी ६:००`,
    invalidTime: "❌ कृपया १ ते ५ मधील योग्य पर्याय निवडा.",

    askOrderPhone: "📱 ऑर्डरच्या वेळी दिलेला *मोबाईल नंबर* टाका:",

    success: (n, ph, d, t) =>
      `✅ *अपॉइंटमेंट निश्चित झाली!*

👤 नाव: ${n}
📱 फोन: ${ph}
📅 तारीख: ${d} एप्रिल
⏰ वेळ: ${t}

_गरज असल्यास आमची टीम तुम्हाला संपर्क करेल._
*बसवेश्वर ऑप्टिकल्स* निवडल्याबद्दल धन्यवाद! 🙏`,

    orderFound: (status, name) =>
      `📦 *ऑर्डर स्थिती*

👤 नाव: ${name}
🔄 स्थिती: *${status}*

अधिक माहितीसाठी संपर्क करा: 📞 +91-XXXXXXXXXX`,

    orderNotFound: `❌ या नंबरसाठी कोणतीही ऑर्डर सापडली नाही.

कृपया नंबर तपासा किंवा थेट संपर्क करा:
📞 +91-XXXXXXXXXX`,

    pricing: `💰 *लेन्स व फ्रेम किंमत*

*लेन्स:*
• सिंगल व्हिजन — ₹५०० पासून
• बायफोकल — ₹८०० पासून
• प्रोग्रेसिव्ह — ₹२,५०० पासून
• अँटी-ग्लेअर कोटिंग — ₹३०० अतिरिक्त
• ब्लू लाइट फिल्टर — ₹४०० अतिरिक्त
• फोटोक्रोमिक — ₹१,२०० पासून

*फ्रेम:*
• साधे फ्रेम — ₹५०० पासून
• ब्रँडेड (Titan, Ray-Ban) — ₹१,५०० पासून
• मुलांचे फ्रेम — ₹४०० पासून

_किंमत पॉवर व मटेरियलनुसार बदलू शकते._
अचूक माहितीसाठी भेट द्या! 😊

0️⃣ मुख्य मेनूवर परत`,

    timings: `🕐 *दुकानाची वेळ व पत्ता*

⏰ सोम – शनि: सकाळी १०:०० – रात्री ८:००
⏰ रविवार: सकाळी १०:०० – दुपारी २:००

📍 पत्ता: [आपला पत्ता इथे]
🗺️ Google Maps: [Maps लिंक इथे]

📞 फोन: +91-XXXXXXXXXX

0️⃣ मुख्य मेनूवर परत`,

    services: `🏥 *आमच्या सेवा*

👁️ डोळे तपासणी व प्रिस्क्रिप्शन
🕶️ चष्म्याचे फ्रेम (१०० + डिझाईन)
🔬 लेन्स फिटिंग व बदल
💻 कॉम्प्युटर / अँटी-ग्लेअर चष्मा
🌞 सनग्लासेस
👶 मुलांचा चष्मा
🔄 जुन्या फ्रेममध्ये नवीन लेन्स
📋 कॉन्टॅक्ट लेन्स सल्लामसलत

_अनुभवी ऑप्टोमेट्रिस्टद्वारे सर्व सेवा._

0️⃣ मुख्य मेनूवर परत`,

    contact: `📞 *बसवेश्वर ऑप्टिकल्स संपर्क*

📱 WhatsApp / कॉल: +91-XXXXXXXXXX
📧 ईमेल: [आपला ईमेल]
📍 पत्ता: [आपला पत्ता]

⏰ उपलब्ध: सोम–शनि सकाळी १०– रात्री ८

_आम्ही साधारणतः ३० मिनिटांत उत्तर देतो!_ 😊

0️⃣ मुख्य मेनूवर परत`,

    fallback: `🤔 माफ करा, मला ते समजले नाही.

कृपया मेनूमधून नंबर टाका 👇

0️⃣ मुख्य मेनूवर जा`,
  },
};

// ─── GOOGLE SHEET ─────────────────────
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxqjgsxCavddi64KHKq7HhWv1ukMccuY3HU5GG7zOG89bxiG6qj0Qj877ARnUH9P1Og/exec";

// ─── HELPER — send TwiML or JSON ──────
function sendReply(req, res, reply) {
  if (req.body.Body !== undefined) {
    res.set("Content-Type", "text/xml");
    // Escape XML special chars
    const safe = reply
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return res.send(`<Response><Message>${safe}</Message></Response>`);
  }
  return res.json({ reply });
}

// ─── ROOT CHECK ─────────────────────
app.get("/", (req, res) => {
  res.send("✅ Basaveshwar Opticals Bot is running");
});

// ─── MAIN ROUTE ─────────────────────
app.post("/chat", async (req, res) => {
  const rawMsg = (req.body.message || req.body.Body || "").trim();
  const userId = req.body.userId || req.body.From || "default";

  if (!rawMsg) return res.send("No message");

  const allState = loadState();

  // New user — show welcome
  if (!allState[userId]) {
    allState[userId] = { step: "lang" };
    saveState(allState);
    return sendReply(req, res, messages.en.welcome);
  }

  const state = allState[userId];
  const input = rawMsg.trim();
  const inputLower = input.toLowerCase();
  let reply = "";

  // ─── RESET TRIGGERS ─────────────────
  const resetWords = ["hi", "hello", "hey", "start", "menu", "नमस्कार", "नमस्ते", "हाय"];
  if (resetWords.includes(inputLower)) {
    allState[userId] = { step: "lang" };
    saveState(allState);
    return sendReply(req, res, messages.en.welcome);
  }

  // ─── BACK TO MENU ───────────────────
  if (input === "0") {
    const lang = state.lang || "en";
    allState[userId] = { step: "none", lang };
    saveState(allState);
    return sendReply(req, res, messages[lang].menu);
  }

  // ─── LANGUAGE SELECTION ─────────────
  if (state.step === "lang") {
    if (input === "1") {
      state.lang = "en";
      state.step = "none";
      reply = messages.en.menu;
    } else if (input === "2") {
      state.lang = "mr";
      state.step = "none";
      reply = messages.mr.menu;
    } else {
      reply = messages.en.welcome;
    }
    saveState(allState);
    return sendReply(req, res, reply);
  }

  // ─── MAIN FLOW ───────────────────────
  const lang = state.lang || "en";
  const msg = messages[lang];

  // ── MAIN MENU OPTIONS ────────────────
  if (state.step === "none") {
    switch (input) {
      case "1":
        state.step = "appt_name";
        reply = msg.askName;
        break;
      case "2":
        state.step = "order_phone";
        reply = msg.askOrderPhone;
        break;
      case "3":
        reply = msg.pricing;
        break;
      case "4":
        reply = msg.timings;
        break;
      case "5":
        reply = msg.services;
        break;
      case "6":
        reply = msg.contact;
        break;
      default:
        reply = msg.menu;
    }
    saveState(allState);
    return sendReply(req, res, reply);
  }

  // ── APPOINTMENT FLOW ─────────────────

  if (state.step === "appt_name") {
    if (!isValidName(input)) {
      reply = msg.invalidName;
    } else {
      state.name = input;
      state.step = "appt_phone";
      reply = msg.askPhone;
    }
    saveState(allState);
    return sendReply(req, res, reply);
  }

  if (state.step === "appt_phone") {
    if (!isValidPhone(input)) {
      reply = msg.invalidPhone;
    } else {
      state.phone = input;
      state.step = "appt_date";
      reply = msg.askDate;
    }
    saveState(allState);
    return sendReply(req, res, reply);
  }

  if (state.step === "appt_date") {
    if (!isValidDate(input)) {
      reply = msg.invalidDate;
    } else {
      state.date = input;
      state.step = "appt_time";
      reply = msg.askTime;
    }
    saveState(allState);
    return sendReply(req, res, reply);
  }

  if (state.step === "appt_time") {
    const selectedTime = timeOptions[input];
    if (!selectedTime) {
      reply = msg.invalidTime;
    } else {
      state.time = selectedTime;
      const { name, phone, date, time } = state;

      // Save to Google Sheet
      try {
        await axios.post(GOOGLE_SCRIPT_URL, {
          type: "appointment",
          name,
          phone,
          date,
          time,
          lang,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Sheet error:", err.message);
      }

      reply = msg.success(name, phone, date, time);

      // Reset state after booking
      allState[userId] = { step: "none", lang };
    }
    saveState(allState);
    return sendReply(req, res, reply);
  }

  // ── ORDER STATUS FLOW ────────────────

  if (state.step === "order_phone") {
    if (!isValidPhone(input)) {
      reply = msg.invalidPhone;
    } else {
      // Fetch order status from Google Sheet
      try {
        const response = await axios.get(GOOGLE_SCRIPT_URL, {
          params: { type: "order", phone: input },
        });
        const data = response.data;

        if (data && data.found) {
          reply = msg.orderFound(data.status, data.name);
        } else {
          reply = msg.orderNotFound;
        }
      } catch (err) {
        console.error("Order fetch error:", err.message);
        reply = msg.orderNotFound;
      }

      allState[userId] = { step: "none", lang };
    }
    saveState(allState);
    return sendReply(req, res, reply);
  }

  // ─── FALLBACK ────────────────────────
  reply = msg.fallback;
  saveState(allState);
  return sendReply(req, res, reply);
});

// ─── START SERVER ───────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Basaveshwar Opticals Bot running on port ${PORT}`);
});