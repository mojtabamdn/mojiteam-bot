const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const ADMIN_IDS = [6622580245];
const DB_PATH = process.env.DB_PATH || "./bot.db.json";

const FORCE_CHANNELS_DEFAULT = [
  { username: "lnterFreedom", title: "InterFreedom", url: "https://t.me/lnterFreedom" }
];

const E = {
  download:     "5206607081334906820",
  invite:       "5422439311196834318",
  profile:      "5213383002129702114",
  rules:        "5461117441612462242",
  support:      "5264713049637409446",
  guide:        "5785033300867288899",
  stats:        "5395444784611480792",
  status:       "5231200819986047254",
  lastUsers:    "5400250414929041085",
  topInvites:   "5427009714745517609",
  topService:   "5436113877181941026",
  richest:      "5190806721286657692",
  msgUser:      "5334544901428229844",
  broadcast:    "5413704112220949842",
  search:       "5375296873982604963",
  userInfo:     "5436040291507247633",
  unblock:      "5440660757194744323",
  block:        "5447644880824181073",
  setCoin:      "5472027899789843495",
  addCoin:      "5271604874419647061",
  resetCoin:    "5472308992514464048",
  manualSvc:    "5246989476248429334",
  welcome:      "5240241223632954241",
  deleteUser:   "5453957997418004470",
  channels:     "5424818078833715060",
  coinSettings: "5472363448404809929",
  allUsers:     "5231200819986047254",
  monthlyStats: "5391112412445288650",
  manageConfig: "5994495364084796671",
  report:       "6032751234790726550",
  maintenance:  "5255883984151276991",
  fire:         "5785193735075663481",
  bell:         "5785219784052314091",
  alarm:        "5924664865208671041",
  star:         "6037618875846102911",
  back:         "6300757202651055745",
  coin:         "5190806721286657692",
  clan:         "5436113877181941026",
  calendar:     "5391112412445288650",
  check:        "5440660757194744323",
  gem:          "4981404027402061416",
};

const em = (id, fb = "•") => `<tg-emoji emoji-id="${id}">${fb}</tg-emoji>`;

// ===== JSON DATABASE =====
class JsonDB {
  constructor(path) {
    this.path = path;
    this._saveTimer = null;
    this.load();
  }

  load() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.path, "utf8"));
    } catch {
      this.data = {
        users: {},
        settings: {
          welcome_text: "به ربات کانفیگ رایگان خوش آمدید",
          subscription_cost: "2",
          referral_points: "1",
          maintenance_mode: "0",
          force_channels: JSON.stringify(FORCE_CHANNELS_DEFAULT),
        },
        configs: [],
        transactions: [],
        _nextConfigId: 1,
      };
      this.save();
    }
  }

  save() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch (e) { console.error("DB save error:", e.message); }
    }, 200);
  }

  saveSync() {
    try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch (e) { console.error("DB save error:", e.message); }
  }

  getSetting(key) { return this.data.settings[key] ?? ""; }
  setSetting(key, value) { this.data.settings[key] = String(value); this.save(); }

  getUser(userId) { return this.data.users[String(userId)] || null; }

  createUser(userId, username, firstName, lastName, referredBy = null) {
    const id = String(userId);
    if (this.data.users[id]) return false;
    this.data.users[id] = {
      user_id: userId, username: username || null,
      first_name: firstName || null, last_name: lastName || null,
      points: 0, referral_count: 0, referred_by: referredBy,
      join_date: now(), is_blocked: 0, services_received: 0,
    };
    this.save();
    return true;
  }

  updateUser(userId, updates) {
    const u = this.getUser(userId);
    if (u) { Object.assign(u, updates); this.save(); }
  }

  updatePoints(userId, amount, type, description) {
    const u = this.getUser(userId);
    if (u) {
      u.points += amount;
      this.data.transactions.push({ id: Date.now(), user_id: userId, amount, type, description, created_at: now() });
      this.save();
    }
  }

  getAllUsers() { return Object.values(this.data.users); }

  getAvailableConfig() { return this.data.configs.find(c => !c.used_by) || null; }

  addConfig(text, addedBy) {
    const cfg = { id: this.data._nextConfigId++, config_text: text, added_by: addedBy, used_by: null, used_at: null, created_at: now() };
    this.data.configs.push(cfg);
    this.save();
    return cfg;
  }

  markConfigUsed(id, userId) {
    const cfg = this.data.configs.find(c => c.id === id);
    if (cfg) { cfg.used_by = userId; cfg.used_at = now(); this.save(); }
  }

  deleteUser(userId) {
    delete this.data.users[String(userId)];
    this.save();
  }

  findUserByUsername(username) {
    return Object.values(this.data.users).find(u => u.username === username) || null;
  }
}

function now() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

if (!TOKEN) { console.error("BOT_TOKEN is required"); process.exit(1); }

const db = new JsonDB(DB_PATH);
const isAdmin = (id) => ADMIN_IDS.includes(id);

// ===== BOT =====
const bot = new TelegramBot(TOKEN, { polling: true });
let botUsername = "";
bot.getMe().then(me => { botUsername = me.username; console.log("Bot:", botUsername); });

const userStates = new Map();
const setState = (uid, state, data = {}) => userStates.set(uid, { state, data });
const getState = (uid) => userStates.get(uid) || { state: "IDLE", data: {} };
const clearState = (uid) => userStates.delete(uid);

// ===== KEYBOARDS =====
const mainKb = () => ({
  keyboard: [
    [{ text: "دریافت اشتراک", style: "primary", icon_custom_emoji_id: E.download }],
    [
      { text: "دعوت دوستان", style: "primary", icon_custom_emoji_id: E.invite },
      { text: "پروفایل", icon_custom_emoji_id: E.profile }
    ],
    [
      { text: "قوانین", icon_custom_emoji_id: E.rules },
      { text: "پشتیبانی", icon_custom_emoji_id: E.support }
    ],
    [{ text: "راهنما", icon_custom_emoji_id: E.guide }]
  ],
  resize_keyboard: true
});

