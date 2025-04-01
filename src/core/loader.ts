import { client } from './client.js';
import path from 'path';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';

export async function loadPlugins() {
    const pluginsPath = path.resolve('./dist/plugins');
    console.log(`🔍 Lecture du dossier de plugins : ${pluginsPath}`);

    let files: string[] = [];

    try {
        files = await readdir(pluginsPath);
        console.log(`📁 Plugins trouvés (${files.length}) :`, files);
    } catch (err) {
        console.error('❌ Impossible de lire le dossier de plugins :', err);
        return;
    }

    for (const file of files) {
        if (file.endsWith('.js')) {
            const filePath = path.join(pluginsPath, file);
            const fileUrl = pathToFileURL(filePath).href;

            console.log(`📦 Tentative de chargement du plugin : ${file}`);

            try {
                const plugin = await import(fileUrl);

                if (typeof plugin.default === 'function') {
                    plugin.default(client);
                    console.log(`✅ Plugin exécuté : ${file}`);
                } else {
                    console.warn(`⚠️ Pas de export default fonctionnel dans : ${file}`);
                }
            } catch (err) {
                console.error(`❌ Erreur lors du chargement de ${file} :`, err);
            }
        } else {
            console.log(`⏩ Ignoré (pas .js) : ${file}`);
        }
    }
}
