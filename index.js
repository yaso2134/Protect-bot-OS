const { Client, GatewayIntentBits, PermissionFlagsBits, AuditLogEvent, AttachmentBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration // ضروري جداً لمراقبة العقوبات
    ]
});

// --- إعدادات الحماية الخارقة ---
const badWords = ['كسمك', 'شرموط', 'كسختك', 'عرص', 'معرص', 'متناك', 'يلعن ميتين امك', 'كلزق', 'تفو', 'امك', 'ابوك', 'خنيث', 'قحبة', 'منيوك'];
const cooldowns = new Map(); // للتحكم في السبام

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // إعفاء الأدمن من الحماية
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    // 1. حماية الشتائم (تايم دقيقتين)
    if (badWords.some(word => message.content.toLowerCase().includes(word))) {
        await message.delete().catch(() => null);
        await message.member.timeout(2 * 60 * 1000, 'شتائم').catch(() => null);
        return message.channel.send(`⚠️ تم تأديب ${message.author} (تايم دقيقتين) بسبب الشتائم!`);
    }

    // 2. حماية الروابط (تايم 5 دقائق)
    if (message.content.includes('http') || message.content.includes('discord.gg/')) {
        await message.delete().catch(() => null);
        await message.member.timeout(5 * 60 * 1000, 'روابط').catch(() => null);
        return message.channel.send(`🚫 تم تأديب ${message.author} (تايم 5 دقائق) بسبب الروابط!`);
    }

    // 3. نظام Anti-Spam (حماية من تكرار الرسائل)
    const now = Date.now();
    const userCooldown = cooldowns.get(message.author.id);
    if (userCooldown && now - userCooldown < 2000) { // لو بعت رسالتين في أقل من ثانيتين
        await message.delete().catch(() => null);
        return message.channel.send(`🛑 يا ${message.author}، خف سبام شوية!`);
    }
    cooldowns.set(message.author.id, now);
});

// 4. حماية السيرفر من تغييرات الرومات (Anti-Nuke بسيط)
client.on('channelDelete', async (channel) => {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const log = auditLogs.entries.first();
    if (!log || log.executor.bot) return;
    
    // طرد الشخص اللي مسح الروم فوراً
    channel.guild.members.ban(log.executor.id, { reason: 'مسح روم بدون إذن' });
});

client.login(process.env.DISCORD_TOKEN);

