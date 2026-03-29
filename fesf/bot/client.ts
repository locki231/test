console.log('Token utilisé :', process.env.DISCORD_BOT_TOKEN ? '[OK]' : '[ABSENT]');
// bot/client.ts
import { Client, GatewayIntentBits, Events } from 'discord.js';

console.log('⏳ Initialisation du bot Discord...');
export const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
  ],
});

bot.once(Events.ClientReady, (c) => {
  console.log(`🤖 Bot connecté : ${c.user.tag}`);
});

bot.on('error', (err) => {
  console.error('❌ Erreur Discord.js :', err);
});

bot.on('shardError', (err) => {
  console.error('❌ Erreur de shard Discord.js :', err);
});

bot.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('✅ Tentative de connexion du bot Discord...'))
  .catch((err) => {
    console.error('❌ Erreur de connexion du bot Discord :', err);
  });
