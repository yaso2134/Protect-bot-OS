const { Client, GatewayIntentBits, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// --- إعدادات القوائم ---
// حط آيديات الأشخاص الممنوعين (Blacklist)
const blacklist = ['123456789012345678', '987654321098765432']; 

// حط آيديات الإدارة والـ VIPs (Whitelist) اللي محدش يقدر يلمسهم
const whitelist = ['111111111111111111', '222222222222222222'];

const badWords = ['كسمك', 'شرموط', 'كسختك', 'عرص', 'معرص', 'متناك', 'يلعن ميتين امك', 'كلزق', 'تفو', 'امك', 'ابوك', 'خنيث', 'قحبة', 'منيوك'];

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // 1. نظام البلاك ليست (طرد فوري لو دخل أو كتب حاجة)
    if (blacklist.includes(message.author.id)) {
        await message.delete().catch(() => null);
        return; // البوت يتجاهل أي رسالة منهم
    }

    // 2. نظام الوايت ليست (ممنوع البوت يطبق عليهم أي عقوبة)
    if (whitelist.includes(message.author.id)) return;

    // إعفاء الإدارة من الحماية
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const msg = message.content.trim();

    // 3. الحماية من الشتائم (تايم دقيقتين)
    if (badWords.some(word => msg.toLowerCase().includes(word))) {
        await message.delete().catch(() => null);
        await message.member.timeout(2 * 60 * 1000, 'شتائم').catch(() => null);
        return message.channel.send(`⚠️ تم تأديب ${message.author} (تايم دقيقتين) بسبب الشتائم!`);
    }

    // 4. الحماية من الروابط (تايم 5 دقائق)
    if (msg.includes('http') || msg.includes('discord.gg/')) {
        await message.delete().catch(() => null);
        await message.member.timeout(5 * 60 * 1000, 'روابط').catch(() => null);
        return message.channel.send(`🚫 تم تأديب ${message.author} (تايم 5 دقائق) بسبب الروابط!`);
    }
    
    // [باقي الأوامر والخط والردود حطها هنا بنفس الطريقة...]
});

client.login(process.env.DISCORD_TOKEN);
            
