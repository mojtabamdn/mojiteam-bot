const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const ADMIN_IDS = [6622580245];
const DB_PATH = process.env.DB_PATH || "./bot.db.json";

// ===== PREMIUM EMOJIS =====
const E = {
  download:     "5206607081334906820",
  invite:       "5422439311196834318",
  profile:      "5213383002129702114",
  rules:        "5461117441612462242",
  support:      "5264713049637409446",
  guide:        "5785033300867288899",
  stats:        "5395444784611480792",
  status:       "5231200819986047254",
  back:         "6300757202651055745",
  coin:         "5190806721286657692",
  check:        "5440660757194744323",
  block:        "5447644880824181073",
  unblock:      "5440660757194744323",
  fire:         "5785193735075663481",
  bell:         "5785219784052314091",
  star:         "6037618875846102911",
  gem:          "4981404027402061416",
  clan:         "5436113877181941026",
  calendar:     "5391112412445288650",
  broadcast:    "5413704112220949842",
  search:       "5375296873982604963",
  settings:     "5472027899789843495",
  users:        "5231200819986047254",
  configs:      "5994495364084796671",
  messages:     "5264713049637409446",
  keyboard:     "5421516124027482021",
  channels:     "5424818078833715060",
  add:          "5271604874419647061",
  remove:       "5453957997418004470",
  edit:         "5334544901428229844",
  maintenance:  "5255883984151276991",
  alarm:        "5924664865208671041",
  topInvites:   "5427009714745517609",
  richest:      "5190806721286657692",
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
      // Ensure all required keys exist
      if (!this.data.settings) this.data.settings = {};
      if (!this.data.users) this.data.users = {};
      if (!this.data.configs) this.data.configs = [];
      if (!this.data.transactions) this.data.transactions = [];
      if (!this.data._nextConfigId) this.data._nextConfigId = 1;
    } catch {
      this.data = {
        users: {},
        settings: {},
        configs: [],
        transactions: [],
        _nextConfigId: 1,
      };
    }
    // Default settings
    const defaults = {
      welcome_text: `${em(E.fire,"🔥")} <b>به ربات کانفیگ رایگان خوش آمدید</b>\n\n${em(E.bell,"🔔")} با این ربات می‌توانید:\n\n${em(E.check,"✅")} کانفیگ‌های رایگان دریافت کنید\n${em(E.check,"✅")} با دعوت دوستان امتیاز کسب کنید\n${em(E.check,"✅")} با امتیاز، اشتراک رایگان بگیرید`,
      force_join_text: `${em(E.channels,"📌")} <b>برای استفاده از ربات ابتدا در کانال‌های زیر عضو شوید</b>\n\n${em(E.bell,"💡")} پس از عضویت روی دکمه تایید کلیک کنید.`,
      force_join_btn: `${em(E.check,"✅")} تایید عضویت`,
      subscription_ok_text: `${em(E.check,"✅")} <b>اشتراک با موفقیت دریافت شد!</b>\n\n${em(E.coin,"💰")} امتیاز کسر شده: {cost}\n${em(E.check,"🏅")} باقیمانده: {remaining}\n\n${em(E.gem,"💎")} <b>کانفیگ شما:</b>\n<code>{config}</code>`,
      no_config_text: `${em(E.block,"❌")} <b>در حال حاضر کانفیگی موجود نیست!</b>\n\n${em(E.bell,"💡")} لطفاً بعداً مراجعه کنید.`,
      no_points_text: `${em(E.block,"❌")} <b>امتیاز کافی نیست!</b>\n\n${em(E.settings,"🎭")} هزینه: <b>{cost} امتیاز</b>\n${em(E.check,"🏅")} امتیاز شما: <b>{points}</b>\n${em(E.star,"🔄")} کمبود: <b>{shortage}</b>\n\n${em(E.bell,"💡")} با دعوت دوستان امتیاز کسب کنید!`,
      referral_notify_text: `${em(E.star,"🎉")} <b>زیرمجموعه جدید!</b>\n\n${em(E.bell,"🟡")} @{username} وارد ربات شد\n\n${em(E.coin,"💰")} امتیاز قبل: {before}\nامتیاز بعد: {after} (+{pts})\n\n${em(E.clan,"👥")} کل زیرمجموعه‌ها: {total}`,
      blocked_text: `${em(E.block,"🚫")} <b>حساب شما مسدود شده است.</b>`,
      maintenance_text: `${em(E.maintenance,"🔧")} <b>ربات در حالت تعمیر است. بعداً مراجعه کنید.</b>`,
      rules_text: `${em(E.rules,"📋")} <b>قوانین استفاده</b>\n\n${em(E.block,"🔒")} اطلاعات شما محرمانه است.\n${em(E.clan,"👥")} تقلب در سیستم دعوت = مسدودی دائم.\n${em(E.block,"🚫")} اشتراک صرفاً برای استفاده شخصی است.\n${em(E.alarm,"‼️")} استفاده مخرب ممنوع است.`,
      guide_text: `${em(E.search,"❓")} <b>راهنما</b>\n\n1️⃣ از بخش «دعوت» لینک اختصاصی خود را دریافت کنید.\n2️⃣ لینک را برای دوستان ارسال کنید.\n3️⃣ با کسب امتیاز از بخش «دریافت اشتراک» کانفیگ بگیرید.`,
      support_text: "فاقد ورودی!",
      subscription_cost: "2",
      referral_points: "1",
      maintenance_mode: "0",
      force_channels: JSON.stringify([{ username: "lnterFreedom", title: "InterFreedom", url: "https://t.me/lnterFreedom" }]),
      main_keyboard: JSON.stringify([
        [{ text: `دریافت اشتراک`, emoji_id: E.download }],
        [{ text: `دعوت دوستان`, emoji_id: E.invite }, { text: `پروفایل`, emoji_id: E.profile }],
        [{ text: `قوانین`, emoji_id: E.rules }, { text: `پشتیبانی`, emoji_id: E.support }],
        [{ text: `راهنما`, emoji_id: E.guide }],
      ]),
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (!this.data.settings[k]) this.data.settings[k] = v;
    }
    this.save();
  }

  save() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch (e) { console.error("DB save:", e.message); }
    }, 300);
  }

  saveSync() {
    try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch {}
  }

  get(key) { return this.data.settings[key] ?? ""; }
  set(key, value) { this.data.settings[key] = value; this.save(); }

  getUser(userId) { return this.data.users[String(userId)] || null; }

  createUser(userId, username, firstName, lastName, referredBy = null) {
    const id = String(userId);
    if (this.data.users[id]) {
      // Update username/name
      this.data.users[id].username = username || this.data.users[id].username;
      this.data.users[id].first_name = firstName || this.data.users[id].first_name;
      this.save();
      return false;
    }
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

  addPoints(userId, amount, type, desc) {
    const u = this.getUser(userId);
    if (u) {
      u.points += amount;
      this.data.transactions.push({ id: Date.now() + Math.random(), user_id: userId, amount, type, desc, created_at: now() });
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
    const c = this.data.configs.find(c => c.id === id);
    if (c) { c.used_by = userId; c.used_at = now(); this.save(); }
  }

  deleteConfig(id) {
    this.data.configs = this.data.configs.filter(c => c.id !== id);
    this.save();
  }

  deleteUser(userId) { delete this.data.users[String(userId)]; this.save(); }

  findByUsername(uname) { return Object.values(this.data.users).find(u => u.username === uname) || null; }
}

function now() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

if (!TOKEN) { console.error("BOT_TOKEN required"); process.exit(1); }

const db = new JsonDB(DB_PATH);
const isAdmin = (id) => ADMIN_IDS.includes(Number(id));

const bot = new TelegramBot(TOKEN, { polling: true });
let ME = { username: "bot" };
bot.getMe().then(me => { ME = me; console.log("Bot:", me.username); }).catch(console.error);

// State machine
const states = new Map();
const getState = (uid) => states.get(uid) || { s: "IDLE", d: {} };
const setState = (uid, s, d = {}) => states.set(uid, { s, d });
const clearState = (uid) => states.delete(uid);

// Pending referrals (before force-join completes)
const pendingReferrals = new Map(); // userId -> referrerId

// ===== KEYBOARD BUILDERS =====
function buildMainKb() {
  const rows = JSON.parse(db.get("main_keyboard"));
  return {
    keyboard: rows.map(row => row.map(btn => ({
      text: btn.text,
      ...(btn.emoji_id ? { icon_custom_emoji_id: btn.emoji_id } : {}),
    }))),
    resize_keyboard: true,
  };
}

function adminInlineKb() {
  return { inline_keyboard: [
    [{ text: `${em(E.stats,"📊")} آمار`, callback_data: "adm:stats" }, { text: `${em(E.users,"👥")} کاربران`, callback_data: "adm:users" }],
    [{ text: `${em(E.configs,"💎")} کانفیگ‌ها`, callback_data: "adm:configs" }, { text: `${em(E.channels,"📡")} کانال‌ها`, callback_data: "adm:channels" }],
    [{ text: `${em(E.messages,"✉️")} ویرایش پیام‌ها`, callback_data: "adm:messages" }, { text: `${em(E.keyboard,"⌨️")} دکمه‌های کیبورد`, callback_data: "adm:keyboard" }],
    [{ text: `${em(E.settings,"⚙️")} تنظیمات`, callback_data: "adm:settings" }, { text: `${em(E.broadcast,"📢")} پیام همگانی`, callback_data: "adm:broadcast" }],
    [{ text: `${em(E.maintenance,"🔧")} حالت تعمیر`, callback_data: "adm:toggle_maintenance" }],
  ]};
}

const backBtn = (data) => [{ text: `${em(E.back,"◀️")} بازگشت`, callback_data: data }];

// ===== FORCE JOIN =====
async function checkJoin(userId) {
  const channels = JSON.parse(db.get("force_channels"));
  const missing = [];
  for (const ch of channels) {
    try {
      const m = await bot.getChatMember("@" + ch.username, userId);
      if (["left", "kicked"].includes(m.status)) missing.push(ch);
    } catch { missing.push(ch); }
  }
  return missing;
}

async function sendForceJoin(chatId, channels) {
  const btns = channels.map(ch => [{ text: `${em(E.channels,"📢")} ${ch.title}`, url: ch.url }]);
  const btnText = db.get("force_join_btn");
  btns.push([{ text: btnText, callback_data: "join:check" }]);
  await bot.sendMessage(chatId, db.get("force_join_text"), {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: btns },
  });
}

