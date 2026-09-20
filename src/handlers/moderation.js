const Group = require("../models/Group");
const Warning = require("../models/Warning");
const { containsProfanity } = require("../filters/profanity");

const URL_RE = /(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|tg:\/\/)/i;

async function isAdmin(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

async function addWarning(ctx, reason) {
  const user = ctx.from;
  const chatId = String(ctx.chat.id);
  const userId = String(user.id);
  const group = await Group.findOneAndUpdate(
    { chatId },
    { $setOnInsert: { title: ctx.chat.title || "" } },
    { upsert: true, new: true }
  );

  const w = await Warning.findOneAndUpdate(
    { chatId, userId },
    {
      $inc: { count: 1 },
      $set: { username: user.username || user.first_name || "" }
    },
    { upsert: true, new: true }
  );

  try { await ctx.deleteMessage(); } catch {}

  if (w.count >= group.maxWarnings) {
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
          until_date: Math.floor(Date.now() / 1000) + group.muteMinutes * 60
        }
      );
      await ctx.reply(
        `🔇 ${user.first_name || "User"} muted for ${group.muteMinutes} minutes.\\n` +
        `Reason: ${reason}\\nWarnings: ${w.count}/${group.maxWarnings}`
      );
      await Warning.updateOne({ chatId, userId }, { $set: { count: 0 } });
    } catch {
      await ctx.reply(
        `⚠️ ${user.first_name || "User"} reached ${group.maxWarnings} warnings, ` +
        `but I could not mute them. Check my admin permissions.`
      );
    }
  } else {
    await ctx.reply(
      `⚠️ Warning ${w.count}/${group.maxWarnings}\\n` +
      `User: ${user.first_name || "User"}\\nReason: ${reason}`
    );
  }
}

function setupModeration(bot) {
  bot.on("message", async ctx => {
    if (!ctx.chat || !["group", "supergroup"].includes(ctx.chat.type)) return;
    if (!ctx.from || ctx.from.is_bot) return;
    if (!ctx.message.text && !ctx.message.caption) return;

    if (await isAdmin(ctx, ctx.from.id)) return;

    const group = await Group.findOneAndUpdate(
      { chatId: String(ctx.chat.id) },
      { $setOnInsert: { title: ctx.chat.title || "" } },
      { upsert: true, new: true }
    );

    const text = ctx.message.text || ctx.message.caption || "";

    if (group.antiLink && URL_RE.test(text)) {
      return addWarning(ctx, "🔗 Link not allowed");
    }

    if (group.antiProfanity) {
      const found = containsProfanity(text, group.customWords);
      if (found) return addWarning(ctx, "🤬 Abusive language");
    }
  });
}

module.exports = { setupModeration };
