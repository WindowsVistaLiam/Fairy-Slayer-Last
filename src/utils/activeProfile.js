const Player = require('../models/Player');
const Profile = require('../models/Profile');

async function getOrCreatePlayer(userId, guildId) {
  return Player.findOneAndUpdate(
    { userId, guildId },
    { $setOnInsert: { userId, guildId } },
    { new: true, upsert: true },
  );
}

async function getActiveProfile(userId, guildId) {
  const player = await Player.findOne({ userId, guildId });
  if (!player?.activeProfileId) return null;

  return Profile.findOne({
    _id: player.activeProfileId,
    userId,
    guildId,
  });
}

async function setActiveProfile(userId, guildId, profileId) {
  await Player.findOneAndUpdate(
    { userId, guildId },
    { $set: { activeProfileId: profileId } },
    { upsert: true, new: true },
  );
}

async function countProfiles(userId, guildId) {
  return Profile.countDocuments({ userId, guildId });
}

module.exports = {
  getOrCreatePlayer,
  getActiveProfile,
  setActiveProfile,
  countProfiles,
};