const adminKb = () => ({
  keyboard: [
    [{ text: "آمار کامل", icon_custom_emoji_id: E.stats }, { text: "وضعیت ربات", icon_custom_emoji_id: E.status }],
    [{ text: "آخرین کاربران", icon_custom_emoji_id: E.lastUsers }, { text: "برترین دعوت‌ها", icon_custom_emoji_id: E.topInvites }],
    [{ text: "ثروتمندترین‌ها", icon_custom_emoji_id: E.richest }, { text: "بیشترین سرویس", icon_custom_emoji_id: E.topService }],
    [{ text: "پیام همگانی", icon_custom_emoji_id: E.broadcast }, { text: "پیام به کاربر", icon_custom_emoji_id: E.msgUser }],
    [{ text: "جستجوی کاربر", icon_custom_emoji_id: E.search }, { text: "اطلاعات کاربر", icon_custom_emoji_id: E.userInfo }],
    [{ text: "رفع مسدودی", icon_custom_emoji_id: E.unblock }, { text: "مسدود کردن", icon_custom_emoji_id: E.block }],
    [{ text: "افزودن سکه", icon_custom_emoji_id: E.addCoin }, { text: "تنظیم سکه", icon_custom_emoji_id: E.setCoin }],
    [{ text: "ری‌ست سکه", icon_custom_emoji_id: E.resetCoin }, { text: "سرویس دستی", icon_custom_emoji_id: E.manualSvc }],
    [{ text: "متن خوش‌آمد", icon_custom_emoji_id: E.welcome }, { text: "حذف کاربر", icon_custom_emoji_id: E.deleteUser }],
    [{ text: "کانال‌های اجباری", icon_custom_emoji_id: E.channels }, { text: "تنظیمات سکه‌ها", icon_custom_emoji_id: E.coinSettings }],
    [{ text: "همه کاربران", icon_custom_emoji_id: E.allUsers }, { text: "آمار ماهانه", icon_custom_emoji_id: E.monthlyStats }],
    [{ text: "مدیریت کانفیگ", icon_custom_emoji_id: E.manageConfig }, { text: "گزارش کامل", icon_custom_emoji_id: E.report }],
    [{ text: "حالت تعمیر", icon_custom_emoji_id: E.maintenance }],
    [{ text: "بازگشت به منوی اصلی", icon_custom_emoji_id: E.back }]
  ],
  resize_keyboard: true
});

// ===== FORCE JOIN =====
const checkForceJoin = async (userId) => {
  const channels = JSON.parse(db.getSetting("force_channels") || JSON.stringify(FORCE_CHANNELS_DEFAULT));
  const notJoined = [];
  for (const ch of channels) {
    try {
      const m = await bot.getChatMember("@" + ch.username, userId);
      if (["left", "kicked"].includes(m.status)) notJoined.push(ch);
    } catch { notJoined.push(ch); }
  }
  return notJoined;
};

const sendForceJoin = async (chatId, channels) => {
  const btns = channels.map(ch => ([{ text: ch.title, url: ch.url }]));
  btns.push([{ text: "تایید عضویت", callback_data: "check_join" }]);
  await bot.sendMessage(chatId,
    `${em(E.channels, "📌")} <b>برای استفاده از ربات ابتدا باید در کانال‌های زیر عضو شوید</b>\n\n☝️ پس از عضویت روی دکمه تایید عضویت کلیک کنید.`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } }
  );
};

const sendWelcome = async (chatId) => {
  const text = db.getSetting("welcome_text");
  await bot.sendMessage(chatId,
    `${em(E.fire, "🔥")} <b>${text}</b>\n\n` +
    `${em(E.bell, "🔔")} با این ربات می‌تونی خیلی راحت:\n\n` +
    `${em(E.check, "✅")} کانفیگ‌های پرسرعت و باکیفیت دریافت کنی\n` +
    `${em(E.check, "✅")} با فعالیت و دعوت دوستان، امتیاز جمع کنی\n` +
    `${em(E.check, "✅")} با امتیازهات کانفیگ رایگان بگیری\n` +
    `${em(E.check, "✅")} همیشه از وضعیت و سلامت سرویس‌ها با خبر باشی\n\n` +
    `${em(E.alarm, "🔻")} یکی از گزینه‌های زیر رو انتخاب کن:\n@${botUsername}`,
    { parse_mode: "HTML", reply_markup: mainKb() }
  );
};