// ===== /start =====
bot.onText(/\/start(.*)/, async (msg, match) => {
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const param = (match[1] || "").trim();

  if (db.get("maintenance_mode") === "1" && !isAdmin(uid)) {
    return bot.sendMessage(chatId, db.get("maintenance_text"), { parse_mode: "HTML" });
  }

  // Store referral param before join check
  if (param.startsWith("add_")) {
    const rid = parseInt(param.replace("add_", ""));
    if (!isNaN(rid) && rid !== uid) pendingReferrals.set(uid, rid);
  }

  const missing = await checkJoin(uid);
  if (missing.length > 0) return sendForceJoin(chatId, missing);

  await processStart(uid, chatId, msg.from);
});

async function processStart(uid, chatId, from) {
  const referredBy = pendingReferrals.get(uid) || null;
  pendingReferrals.delete(uid);

  const isNew = db.createUser(uid, from.username, from.first_name, from.last_name, referredBy);

  if (isNew && referredBy) {
    const refUser = db.getUser(referredBy);
    if (refUser && !refUser.is_blocked) {
      const pts = parseInt(db.get("referral_points") || "1");
      const before = refUser.points;
      db.addPoints(referredBy, pts, "referral", `دعوت @${from.username || uid}`);
      db.updateUser(referredBy, { referral_count: refUser.referral_count + 1 });
      try {
        const uname = from.username ? `@${from.username}` : from.first_name || String(uid);
        let notif = db.get("referral_notify_text");
        notif = notif
          .replace("{username}", uname)
          .replace("{before}", before)
          .replace("{after}", before + pts)
          .replace("{pts}", pts)
          .replace("{total}", refUser.referral_count + 1);
        await bot.sendMessage(referredBy, notif, { parse_mode: "HTML" });
      } catch {}
    }
  }

  const user = db.getUser(uid);
  if (user?.is_blocked) return bot.sendMessage(chatId, db.get("blocked_text"), { parse_mode: "HTML" });

  await bot.sendMessage(chatId, db.get("welcome_text"), { parse_mode: "HTML", reply_markup: buildMainKb() });
}

