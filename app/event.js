const Discord = require('discord.js');

const GUILD_EVENT_MAP = new Map();
const DM_EVENT_MAP = new Map();

// Tested
GUILD_EVENT_MAP.set('channelCreate', channel => channel.guild);
GUILD_EVENT_MAP.set('channelDelete', channel => channel.guild);
GUILD_EVENT_MAP.set('channelPinsUpdate', channel => channel.guild);
GUILD_EVENT_MAP.set('channelUpdate', channel => channel.guild);
GUILD_EVENT_MAP.set('emojiCreate', emoji => emoji.guild);
GUILD_EVENT_MAP.set('emojiDelete', emoji => emoji.guild);
GUILD_EVENT_MAP.set('emojiUpdate', emoji => emoji.guild);
GUILD_EVENT_MAP.set('guildBanAdd', guild => guild);
GUILD_EVENT_MAP.set('guildBanRemove', guild => guild);
GUILD_EVENT_MAP.set('guildUpdate', guild => guild);
GUILD_EVENT_MAP.set('messageDelete', message => message.channel.guild);
GUILD_EVENT_MAP.set('messageDeleteBulk', messages => messages.first().channel.guild);
GUILD_EVENT_MAP.set('messageReactionAdd', messageReaction => messageReaction.message.channel.guild);
GUILD_EVENT_MAP.set('messageReactionRemove', messageReaction => messageReaction.message.channel.guild);
GUILD_EVENT_MAP.set('messageReactionRemoveAll', message => message.channel.guild);
GUILD_EVENT_MAP.set('messageReactionRemoveEmoji', reaction => reaction.message.channel.guild);
GUILD_EVENT_MAP.set('messageUpdate', message => message.channel.guild);
GUILD_EVENT_MAP.set('roleCreate', role => role.guild );
GUILD_EVENT_MAP.set('roleDelete', role => role.guild );
GUILD_EVENT_MAP.set('roleUpdate', role => role.guild );
GUILD_EVENT_MAP.set('typingStart', channel => channel.guild);
GUILD_EVENT_MAP.set('voiceStateUpdate', oldState => oldState.guild);
GUILD_EVENT_MAP.set('webhookUpdate', channel => channel.guild);

// Tested, you have to turn on Privileged Gateway Intents in Developer Portal
GUILD_EVENT_MAP.set('guildMemberAdd', member => member.guild);
GUILD_EVENT_MAP.set('guildMemberRemove', member => member.guild);
GUILD_EVENT_MAP.set('guildMemberSpeaking', member => member.guild);
GUILD_EVENT_MAP.set('guildMemberUpdate', member => member.guild);
GUILD_EVENT_MAP.set('presenceUpdate', (_, newPresence) => newPresence.guild);

// Couldn't test, but probably okay
GUILD_EVENT_MAP.set('guildMemberAvailable', member => member.guild);
GUILD_EVENT_MAP.set('guildMembersChunk', (_, guild) => guild);

// Couldn't test
GUILD_EVENT_MAP.set('guildUnavailable', guild => guild);

// Couldn't reproduce, no more support?
GUILD_EVENT_MAP.set('guildIntegrationsUpdate', guild => guild);
GUILD_EVENT_MAP.set('inviteCreate', invite => invite.guild);
GUILD_EVENT_MAP.set('inviteDelete', invite => invite.guild);

// Tested
DM_EVENT_MAP.set('channelCreate', channel => channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('channelPinsUpdate', channel => channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('message', message => message.channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('messageDelete', message => message.channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('messageReactionAdd', messageReaction => messageReaction.message.channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('messageUpdate', message => message.channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('typingStart', channel => channel.constructor === Discord.DMChannel);

// Couldn't reproduce, no event?
DM_EVENT_MAP.set('channelDelete', channel => channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('channelUpdate', channel => channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('messageDeleteBulk', messages => messages.first().channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('messageReactionRemove', messageReaction => messageReaction.message.channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('messageReactionRemoveAll', message => message.channel.constructor === Discord.DMChannel);
DM_EVENT_MAP.set('messageReactionRemoveEmoji', reaction => reaction.message.channel.constructor === Discord.DMChannel);

exports.GUILD_EVENT_MAP = GUILD_EVENT_MAP;
exports.DM_EVENT_MAP = DM_EVENT_MAP;