// ===== /start =====
bot.onText(/\/start(.*)/, async (msg, match) => {
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const param = (match[1] || "").trim();

  if (db.getSetting("maintenance_mode") === "1" && !isAdmin(uid)) {
    return bot.sendMessage(chatId, `${em(E.maintenance, "🔧")} <b>ربات در حالت تعمیر است.</b>`, { parse_mode: "HTML" });
  }

  const notJoined = await checkForceJoin(uid);
  if (notJoined.length > 0) return sendForceJoin(chatId, notJoined);

  let refBy = null;
  if (param.startsWith("add_")) {
    const rid = parseInt(param.replace("add_", ""));
    if (!isNaN(rid) && rid !== uid) refBy = rid;
  }

  const isNew = db.createUser(uid, msg.from.username, msg.from.first_name, msg.from.last_name, refBy);

  if (isNew && refBy) {
    const refUser = db.getUser(refBy);
    if (refUser && !refUser.is_blocked) {
      const pts = parseInt(db.getSetting("referral_points") || "1");
      db.updatePoints(refBy, pts, "referral", `دعوت @${msg.from.username || uid}`);
      db.updateUser(refBy, { referral_count: refUser.referral_count + 1 });
      try {
        await bot.sendMessage(refBy,
          `${em(E.star, "🎉")} <b>زیرمجموعه جدید!</b>\n\n` +
          `${em(E.bell, "🟡")} به ربات دعوت شد @${msg.from.username || uid}\n\n` +
          `${em(E.coin, "💰")} موجودی شما:\nقبل: ${refUser.points} امتیاز\nبعد: ${refUser.points + pts} امتیاز (+${pts})\n\n` +
          `${em(E.stats, "📊")} تعداد کل زیرمجموعه‌های شما: ${refUser.referral_count + 1}`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
  } else if (!isNew) {
    db.updateUser(uid, { username: msg.from.username || null, first_name: msg.from.first_name || null });
  }

  const user = db.getUser(uid);
  if (user?.is_blocked) {
    return bot.sendMessage(chatId, `${em(E.block, "🚫")} <b>حساب شما مسدود شده است.</b>`, { parse_mode: "HTML" });
  }

  await sendWelcome(chatId);
});

// ===== /admin =====
bot.onText(/\/admin/, async (msg) => {
  if (!isAdmin(msg.from.id)) return;
  clearState(msg.from.id);
  await bot.sendMessage(msg.chat.id,
    `${em(E.stats, "📊")} <b>پنل مدیریت ادمین</b> ${em(E.check, "✅")}`,
    { parse_mode: "HTML", reply_markup: adminKb() }
  );
});

// ===== CALLBACK QUERY =====
bot.on("callback_query", async (query) => {
  const uid = query.from.id;
  const chatId = query.message.chat.id;

  if (query.data === "check_join") {
    const notJoined = await checkForceJoin(uid);
    if (notJoined.length > 0) return bot.answerCallbackQuery(query.id, { text: "هنوز در همه کانال‌ها عضو نشدی!", show_alert: true });
    await bot.answerCallbackQuery(query.id, { text: "عضویت تایید شد!" });
    try { await bot.deleteMessage(chatId, query.message.message_id); } catch {}
    db.createUser(uid, query.from.username, query.from.first_name, query.from.last_name);
    await sendWelcome(chatId);
  }

  if (query.data === "goto_invite") {
    await bot.answerCallbackQuery(query.id);
    await handleInvite(uid, chatId);
  }
});

// ===== MESSAGE HANDLER =====
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (db.getSetting("maintenance_mode") === "1" && !isAdmin(uid)) {
    return bot.sendMessage(chatId, `${em(E.maintenance, "🔧")} <b>ربات در حالت تعمیر است.</b>`, { parse_mode: "HTML" });
  }

  if (!isAdmin(uid)) {
    const notJoined = await checkForceJoin(uid);
    if (notJoined.length > 0) return sendForceJoin(chatId, notJoined);
    const user = db.getUser(uid);
    if (user?.is_blocked) return bot.sendMessage(chatId, `${em(E.block, "🚫")} <b>حساب شما مسدود شده است.</b>`, { parse_mode: "HTML" });
  }

  const state = getState(uid);
  if (state.state !== "IDLE") return handleState(uid, chatId, msg, state);

  switch (text) {
    case "دریافت اشتراک": return handleSubscription(uid, chatId);
    case "دعوت دوستان": return handleInvite(uid, chatId);
    case "پروفایل": return handleProfile(uid, chatId);
    case "قوانین": return handleRules(chatId);
    case "پشتیبانی": return bot.sendMessage(chatId, "فاقد ورودی!");
    case "راهنما": return handleGuide(chatId);
    case "بازگشت به منوی اصلی": clearState(uid); return bot.sendMessage(chatId, "منوی اصلی", { reply_markup: mainKb() });
  }

  if (!isAdmin(uid)) return;

  switch (text) {
    case "آمار کامل": return adminStats(chatId);
    case "وضعیت ربات": return adminBotStatus(chatId);
    case "آخرین کاربران": return adminLastUsers(chatId);
    case "برترین دعوت‌ها": return adminTopInvites(chatId);
    case "بیشترین سرویس": return adminTopService(chatId);
    case "ثروتمندترین‌ها": return adminRichest(chatId);
    case "پیام همگانی": setState(uid, "WAIT_BROADCAST"); return bot.sendMessage(chatId, `${em(E.broadcast, "📢")} پیام را ارسال کنید:`, { parse_mode: "HTML" });
    case "پیام به کاربر": setState(uid, "WAIT_MSG_UID"); return bot.sendMessage(chatId, `${em(E.msgUser, "📨")} آیدی عددی کاربر:`, { parse_mode: "HTML" });
    case "جستجوی کاربر": setState(uid, "WAIT_SEARCH"); return bot.sendMessage(chatId, `${em(E.search, "🔍")} آیدی یا @یوزرنیم:`, { parse_mode: "HTML" });
    case "اطلاعات کاربر": setState(uid, "WAIT_USER_INFO"); return bot.sendMessage(chatId, `${em(E.userInfo, "👤")} آیدی عددی کاربر:`, { parse_mode: "HTML" });
    case "رفع مسدودی": setState(uid, "WAIT_UNBLOCK"); return bot.sendMessage(chatId, `${em(E.unblock, "✅")} آیدی کاربر:`, { parse_mode: "HTML" });
    case "مسدود کردن": setState(uid, "WAIT_BLOCK"); return bot.sendMessage(chatId, `${em(E.block, "🚫")} آیدی کاربر:`, { parse_mode: "HTML" });
    case "افزودن سکه": setState(uid, "WAIT_ADD_COIN_UID"); return bot.sendMessage(chatId, `${em(E.addCoin, "💰")} آیدی کاربر:`, { parse_mode: "HTML" });
    case "تنظیم سکه": setState(uid, "WAIT_SET_COIN_UID"); return bot.sendMessage(chatId, `${em(E.setCoin, "💲")} آیدی کاربر:`, { parse_mode: "HTML" });
    case "ری‌ست سکه": setState(uid, "WAIT_RESET_COIN"); return bot.sendMessage(chatId, `${em(E.resetCoin, "🔄")} آیدی کاربر:`, { parse_mode: "HTML" });
    case "سرویس دستی": setState(uid, "WAIT_MANUAL_UID"); return bot.sendMessage(chatId, `${em(E.manualSvc, "🎁")} آیدی کاربر:`, { parse_mode: "HTML" });
    case "متن خوش‌آمد": setState(uid, "WAIT_WELCOME"); return bot.sendMessage(chatId, `${em(E.welcome, "📝")} متن فعلی:\n<b>${db.getSetting("welcome_text")}</b>\n\nمتن جدید:`, { parse_mode: "HTML" });
    case "حذف کاربر": setState(uid, "WAIT_DELETE"); return bot.sendMessage(chatId, `${em(E.deleteUser, "🗑")} آیدی کاربر:`, { parse_mode: "HTML" });
    case "کانال‌های اجباری": return adminChannels(uid, chatId);
    case "تنظیمات سکه‌ها": return adminCoinSettings(uid, chatId);
    case "همه کاربران": return adminAllUsers(chatId);
    case "آمار ماهانه": return adminMonthly(chatId);
    case "مدیریت کانفیگ": return adminManageConfig(uid, chatId);
    case "گزارش کامل": return adminFullReport(chatId);
    case "حالت تعمیر": return adminToggleMaintenance(chatId);
  }
});

// ===== USER HANDLERS =====
async function handleSubscription(uid, chatId) {
  const user = db.getUser(uid);
  if (!user) return;
  const cost = parseInt(db.getSetting("subscription_cost") || "2");

  if (user.points < cost) {
    const shortage = cost - user.points;
    return bot.sendMessage(chatId,
      `${em(E.block, "❌")} <b>امتیاز کافی نیست!</b>\n\n` +
      `${em(E.manualSvc, "🎭")} هزینه اشتراک: <b>${cost} امتیاز</b>\n` +
      `${em(E.check, "🏅")} امتیاز فعلی شما: <b>${user.points}</b>\n` +
      `${em(E.resetCoin, "🔄")} امتیاز کمبود: <b>${shortage}</b>\n\n` +
      `${em(E.bell, "💡")} با دعوت دوستان می‌توانید امتیاز کسب کنید!`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "دعوت دوستان", callback_data: "goto_invite" }]] } }
    );
  }

  const config = db.getAvailableConfig();
  if (!config) {
    return bot.sendMessage(chatId,
      `${em(E.block, "❌")} <b>در حال حاضر کانفیگی موجود نیست!</b>\n\n${em(E.bell, "💡")} لطفاً بعداً مراجعه کنید.`,
      { parse_mode: "HTML" }
    );
  }

  db.updatePoints(uid, -cost, "subscription", "دریافت اشتراک");
  db.markConfigUsed(config.id, uid);
  db.updateUser(uid, { services_received: user.services_received + 1 });

  await bot.sendMessage(chatId,
    `${em(E.check, "✅")} <b>اشتراک شما با موفقیت دریافت شد!</b>\n\n` +
    `${em(E.coin, "💰")} امتیاز کسر شده: ${cost}\n` +
    `${em(E.check, "🏅")} امتیاز باقیمانده: ${user.points - cost}\n\n` +
    `${em(E.gem, "💎")} <b>کانفیگ شما:</b>\n<code>${config.config_text}</code>`,
    { parse_mode: "HTML" }
  );
}

