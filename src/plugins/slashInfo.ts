// This project is licensed under the GNU General Public License v3.0 (GPLv3) with a Non-Commercial Clause.

// You are not allowed to sell my code.
// In general, you may not use my code in any commercial activity.
// You must mention that I wrote the code in any redistribution.
// You may not say that you are the author of my code.

import { Client, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { config } from '../core/env.js';

const command = new SlashCommandBuilder()
    .setName('info')
    .setDescription('Affiche les liens importants du serveur');

export default function slashInfo(client: Client) {
    client.once('ready', async () => {
        console.log('📦 Plugin slashInfo chargé');

        const rest = new REST({ version: '10' }).setToken(config.token);

        try {
            await rest.put(
                Routes.applicationGuildCommands(client.user!.id, config.guildId),
                { body: [command.toJSON()] }
            );
            console.log('✅ Commande /info enregistrée avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'enregistrement de /info :', error);
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'info') return;

        try {
            await sendInfo(interaction);
        } catch (error) {
            console.error('❌ Erreur dans /info :', error);
        }
    });
}

async function sendInfo(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
        content: `
Hello

Display your important links here.
        `,
        ephemeral: false // true si tu veux que seul l'utilisateur voie le message
    });
}
