const Group = require("../models/Group");

/*
|--------------------------------------------------------------------------
| GroupDefenders - Anti Spam / Flood Protection
|--------------------------------------------------------------------------
|
| Default:
| 5 messages within 8 seconds = spam
| Spam messages are deleted
| User is temporarily muted for 5 minutes
|
*/

const messageTracker = new Map();

const MAX_MESSAGES = 5;
const TIME_WINDOW = 8 * 1000;
const MUTE_MINUTES = 5;

/* =========================================
   CHECK ADMIN
========================================= */

async function isAdmin(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(
      ctx.chat.id,
      userId
    );

    return [
      "creator",
      "administrator"
    ].includes(member.status);

  } catch {
    return false;
  }
}

/* =========================================
   GET GROUP SETTINGS
========================================= */

async function getGroup(ctx) {
  return Group.findOneAndUpdate(
    {
      chatId: String(ctx.chat.id)
    },
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

/* =========================================
   MUTE USER
========================================= */

async function muteUser(ctx, user) {

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
          Math.floor(Date.now() / 1000) +
          MUTE_MINUTES * 60
      }
    );

    return true;

  } catch (error) {

    console.error(
      "Anti-spam mute error:",
      error.message
    );

    return false;
  }
}

/* =========================================
   ANTI SPAM
========================================= */

function setupAntiSpam(bot) {

  bot.on("message", async (ctx) => {

    try {

      /* Only groups */

      if (
        !ctx.chat ||
        ![
          "group",
          "supergroup"
        ].includes(ctx.chat.type)
      ) {
        return;
      }

      /* Ignore bots */

      if (
        !ctx.from ||
        ctx.from.is_bot
      ) {
        return;
      }

      /* Ignore admins */

      if (
        await isAdmin(
          ctx,
          ctx.from.id
        )
      ) {
        return;
      }

      /* Get group */

      const group =
        await getGroup(ctx);

      /*
       * Enable/disable support.
       *
       * If your Group model doesn't have
       * antiSpam yet, it will still work.
       */

      if (
        group.antiSpam === false
      ) {
        return;
      }

      const chatId =
        String(ctx.chat.id);

      const userId =
        String(ctx.from.id);

      const key =
        `${chatId}:${userId}`;

      const now =
        Date.now();

      let timestamps =
        messageTracker.get(key) || [];

      /*
       * Remove old timestamps
       */

      timestamps =
        timestamps.filter(
          time =>
            now - time < TIME_WINDOW
        );

      timestamps.push(now);

      messageTracker.set(
        key,
        timestamps
      );

      /*
       * Flood detected
       */

      if (
        timestamps.length >=
        MAX_MESSAGES
      ) {

        /*
         * Reset tracker so the same user
         * doesn't trigger repeatedly.
         */

        messageTracker.delete(key);

        /*
         * Delete current spam message
         */

        try {
          await ctx.deleteMessage();
        } catch {}

        /*
         * Mute user
         */

        const muted =
          await muteUser(
            ctx,
            ctx.from
          );

        const name =
          ctx.from.first_name ||
          ctx.from.username ||
          "User";

        if (muted) {

          await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━╮
      🚨  SPAM DETECTED
╰━━━━━━━━━━━━━━━━━━╯

👤 User: ${name}

📨 Too many messages
⏱️ Within ${TIME_WINDOW / 1000} seconds

🔇 Action: User muted
⏳ Duration: ${MUTE_MINUTES} minutes

🛡️ GroupDefenders`
          );

        } else {

          await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━╮
      🚨  SPAM DETECTED
╰━━━━━━━━━━━━━━━━━━╯

👤 User: ${name}

📨 Too many messages
⏱️ Within ${TIME_WINDOW / 1000} seconds

🗑️ Spam message deleted

⚠️ I could not mute the user.
Please check my admin permissions.

🛡️ GroupDefenders`
          );
        }
      }

    } catch (error) {

      console.error(
        "Anti-spam error:",
        error.message
      );
    }
  });
}

module.exports = {
  setupAntiSpam
};