async function handleInvite(uid, chatId) {
  const user = db.getUser(uid);
  if (!user) return;
  const refPts = db.getSetting("referral_points") || "1";
  const cost = db.getSetting("subscription_cost") || "2";
  const link = `https://t.me/${botUsername}?start=add_${uid}`;

  await bot.sendMessage(chatId,
    `${em(E.manualSvc, "🎁")} <b>سیستم دعوت دوستان</b>\n\n` +
    `${em(E.addCoin, "➕")} امتیاز هر دعوت: <b>${refPts}</b>\n` +
    `${em(E.clan, "👥")} تعداد دعوت‌های شما: <b>${user.referral_count}</b>\n` +
    `${em(E.check, "🏅")} امتیاز فعلی: <b>${user.points}</b>\n\n` +
    `${em(E.guide, "🔗")} <b>لینک دعوت اختصاصی شما:</b>\n${link}\n\n` +
    `${em(E.fire, "⬆️")} این لینک را با دوستان خود به اشتراک بگذارید و به ازای هر نفر که وارد ربات شود، <b>${refPts} امتیاز</b> دریافت کنید!\n\n` +
    `${em(E.bell, "💡")} با <b>${cost} امتیاز</b> می‌توانید یک اشتراک دریافت کنید.`,
    { parse_mode: "HTML" }
  );
}

async function handleProfile(uid, chatId) {
  const user = db.getUser(uid);
  if (!user) return;
  const joinDate = user.join_date ? user.join_date.split(" ")[0].split("-").reverse().join("-") : "نامشخص";
  const uname = user.username ? `@${user.username}` : "ندارد";

  await bot.sendMessage(chatId,
    `${em(E.maintenance, "🔧")} <b>پروفایل شما</b>\n\n` +
    `${em(E.star, "😊")} شناسه: <code>${uid}</code>\n` +
    `${em(E.msgUser, "🎭")} نام: ${user.first_name || "نامشخص"}\n` +
    `${em(E.userInfo, "ℹ️")} نام کاربری: ${uname}\n` +
    `${em(E.check, "🏅")} امتیاز فعلی: <b>${user.points}</b>\n` +
    `${em(E.clan, "👥")} تعداد دعوت: <b>${user.referral_count}</b>\n` +
    `${em(E.calendar, "📅")} تاریخ عضویت: ${joinDate}`,
    { parse_mode: "HTML" }
  );
}

