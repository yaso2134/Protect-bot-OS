const { Client, GatewayIntentBits, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('بوت الحماية يعمل بنجاح 24 ساعة!'));
app.listen(3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// إعدادات الحماية
const limits = {
    banLimit: 3,        
    channelDelete: 3    
};

const counter = {};

client.on('ready', () => {
    console.log(`🛡️ بوت الحماية شغال باسم: ${client.user.tag}`);
});

// 1. منع مسح الرومات من الإداريين
client.on('channelDelete', async (channel) => {
    const guild = channel.guild;
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
    if (!auditLogs) return;
    const entry = auditLogs.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    if (executor.id === guild.ownerId || executor.id === client.user.id) return;

    if (!counter[executor.id]) counter[executor.id] = { bans: 0, channels: 0, time: Date.now() };
    if (Date.now() - counter[executor.id].time > 60000) {
        counter[executor.id].channels = 0;
        counter[executor.id].time = Date.now();
    }
    counter[executor.id].channels++;

    if (counter[executor.id].channels >= limits.channelDelete) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) {
            await member.roles.set([]).catch(() => null);
            console.log(`🚨 تم سحب رتب ${executor.tag} بسبب مسح الرومات مكثف!`);
        }
    }
});

// 2. منع التخريب بالباند
client.on('guildBanAdd', async (ban) => {
    const guild = ban.guild;
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
    if (!auditLogs) return;
    const entry = auditLogs.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    if (executor.id === guild.ownerId || executor.id === client.user.id) return;

    if (!counter[executor.id]) counter[executor.id] = { bans: 0, channels: 0, time: Date.now() };
    if (Date.now() - counter[executor.id].time > 60000) {
        counter[executor.id].bans = 0;
        counter[executor.id].time = Date.now();
    }
    counter[executor.id].bans++;

    if (counter[executor.id].bans >= limits.banLimit) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) {
            await member.roles.set([]).catch(() => null);
            console.log(`🚨 تم سحب رتب ${executor.tag} بسبب تبنيد أعضاء مكثف!`);
        }
    }
});

// 3. منع دخول البوتات الوهمية
client.on('guildMemberAdd', async (member) => {
    if (!member.user.bot) return;
    const guild = member.guild;
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd }).catch(() => null);
    if (!auditLogs) return;
    const entry = auditLogs.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    
    if (executor.id !== guild.ownerId) {
        await member.kick("ممنوع دخول بوتات غريبة!").catch(() => null);
    }
});

// 4. منع الروابط في الشات للأعضاء العاديين
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content.includes('http://') || message.content.includes('https://') || message.content.includes('discord.gg/')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            try {
                await message.delete();
                const warn = await message.channel.send(`⚠️ يا ${message.author}، ممنوع نشر الروابط لحماية السيرفر!`);
                setTimeout(() => warn.delete().catch(() => null), 4000);
            } catch (err) {}
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    // البوت يشتغل تلقائي بالخلفية بدون أوامر سلاش عشان الحماية
});

client.login(process.env.DISCORD_TOKEN);
      
