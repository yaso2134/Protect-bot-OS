const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ActivityType, EmbedBuilder } = require('discord.js');
const express = require('express');

// 1. السيرفر للـ 24 ساعة
const app = express();
app.listen(3000);
app.get('/', (req, res) => res.send('OS Bot is Online 24/7!'));

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

// --- قائمة الردود والشتائم ---
const badWords = ['شتم1', 'شتم2', 'شتم3']; // ضيف كل الشتائم هنا
const autoReplies = {
    'سلام': 'وعليكم السلام يا وحش، نورت!',
    'هاي': 'أهلاً يا بطل، إزيك؟',
    'بوت': 'أنا OS، نظامك المفضل شغال 24 ساعة!',
    'قوانين': 'ممنوع الشتم وممنوع الروابط، التزم عشان ما تاخدش تايم!'
};

// 2. أوامر السلاش
const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('طرد نهائي').addUserOption(o => o.setName('user').setRequired(true).setDescription('العضو')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName('kick').setDescription('طرد').addUserOption(o => o.setName('user').setRequired(true).setDescription('العضو')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(o => o.setName('amount').setRequired(true).setDescription('عدد الرسائل')),
    new SlashCommandBuilder().setName('lock').setDescription('قفل القناة').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder().setName('unlock').setDescription('فتح القناة').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder().setName('ads').setDescription('عرض أسعار الإعلانات'),
];

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    client.user.setActivity('OS System 24/7', { type: ActivityType.Playing });
    console.log(`OS Bot is READY: ${client.user.tag}`);
});

// 3. نظام الردود، الشتائم، والحماية
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- نظام الردود التلقائية ---
    const content = message.content;
    if (autoReplies[content]) {
        return message.reply(autoReplies[content]);
    }

    // --- نظام حماية الشتايم والروابط ---
    const lowerContent = content.toLowerCase();
    const hasBadWord = badWords.some(word => lowerContent.includes(word));
    const hasLink = lowerContent.includes('http') || lowerContent.includes('discord.gg');

    if (hasBadWord || hasLink) {
        await message.delete().catch(() => {});
        await message.member.timeout(5 * 60 * 1000, 'مخالفة قوانين').catch(() => {});
        const warning = await message.channel.send(`${message.author}، ممنوع الشتم أو الروابط! (تايم 5 دقائق)`);
        setTimeout(() => warning.delete().catch(() => {}), 5000);
    }
});

// 4. تنفيذ أوامر السلاش
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ban') {
        const user = interaction.options.getUser('user');
        await interaction.guild.members.ban(user);
        await interaction.reply(`تم تبنيد ${user.username}`);
    } else if (interaction.commandName === 'kick') {
        const member = interaction.options.getMember('user');
        await member.kick();
        await interaction.reply(`تم طرد ${member.user.username}`);
    } else if (interaction.commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount);
        await interaction.reply(`تم مسح ${amount} رسالة!`);
    } else if (interaction.commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
        await interaction.reply('تم قفل القناة 🔒');
    } else if (interaction.commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
        await interaction.reply('تم فتح القناة 🔓');
    } else if (interaction.commandName === 'ads') {
        const adsEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('💰 قائمة أسعار الإعلانات')
            .addFields(
                { name: '📩 رسالة للكل (في الخاص):', value: '20 m', inline: false },
                { name: '🟢 رسالة للأونلاين فقط:', value: '15 m', inline: false }
            );
        await interaction.reply({ embeds: [adsEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
