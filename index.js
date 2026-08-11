/**
 * Luna AI - Single-file Cloudflare Worker Application
 * Entry Point: index.js
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: GET /api/chat (API Status Check)
    if (url.pathname === '/api/chat' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'online',
          app: 'Luna AI',
          binding: Boolean(env.AI),
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Route: POST /api/chat (AI Text Generation Endpoint)
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChatRequest(request, env);
    }

    // Route: GET / (Frontend UI)
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(getHTMLPage(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }

    // Fallback 404
    return new Response('Not Found', { status: 404 });
  }
};

/**
 * Handles incoming chat API requests
 */
async function handleChatRequest(request, env) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    if (!env.AI) {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare Workers AI binding (env.AI) is missing or not configured.'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required and cannot be empty.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Keep conversation history small to preserve speed and avoid context blowup
    const recentHistory = messages.slice(-8);

    // Safety and persona system instructions
    const systemPrompt = {
      role: 'system',
      content: `You are Luna, a friendly, supportive, natural, and conversational period support assistant.
Your goal is to provide warm, practical comfort tips for period symptoms (cramps, bloating, fatigue, headaches, mood changes, sleep, hydration, food, gentle exercise, hygiene, and cycle questions).

STRICT RULES:
1. Provide practical, concise advice using clear formatting (short paragraphs or light bullet points). Avoid wall-of-text responses.
2. MEDICAL DISCLAIMER & SAFETY: You provide general period-support information, NOT medical diagnosis or treatment. You are NOT a doctor. Never provide medical dosages for medications.
3. EMERGENCY SYMPTOMS: If the user describes emergency/urgent symptoms (fainting, trouble breathing, severe/sudden excruciating pain, severe weakness, or unusually heavy bleeding like soaking through a pad/tampon every hour), IMMEDIATELY advise them to inform a trusted adult, family member, or seek prompt emergency medical attention.`
    };

    const formattedMessages = [systemPrompt, ...recentHistory];

    // Call Cloudflare Workers AI using the reliable model @cf/meta/llama-3.1-8b-instruct
    const aiPromise = env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: formattedMessages,
      stream: false,
      max_tokens: 512
    });

    // 15-second backend safety timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI execution timed out')), 15000)
    );

    const response = await Promise.race([aiPromise, timeoutPromise]);

    let botReply = '';

    // Extract text safely based on Cloudflare Workers AI Llama output format
    if (response && response.response) {
      botReply = response.response.trim();
    } else if (typeof response === 'string') {
      botReply = response.trim();
    }

    if (!botReply) {
      botReply = "I'm having a little trouble thinking right now, but I'm here for you! Could you try asking that again?";
    }

    return new Response(
      JSON.stringify({ reply: botReply }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Luna AI Handler Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Luna is currently experiencing high demand or an internal error.',
        details: error.message || 'Unknown error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Returns the HTML, CSS, and Client JS single-page web interface
 */
function getHTMLPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Luna AI - Period Support Assistant</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background-color: #0f0a1c;
      color: #f3f0ff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      min-height: 100dvh;
      overflow: hidden;
    }

    .app-container {
      width: 100%;
      max-width: 500px;
      height: 100vh;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background-color: #17102b;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      position: relative;
    }

    /* Header */
    header {
      background-color: #231842;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #33245e;
      z-index: 10;
    }

    .header-info h1 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #e2d9f3;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-info .status {
      font-size: 0.8rem;
      color: #b1a2d4;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      display: inline-block;
    }

    .reset-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #d1c4e9;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .reset-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }

    /* Chat Area */
    .chat-box {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      scroll-behavior: smooth;
    }

    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 0.95rem;
      line-height: 1.45;
      word-wrap: break-word;
      white-space: pre-wrap;
      animation: fadeIn 0.25s ease-out forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bot-message {
      background-color: #2c1e54;
      color: #f3f0ff;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      border: 1px solid #3c2a70;
    }

    .user-message {
      background-color: #7c3aed;
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    /* Quick Action Buttons */
    .quick-actions {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 8px 16px 12px 16px;
      background-color: #17102b;
      scrollbar-width: none;
    }

    .quick-actions::-webkit-scrollbar {
      display: none;
    }

    .quick-btn {
      background-color: #271a4d;
      color: #d8c7ff;
      border: 1px solid #432e7a;
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 0.82rem;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-btn:hover, .quick-btn:active {
      background-color: #6d28d9;
      color: #ffffff;
      border-color: #8b5cf6;
    }

    /* Input Area */
    .input-container {
      padding: 12px 16px 16px 16px;
      background-color: #1d1438;
      border-top: 1px solid #2e1f57;
      display: flex;
      gap: 10px;
      align-items: center;
    }

    input[type="text"] {
      flex: 1;
      background-color: #0f0a1c;
      border: 1px solid #3b286e;
      color: #f3f0ff;
      padding: 12px 16px;
      border-radius: 24px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus {
      border-color: #8b5cf6;
    }

    input[type="text"]::placeholder {
      color: #8372ab;
    }

    .send-btn {
      background-color: #7c3aed;
      color: white;
      border: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
      flex-shrink: 0;
    }

    .send-btn:hover {
      background-color: #6d28d9;
    }

    .send-btn:active {
      transform: scale(0.95);
    }

    .send-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    /* Typing Dots */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 12px 18px;
      background-color: #2c1e54;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      border: 1px solid #3c2a70;
      width: fit-content;
    }

    .typing-dot {
      width: 7px;
      height: 7px;
      background-color: #b1a2d4;
      border-radius: 50%;
      animation: pulse 1.4s infinite ease-in-out both;
    }

    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes pulse {
      0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
  </style>
</head>
<body>

  <div class="app-container">
    <header>
      <div class="header-info">
        <h1>Luna AI 🌙</h1>
        <div class="status">
          <span class="status-dot"></span>
          <span>Period support assistant</span>
        </div>
      </div>
      <button class="reset-btn" id="resetBtn" onclick="resetChat()">Reset</button>
    </header>

    <div class="chat-box" id="chatBox"></div>

    <div class="quick-actions">
      <button class="quick-btn" onclick="sendQuickMsg('I have period cramps, what can help?')">Cramps 🌸</button>
      <button class="quick-btn" onclick="sendQuickMsg('How can I reduce period bloating?')">Bloating 💧</button>
      <button class="quick-btn" onclick="sendQuickMsg('I feel super tired during my period, what helps?')">Tired 😴</button>
      <button class="quick-btn" onclick="sendQuickMsg('What are good foods to eat on my period?')">Food 🍎</button>
      <button class="quick-btn" onclick="sendQuickMsg('How do I manage period headaches?')">Headache 🤕</button>
    </div>

    <div class="input-container">
      <input type="text" id="userInput" placeholder="Ask Luna anything..." onkeydown="handleKeyDown(event)" autocomplete="off">
      <button class="send-btn" onclick="sendMessage()" aria-label="Send message">
        <svg viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>

  <script>
    const WELCOME_MSG = "Hi 💜 I'm Luna. Tell me what you're dealing with during your period and I'll give practical comfort tips. You can talk normally — no special keywords needed.";
    
    // In-memory conversation history for context continuity
    let conversationHistory = [];
    let isWaitingForResponse = false;

    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');

    // Initialize Chat
    window.addEventListener('DOMContentLoaded', () => {
      resetChat();
    });

    function resetChat() {
      chatBox.innerHTML = '';
      conversationHistory = [];
      appendMessage('bot', WELCOME_MSG);
    }

    function appendMessage(sender, text) {
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message');
      msgDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
      msgDiv.textContent = text;
      chatBox.appendChild(msgDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showTypingIndicator() {
      const indicator = document.createElement('div');
      indicator.id = 'typingIndicator';
      indicator.classList.add('typing-indicator');
      indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
      chatBox.appendChild(indicator);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function hideTypingIndicator() {
      const indicator = document.getElementById('typingIndicator');
      if (indicator) {
        indicator.remove();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Enter') {
        sendMessage();
      }
    }

    function sendQuickMsg(text) {
      if (isWaitingForResponse) return;
      userInput.value = text;
      sendMessage();
    }

    async function sendMessage() {
      const text = userInput.value.trim();
      if (!text || isWaitingForResponse) return;

      // Render User Message
      appendMessage('user', text);
      userInput.value = '';
      isWaitingForResponse = true;

      // Prepare context without duplicating the current user message in array
      const apiMessages = [
        ...conversationHistory,
        { role: 'user', content: text }
      ];

      showTypingIndicator();

      // Client-side 12-second controller timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        hideTypingIndicator();

        if (!response.ok) {
          throw new Error('Server returned error status ' + response.status);
        }

        const data = await response.json();

        if (data.reply) {
          appendMessage('bot', data.reply);
          
          // Push both to history after successful reply
          conversationHistory.push({ role: 'user', content: text });
          conversationHistory.push({ role: 'assistant', content: data.reply });

          // Keep history limited to the last 6 messages
          if (conversationHistory.length > 6) {
            conversationHistory = conversationHistory.slice(-6);
          }
        } else {
          appendMessage('bot', data.error || "I'm having trouble providing a tip right now. Please try again in a moment.");
        }

      } catch (err) {
        clearTimeout(timeoutId);
        hideTypingIndicator();
        
        if (err.name === 'AbortError') {
          appendMessage('bot', "Connection timed out. Please check your internet connection and try asking Luna again.");
        } else {
          appendMessage('bot', "Oops! I ran into an error getting that information. Please try asking again.");
        }
      } finally {
        isWaitingForResponse = false;
      }
    }
  </script>
</body>
</html>`;
    }
