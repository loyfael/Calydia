# 🤖 Calydia – Modular Discord Bot

**Calydia** is a open source modern, modular, plugin-ready Discord bot written in TypeScript.  
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
**How makes a plugin?** Take a look at this [template](https://github.com/loyfael/Calydia/blob/main/src/plugins/pluginExample.md)
- 🧩 Plugin system (just drop your plugin into `/src/plugins`)
- 🔁 Production-ready with PM2 support
- 🧪 TypeScript-based, strict and typed
## 🧩 Actual plugins 
- ✅ Role assignment via emoji reaction
- 🎟️ Modern ticket system
- 💬 Slash command `/info` to display useful server links
- 🧊 Minecraft Player Server Count
- 😡 Contestation for send a contract between you and player for send client logs
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
DISCORD_TOKEN=your-token # This is the bot token you get from the Discord Developer Portal.
GUILD_ID=your-guild-id # This is the guild ID where the bot will operate.
CHANNEL_ID=channel-where-message-is-sent # This is the channel where the message will be sent.
ROLE_ID=role-to-assign # This is the role that will be assigned to the user when they react to the message.
TARGET_MESSAGE_ID=le-message-id # This is the message ID of the message you want to react to.
LOG_CHANNEL_ID=your-log-channel-id # This is the channel where logs will be sent.
MANAGER_ROLE_ID=your-manager-role-id # This is the role that will be assigned to the user when they react to the message.
CONTEST_ALLOWED_ROLE_ID=your-contest-allowed-role-id # This is the role that will be assigned to the user who can execute the command.
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
