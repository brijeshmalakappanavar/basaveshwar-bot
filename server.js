import axios from "axios";
import express from "express";
import fs from "fs";
import path from "path";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── STATE & MEMORY FILES ────────────────────────────────
const STATE_FILE  = path.resolve("userState.json");
const MEMORY_FILE = path.resolve("customerMemory.json");

function loadState()        { try { if (fs.existsSync(STATE_FILE))  return JSON.parse(fs.readFileSync(STATE_FILE,  "utf-8")); } catch(e){ console.error("Load error:",  e.message); } return {}; }
function saveState(s)       { try { fs.writeFileSync(STATE_FILE,  JSON.stringify(s, null, 2)); } catch(e){ console.error("Save error:",  e.message); } }
function loadMemory()       { try { if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8")); } catch(e){ console.error("Mem load:",    e.message); } return {}; }
function saveMemory(m)      { try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(m, null, 2)); } catch(e){ console.error("Mem save:",    e.message); } }

// ─── CONFIG ──────────────────────────────────────────────
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFrnBZRlyabEdotl13lWQUTxmeyRxFL_q_tPi01XarGMgfar7mYvH5clbf7KBYusM-/exec";

// ── Owner WhatsApp number (Sudeep Khot) — format: whatsapp:+91XXXXXXXXXX
const OWNER_WA = "whatsapp:+917026136116";

// ── Twilio credentials (set as Railway env vars — never hardcode)
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

// ─── VALIDATIONS ─────────────────────────────────────────
function isValidName(n)  { return /^[a-zA-Z\u0900-\u097F ]+$/.test(n.trim()); }
function isValidPhone(p) { return /^[6-9]\d{9}$/.test(p.trim()); }
function isValidDate(d)  { const n = parseInt(d.trim()); return !isNaN(n) && n >= 1 && n <= 31; }

// ─── DATE/TIME LOOKUP TABLES ─────────────────────────────
const monthOptions = {
  "1":"January","2":"February","3":"March","4":"April",
  "5":"May","6":"June","7":"July","8":"August",
  "9":"September","10":"October","11":"November","12":"December",
};

const timeOptions = {
  "1":"10:00 AM","2":"12:00 PM","3":"02:00 PM","4":"04:00 PM","5":"06:00 PM",
};

