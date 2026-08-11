// ============================================================
// LUNA AI — Complete Cloudflare Worker (Frontend + Backend)
// ============================================================

// -------------------- CONFIGURATION --------------------------
const MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MAX_HISTORY = 10; // keep only recent messages for speed
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// -------------------- HTML PAGE ------------------------------
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
  <title>Luna AI</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #1a0e2e;
      background: linear-gradient(145deg, #1a0e2e 0%, #2d1b4e 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 12px;
      margin: 0;
    }

    #app {
      max-width: 480px;
      width: 100%;
      height: 92vh;
      max-height: 820px;
      background: #26133f;
      border-radius: 32px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(180, 120, 255, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* ---- header ---- */
    .chat-header {
      padding: 18px 20px 14px 20px;
      background: rgba(40, 20, 70, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(180, 120, 255, 0.15);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      flex-direction: column;
    }

    .chat-header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #e8d5ff;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chat-header h1 span {
      background: #7c3aed;
      font-size: 14px;
      padding: 0 8px;
      border-radius: 30px;
      color: white;
      font-weight: 600;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      display: inline-block;
      animation: pulse-dot 2s infinite;
    }

    @keyframes pulse-dot {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    .status-text {
      font-size: 13px;
      color: #b89ce0;
      font-weight: 400;
    }

    .reset-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(180, 120, 255, 0.2);
      color: #d4bfff;
      padding: 6px 14px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .reset-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(180, 120, 255, 0.4);
    }

    .reset-btn:active {
      transform: scale(0.95);
    }

    /* ---- messages ---- */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 16px 8px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scroll-behavior: smooth;
    }

    .chat-messages::-webkit-scrollbar {
      width: 4px;
    }
    .chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background: #7c3aed;
      border-radius: 10px;
    }

    /* ---- bubbles ---- */
    .message {
      max-width: 88%;
      padding: 12px 16px;
      border-radius: 20px;
      font-size: 15px;
      line-height: 1.5;
      word-wrap: break-word;
      animation: fadeIn 0.25s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      align-self: flex-end;
      background: #7c3aed;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.luna {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.07);
      color: #f0e6ff;
      border-bottom-left-radius: 4px;
      backdrop-filter: blur(2px);
      border: 1px solid rgba(180, 120, 255, 0.1);
    }

    .message.luna strong {
      color: #c9a8ff;
    }

    /* ---- welcome message (special) ---- */
    .welcome-bubble {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(180, 120, 255, 0.12);
      border-radius: 20px;
      border-bottom-left-radius: 4px;
      padding: 14px 18px;
      margin-bottom: 6px;
      color: #e0d0f5;
      font-size: 15px;
      line-height: 1.6;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .welcome-bubble .greeting {
      font-size: 17px;
      font-weight: 600;
      color: #e8d5ff;
      display: block;
      margin-bottom: 4px;
    }

    /* ---- quick buttons ---- */
    .quick-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 6px 0 4px 0;
      margin-bottom: 2px;
    }

    .quick-btn {
      background: rgba(124, 58, 237, 0.25);
      border: 1px solid rgba(180, 120, 255, 0.2);
      color: #d4bfff;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .quick-btn:hover {
      background: rgba(124, 58, 237, 0.4);
      border-color: rgba(180, 120, 255, 0.4);
      transform: translateY(-1px);
    }

    .quick-btn:active {
      transform: scale(0.94);
    }

    /* ---- typing indicator ---- */
    .typing-indicator {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      border-bottom-left-radius: 4px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(180, 120, 255, 0.08);
      margin-bottom: 4px;
    }

    .typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #b89ce0;
      animation: typing-bounce 1.4s infinite ease-in-out both;
    }

    .typing-dot:nth-child(1) { animation-delay: 0s; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    /* ---- input area ---- */
    .chat-input-area {
      padding: 12px 16px 16px 16px;
      background: rgba(20, 10, 40, 0.5);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border-top: 1px solid rgba(180, 120, 255, 0.1);
      display: flex;
      gap: 10px;
      align-items: flex-end;
      flex-shrink: 0;
    }

    .chat-input-area textarea {
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(180, 120, 255, 0.15);
      border-radius: 24px;
      padding: 12px 16px;
      color: #f0e6ff;
      font-size: 15px;
      font-family: inherit;
      resize: none;
      outline: none;
      transition: border-color 0.2s;
      min-height: 48px;
      max-height: 120px;
      line-height: 1.4;
    }

    .chat-input-area textarea::placeholder {
      color: #8870aa;
    }

    .chat-input-area textarea:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
    }

    .send-btn {
      background: #7c3aed;
      border: none;
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
    }

    .send-btn:hover {
      background: #8b4cf7;
      transform: scale(1.02);
    }

    .send-btn:active {
      transform: scale(0.92);
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    /* ---- responsive tweaks ---- */
    @media (max-width: 500px) {
      #app {
        height: 96vh;
        max-height: none;
        border-radius: 24px;
      }
      .chat-header h1 {
        font-size: 18px;
      }
      .message {
        font-size: 14px;
        padding: 10px 14px;
      }
      .quick-btn {
        font-size: 12px;
        padding: 5px 12px;
      }
    }

    @media (max-height: 640px) {
      .chat-header {
        padding: 12px 16px 10px 16px;
      }
      .chat-messages {
        padding: 10px 12px 4px 12px;
      }
      .chat-input-area {
        padding: 8px 12px 12px 12px;
      }
      .chat-input-area textarea {
        min-height: 40px;
        padding: 10px 14px;
        font-size: 14px;
      }
      .send-btn {
        width: 42px;
        height: 42px;
        font-size: 17px;
      }
    }
  </style>
