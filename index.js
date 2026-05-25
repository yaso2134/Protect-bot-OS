const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is Alive!'));
app.listen(3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const lineImageURL = 'https://cdn.discordapp.com/attachments/1507997898783068210/1508458186619752589/5MQGz1n7.webp?ex=6a159ca9&is=6a144b29&hm=e2289d5dfc472df69654ab380738b814450de34a56760a67d77159ffbc8e641f&';

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const msg = message.content.trim();

    // الخط
    if (msg === 'خط') {
        return message.channel.send({ files: [new AttachmentBuilder(lineImageURL)] });
    }

    // الردود
    if (msg === 'هلا') return message.reply('هلا بك يا غالي منور! ✨');
    if (msg === 'برب') return message.reply('تيت يا غالي! 🚶‍♂️');
    if (msg === 'باك') return message.reply('منور من جديد! 👑');
    
    // الشتائم (حماية بسيطة)
    const badWords = ['كسمك', 'شرموط', 'عرص'];
    if (badWords.some(word => msg.toLowerCase().includes(word))) {
        await message.delete().catch(() => {});
        return message.channel.send(`⚠️ ممنوع الغلط يا ${message.author}!`);
    }
});

client.login(process.env.DISCORD_TOKEN);
