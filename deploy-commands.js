require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  if (!process.env.CLIENT_ID || !process.env.GUILD_ID || !process.env.DISCORD_TOKEN) {
    throw new Error('CLIENT_ID, GUILD_ID ou DISCORD_TOKEN manquant dans le fichier .env');
  }

  console.log(`🔄 Déploiement de ${commands.length} commande(s) sur le serveur...`);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
  );

  console.log('✅ Commandes déployées avec succès');
}

deploy().catch((error) => {
  console.error('❌ Erreur pendant le déploiement :', error);
  process.exit(1);
});
