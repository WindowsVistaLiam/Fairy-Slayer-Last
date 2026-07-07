const Player = require('../models/Player');
const Profile = require('../models/Profile');
const { applyTreasurerDailyIncome } = require('./professions');

async function getOrCreatePlayer(userId, guildId) {
  return Player.findOneAndUpdate(
    { userId, guildId },
    { $setOnInsert: { userId, guildId } },
    { returnDocument: 'after', upsert: true },
  );
}

async function getActiveProfile(userId, guildId) {
  const player = await Player.findOne({ userId, guildId });
  if (!player?.activeProfileId) return null;

  const profile = await Profile.findOne({
    _id: player.activeProfileId,
    userId,
    guildId,
  });

  if (profile) await applyTreasurerDailyIncome(profile);
  return profile;
}

async function setActiveProfile(userId, guildId, profileId) {
  await Player.findOneAndUpdate(
    { userId, guildId },
    { $set: { activeProfileId: profileId } },
    { upsert: true, returnDocument: 'after' },
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
