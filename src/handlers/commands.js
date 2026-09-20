const { Markup } = require("telegraf");
const Group = require("../models/Group");
const Warning = require("../models/Warning");

/* =========================================
   CHECK GROUP ADMIN
========================================= */

async function isAdmin(ctx) {
  if (!ctx.chat) return false;

  if (!["group", "supergroup"].includes(ctx.chat.type)) {
    return false;
  }

  // Anonymous Administrator
  if (
    ctx.message?.sender_chat &&
    String(ctx.message.sender_chat.id) === String(ctx.chat.id)
  ) {
    return true;
  }

  // Normal Administrator
  if (!ctx.from?.id) {
    return false;
  }

  try {
    const member = await ctx.telegram.getChatMember(
      ctx.chat.id,
      ctx.from.id
    );

    return (
      member.status === "creator" ||
      member.status === "administrator"
    );
  } catch (error) {
    console.error("Admin check error:", error.message);
    return false;
  }
}

/* =========================================
   GET / CREATE GROUP
========================================= */

async function getGroup(ctx) {
  return Group.findOneAndUpdate(
    {
      chatId: String(ctx.chat.id)
    },
    {
      $setOnInsert: {
        title: ctx.chat.title || "",
        antiLink: true,
        antiProfanity: true,
        maxWarnings: 3,
        muteMinutes: 60,
        customWords: []
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}

/* =========================================
   MAIN INLINE PANEL
========================================= */

function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "⚙️ Settings",
        "settings"
      ),
      Markup.button.callback(
        "🛡️ Moderation",
        "moderation"
      )
    ],
    [
      Markup.button.callback(
        "⚠️ My Warnings",
        "my_warnings"
      ),
      Markup.button.callback(
        "📖 Help",
        "help"
      )
    ]
  ]);
}

/* =========================================
   SETTINGS MENU
========================================= */

function settingsMenu(group) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `🔗 Anti-Link: ${
          group.antiLink ? "ON 🟢" : "OFF 🔴"
        }`,
        "toggle_antilink"
      )
    ],
    [
      Markup.button.callback(
        `🤬 Anti-Abuse: ${
          group.antiProfanity ? "ON 🟢" : "OFF 🔴"
        }`,
        "toggle_profanity"
      )
    ],
    [
      Markup.button.callback(
        "⚠️ Warning Settings",
        "warning_settings"
      ),
      Markup.button.callback(
        "🧾 Filters",
        "filters"
      )
    ],
    [
      Markup.button.callback(
        "🔙 Back",
        "home"
      )
    ]
  ]);
}

/* =========================================
   MODERATION MENU
========================================= */

function moderationMenu(group) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `🔗 Anti-Link ${
          group.antiLink ? "🟢" : "🔴"
        }`,
        "toggle_antilink"
      ),
      Markup.button.callback(
        `🤬 Anti-Abuse ${
          group.antiProfanity ? "🟢" : "🔴"
        }`,
        "toggle_profanity"
      )
    ],
    [
      Markup.button.callback(
        "⚠️ Warnings",
        "warning_settings"
      ),
      Markup.button.callback(
        "🧾 Filters",
        "filters"
      )
    ],
    [
      Markup.button.callback(
        "🔙 Back",
        "home"
      )
    ]
  ]);
}

/* =========================================
   WARNING MENU
========================================= */

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
      Markup.button.callback(
        "🔙 Settings",
        "settings"
      )
    ]
  ]);
}

/* =========================================
   FILTER MENU
========================================= */

function filterMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "📋 Filter List",
        "filter_list"
      )
    ],
    [
      Markup.button.callback(
        "➕ Add Filter",
        "filter_add_info"
      ),
      Markup.button.callback(
        "➖ Remove Filter",
        "filter_remove_info"
      )
    ],
    [
      Markup.button.callback(
        "🔙 Settings",
        "settings"
      )
    ]
  ]);
}

/* =========================================
   HELP TEXT
========================================= */

