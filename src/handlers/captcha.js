const { Markup } = require("telegraf");
const Verification = require("../models/Verification");

const VERIFY_TIME = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

/*
  Simple emoji/image-style CAPTCHA.

  Later you can replace these with
  actual photo files if required.
*/

const CAPTCHA = [
  {
    question: "🚗 Select the CAR",
    options: ["🚗", "🍎", "🐶", "🌳"],
    answer: 0
  },
  {
    question: "🐶 Select the DOG",
    options: ["🍕", "🌳", "🐶", "🚲"],
    answer: 2
  },
  {
    question: "🍎 Select the APPLE",
    options: ["🚗", "🍎", "🐱", "⚽"],
    answer: 1
  },
  {
    question: "🌳 Select the TREE",
    options: ["🐶", "🚲", "🌳", "🍔"],
    answer: 2
  }
];

/* =========================================
   RESTRICT USER
========================================= */

async function restrictUser(ctx, userId) {
  await ctx.telegram.restrictChatMember(
    ctx.chat.id,
    userId,
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
        can_add_web_page_previews: false
      }
    }
  );
}

/* =========================================
   UNRESTRICT USER
========================================= */

async function unrestrictUser(ctx, userId) {
  await ctx.telegram.restrictChatMember(
    ctx.chat.id,
    userId,
    {
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
      }
    }
  );
}

/* =========================================
   CREATE CAPTCHA
========================================= */

async function createCaptcha(ctx, userId) {
  const captcha =
    CAPTCHA[
      Math.floor(
        Math.random() * CAPTCHA.length
      )
    ];

  const expiresAt =
    new Date(Date.now() + VERIFY_TIME);

  await Verification.findOneAndUpdate(
    {
      chatId: String(ctx.chat.id),
      userId: String(userId)
    },
    {
      answer: captcha.answer,
      attempts: 0,
      expiresAt
    },
    {
      upsert: true,
      new: true
    }
  );

  const buttons =
    captcha.options.map(
      (option, index) => [
        Markup.button.callback(
          option,
          `captcha:${userId}:${index}`
        )
      ]
    );

  const message =
    await ctx.reply(
      `🛡️ *Human Verification*\n\n` +
      `Welcome ${ctx.from?.first_name || "User"}!\n\n` +
      `${captcha.question}\n\n` +
      `⏱️ Time: 5 minutes\n` +
      `❌ Maximum attempts: 3`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons)
      }
    );

  setTimeout(async () => {
    try {
      const verification =
        await Verification.findOne({
          chatId: String(ctx.chat.id),
          userId: String(userId)
        });

      if (!verification) return;

      if (
        verification.expiresAt.getTime() <=
        Date.now()
      ) {
        await Verification.deleteOne({
          _id: verification._id
        });

        try {
          await ctx.telegram.banChatMember(
            ctx.chat.id,
            userId
          );

          await ctx.telegram.unbanChatMember(
            ctx.chat.id,
            userId,
            {
              only_if_banned: true
            }
          );
        } catch {}

        try {
          await ctx.telegram.deleteMessage(
            ctx.chat.id,
            message.message_id
          );
        } catch {}
      }
    } catch (error) {
      console.error(
        "CAPTCHA timeout error:",
        error.message
      );
    }
  }, VERIFY_TIME + 2000);
}

/* =========================================
   NEW MEMBER HANDLER
========================================= */

function setupCaptcha(bot) {

  bot.on(
    "message",
    async (ctx) => {

      try {

        if (
          !ctx.chat ||
          !["group", "supergroup"].includes(
            ctx.chat.type
          )
        ) {
          return;
        }

        const members =
          ctx.message.new_chat_members || [];

        for (const user of members) {

          if (user.is_bot) continue;

          // Don't verify admins
          try {
            const member =
              await ctx.telegram.getChatMember(
                ctx.chat.id,
                user.id
              );

            if (
              member.status === "creator" ||
              member.status === "administrator"
            ) {
              continue;
            }
          } catch {}

          await restrictUser(
            ctx,
            user.id
          );

          /*
            createCaptcha uses ctx.from for
            display only, so temporarily use
            the joining user's name.
          */

          const fakeCtx = {
            ...ctx,
            from: user
          };

          await createCaptcha(
            fakeCtx,
            user.id
          );
        }

      } catch (error) {

        console.error(
          "New member CAPTCHA error:",
          error.message
        );
      }
    }
  );

  /* =======================================
     CAPTCHA BUTTON
  ======================================= */

  bot.action(
    /^captcha:(\d+):(\d+)$/,
    async (ctx) => {

      try {

        const userId =
          Number(ctx.match[1]);

        const selected =
          Number(ctx.match[2]);

        if (
          ctx.from.id !== userId
        ) {
          return ctx.answerCbQuery(
            "❌ This CAPTCHA is not for you.",
            {
              show_alert: true
            }
          );
        }

        const verification =
          await Verification.findOne({
            chatId: String(ctx.chat.id),
            userId: String(userId)
          });

        if (!verification) {
          return ctx.answerCbQuery(
            "⏱️ CAPTCHA expired.",
            {
              show_alert: true
            }
          );
        }

        if (
          verification.expiresAt.getTime() <
          Date.now()
        ) {
          await Verification.deleteOne({
            _id: verification._id
          });

          return ctx.answerCbQuery(
            "⏱️ CAPTCHA expired.",
            {
              show_alert: true
            }
          );
        }

        /* CORRECT */

        if (
          selected === verification.answer
        ) {

          await unrestrictUser(
            ctx,
            userId
          );

          await Verification.deleteOne({
            _id: verification._id
          });

          await ctx.answerCbQuery(
            "✅ Verification successful!"
          );

          try {
            await ctx.editMessageText(
              "✅ *Verification Successful!*\n\n" +
              "🔓 You can now send messages in the group.\n\n" +
              "🛡️ GroupDefenders",
              {
                parse_mode: "Markdown"
              }
            );
          } catch {}

          return;
        }

        /* WRONG ANSWER */

        verification.attempts += 1;

        if (
          verification.attempts >=
          MAX_ATTEMPTS
        ) {

          await Verification.deleteOne({
            _id: verification._id
          });

          try {
            await ctx.telegram.banChatMember(
              ctx.chat.id,
              userId
            );

            await ctx.telegram.unbanChatMember(
              ctx.chat.id,
              userId,
              {
                only_if_banned: true
              }
            );
          } catch {}

          await ctx.answerCbQuery(
            "❌ Too many wrong attempts.",
            {
              show_alert: true
            }
          );

          try {
            await ctx.editMessageText(
              "❌ *Verification Failed*\n\n" +
              "You used too many attempts.\n" +
              "You have been removed from the group.",
              {
                parse_mode: "Markdown"
              }
            );
          } catch {}

          return;
        }

        await verification.save();

        await ctx.answerCbQuery(
          `❌ Wrong answer. Attempts left: ${
            MAX_ATTEMPTS -
            verification.attempts
          }`,
          {
            show_alert: true
          }
        );

      } catch (error) {

        console.error(
          "CAPTCHA action error:",
          error.message
        );

        try {
          await ctx.answerCbQuery(
            "❌ Verification error."
          );
        } catch {}
      }
    }
  );
}

module.exports = {
  setupCaptcha
};
