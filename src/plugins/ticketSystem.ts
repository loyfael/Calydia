// This project is licensed under the GNU General Public License v3.0 (GPLv3) with a Non-Commercial Clause.

// You are not allowed to sell my code.
// In general, you may not use my code in any commercial activity.
// You must mention that I wrote the code in any redistribution.
// You may not say that you are the author of my code.

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    EmbedBuilder,
    Events,
    GuildTextBasedChannel,
    Interaction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    REST,
    Routes,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    AttachmentBuilder,
    TextChannel,
    Message,
    PermissionsBitField
} from 'discord.js';

import { config } from '../core/env.js';

const TICKET_MANAGER_ROLE = config.managerRoleId;
const TICKET_LOG_CHANNEL_ID = config.logChannelId;
const TICKET_CATEGORY_ID = config.ticketCategoryId;
const cooldowns = new Map<string, number>();
const activeClaims = new Map<string, string>();
const ticketCreators = new Map<string, string>();

export default function ticketSystem(client: Client) {
    client.once('ready', async () => {
        try {

            const guild = await client.guilds.fetch(config.guildId);
            const channels = await guild.channels.fetch();

            channels.forEach(channel => {
                if (
                    channel?.type === ChannelType.GuildText &&
                    channel.parentId === TICKET_CATEGORY_ID &&
                    (channel.name.startsWith('🔴') || channel.name.startsWith('🟢'))
                ) {
                    channel.messages.fetch({ limit: 10 }).then(messages => {
                        const botMsg = messages.find(msg => msg.author.id === client.user?.id && msg.embeds.length > 0);
                        if (!botMsg) return;

                        const embed = botMsg.embeds[0];
                        const userField = embed.fields.find(f => f.name === 'User');
                        const claimField = embed.fields.find(f => f.name === 'Handled by');

                        if (userField) {
                            const userIdMatch = userField.value.match(/<@(.+)>/);
                            if (userIdMatch) ticketCreators.set(channel.id, userIdMatch[1]);
                        }
                        if (claimField) {
                            const claimerIdMatch = claimField.value.match(/<@(.+)>/);
                            if (claimerIdMatch) activeClaims.set(channel.id, claimerIdMatch[1]);
                        }
                    }).catch(() => { });
                }
            });

            const channel = await client.channels.fetch(config.channelId) as TextChannel;
            if (!channel?.isTextBased()) return;

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket-category')
                .setPlaceholder('📂 Select your category')
                .addOptions([
                    { label: '🛠️ RANDOM', value: 'support', description: 'questions, bugs etc.' },
                ]);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setDescription(`
# 🎟️ Your embedded ticket system
          `)
                .setColor(0x5865f2);

            await channel.send({ embeds: [embed], components: [row] });

            const commands = [
                new SlashCommandBuilder().setName('claim').setDescription('Claim this ticket'),
                new SlashCommandBuilder().setName('close').setDescription('Close this ticket'),
                new SlashCommandBuilder().setName('transcript').setDescription('Generate ticket transcript')
              ];
              
              for (const cmd of commands) {
                await client.application?.commands.create(cmd, config.guildId);
              }
        } catch (err) {
            console.error('❌ Error during bot setup:', err);
        }
    });

    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        try {
            if (interaction.isChatInputCommand() && interaction.commandName === 'claim') {
                const channel = interaction.channel;
                if (!channel || channel.type !== ChannelType.GuildText) return;
            
                const member = await interaction.guild?.members.fetch(interaction.user.id);
                if (!member?.roles.cache.has(TICKET_MANAGER_ROLE)) {
                    return await interaction.reply({ content: '⛔ You do not have permission to claim this ticket.', ephemeral: true });
                }
            
                // Check if the ticket is already "claimed"
                if (activeClaims.has(channel.id)) {
                    const currentHandler = activeClaims.get(channel.id);
                    return await interaction.reply({
                        content: `⚠️ This ticket is already being handled by <@${currentHandler}>.`,
                        ephemeral: true
                    });
                }
            
                activeClaims.set(channel.id, interaction.user.id);
            
                // Find the message with the bot's embed
                const messages = await channel.messages.fetch({ limit: 10 });
                const botMessage = messages.find((msg: Message) =>
                    msg.author.id === client.user?.id && msg.embeds.length > 0
                );
            
                if (!botMessage) {
                    return await interaction.reply({ content: '❌ Unable to find the ticket embed.', ephemeral: true });
                }
            
                const originalEmbed = botMessage.embeds[0];
                const newFields = originalEmbed.fields.map((field: { name: string; value: string }) =>
                    field.name === 'Pending'
                        ? { name: 'Handled by', value: `<@${interaction.user.id}>` }
                        : field
                );
            
                const updatedEmbed = EmbedBuilder.from(originalEmbed).setFields(newFields);
            
                await botMessage.edit({ embeds: [updatedEmbed] });
            
                // Rename the channel
                await channel.setName(`🟢-${channel.name.replace(/^🔴-/, '')}`);
            
                await interaction.reply({ content: '✅ This ticket is now being handled by you.', ephemeral: true });
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-category') {
                const category = interaction.values[0];
                const modal = new ModalBuilder()
                    .setCustomId(`ticket-modal-${category}`)
                    .setTitle(`Create a ${category} ticket`);

                const fields: TextInputBuilder[] = [];

                switch (category) {
                    case 'support':
                        fields.push(
                            new TextInputBuilder()
                                .setCustomId('ticket-username')
                                .setLabel('In-game username')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: JohnDoe1234')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-subject')
                                .setLabel('Request type')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: Bug, Question, Help request')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-description')
                                .setLabel('Concerned instance')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: Spawn, Mining..')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-support-ask')
                                .setLabel('Request description')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Hello, here is my request.. Thank you!')
                                .setMaxLength(2500)
                                .setRequired(true)
                                .setMinLength(50),
                            new TextInputBuilder()
                                .setCustomId('ticket-discord-tag')
                                .setLabel('Additional information')
                                .setStyle(TextInputStyle.Short)
                                .setMaxLength(300)
                                .setPlaceholder('Ex: Position X Y Z, screenshot link, etc.')
                                .setRequired(false)
                        );
                        break;
                    case 'moderation':
                        fields.push(
                            new TextInputBuilder()
                                .setCustomId('ticket-username')
                                .setLabel('In-game username')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: JohnDoe1234')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-user')
                                .setLabel('Request type')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: Report, Appeal, Refund')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-reason')
                                .setLabel('Concerned instance')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: Spawn, Mining..')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-evidence')
                                .setLabel('Description')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Hello, here is my issue.. Thank you!')
                                .setMaxLength(2500)
                                .setRequired(true)
                                .setMinLength(50),
                            new TextInputBuilder()
                                .setCustomId('ticket-where')
                                .setLabel('Additional information')
                                .setStyle(TextInputStyle.Paragraph)
                                .setMaxLength(300)
                                .setPlaceholder('Ex: Position X Y Z, screenshot link, etc.')
                                .setRequired(false)
                        );
                        break;
                    case 'partnership':
                        fields.push(
                            new TextInputBuilder()
                                .setCustomId('ticket-username')
                                .setLabel('In-game username')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: JohnDoe1234')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-server-name')
                                .setLabel('Project name')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: MyProject, ArtistName..')
                                .setMaxLength(32),
                            new TextInputBuilder()
                                .setCustomId('ticket-server-info')
                                .setLabel('Partnership type')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                                .setPlaceholder('Ex: Partner, Event, Other..')
                                .setMaxLength(2500)
                                .setMinLength(50),
                            new TextInputBuilder()
                                .setCustomId('ticket-server-link')
                                .setLabel('Proposal')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                                .setPlaceholder('Hello, here is my proposal.. Thank you!')
                                .setMaxLength(2500)
                                .setMinLength(50),
                            new TextInputBuilder()
                                .setCustomId('ticket-why-partner')
                                .setLabel('Contact')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Ex: Discord, Twitter, etc.')
                                .setMaxLength(300)
                        );
                        break;
                }

                modal.addComponents(
                    ...fields.map(f => new ActionRowBuilder<TextInputBuilder>().addComponents(f))
                );

                return await interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket-modal-')) {
                const category = interaction.customId.split('ticket-modal-')[1];
                const userId = interaction.user.id;
                const now = Date.now();
                const last = cooldowns.get(userId) || 0;

                if (now - last < 60000) {
                    return await interaction.reply({ content: '⏳ Please wait a moment..', flags: 64 });
                }

                cooldowns.set(userId, now);

                const responses: { name: string, value: string }[] = [
                    { name: 'In-game username', value: interaction.fields.getTextInputValue('ticket-username') }
                ];

                switch (category) {
                    case 'support':
                        responses.push(
                            { name: 'Request type', value: interaction.fields.getTextInputValue('ticket-subject') },
                            { name: 'Instance', value: interaction.fields.getTextInputValue('ticket-description') },
                            { name: 'Description', value: interaction.fields.getTextInputValue('ticket-support-ask') || 'N/A' },
                            { name: 'Additional information', value: interaction.fields.getTextInputValue('ticket-discord-tag') || 'N/A' }
                        );
                        break;
                    case 'moderation':
                        responses.push(
                            { name: 'Request type', value: interaction.fields.getTextInputValue('ticket-user') },
                            { name: 'Instance', value: interaction.fields.getTextInputValue('ticket-reason') },
                            { name: 'Description', value: interaction.fields.getTextInputValue('ticket-evidence') || 'N/A' },
                            { name: 'Additional information', value: interaction.fields.getTextInputValue('ticket-where') || 'N/A' }
                        );
                        break;
                    case 'partnership':
                        responses.push(
                            { name: 'Project name', value: interaction.fields.getTextInputValue('ticket-server-name') },
                            { name: 'Partnership type', value: interaction.fields.getTextInputValue('ticket-server-info') },
                            { name: 'Proposal', value: interaction.fields.getTextInputValue('ticket-server-link') },
                            { name: 'Contact', value: interaction.fields.getTextInputValue('ticket-why-partner') }
                        );
                        break;
                }

                const categoryChannel = interaction.guild?.channels.cache.get(TICKET_CATEGORY_ID);

                if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory) {
                    return await interaction.reply({ content: '❌ Error: category not found.', ephemeral: true });
                }

                const ticketChannel = await interaction.guild?.channels.create({
                    name: `🔴-${interaction.user.username}-${category}`,
                    type: ChannelType.GuildText,
                    parent: categoryChannel.id,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: TICKET_MANAGER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] }
                    ]
                });

                if (!ticketChannel) {
                    return await interaction.reply({ content: '❌ Error while creating the channel.', ephemeral: true });
                }

                ticketCreators.set(ticketChannel.id, interaction.user.id);

                const embed = new EmbedBuilder()
                    .setTitle(`🎟️ ${category.charAt(0).toUpperCase() + category.slice(1)} Ticket`)
                    .addFields(
                        { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Category', value: category, inline: true },
                        ...responses,
                        { name: 'Created on', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
                        { name: 'Pending', value: 'Please wait, a staff member will handle your ticket.' }
                    )
                    .setColor(0x2ecc71);

                const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('close-ticket').setLabel('🛑 Close the ticket').setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [controlRow] });

                await interaction.reply({ content: `✅ Your ticket has been created here: ${ticketChannel}`, flags: 64 });
            }

            if (interaction.isButton()) {
                const channel = interaction.channel as GuildTextBasedChannel;
                const ticketChannelId = channel.id;

                if (interaction.customId === 'claim-ticket') {
                    const member = await interaction.guild?.members.fetch(interaction.user.id);
                    if (!member?.roles.cache.has(TICKET_MANAGER_ROLE)) {
                        return await interaction.reply({ content: '⛔ You do not have permission.', flags: 64 });
                    }
                    if (activeClaims.has(ticketChannelId)) {
                        return await interaction.reply({ content: `⚠️ Already being handled by <@${activeClaims.get(ticketChannelId)}>`, flags: 64 });
                    }

                    activeClaims.set(ticketChannelId, interaction.user.id);

                    // Modify the original embed to replace the "Pending" field
                    const messages = await channel.messages.fetch({ limit: 10 });
                    const botMessage = messages.find(msg => msg.author.id === client.user?.id && msg.embeds.length > 0);

                    if (botMessage) {
                        const originalEmbed = botMessage.embeds[0];
                        const updatedEmbed = EmbedBuilder.from(originalEmbed).setFields(
                            originalEmbed.fields.map(field =>
                                field.name === 'Pending'
                                    ? { name: 'Handled by', value: `<@${interaction.user.id}>` }
                                    : field
                            )
                        );
                        await botMessage.edit({ embeds: [updatedEmbed] });
                    }

                    await channel.setName(`🟢-${channel.name.replace(/^🔴-/, '')}`);
                }

                if (interaction.customId === 'close-ticket') {
                    const allMessages = await channel.messages.fetch({ limit: 100 });
                    const transcriptText = allMessages.map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).reverse().join('\n');

                    const creatorId = ticketCreators.get(ticketChannelId);
                    if (!creatorId) return;

                    const creator = await client.users.fetch(creatorId);
                    const creatorName = creator.username.replace(/[^a-zA-Z0-9-_]/g, '_');
                    const timestamp = new Date().toISOString().split('T')[0];
                    const filename = `ticket-${creatorName}-${timestamp}.txt`;
                    const buffer = Buffer.from(transcriptText, 'utf-8');
                    const file = new AttachmentBuilder(buffer, { name: filename });

                    try {
                        const fetchedChannel = await client.channels.fetch(TICKET_LOG_CHANNEL_ID);
                        if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
                            await (fetchedChannel as TextChannel).send({ content: `📥 Ticket transcript: ${channel.name}`, files: [file] });
                        }
                    } catch (err) {
                        console.error('❌ Error while sending the transcript to the log channel:', err);
                    }

                    try {
                        const dm = await creator.createDM();
                        await dm.send({ content: '📄 Here is the transcript of the ticket that was closed:', files: [file] });
                    } catch (err) {
                        console.error('❌ Error while sending the DM to the user:', err);
                    }

                    await interaction.reply({ content: '📁 Transcript saved. Deleting the ticket in 5 seconds.', flags: 64 });
                    setTimeout(() => channel.delete().catch(console.error), 5000);
                }
            }
        } catch (error) {
            console.error('❌ Error during interaction handling:', error);
        }
    });
}
