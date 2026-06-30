require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { connectDatabase } = require('./database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command.data || !command.execute) {
      console.warn(`⚠️ Commande ignorée : ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }

  console.log(`✅ ${client.commands.size} commande(s) chargée(s)`);
}

function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event.name || !event.execute) {
      console.warn(`⚠️ Événement ignoré : ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  console.log(`✅ ${eventFiles.length} événement(s) chargé(s)`);
}

async function start() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN est manquant dans le fichier .env');
  }

  await connectDatabase();
  loadCommands();
  loadEvents();
  await client.login(process.env.DISCORD_TOKEN);
}

start().catch((error) => {
  console.error('❌ Erreur au démarrage du bot :', error);
  process.exit(1);
});