// ─── CATALOGUE IMAGES ────────────────────────────────────
// Add real publicly-hosted image URLs here (Google Drive share links,
// Cloudinary, imgbb, etc.). Each entry: { caption, url }
const catalogue = {
  en: {
    menu: `🖼️ *Our Eyewear Gallery*

What would you like to see?

1️⃣ Spectacle Frames
2️⃣ Sunglasses
3️⃣ Kids Eyewear
4️⃣ Shop Photos
5️⃣ Before & After

0️⃣ Back to Main Menu`,

    categories: {
      "1": {
        title: "👓 Spectacle Frames",
        images: [
          { caption: "👓 Classic Full-Rim Frames — ₹500 onwards", url: "https://i.ibb.co/B2VthkH9/Silver-Rectangle-Rimless-Frameless-Frame-Glasses.webp" },
          { caption: "🔲 Rimless & Half-Rim Frames — ₹800 onwards", url: "https://i.ibb.co/MxyKDYzH/2-Semi-rimmed-830x390.jpg" },
          { caption: "✨ Premium Branded Frames (Titan, Ray-Ban) — ₹1500 onwards", url: "https://i.ibb.co/93H8fnfd/OIP.webp" },
        ],
      },
      "2": {
        title: "🌞 Sunglasses",
        images: [
          { caption: "😎 UV Protection Sunglasses — ₹600 onwards", url: "https://i.ibb.co/cjrXwV8/OIP-1-uv.webp" },
          { caption: "🏍️ Riding / Sports Sunglasses — ₹800 onwards", url: "https://i.ibb.co/tTKfj9m8/432456.webp" },
        ],
      },
      "3": {
        title: "👶 Kids Eyewear",
        images: [
          { caption: "👦 Kids Frames (Flexible & Durable) — ₹400 onwards", url: "https://i.ibb.co/zhnF7RWB/9bf35a570e91f7a5f5dab869796a0d75-kids.jpg" },
          { caption: "🎨 Colourful Kids Frames — ₹400 onwards", url: "https://i.ibb.co/fVsYw7gW/516dd8b2f297fa9e21fef357dfc59571-kids.jpg" },
        ],
      },
      "4": {
        title: "🏪 Our Shop",
        images: [
          { caption: "🏪 OptiCare — Front View", url: "https://YOUR_IMAGE_URL_8" },
          { caption: "🔬 Our Eye Testing Equipment", url: "https://YOUR_IMAGE_URL_9" },
          { caption: "🗂️ Our Frame Collection Display", url: "https://YOUR_IMAGE_URL_10" },
        ],
      },
      "5": {
        title: "✨ Before & After",
        images: [
          { caption: "✅ Before & After — Anti-Glare Coating", url: "https://i.ibb.co/gMrDfkrD/Glasses-with-anti-glare-coating.jpg" },
          { caption: "✅ Before & After — Lens Transformation", url: "https://i.ibb.co/7JMwP5mR/maxresdefault.jpg" },
        ],
      },
    },
  },

  mr: {
    menu: `🖼️ *आमची चष्मा गॅलरी*

आपल्याला काय पाहायचे आहे?

1️⃣ स्पेक्टेकल फ्रेम्स
2️⃣ सनग्लासेस
3️⃣ मुलांचा चष्मा
4️⃣ दुकानाचे फोटो
5️⃣ बिफोर & आफ्टर

0️⃣ मुख्य मेनूवर परत`,

    categories: {
      "1": {
        title: "👓 स्पेक्टेकल फ्रेम्स",
        images: [
          { caption: "👓 क्लासिक फुल-रिम फ्रेम्स — ₹५०० पासून", url: "https://i.ibb.co/gZC60Qd9/image.jpg" },
          { caption: "🔲 रिमलेस व हाफ-रिम फ्रेम्स — ₹८०० पासून", url: "https://i.ibb.co/21RC33K1/image.jpg" },
          { caption: "✨ प्रीमियम ब्रँडेड फ्रेम्स — ₹१५०० पासून", url: "https://i.ibb.co/YFt26ydX/image.jpg" },
        ],
      },
      "2": {
        title: "🌞 सनग्लासेस",
        images: [
          { caption: "😎 UV प्रोटेक्शन सनग्लासेस — ₹६०० पासून", url: "https://i.ibb.co/cjrXwV8/OIP-1-uv.webp" },
          { caption: "🏍️ रायडिंग / स्पोर्ट्स सनग्लासेस — ₹८०० पासून", url: "https://i.ibb.co/tTKfj9m8/432456.webp" },
        ],
      },
      "3": {
        title: "👶 मुलांचा चष्मा",
        images: [
          { caption: "👦 मुलांचे फ्रेम (फ्लेक्सिबल) — ₹४०० पासून", url: "https://i.ibb.co/zhnF7RWB/9bf35a570e91f7a5f5dab869796a0d75-kids.jpg" },
          { caption: "🎨 रंगीत मुलांचे फ्रेम — ₹४०० पासून", url: "https://i.ibb.co/fVsYw7gW/516dd8b2f297fa9e21fef357dfc59571-kids.jpg" },
        ],
      },
      "4": {
        title: "🏪 आमचे दुकान",
        images: [
          { caption: "🏪 OptiCare — समोरील दृश्य", url: "https://YOUR_IMAGE_URL_8" },
          { caption: "🔬 आमची डोळे तपासणी उपकरणे", url: "https://YOUR_IMAGE_URL_9" },
          { caption: "🗂️ आमचा फ्रेम संग्रह", url: "https://YOUR_IMAGE_URL_10" },
        ],
      },
      "5": {
        title: "✨ बिफोर & आफ्टर",
        images: [
          { caption: "✅ बिफोर & आफ्टर — अँटी-ग्लेअर कोटिंग", url: "https://i.ibb.co/gMrDfkrD/Glasses-with-anti-glare-coating.jpg" },
          { caption: "✅ बिफोर & आफ्टर — लेन्स परिवर्तन", url: "https://i.ibb.co/7JMwP5mR/maxresdefault.jpg" },
        ],
      },
    },
  },
};

