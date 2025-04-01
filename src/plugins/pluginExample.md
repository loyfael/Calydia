# 🔌 Adding a New Plugin
A plugin is simply a TypeScript file in the `src/plugins/` folder that exports by default a function taking the Discord client as a parameter.  
This system allows you to separate each feature and add new ones very easily without touching the core of the bot.
```
📁 Folder
src/
└── plugins/
    └── myAwesomePlugin.ts   ✅ New plugin
```

# ✅ Plugin Structure
Here is the skeleton of a minimal plugin:

```ts
// src/plugins/myAwesomePlugin.ts
import { Client } from 'discord.js';

export default function myAwesomePlugin(client: Client) {
  client.on('ready', () => {
    console.log('🎉 myAwesomePlugin is ready!');
  });

  // You can add any behavior you want here:
  // - slash commands
  // - message reactions
  // - moderation system
  // - custom logs
}
```

# 📦 Automatic Loading
All `.ts` or `.js` files in `src/plugins/` are automatically loaded thanks to the `core/loader.ts` file.  
You don’t need to do anything else but create a file, export it as shown above, and the bot will execute it on startup.

# 👇 Plugin Examples
1. Plugin: Auto-response
```ts
// src/plugins/hello.ts
import { Client } from 'discord.js';

export default function helloPlugin(client: Client) {
  client.on('messageCreate', (message) => {
    if (message.content.toLowerCase() === 'hello') {
      message.reply('Hello there 👋');
    }
  });
}
```

1. Plugin: Slash Command for Ping
```ts
// src/plugins/slashPing.ts
import { Client, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from '../core/env.js';

const command = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Returns Pong!');

export default function slashPing(client: Client) {
  client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
      await rest.put(
        Routes.applicationGuildCommands(client.user!.id, config.guildId),
        { body: [command.toJSON()] }
      );
      console.log('✅ /ping command registered');
    } catch (err) {
      console.error('Error registering the /ping command', err);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'ping') {
      await interaction.reply('🏓 Pong!');
    }
  });
}
```

# 🧪 Tips for Future Plugins
What you want to do… Example method to listen to  
React to a sent message	`client.on('messageCreate', fn)`  
React to a slash command	`client.on('interactionCreate', fn)`  
Manage roles	`GuildMember.roles.add()`  
React to an emoji reaction	`client.on('messageReactionAdd', fn)`  
Log member join/leave events	`client.on('guildMemberAdd', fn)`  
Create a slash command	Use `SlashCommandBuilder`

# 📌 Tip: Disabling a Plugin
You just need to:  
- Rename its file (e.g., `hello.ts → hello.ts.disabled`)  
- Temporarily move it elsewhere or comment out its content / do not export a default function