</head>
<body>
  <div id="app">
    <!-- header -->
    <div class="chat-header">
      <div class="header-left">
        <h1>Luna AI <span>💜</span></h1>
        <div class="status-row">
          <span class="status-dot"></span>
          <span class="status-text">Period support assistant</span>
        </div>
      </div>
      <button class="reset-btn" id="resetBtn">↺ Reset</button>
    </div>

    <!-- messages -->
    <div class="chat-messages" id="messages">
      <!-- welcome -->
      <div class="welcome-bubble" id="welcomeMsg">
        <span class="greeting">Hi 💜 I'm Luna.</span>
        Tell me what you're dealing with during your period and I'll give practical comfort tips. You can talk normally — no special keywords needed.
      </div>
      <!-- quick buttons -->
      <div class="quick-grid" id="quickGrid">
        <button class="quick-btn" data-text="Cramps">Cramps</button>
        <button class="quick-btn" data-text="Bloating">Bloating</button>
        <button class="quick-btn" data-text="Tired">Tired</button>
        <button class="quick-btn" data-text="Food">Food</button>
        <button class="quick-btn" data-text="Headache">Headache</button>
      </div>
    </div>

    <!-- typing -->
    <div id="typingContainer" style="padding: 0 16px 4px 16px; display: none;">
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>

    <!-- input -->
    <div class="chat-input-area">
      <textarea id="inputEl" rows="1" placeholder="Type a message…" maxlength="2000"></textarea>
      <button class="send-btn" id="sendBtn">➤</button>
    </div>
  </div>

  <script>
    (function() {
      // ---- DOM refs ----
      const messagesEl = document.getElementById('messages');
      const inputEl = document.getElementById('inputEl');
      const sendBtn = document.getElementById('sendBtn');
      const resetBtn = document.getElementById('resetBtn');
      const typingContainer = document.getElementById('typingContainer');
      const welcomeMsg = document.getElementById('welcomeMsg');
      const quickGrid = document.getElementById('quickGrid');

      // ---- state ----
      let isWaiting = false;
      let timeoutId = null;

      // ---- helpers ----
      function scrollDown() {
        requestAnimationFrame(() => {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });
      }

      function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = 'message ' + sender;
        div.textContent = text;
        messagesEl.insertBefore(div, typingContainer.parentNode);
        scrollDown();
        return div;
      }

      function removeWelcomeAndButtons() {
        if (welcomeMsg) welcomeMsg.style.display = 'none';
        if (quickGrid) quickGrid.style.display = 'none';
      }

      function showTyping() {
        typingContainer.style.display = 'block';
        scrollDown();
      }

      function hideTyping() {
        typingContainer.style.display = 'none';
      }

      function setWaiting(state) {
        isWaiting = state;
        sendBtn.disabled = state;
        inputEl.disabled = state;
        if (state) {
          inputEl.style.opacity = '0.6';
        } else {
          inputEl.style.opacity = '1';
        }
      }

      function clearTimeoutIfExists() {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }

      // ---- send message ----
      async function sendMessage(userText) {
        if (!userText || userText.trim() === '') return;
        if (isWaiting) return;

        const trimmed = userText.trim();
        if (trimmed.length === 0) return;

        // hide welcome + quick buttons after first real message
        removeWelcomeAndButtons();

        // add user message
        addMessage(trimmed, 'user');

        // clear input
        inputEl.value = '';
        inputEl.style.height = 'auto';

        // show typing
        showTyping();
        setWaiting(true);

        // timeout guard
        clearTimeoutIfExists();
        timeoutId = setTimeout(() => {
          if (isWaiting) {
            hideTyping();
            setWaiting(false);
            addMessage('⏱️ Sorry, Luna took too long to respond. Please try again.', 'luna');
            timeoutId = null;
          }
        }, REQUEST_TIMEOUT_MS);

        try {
          const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmed })
          });

          clearTimeoutIfExists();

          if (!resp.ok) {
            let errMsg = 'Sorry, Luna hit a snag. Please try again.';
            try {
              const errData = await resp.json();
              if (errData && errData.error) errMsg = errData.error;
            } catch (_) {}
            hideTyping();
            setWaiting(false);
            addMessage('⚠️ ' + errMsg, 'luna');
            return;
          }

          const data = await resp.json();
          hideTyping();
          setWaiting(false);

          if (data && data.response) {
            addMessage(data.response, 'luna');
          } else {
            addMessage('Hmm, Luna didn\'t have a response. Please try again.', 'luna');
          }
        } catch (err) {
          clearTimeoutIfExists();
          hideTyping();
          setWaiting(false);
          console.error('Chat error:', err);
          addMessage('🔌 Connection issue. Please check your network and try again.', 'luna');
        }
      }

      // ---- reset ----
      function resetChat() {
        if (isWaiting) return;

        // remove all messages except welcome + quick buttons
        const children = messagesEl.children;
        const toRemove = [];
        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          if (el.id !== 'welcomeMsg' && el.id !== 'quickGrid') {
            toRemove.push(el);
          }
        }
        toRemove.forEach(el => el.remove());

        // show welcome + quick buttons
        if (welcomeMsg) welcomeMsg.style.display = 'block';
        if (quickGrid) quickGrid.style.display = 'flex';

        // clear input
        inputEl.value = '';
        inputEl.style.height = 'auto';

        // hide typing
        hideTyping();
        setWaiting(false);
        clearTimeoutIfExists();

        scrollDown();
      }

      // ---- auto-resize textarea ----
      function autoResize() {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
      }

      // ---- event listeners ----
      sendBtn.addEventListener('click', function() {
        sendMessage(inputEl.value);
      });

      inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(inputEl.value);
        }
      });

      inputEl.addEventListener('input', autoResize);

      resetBtn.addEventListener('click', resetChat);

      // quick buttons
      quickGrid.addEventListener('click', function(e) {
        const btn = e.target.closest('.quick-btn');
        if (!btn) return;
        const text = btn.getAttribute('data-text');
        if (text) sendMessage(text);
      });

      // ---- init ----
      // focus input on load
      setTimeout(() => inputEl.focus(), 400);

      // send on paste (optional convenience)
      inputEl.addEventListener('paste', function() {
        setTimeout(autoResize, 10);
      });

      // ---- expose for debugging (optional) ----
      window.__luna = { sendMessage, resetChat };
    })();
  </script>
