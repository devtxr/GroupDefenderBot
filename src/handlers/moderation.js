const Group = require("../models/Group");
const Warning = require("../models/Warning");
const { containsProfanity } = require("../filters/profanity");

const URL_RE =
  /(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|tg:\/\/)/i;

/* =========================================
   CHECK ADMIN
========================================= */

async function isAdmin(ctx, userId) {
  try {
    if (!ctx.chat) {
      return false;
    }

    if (
      !["group", "supergroup"].includes(
        ctx.chat.type
      )
    ) {
      return false;
    }

    /*
     * Anonymous Administrator
     *
     * Telegram anonymous admin messages use
     * sender_chat = current group.
     */

    if (
      ctx.message?.sender_chat &&
      String(ctx.message.sender_chat.id) ===
        String(ctx.chat.id)
    ) {
      return true;
    }

    if (!userId) {
      return false;
    }

    const member =
      await ctx.telegram.getChatMember(
        ctx.chat.id,
        userId
      );

    return [
      "creator",
      "administrator"
    ].includes(member.status);

  } catch (error) {

    console.error(
      "Admin check error:",
      error.message
    );

    return false;
  }
}

/* =========================================
   GET / CREATE GROUP
========================================= */

async function getGroup(ctx) {

  return Group.findOneAndUpdate(
    {
      chatId:
        String(ctx.chat.id)
    },

    {
      $setOnInsert: {
        title:
          ctx.chat.title || "",

        antiLink: true,

        antiProfanity: true,

        antiSpam: true,

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
   WARNING MESSAGE
========================================= */

async function sendWarning(
  ctx,
  user,
  count,
  maxWarnings,
  reason
) {

  const name =
    user.first_name ||
    user.username ||
    "User";

  const username =
    user.username
      ? `@${user.username}`
      : name;

  const isLink =
    reason
      .toLowerCase()
      .includes("link");

  const reasonText =
    isLink
      ? "🔗 Link Not Allowed"
      : "🤬 Abusive Language";

  const remaining =
    Math.max(
      maxWarnings - count,
      0
    );

  const message =
`╭━━━━━━━━━━━━━━━━━━╮
       ⚠️  USER WARNING
╰━━━━━━━━━━━━━━━━━━╯

👤 User: ${username}

🔢 Warning: ${count}/${maxWarnings}

🚫 Reason: ${reasonText}

📌 Please follow the group rules.

⚠️ Remaining warnings: ${remaining}

🛡️ GroupDefenders`;

  try {

    await ctx.reply(
      message
    );

  } catch (error) {

    console.error(
      "Warning message error:",
      error.message
    );
  }
}

/* =========================================
   ADD WARNING
========================================= */

async function addWarning(
  ctx,
  reason
) {

  const user =
    ctx.from;

  if (!user) {
    return;
  }

  const chatId =
    String(ctx.chat.id);

  const userId =
    String(user.id);

  /* =======================================
     GET GROUP
  ======================================= */

  const group =
    await getGroup(ctx);

  /* =======================================
     ADD WARNING
  ======================================= */

  const warning =
    await Warning.findOneAndUpdate(
      {
        chatId,
        userId
      },

      {
        $inc: {
          count: 1
        },

        $set: {
          username:
            user.username ||
            user.first_name ||
            ""
        }
      },

      {
        upsert: true,
        new: true
      }
    );

  /* =======================================
     DELETE VIOLATION MESSAGE
  ======================================= */

  try {

    await ctx.deleteMessage();

  } catch (error) {

    console.error(
      "Message delete failed:",
      error.message
    );
  }

  /* =======================================
     MAX WARNING REACHED
  ======================================= */

  if (
    warning.count >=
    group.maxWarnings
  ) {

    try {

      await ctx.telegram.restrictChatMember(
        ctx.chat.id,
        user.id,
        {
          permissions: {
            can_send_messages: false,
            can_send_audios: false,
            can_send_documents: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_video_notes: false,
            can_send_voice_notes: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            can_change_info: false,
            can_invite_users: true,
            can_pin_messages: false
          },

          until_date:
            Math.floor(
              Date.now() / 1000
            ) +
            group.muteMinutes * 60
        }
      );

      const name =
        user.first_name ||
        user.username ||
        "User";

      const isLink =
        reason
          .toLowerCase()
          .includes("link");

      const reasonText =
        isLink
          ? "🔗 Link Not Allowed"
          : "🤬 Abusive Language";

      const muteMessage =
`╭━━━━━━━━━━━━━━━━━━╮
       🔇  USER MUTED
╰━━━━━━━━━━━━━━━━━━╯

👤 User: ${name}

⚠️ Warning limit reached:
${warning.count}/${group.maxWarnings}

🚫 Reason: ${reasonText}

🔇 Mute Duration:
${group.muteMinutes} minutes

🛡️ GroupDefenders`;

      await ctx.reply(
        muteMessage
      );

      /* ===================================
         RESET WARNINGS
      =================================== */

      await Warning.updateOne(
        {
          chatId,
          userId
        },

        {
          $set: {
            count: 0
          }
        }
      );

    } catch (error) {

      console.error(
        "Mute error:",
        error.message
      );

      const name =
        user.first_name ||
        user.username ||
        "User";

      await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━╮
       ⚠️  WARNING LIMIT
╰━━━━━━━━━━━━━━━━━━╯

👤 User: ${name}

🔢 Warnings:
${warning.count}/${group.maxWarnings}

❌ I could not mute this user.

👮 Please check my administrator permissions.

🛡️ GroupDefenders`
      );
    }

    return;
  }

  /* =======================================
     NORMAL WARNING
  ======================================= */

  await sendWarning(
    ctx,
    user,
    warning.count,
    group.maxWarnings,
    reason
  );
}

/* =========================================
   MODERATION HANDLER
========================================= */

function setupModeration(bot) {

  bot.on(
    "message",
    async (ctx, next) => {

      try {

        /* =================================
           ONLY GROUPS
        ================================= */

        if (
          !ctx.chat ||
          ![
            "group",
            "supergroup"
          ].includes(
            ctx.chat.type
          )
        ) {
          return next();
        }

        /* =================================
           IGNORE BOTS
        ================================= */

        if (
          !ctx.from ||
          ctx.from.is_bot
        ) {
          return next();
        }

        /* =================================
           IGNORE ADMINS
        ================================= */

        if (
          await isAdmin(
            ctx,
            ctx.from.id
          )
        ) {
          return next();
        }

        /* =================================
           TEXT / CAPTION
        ================================= */

        const text =
          ctx.message.text ||
          ctx.message.caption ||
          "";

        /*
         * If message has no text/caption,
         * continue to Anti-Spam.
         */

        if (!text) {
          return next();
        }

        /* =================================
           GET GROUP SETTINGS
        ================================= */

        const group =
          await getGroup(ctx);

        /* =================================
           ANTI LINK
        ================================= */

        if (
          group.antiLink &&
          URL_RE.test(text)
        ) {

          return addWarning(
            ctx,
            "🔗 Link not allowed"
          );
        }

        /* =================================
           ANTI PROFANITY
        ================================= */

        if (
          group.antiProfanity
        ) {

          const found =
            containsProfanity(
              text,
              group.customWords || []
            );

          if (found) {

            return addWarning(
              ctx,
              "🤬 Abusive language"
            );
          }
        }

        /* =================================
           PASS TO NEXT HANDLER
        ================================= */

        return next();

      } catch (error) {

        console.error(
          "Moderation error:",
          error.message
        );

        /*
         * Even if moderation has an error,
         * don't block Anti-Spam.
         */

        try {
          return next();
        } catch {}
      }
    }
  );
}

/* =========================================
   EXPORT
========================================= */

module.exports = {
  setupModeration
};
