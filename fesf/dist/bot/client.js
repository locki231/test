"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
console.log('Token utilisé :', process.env.DISCORD_BOT_TOKEN ? '[OK]' : '[ABSENT]');
// bot/client.ts
const discord_js_1 = require("discord.js");
console.log('⏳ Initialisation du bot Discord...');
exports.bot = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildPresences,
    ],
});
exports.bot.once(discord_js_1.Events.ClientReady, (c) => {
    console.log(`🤖 Bot connecté : ${c.user.tag}`);
});
exports.bot.on('error', (err) => {
    console.error('❌ Erreur Discord.js :', err);
});
exports.bot.on('shardError', (err) => {
    console.error('❌ Erreur de shard Discord.js :', err);
});
exports.bot.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => console.log('✅ Tentative de connexion du bot Discord...'))
    .catch((err) => {
    console.error('❌ Erreur de connexion du bot Discord :', err);
});