async function handleRules(chatId) {
  await bot.sendMessage(chatId,
    `${em(E.allUsers, "📋")} <b>قوانین و شرایط استفاده</b>\n\n` +
    `${em(E.status, "⚖️")} <b>کاربر گرامی،</b>\n` +
    `برای حفظ کیفیت سرویس‌ها و ایجاد تجربه‌ای عادلانه برای همه کاربران، رعایت موارد زیر الزامی است:\n\n` +
    `${em(E.block, "🔒")} <b>حریم خصوصی</b>\n• اطلاعات شما کاملاً محرمانه بوده و فقط جهت مدیریت سرویس استفاده می‌شود.\n\n` +
    `${em(E.clan, "👥")} <b>سیستم دعوت (رفرال)</b>\n• دریافت اشتراک رایگان از طریق دعوت دوستان با لینک اختصاصی شما انجام می‌شود.\n• هرگونه تقلب شناسایی شده و منجر به مسدودسازی دائمی حساب خواهد شد.\n\n` +
    `${em(E.block, "🚫")} <b>قوانین استفاده</b>\n• اشتراک دریافتی صرفاً برای استفاده شخصی بوده و به اشتراک‌گذاری آن ممنوع است.\n• استفاده برای فعالیت‌های مخرب یا DDoS اکیداً ممنوع است.\n\n` +
    `${em(E.alarm, "‼️")} <b>مسئولیت</b>\n• تمامی مسئولیت نحوه استفاده از سرویس بر عهده کاربر خواهد بود.`,
    { parse_mode: "HTML" }
  );
}

async function handleGuide(chatId) {
  await bot.sendMessage(chatId,
    `${em(E.search, "❓")} <b>راهنمای دریافت اشتراک رایگان</b>\n\n` +
    `1️⃣ <b>مرحله ۱:</b> وارد بخش «دعوت دوستان» شوید و لینک اختصاصی خود را دریافت کنید.\n\n` +
    `2️⃣ <b>مرحله ۲:</b> لینک را برای دوستان ارسال کنید. با عضویت هر کاربر، امتیاز به حساب شما افزوده می‌شود.\n\n` +
    `3️⃣ <b>مرحله ۳:</b> پس از رسیدن امتیاز به حد نصاب، از بخش «دریافت اشتراک» کانفیگ خود را دریافت کنید.\n\n` +
    `${em(E.bell, "💡")} <b>نکته:</b> سیستم آنتی‌تقلب فعال است.\n\n` +
    `${em(E.maintenance, "🔧")} <b>پشتیبانی:</b> در صورت مشکل از بخش «پشتیبانی» اقدام کنید.`,
    { parse_mode: "HTML" }
  );
}

// ===== ADMIN HANDLERS =====
async function adminStats(chatId) {
  const users = db.getAllUsers();
  const cfgs = db.data.configs;
  await bot.sendMessage(chatId,
    `${em(E.stats, "📊")} <b>آمار کامل ربات</b>\n\n` +
    `${em(E.allUsers, "👥")} کل کاربران: <b>${users.length}</b>\n` +
    `${em(E.block, "🚫")} مسدود: <b>${users.filter(u => u.is_blocked).length}</b>\n` +
    `${em(E.manageConfig, "💎")} کل کانفیگ‌ها: <b>${cfgs.length}</b>\n` +
    `${em(E.check, "✅")} موجود: <b>${cfgs.filter(c => !c.used_by).length}</b>\n` +
    `${em(E.coin, "💰")} کل امتیازات: <b>${users.reduce((s, u) => s + u.points, 0)}</b>`,
    { parse_mode: "HTML" }
  );
}

async function adminBotStatus(chatId) {
  const users = db.getAllUsers();
  const avail = db.data.configs.filter(c => !c.used_by).length;
  const m = db.getSetting("maintenance_mode") === "1" ? "🔴 فعال" : "🟢 غیرفعال";
  await bot.sendMessage(chatId,
    `${em(E.status, "📋")} <b>وضعیت ربات</b>\n\n` +
    `${em(E.check, "🟢")} وضعیت: <b>آنلاین</b>\n` +
    `${em(E.allUsers, "👥")} کاربران: <b>${users.length}</b>\n` +
    `${em(E.manageConfig, "💎")} کانفیگ موجود: <b>${avail}</b>\n` +
    `${em(E.coin, "💰")} هزینه اشتراک: <b>${db.getSetting("subscription_cost")} امتیاز</b>\n` +
    `${em(E.maintenance, "🔧")} حالت تعمیر: ${m}`,
    { parse_mode: "HTML" }
  );
}

async function adminLastUsers(chatId) {
  const users = db.getAllUsers().sort((a, b) => b.join_date?.localeCompare(a.join_date || "") || 0).slice(0, 15);
  let txt = `${em(E.lastUsers, "🕐")} <b>آخرین کاربران</b>\n\n`;
  users.forEach((u, i) => {
    const n = u.username ? `@${u.username}` : u.first_name || "ناشناس";
    txt += `${i + 1}. ${n} | <code>${u.user_id}</code> | ${em(E.check, "🏅")} ${u.points}\n`;
  });
  await bot.sendMessage(chatId, txt, { parse_mode: "HTML" });
}

async function adminTopInvites(chatId) {
  const users = db.getAllUsers().sort((a, b) => b.referral_count - a.referral_count).slice(0, 10);
  let txt = `${em(E.topInvites, "👥")} <b>برترین دعوت‌ها</b>\n\n`;
  users.forEach((u, i) => {
    const n = u.username ? `@${u.username}` : u.first_name || "ناشناس";
    txt += `${i + 1}. ${n} | ${em(E.clan, "👥")} ${u.referral_count}\n`;
  });
  await bot.sendMessage(chatId, txt, { parse_mode: "HTML" });
}

