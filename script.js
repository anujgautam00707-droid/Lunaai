const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const sendButton = document.getElementById("send");
const clearButton = document.getElementById("clear");

let history = [];

function addMessage(text, role) {
  const el = document.createElement("div");
  el.className = `message ${role === "user" ? "user" : "assistant"}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function addTyping() {
  const el = document.createElement("div");
  el.id = "typing";
  el.className = "message assistant typing";
  el.innerHTML = "<i></i><i></i><i></i>";
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function resize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 130) + "px";
}

async function sendMessage(message) {
  const text = message.trim();
  if (!text || sendButton.disabled) return;

  addMessage(text, "user");
  history.push({ role: "user", content: text });

  input.value = "";
  resize();
  sendButton.disabled = true;
  addTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: history.slice(-8)
      })
    });

    const data = await response.json();
    document.getElementById("typing")?.remove();

    if (!response.ok) throw new Error(data.error || "Request failed");

    const reply = data.reply || "I couldn't generate a reply.";
    addMessage(reply, "assistant");
    history.push({ role: "assistant", content: reply });
  } catch (error) {
    document.getElementById("typing")?.remove();
    addMessage(
      "I couldn't reach Luna AI. If you just deployed the app, check the Cloudflare deployment log and try again.",
      "assistant"
    );
    console.error(error);
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", resize);

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll(".suggestions button").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.text));
});

clearButton.addEventListener("click", () => {
  history = [];
  chat.innerHTML = "";
  welcome();
});

function welcome() {
  addMessage(
    "Hi 💜 I'm Luna. Tell me what you're dealing with during your period and I'll give practical comfort tips. You can talk normally — no special keywords needed.",
    "assistant"
  );
}

welcome();
input.focus();
