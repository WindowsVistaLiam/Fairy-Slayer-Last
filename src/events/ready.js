module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✅ Fairy Slayer connecté : ${client.user.tag}`);
  },
};