async function adminTopService(chatId) {
  const users = db.getAllUsers().sort((a, b) => b.services_received - a.services_received).slice(0, 10);
  let txt = `${em(E.topService, "🏆")} <b>بیشترین سرویس</b>\n\n`;
  users.forEach((u, i) => {
    const n = u.username ? `@${u.username}` : u.first_name || "ناشناس";
    txt += `${i + 1}. ${n} | ${em(E.topService, "🏆")} ${u.services_received}\n`;
  });
  await bot.sendMessage(chatId, txt, { parse_mode: "HTML" });
}

async function adminRichest(chatId) {
  const users = db.getAllUsers().sort((a, b) => b.points - a.points).slice(0, 10);
  let txt = `${em(E.richest, "💰")} <b>ثروتمندترین کاربران</b>\n\n`;
  users.forEach((u, i) => {
    const n = u.username ? `@${u.username}` : u.first_name || "ناشناس";
    txt += `${i + 1}. ${n} | ${em(E.coin, "💰")} ${u.points}\n`;
  });
  await bot.sendMessage(chatId, txt, { parse_mode: "HTML" });
}

async function adminChannels(uid, chatId) {
  const chs = JSON.parse(db.getSetting("force_channels") || JSON.stringify(FORCE_CHANNELS_DEFAULT));
  let txt = `${em(E.channels, "📡")} <b>کانال‌های اجباری</b>\n\n`;
  chs.forEach((c, i) => { txt += `${i + 1}. ${c.title} - @${c.username}\n`; });
  txt += `\n<b>افزودن:</b> <code>add_ch username عنوان</code>\n<b>حذف:</b> <code>del_ch username</code>`;
  await bot.sendMessage(chatId, txt, { parse_mode: "HTML" });
  setState(uid, "WAIT_CHANNEL_CMD");
}

async function adminCoinSettings(uid, chatId) {
  await bot.sendMessage(chatId,
    `${em(E.coinSettings, "⚙️")} <b>تنظیمات سکه‌ها</b>\n\n` +
    `${em(E.coin, "💰")} هزینه اشتراک: <b>${db.getSetting("subscription_cost")} امتیاز</b>\n` +
    `${em(E.addCoin, "➕")} امتیاز هر دعوت: <b>${db.getSetting("referral_points")}</b>\n\n` +
    `تغییر هزینه: <code>set_cost مقدار</code>\nتغییر دعوت: <code>set_ref مقدار</code>`,
    { parse_mode: "HTML" }
  );
  setState(uid, "WAIT_COIN_CMD");
}

async function adminAllUsers(chatId) {
  const users = db.getAllUsers();
  let txt = `${em(E.allUsers, "📋")} <b>همه کاربران (${users.length} نفر)</b>\n\n`;
  users.slice(0, 25).forEach((u, i) => {
    const n = u.username ? `@${u.username}` : u.first_name || "ناشناس";
    txt += `${i + 1}. ${u.is_blocked ? "🔴" : "🟢"} ${n} | <code>${u.user_id}</code>\n`;
  });
  if (users.length > 25) txt += `\n... و ${users.length - 25} نفر دیگر`;
  await bot.sendMessage(chatId, txt, { parse_mode: "HTML" });
}

async function adminMonthly(chatId) {
  const m = new Date().toISOString().slice(0, 7);
  const users = db.getAllUsers();
  const newU = users.filter(u => u.join_date?.startsWith(m)).length;
  const txs = db.data.transactions.filter(t => t.created_at?.startsWith(m) && t.amount > 0);
  await bot.sendMessage(chatId,
    `${em(E.monthlyStats, "📅")} <b>آمار ماهانه (${m})</b>\n\n` +
    `${em(E.allUsers, "👥")} کاربران جدید: <b>${newU}</b>\n` +
    `${em(E.coin, "💰")} امتیازات: <b>${txs.reduce((s, t) => s + t.amount, 0)}</b>\n` +
    `${em(E.check, "✅")} تراکنش‌ها: <b>${txs.length}</b>`,
    { parse_mode: "HTML" }
  );
}

async function adminManageConfig(uid, chatId) {
  const avail = db.data.configs.filter(c => !c.used_by).length;
  const used = db.data.configs.filter(c => c.used_by).length;
  await bot.sendMessage(chatId,
    `${em(E.manageConfig, "📦")} <b>مدیریت کانفیگ</b>\n\n` +
    `${em(E.check, "✅")} موجود: <b>${avail}</b>\n${em(E.block, "🔴")} استفاده‌شده: <b>${used}</b>\n\n` +
    `برای افزودن کانفیگ:\n<code>add_config متن_کانفیگ</code>`,
    { parse_mode: "HTML" }
  );
  setState(uid, "WAIT_CONFIG_CMD");
}

async function adminFullReport(chatId) {
  const users = db.getAllUsers();
  const cfgs = db.data.configs;
  const top = users.sort((a, b) => b.points - a.points)[0];
  const topInv = [...users].sort((a, b) => b.referral_count - a.referral_count)[0];
  await bot.sendMessage(chatId,
    `${em(E.report, "📊")} <b>گزارش کامل</b>\n\n` +
    `${em(E.allUsers, "👥")} کل: ${users.length} | فعال: ${users.filter(u => !u.is_blocked).length} | مسدود: ${users.filter(u => u.is_blocked).length}\n` +
    `${em(E.manageConfig, "💎")} کانفیگ‌ها: ${cfgs.length} | موجود: ${cfgs.filter(c => !c.used_by).length}\n` +
    `${em(E.coin, "💰")} کل امتیازات: ${users.reduce((s, u) => s + u.points, 0)}\n` +
    `${em(E.richest, "🏆")} ثروتمندترین: ${top ? (top.username ? "@" + top.username : top.first_name) : "—"} (${top?.points || 0})\n` +
    `${em(E.topInvites, "👥")} برترین دعوت: ${topInv ? (topInv.username ? "@" + topInv.username : topInv.first_name) : "—"} (${topInv?.referral_count || 0})`,
    { parse_mode: "HTML" }
  );
}

