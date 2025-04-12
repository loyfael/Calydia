// This project is licensed under the GNU General Public License v3.0 (GPLv3) with a Non-Commercial Clause.

// You are not allowed to sell my code.
// In general, you may not use my code in any commercial activity.
// You must mention that I wrote the code in any redistribution.
// You may not say that you are the author of my code.

import dotenv from 'dotenv';
dotenv.config();

export const config = {
    token: process.env.DISCORD_TOKEN!,
    guildId: process.env.GUILD_ID!,
    channelId: process.env.CHANNEL_ID!,
    roleId: process.env.ROLE_ID!,
    targetMessageId: process.env.TARGET_MESSAGE_ID!,
    managerRoleId: process.env.MANAGER_ROLE_ID!,
    logChannelId: process.env.LOG_CHANNEL_ID!,
    ticketCategoryId: process.env.TICKET_CATEGORY_ID!,
};