// ===== /admin =====
bot.onText(/\/admin/, async (msg) => {
  if (!isAdmin(msg.from.id)) return;
  clearState(msg.from.id);
  await bot.sendMessage(msg.chat.id,
    `${em(E.stats,"📊")} <b>پنل مدیریت</b> ${em(E.check,"✅")}`,
    { parse_mode: "HTML", reply_markup: adminInlineKb() }
  );
});

// ===== CALLBACK QUERY =====
bot.on("callback_query", async (q) => {
  const uid = q.from.id;
  const chatId = q.message.chat.id;
  const msgId = q.message.message_id;
  const data = q.data;

  // Force join check
  if (data === "join:check") {
    const missing = await checkJoin(uid);
    if (missing.length > 0) {
      await bot.answerCallbackQuery(q.id, { text: "❌ هنوز در همه کانال‌ها عضو نشدی!", show_alert: true });
      return;
    }
    await bot.answerCallbackQuery(q.id, { text: "✅ عضویت تایید شد!" });
    try { await bot.deleteMessage(chatId, msgId); } catch {}
    db.createUser(uid, q.from.username, q.from.first_name, q.from.last_name);
    await processStart(uid, chatId, q.from);
    return;
  }

  // Invite shortcut
  if (data === "goto_invite") {
    await bot.answerCallbackQuery(q.id);
    return handleInvite(uid, chatId);
  }

  // Admin panel
  if (!isAdmin(uid)) {
    await bot.answerCallbackQuery(q.id, { text: "دسترسی ندارید!" });
    return;
  }
  await bot.answerCallbackQuery(q.id);
  await handleAdminCallback(q, uid, chatId, msgId, data);
});