</body>
</html>`;

// ============================================================
// WORKER — handles both GET (HTML) and POST (API)
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ---- GET /  : serve the chatbot page ----
    if (request.method === 'GET' && path === '/') {
      return new Response(HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    // ---- GET /api/chat : health / status check ----
    if (request.method === 'GET' && path === '/api/chat') {
      return new Response(JSON.stringify({
        status: 'ok',
        model: MODEL,
        message: 'Luna AI API is ready. Send POST requests with { "message": "..." }'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ---- POST /api/chat : AI chat ----
    if (request.method === 'POST' && path === '/api/chat') {
      try {
        const body = await request.json();
        const userMessage = body?.message?.trim();

        if (!userMessage) {
          return new Response(JSON.stringify({ error: 'Missing message field.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // ---- build conversation history ----
        // We keep a small in-memory history per request using the messages array.
        // The frontend does NOT send the full history — we build it here from
        // the user's current message and a minimal system prompt.
        // For follow-up context, the frontend could send history, but we keep it
        // simple and stateless: each request includes the user's message,
        // and we rely on the system prompt + the single user message.
        // However, to support multi-turn, we can include a short history.
        // We'll use a fixed system prompt + the current user message.
        // For a more stateful approach, the frontend could send previous messages,
        // but to keep it clean and avoid duplication, we'll just use the current
        // message with a system prompt that sets Luna's personality.
        // The user asked to remember several previous messages — we'll implement
        // that by having the frontend send the last few messages in the request.
        // But to keep the API clean and the Worker stateless, we'll have the
        // frontend include a 'history' array in the POST body.
        // However, the user said "The chat should remember several previous messages
        // during the current browser session so follow-up questions make sense."
        // That means the frontend should manage the history and send it with each
        // request. We'll implement that now.

        // We'll exp    "passed out",
    "can't breathe",
    "cannot breathe",
    "trouble breathing",
    "very heavy bleeding",
    "bleeding very heavily",
    "unbearable pain",
    "sudden severe pain",
    "severe weakness"
  ];

  if (redFlags.some((flag) => t.includes(flag))) {
    return "Those symptoms can need prompt medical attention. Please tell a trusted adult and get medical care promptly, especially if the symptoms are severe, sudden, or getting worse.";
  }

  return null;
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0d0a13">

<title>Luna AI</title>

<style>
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  height: 100%;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  background: #0d0a13;
  color: #f8f4ff;
}

.app {
  height: 100dvh;
  max-width: 760px;
  margin: auto;
  display: flex;
  flex-direction: column;
  background: #0d0a13;
}

header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 20px;
  color: #1b1025;
  background: linear-gradient(135deg,#c77fff,#ff91bd);
}

.title {
  flex: 1;
}

.title h1 {
  margin: 0;
  font-size: 20px;
}

.title p {
  margin: 3px 0 0;
  color: #aa9db8;
  font-size: 13px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7ee2a8;
  margin-right: 6px;
}

.clear {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  background: #171120;
  color: white;
  font-size: 19px;
}

.notice {
  margin: 12px 14px 0;
  padding: 10px 12px;
  border: 1px solid rgba(199,127,255,.16);
  background: rgba(199,127,255,.07);
  border-radius: 13px;
  color: #d0c4db;
  font-size: 12px;
}

.chat {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.msg {
  max-width: 87%;
  padding: 12px 14px;
  border-radius: 17px;
  line-height: 1.48;
  font-size: 15px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.bot {
  align-self: flex-start;
  background: #21182e;
  border: 1px solid rgba(255,255,255,.08);
  border-bottom-left-radius: 5px;
}

.me {
  align-self: flex-end;
  background: linear-gradient(135deg,#8654c5,#a35fc4);
  border-bottom-right-radius: 5px;
}

.typing {
  display: flex;
  gap: 5px;
  width: max-content;
}

.typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #aa9db8;
  animation: b .7s infinite alternate;
}

.typing i:nth-child(2) {
  animation-delay: .15s;
}

.typing i:nth-child(3) {
  animation-delay: .3s;
}

@keyframes b {
  to {
    transform: translateY(-4px);
    opacity: .45;
  }
}

.chips {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 7px 14px 9px;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.chips button {
  white-space: nowrap;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.08);
  background: #21182e;
  color: white;
  padding: 9px 13px;
}

form {
  display: flex;
  gap: 9px;
  align-items: flex-end;
  padding: 11px 14px 15px;
  border-top: 1px solid rgba(255,255,255,.08);
}

textarea {
  flex: 1;
  resize: none;
  min-height: 48px;
  max-height: 130px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.08);
  background: #171120;
  color: white;
  padding: 13px 14px;
  font: inherit;
  outline: none;
}

textarea:focus {
  border-color: rgba(199,127,255,.55);
}

.send {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border: 0;
  border-radius: 15px;
  background: linear-gradient(135deg,#c77fff,#ff91bd);
  color: #1b1022;
  font-size: 19px;
  font-weight: 900;
}

.send:disabled {
  opacity: .5;
}

@media(min-width:760px) {
  .app {
    height: min(900px,94dvh);
    margin-top: 3dvh;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 24px;
    overflow: hidden;
  }
}
</style>
</head>

<body>

<main class="app">

<header>
  <div class="avatar">L</div>

  <div class="title">
    <h1>Luna AI</h1>
    <p><span class="dot"></span>Period support assistant</p>
  </div>

  <button class="clear" id="clear" type="button">↻</button>
</header>

<div class="notice">
General period-support information only — Luna cannot diagnose medical conditions.
</div>

<section class="chat" id="chat" aria-live="polite"></section>

<div class="chips">
  <button type="button" data-q="I have period cramps. What can help?">Cramps</button>
  <button type="button" data-q="What helps with period bloating?">Bloating</button>
  <button type="button" data-q="I feel tired during my period. What can help?">Tired</button>
  <button type="button" data-q="What foods can help me feel better during my period?">Food</button>
  <button type="button" data-q="I have a headache during my period. What can help?">Headache</button>
</div>

<form id="form">
  <textarea id="input" rows="1" maxlength="1000" placeholder="Message Luna..."></textarea>
  <button class="send" id="send" type="submit">➤</button>
</form>

</main>

<script>
var chat = document.getElementById("chat");
var input = document.getElementById("input");
var form = document.getElementById("form");
var sendButton = document.getElementById("send");
var history = [];

function addMessage(text, role) {
  var div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "me" : "bot");
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  removeTyping();

  var div = document.createElement("div");
  div.id = "typing";
  div.className = "msg bot typing";
  div.innerHTML = "<i></i><i></i><i></i>";

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function removeTyping() {
  var el = document.getElementById("typing");

  if (el) {
    el.remove();
  }
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 130) + "px";
}

async function askLuna(text) {
  text = String(text || "").trim();

  if (!text || sendButton.disabled) {
    return;
  }

  addMessage(text, "user");

  history.push({
    role: "user",
    content: text
  });

  input.value = "";
  resizeInput();
  sendButton.disabled = true;
  showTyping();

  var controller = new AbortController();

  var timer = setTimeout(function () {
    controller.abort();
  }, 25000);

  try {
    var response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        history: history.slice(-6)
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    var data = await response.json();

    removeTyping();

    if (!response.ok) {
      throw new Error(data.error || "Luna could not reply.");
    }

    if (!data.reply) {
      throw new Error("Luna returned an empty reply.");
    }

    addMessage(data.reply, "assistant");

    history.push({
      role: "assistant",
      content: data.reply
    });
  } catch (error) {
    clearTimeout(timer);
    removeTyping();

    if (error && error.name === "AbortError") {
      addMessage(
        "Luna took too long to answer. Please try once more.",
        "assistant"
      );
    } else {
      addMessage(
        "Luna could not connect right now. Please try again.",
        "assistant"
      );

      console.error(error);
    }
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  askLuna(input.value);
});

input.addEventListener("input", resizeInput);

input.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-q]").forEach(function (button) {
  button.addEventListener("click", function () {
    askLuna(button.dataset.q);
  });
});

document.getElementById("clear").addEventListener("click", function () {
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
resizeInput();
</script>

</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method === "GET") {
        return json({
          ok: true,
          model: MODEL,
          message: "Luna AI API is online."
        });
      }

      if (request.method !== "POST") {
        return json(
          {
            error: "Method not allowed."
          },
          405
        );
      }

      if (!env.AI) {
        console.error("Missing Workers AI binding named AI.");

        return json(
          {
            error: "Workers AI is not configured."
          },
          500
        );
      }

      try {
        const body = await request.json();

        const message = String(body?.message || "")
          .trim()
          .slice(0, 1000);

        if (!message) {
          return json(
            {
              error: "Message required."
            },
            400
          );
        }

        const urgent = urgentMessage(message);

        if (urgent) {
          return json({
            reply: urgent
          });
        }

        const history = Array.isArray(body?.history)
          ? body.history
              .filter(
                (item) =>
                  item &&
                  (item.role === "user" || item.role === "assistant") &&
                  typeof item.content === "string"
              )
              .slice(-6)
              .map((item) => ({
                role: item.role,
                content: item.content.slice(0, 1000)
              }))
          : [];

        if (
          !history.length ||
          history[history.length - 1].content !== message
        ) {
          history.push({
            role: "user",
            content: message
          });
        }

        const result = await env.AI.run(MODEL, {
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            ...history
          ],
          max_tokens: 220,
          temperature: 0.4,
          stream: false
        });

        const reply =
          result && typeof result.response === "string"
            ? result.response.trim()
            : "";

        if (!reply) {
          console.error(
            "Empty Workers AI response:",
            JSON.stringify(result)
          );

          return json(
            {
              error: "Workers AI returned an empty response."
            },
            502
          );
        }

        return json({
          reply: reply
        });
      } catch (error) {
        console.error(
          "WORKERS_AI_ERROR:",
          error?.message || String(error)
        );

        return json(
          {
            error: "Workers AI request failed."
          },
          500
        );
      }
    }

    return new Response(PAGE, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};
