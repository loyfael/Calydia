// This project is licensed under the GNU General Public License v3.0 (GPLv3) with a Non-Commercial Clause.

// You are not allowed to sell my code.
// In general, you may not use my code in any commercial activity.
// You must mention that I wrote the code in any redistribution.
// You may not say that you are the author of my code.

import { Client, GatewayIntentBits, Partials } from 'discord.js';

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.Channel],
});
