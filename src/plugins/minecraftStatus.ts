import { Client, ActivityType } from 'discord.js';
import { status } from 'minecraft-server-util';

const SERVER_IP = 'ip.mcserver.com'; // Replace with your server's IP address
const SERVER_PORT = 25565;
const REFRESH_INTERVAL = 30_000;
const INITIAL_DELAY = 5_000;

async function fetchPlayerCount(): Promise<number> {
    try {
        const response = await status(SERVER_IP, SERVER_PORT);
        return response.players.online;
    } catch (err) {
        console.error('❌ Failed to fetch player count:', err);
        return 0;
    }
}

async function updatePresence(client: Client) {
    const count = await fetchPlayerCount();
    const text = `${count} connecté(e)s 🟢`;

    try {
        await client.user?.setPresence({
            activities: [{ name: text, type: ActivityType.Watching }],
            status: 'online'
        });
    } catch (err) {
        console.error('❌ Failed to update presence:', err);
    }
}

export default function minecraftServerPresences(client: Client) {
    client.once('ready', () => {
        console.log(`⚙️ minecraftStatus plugin loaded for ${client.user?.tag}`);

        setTimeout(() => updatePresence(client), INITIAL_DELAY);
        setInterval(() => updatePresence(client), REFRESH_INTERVAL);
    });
}
