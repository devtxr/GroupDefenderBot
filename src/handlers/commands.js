const Group = require("../models/Group");
const Warning = require("../models/Warning");

async function isAdmin(ctx) {
  if (!ctx.chat || !["group", "supergroup"].includes(ctx.chat.type)) return false;
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

async function getGroup(ctx) {
  return Group.findOneAndUpdate(
    { chatId: String(ctx.chat.id) },
    { $setOnInsert: { title: ctx.chat.title || "" } },
    { upsert: true, new: true }
  );
}

function setupCommands(bot) {
  bot.start(async ctx => {
    await ctx.reply(
      "🛡️ Telegram Moderator Bot\\n\\n" +
      "Add me to a group as administrator.\\n" +
      "Use /help to see commands."
    );
  });

  bot.command("help", async ctx => {
    await ctx.reply(
      "🛡️ Moderation Commands\\n\\n" +
      "/settings - group settings\\n" +
      "/antilink on|off\\n" +
      "/antigaali on|off\\n" +
      "/warnings - your warnings\\n" +
      "/resetwarn - reply to a user's message\\n" +
      "/filter add WORD - add custom filter\\n" +
      "/filter remove WORD - remove custom filter\\n" +
      "/filter list - list custom filters"
    );
  });

  bot.command("settings", async ctx => {
    const g = await getGroup(ctx);
    await ctx.reply(
      `⚙️ Settings\\n\\n` +
      `🔗 Anti-link: ${g.antiLink ? "ON" : "OFF"}\\n` +
      `🤬 Anti-abuse: ${g.antiProfanity ? "ON" : "OFF"}\\n` +
      `⚠️ Max warnings: ${g.maxWarnings}\\n` +
      `🔇 Mute: ${g.muteMinutes} minutes`
    );
  });

  bot.command("antilink", async ctx => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only.");
    const arg = ctx.message.text.split(/\s+/)[1]?.toLowerCase();
    if (!["on", "off"].includes(arg)) return ctx.reply("Usage: /antilink on|off");
    const g = await getGroup(ctx);
    g.antiLink = arg === "on";
    await g.save();
    await ctx.reply(`🔗 Anti-link ${g.antiLink ? "enabled" : "disabled"}.`);
  });

  bot.command("antigaali", async ctx => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only.");
    const arg = ctx.message.text.split(/\s+/)[1]?.toLowerCase();
    if (!["on", "off"].includes(arg)) return ctx.reply("Usage: /antigaali on|off");
    const g = await getGroup(ctx);
    g.antiProfanity = arg === "on";
    await g.save();
    await ctx.reply(`🤬 Anti-abuse ${g.antiProfanity ? "enabled" : "disabled"}.`);
  });

  bot.command("warnings", async ctx => {
    if (!ctx.from) return;
    const w = await Warning.findOne({
      chatId: String(ctx.chat.id),
      userId: String(ctx.from.id)
    });
    await ctx.reply(`⚠️ Your warnings: ${w?.count || 0}`);
  });

  bot.command("resetwarn", async ctx => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only.");
    if (!ctx.message.reply_to_message?.from) {
      return ctx.reply("Reply to a user's message with /resetwarn");
    }
    const uid = String(ctx.message.reply_to_message.from.id);
    await Warning.findOneAndUpdate(
      { chatId: String(ctx.chat.id), userId: uid },
      { $set: { count: 0 } },
      { upsert: true }
    );
    await ctx.reply("✅ Warnings reset.");
  });

  bot.command("filter", async ctx => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only.");
    const parts = ctx.message.text.trim().split(/\s+/);
    const action = parts[1]?.toLowerCase();
    const word = parts.slice(2).join(" ").trim();
    const g = await getGroup(ctx);

    if (action === "add" && word) {
      if (!g.customWords.includes(word.toLowerCase())) {
        g.customWords.push(word.toLowerCase());
        await g.save();
      }
      return ctx.reply("✅ Custom filter added.");
    }

    if (action === "remove" && word) {
      g.customWords = g.customWords.filter(x => x !== word.toLowerCase());
      await g.save();
      return ctx.reply("✅ Custom filter removed.");
    }

    if (action === "list") {
      return ctx.reply(
        "🧾 Custom filters:\\n" +
        (g.customWords.length ? g.customWords.join(", ") : "None")
      );
    }

    return ctx.reply("Usage: /filter add WORD | /filter remove WORD | /filter list");
  });
}

module.exports = { setupCommands };