// ===== ADMIN CALLBACKS =====
async function handleAdminCallback(q, uid, chatId, msgId, data) {
  const edit = (text, kb) => bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: "HTML", reply_markup: kb });

  if (data === "adm:main") return edit(`${em(E.stats,"📊")} <b>پنل مدیریت</b>`, adminInlineKb());

  // ── STATS ──
  if (data === "adm:stats") {
    const users = db.getAllUsers();
    const cfgs = db.data.configs;
    const avail = cfgs.filter(c => !c.used_by).length;
    const blocked = users.filter(u => u.is_blocked).length;
    const totalPts = users.reduce((s, u) => s + u.points, 0);
    return edit(
      `${em(E.stats,"📊")} <b>آمار کامل</b>\n\n` +
      `${em(E.users,"👥")} کل کاربران: <b>${users.length}</b>\n` +
      `${em(E.block,"🚫")} مسدود: <b>${blocked}</b>\n` +
      `${em(E.configs,"💎")} کانفیگ کل: <b>${cfgs.length}</b> | موجود: <b>${avail}</b>\n` +
      `${em(E.coin,"💰")} کل امتیازات: <b>${totalPts}</b>\n` +
      `${em(E.maintenance,"🔧")} وضعیت: ${db.get("maintenance_mode") === "1" ? "🔴 تعمیر" : "🟢 فعال"}`,
      { inline_keyboard: [
        [{ text: `${em(E.topInvites,"👥")} برترین دعوت‌ها`, callback_data: "adm:top_inv" }, { text: `${em(E.richest,"💰")} ثروتمندترین‌ها`, callback_data: "adm:top_pts" }],
        [{ text: `${em(E.configs,"🏆")} بیشترین سرویس`, callback_data: "adm:top_svc" }],
        backBtn("adm:main"),
      ]}
    );
  }

  if (data === "adm:top_inv") {
    const top = db.getAllUsers().sort((a, b) => b.referral_count - a.referral_count).slice(0, 10);
    let txt = `${em(E.topInvites,"👥")} <b>برترین دعوت‌ها</b>\n\n`;
    top.forEach((u, i) => { txt += `${i + 1}. ${u.username ? "@" + u.username : u.first_name || "ناشناس"} | ${em(E.clan,"👥")} ${u.referral_count}\n`; });
    return edit(txt, { inline_keyboard: [backBtn("adm:stats")] });
  }
  if (data === "adm:top_pts") {
    const top = db.getAllUsers().sort((a, b) => b.points - a.points).slice(0, 10);
    let txt = `${em(E.richest,"💰")} <b>ثروتمندترین‌ها</b>\n\n`;
    top.forEach((u, i) => { txt += `${i + 1}. ${u.username ? "@" + u.username : u.first_name || "ناشناس"} | ${em(E.coin,"💰")} ${u.points}\n`; });
    return edit(txt, { inline_keyboard: [backBtn("adm:stats")] });
  }
  if (data === "adm:top_svc") {
    const top = db.getAllUsers().sort((a, b) => b.services_received - a.services_received).slice(0, 10);
    let txt = `${em(E.configs,"🏆")} <b>بیشترین سرویس</b>\n\n`;
    top.forEach((u, i) => { txt += `${i + 1}. ${u.username ? "@" + u.username : u.first_name || "ناشناس"} | ${em(E.check,"🏆")} ${u.services_received}\n`; });
    return edit(txt, { inline_keyboard: [backBtn("adm:stats")] });
  }

  // ── USERS ──
  if (data === "adm:users") {
    return edit(
      `${em(E.users,"👥")} <b>مدیریت کاربران</b>\n\nکل: <b>${db.getAllUsers().length}</b>`,
      { inline_keyboard: [
        [{ text: `${em(E.search,"🔍")} جستجو بر اساس آیدی`, callback_data: "adm:user_search_id" }],
        [{ text: `${em(E.search,"🔍")} جستجو بر اساس @یوزرنیم`, callback_data: "adm:user_search_un" }],
        [{ text: `${em(E.users,"📋")} آخرین کاربران`, callback_data: "adm:user_last" }],
        backBtn("adm:main"),
      ]}
    );
  }

  if (data === "adm:user_search_id") { setState(uid, "WAIT_USER_ID", { msgId }); return edit(`${em(E.search,"🔍")} آیدی عددی کاربر را ارسال کنید:`, { inline_keyboard: [backBtn("adm:users")] }); }
  if (data === "adm:user_search_un") { setState(uid, "WAIT_USER_UN", { msgId }); return edit(`${em(E.search,"🔍")} @یوزرنیم کاربر را ارسال کنید:`, { inline_keyboard: [backBtn("adm:users")] }); }

  if (data === "adm:user_last") {
    const users = db.getAllUsers().sort((a, b) => (b.join_date || "").localeCompare(a.join_date || "")).slice(0, 15);
    let txt = `${em(E.users,"🕐")} <b>آخرین کاربران</b>\n\n`;
    users.forEach((u, i) => { txt += `${i + 1}. ${u.username ? "@" + u.username : u.first_name || "ناشناس"} | <code>${u.user_id}</code>\n`; });
    return edit(txt, { inline_keyboard: [backBtn("adm:users")] });
  }

  // User detail view
  if (data.startsWith("adm:u:view:")) {
    const tid = parseInt(data.split(":")[3]);
    const u = db.getUser(tid);
    if (!u) return edit("کاربر یافت نشد!", { inline_keyboard: [backBtn("adm:users")] });
    return edit(
      `${em(E.users,"👤")} <b>اطلاعات کاربر</b>\n\n` +
      `${em(E.star,"🆔")} آیدی: <code>${u.user_id}</code>\n` +
      `${em(E.users,"👤")} نام: ${u.first_name || "—"} ${u.last_name || ""}\n` +
      `${em(E.edit,"ℹ️")} یوزرنیم: ${u.username ? "@" + u.username : "—"}\n` +
      `${em(E.coin,"💰")} امتیاز: <b>${u.points}</b>\n` +
      `${em(E.clan,"👥")} دعوت: <b>${u.referral_count}</b>\n` +
      `${em(E.configs,"🏆")} سرویس: <b>${u.services_received}</b>\n` +
      `${em(E.calendar,"📅")} عضویت: ${u.join_date || "—"}\n` +
      `${em(E.status,"📊")} وضعیت: ${u.is_blocked ? "🔴 مسدود" : "🟢 فعال"}`,
      { inline_keyboard: [
        [
          { text: u.is_blocked ? `${em(E.unblock,"✅")} رفع مسدودی` : `${em(E.block,"🚫")} مسدود`, callback_data: `adm:u:${u.is_blocked ? "unblock" : "block"}:${tid}` },
          { text: `${em(E.remove,"🗑")} حذف`, callback_data: `adm:u:delete:${tid}` },
        ],
        [
          { text: `${em(E.add,"➕")} افزودن امتیاز`, callback_data: `adm:u:addpts:${tid}` },
          { text: `${em(E.settings,"💲")} تنظیم امتیاز`, callback_data: `adm:u:setpts:${tid}` },
        ],
        [{ text: `${em(E.edit,"📨")} پیام به کاربر`, callback_data: `adm:u:msg:${tid}` }],
        [{ text: `${em(E.settings,"🎁")} سرویس دستی`, callback_data: `adm:u:svc:${tid}` }],
        backBtn("adm:users"),
      ]}
    );
  }

  if (data.startsWith("adm:u:block:")) { const tid = parseInt(data.split(":")[3]); db.updateUser(tid, { is_blocked: 1 }); try { await bot.sendMessage(tid, db.get("blocked_text"), { parse_mode: "HTML" }); } catch {} return handleAdminCallback(q, uid, chatId, msgId, `adm:u:view:${tid}`); }
  if (data.startsWith("adm:u:unblock:")) { const tid = parseInt(data.split(":")[3]); db.updateUser(tid, { is_blocked: 0 }); try { await bot.sendMessage(tid, `${em(E.check,"✅")} حساب شما رفع مسدودی شد.`, { parse_mode: "HTML" }); } catch {} return handleAdminCallback(q, uid, chatId, msgId, `adm:u:view:${tid}`); }
  if (data.startsWith("adm:u:delete:")) { const tid = parseInt(data.split(":")[3]); db.deleteUser(tid); return edit(`${em(E.check,"✅")} کاربر حذف شد.`, { inline_keyboard: [backBtn("adm:users")] }); }
  if (data.startsWith("adm:u:addpts:")) { const tid = parseInt(data.split(":")[3]); setState(uid, "WAIT_ADD_PTS", { tid, msgId }); return edit(`${em(E.add,"💰")} تعداد امتیاز برای افزودن به <code>${tid}</code>:`, { parse_mode: "HTML", inline_keyboard: [backBtn(`adm:u:view:${tid}`)] }); }
  if (data.startsWith("adm:u:setpts:")) { const tid = parseInt(data.split(":")[3]); setState(uid, "WAIT_SET_PTS", { tid, msgId }); return edit(`${em(E.settings,"💲")} امتیاز جدید برای <code>${tid}</code>:`, { parse_mode: "HTML", inline_keyboard: [backBtn(`adm:u:view:${tid}`)] }); }
  if (data.startsWith("adm:u:msg:")) { const tid = parseInt(data.split(":")[3]); setState(uid, "WAIT_MSG_USR", { tid, msgId }); return edit(`${em(E.edit,"📨")} پیام خود را ارسال کنید:`, { inline_keyboard: [backBtn(`adm:u:view:${tid}`)] }); }
  if (data.startsWith("adm:u:svc:")) { const tid = parseInt(data.split(":")[3]); setState(uid, "WAIT_SVC_CFG", { tid, msgId }); return edit(`${em(E.configs,"🎁")} کانفیگ برای <code>${tid}</code> را ارسال کنید:`, { parse_mode: "HTML", inline_keyboard: [backBtn(`adm:u:view:${tid}`)] }); }

  // ── CONFIGS ──
  if (data === "adm:configs") {
    const avail = db.data.configs.filter(c => !c.used_by).length;
    const used = db.data.configs.filter(c => c.used_by).length;
    return edit(
      `${em(E.configs,"💎")} <b>مدیریت کانفیگ</b>\n\n${em(E.check,"✅")} موجود: <b>${avail}</b>\n${em(E.block,"🔴")} استفاده‌شده: <b>${used}</b>`,
      { inline_keyboard: [
        [{ text: `${em(E.add,"➕")} افزودن کانفیگ`, callback_data: "adm:cfg:add" }],
        [{ text: `${em(E.remove,"🗑")} حذف آخرین کانفیگ موجود`, callback_data: "adm:cfg:dellast" }],
        [{ text: `${em(E.configs,"📋")} نمایش کانفیگ‌های موجود`, callback_data: "adm:cfg:list" }],
        backBtn("adm:main"),
      ]}
    );
  }

  if (data === "adm:cfg:add") { setState(uid, "WAIT_CFG_ADD", { msgId }); return edit(`${em(E.add,"➕")} کانفیگ جدید را ارسال کنید:\n\n<i>می‌توانید چندین کانفیگ با خط جدا کنید</i>`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:configs")] }); }

  if (data === "adm:cfg:list") {
    const avail = db.data.configs.filter(c => !c.used_by).slice(0, 10);
    let txt = `${em(E.configs,"💎")} <b>کانفیگ‌های موجود (${avail.length})</b>\n\n`;
    avail.forEach((c, i) => { txt += `${i + 1}. <code>${c.config_text.slice(0, 40)}...</code>\n`; });
    if (avail.length === 0) txt += "کانفیگی موجود نیست.";
    return edit(txt, { inline_keyboard: [backBtn("adm:configs")] });
  }

  if (data === "adm:cfg:dellast") {
    const avail = db.data.configs.filter(c => !c.used_by);
    if (avail.length === 0) return edit("کانفیگ موجودی نیست!", { inline_keyboard: [backBtn("adm:configs")] });
    db.deleteConfig(avail[avail.length - 1].id);
    return edit(`${em(E.check,"✅")} آخرین کانفیگ موجود حذف شد.`, { inline_keyboard: [backBtn("adm:configs")] });
  }

  // ── CHANNELS ──
  if (data === "adm:channels") {
    const chs = JSON.parse(db.get("force_channels"));
    let txt = `${em(E.channels,"📡")} <b>کانال‌های اجباری</b>\n\n`;
    chs.forEach((c, i) => { txt += `${i + 1}. <b>${c.title}</b> | @${c.username}\n`; });
    if (chs.length === 0) txt += "هیچ کانالی ثبت نشده.";
    const btns = chs.map(c => [{ text: `${em(E.remove,"❌")} حذف @${c.username}`, callback_data: `adm:ch:del:${c.username}` }]);
    btns.push([{ text: `${em(E.add,"➕")} افزودن کانال جدید`, callback_data: "adm:ch:add" }]);
    btns.push(backBtn("adm:main"));
    return edit(txt, { inline_keyboard: btns });
  }

  if (data === "adm:ch:add") {
    setState(uid, "WAIT_CH_ADD", { msgId });
    return edit(
      `${em(E.add,"➕")} <b>افزودن کانال اجباری</b>\n\n` +
      `آیدی عددی یا @یوزرنیم کانال را ارسال کنید.\n\n<i>مثال: @myChannel یا -1001234567890</i>`,
      { parse_mode: "HTML", inline_keyboard: [backBtn("adm:channels")] }
    );
  }

  if (data.startsWith("adm:ch:del:")) {
    const uname = data.split(":")[3];
    const chs = JSON.parse(db.get("force_channels")).filter(c => c.username !== uname);
    db.set("force_channels", JSON.stringify(chs));
    return handleAdminCallback(q, uid, chatId, msgId, "adm:channels");
  }

  // ── MESSAGES ──
  if (data === "adm:messages") {
    return edit(
      `${em(E.messages,"✉️")} <b>ویرایش پیام‌ها</b>`,
      { inline_keyboard: [
        [{ text: `${em(E.fire,"🔥")} پیام خوش‌آمد`, callback_data: "adm:msg:welcome_text" }],
        [{ text: `${em(E.channels,"📌")} پیام عضویت اجباری`, callback_data: "adm:msg:force_join_text" }],
        [{ text: `${em(E.check,"✅")} متن دکمه عضویت`, callback_data: "adm:msg:force_join_btn" }],
        [{ text: `${em(E.configs,"💎")} پیام دریافت موفق اشتراک`, callback_data: "adm:msg:subscription_ok_text" }],
        [{ text: `${em(E.block,"❌")} پیام کانفیگ موجود نیست`, callback_data: "adm:msg:no_config_text" }],
        [{ text: `${em(E.coin,"💰")} پیام امتیاز ناکافی`, callback_data: "adm:msg:no_points_text" }],
        [{ text: `${em(E.star,"🎉")} اعلام رفرال به دعوت‌کننده`, callback_data: "adm:msg:referral_notify_text" }],
        [{ text: `${em(E.rules,"📋")} متن قوانین`, callback_data: "adm:msg:rules_text" }],
        [{ text: `${em(E.guide,"❓")} متن راهنما`, callback_data: "adm:msg:guide_text" }],
        [{ text: `${em(E.support,"💬")} پیام پشتیبانی`, callback_data: "adm:msg:support_text" }],
        [{ text: `${em(E.maintenance,"🔧")} پیام حالت تعمیر`, callback_data: "adm:msg:maintenance_text" }],
        [{ text: `${em(E.block,"🚫")} پیام مسدودی`, callback_data: "adm:msg:blocked_text" }],
        backBtn("adm:main"),
      ]}
    );
  }

  if (data.startsWith("adm:msg:")) {
    const key = data.replace("adm:msg:", "");
    setState(uid, "WAIT_MSG_EDIT", { key, msgId });
    const cur = db.get(key);
    return edit(
      `${em(E.edit,"✏️")} <b>ویرایش پیام</b>\n\n<b>متن فعلی:</b>\n${cur}\n\n<b>متن جدید را ارسال کنید:</b>\n<i>می‌توانید از HTML، ایموجی پریمیوم و متن دلخواه استفاده کنید</i>`,
      { parse_mode: "HTML", inline_keyboard: [backBtn("adm:messages")] }
    );
  }

  // ── KEYBOARD ──
  if (data === "adm:keyboard") {
    const rows = JSON.parse(db.get("main_keyboard"));
    let txt = `${em(E.keyboard,"⌨️")} <b>دکمه‌های کیبورد اصلی</b>\n\n`;
    rows.forEach((row, ri) => row.forEach((btn, bi) => {
      txt += `ردیف ${ri + 1} | دکمه ${bi + 1}: ${btn.text}\n`;
    }));
    return edit(txt, { inline_keyboard: [
      [{ text: `${em(E.add,"➕")} افزودن دکمه`, callback_data: "adm:kb:add" }],
      [{ text: `${em(E.remove,"🗑")} حذف دکمه`, callback_data: "adm:kb:remove" }],
      [{ text: `${em(E.settings,"🔄")} بازنشانی کیبورد پیش‌فرض`, callback_data: "adm:kb:reset" }],
      backBtn("adm:main"),
    ]});
  }

  if (data === "adm:kb:add") {
    setState(uid, "WAIT_KB_ADD", { msgId });
    return edit(
      `${em(E.add,"➕")} <b>افزودن دکمه جدید</b>\n\n` +
      `فرمت ارسال:\n<code>متن دکمه | ردیف | آیدی ایموجی پریمیوم (اختیاری)</code>\n\n` +
      `مثال:\n<code>اطلاعات | 3 | 5206607081334906820</code>\n\n` +
      `<i>ردیف از ۱ شروع می‌شود</i>`,
      { parse_mode: "HTML", inline_keyboard: [backBtn("adm:keyboard")] }
    );
  }

  if (data === "adm:kb:remove") {
    setState(uid, "WAIT_KB_REMOVE", { msgId });
    return edit(
      `${em(E.remove,"🗑")} <b>حذف دکمه</b>\n\nمتن دکمه‌ای که می‌خواهید حذف کنید را ارسال کنید:`,
      { inline_keyboard: [backBtn("adm:keyboard")] }
    );
  }

  if (data === "adm:kb:reset") {
    db.set("main_keyboard", JSON.stringify([
      [{ text: "دریافت اشتراک", emoji_id: E.download }],
      [{ text: "دعوت دوستان", emoji_id: E.invite }, { text: "پروفایل", emoji_id: E.profile }],
      [{ text: "قوانین", emoji_id: E.rules }, { text: "پشتیبانی", emoji_id: E.support }],
      [{ text: "راهنما", emoji_id: E.guide }],
    ]));
    return edit(`${em(E.check,"✅")} کیبورد به حالت پیش‌فرض بازنشانی شد.`, { inline_keyboard: [backBtn("adm:keyboard")] });
  }

  // ── SETTINGS ──
  if (data === "adm:settings") {
    return edit(
      `${em(E.settings,"⚙️")} <b>تنظیمات</b>\n\n` +
      `${em(E.coin,"💰")} هزینه اشتراک: <b>${db.get("subscription_cost")} امتیاز</b>\n` +
      `${em(E.add,"➕")} امتیاز هر دعوت: <b>${db.get("referral_points")}</b>`,
      { inline_keyboard: [
        [{ text: `${em(E.coin,"💰")} تغییر هزینه اشتراک`, callback_data: "adm:set:cost" }],
        [{ text: `${em(E.add,"➕")} تغییر امتیاز دعوت`, callback_data: "adm:set:ref" }],
        backBtn("adm:main"),
      ]}
    );
  }

  if (data === "adm:set:cost") { setState(uid, "WAIT_SET_COST", { msgId }); return edit(`${em(E.coin,"💰")} هزینه فعلی: <b>${db.get("subscription_cost")}</b>\n\nعدد جدید:`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:settings")] }); }
  if (data === "adm:set:ref") { setState(uid, "WAIT_SET_REF", { msgId }); return edit(`${em(E.add,"➕")} امتیاز دعوت فعلی: <b>${db.get("referral_points")}</b>\n\nعدد جدید:`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:settings")] }); }

  // ── MAINTENANCE ──
  if (data === "adm:toggle_maintenance") {
    const next = db.get("maintenance_mode") === "1" ? "0" : "1";
    db.set("maintenance_mode", next);
    return edit(
      `${em(E.maintenance,"🔧")} حالت تعمیر ${next === "1" ? "🔴 فعال" : "🟢 غیرفعال"} شد.`,
      { inline_keyboard: [backBtn("adm:main")] }
    );
  }

  // ── BROADCAST ──
  if (data === "adm:broadcast") {
    setState(uid, "WAIT_BROADCAST", { msgId });
    return edit(`${em(E.broadcast,"📢")} پیامی که می‌خواهید به همه ارسال شود را بفرستید:`, { inline_keyboard: [backBtn("adm:main")] });
  }
}

// ===== MESSAGE HANDLER =====
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (db.get("maintenance_mode") === "1" && !isAdmin(uid)) {
    return bot.sendMessage(chatId, db.get("maintenance_text"), { parse_mode: "HTML" });
  }

  const st = getState(uid);

  // Handle admin states
  if (isAdmin(uid) && st.s !== "IDLE") {
    return handleAdminState(uid, chatId, msg, st);
  }

  // Check user access
  if (!isAdmin(uid)) {
    const missing = await checkJoin(uid);
    if (missing.length > 0) return sendForceJoin(chatId, missing);
    const user = db.getUser(uid);
    if (user?.is_blocked) return bot.sendMessage(chatId, db.get("blocked_text"), { parse_mode: "HTML" });
  }

  // Main keyboard routing
  const rows = JSON.parse(db.get("main_keyboard"));
  const allBtns = rows.flat().map(b => b.text);

  if (text === "دریافت اشتراک" || allBtns[0] === text) return handleSubscription(uid, chatId);
  if (text === "دعوت دوستان") return handleInvite(uid, chatId);
  if (text === "پروفایل") return handleProfile(uid, chatId);
  if (text === "قوانین") return bot.sendMessage(chatId, db.get("rules_text"), { parse_mode: "HTML" });
  if (text === "پشتیبانی") return bot.sendMessage(chatId, db.get("support_text"), { parse_mode: "HTML" });
  if (text === "راهنما") return bot.sendMessage(chatId, db.get("guide_text"), { parse_mode: "HTML" });
  if (text === "بازگشت به منوی اصلی") return bot.sendMessage(chatId, "منوی اصلی", { reply_markup: buildMainKb() });

  // Check if text matches any custom button
  for (const row of rows) {
    for (const btn of row) {
      if (btn.text === text && btn.action) {
        return bot.sendMessage(chatId, btn.action, { parse_mode: "HTML" });
      }
    }
  }
});

// ===== ADMIN STATE HANDLER =====
async function handleAdminState(uid, chatId, msg, { s, d }) {
  const text = msg.text || "";

  const replyEdit = async (replyText, kb) => {
    clearState(uid);
    if (d.msgId) {
      try { return await bot.editMessageText(replyText, { chat_id: chatId, message_id: d.msgId, parse_mode: "HTML", reply_markup: kb }); } catch {}
    }
    return bot.sendMessage(chatId, replyText, { parse_mode: "HTML", reply_markup: kb });
  };

  switch (s) {
    case "WAIT_BROADCAST": {
      clearState(uid);
      const all = db.getAllUsers().filter(u => !u.is_blocked);
      let ok = 0, fail = 0;
      const statusMsg = await bot.sendMessage(chatId, `${em(E.broadcast,"📢")} در حال ارسال به ${all.length} کاربر...`, { parse_mode: "HTML" });
      for (const u of all) {
        try { await bot.copyMessage(u.user_id, chatId, msg.message_id); ok++; } catch { fail++; }
        await new Promise(r => setTimeout(r, 35));
      }
      try { await bot.editMessageText(`${em(E.check,"✅")} ارسال تمام!\n✅ موفق: ${ok}\n❌ ناموفق: ${fail}`, { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }); } catch {}
      break;
    }

    case "WAIT_USER_ID": {
      const tid = parseInt(text);
      if (isNaN(tid)) return bot.sendMessage(chatId, "آیدی نامعتبر!");
      const u = db.getUser(tid);
      if (!u) return replyEdit("کاربر یافت نشد!", { inline_keyboard: [backBtn("adm:users")] });
      clearState(uid);
      return handleAdminCallback({ message: { chat: { id: chatId }, message_id: d.msgId } }, uid, chatId, d.msgId, `adm:u:view:${tid}`);
    }

    case "WAIT_USER_UN": {
      const uname = text.replace("@", "");
      const u = db.findByUsername(uname);
      if (!u) return replyEdit("کاربر یافت نشد!", { inline_keyboard: [backBtn("adm:users")] });
      clearState(uid);
      return handleAdminCallback({ message: { chat: { id: chatId }, message_id: d.msgId } }, uid, chatId, d.msgId, `adm:u:view:${u.user_id}`);
    }

    case "WAIT_ADD_PTS": {
      const amt = parseInt(text);
      if (isNaN(amt)) return bot.sendMessage(chatId, "عدد نامعتبر!");
      db.addPoints(d.tid, amt, "admin_add", "افزودن توسط ادمین");
      try { await bot.sendMessage(d.tid, `${em(E.add,"💰")} <b>${amt} امتیاز</b> به حساب شما افزوده شد.`, { parse_mode: "HTML" }); } catch {}
      return replyEdit(`${em(E.check,"✅")} ${amt} امتیاز به <code>${d.tid}</code> اضافه شد.`, { parse_mode: "HTML", inline_keyboard: [backBtn(`adm:u:view:${d.tid}`)] });
    }

    case "WAIT_SET_PTS": {
      const amt = parseInt(text);
      if (isNaN(amt)) return bot.sendMessage(chatId, "عدد نامعتبر!");
      db.updateUser(d.tid, { points: amt });
      return replyEdit(`${em(E.check,"✅")} امتیاز <code>${d.tid}</code> به <b>${amt}</b> تنظیم شد.`, { parse_mode: "HTML", inline_keyboard: [backBtn(`adm:u:view:${d.tid}`)] });
    }

    case "WAIT_MSG_USR": {
      clearState(uid);
      try { await bot.copyMessage(d.tid, chatId, msg.message_id); await bot.sendMessage(chatId, `${em(E.check,"✅")} پیام ارسال شد.`, { parse_mode: "HTML" }); }
      catch { await bot.sendMessage(chatId, `${em(E.block,"❌")} ارسال ناموفق.`, { parse_mode: "HTML" }); }
      break;
    }

    case "WAIT_SVC_CFG": {
      clearState(uid);
      try {
        await bot.sendMessage(d.tid, `${em(E.configs,"🎁")} <b>سرویس دستی دریافت شد:</b>\n\n<code>${text}</code>`, { parse_mode: "HTML" });
        db.addConfig(text, uid);
        db.markConfigUsed(db.data.configs[db.data.configs.length - 1].id, d.tid);
        const u = db.getUser(d.tid);
        if (u) db.updateUser(d.tid, { services_received: u.services_received + 1 });
        await bot.sendMessage(chatId, `${em(E.check,"✅")} سرویس به <code>${d.tid}</code> ارسال شد.`, { parse_mode: "HTML" });
      } catch { await bot.sendMessage(chatId, `${em(E.block,"❌")} ارسال ناموفق.`, { parse_mode: "HTML" }); }
      break;
    }

    case "WAIT_CFG_ADD": {
      clearState(uid);
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      for (const line of lines) db.addConfig(line, uid);
      return replyEdit(`${em(E.check,"✅")} <b>${lines.length}</b> کانفیگ اضافه شد.`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:configs")] });
    }

    case "WAIT_CH_ADD": {
      clearState(uid);
      // Extract username from various formats: @username, t.me/username, -100xxx, raw username
      let uname = text.trim();
      if (uname.startsWith("https://t.me/")) uname = uname.replace("https://t.me/", "");
      if (uname.startsWith("t.me/")) uname = uname.replace("t.me/", "");
      if (uname.startsWith("@")) uname = uname.slice(1);

      // Try to get chat info
      try {
        const chat = await bot.getChat("@" + uname);
        const title = chat.title || uname;
        const chs = JSON.parse(db.get("force_channels"));
        if (chs.find(c => c.username === uname)) {
          return replyEdit(`${em(E.block,"❌")} این کانال قبلاً اضافه شده.`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:channels")] });
        }
        chs.push({ username: uname, title, url: `https://t.me/${uname}` });
        db.set("force_channels", JSON.stringify(chs));
        return replyEdit(`${em(E.check,"✅")} کانال <b>${title}</b> (@${uname}) اضافه شد.\n\n${em(E.alarm,"⚠️")} مطمئن شوید ربات ادمین کانال است.`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:channels")] });
      } catch {
        // Can't get info, add manually
        const chs = JSON.parse(db.get("force_channels"));
        chs.push({ username: uname, title: uname, url: `https://t.me/${uname}` });
        db.set("force_channels", JSON.stringify(chs));
        return replyEdit(`${em(E.check,"✅")} کانال @${uname} اضافه شد.\n\n${em(E.alarm,"⚠️")} ربات باید ادمین کانال باشد.`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:channels")] });
      }
    }

    case "WAIT_MSG_EDIT": {
      clearState(uid);
      db.set(d.key, text);
      return replyEdit(`${em(E.check,"✅")} پیام با موفقیت ذخیره شد.`, { inline_keyboard: [backBtn("adm:messages")] });
    }

    case "WAIT_KB_ADD": {
      clearState(uid);
      const parts = text.split("|").map(p => p.trim());
      if (parts.length < 2) return bot.sendMessage(chatId, "فرمت نادرست! مثال: متن | ردیف | ایموجی_آیدی");
      const btnText = parts[0];
      const rowIdx = parseInt(parts[1]) - 1;
      const emojiId = parts[2] || null;
      if (isNaN(rowIdx) || rowIdx < 0) return bot.sendMessage(chatId, "شماره ردیف نامعتبر!");
      const rows = JSON.parse(db.get("main_keyboard"));
      while (rows.length <= rowIdx) rows.push([]);
      rows[rowIdx].push({ text: btnText, ...(emojiId ? { emoji_id: emojiId } : {}) });
      db.set("main_keyboard", JSON.stringify(rows));
      return replyEdit(`${em(E.check,"✅")} دکمه «${btnText}» به ردیف ${rowIdx + 1} اضافه شد.`, { inline_keyboard: [backBtn("adm:keyboard")] });
    }

    case "WAIT_KB_REMOVE": {
      clearState(uid);
      const rows = JSON.parse(db.get("main_keyboard"));
      let found = false;
      const newRows = rows.map(row => row.filter(btn => { if (btn.text === text) { found = true; return false; } return true; })).filter(r => r.length > 0);
      if (!found) return bot.sendMessage(chatId, "دکمه‌ای با این متن یافت نشد!");
      db.set("main_keyboard", JSON.stringify(newRows));
      return replyEdit(`${em(E.check,"✅")} دکمه «${text}» حذف شد.`, { inline_keyboard: [backBtn("adm:keyboard")] });
    }

    case "WAIT_SET_COST": {
      const v = parseInt(text);
      if (isNaN(v)) return bot.sendMessage(chatId, "عدد نامعتبر!");
      db.set("subscription_cost", String(v));
      return replyEdit(`${em(E.check,"✅")} هزینه اشتراک: <b>${v} امتیاز</b>`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:settings")] });
    }

    case "WAIT_SET_REF": {
      const v = parseInt(text);
      if (isNaN(v)) return bot.sendMessage(chatId, "عدد نامعتبر!");
      db.set("referral_points", String(v));
      return replyEdit(`${em(E.check,"✅")} امتیاز هر دعوت: <b>${v}</b>`, { parse_mode: "HTML", inline_keyboard: [backBtn("adm:settings")] });
    }
  }
}

// ===== USER FEATURE HANDLERS =====
async function handleSubscription(uid, chatId) {
  const user = db.getUser(uid);
  if (!user) { db.createUser(uid, null, null, null); return handleSubscription(uid, chatId); }
  const cost = parseInt(db.get("subscription_cost") || "2");

  if (user.points < cost) {
    const shortage = cost - user.points;
    let txt = db.get("no_points_text")
      .replace("{cost}", cost)
      .replace("{points}", user.points)
      .replace("{shortage}", shortage);
    return bot.sendMessage(chatId, txt, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: `${em(E.invite,"👥")} دعوت دوستان`, callback_data: "goto_invite" }]] },
    });
  }

  const config = db.getAvailableConfig();
  if (!config) return bot.sendMessage(chatId, db.get("no_config_text"), { parse_mode: "HTML" });

  db.addPoints(uid, -cost, "subscription", "دریافت اشتراک");
  db.markConfigUsed(config.id, uid);
  db.updateUser(uid, { services_received: user.services_received + 1 });

  let txt = db.get("subscription_ok_text")
    .replace("{cost}", cost)
    .replace("{remaining}", user.points - cost)
    .replace("{config}", config.config_text);
  await bot.sendMessage(chatId, txt, { parse_mode: "HTML" });
}

async function handleInvite(uid, chatId) {
  const user = db.getUser(uid);
  if (!user) return;
  const pts = db.get("referral_points") || "1";
  const cost = db.get("subscription_cost") || "2";
  const link = `https://t.me/${ME.username}?start=add_${uid}`;
  await bot.sendMessage(chatId,
    `${em(E.invite,"🎁")} <b>سیستم دعوت دوستان</b>\n\n` +
    `${em(E.add,"➕")} امتیاز هر دعوت: <b>${pts}</b>\n` +
    `${em(E.clan,"👥")} تعداد دعوت‌های شما: <b>${user.referral_count}</b>\n` +
    `${em(E.check,"🏅")} امتیاز فعلی: <b>${user.points}</b>\n\n` +
    `${em(E.guide,"🔗")} <b>لینک دعوت اختصاصی:</b>\n<code>${link}</code>\n\n` +
    `${em(E.bell,"💡")} با هر دعوت <b>${pts} امتیاز</b> و با <b>${cost} امتیاز</b> اشتراک رایگان!`,
    { parse_mode: "HTML" }
  );
}

async function handleProfile(uid, chatId) {
  const user = db.getUser(uid);
  if (!user) return;
  const uname = user.username ? `@${user.username}` : "—";
  await bot.sendMessage(chatId,
    `${em(E.profile,"👤")} <b>پروفایل شما</b>\n\n` +
    `${em(E.star,"🆔")} آیدی: <code>${uid}</code>\n` +
    `${em(E.users,"👤")} نام: ${user.first_name || "—"}\n` +
    `${em(E.edit,"ℹ️")} یوزرنیم: ${uname}\n` +
    `${em(E.coin,"💰")} امتیاز: <b>${user.points}</b>\n` +
    `${em(E.clan,"👥")} دعوت‌ها: <b>${user.referral_count}</b>\n` +
    `${em(E.configs,"🏆")} سرویس‌ها: <b>${user.services_received}</b>\n` +
    `${em(E.calendar,"📅")} عضویت: ${user.join_date || "—"}`,
    { parse_mode: "HTML" }
  );
}

// ===== HEALTH SERVER =====
const server = http.createServer((_, res) => { res.writeHead(200); res.end("OK"); });
server.listen(PORT, () => console.log(`Health server on port ${PORT}`));

bot.on("polling_error", (e) => console.error("Polling:", e.message));
process.on("SIGTERM", () => { db.saveSync(); bot.stopPolling(); server.close(); process.exit(0); });
