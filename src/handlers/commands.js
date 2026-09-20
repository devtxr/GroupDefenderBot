const { Markup } = require("telegraf");
const Group = require("../models/Group");
const Warning = require("../models/Warning");

async function isAdmin(ctx) {
  if (!ctx.chat || !["group", "supergroup"].includes(ctx.chat.type)) {
    return false;
  }

  try {
    const member = await ctx.telegram.getChatMember(
      ctx.chat.id,
      ctx.from.id
    );

    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

async function getGroup(ctx) {
  return Group.findOneAndUpdate(
    { chatId: String(ctx.chat.id) },
    {
      $setOnInsert: {
        title: ctx.chat.title || ""
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}

/* =========================
   MAIN MENU
========================= */

function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("⚙️ Settings", "settings"),
      Markup.button.callback("🛡️ Moderation", "moderation")
    ],
    [
      Markup.button.callback("⚠️ My Warnings", "my_warnings"),
      Markup.button.callback("📖 Help", "help")
    ]
  ]);
}

/* =========================
   SETTINGS MENU
========================= */

function settingsMenu(group) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `🔗 Anti-Link: ${group.antiLink ? "ON 🟢" : "OFF 🔴"}`,
        "toggle_antilink"
      )
    ],
    [
      Markup.button.callback(
        `🤬 Anti-Abuse: ${group.antiProfanity ? "ON 🟢" : "OFF 🔴"}`,
        "toggle_profanity"
      )
    ],
    [
      Markup.button.callback("⚠️ Warning Settings", "warning_settings"),
      Markup.button.callback("🧾 Filters", "filters")
    ],
    [
      Markup.button.callback("🔙 Back", "home")
    ]
  ]);
}

/* =========================
   MODERATION MENU
========================= */

function moderationMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🔗 Anti-Link", "toggle_antilink"),
      Markup.button.callback("🤬 Anti-Abuse", "toggle_profanity")
    ],
    [
      Markup.button.callback("🧾 Custom Filters", "filters"),
      Markup.button.callback("⚠️ Warnings", "warning_settings")
    ],
    [
      Markup.button.callback("🔙 Back", "home")
    ]
  ]);
}

/* =========================
   WARNING SETTINGS
========================= */

function warningMenu(group) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `⚠️ Max Warnings: ${group.maxWarnings}`,
        "warning_info"
      )
    ],
    [
      Markup.button.callback(
        `🔇 Mute: ${group.muteMinutes} min`,
        "mute_info"
      )
    ],
    [
      Markup.button.callback("🔙 Settings", "settings")
    ]
  ]);
}

/* =========================
   FILTER MENU
========================= */

function filterMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📋 Filter List", "filter_list")
    ],
    [
      Markup.button.callback(
        "➕ Add Filter",
        "filter_add_info"
      )
    ],
    [
      Markup.button.callback(
        "➖ Remove Filter",
        "filter_remove_info"
      )
    ],
    [
      Markup.button.callback("🔙 Settings", "settings")
    ]
  ]);
}

/* =========================
   HELP TEXT
========================= */

function helpText() {
  return (
    "🛡️ *Telegram Moderator Bot*\n\n" +
    "Available commands:\n\n" +
    "⚙️ /panel - Open control panel\n" +
    "⚙️ /settings - Group settings\n" +
    "🔗 /antilink on|off\n" +
    "🤬 /antigaali on|off\n" +
    "⚠️ /warnings - Your warnings\n" +
    "🔄 /resetwarn - Reset warnings\n\n" +
    "🧾 Custom filters:\n" +
    "/filter add WORD\n" +
    "/filter remove WORD\n" +
    "/filter list\n\n" +
    "👮 Admin commands require group admin permission."
  );
}

/* =========================
   SETUP COMMANDS
========================= */