// ─── MESSAGES ────────────────────────────────────────────
const messages = {
  en: {
    welcome: `🏥 *Welcome to OptiCare!*
_Your Trusted Eye Care & Eyewear Partner_

Please select your preferred language:

1️⃣ English
2️⃣ मराठी`,

    menu: `👁️ *OptiCare — Main Menu*

How can we assist you today?

1️⃣ Book Eye Checkup Appointment
2️⃣ Check Order / Specs Status
3️⃣ Lens & Frame Pricing
4️⃣ Shop Timings & Location
5️⃣ Services We Offer
6️⃣ View Eyewear Gallery 🖼️
7️⃣ Contact Us

_Reply with a number to continue_ 😊`,

    askName:     "👤 Please enter your *full name*:",
    invalidName: "❌ Please enter a valid name (letters only).",

    askPhone:     "📱 Please enter your *10-digit mobile number*:",
    invalidPhone: "❌ Please enter a valid 10-digit mobile number.",

    askMonth: `📅 Please select the *month* for your appointment:

1️⃣ January   2️⃣ February  3️⃣ March
4️⃣ April     5️⃣ May       6️⃣ June
7️⃣ July      8️⃣ August    9️⃣ September
10️⃣ October  11️⃣ November  12️⃣ December`,
    invalidMonth: "❌ Please enter a number between 1 and 12.",

    askDate:     "📅 Please enter the *date* (1–31):",
    invalidDate: "❌ Please enter a valid date between 1 and 31.",

    askTime: `⏰ Please select your preferred *time slot*:

1️⃣ 10:00 AM
2️⃣ 12:00 PM
3️⃣ 02:00 PM
4️⃣ 04:00 PM
5️⃣ 06:00 PM`,
    invalidTime: "❌ Please choose a valid option (1–5).",

    askOrderPhone: "📱 Please enter the *mobile number* used at the time of order:",

    success: (n, ph, d, mo, t) =>
      `✅ *Appointment Confirmed!*

👤 Name: ${n}
📱 Phone: ${ph}
📅 Date: ${d} ${mo}
⏰ Time: ${t}

_Our team will contact you if needed._
Thank you for choosing *OptiCare!* 🙏`,

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

    contact: `📞 *Contact OptiCare*

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
    welcome: `🏥 *OptiCareमध्ये आपले स्वागत आहे!*
_आपला विश्वासू नेत्र सेवा केंद्र_

कृपया आपली भाषा निवडा:

1️⃣ English
2️⃣ मराठी`,

    menu: `👁️ *OptiCare — मुख्य मेनू*

आज आम्ही आपली कशी मदत करू?

1️⃣ डोळे तपासणी अपॉइंटमेंट बुक करा
2️⃣ ऑर्डर / चष्म्याची स्थिती तपासा
3️⃣ लेन्स व फ्रेम किंमत
4️⃣ दुकानाची वेळ व पत्ता
5️⃣ आमच्या सेवा
6️⃣ चष्मा गॅलरी पहा 🖼️
7️⃣ संपर्क करा

_पुढे जाण्यासाठी नंबर टाका_ 😊`,

    askName:     "👤 कृपया आपले *पूर्ण नाव* टाका:",
    invalidName: "❌ कृपया योग्य नाव टाका.",

    askPhone:     "📱 कृपया आपला *१०-अंकी मोबाईल नंबर* टाका:",
    invalidPhone: "❌ कृपया योग्य १०-अंकी मोबाईल नंबर टाका.",

    askMonth: `📅 कृपया अपॉइंटमेंटसाठी *महिना* निवडा:

1️⃣ जानेवारी   2️⃣ फेब्रुवारी  3️⃣ मार्च
4️⃣ एप्रिल     5️⃣ मे          6️⃣ जून
7️⃣ जुलै       8️⃣ ऑगस्ट      9️⃣ सप्टेंबर
10️⃣ ऑक्टोबर  11️⃣ नोव्हेंबर  12️⃣ डिसेंबर`,
    invalidMonth: "❌ कृपया १ ते १२ मधील संख्या टाका.",

    askDate:     "📅 कृपया *तारीख* टाका (१–३१):",
    invalidDate: "❌ कृपया १ ते ३१ मधील योग्य तारीख टाका.",

    askTime: `⏰ कृपया आपली पसंतीची *वेळ* निवडा:

1️⃣ सकाळी १०:०० 
2️⃣ दुपारी १२:०० 
3️⃣ दुपारी २:०० 
4️⃣ दुपारी ४:०० 
5️⃣ संध्याकाळी ६:००`,
    invalidTime: "❌ कृपया १ ते ५ मधील योग्य पर्याय निवडा.",

    askOrderPhone: "📱 ऑर्डरच्या वेळी दिलेला *मोबाईल नंबर* टाका:",

    success: (n, ph, d, mo, t) =>
      `✅ *अपॉइंटमेंट निश्चित झाली!*

👤 नाव: ${n}
📱 फोन: ${ph}
📅 तारीख: ${d} ${mo}
⏰ वेळ: ${t}

_गरज असल्यास आमची टीम तुम्हाला संपर्क करेल._
*OptiCare* निवडल्याबद्दल धन्यवाद! 🙏`,

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

    contact: `📞 *OptiCare संपर्क*

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

// ─── TWILIO HELPER — send image via Twilio REST API ──────
// WhatsApp images must be sent as a separate Twilio API call with mediaUrl
async function sendImage(toNumber, caption, imageUrl) {
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    console.warn("Twilio creds missing — skipping image send");
    return;
  }
  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      new URLSearchParams({
        From: TWILIO_FROM,
        To: toNumber,
        Body: caption,
        MediaUrl: imageUrl,
      }).toString(),
      {
        auth: { username: TWILIO_SID, password: TWILIO_TOKEN },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
  } catch (err) {
    console.error("Image send error:", err.response?.data || err.message);
  }
}

// ─── OWNER NOTIFICATION ──────────────────────────────────
async function notifyOwner(name, phone, date, month, time) {
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    console.warn("Twilio creds missing — skipping owner notification");
    return;
  }
  const ownerMsg =
    `🔔 *New Appointment Booked!*\n\n` +
    `👤 Name: ${name}\n` +
    `📱 Phone: ${phone}\n` +
    `📅 Date: ${date} ${month}\n` +
    `⏰ Time: ${time}\n\n` +
    `_Please confirm with the customer if needed._`;
  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      new URLSearchParams({
        From: TWILIO_FROM,
        To: OWNER_WA,
        Body: ownerMsg,
      }).toString(),
      {
        auth: { username: TWILIO_SID, password: TWILIO_TOKEN },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log("Owner notified ✅");
  } catch (err) {
    console.error("Owner notify error:", err.response?.data || err.message);
  }
}

