const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ActivityType, EmbedBuilder, AuditLogEvent } = require('discord.js');
const express = require('express');

const app = express();
app.listen(3000);
app.get('/', (req, res) => res.send('OS Bot is Online 24/7!'));

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration] 
});

let whiteList = ['ايديك_هنا']; // حط الأيدي بتاعك هنا عشان البوت ميبندكش
const badWords = ['شتم1', 'شتم2', 'شتم3'];
const autoReplies = { 'سلام': 'وعليكم السلام يا وحش!', 'بوت': 'OS شغال 24/7!' };

const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('طرد').addUserOption(o => o.setName('user').setRequired(true).setDescription('العضو')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName('kick').setDescription('طرد').addUserOption(o => o.setName('user').setRequired(true).setDescription('العضو')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(o => o.setName('amount').setRequired(true).setDescription('عدد')),
    new SlashCommandBuilder().setName('lock').setDescription('قفل القناة').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder().setName('unlock').setDescription('فتح القناة').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder().setName('ads').setDescription('أسعار الإعلانات'),
    new SlashCommandBuilder().setName('whitelist').setDescription('إضافة وايت ليست').addUserOption(o => o.setName('user').setRequired(true)),
    new SlashCommandBuilder().setName('blacklist').setDescription('إزالة من الوايت ليست').addUserOption(o => o.setName('user').setRequired(true))
];

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    client.user.setActivity('OS System 24/7', { type: ActivityType.Playing });
    console.log(`OS Bot is READY: ${client.user.tag}`);
});

// نظام الحماية (Anti-Nuke)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const logs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
    const log = logs.entries.first();
    if (!log || whiteList.includes(log.executor.id) || log.executor.id === client.user.id) return;
    await newMember.guild.members.ban(log.executor.id, { reason: 'تعديل رتب بدون إذن' });
});

client.on('channelDelete', async (channel) => {
    const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const log = logs.entries.first();
    if (!log || whiteList.includes(log.executor.id) || log.executor.id === client.user.id) return;
    await channel.guild.members.ban(log.executor.id, { reason: 'مسح قناة' });
});

// الرسائل والشتائم والردود
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (autoReplies[message.content]) return message.reply(autoReplies[message.content]);

    const content = message.content.toLowerCase();
    if (badWords.some(w => content.includes(w)) || content.includes('http') || content.includes('discord.gg')) {
        await message.delete().catch(() => {});
        await message.member.timeout(5 * 60 * 1000, 'مخالفة').catch(() => {});
        message.channel.send(`${message.author} خد تايم 5 دقائق!`).then(m => setTimeout(() => m.delete(), 5000));
    }
});

// تنفيذ الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'whitelist') {
        whiteList.push(interaction.options.getUser('user').id);
        await interaction.reply('تم الإضافة للوايت ليست');
    } else if (interaction.commandName === 'blacklist') {
        whiteList = whiteList.filter(id => id !== interaction.options.getUser('user').id);
        await interaction.reply('تم الإزالة من الوايت ليست');
    } else if (interaction.commandName === 'ads') {
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('أسعار').addFields({name:'الكل', value:'20m'}, {name:'أونلاين', value:'15m'})] });
    }
    // (باقي الأوامر زي ما هي ..)
});

client.login(process.env.DISCORD_TOKEN);
