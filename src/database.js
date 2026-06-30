const dns = require("node:dns");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI est manquant dans le fichier .env');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log('✅ MongoDB connecté');
}

module.exports = { connectDatabase };
