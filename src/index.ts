import { client } from './core/client.js';
import { config } from './core/env.js';
import { loadPlugins } from './core/loader.js';

(async () => {
    try {
        await loadPlugins();
        await client.login(config.token);
        console.log('🤖 Bot connecté !');
    } catch (error) {
        console.error('❌ Erreur lors du chargement des plugins :', error);
    }
    
})();
