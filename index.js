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
      var messagesEl = document.getElementById('messages');
      var inputEl = document.getElementById('inputEl');
      var sendBtn = document.getElementById('sendBtn');
      var resetBtn = document.getElementById('resetBtn');
      var typingContainer = document.getElementById('typingContainer');
      var welcomeMsg = document.getElementById('welcomeMsg');
      var quickGrid = document.getElementById('quickGrid');

      // ---- state ----
      var isWaiting = false;
      var timeoutId = null;

      // ---- helpers ----
      function scrollDown() {
        requestAnimationFrame(function() {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });
      }

      function addMessage(text, sender) {
        var div = document.createElement('div');
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
      function sendMessage(userText) {
        if (!userText || userText.trim() === '') return;
        if (isWaiting) return;

        var trimmed = userText.trim();
        if (trimmed.length === 0) return;

        removeWelcomeAndButtons();

        addMessage(trimmed, 'user');

        inputEl.value = '';
        inputEl.style.height = 'auto';

        showTyping();
        setWaiting(true);

        clearTimeoutIfExists();
        timeoutId = setTimeout(function() {
          if (isWaiting) {
            hideTyping();
            setWaiting(false);
            addMessage('⏱️ Sorry, Luna took too long to respond. Please try again.', 'luna');
            timeoutId = null;
          }
        }, REQUEST_TIMEOUT_MS);

        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed })
        })
        .then(function(resp) {
          clearTimeoutIfExists();
          if (!resp.ok) {
            return resp.json().then(function(errData) {
              var errMsg = 'Sorry, Luna hit a snag. Please try again.';
              if (errData && errData.error) errMsg = errData.error;
              hideTyping();
              setWaiting(false);
              addMessage('⚠️ ' + errMsg, 'luna');
            }).catch(function() {
              hideTyping();
              setWaiting(false);
              addMessage('⚠️ Sorry, Luna hit a snag. Please try again.', 'luna');
            });
          }
          return resp.json();
        })
        .then(function(data) {
          hideTyping();
          setWaiting(false);
          if (data && data.response) {
            addMessage(data.response, 'luna');
          } else {
            addMessage('Hmm, Luna didn\'t have a response. Please try again.', 'luna');
          }
        })
        .catch(function(err) {
          clearTimeoutIfExists();
          hideTyping();
          setWaiting(false);
          console.error('Chat error:', err);
          addMessage('🔌 Connection issue. Please check your network and try again.', 'luna');
        });
      }

      // ---- reset ----
      function resetChat() {
        if (isWaiting) return;

        var children = messagesEl.children;
        var toRemove = [];
        for (var i = 0; i < children.length; i++) {
          var el = children[i];
          if (el.id !== 'welcomeMsg' && el.id !== 'quickGrid') {
            toRemove.push(el);
          }
        }
        toRemove.forEach(function(el) { el.remove(); });

        if (welcomeMsg) welcomeMsg.style.display = 'block';
        if (quickGrid) quickGrid.style.display = 'flex';

        inputEl.value = '';
        inputEl.style.height = 'auto';

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

      quickGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.quick-btn');
        if (!btn) return;
        var text = btn.getAttribute('data-text');
        if (text) sendMessage(text);
      });

      // ---- init ----
      setTimeout(function() { inputEl.focus(); }, 400);

      inputEl.addEventListener('paste', function() {
        setTimeout(autoResize, 10);
      });

      window.__luna = { sendMessage: sendMessage, resetChat: resetChat };
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

        // build conversation history (frontend sends history array)
        let history = body.history || [];
        if (!Array.isArray(history)) history = [];
        if (history.length > MAX_HISTORY) {
          history = history.slice(-MAX_HISTORY);
        }

        const messages = [
          {
            role: 'system',
            content: 'You are Luna, a friendly, supportive, and concise period-support assistant. You give practical tips for period-related issues like cramps, bloating, tiredness, headaches, mood changes, sleep, hydration, food, gentle exercise, period hygiene, period products, and general cycle questions. Keep responses short, natural, and conversational — 2 to 4 short paragraphs max. Use a warm, caring tone. Never give medical diagnoses or medication dosages. If someone describes potentially urgent symptoms (fainting, trouble breathing, severe/sudden pain, severe weakness, unusually heavy bleeding), gently recommend telling a trusted adult and seeking prompt medical attention. You are not a doctor. Be helpful and comforting.'
          }
        ];

        for (const entry of history) {
          if (entry.role === 'user' || entry.role === 'assistant') {
            messages.push({ role: entry.role, content: entry.content });
          }
        }

        messages.push({ role: 'user', content: userMessage });

        // ---- call Cloudflare Workers AI ----
        const response = await env.AI.run(MODEL, {
          messages: messages,
          stream: false,
          max_tokens: 512,
          temperature: 0.7
        });

        // ---- extract the answer ----
        let answer = null;

        if (response && typeof response === 'object') {
          if (response.response) {
            answer = response
