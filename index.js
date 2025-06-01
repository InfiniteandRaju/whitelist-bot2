const { Client, GatewayIntentBits, Partials, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

const db = new sqlite3.Database('./cooldowns.db');
db.run("CREATE TABLE IF NOT EXISTS cooldowns (userId TEXT PRIMARY KEY, lastUsed INTEGER)");

client.once('ready', () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    const userId = interaction.user.id;
    if (!interaction.member.roles.cache.find(r => r.name === config.roleRequired)) {
      return interaction.reply({ content: `❌ You need the **${config.roleRequired}** role!`, ephemeral: true });
    }

    db.get("SELECT lastUsed FROM cooldowns WHERE userId = ?", [userId], async (err, row) => {
      const now = Date.now();
      if (row && now - row.lastUsed < 86400000) {
        const hoursLeft = Math.ceil((86400000 - (now - row.lastUsed)) / (1000 * 60 * 60));
        return interaction.reply({ content: `⏳ Please wait ${hoursLeft} more hour(s) before updating again.`, ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('usernameModal')
        .setTitle('Enter Minecraft Username')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('mcusername')
              .setLabel('Minecraft Username')
              .setStyle(TextInputStyle.Short)
              .setMinLength(3)
              .setMaxLength(16)
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
    });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'usernameModal') {
    const username = interaction.fields.getTextInputValue('mcusername');
    const userId = interaction.user.id;

    try {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (res.ok) {
        db.run("INSERT OR REPLACE INTO cooldowns (userId, lastUsed) VALUES (?, ?)", [userId, Date.now()]);
        return interaction.reply({ content: `✅ Username **${username}** has been whitelisted.`, ephemeral: true });
      } else {
        return interaction.reply({ content: `⚠️ Server error. Try again later.`, ephemeral: true });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `❌ Failed to contact Minecraft server.`, ephemeral: true });
    }
  }
});

client.login(config.token);