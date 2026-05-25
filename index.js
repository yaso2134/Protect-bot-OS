const { Client, GatewayIntentBits, AuditLogEvent, PermissionFlagsBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('بوت الحماية المطور بالوايت ليست يعمل بنجاح!'));
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
let whitelist = [];

// تعريف أمر السلاش
const commands = [
    new SlashCommandBuilder()
        .setName('wl')
        .setDescription('نظام التحكم بالوايت ليست (لصاحب السيرفر فقط)')
        .addSubcommand(subcmd => 
            subcmd.setName('add')
                .setDescription('إضافة عضو إلى الوايت ليست (موثوق)')
                .addUserOption(option => option.setName('عضو').setDescription('اختر الشخص').setRequired(true))
        )
        .addSubcommand(subcmd => 
            subcmd.setName('remove')
                .setDescription('إزالة عضو من الوايت ليست (إرجاعه للبلاك ليست)')
                .addUserOption(option => option.setName('عضو').setDescription('اختر الشخص').setRequired(true))
        )
        .addSubcommand(subcmd => 
            subcmd.setName('show')
                .setDescription('عرض قائمة الأعضاء الموثوقين في الوايت ليست')
        )
].map(command => command.toJSON());

client.on('ready', async () => {
    console.log(`🛡️ بوت الحماية شغال باسم: ${client.user.tag}`);
    
    // تحديث الأوامر فوراً وإجبارياً في ديسكورد
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('جاري تحديث أوامر السلاش إجبارياً...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] }); // تصفير القديم
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); // رفع الجديد
        console.log('✅ تم تحديث أوامر السلاش بنجاح وستظهر الآن فوراً!');
    } catch (error) {
        console.error(error);
    }
});

// 1. التحكم في أوامر الوايت ليست (خاص بصاحب السيرفر فقط)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'wl') return;

    if (interaction.user.id !== interaction.guild.ownerId) {
        return await interaction.reply({ content: '❌ هذا الأمر مخصص لـ **صاحب السيرفر الأساسي (Owner)** فقط لحماية السيرفر!', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('عضو');

    if (subcommand === 'add') {
        if (whitelist.includes(targetUser.id)) {
            return await interaction.reply({ content: `⚠️ الشخص ${targetUser} موجود بالفعل في الوايت ليست!`, ephemeral: true });
        }
        whitelist.push(targetUser.id);
        return await interaction.reply({ content: `✅ تم إضافة ${targetUser} إلى الوايت ليست بنجاح. البوت لن يراقبه الآن!` });
    }

    if (subcommand === 'remove') {
        if (!whitelist.includes(targetUser.id)) {
            return await interaction.reply({ content: `⚠️ الشخص ${targetUser} ليس في الوايت ليست أصلاً.`, ephemeral: true });
        }
        whitelist = whitelist.filter(id => id !== targetUser.id);
        return await interaction.reply({ content: `🛡️ تم إزالة ${targetUser} من الوايت ليست وإرجاعه للبلاك ليست (تحت المراقبة).` });
    }

    if (subcommand === 'show') {
        if (whitelist.length === 0) {
            return await interaction.reply({ content: '📜 قائمة الوايت ليست فارغة حالياً. جميع الإداريين تحت المراقبة.', ephemeral: true });
        }
        const wlMentions = whitelist.map(id => `<@${id}>`).join('\n');
        const wlEmbed = new EmbedBuilder()
            .setColor('#00ffcc')
            .setTitle('👑 قائمة الموثوقين (Whitelist) بالسيرفر')
            .setDescription(`الأشخاص ذول مستثنين من نظام الحماية تماماً:\n\n${wlMentions}`)
            .setTimestamp();
        return await interaction.reply({ embeds: [wlEmbed] });
    }
});

// 2. منع مسح الرومات من الإداريين
client.on('channelDelete', async (channel) => {
    const guild = channel.guild;
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
    if (!auditLogs) return;
    const entry = auditLogs.entries.first();
    if (!entry) return;
    const executor = entry.executor;

    if (executor.id === guild.ownerId || executor.id === client.user.id || whitelist.includes(executor.id)) return;

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
            console.log(`🚨 تم سحب رتب ${executor.tag} بسبب مسح الرومات!`);
        }
    }
});

// 3. منع التخريب بالباند
client.on('guildBanAdd', async (ban) => {
    const guild = ban.guild;
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
    if (!auditLogs) return;
    const entry = auditLogs.entries.first();
    if (!entry) return;
    const executor = entry.executor;

    if (executor.id === guild.ownerId || executor.id === client.user.id || whitelist.includes(executor.id)) return;

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

// 4. منع دخول البوتات الوهمية
client.on('guildMemberAdd', async (member) => {
    if (!member.user.bot) return;
    const guild = member.guild;
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd }).catch(() => null);
    if (!auditLogs) return;
    const entry = auditLogs.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    
    if (executor.id !== guild.ownerId && !whitelist.includes(executor.id)) {
        await member.kick("ممنوع دخول بوتات غريبة!").catch(() => null);
    }
});

// 5. منع الروابط في الشات للأعضاء العاديين
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content.includes('http://') || message.content.includes('https://') || message.content.includes('discord.gg/')) {
        if (!whitelist.includes(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            try {
                await message.delete();
                const warn = await message.channel.send(`⚠️ يا ${message.author}، ممنوع نشر الروابط لحماية السيرفر!`);
                setTimeout(() => warn.delete().catch(() => null), 4000);
            } catch (err) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
        
