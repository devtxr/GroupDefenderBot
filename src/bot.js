require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");
const { connectDB } = require("./database");
const { setupCommands } = require("./handlers/commands");
const { setupModeration } = require("./handlers/moderation");

const token = process.env.BOT_TOKEN;
const port = Number(process.env.PORT || 10000);
const webhookUrl = process.env.WEBHOOK_URL;

if (!token) throw new Error("BOT_TOKEN is missing");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
if (!webhookUrl) throw new Error("WEBHOOK_URL is missing");

async function main() {
  await connectDB(process.env.MONGODB_URI);

  const bot = new Telegraf(token);
  setupCommands(bot);
  setupModeration(bot);

  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "telegram-moderator-bot" });
  });

  app.post("/telegram/webhook", async (req, res) => {
    try {
      await bot.handleUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      console.error("Webhook error:", err);
      res.sendStatus(500);
    }
  });

  app.listen(port, async () => {
    console.log(`HTTP server listening on ${port}`);
    await bot.telegram.setWebhook(`${webhookUrl.replace(/\/$/, "")}/telegram/webhook`);
    console.log("Telegram webhook configured");
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
