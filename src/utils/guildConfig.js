const { EmbedBuilder } = require('discord.js');

const GuildConfig = require('../models/GuildConfig');

async function getOrCreateGuildConfig(guildId) {
  return GuildConfig.findOneAndUpdate(
    { guildId },
    { $setOnInsert: { guildId } },
    { new: true, upsert: true },
  );
}

function extractDiscordIds(value) {
  return String(value || '')
    .match(/\d{15,25}/g) || [];
}

function uniqueDiscordIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}

function parseDiscordIdList(value) {
  return uniqueDiscordIds(extractDiscordIds(value));
}

function parseProfileSlotRules(value) {
  const rules = [];
  const chunks = String(value || '')
    .split(/[\n,;]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const ids = extractDiscordIds(chunk);
    const slotMatch = chunk.match(/(?:=|:|\s)(\d{1,2})\s*$/);
    const roleId = ids[0];
    const slots = slotMatch ? Number.parseInt(slotMatch[1], 10) : Number.NaN;

    if (!roleId || Number.isNaN(slots)) continue;

    rules.push({
      roleId,
      slots: Math.max(1, Math.min(20, slots)),
    });
  }

  return rules;
}

function memberHasAnyRole(member, roleIds = []) {
  if (!member || !roleIds.length) return false;
  const cachedRoles = member.roles?.cache;
  const rawRoles = Array.isArray(member.roles) ? member.roles : [];
  return roleIds.some((roleId) => cachedRoles?.has(roleId) || rawRoles.includes(roleId));
}

async function hasConfiguredStaffPermission(interaction) {
  if (
    interaction.memberPermissions?.has('ManageGuild')
    || interaction.memberPermissions?.has('Administrator')
  ) {
    return true;
  }

  if (!interaction.guildId) return false;

  const config = await getOrCreateGuildConfig(interaction.guildId);
  return memberHasAnyRole(interaction.member, config.staffRoleIds);
}

async function getProfileSlotLimit(member, guildId) {
  const config = await getOrCreateGuildConfig(guildId);
  let slots = Number(config.defaultProfileSlots || 3);

  for (const rule of config.profileSlotRoleRules || []) {
    if (memberHasAnyRole(member, [rule.roleId])) {
      slots = Math.max(slots, Number(rule.slots || 0));
    }
  }

  return Math.max(1, Math.min(20, slots));
}

function formatChannelList(ids) {
  return ids?.length ? ids.map((id) => `<#${id}>`).join(', ') : 'Aucun';
}

function formatRoleList(ids) {
  return ids?.length ? ids.map((id) => `<@&${id}>`).join(', ') : 'Aucun';
}

function formatSlotRules(rules) {
  if (!rules?.length) return 'Aucune règle';

  return rules
    .map((rule) => `<@&${rule.roleId}> : ${rule.slots} profil(s)`)
    .join('\n');
}

async function sendGuildLog(guild, title, lines = [], color = 0x7c5cff) {
  if (!guild) return null;

  const config = await getOrCreateGuildConfig(guild.id);
  if (!config.logChannelId) return null;

  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel?.isTextBased?.()) return null;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(lines.filter(Boolean).join('\n').slice(0, 4000))
    .setTimestamp();

  return channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = {
  getOrCreateGuildConfig,
  parseDiscordIdList,
  parseProfileSlotRules,
  hasConfiguredStaffPermission,
  getProfileSlotLimit,
  formatChannelList,
  formatRoleList,
  formatSlotRules,
  sendGuildLog,
};