function helpText() {
  return (
    "🛡️ *GroupDefenders Bot*\n\n" +
    "Professional Telegram moderation system.\n\n" +

    "🔗 *Anti-Link*\n" +
    "Automatically detects links and removes them.\n\n" +

    "🤬 *Anti-Abuse*\n" +
    "Detects configured Hindi/Hinglish/English abusive words.\n\n" +

    "⚠️ *Warnings*\n" +
    "Users receive warnings for rule violations.\n\n" +

    "🔇 *Auto Mute*\n" +
    "Users can be temporarily muted after reaching the warning limit.\n\n" +

    "🧾 *Custom Filters*\n" +
    "Admins can add their own filtered words.\n\n" +

    "Commands:\n" +
    "/panel - Open admin panel\n" +
    "/settings - Group settings\n" +
    "/antilink on|off\n" +
    "/antigaali on|off\n" +
    "/warnings - Check your warnings\n" +
    "/resetwarn - Reset replied user's warnings\n" +
    "/filter add WORD\n" +
    "/filter remove WORD\n" +
    "/filter list"
  );
}

/* =========================================
   SETUP COMMANDS
========================================= */

function setupCommands(bot) {

  /* =======================================
     START COMMAND
  ======================================= */

  bot.start(async (ctx) => {

    /* PRIVATE CHAT */

    if (ctx.chat.type === "private") {

      const botUsername =
        ctx.botInfo?.username || "GroupDefendersBot";

      return ctx.reply(
        "🛡️ *GroupDefenders Bot*\n\n" +

        "Professional Telegram Group Moderation Bot.\n\n" +

        "✨ Features:\n" +
        "🔗 Anti-Link Protection\n" +
        "🤬 Hindi + English Abuse Filter\n" +
        "⚠️ Warning System\n" +
        "🔇 Automatic Mute\n" +
        "🧾 Custom Filters\n" +
        "👮 Admin Control Panel\n\n" +

        "👇 Bot ko apne Telegram group me add karo:",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.url(
                "➕ Add to Group",
                `https://t.me/${botUsername}?startgroup=true`
              )
            ],
            [
              Markup.button.callback(
                "📖 Help",
                "help"
              )
            ]
          ])
        }
      );
    }

    /* GROUP CHAT */

    if (
      ctx.chat.type === "group" ||
      ctx.chat.type === "supergroup"
    ) {

      const admin = await isAdmin(ctx);

      if (!admin) {

        return ctx.reply(
          "⚠️ *Bot Setup Required*\n\n" +

          "Pehle mujhe is group me *Administrator* banao.\n\n" +

          "Required permissions:\n" +
          "🗑️ Delete Messages\n" +
          "🔇 Restrict Members\n\n" +

          "Admin banane ke baad /panel bhejo.",
          {
            parse_mode: "Markdown"
          }
        );
      }

      return ctx.reply(
        "🛡️ *GroupDefenders Control Panel*\n\n" +

        "✅ Bot successfully configured!\n\n" +

        "Neeche buttons se moderation settings control karo:",
        {
          parse_mode: "Markdown",
          ...mainMenu()
        }
      );
    }
  });

  /* =======================================
     PANEL COMMAND
  ======================================= */

  bot.command("panel", async (ctx) => {

    if (
      !["group", "supergroup"].includes(
        ctx.chat.type
      )
    ) {
      return ctx.reply(
        "⚠️ /panel ko Telegram group me use karo."
      );
    }

    if (!(await isAdmin(ctx))) {
      return ctx.reply(
        "❌ Sirf group administrators panel use kar sakte hain."
      );
    }

    await ctx.reply(
      "🎛️ *GroupDefenders Control Panel*\n\n" +
      "Neeche se option select karo:",
      {
        parse_mode: "Markdown",
        ...mainMenu()
      }
    );
  });

  /* =======================================
     HELP
  ======================================= */

  bot.command("help", async (ctx) => {

    await ctx.reply(
      helpText(),
      {
        parse_mode: "Markdown",
        ...mainMenu()
      }
    );
  });

  /* =======================================
     SETTINGS COMMAND
  ======================================= */

  bot.command("settings", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group = await getGroup(ctx);

    await ctx.reply(
      "⚙️ *Group Settings*\n\n" +

      `🔗 Anti-Link: ${
        group.antiLink ? "ON 🟢" : "OFF 🔴"
      }\n` +

      `🤬 Anti-Abuse: ${
        group.antiProfanity ? "ON 🟢" : "OFF 🔴"
      }\n` +

      `⚠️ Max Warnings: ${group.maxWarnings}\n` +

      `🔇 Mute Time: ${
        group.muteMinutes
      } minutes`,
      {
        parse_mode: "Markdown",
        ...settingsMenu(group)
      }
    );
  });

  /* =======================================
     ANTI LINK COMMAND
  ======================================= */

  bot.command("antilink", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const arg =
      ctx.message.text
        .split(/\s+/)[1]
        ?.toLowerCase();

    if (!["on", "off"].includes(arg)) {

      return ctx.reply(
        "Usage:\n/antilink on\n/antilink off"
      );
    }

    const group = await getGroup(ctx);

    group.antiLink = arg === "on";

    await group.save();

    await ctx.reply(
      `🔗 Anti-Link ${
        group.antiLink
          ? "enabled 🟢"
          : "disabled 🔴"
      }.`,
      settingsMenu(group)
    );
  });

  /* =======================================
     ANTI GAALI COMMAND
  ======================================= */

  bot.command("antigaali", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const arg =
      ctx.message.text
        .split(/\s+/)[1]
        ?.toLowerCase();

    if (!["on", "off"].includes(arg)) {

      return ctx.reply(
        "Usage:\n/antigaali on\n/antigaali off"
      );
    }

    const group = await getGroup(ctx);

    group.antiProfanity = arg === "on";

    await group.save();

    await ctx.reply(
      `🤬 Anti-Abuse ${
        group.antiProfanity
          ? "enabled 🟢"
          : "disabled 🔴"
      }.`,
      settingsMenu(group)
    );
  });

  /* =======================================
     WARNINGS COMMAND
  ======================================= */

  bot.command("warnings", async (ctx) => {

    if (!ctx.from) return;

    const warning =
      await Warning.findOne({
        chatId: String(ctx.chat.id),
        userId: String(ctx.from.id)
      });

    const group = await getGroup(ctx);

    await ctx.reply(
      "⚠️ *Your Warnings*\n\n" +
      `Current: ${
        warning?.count || 0
      }/${group.maxWarnings}`,
      {
        parse_mode: "Markdown"
      }
    );
  });

  /* =======================================
     RESET WARNINGS
  ======================================= */

  bot.command("resetwarn", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    if (
      !ctx.message.reply_to_message ||
      !ctx.message.reply_to_message.from
    ) {

      return ctx.reply(
        "↩️ Kisi user ke message ko reply karke:\n\n" +
        "/resetwarn"
      );
    }

    const userId =
      String(
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

    await ctx.reply(
      "✅ User ke warnings reset ho gaye."
    );
  });

  /* =======================================
     FILTER COMMAND
  ======================================= */

  bot.command("filter", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const parts =
      ctx.message.text
        .trim()
        .split(/\s+/);

    const action =
      parts[1]?.toLowerCase();

    const word =
      parts.slice(2)
        .join(" ")
        .trim();

    const group =
      await getGroup(ctx);

    /* ADD */

    if (
      action === "add" &&
      word
    ) {

      const value =
        word.toLowerCase();

      if (
        !group.customWords.includes(value)
      ) {

        group.customWords.push(value);

        await group.save();
      }

      return ctx.reply(
        `✅ Filter added:\n\n\`${value}\``,
        {
          parse_mode: "Markdown"
        }
      );
    }

    /* REMOVE */

    if (
      action === "remove" &&
      word
    ) {

      const value =
        word.toLowerCase();

      group.customWords =
        group.customWords.filter(
          (item) => item !== value
        );

      await group.save();

      return ctx.reply(
        `✅ Filter removed:\n\n\`${value}\``,
        {
          parse_mode: "Markdown"
        }
      );
    }

    /* LIST */

    if (action === "list") {

      const list =
        group.customWords.length
          ? group.customWords
              .map(
                (item, index) =>
                  `${index + 1}. ${item}`
              )
              .join("\n")
          : "No custom filters.";

      return ctx.reply(
        "🧾 *Custom Filters*\n\n" +
        list,
        {
          parse_mode: "Markdown",
          ...filterMenu()
        }
      );
    }

    return ctx.reply(
      "🧾 *Custom Filter Panel*",
      {
        parse_mode: "Markdown",
        ...filterMenu()
      }
    );
  });

  /* =======================================
     INLINE: HOME
  ======================================= */

  bot.action("home", async (ctx) => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    await ctx.editMessageText(
      "🎛️ *GroupDefenders Control Panel*\n\n" +
      "Select an option:",
      {
        parse_mode: "Markdown",
        ...mainMenu()
      }
    );
  });

  /* =======================================
     INLINE: SETTINGS
  ======================================= */

  bot.action("settings", async (ctx) => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group =
      await getGroup(ctx);

    await ctx.editMessageText(
      "⚙️ *Group Settings*\n\n" +

      `🔗 Anti-Link: ${
        group.antiLink
          ? "ON 🟢"
          : "OFF 🔴"
      }\n` +

      `🤬 Anti-Abuse: ${
        group.antiProfanity
          ? "ON 🟢"
          : "OFF 🔴"
      }\n` +

      `⚠️ Max Warnings: ${
        group.maxWarnings
      }\n` +

      `🔇 Mute: ${
        group.muteMinutes
      } minutes`,
      {
        parse_mode: "Markdown",
        ...settingsMenu(group)
      }
    );
  });

  /* =======================================
     INLINE: MODERATION
  ======================================= */

  bot.action("moderation", async (ctx) => {

    await ctx.answerCbQuery();

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const group =
      await getGroup(ctx);

    await ctx.editMessageText(
      "🛡️ *Moderation Controls*\n\n" +
      "Neeche se option select karo:",
      {
        parse_mode: "Markdown",
        ...moderationMenu(group)
      }
    );
  });

  /* =======================================
     TOGGLE ANTI LINK
  ======================================= */

  bot.action(
    "toggle_antilink",
    async (ctx) => {

      await ctx.answerCbQuery();

      if (!(await isAdmin(ctx))) {
        return ctx.reply(
          "❌ Admin only."
        );
      }

      const group =
        await getGroup(ctx);

      group.antiLink =
        !group.antiLink;

      await group.save();

      await ctx.editMessageText(
        "⚙️ *Group Settings*\n\n" +

        `🔗 Anti-Link: ${
          group.antiLink
            ? "ON 🟢"
            : "OFF 🔴"
        }\n` +

        `🤬 Anti-Abuse: ${
          group.antiProfanity
            ? "ON 🟢"
            : "OFF 🔴"
        }`,
        {
          parse_mode: "Markdown",
          ...settingsMenu(group)
        }
      );
    }
  );

  /* =======================================
     TOGGLE PROFANITY
  ======================================= */

  bot.action(
    "toggle_profanity",
    async (ctx) => {

      await ctx.answerCbQuery();

      if (!(await isAdmin(ctx))) {
        return ctx.reply(
          "❌ Admin only."
        );
      }

      const group =
        await getGroup(ctx);

      group.antiProfanity =
        !group.antiProfanity;

      await group.save();

      await ctx.editMessageText(
        "⚙️ *Group Settings*\n\n" +

        `🔗 Anti-Link: ${
          group.antiLink
            ? "ON 🟢"
            : "OFF 🔴"
        }\n` +

        `🤬 Anti-Abuse: ${
          group.antiProfanity
            ? "ON 🟢"
            : "OFF 🔴"
        }`,
        {
          parse_mode: "Markdown",
          ...settingsMenu(group)
        }
      );
    }
  );

  /* =======================================
     WARNING SETTINGS
  ======================================= */

  bot.action(
    "warning_settings",
    async (ctx) => {

      await ctx.answerCbQuery();

      if (!(await isAdmin(ctx))) {
        return ctx.reply(
          "❌ Admin only."
        );
      }

      const group =
        await getGroup(ctx);

      await ctx.editMessageText(
        "⚠️ *Warning Settings*\n\n" +

        `Maximum warnings: ${
          group.maxWarnings
        }\n` +

        `Mute duration: ${
          group.muteMinutes
        } minutes`,
        {
          parse_mode: "Markdown",
          ...warningMenu(group)
        }
      );
    }
  );

  /* =======================================
     WARNING INFO
  ======================================= */

  bot.action(
    "warning_info",
    async (ctx) => {

      await ctx.answerCbQuery(
        "Current limit database se configured hai."
      );
    }
  );

  /* =======================================
     MUTE INFO
  ======================================= */

  bot.action(
    "mute_info",
    async (ctx) => {

      await ctx.answerCbQuery(
        "Current mute duration database se configured hai."
      );
    }
  );

  /* =======================================
     FILTERS
  ======================================= */

  bot.action(
    "filters",
    async (ctx) => {

      await ctx.answerCbQuery();

      if (!(await isAdmin(ctx))) {
        return ctx.reply(
          "❌ Admin only."
        );
      }

      await ctx.editMessageText(
        "🧾 *Custom Filters*\n\n" +
        "Custom filters manage karne ke liye option select karo:",
        {
          parse_mode: "Markdown",
          ...filterMenu()
        }
      );
    }
  );

  /* =======================================
     FILTER LIST
  ======================================= */

  bot.action(
    "filter_list",
    async (ctx) => {

      await ctx.answerCbQuery();

      if (!(await isAdmin(ctx))) {
        return ctx.reply(
          "❌ Admin only."
        );
      }

      const group =
        await getGroup(ctx);

      const list =
        group.customWords.length
          ? group.customWords
              .map(
                (item, index) =>
                  `${index + 1}. ${item}`
              )
              .join("\n")
          : "No custom filters.";

      await ctx.editMessageText(
        "🧾 *Custom Filters*\n\n" +
        list,
        {
          parse_mode: "Markdown",
          ...filterMenu()
        }
      );
    }
  );

  /* =======================================
     FILTER ADD INFO
  ======================================= */

  bot.action(
    "filter_add_info",
    async (ctx) => {

      await ctx.answerCbQuery();

      await ctx.reply(
        "➕ Filter add karne ke liye:\n\n" +
        "`/filter add WORD`",
        {
          parse_mode: "Markdown"
        }
      );
    }
  );

  /* =======================================
     FILTER REMOVE INFO
  ======================================= */

  bot.action(
    "filter_remove_info",
    async (ctx) => {

      await ctx.answerCbQuery();

      await ctx.reply(
        "➖ Filter remove karne ke liye:\n\n" +
        "`/filter remove WORD`",
        {
          parse_mode: "Markdown"
        }
      );
    }
  );

  /* =======================================
     MY WARNINGS BUTTON
  ======================================= */

  bot.action(
    "my_warnings",
    async (ctx) => {

      await ctx.answerCbQuery();

      if (
        !["group", "supergroup"].includes(
          ctx.chat.type
        )
      ) {
        return ctx.reply(
          "⚠️ Ye option group me use karo."
        );
      }

      const warning =
        await Warning.findOne({
          chatId: String(
            ctx.chat.id
          ),
          userId: String(
            ctx.from.id
          )
        });

      const group =
        await getGroup(ctx);

      await ctx.reply(
        "⚠️ *Your Warnings*\n\n" +
        `Current: ${
          warning?.count || 0
        }/${group.maxWarnings}`,
        {
          parse_mode: "Markdown"
        }
      );
    }
  );

  /* =======================================
     HELP BUTTON
  ======================================= */

  bot.action(
    "help",
    async (ctx) => {

      await ctx.answerCbQuery();

      await ctx.editMessageText(
        helpText(),
        {
          parse_mode: "Markdown",
          ...mainMenu()
        }
      );
    }
  );
}

/* =========================================
   EXPORT
========================================= */

module.exports = {
  setupCommands
};