function setupCommands(bot) {

  /* START */

  bot.start(async ctx => {
    await ctx.reply(
      "🛡️ *Telegram Moderator Bot*\n\n" +
      "Multi-group moderation system.\n\n" +
      "Add me as an administrator to your group.",
      {
        parse_mode: "Markdown",
        ...mainMenu()
      }
    );
  });

  /* PANEL */

  bot.command("panel", async ctx => {
    if (!["group", "supergroup"].includes(ctx.chat.type)) {
      return ctx.reply(
        "⚠️ /panel group me use karo."
      );
    }

    const admin = await isAdmin(ctx);

    if (!admin) {
      return ctx.reply("❌ Sirf group admins panel use kar sakte hain.");
    }

    await ctx.reply(
      "🎛️ *Group Control Panel*\n\n" +
      "Neeche se setting select karo:",
      {
        parse_mode: "Markdown",
        ...mainMenu()
      }
    );
  });

  /* HELP */

  bot.command("help", async ctx => {
    await ctx.reply(helpText(), {
      parse_mode: "Markdown",
      ...mainMenu()
    });
  });

  /* SETTINGS */

  bot.command("settings", async ctx => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group = await getGroup(ctx);

    await ctx.reply(
      "⚙️ *Group Settings*\n\n" +
      `🔗 Anti-Link: ${group.antiLink ? "ON 🟢" : "OFF 🔴"}\n` +
      `🤬 Anti-Abuse: ${group.antiProfanity ? "ON 🟢" : "OFF 🔴"}\n` +
      `⚠️ Max Warnings: ${group.maxWarnings}\n` +
      `🔇 Mute Time: ${group.muteMinutes} minutes`,
      {
        parse_mode: "Markdown",
        ...settingsMenu(group)
      }
    );
  });

  /* ANTI LINK */

  bot.command("antilink", async ctx => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const arg = ctx.message.text
      .split(/\s+/)[1]
      ?.toLowerCase();

    if (!["on", "off"].includes(arg)) {
      return ctx.reply("Usage: /antilink on|off");
    }

    const group = await getGroup(ctx);

    group.antiLink = arg === "on";

    await group.save();

    await ctx.reply(
      `🔗 Anti-Link ${group.antiLink ? "enabled 🟢" : "disabled 🔴"}.`,
      settingsMenu(group)
    );
  });

  /* ANTI GAALI */

  bot.command("antigaali", async ctx => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const arg = ctx.message.text
      .split(/\s+/)[1]
      ?.toLowerCase();

    if (!["on", "off"].includes(arg)) {
      return ctx.reply("Usage: /antigaali on|off");
    }

    const group = await getGroup(ctx);

    group.antiProfanity = arg === "on";

    await group.save();

    await ctx.reply(
      `🤬 Anti-Abuse ${
        group.antiProfanity ? "enabled 🟢" : "disabled 🔴"
      }.`,
      settingsMenu(group)
    );
  });

  /* WARNINGS */

  bot.command("warnings", async ctx => {
    if (!ctx.from) return;

    const warning = await Warning.findOne({
      chatId: String(ctx.chat.id),
      userId: String(ctx.from.id)
    });

    const group = await getGroup(ctx);

    await ctx.reply(
      `⚠️ *Your Warnings*\n\n` +
      `Current: ${warning?.count || 0}/${group.maxWarnings}`,
      {
        parse_mode: "Markdown"
      }
    );
  });

  /* RESET WARNING */

  bot.command("resetwarn", async ctx => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    if (!ctx.message.reply_to_message?.from) {
      return ctx.reply(
        "↩️ Kisi user ke message ko reply karke /resetwarn bhejo."
      );
    }

    const userId = String(
      ctx.message.reply_to_message.from.id
    );

    await Warning.findOneAndUpdate(
      {
        chatId: String(ctx.chat.id),
        userId
      },
      {
        $set: {
          count: 0
        }
      },
      {
        upsert: true
      }
    );

    await ctx.reply("✅ User warnings reset ho gayi.");
  });

  /* FILTER COMMAND */

  bot.command("filter", async ctx => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const parts = ctx.message.text
      .trim()
      .split(/\s+/);

    const action = parts[1]?.toLowerCase();
    const word = parts.slice(2).join(" ").trim();

    const group = await getGroup(ctx);

    if (action === "add" && word) {

      const value = word.toLowerCase();

      if (!group.customWords.includes(value)) {
        group.customWords.push(value);
        await group.save();
      }

      return ctx.reply(
        `✅ Filter added:\n\`${value}\``,
        {
          parse_mode: "Markdown"
        }
      );
    }

    if (action === "remove" && word) {

      const value = word.toLowerCase();

      group.customWords =
        group.customWords.filter(
          x => x !== value
        );

      await group.save();

      return ctx.reply(
        `✅ Filter removed:\n\`${value}\``,
        {
          parse_mode: "Markdown"
        }
      );
    }

    if (action === "list") {

      return ctx.reply(
        "🧾 *Custom Filters*\n\n" +
        (
          group.customWords.length
            ? group.customWords.map(
                (x, i) => `${i + 1}. ${x}`
              ).join("\n")
            : "No custom filters."
        ),
        {
          parse_mode: "Markdown"
        }
      );
    }

    await ctx.reply(
      "🧾 Filter commands:",
      filterMenu()
    );
  });

  /* =========================
     CALLBACK BUTTONS
  ========================= */

  bot.action("home", async ctx => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    await ctx.editMessageText(
      "🎛️ *Group Control Panel*\n\n" +
      "Select an option:",
      {
        parse_mode: "Markdown",
        ...mainMenu()
      }
    );
  });

  /* SETTINGS BUTTON */

  bot.action("settings", async ctx => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group = await getGroup(ctx);

    await ctx.editMessageText(
      "⚙️ *Group Settings*\n\n" +
      `🔗 Anti-Link: ${group.antiLink ? "ON 🟢" : "OFF 🔴"}\n` +
      `🤬 Anti-Abuse: ${group.antiProfanity ? "ON 🟢" : "OFF 🔴"}\n` +
      `⚠️ Max Warnings: ${group.maxWarnings}\n` +
      `🔇 Mute Time: ${group.muteMinutes} minutes`,
      {
        parse_mode: "Markdown",
        ...settingsMenu(group)
      }
    );
  });

  /* MODERATION BUTTON */

  bot.action("moderation", async ctx => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    await ctx.editMessageText(
      "🛡️ *Moderation Controls*\n\n" +
      "Choose moderation option:",
      {
        parse_mode: "Markdown",
        ...moderationMenu()
      }
    );
  });

  /* TOGGLE ANTI LINK */

  bot.action("toggle_antilink", async ctx => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group = await getGroup(ctx);

    group.antiLink = !group.antiLink;

    await group.save();

    await ctx.editMessageText(
      "⚙️ *Group Settings*\n\n" +
      `🔗 Anti-Link: ${group.antiLink ? "ON 🟢" : "OFF 🔴"}\n` +
      `🤬 Anti-Abuse: ${group.antiProfanity ? "ON 🟢" : "OFF 🔴"}`,
      {
        parse_mode: "Markdown",
        ...settingsMenu(group)
      }
    );
  });

  /* TOGGLE PROFANITY */

  bot.action("toggle_profanity", async ctx => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group = await getGroup(ctx);

    group.antiProfanity =
      !group.antiProfanity;

    await group.save();

    await ctx.editMessageText(
      "⚙️ *Group Settings*\n\n" +
      `🔗 Anti-Link: ${group.antiLink ? "ON 🟢" : "OFF 🔴"}\n` +
      `🤬 Anti-Abuse: ${group.antiProfanity ? "ON 🟢" : "OFF 🔴"}`,
      {
        parse_mode: "Markdown",
        ...settingsMenu(group)
      }
    );
  });

  /* WARNING SETTINGS */

  bot.action("warning_settings", async ctx => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group = await getGroup(ctx);

    await ctx.editMessageText(
      "⚠️ *Warning Settings*\n\n" +
      `Maximum warnings: ${group.maxWarnings}\n` +
      `Mute duration: ${group.muteMinutes} minutes`,
      {
        parse_mode: "Markdown",
        ...warningMenu(group)
      }
    );
  });

  bot.action("warning_info", async ctx => {

    await ctx.answerCbQuery(
      "Max warnings database setting se controlled hai."
    );
  });

  bot.action("mute_info", async ctx => {

    await ctx.answerCbQuery(
      "Mute duration database setting se controlled hai."
    );
  });

  /* FILTERS */

  bot.action("filters", async ctx => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    await ctx.editMessageText(
      "🧾 *Custom Filters*\n\n" +
      "Custom filter manage karne ke liye buttons use karo.",
      {
        parse_mode: "Markdown",
        ...filterMenu()
      }
    );
  });

  bot.action("filter_list", async ctx => {

    await ctx.answerCbQuery();

    const group = await getGroup(ctx);

    await ctx.editMessageText(
      "🧾 *Custom Filters*\n\n" +
      (
        group.customWords.length
          ? group.customWords.map(
              (x, i) => `${i + 1}. ${x}`
            ).join("\n")
          : "No custom filters."
      ),
      {
        parse_mode: "Markdown",
        ...filterMenu()
      }
    );
  });

  bot.action("filter_add_info", async ctx => {

    await ctx.answerCbQuery();

    await ctx.reply(
      "➕ Filter add karne ke liye:\n\n" +
      "`/filter add WORD`",
      {
        parse_mode: "Markdown"
      }
    );
  });

  bot.action("filter_remove_info", async ctx => {

    await ctx.answerCbQuery();

    await ctx.reply(
      "➖ Filter remove karne ke liye:\n\n" +
      "`/filter remove WORD`",
      {
        parse_mode: "Markdown"
      }
    );
  });

  /* MY WARNINGS */

  bot.action("my_warnings", async ctx => {

    await ctx.answerCbQuery();

    const warning = await Warning.findOne({
      chatId: String(ctx.chat.id),
      userId: String(ctx.from.id)
    });

    const group = await getGroup(ctx);

    await ctx.reply(
      `⚠️ *Your Warnings*\n\n` +
      `Current: ${warning?.count || 0}/${group.maxWarnings}`,
      {
        parse_mode: "Markdown"
      }
    );
  });

  /* HELP BUTTON */

  bot.action("help", async ctx => {

    await ctx.answerCbQuery();

    await ctx.editMessageText(
      helpText(),
      {
        parse_mode: "Markdown",
        ...mainMenu()
      }
    );
  });
}

module.exports = {
  setupCommands
};
