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
  EmbedBuilder,
  GuildMember,
  TextChannel
} from 'discord.js';

export default function contestLogReview(client: Client) {
  const ALLOWED_ROLE_ID = process.env.CONTEST_ALLOWED_ROLE_ID || '';

  client.once('ready', async () => {
    const data = new SlashCommandBuilder()
      .setName('contest')
      .setDescription('Contest a sanction with log verification');

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
          content: '🚫 You don\t have the authorization.',
          ephemeral: true
        });
        return;
      }

      const button = new ButtonBuilder()
        .setCustomId('accept_logs')
        .setLabel('ACCEPTER')
        .setStyle(ButtonStyle.Success);

      const embed = new EmbedBuilder()
        .setDescription(`
Your message here. Put it like you want but don't forget to put the confirmation
message inside the embed.
`
        )
        .setColor(0x2ecc71);

      await interaction.reply({
        embeds: [embed],
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

      const expected = 'Enter your confirmation message here'
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

      if (userResponse !== expected) {
        await interaction.reply({
          content: '❌ The message don\'t correspond at the model.',
          ephemeral: true
        });
        return;
      }

      const now = new Date();
      const logEmbed = new EmbedBuilder()
        .setTitle('📋 New sanction context')
        .addFields(
          { name: 'User', value: `${interaction.user.tag} (<@${interaction.user.id}>)` },
          { name: 'User ID', value: interaction.user.id },
          { name: 'Date', value: now.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' }) },
          { name: 'Confirmation message', value: interaction.fields.getTextInputValue('confirmation_text').trim() }
        )
        .setColor(0x3498db)
        .setTimestamp(now);

      await interaction.reply({
        content: '✅ Confirmation saved..',
        ephemeral: true
      });

      if (interaction.channel && 'send' in interaction.channel && typeof interaction.channel.send === 'function') {
        await interaction.channel.send({ embeds: [logEmbed] });
      }

      const modChannelId = process.env.CONTEST_LOG_CHANNEL_ID;
      if (modChannelId) {
        const modChannel = await client.channels.fetch(modChannelId);
        if (modChannel && modChannel.isTextBased && modChannel.isTextBased()) {
          (modChannel as TextChannel).send({ embeds: [logEmbed] });
        }
      }
    }
  });
}