async function adminToggleMaintenance(chatId) {
  const next = db.getSetting("maintenance_mode") === "1" ? "0" : "1";
  db.setSetting("maintenance_mode", next);
  await bot.sendMessage(chatId, `${em(E.maintenance, "🔧")} حالت تعمیر ${next === "1" ? "🔴 فعال" : "🟢 غیرفعال"} شد.`, { parse_mode: "HTML" });
}

// ===== STATE HANDLER =====
async function handleState(uid, chatId, msg, { state, data }) {
  const text = msg.text || "";

  switch (state) {
    case "WAIT_BROADCAST": {
      clearState(uid);
      const all = db.getAllUsers().filter(u => !u.is_blocked);
      let ok = 0, fail = 0;
      await bot.sendMessage(chatId, `${em(E.broadcast, "📢")} در حال ارسال به ${all.length} کاربر...`, { parse_mode: "HTML" });
      for (const u of all) {
        try { await bot.copyMessage(u.user_id, chatId, msg.message_id); ok++; } catch { fail++; }
        await new Promise(r => setTimeout(r, 35));
      }
      await bot.sendMessage(chatId, `${em(E.check, "✅")} ارسال تمام!\n✅ موفق: ${ok}\n❌ ناموفق: ${fail}`, { parse_mode: "HTML" });
      break;
    }
    case "WAIT_MSG_UID": {
      const tid = parseInt(text);
      if (isNaN(tid)) return bot.sendMessage(chatId, "آیدی نامعتبر!");
      setState(uid, "WAIT_MSG_TEXT", { tid });
      await bot.sendMessage(chatId, "پیام را ارسال کنید:");
      break;
    }
    case "WAIT_MSG_TEXT": {
      clearState(uid);
      try { await bot.copyMessage(data.tid, chatId, msg.message_id); await bot.sendMessage(chatId, `${em(E.check, "✅")} ارسال شد به <code>${data.tid}</code>.`, { parse_mode: "HTML" }); }
      catch { await bot.sendMessage(chatId, `${em(E.block, "❌")} ارسال ناموفق.`, { parse_mode: "HTML" }); }
      break;
    }
    case "WAIT_SEARCH":
    case "WAIT_USER_INFO": {
      clearState(uid);
      let user;
      if (text.startsWith("@")) user = db.findUserByUsername(text.slice(1));
      else user = db.getUser(parseInt(text));
      if (!user) return bot.sendMessage(chatId, "کاربر یافت نشد!");
      await sendUserInfo(chatId, user);
      break;
    }
    case "WAIT_UNBLOCK": {
      clearState(uid);
      const tid = parseInt(text);
      db.updateUser(tid, { is_blocked: 0 });
      await bot.sendMessage(chatId, `${em(E.check, "✅")} رفع مسدودی <code>${tid}</code>.`, { parse_mode: "HTML" });
      try { await bot.sendMessage(tid, `${em(E.check, "✅")} حساب شما رفع مسدودی شد.`, { parse_mode: "HTML" }); } catch {}
      break;
    }
    case "WAIT_BLOCK": {
      clearState(uid);
      const tid = parseInt(text);
      db.updateUser(tid, { is_blocked: 1 });
      await bot.sendMessage(chatId, `${em(E.block, "🚫")} مسدود شد <code>${tid}</code>.`, { parse_mode: "HTML" });
      try { await bot.sendMessage(tid, `${em(E.block, "🚫")} حساب شما مسدود شده است.`, { parse_mode: "HTML" }); } catch {}
      break;
    }
    case "WAIT_ADD_COIN_UID": { const tid = parseInt(text); if (isNaN(tid)) return bot.sendMessage(chatId, "آیدی نامعتبر!"); setState(uid, "WAIT_ADD_COIN_AMT", { tid }); await bot.sendMessage(chatId, "مقدار امتیاز:"); break; }
    case "WAIT_ADD_COIN_AMT": {
      const amt = parseInt(text); if (isNaN(amt)) return bot.sendMessage(chatId, "مقدار نامعتبر!"); clearState(uid);
      db.updatePoints(data.tid, amt, "admin_add", "افزودن توسط ادمین");
      await bot.sendMessage(chatId, `${em(E.check, "✅")} <b>${amt}</b> امتیاز به <code>${data.tid}</code> اضافه شد.`, { parse_mode: "HTML" });
      try { await bot.sendMessage(data.tid, `${em(E.addCoin, "💰")} <b>${amt} امتیاز</b> به حساب شما افزوده شد.`, { parse_mode: "HTML" }); } catch {}
      break;
    }
    case "WAIT_SET_COIN_UID": { const tid = parseInt(text); if (isNaN(tid)) return bot.sendMessage(chatId, "آیدی نامعتبر!"); setState(uid, "WAIT_SET_COIN_AMT", { tid }); await bot.sendMessage(chatId, "مقدار جدید:"); break; }
    case "WAIT_SET_COIN_AMT": {
      const amt = parseInt(text); if (isNaN(amt)) return bot.sendMessage(chatId, "مقدار نامعتبر!"); clearState(uid);
      db.updateUser(data.tid, { points: amt });
      await bot.sendMessage(chatId, `${em(E.check, "✅")} امتیاز <code>${data.tid}</code> به <b>${amt}</b> تنظیم شد.`, { parse_mode: "HTML" });
      break;
    }
    case "WAIT_RESET_COIN": { clearState(uid); const tid = parseInt(text); db.updateUser(tid, { points: 0 }); await bot.sendMessage(chatId, `${em(E.resetCoin, "🔄")} ری‌ست شد <code>${tid}</code>.`, { parse_mode: "HTML" }); break; }
    case "WAIT_MANUAL_UID": { const tid = parseInt(text); if (isNaN(tid)) return bot.sendMessage(chatId, "آیدی نامعتبر!"); setState(uid, "WAIT_MANUAL_CONFIG", { tid }); await bot.sendMessage(chatId, "کانفیگ را وارد کنید:"); break; }
    case "WAIT_MANUAL_CONFIG": {
      clearState(uid);
      try {
        await bot.sendMessage(data.tid, `${em(E.manualSvc, "🎁")} <b>سرویس دستی دریافت شد:</b>\n\n<code>${text}</code>`, { parse_mode: "HTML" });
        db.addConfig(text, uid); db.markConfigUsed(db.data.configs[db.data.configs.length - 1].id, data.tid);
        const u = db.getUser(data.tid); if (u) db.updateUser(data.tid, { services_received: u.services_received + 1 });
        await bot.sendMessage(chatId, `${em(E.check, "✅")} سرویس به <code>${data.tid}</code> ارسال شد.`, { parse_mode: "HTML" });
      } catch { await bot.sendMessage(chatId, `${em(E.block, "❌")} ارسال ناموفق.`, { parse_mode: "HTML" }); }
      break;
    }
    case "WAIT_WELCOME": { clearState(uid); db.setSetting("welcome_text", text); await bot.sendMessage(chatId, `${em(E.check, "✅")} متن خوش‌آمد بروزرسانی شد.`, { parse_mode: "HTML" }); break; }
    case "WAIT_DELETE": { clearState(uid); const tid = parseInt(text); db.deleteUser(tid); await bot.sendMessage(chatId, `${em(E.deleteUser, "🗑")} کاربر <code>${tid}</code> حذف شد.`, { parse_mode: "HTML" }); break; }
    case "WAIT_CHANNEL_CMD": {
      clearState(uid);
      const chs = JSON.parse(db.getSetting("force_channels") || JSON.stringify(FORCE_CHANNELS_DEFAULT));
      if (text.startsWith("add_ch ")) {
        const parts = text.replace("add_ch ", "").split(" "); const uname = parts[0]; const title = parts.slice(1).join(" ") || uname;
        chs.push({ username: uname, title, url: `https://t.me/${uname}` }); db.setSetting("force_channels", JSON.stringify(chs));
        await bot.sendMessage(chatId, `${em(E.check, "✅")} کانال @${uname} اضافه شد.`, { parse_mode: "HTML" });
      } else if (text.startsWith("del_ch ")) {
        const uname = text.replace("del_ch ", "").trim(); db.setSetting("force_channels", JSON.stringify(chs.filter(c => c.username !== uname)));
        await bot.sendMessage(chatId, `${em(E.check, "✅")} کانال @${uname} حذف شد.`, { parse_mode: "HTML" });
      } else { await bot.sendMessage(chatId, "دستور نامعتبر!"); }
      break;
    }
    case "WAIT_COIN_CMD": {
      clearState(uid);
      if (text.startsWith("set_cost ")) { const v = parseInt(text.replace("set_cost ", "")); if (!isNaN(v)) { db.setSetting("subscription_cost", v); await bot.sendMessage(chatId, `${em(E.check, "✅")} هزینه اشتراک: <b>${v}</b>.`, { parse_mode: "HTML" }); } }
      else if (text.startsWith("set_ref ")) { const v = parseInt(text.replace("set_ref ", "")); if (!isNaN(v)) { db.setSetting("referral_points", v); await bot.sendMessage(chatId, `${em(E.check, "✅")} امتیاز دعوت: <b>${v}</b>.`, { parse_mode: "HTML" }); } }
      else { await bot.sendMessage(chatId, "دستور نامعتبر!"); }
      break;
    }
    case "WAIT_CONFIG_CMD": {
      clearState(uid);
      if (text.startsWith("add_config ")) { const cfg = text.replace("add_config ", "").trim(); db.addConfig(cfg, uid); await bot.sendMessage(chatId, `${em(E.check, "✅")} کانفیگ اضافه شد.`, { parse_mode: "HTML" }); }
      else { await bot.sendMessage(chatId, `دستور نامعتبر! از <code>add_config متن</code> استفاده کنید.`, { parse_mode: "HTML" }); }
      break;
    }
  }
}

