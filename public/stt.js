
const button = document.getElementById("microphone-button");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "ru-RU";
recognition.continuous = false;
recognition.interimResults = false;

let isListening = false;

// -----------------------------
// 🎤 BUTTON CONTROL
// -----------------------------
button.addEventListener("click", () => {
  if (!isListening) {
    try {
      recognition.start();
      isListening = true;
      button.classList.add("active");
      console.log("🎤 MIC ON");
    } catch (e) {
      console.log("⚠️ start error:", e);
    }
  } else {
    recognition.stop();
    isListening = false;
    button.classList.remove("active");
    console.log("🎤 MIC OFF");
  }
});

// -----------------------------
// 🤖 SEND TO BOTPRESS (SAFE VERSION)
// -----------------------------
async function sendToBotpress(text) {
  console.log("📤 sending to bot:", text);

  window.botpress.sendMessage( text);

  console.log("✅ sent");

  await new Promise(resolve => setTimeout(resolve, 5000));

  const data = await getResponse(window.botpress.conversationId);

  console.log("📥 response:", data.payload);
}

function extractMessages(data) {
  if (!data) return [];

  if (Array.isArray(data.messages)) return data.messages;

  if (data.message) return [data.message];

  if (data.payload) return [data]; // <-- твой случай

  return [];
}

// -----------------------------
// 👂 SPEECH RESULT
// -----------------------------
recognition.onresult = (event) => {
  const text = event.results[event.results.length - 1][0].transcript;

  console.log("🎤 recognized:", text);

  sendToBotpress(text);
};

async function getConversation(conversationId) {
  const res = await fetch(
    `https://api.botpress.cloud/v1/chat/messages?conversationId=${conversationId}`,
    {
      headers: {
        "Authorization": "Bearer bp_pat_4VdzzctHmdpjMxB3zQIdiTF9AAd5PM7zmnhh",
        "x-bot-id": "1fa46c65-3c80-42c2-93c8-08be70e05136"
      }
    }
  );

  return res.json();
}

async function getResponse(conversationId) {
    const data = await getConversation(conversationId);

    const firstMessage = data.messages[0];

    return firstMessage;
}

// -----------------------------
// fallback safety
// -----------------------------
recognition.onend = () => {
  isListening = false;
  button.classList.remove("active");
  console.log("🔚 recognition ended");
};