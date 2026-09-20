# Telegram Moderator Bot

Multi-group Telegram moderation bot for Render.

## Features

- Anti-link
- Hindi/Hinglish/English profanity filtering
- Warnings
- Automatic message deletion
- Automatic temporary mute after max warnings
- Per-group settings
- Custom word filters
- MongoDB persistence
- Render webhook deployment

## 1. Telegram setup

Create a bot with @BotFather and copy the bot token.

Add the bot to your group and promote it to Administrator.

Recommended permissions:
- Delete messages
- Restrict members
- Read messages

## 2. MongoDB

Create a MongoDB Atlas database and copy the connection string.

Example:

MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/telegram_moderator

## 3. Render

Create a Web Service from this repository.

Build Command:

npm install

Start Command:

npm start

Environment variables:

BOT_TOKEN=your token
MONGODB_URI=your MongoDB URI
WEBHOOK_URL=https://your-app.onrender.com
PORT=10000

After deployment, open the Render URL. You should see:

{"ok":true,"service":"telegram-moderator-bot"}

## Commands

/help
/settings
/antilink on
/antilink off
/antigaali on
/antigaali off
/warnings
/resetwarn
/filter add WORD
/filter remove WORD
/filter list

Admin commands only work for Telegram group administrators.

## Important

The profanity list in src/filters/profanity.js is intentionally configurable. Add terms appropriate to your group's rules and language.

The bot must have sufficient Telegram administrator permissions to delete messages and restrict users.
