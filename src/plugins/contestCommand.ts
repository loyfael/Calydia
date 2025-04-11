// src/plugins/contestLogReview.ts
import {
  Client,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  InteractionType,
  GuildMember,
  TextChannel
} from 'discord.js';

export default function contestLogReview(client: Client) {
  const ALLOWED_ROLE_ID = process.env.CONTEST_ALLOWED_ROLE_ID || '';

  client.once('ready', async () => {
    const data = new SlashCommandBuilder()
      .setName('contest')
      .setDescription('Contester une sanction avec une vérification des logs');

    const guilds = await client.guilds.fetch();
    for (const [_, guildRef] of guilds) {
      const guild = await guildRef.fetch();
      await guild.commands.create(data);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'contest') {
      const member = interaction.member as GuildMember;
      if (!member.roles.cache.has(ALLOWED_ROLE_ID)) {
        await interaction.reply({
          content: '🚫 Vous n\'avez pas la permission d\exécuter cette commande.',
          ephemeral: true
        });
        return;
      }

      const button = new ButtonBuilder()
        .setCustomId('accept_logs')
        .setLabel('ACCEPTER')
        .setStyle(ButtonStyle.Success);

      await interaction.reply({
        content:
`
Put your message here
\`\`\`
I confirm blablabla
\`\`\`
`,
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
        ephemeral: false
      });
    }

    if (interaction.isButton() && interaction.customId === 'accept_logs') {
      const modal = new ModalBuilder()
        .setCustomId('logs_modal')
        .setTitle("Confirmation of authorization")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('confirmation_text')
              .setLabel('Please, copy paste.')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'logs_modal') {
      const userResponse = interaction.fields.getTextInputValue('confirmation_text')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

        const keywords = ['authorize', 'staff', 'moderation', 'serverName', 'logs', 'confidentiality'];
        const matchCount = keywords.filter(word => userResponse.includes(word)).length;
        
        if (matchCount < keywords.length) {
          await interaction.reply({
            content: '❌ Your message does not contain all the essential elements. Please copy-paste it correctly or rephrase it with the important keywords.',
            ephemeral: true
          });
          return;
        }

      const now = new Date();

      await interaction.reply({
        content: '✅ Confirmation saved.',
        ephemeral: true
      });

      if (interaction.channel && 'send' in interaction.channel && typeof interaction.channel.send === 'function') {
        await interaction.channel.send(
          `📋 New contestation\n` +
          `👤 User : ${interaction.user.tag} (<@${interaction.user.id}>)\n` +
          `🆔 ID: ${interaction.user.id}\n` +
          `📅 Date : ${now.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' })}\n` +
          `✉️ Confirm message : ${interaction.fields.getTextInputValue('confirmation_text').trim()}`
        );
      }

      const modChannelId = process.env.CONTEST_LOG_CHANNEL_ID;
      if (modChannelId) {
        const modChannel = await client.channels.fetch(modChannelId);
        if (modChannel && modChannel.isTextBased && modChannel.isTextBased()) {
          (modChannel as TextChannel).send(
            `📋 Nouvelle contestation de sanction\n` +
            `👤 Utilisateur : ${interaction.user.tag} (<@${interaction.user.id}>)\n` +
            `🆔 ID utilisateur : ${interaction.user.id}\n` +
            `📅 Date : ${now.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' })}\n` +
            `✉️ Message confirmé : ${interaction.fields.getTextInputValue('confirmation_text').trim()}`
          );
        }
      }
    }
  });
}