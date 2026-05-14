const TelegramBot = require("node-telegram-bot-api");

  const TOKEN = process.env.BOT_TOKEN;

  if (!TOKEN) {
    console.error("BOT_TOKEN environment variable is required");
    process.exit(1);
  }

  const bot = new TelegramBot(TOKEN, { polling: true });

  console.log("Bot started...");

  const mainKeyboard = {
    reply_markup: {
      keyboard: [
        [
          {
            text: "منو اصلی",
            style: "primary",
            icon_custom_emoji_id: "5416081784641168838"
          }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || "کاربر";
    bot.sendMessage(
      chatId,
      `سلام ${firstName}! 👋\nخوش اومدی.`,
      mainKeyboard
    );
  });

  bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    if (msg.text && !msg.text.startsWith("/")) {
      bot.sendMessage(chatId, `دریافت شد: ${msg.text}`, mainKeyboard);
    }
  });

  bot.on("polling_error", (err) => {
    console.error("Polling error:", err.message);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down...");
    bot.stopPolling();
    process.exit(0);
  });