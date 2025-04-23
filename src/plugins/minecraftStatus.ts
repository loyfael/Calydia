import { Client, ActivityType, VoiceChannel } from 'discord.js';
import { status } from 'minecraft-server-util';

const SERVER_IP = '-nuvalis.mine.fun'; // Remplace par l'IP de ton serveur
const SERVER_PORT = 25565;
const PRESENCE_INTERVAL = 60_000;
const VOICE_CHANNEL_ID = '1364484594635640883';

async function fetchPlayerCount(): Promise<number> {
    try {
        const response = await status(SERVER_IP, SERVER_PORT);
        return response.players.online;
    } catch (err) {
        console.error('❌ Impossible de récupérer le nombre de joueurs:', err);
        return 0;
    }
}

async function updateStatusAndChannel(client: Client) {
    const count = await fetchPlayerCount();
    const text = `${count} connecté(e)s 🟢`;

    // Mise à jour du statut Discord
    try {
        await client.user?.setPresence({
            activities: [{ name: "play.nuvalis.fr", type: ActivityType.Watching }],
            status: 'online'
        });
    } catch (err) {
        console.error('❌ Erreur lors de la mise à jour du statut Discord:', err);
    }

    // Mise à jour du nom du salon vocal
    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        if (channel?.isVoiceBased()) {
            await (channel as VoiceChannel).setName(text);
        } else {
            console.warn('⚠️ Le canal spécifié n’est pas un canal vocal ou est introuvable.');
        }
    } catch (err) {
        console.error('❌ Erreur lors de la mise à jour du nom du canal vocal:', err);
    }
}

export default function minecraftServerPresences(client: Client) {
    client.once('ready', () => {
        console.log(`⚙️ Plugin MinecraftStatus chargé pour ${client.user?.tag}`);

        updateStatusAndChannel(client); // Exécution immédiate
        setInterval(() => updateStatusAndChannel(client), PRESENCE_INTERVAL);
    });
}
