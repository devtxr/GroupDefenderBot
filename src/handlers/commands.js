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
    `🚨 Anti-Spam ${
      group.antiSpam ? "🟢" : "🔴"
    }`,
    "toggle_antispam"
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
     UNMUTE / UNBLOCK USER
  ======================================= */

  bot.command("unmute", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    if (
      !ctx.message.reply_to_message ||
      !ctx.message.reply_to_message.from
    ) {
      return ctx.reply(
        "↩️ Muted user ke message ko reply karke:\n\n" +
        "/unmute"
      );
    }

    const user =
      ctx.message.reply_to_message.from;

    try {

      // Get group's default permissions
      const chat =
        await ctx.telegram.getChat(
          ctx.chat.id
        );

      const permissions =
        chat.permissions || {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
          can_change_info: false,
          can_invite_users: true,
          can_pin_messages: false
        };

      await ctx.telegram.restrictChatMember(
        ctx.chat.id,
        user.id,
        {
          permissions
        }
      );

      await ctx.reply(
        `🔓 *User Unmuted Successfully*\n\n` +
        `👤 User: ${user.first_name || "User"}\n` +
        `🆔 ID: \`${user.id}\`\n\n` +
        `✅ User can send messages again.\n\n` +
        `🛡️ GroupDefenders`,
        {
          parse_mode: "Markdown"
        }
      );

    } catch (error) {

      console.error(
        "Unmute error:",
        error.message
      );

      await ctx.reply(
        "❌ User ko unmute nahi kar saka.\n\n" +
        "Check karo bot ke paas *Restrict Members* permission hai.",
        {
          parse_mode: "Markdown"
        }
      );
    }
  });

     /* =======================================
     BAN USER
  ======================================= */

  bot.command("ban", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    if (
      !ctx.message.reply_to_message ||
      !ctx.message.reply_to_message.from
    ) {
      return ctx.reply(
        "↩️ User ke message ko reply karke:\n\n" +
        "/ban"
      );
    }

    const user =
      ctx.message.reply_to_message.from;

    if (user.is_bot) {
      return ctx.reply(
        "⚠️ Bots ko ban nahi kiya ja sakta."
      );
    }

    try {

      const target =
        await ctx.telegram.getChatMember(
          ctx.chat.id,
          user.id
        );

      if (
        target.status === "creator" ||
        target.status === "administrator"
      ) {
        return ctx.reply(
          "⚠️ Group administrators ko ban nahi kiya ja sakta."
        );
      }

      await ctx.telegram.banChatMember(
        ctx.chat.id,
        user.id
      );

      await ctx.reply(
        "🚫 *User Banned Successfully*\n\n" +
        `👤 User: ${user.first_name || "User"}\n` +
        `🆔 ID: \`${user.id}\`\n\n` +
        "⛔ User is permanently banned.\n\n" +
        "🛡️ GroupDefenders",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "🔓 Unban User",
                `unban_user:${user.id}`
              )
            ]
          ])
        }
      );

    } catch (error) {

      console.error(
        "Ban error:",
        error.message
      );

      await ctx.reply(
        "❌ User ko ban nahi kar saka.\n\n" +
        "Check karo bot ke paas *Ban Users* permission hai.",
        {
          parse_mode: "Markdown"
        }
      );
    }
  });


  /* =======================================
     UNBAN USER
  ======================================= */

  bot.command("unban", async (ctx) => {

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Admin only.");
    }

    const parts =
      ctx.message.text
        .trim()
        .split(/\s+/);

    let userId = parts[1];

    if (
      !userId &&
      ctx.message.reply_to_message?.from?.id
    ) {
      userId =
        String(
          ctx.message.reply_to_message.from.id
        );
    }

    if (
      !userId ||
      !/^-?\d+$/.test(userId)
    ) {
      return ctx.reply(
        "🆔 User ID do:\n\n" +
        "/unban USER_ID\n\n" +
        "Example:\n" +
        "/unban 123456789"
      );
    }

    try {

      await ctx.telegram.unbanChatMember(
        ctx.chat.id,
        Number(userId),
        {
          only_if_banned: true
        }
      );

      await ctx.reply(
        "🔓 *User Unbanned Successfully*\n\n" +
        `🆔 ID: \`${userId}\`\n\n` +
        "✅ User can join the group again.\n\n" +
        "🛡️ GroupDefenders",
        {
          parse_mode: "Markdown"
        }
      );

    } catch (error) {

      console.error(
        "Unban error:",
        error.message
      );

      await ctx.reply(
        "❌ User ko unban nahi kar saka.\n\n" +
        "User ID check karo aur bot ke paas *Ban Users* permission hai ya nahi.",
        {
          parse_mode: "Markdown"
        }
      );
    }
  });
 
  /* =======================================
     INLINE: UNBAN USER
  ======================================= */

  bot.action(
    /^unban_user:(-?\d+)$/,
    async (ctx) => {

      await ctx.answerCbQuery();

      if (!(await isAdmin(ctx))) {
        return ctx.reply(
          "❌ Admin only."
        );
      }

      const userId =
        Number(ctx.match[1]);

      try {

        await ctx.telegram.unbanChatMember(
          ctx.chat.id,
          userId,
          {
            only_if_banned: true
          }
        );

        await ctx.editMessageText(
          "🔓 *User Unbanned Successfully*\n\n" +
          `🆔 ID: \`${userId}\`\n\n` +
          "✅ User can join the group again.\n\n" +
          "🛡️ GroupDefenders",
          {
            parse_mode: "Markdown"
          }
        );

      } catch (error) {

        console.error(
          "Inline unban error:",
          error.message
        );

        await ctx.reply(
          "❌ User ko unban nahi kar saka.\n\n" +
          "Check karo bot ke paas *Ban Users* permission hai.",
          {
            parse_mode: "Markdown"
          }
        );
      }
    }
  );

  /* =======================================
     FILTER COMMAND
  ======================================= */
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
     TOGGLE ANTI SPAM
  ======================================= */

  bot.action(
    "toggle_antispam",
    async (ctx) => {

      await ctx.answerCbQuery();

      if (!(await isAdmin(ctx))) {
        return ctx.reply(
          "❌ Admin only."
        );
      }

      const group =
        await getGroup(ctx);

      group.antiSpam =
        !group.antiSpam;

      await group.save();

      await ctx.editMessageText(
        "🛡️ *Moderation Controls*\n\n" +
        "Neeche se option select karo:",
        {
          parse_mode: "Markdown",
          ...moderationMenu(group)
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
