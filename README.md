# 🤖 Calydia – Modular Discord Bot

**Calydia** is a modular, plugin-ready Discord bot written in TypeScript.  
It’s designed to be clean, extensible, and easy to deploy in production on a VPS.

> [!WARNING]  
> This project is licensed under the GNU General Public License v3.0 (GPLv3) with a Non-Commercial Clause.
>
> - You are not allowed to sell my code.
> - In general, you may not use my code in any commercial activity.
> - You must mention that I wrote the code in any redistribution.
> - You may not say that you are the author of my code.

---

## ✨ Features

- ✅ Role assignment via emoji reaction
- 🧩 Plugin system (just drop your plugin into `/src/plugins`)
- 💬 Slash command `/info` to display useful server links
- 🔁 Production-ready with PM2 support
- 🧪 TypeScript-based, strict and typed

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-user/calydia.git
cd calydia
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file at the root:

```env
DISCORD_TOKEN=your-bot-token
GUILD_ID=your-discord-server-id
CHANNEL_ID=channel-id-where-to-add-reaction
ROLE_ID=role-id-to-assign
TARGET_MESSAGE_ID=existing-message-id-to-watch
```

### 4. Build the bot

```bash
npm run build
```

### 5. Start the bot (development)

```bash
npm start
```

### 6. Start the bot with PM2 (production)

```bash
pm2 start dist/index.js --name calydia
pm2 save
pm2 startup
```

---

## 🧩 Adding a plugin

Create a file in `src/plugins/`:

```ts
// src/plugins/hello.ts
import { Client } from 'discord.js';

export default function hello(client: Client) {
  client.on('ready', () => {
    console.log('👋 Hello plugin is running!');
  });
}
```

Then rebuild the bot:

```bash
npm run build && pm2 restart calydia
```

---

## 📦 Project Structure

```
src/
├── index.ts          # Main entrypoint
├── core/             # Core logic (client, env, loader)
│   ├── client.ts
│   ├── env.ts
│   └── loader.ts
└── plugins/          # Drop your plugins here
    ├── reactionRole.ts
    └── slashInfo.ts
```

---

## 🔧 Requirements

- Node.js 20+
- Discord bot with necessary intents enabled
- Permissions: manage roles, read/send messages, add reactions

---

## 🧙‍♂️ Maintained by

Felke (Calydia Project)