// ─── TwiML REPLY HELPER ──────────────────────────────────
function sendReply(req, res, reply) {
  if (req.body.Body !== undefined) {
    res.set("Content-Type", "text/xml");
    const safe = reply
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&apos;");
    return res.send(`<Response><Message>${safe}</Message></Response>`);
  }
  return res.json({ reply });
}

// ─── ROUTES ──────────────────────────────────────────────
app.get("/", (req, res) => res.send("✅ OptiCare Bot is running"));

app.get("/debug", (req, res) => {
  res.json({ ok: true, state: loadState(), memory: loadMemory() });
});

// ─── MAIN WEBHOOK ────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    console.log("INCOMING:", JSON.stringify(req.body));

    const rawMsg = (req.body.message || req.body.Body || "")
      .trim()
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "");

    const userId = req.body.userId || req.body.From || "default";

    // Ignore Twilio sandbox control messages
    if (/^(join |stop$|start$|unstop$)/i.test(rawMsg)) {
      res.set("Content-Type", "text/xml");
      return res.send("<Response></Response>");
    }
    if (!rawMsg) {
      res.set("Content-Type", "text/xml");
      return res.send("<Response></Response>");
    }

    let allState = loadState();
    const memory  = loadMemory();

    // ── New user ─────────────────────────
    if (!allState[userId]) {
      allState[userId] = { step: "lang" };
      saveState(allState);
      const existing = memory[userId];
      if (existing) {
        const lang = existing.language || "en";
        return sendReply(req, res, `👋 Welcome back ${existing.name}!\n\n${messages[lang].menu}`);
      }
      return sendReply(req, res, messages.en.welcome);
    }

    const state      = allState[userId];
    const input      = rawMsg.trim();
    const inputLower = input.toLowerCase();

    console.log(`[${userId}] step=${state.step} input="${input}"`);

    // ── Reset triggers ───────────────────
    const resetWords = ["hi","hello","hey","start","menu","नमस्कार","नमस्ते","हाय"];
    if (resetWords.includes(inputLower)) {
      allState[userId] = { step: "lang" };
      saveState(allState);
      return sendReply(req, res, messages.en.welcome);
    }

    // ── Back to menu ─────────────────────
    if (input === "0") {
      const lang = state.lang || "en";
      allState[userId] = { step: "none", lang };
      saveState(allState);
      return sendReply(req, res, messages[lang].menu);
    }

    // ── Language selection ────────────────
    if (state.step === "lang") {
      if (input === "1") {
        allState[userId] = { step: "none", lang: "en" };
        saveState(allState);
        return sendReply(req, res, messages.en.menu);
      } else if (input === "2") {
        allState[userId] = { step: "none", lang: "mr" };
        saveState(allState);
        return sendReply(req, res, messages.mr.menu);
      }
      return sendReply(req, res, messages.en.welcome);
    }

    const lang = state.lang || "en";
    const msg  = messages[lang];
    const cat  = catalogue[lang];

    // ── Main menu ─────────────────────────
    if (state.step === "none") {
      switch (input) {
        case "1":
          allState[userId] = { ...state, step: "appt_name" };
          saveState(allState);
          return sendReply(req, res, msg.askName);
        case "2":
          allState[userId] = { ...state, step: "order_phone" };
          saveState(allState);
          return sendReply(req, res, msg.askOrderPhone);
        case "3": return sendReply(req, res, msg.pricing);
        case "4": return sendReply(req, res, msg.timings);
        case "5": return sendReply(req, res, msg.services);
        case "6":
          allState[userId] = { ...state, step: "gallery_menu" };
          saveState(allState);
          return sendReply(req, res, cat.menu);
        case "7": return sendReply(req, res, msg.contact);
        default:  return sendReply(req, res, msg.menu);
      }
    }

    // ── Gallery flow ──────────────────────
    if (state.step === "gallery_menu") {
      const selected = cat.categories[input];
      if (!selected) {
        return sendReply(req, res, cat.menu);
      }

      allState[userId] = { ...state, step: "none" };
      saveState(allState);

      // Build single message with image links — works on all Twilio plans including sandbox
      let galleryMsg = `${selected.title}\n\n`;
      selected.images.forEach((img) => {
        galleryMsg += `${img.caption}\n${img.url}\n\n`;
      });
      galleryMsg += `_Tap any link above to view the image_ 👆\n\n0️⃣ Main Menu | 6️⃣ More Gallery`;

      return sendReply(req, res, galleryMsg);
    }

    // ── Appointment: name ─────────────────
    if (state.step === "appt_name") {
      if (!isValidName(input)) return sendReply(req, res, msg.invalidName);
      allState[userId] = { ...state, step: "appt_phone", name: input };
      saveState(allState);
      return sendReply(req, res, msg.askPhone);
    }

    // ── Appointment: phone ────────────────
    if (state.step === "appt_phone") {
      if (!isValidPhone(input)) return sendReply(req, res, msg.invalidPhone);
      allState[userId] = { ...state, step: "appt_month", phone: input };
      saveState(allState);
      return sendReply(req, res, msg.askMonth);
    }

    // ── Appointment: month ────────────────
    if (state.step === "appt_month") {
      const selectedMonth = monthOptions[input];
      if (!selectedMonth) return sendReply(req, res, msg.invalidMonth);
      allState[userId] = { ...state, step: "appt_date", month: selectedMonth };
      saveState(allState);
      return sendReply(req, res, msg.askDate);
    }

    // ── Appointment: date ─────────────────
    if (state.step === "appt_date") {
      if (!isValidDate(input)) return sendReply(req, res, msg.invalidDate);
      allState[userId] = { ...state, step: "appt_time", date: input };
      saveState(allState);
      return sendReply(req, res, msg.askTime);
    }

    // ── Appointment: time ─────────────────
    if (state.step === "appt_time") {
      const selectedTime = timeOptions[input];
      if (!selectedTime) return sendReply(req, res, msg.invalidTime);

      const { name, phone, date, month } = state;

      // Save memory
      memory[userId] = {
        name, phone,
        lastAppointment: { date, month, time: selectedTime },
        language: lang,
        updatedAt: new Date().toISOString(),
      };
      saveMemory(memory);

      // Reset state before async calls
      allState[userId] = { step: "none", lang };
      saveState(allState);

      // Reply to customer
      const reply = msg.success(name, phone, date, month, selectedTime);
      sendReply(req, res, reply);

      // Save to Google Sheet
      try {
        await axios.post(GOOGLE_SCRIPT_URL,
          new URLSearchParams({ type:"appointment", name, phone, date, month, time:selectedTime, lang, timestamp:new Date().toISOString() }).toString(),
          { headers:{ "Content-Type":"application/x-www-form-urlencoded" } }
        );
      } catch (err) { console.error("Sheet error:", err.message); }

      // Notify shop owner
      await notifyOwner(name, phone, date, month, selectedTime);

      return;
    }

    // ── Order status ──────────────────────
    if (state.step === "order_phone") {
      if (!isValidPhone(input)) return sendReply(req, res, msg.invalidPhone);

      allState[userId] = { step: "none", lang };
      saveState(allState);

      let reply = msg.orderNotFound;
      try {
        const response = await axios.get(GOOGLE_SCRIPT_URL, { params:{ type:"order", phone:input } });
        const data = response.data;
        if (data && data.found) reply = msg.orderFound(data.status, data.name);
      } catch (err) { console.error("Order fetch error:", err.message); }

      return sendReply(req, res, reply);
    }

    // ── Fallback ──────────────────────────
    console.log(`[${userId}] FALLBACK step="${state.step}" input="${input}"`);
    return sendReply(req, res, msg.fallback);

  } catch (err) {
    console.error("UNHANDLED ERROR:", err.message, err.stack);
    res.set("Content-Type", "text/xml");
    return res.send("<Response><Message>Sorry, something went wrong. Please try again.</Message></Response>");
  }
});

// ─── START ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot running on port ${PORT}`));