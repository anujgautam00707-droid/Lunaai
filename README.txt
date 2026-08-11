LUNA AI — CLOUDFLARE WORKER VERSION
====================================

This project is made for Cloudflare's current GitHub -> Worker deployment screen.

IMPORTANT:
You do NOT need to paste your Workers AI API token into this project.
wrangler.jsonc creates a Workers AI binding named AI automatically.

PROJECT STRUCTURE
-----------------
wrangler.jsonc
package.json
src/index.js
public/index.html
public/style.css
public/script.js

CLOUDFLARE BUILD SCREEN
-----------------------
Build command:
LEAVE BLANK

Deploy command:
npx wrangler deploy

Path:
/

Then press Deploy.

WHAT WRANGLER DOES
------------------
- Deploys src/index.js as the Worker backend
- Uploads everything in /public as static website files
- Creates the Workers AI binding named AI

AFTER DEPLOYMENT
----------------
Cloudflare should give you a workers.dev URL.

Open it and test:
"I have cramps and feel tired. What can I do?"

The API health endpoint is:
https://YOUR-WORKER.workers.dev/api/chat

Opening that in a browser should return:
{"ok":true,"message":"Luna AI API is online."}

SECURITY
--------
Do not add your Cloudflare API token to:
- src/index.js
- public/script.js
- public/index.html
- GitHub

Cloudflare's Workers AI binding handles AI access.
