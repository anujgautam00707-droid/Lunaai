const MODEL = "@cf/zai-org/glm-4.7-flash";

const SYSTEM = `
You are Luna, a friendly period-support chatbot.

Give short, practical, medically responsible general information
about periods and menstrual comfort.

Help with:
- cramps
- bloating
- tiredness
- headaches
- mood changes
- sleep
- hydration
- food
- gentle exercise
- cycle questions
- period products and hygiene

Rules:
- Be warm and conversational.
- Give useful actions first.
- Keep most answers under 140 words.
- Do not diagnose medical conditions.
- Do not claim to be a doctor.
- Do not give personalized medication doses.
- If symptoms sound severe, suddenly unusual, or urgent,
  recommend telling a trusted adult and getting prompt medical care.
- Answer sensitive health questions factually and age-appropriately.
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

const PAGE = String.raw`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0d0a13">

<title>Luna AI</title>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  width: 100%;
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
  padding: 18px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: bold;
  font-size: 20px;
  color: #1a1023;
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
  margin: 4px 0 0;
  color: #aaa0b7;
  font-size: 14px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #78dda1;
  margin-right: 6px;
}

.clear {
  background: #171120;
  border: 1px solid rgba(255,255,255,.08);
  color: white;
  border-radius: 15px;
  width: 44px;
  height: 44px;
  font-size: 20px;
}

.notice {
  margin: 14px;
  padding: 12px;
  border-radius: 15px;
  background: #1d1429;
  border: 1px solid #332244;
  color: #cec3d8;
  font-size: 13px;
}

.chat {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 86%;
  padding: 13px 15px;
  border-radius: 18px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.bot {
  align-self: flex-start;
  background: #21182e;
  border: 1px solid rgba(255,255,255,.07);
  border-bottom-left-radius: 5px;
}

.user {
  align-self: flex-end;
  background: #9254ca;
  border-bottom-right-radius: 5px;
}

.typing {
  display: flex;
  gap: 5px;
  width: fit-content;
}

.typing span {
  width: 7px;
  height: 7px;
  background: #aaa0b7;
  border-radius: 50%;
  animation: bounce .7s infinite alternate;
}

.typing span:nth-child(2) {
  animation-delay: .15s;
}

.typing span:nth-child(3) {
  animation-delay: .3s;
}

@keyframes bounce {
  to {
    transform: translateY(-4px);
    opacity: .4;
  }
}

.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 14px;
}

.chips button {
  border: 1px solid rgba(255,255,255,.08);
  background: #21182e;
  color: white;
  border-radius: 999px;
  padding: 9px 14px;
  white-space: nowrap;
}

form {
  display: flex;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,.08);
}

textarea {
  flex: 1;
  resize: none;
  height: 50px;
  max-height: 120px;
  padding: 14px;
  color: white;
  background: #171120;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 17px;
  font: inherit;
  outline: none;
}

.send {
  width: 50px;
  height: 50px;
  border: 0;
  border-radius: 16px;
  font-size: 20px;
  background: linear-gradient(135deg,#c77fff,#ff91bd);
}

.send:disabled {
  opacity: .5;
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

  <button id="clear" class="clear">↻</button>
</header>

<div class="notice">
General period-support information only — Luna cannot diagnose medical conditions.
</div>

<section id="chat" class="chat"></section>

<div class="chips">
  <button data-msg="I have cramps. What can help?">Cramps</button>
  <button data-msg="What helps with period bloating?">Bloating</button>
  <button data-msg="I feel tired during my period. What can help?">Tired</button>
  <button data-msg="What foods can help during my period?">Food</button>
</div>

<form id="form">
  <textarea
    id="input"
    maxlength="1000"
    placeholder="Message Luna..."
  ></textarea>

  <button id="send" class="send" type="submit">
    ➤
  </button>
</form>

</main>

<script>
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const form = document.getElementById("form");
const sendButton = document.getElementById("send");

let history = [];

function addMessage(text, role) {
  const div = document.createElement("div");

  div.className =
    "message " +
    (role === "user" ? "user" : "bot");

  div.textContent = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  const div = document.createElement("div");

  div.id = "typing";
  div.className = "message bot typing";

  div.innerHTML =
    "<span></span><span></span><span></span>";

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function askLuna(text) {
  text = text.trim();

  if (!text || sendButton.disabled) return;

  addMessage(text, "user");

  history.push({
    role: "user",
    content: text
  });

  input.value = "";
  sendButton.disabled = true;

  showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message: text,
        history: history.slice(-8)
      })
    });

    const data = await response.json();

    document.getElementById("typing")?.remove();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Server error " + response.status
      );
    }

    if (!data.reply) {
      throw new Error("AI returned no reply.");
    }

    addMessage(data.reply, "assistant");

    history.push({
      role: "assistant",
      content: data.reply
    });

  } catch (error) {
    document.getElementById("typing")?.remove();

    addMessage(
      "ERROR: " + error.message,
      "assistant"
    );

  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", function(event) {
  event.preventDefault();
  askLuna(input.value);
});

input.addEventListener("keydown", function(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-msg]").forEach(function(button) {
  button.addEventListener("click", function() {
    askLuna(button.dataset.msg);
  });
});

document.getElementById("clear").addEventListener("click", function() {
  history = [];
  chat.innerHTML = "";
  welcome();
});

function welcome() {
  addMessage(
    "Hi 💜 I'm Luna. Tell me what you're dealing with during your period and I'll give practical comfort tips.",
    "assistant"
  );
}

welcome();
</script>

</body>
</html>
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CHAT API
    if (url.pathname === "/api/chat") {

      if (request.method === "GET") {
        return json({
          ok: true,
          message: "Luna AI API is online"
        });
      }

      if (request.method !== "POST") {
        return json({
          error: "Method not allowed"
        }, 405);
      }

      try {
        if (!env.AI) {
          return json({
            error: "Workers AI binding 'AI' is missing."
          }, 500);
        }

        const body = await request.json();

        const message = String(
          body?.message || ""
        )
          .trim()
          .slice(0, 1000);

        if (!message) {
          return json({
            error: "Message required."
          }, 400);
        }

        const history =
          Array.isArray(body?.history)
            ? body.history
                .filter(item =>
                  item &&
                  (
                    item.role === "user" ||
                    item.role === "assistant"
                  ) &&
                  typeof item.content === "string"
                )
                .slice(-8)
                .map(item => ({
                  role: item.role,
                  content: item.content.slice(0, 1200)
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

        console.log("Calling Workers AI:", MODEL);

        const result = await env.AI.run(
          MODEL,
          {
            messages: [
              {
                role: "system",
                content: SYSTEM
              },
              ...history
            ],

            max_tokens: 300,
            temperature: 0.5
          }
        );

        console.log(
          "Workers AI result:",
          JSON.stringify(result)
        );

        const reply =
          result?.response ||
          result?.choices?.[0]?.message?.content ||
          result?.choices?.[0]?.text ||
          "";

        if (!reply) {
          return json({
            error:
              "AI returned an empty response: " +
              JSON.stringify(result)
          }, 502);
        }

        return json({
          reply: String(reply).trim()
        });

      } catch (error) {
        const details =
          error?.message ||
          String(error);

        console.error(
          "WORKERS_AI_ERROR:",
          details
        );

        return json({
          error:
            "Workers AI error: " +
            details
        }, 500);
      }
    }

    // WEBSITE
    return new Response(PAGE, {
      headers: {
        "content-type":
          "text/html; charset=utf-8"
      }
    });
  }
};
