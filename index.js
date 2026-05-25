const { Client, GatewayIntentBits, PermissionFlagsBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('OS Bot is Online!'));
app.listen(3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// إعدادات البوت
const lineImageURL = 'https://cdn.discordapp.com/attachments/1507997898783068210/1508458186619752589/5MQGz1n7.webp?ex=6a159ca9&is=6a144b29&hm=e2289d5dfc472df69654ab380738b814450de34a56760a67d77159ffbc8e641f&';
const badWords = ['كسمك', 'شرموط', 'كسختك', 'عرص', 'معرص', 'متناك', 'يلعن ميتين امك', 'كلزق', 'تفو', 'امك', 'ابوك', 'خنيث', 'قحبة', 'منيوك'];

// تعريف أوامر السلاش
const commands = [
    new SlashCommandBuilder().setName('line').setDescription('إرسال خط السيرفر'),
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة البوت')
].map(c => c.toJSON());

client.on('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('البوت شغال وكل الأوامر متسجلة!');
});

// معالجة الأوامر والرسائل
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.trim();

    // 1. حماية الشتائم (تايم 2 دقيقة)
    if (badWords.some(word => msg.toLowerCase().includes(word))) {
        await message.delete().catch(() => {});
        await message.member.timeout(2 * 60 * 1000, 'شتائم').catch(() => {});
        return message.channel.send(`⚠️ تم تأديب ${message.author} تايم دقيقتين.`);
    }

    // 2. نظام الخط (صورة فقط بدون تكرار)
    if (msg === 'خط') {
        return message.channel.send({ files: [new AttachmentBuilder(lineImageURL)] });
    }

    // 3. الردود التلقائية
    if (msg === 'هلا') return message.reply('هلا بك يا غالي منور السيرفر! ✨');
    if (msg === 'برب') return message.reply('تيت يا غالي، لا تتأخر علينا! 🚶‍♂️');
    if (msg === 'باك') return message.reply('منور السيرفر من جديد يا وحش! 👑');
    if (msg === 'نقطة' || msg === '.') return message.reply('منور بنقطتك الجميلة. 👑');
    if (msg === 'بوت') return message.reply('لبيه! أنا في الخدمة 🤖');
    if (msg === 'اسعار الاعلانات') return message.reply('📊 أسعارنا: برود 20ｍ، أونلاين 10ｍ، منشن هير 1ｍ');
});

// معالجة أوامر السلاش
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'line') {
        return await interaction.reply({ files: [new AttachmentBuilder(lineImageURL)] });
    }
    if (interaction.commandName === 'ping') return await interaction.reply('بونج! 🏓');
});

client.login(process.env.DISCORD_TOKEN);
