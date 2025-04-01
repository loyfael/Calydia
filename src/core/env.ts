import dotenv from 'dotenv';
dotenv.config();

export const config = {
    token: process.env.DISCORD_TOKEN!,
    guildId: process.env.GUILD_ID!,
    channelId: process.env.CHANNEL_ID!,
    roleId: process.env.ROLE_ID!,
    targetMessageId: process.env.TARGET_MESSAGE_ID!,
};