async function sendUserInfo(chatId, user) {
  const uname = user.username ? `@${user.username}` : "ندارد";
  const joinDate = user.join_date ? user.join_date.split(" ")[0] : "نامشخص";
  await bot.sendMessage(chatId,
    `${em(E.userInfo, "👤")} <b>اطلاعات کاربر</b>\n\n` +
    `${em(E.star, "🆔")} آیدی: <code>${user.user_id}</code>\n` +
    `${em(E.msgUser, "👤")} نام: ${user.first_name || "—"}\n` +
    `${em(E.lastUsers, "ℹ️")} یوزرنیم: ${uname}\n` +
    `${em(E.check, "🏅")} امتیاز: <b>${user.points}</b>\n` +
    `${em(E.clan, "👥")} دعوت‌ها: <b>${user.referral_count}</b>\n` +
    `${em(E.topService, "🏆")} سرویس‌ها: <b>${user.services_received}</b>\n` +
    `${em(E.calendar, "📅")} عضویت: ${joinDate}\n` +
    `${em(E.status, "📊")} وضعیت: ${user.is_blocked ? "🔴 مسدود" : "🟢 فعال"}`,
    { parse_mode: "HTML" }
  );
}

// ===== HEALTH SERVER =====
const server = http.createServer((_, res) => { res.writeHead(200); res.end("OK"); });
server.listen(PORT, () => console.log(`Bot running | Port: ${PORT}`));

bot.on("polling_error", (e) => console.error("Polling error:", e.message));
process.on("SIGTERM", () => { db.saveSync(); bot.stopPolling(); server.close(); process.exit(0); });
