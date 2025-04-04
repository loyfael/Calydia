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
    ThreadAutoArchiveDuration,
    Message,
} from 'discord.js';

import { config } from '../core/env.js';

const TICKET_MANAGER_ROLE = config.managerRoleId; // Role ID for ticket managers
const TICKET_LOG_CHANNEL_ID = config.logChannelId; // Channel ID for ticket logs
const cooldowns = new Map<string, number>(); // Cooldown map for ticket creation
const activeClaims = new Map<string, string>(); // Active claims map for ticket claims
const ticketCreators = new Map<string, string>(); // Ticket creators map for tracking ticket owners

/**
 * Ticket system plugin for Discord bot
 * @param client Discord client
 */
export default function ticketSystem(client: Client) {
    /**
     * Create a ticket system
     * Permit only one ticket creation per user every 60 seconds
     * @description Initializes the ticket system
     * @param client Discord client
     */
    client.once('ready', async () => {
        try {
            const channel = await client.channels.fetch(config.channelId) as TextChannel;
            if (!channel?.isTextBased()) return;

            const selectMenu = new StringSelectMenuBuilder() // Create a select menu for ticket categories
                .setCustomId('ticket-category')
                .setPlaceholder('📂 Sélectionnez votre catégorie')
                .addOptions([
                    { label: '🛠️ SUPPORT', value: 'support', description: 'Pour les questions, bugs, demandes etc.' },
                    { label: '🚨 MODÉRATION', value: 'moderation', description: 'Pour signaler un joueur / contester / réclamer etc.' },
                    { label: '🤝 PARTENARIAT', value: 'partnership', description: 'Devenir forgeur/euse d\'art.' }
                ]);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu); // Create a row for the select menu

            const embed = new EmbedBuilder() // Create an embed for the ticket system
                .setTitle('🎫 Need help?')
                .setDescription('Select the category below to open a private ticket thread.')
                .setColor(0x5865f2);

            await channel.send({ embeds: [embed], components: [row] });

            const rest = new REST({ version: '10' }).setToken(config.token); // Initialize REST client for API calls

            await rest.put(Routes.applicationGuildCommands(client.user!.id, config.guildId), {
                body: [
                    new SlashCommandBuilder().setName('claim').setDescription('Claim this ticket'),
                    new SlashCommandBuilder().setName('close').setDescription('Close this ticket'),
                    new SlashCommandBuilder().setName('transcript').setDescription('Generate ticket transcript')
                ].map(cmd => cmd.toJSON())
            });
        } catch (err) {
            console.error('❌ Error during bot setup:', err);
        }
    });

    client.on(Events.MessageCreate, async (message: Message) => {
        if (message.author.bot) return;
        if (message.channel.isThread() && message.channel.type === ChannelType.PrivateThread) {
            const mentions = message.mentions.users.filter(u => u.id !== message.author.id);
            if (mentions.size > 0) {
                try {
                    await message.delete();
                    await message.channel.send({
                        content: `<@${message.author.id}> ❌ Tu ne peux pas mentionner d'autres personnes dans un ticket.`,
                        allowedMentions: { users: [message.author.id] }
                    });

                    for (const [userId] of mentions) {
                        await message.channel.members.remove(userId).catch(() => { });
                    }
                } catch (err) {
                    console.error("❌ Erreur en supprimant un message contenant des mentions ou en retirant un membre :", err);
                }
            }
        }
    });

    /**
     * Handle interactions from the ticket system
     * @description Listens for interactions and handles ticket creation, claiming, and closing
     * @param interaction Interaction object
     * @returns {Promise<void>}
     */
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        try {
            if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-category') {
                const category = interaction.values[0];
                let modal = new ModalBuilder()
                    .setCustomId(`ticket-modal-${category}`)
                    .setTitle(`Crée un ticket ${category}`);

                let fields: TextInputBuilder[] = [];

                fields.push(
                    new TextInputBuilder()
                        .setCustomId('ticket-username')
                        .setLabel('Quel est votre pseudo en jeu ?')
                        .setPlaceholder('Ex: JeanMichel1234')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );

                // Add fields based on the selected category
                switch (category) {
                    case 'support':
                        fields.push(
                            new TextInputBuilder()
                                .setCustomId('ticket-subject')
                                .setLabel('Quel est le type de votre demande?')
                                .setPlaceholder('Ex: Question, aide, bug, demande etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                            new TextInputBuilder()
                                .setCustomId('ticket-description')
                                .setLabel('Dans quelle instance?')
                                .setPlaceholder('Ex: Spawn, habitable, minage, etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                            new TextInputBuilder()
                                .setCustomId('ticket-support-ask')
                                .setLabel('Description de votre demande')
                                .setPlaceholder('Ex: Bonjour, voici ma demande..')
                                .setMaxLength(800)
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false),
                            new TextInputBuilder()
                                .setCustomId('ticket-discord-tag')
                                .setLabel('Complément d\'information')
                                .setPlaceholder('Ex: Position F3, erreur, etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                        );
                        break;
                    case 'moderation':
                        fields.push(
                            new TextInputBuilder()
                                .setCustomId('ticket-user')
                                .setLabel('Quel est le type de votre demande?')
                                .setPlaceholder('Ex: Signalement, remboursement etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                            new TextInputBuilder()
                                .setCustomId('ticket-reason')
                                .setLabel('Dans quel instance êtes-vous?')
                                .setPlaceholder('Ex: Spawn, habitable, minage, etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                            new TextInputBuilder()
                                .setCustomId('ticket-where')
                                .setLabel('Description du problème')
                                .setPlaceholder('Ex: Bonjour, voici ma demande..')
                                .setMaxLength(800)
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false),
                            new TextInputBuilder()
                                .setCustomId('ticket-evidence')
                                .setLabel('Information complémentaire')
                                .setPlaceholder('Ex: Position F3, erreur, etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false),
                        );
                        break;
                    case 'partnership':
                        fields.push(
                            new TextInputBuilder()
                                .setCustomId('ticket-server-name')
                                .setLabel('Quel est le nom de votre projet?')
                                .setPlaceholder('Ex: Nom artiste, projet, société, etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                            new TextInputBuilder()
                                .setCustomId('ticket-server-info')
                                .setLabel('Type de partenariat')
                                .setPlaceholder('Ex: Échange de visibilité, graphisme, etc.')
                                .setMaxLength(800)
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true),
                            new TextInputBuilder()
                                .setCustomId('ticket-server-link')
                                .setLabel('Décrivez nous votre proposition')
                                .setPlaceholder('Ex: Bonjour, voici ma proposition..')
                                .setMaxLength(800)
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true),
                            new TextInputBuilder()
                                .setCustomId('ticket-why-partner')
                                .setLabel('Comment vous contacter?')
                                .setPlaceholder('Ex: Discord, mail, instagram, etc.')
                                .setMaxLength(200)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        );
                        break;
                }

                // Add all fields to the modal
                modal.addComponents(
                    ...fields.map(f => new ActionRowBuilder<TextInputBuilder>().addComponents(f))
                );

                return await interaction.showModal(modal);
            }

            // Handle modal submission
            if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket-modal-')) {
                const category = interaction.customId.split('ticket-modal-')[1]; // Extract category from custom ID
                const userId = interaction.user.id; // Get user ID
                const now = Date.now(); // Get current timestamp
                const last = cooldowns.get(userId) || 0; // Get last ticket creation timestamp

                // Check if user is on cooldown
                if (now - last < 60000) {
                    return interaction.reply({ content: '⏳ Veuillez patienter un moment..', flags: 64 });
                }

                cooldowns.set(userId, now); // Set cooldown for user

                const responses: { name: string, value: string }[] = []; // Initialize responses array
                responses.push({ name: 'Pseudo en jeu', value: interaction.fields.getTextInputValue('ticket-username') });

                // Add responses based on the selected category
                switch (category) {
                    case 'support':
                        responses.push(
                            { name: 'Type de demande', value: interaction.fields.getTextInputValue('ticket-subject') },
                            { name: 'Instance', value: interaction.fields.getTextInputValue('ticket-description') },
                            { name: 'Description', value: interaction.fields.getTextInputValue('ticket-support-ask') || 'N/A' },
                            { name: 'Compléments', value: interaction.fields.getTextInputValue('ticket-discord-tag') || 'N/A' }
                        );
                        break;
                    case 'moderation':
                        responses.push(
                            { name: 'Type de demande', value: interaction.fields.getTextInputValue('ticket-user') },
                            { name: 'Instance', value: interaction.fields.getTextInputValue('ticket-reason') },
                            { name: 'Description', value: interaction.fields.getTextInputValue('ticket-evidence') || 'N/A' },
                            { name: 'Complément', value: interaction.fields.getTextInputValue('ticket-where') || 'N/A' }
                        );
                        break;
                    case 'partnership':
                        responses.push(
                            { name: 'Nom du projet', value: interaction.fields.getTextInputValue('ticket-server-name') },
                            { name: 'Type de partenariat', value: interaction.fields.getTextInputValue('ticket-server-info') },
                            { name: 'Proposition', value: interaction.fields.getTextInputValue('ticket-server-link') },
                            { name: 'Contact', value: interaction.fields.getTextInputValue('ticket-why-partner') }
                        );
                        break;
                }

                // Check if the user already has an active ticket
                const thread = await (interaction.channel as TextChannel).threads.create({
                    name: `🔴-${interaction.user.username}-${category}`,
                    type: ChannelType.PrivateThread,
                    invitable: false,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
                    reason: `New ticket (${category})`
                });

                ticketCreators.set(thread.id, interaction.user.id); // Store ticket creator ID
                await thread.members.add(interaction.user.id); // Add user to the thread

                const staffRole = interaction.guild?.roles.cache.get(TICKET_MANAGER_ROLE);
                if (staffRole) {
                    const members = await interaction.guild?.members.fetch();
                    members?.forEach(member => {
                        if (member.roles.cache.has(TICKET_MANAGER_ROLE)) {
                            thread.members.add(member.id).catch(() => { });
                        }
                    });
                }

                // Send a message to the thread with ticket details
                const embed = new EmbedBuilder()
                    .setTitle(`🎟️ ${category.charAt(0).toUpperCase() + category.slice(1)} Ticket`)
                    .addFields(
                        { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Category', value: category, inline: true },
                        ...responses,
                        { name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                    )
                    .setColor(0x2ecc71);

                // Add a control row with buttons for claiming and closing the ticket
                const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('claim-ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('close-ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
                );

                await thread.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [controlRow] }); // Send the embed and control row to the thread

                return await interaction.reply({ content: `✅ Your ticket has been opened: ${thread}`, flags: 64 }); // Reply to the user with ticket link
            }

            // Handle button interactions for claiming and closing tickets
            if (interaction.isButton()) {
                const channel = interaction.channel as GuildTextBasedChannel;
                const threadId = channel.id;

                // Check if the interaction is from a ticket thread
                if (interaction.customId === 'claim-ticket') {
                    const member = await interaction.guild?.members.fetch(interaction.user.id); // Fetch the member who triggered the interaction
                    const roleId = TICKET_MANAGER_ROLE?.toString?.() || TICKET_MANAGER_ROLE; // Get the ticket manager role ID
                    if (!roleId || !member?.roles.cache.has(roleId)) {
                        return interaction.reply({ content: '⛔ Vous n\'avez pas la permission.', flags: 64 });
                    }
                    if (activeClaims.has(threadId)) {
                        return interaction.reply({ content: `⚠️ Already claimed by <@${activeClaims.get(threadId)}>`, flags: 64 });
                    }

                    activeClaims.set(threadId, interaction.user.id);
                    await interaction.reply(`🟢 Le ticket est désormais géré par <@${interaction.user.id}>`);
                    await channel.setName(`🟢-${channel.name.replace(/^🔴-/, '')}`);
                }

                // Handle ticket closure
                if (interaction.customId === 'close-ticket') {
                    const messages = await channel.messages.fetch({ limit: 100 });
                    messages.sweep(msg => msg.system);
                    const transcriptText = messages.map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).reverse().join('\n');

                    const creatorId = ticketCreators.get(threadId);
                    if (!creatorId) return;

                    const creator = await client.users.fetch(creatorId); // Fetch the ticket creator
                    const creatorName = creator.username.replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize username for filename
                    const timestamp = new Date().toISOString().split('T')[0]; // Get current date for filename
                    const filename = `ticket-${creatorName}-${timestamp}.txt`; // Create filename for transcript
                    const buffer = Buffer.from(transcriptText, 'utf-8'); // Create a buffer from the transcript text
                    const file = new AttachmentBuilder(buffer, { name: filename }); // Create an attachment from the buffer

                    try {
                        const fetchedChannel = await client.channels.fetch(TICKET_LOG_CHANNEL_ID); // Fetch the log channel

                        // Check if the channel is a text channel and send the transcript
                        if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
                            await (fetchedChannel as TextChannel).send({ content: `📥 Transcript du ticket: ${channel.name}`, files: [file] });
                        }
                    } catch (err) {
                        console.error('❌ Failed to send transcript to log channel:', err);
                    }

                    try {
                        const dm = await creator.createDM();
                        await dm.send({ content: '📄 Voici le transcript du ticket ayant été fermé:', files: [file] });
                    } catch (err) {
                        console.error('❌ Failed to send DM to ticket creator:', err);
                    }

                    await interaction.reply({ content: '📁 Transcript sauvegardé. Suppression du ticket dans 5 secondes.', flags: 64 });
                    setTimeout(() => channel.delete().catch(console.error), 5000);
                }
            }
        } catch (error) {
            console.error('❌ Error during interaction handling:', error);
        }
    });
}
