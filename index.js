const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const ADMIN_IDS = [6622580245];
const DB_PATH = process.env.DB_PATH || "./bot.db.json";

// ===== PREMIUM EMOJI IDs =====
const E = {
  download:    "5206607081334906820",
  invite:      "5422439311196834318",
  profile:     "5213383002129702114",
  rules:       "5461117441612462242",
  support:     "5264713049637409446",
  guide:       "5785033300867288899",
  stats:       "5395444784611480792",
  status:      "5231200819986047254",
  topInvites:  "5427009714745517609",
  lastUsers:   "5400250414929041085",
  richest:     "5190806721286657692",
  topService:  "5436113877181941026",
  broadcast:   "5413704112220949842",
  msgUser:     "5334544901428229844",
  userInfo:    "5436040291507247633",
  search:      "5375296873982604963",
  unblock:     "5440660757194744323",
  block:       "5447644880824181073",
  addCoin:     "5271604874419647061",
  setCoin:     "5472027899789843495",
  resetCoin:   "5472308992514464048",
  manualSvc:   "5246989476248429334",
  welcome:     "5240241223632954241",
  deleteUser:  "5453957997418004470",
  coinSettings:"5472363448404809929",
  channels:    "5424818078833715060",
  allUsers:    "5231200819986047254",
  monthly:     "5391112412445288650",
  configs:     "5994495364084796671",
  report:      "6032751234790726550",
  maintenance: "5255883984151276991",
  back:        "6300757202651055745",
  coin:        "5190806721286657692",
  check:       "5440660757194744323",
  star:        "6037618875846102911",
  fire:        "5785193735075663481",
  bell:        "5785219784052314091",
  gem:         "4981404027402061416",
  clan:        "5436113877181941026",
  calendar:    "5391112412445288650",
  add:         "5271604874419647061",
  alarm:       "5924664865208671041",
  edit:        "5334544901428229844",
  keyboard:    "5421516124027482021",
  share:       "5422439311196834318",
};

// Premium emoji — use ONLY in message text (parse_mode: HTML), never in button .text
const em = (id, fb = "•") => `<tg-emoji emoji-id="${id}">${fb}</tg-emoji>`;

// ===== DATABASE =====
class DB {
  constructor(path) {
    this.path = path;
    this._t = null;
    this.load();
  }

  load() {
    try { this.data = JSON.parse(fs.readFileSync(this.path, "utf8")); } catch { this.data = {}; }
    if (!this.data.s) this.data.s = {};   // settings
    if (!this.data.u) this.data.u = {};   // users
    if (!this.data.c) this.data.c = [];   // configs
    if (!this.data.tx) this.data.tx = []; // transactions
    if (!this.data.cid) this.data.cid = 1;

    const def = {
      welcome:       `${em(E.fire,"🔥")} <b>به ربات کانفیگ رایگان خوش آمدید</b>\n\n${em(E.bell,"🔔")} با این ربات:\n${em(E.check,"✅")} کانفیگ رایگان دریافت کنید\n${em(E.check,"✅")} با دعوت دوستان امتیاز بگیرید\n${em(E.check,"✅")} با امتیاز، اشتراک رایگان بگیرید`,
      forcejoin:     `${em(E.channels,"📡")} <b>برای استفاده از ربات ابتدا عضو کانال‌های زیر شوید</b>\n\n${em(E.alarm,"💡")} پس از عضویت دکمه تأیید را بزنید.`,
      forcebtn:      "تأیید عضویت",
      sub_ok:        `${em(E.gem,"💎")} <b>اشتراک با موفقیت دریافت شد!</b>\n\n${em(E.gem,"💎")} لینک اشتراک:\n<code>{config}</code>\n\n${em(E.gem,"💎")} این لینک را در برنامه V2ray وارد کنید.\n${em(E.gem,"💎")} امتیاز کسر شده: {cost}\n${em(E.gem,"💎")} امتیاز باقیمانده: {remaining}`,
      sub_noconfig:  `${em(E.alarm,"❌")} <b>در حال حاضر کانفیگی موجود نیست!</b>\n\n${em(E.bell,"💡")} لطفاً بعداً مراجعه کنید.`,
      sub_nopoints:  `${em(E.alarm,"❌")} <b>امتیاز کافی نیست!</b>\n\n${em(E.gem,"💎")} هزینه اشتراک: <b>{cost} امتیاز</b>\n${em(E.coin,"🏅")} امتیاز شما: <b>{points}</b>\n${em(E.star,"🔻")} کمبود: <b>{shortage} امتیاز</b>\n\n${em(E.invite,"💡")} با دعوت دوستان امتیاز کسب کنید!`,
      ref_notify:    `${em(E.star,"🎉")} <b>زیرمجموعه جدید!</b>\n\n${em(E.bell,"🟡")} {name} به ربات پیوست\n\n${em(E.coin,"💰")} امتیاز شما:\n${em(E.add,"➕")} قبل: {before} → بعد: <b>{after}</b> (+{pts})\n\n${em(E.clan,"👥")} کل زیرمجموعه‌های شما: {total}`,
      blocked:       `${em(E.block,"🚫")} <b>حساب شما مسدود شده است.</b>`,
      maintenance:   `${em(E.maintenance,"🔧")} <b>ربات موقتاً در حالت تعمیر است. بعداً مراجعه کنید.</b>`,
      rules:         `${em(E.rules,"📋")} <b>قوانین استفاده</b>\n\n${em(E.check,"🔒")} اطلاعات شما محرمانه است.\n${em(E.clan,"👥")} تقلب در دعوت = مسدودی دائم.\n${em(E.block,"🚫")} اشتراک فقط برای استفاده شخصی.\n${em(E.alarm,"‼️")} استفاده مخرب ممنوع.`,
      guide:         `${em(E.guide,"❓")} <b>راهنما</b>\n\n${em(E.add,"1️⃣")} از بخش «دعوت» لینک اختصاصی بگیر.\n${em(E.share,"2️⃣")} لینک را برای دوستان بفرست.\n${em(E.gem,"3️⃣")} با امتیاز از «دریافت اشتراک» کانفیگ بگیر.`,
      support:       "فاقد ورودی!",
      cost:          "2",
      ref_pts:       "1",
      maintain:      "0",
      force_chs:     JSON.stringify([{ username: "lnterFreedom", title: "InterFreedom", url: "https://t.me/lnterFreedom" }]),
      main_kb:       JSON.stringify([
        [{ text: "دریافت اشتراک", eid: E.download, primary: true }],
        [{ text: "دعوت دوستان", eid: E.invite, primary: true }, { text: "پروفایل", eid: E.profile }],
        [{ text: "قوانین", eid: E.rules }, { text: "پشتیبانی", eid: E.support }],
        [{ text: "راهنما", eid: E.guide }],
      ]),
    };
    for (const [k, v] of Object.entries(def)) {
      if (this.data.s[k] === undefined) this.data.s[k] = v;
    }
    this.save();
  }

  save() { clearTimeout(this._t); this._t = setTimeout(() => { try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch {} }, 400); }
  saveSync() { try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch {} }

  get(k) { return this.data.s[k] ?? ""; }
  set(k, v) { this.data.s[k] = v; this.save(); }

  getUser(id) { return this.data.u[String(id)] || null; }
  createUser(id, uname, fname, lname, ref = null) {
    const k = String(id);
    if (this.data.u[k]) {
      if (uname !== undefined) this.data.u[k].uname = uname || this.data.u[k].uname;
      if (fname) this.data.u[k].fname = fname;
      this.save();
      return false; // not new
    }
    this.data.u[k] = { id, uname: uname || null, fname: fname || null, lname: lname || null, pts: 0, refs: 0, ref_by: ref, joined: ts(), blocked: 0, svcs: 0, refs_done: [] };
    this.save();
    return true; // new
  }
  updateUser(id, patch) { const u = this.getUser(id); if (u) { Object.assign(u, patch); this.save(); } }
  addPts(id, amt, type, desc) {
    const u = this.getUser(id);
    if (u) { u.pts += amt; this.data.tx.push({ id: Date.now() + Math.random(), uid: id, amt, type, desc, at: ts() }); this.save(); }
  }
  allUsers() { return Object.values(this.data.u); }
  freeConfig() { return this.data.c.find(c => !c.used_by) || null; }
  addConfig(text, by) { const c = { id: this.data.cid++, txt: text, by, used_by: null, used_at: null, at: ts() }; this.data.c.push(c); this.save(); return c; }
  useConfig(id, uid) { const c = this.data.c.find(c => c.id === id); if (c) { c.used_by = uid; c.used_at = ts(); this.save(); } }
  delConfig(id) { this.data.c = this.data.c.filter(c => c.id !== id); this.save(); }
  delUser(id) { delete this.data.u[String(id)]; this.save(); }
  findByUname(u) { return Object.values(this.data.u).find(x => x.uname === u) || null; }
  // Check if referrer already counted this user
  refAlreadyDone(refId, newUserId) {
    const u = this.getUser(refId);
    return u && Array.isArray(u.refs_done) && u.refs_done.includes(String(newUserId));
  }
  markRefDone(refId, newUserId) {
    const u = this.getUser(refId);
    if (u) { if (!Array.isArray(u.refs_done)) u.refs_done = []; u.refs_done.push(String(newUserId)); this.save(); }
  }
}

function ts() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

if (!TOKEN) { console.error("BOT_TOKEN required"); process.exit(1); }

const db = new DB(DB_PATH);
const isAdmin = id => ADMIN_IDS.includes(Number(id));
const bot = new TelegramBot(TOKEN, { polling: true });
let ME = { username: "bot" };
bot.getMe().then(m => { ME = m; console.log("Bot:", m.username); }).catch(console.error);

const states = new Map();
const getState = uid => states.get(uid) || { s: "IDLE", d: {} };
const setState = (uid, s, d = {}) => states.set(uid, { s, d });
const clearState = uid => states.delete(uid);

// Store pending referrals before force-join completes
const pendingRef = new Map(); // uid -> referrerId

// ===== KEYBOARDS =====
function mainKb() {
  const rows = JSON.parse(db.get("main_kb"));
  return {
    keyboard: rows.map(row => row.map(b => ({
      text: b.text,
      ...(b.eid ? { icon_custom_emoji_id: b.eid } : {}),
      ...(b.primary ? { style: "primary" } : {}),
    }))),
    resize_keyboard: true,
  };
}

function adminKb() {
  return {
    keyboard: [
      [{ text: "آمار کامل", icon_custom_emoji_id: E.stats }, { text: "وضعیت ربات", icon_custom_emoji_id: E.status }],
      [{ text: "برترین دعوت‌ها", icon_custom_emoji_id: E.topInvites }, { text: "آخرین کاربران", icon_custom_emoji_id: E.lastUsers }],
      [{ text: "ثروتمندترین‌ها", icon_custom_emoji_id: E.richest }, { text: "بیشترین سرویس", icon_custom_emoji_id: E.topService }],
      [{ text: "پیام همگانی", icon_custom_emoji_id: E.broadcast }, { text: "پیام به کاربر", icon_custom_emoji_id: E.msgUser }],
      [{ text: "اطلاعات کاربر", icon_custom_emoji_id: E.userInfo }, { text: "جستجوی کاربر", icon_custom_emoji_id: E.search }],
      [{ text: "رفع مسدودی", icon_custom_emoji_id: E.unblock }, { text: "مسدود کردن", icon_custom_emoji_id: E.block }],
      [{ text: "افزودن سکه", icon_custom_emoji_id: E.addCoin }, { text: "تنظیم سکه", icon_custom_emoji_id: E.setCoin }],
      [{ text: "ری‌ست سکه", icon_custom_emoji_id: E.resetCoin }, { text: "سرویس دستی", icon_custom_emoji_id: E.manualSvc }],
      [{ text: "متن خوش‌آمد", icon_custom_emoji_id: E.welcome }, { text: "حذف کاربر", icon_custom_emoji_id: E.deleteUser }],
      [{ text: "تنظیمات سکه‌ها", icon_custom_emoji_id: E.coinSettings }, { text: "کانال‌های اجباری", icon_custom_emoji_id: E.channels }],
      [{ text: "ویرایش پیام‌ها", icon_custom_emoji_id: E.edit }, { text: "مدیریت دکمه‌ها", icon_custom_emoji_id: E.keyboard }],
      [{ text: "مدیریت کانفیگ", icon_custom_emoji_id: E.configs }, { text: "گزارش کامل", icon_custom_emoji_id: E.report }],
      [{ text: "همه کاربران", icon_custom_emoji_id: E.allUsers }, { text: "آمار ماهانه", icon_custom_emoji_id: E.monthly }],
      [{ text: "حالت تعمیر", icon_custom_emoji_id: E.maintenance }],
      [{ text: "بازگشت به منوی اصلی", icon_custom_emoji_id: E.back }],
    ],
    resize_keyboard: true,
  };
}

// ===== FORCE JOIN =====
async function checkJoin(uid) {
  const chs = JSON.parse(db.get("force_chs"));
  const missing = [];
  for (const ch of chs) {
    try { const m = await bot.getChatMember("@" + ch.username, uid); if (["left", "kicked"].includes(m.status)) missing.push(ch); }
    catch { missing.push(ch); }
  }
  return missing;
}

async function sendFJ(chatId, chs) {
  const btns = chs.map(ch => [{ text: ch.title, url: ch.url }]);
  btns.push([{ text: db.get("forcebtn"), callback_data: "fj:check" }]);
  await bot.sendMessage(chatId, db.get("forcejoin"), { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } });
}

// ===== /start =====
bot.onText(/\/start(.*)/, async (msg, match) => {
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const param = (match[1] || "").trim();

  if (db.get("maintain") === "1" && !isAdmin(uid))
    return bot.sendMessage(chatId, db.get("maintenance"), { parse_mode: "HTML" });

  // Save referral before join check
  if (param.startsWith("add_")) {
    const rid = parseInt(param.replace("add_", ""));
    if (!isNaN(rid) && rid !== uid) pendingRef.set(uid, rid);
  }

  const missing = await checkJoin(uid);
  if (missing.length > 0) return sendFJ(chatId, missing);

  await doStart(uid, chatId, msg.from);
});

// ===== /admin =====
bot.onText(/\/admin/, async (msg) => {
  if (!isAdmin(msg.from.id)) return;
  clearState(msg.from.id);
  await bot.sendMessage(msg.chat.id,
    `${em(E.stats,"📊")} <b>پنل مدیریت</b> ${em(E.check,"✅")}`,
    { parse_mode: "HTML", reply_markup: adminKb() }
  );
});

// ===== doStart — called after force-join verified =====
async function doStart(uid, chatId, from) {
  const refBy = pendingRef.get(uid) || null;
  pendingRef.delete(uid);

  const isNew = db.createUser(uid, from.username, from.first_name, from.last_name, refBy);

  // Process referral only once per user
  if (isNew && refBy) {
    const refUser = db.getUser(refBy);
    // Only reward if: referrer exists, not blocked, hasn't already counted this user
    if (refUser && !refUser.blocked && !db.refAlreadyDone(refBy, uid)) {
      const pts = parseInt(db.get("ref_pts") || "1");
      const before = refUser.pts;
      db.addPts(refBy, pts, "ref", `دعوت ${from.username ? "@" + from.username : uid}`);
      db.updateUser(refBy, { refs: refUser.refs + 1 });
      db.markRefDone(refBy, uid);
      try {
        const name = from.username ? `@${from.username}` : (from.first_name || String(uid));
        let txt = db.get("ref_notify")
          .replace("{name}", name).replace("{before}", before)
          .replace("{after}", before + pts).replace("{pts}", pts)
          .replace("{total}", refUser.refs + 1);
        await bot.sendMessage(refBy, txt, { parse_mode: "HTML" });
      } catch {}
    }
  }

  const user = db.getUser(uid);
  if (user?.blocked) return bot.sendMessage(chatId, db.get("blocked"), { parse_mode: "HTML" });

  await bot.sendMessage(chatId, db.get("welcome"), { parse_mode: "HTML", reply_markup: mainKb() });
}

// ===== CALLBACK QUERY =====
bot.on("callback_query", async (q) => {
  const uid = q.from.id;
  const chatId = q.message.chat.id;
  const msgId = q.message.message_id;

  if (q.data === "fj:check") {
    const missing = await checkJoin(uid);
    if (missing.length > 0)
      return bot.answerCallbackQuery(q.id, { text: "هنوز عضو همه کانال‌ها نشدی!", show_alert: true });
    await bot.answerCallbackQuery(q.id, { text: "عضویت تأیید شد!" });
    try { await bot.deleteMessage(chatId, msgId); } catch {}
    // Do NOT createUser here — let doStart handle it with referral
    return doStart(uid, chatId, q.from);
  }

  if (q.data === "go:invite") { await bot.answerCallbackQuery(q.id); return showInvite(uid, chatId); }

  await bot.answerCallbackQuery(q.id);
});

// ===== MESSAGE HANDLER =====
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (db.get("maintain") === "1" && !isAdmin(uid))
    return bot.sendMessage(chatId, db.get("maintenance"), { parse_mode: "HTML" });

  const st = getState(uid);
  if (st.s !== "IDLE") return handleState(uid, chatId, msg, st);

  if (!isAdmin(uid)) {
    const missing = await checkJoin(uid);
    if (missing.length > 0) return sendFJ(chatId, missing);
    const user = db.getUser(uid);
    if (user?.blocked) return bot.sendMessage(chatId, db.get("blocked"), { parse_mode: "HTML" });
  }

  // User menu
  if (text === "دریافت اشتراک") return showSub(uid, chatId);
  if (text === "دعوت دوستان")    return showInvite(uid, chatId);
  if (text === "پروفایل")        return showProfile(uid, chatId);
  if (text === "قوانین")         return bot.sendMessage(chatId, db.get("rules"), { parse_mode: "HTML" });
  if (text === "پشتیبانی")       return bot.sendMessage(chatId, db.get("support"), { parse_mode: "HTML" });
  if (text === "راهنما")         return bot.sendMessage(chatId, db.get("guide"), { parse_mode: "HTML" });
  if (text === "بازگشت به منوی اصلی") { clearState(uid); return bot.sendMessage(chatId, "منوی اصلی", { reply_markup: mainKb() }); }

  if (!isAdmin(uid)) return;

  // Admin menu
  switch (text) {
    case "آمار کامل":       return adminStats(chatId);
    case "وضعیت ربات":      return adminStatus(chatId);
    case "برترین دعوت‌ها":   return adminTopInv(chatId);
    case "آخرین کاربران":   return adminLastU(chatId);
    case "ثروتمندترین‌ها":   return adminRichest(chatId);
    case "بیشترین سرویس":   return adminTopSvc(chatId);
    case "پیام همگانی":     setState(uid,"BC",{}); return bot.sendMessage(chatId, `${em(E.broadcast,"📢")} پیام را ارسال کنید:`, { parse_mode:"HTML" });
    case "پیام به کاربر":   setState(uid,"MSG_UID",{}); return bot.sendMessage(chatId, `${em(E.msgUser,"📨")} آیدی عددی کاربر:`, { parse_mode:"HTML" });
    case "اطلاعات کاربر":   setState(uid,"INFO_UID",{}); return bot.sendMessage(chatId, `${em(E.userInfo,"👤")} آیدی عددی کاربر:`, { parse_mode:"HTML" });
    case "جستجوی کاربر":    setState(uid,"SRCH",{}); return bot.sendMessage(chatId, `${em(E.search,"🔍")} آیدی یا @یوزرنیم:`, { parse_mode:"HTML" });
    case "رفع مسدودی":      setState(uid,"UNBLK",{}); return bot.sendMessage(chatId, `${em(E.unblock,"✅")} آیدی کاربر:`, { parse_mode:"HTML" });
    case "مسدود کردن":      setState(uid,"BLK",{}); return bot.sendMessage(chatId, `${em(E.block,"🚫")} آیدی کاربر:`, { parse_mode:"HTML" });
    case "افزودن سکه":      setState(uid,"ADDPTS_UID",{}); return bot.sendMessage(chatId, `${em(E.addCoin,"💰")} آیدی کاربر:`, { parse_mode:"HTML" });
    case "تنظیم سکه":       setState(uid,"SETPTS_UID",{}); return bot.sendMessage(chatId, `${em(E.setCoin,"💲")} آیدی کاربر:`, { parse_mode:"HTML" });
    case "ری‌ست سکه":       setState(uid,"RSTPTS",{}); return bot.sendMessage(chatId, `${em(E.resetCoin,"🔄")} آیدی کاربر:`, { parse_mode:"HTML" });
    case "سرویس دستی":      setState(uid,"SVC_UID",{}); return bot.sendMessage(chatId, `${em(E.manualSvc,"🎁")} آیدی کاربر:`, { parse_mode:"HTML" });
    case "متن خوش‌آمد":     setState(uid,"EDIT_MSG",{key:"welcome"}); return bot.sendMessage(chatId, `${em(E.welcome,"📝")} متن جدید خوش‌آمد:\n<i>از ایموجی پریمیوم استفاده کنید</i>`, { parse_mode:"HTML" });
    case "حذف کاربر":       setState(uid,"DEL_UID",{}); return bot.sendMessage(chatId, `${em(E.deleteUser,"🗑")} آیدی کاربر:`, { parse_mode:"HTML" });
    case "تنظیمات سکه‌ها":   return adminCoinMenu(uid, chatId);
    case "کانال‌های اجباری": return adminChMenu(uid, chatId);
    case "ویرایش پیام‌ها":   return adminMsgMenu(uid, chatId);
    case "مدیریت دکمه‌ها":   return adminKbMenu(uid, chatId);
    case "مدیریت کانفیگ":   return adminCfgMenu(uid, chatId);
    case "گزارش کامل":      return adminReport(chatId);
    case "همه کاربران":      return adminAllUsers(chatId);
    case "آمار ماهانه":      return adminMonthly(chatId);
    case "حالت تعمیر":      return adminToggleMaintain(chatId);
  }
});

// ===== ADMIN FEATURES =====
async function adminStats(chatId) {
  const u = db.allUsers(), c = db.data.c;
  return bot.sendMessage(chatId,
    `${em(E.stats,"📊")} <b>آمار کامل</b>\n\n` +
    `${em(E.allUsers,"👥")} کل کاربران: <b>${u.length}</b>\n` +
    `${em(E.block,"🚫")} مسدود: <b>${u.filter(x=>x.blocked).length}</b>\n` +
    `${em(E.configs,"💎")} کانفیگ کل: <b>${c.length}</b> | موجود: <b>${c.filter(x=>!x.used_by).length}</b>\n` +
    `${em(E.coin,"💰")} کل امتیازات: <b>${u.reduce((s,x)=>s+x.pts,0)}</b>\n` +
    `${em(E.maintenance,"🔧")} وضعیت: ${db.get("maintain")==="1"?"🔴 تعمیر":"🟢 فعال"}`,
    { parse_mode:"HTML" }
  );
}

async function adminStatus(chatId) {
  const u = db.allUsers();
  return bot.sendMessage(chatId,
    `${em(E.status,"📋")} <b>وضعیت ربات</b>\n\n` +
    `${em(E.check,"🟢")} وضعیت: <b>آنلاین</b>\n` +
    `${em(E.allUsers,"👥")} کاربران: <b>${u.length}</b>\n` +
    `${em(E.configs,"💎")} کانفیگ موجود: <b>${db.data.c.filter(x=>!x.used_by).length}</b>\n` +
    `${em(E.coin,"💰")} هزینه اشتراک: <b>${db.get("cost")} امتیاز</b>\n` +
    `${em(E.add,"➕")} امتیاز هر دعوت: <b>${db.get("ref_pts")}</b>\n` +
    `${em(E.maintenance,"🔧")} حالت تعمیر: ${db.get("maintain")==="1"?"🔴 فعال":"🟢 غیرفعال"}`,
    { parse_mode:"HTML" }
  );
}

async function adminTopInv(chatId) {
  const top = db.allUsers().sort((a,b)=>b.refs-a.refs).slice(0,10);
  let txt = `${em(E.topInvites,"👥")} <b>برترین دعوت‌ها</b>\n\n`;
  top.forEach((u,i) => { txt += `${i+1}. ${u.uname?"@"+u.uname:u.fname||"ناشناس"} | ${em(E.clan,"👥")} ${u.refs}\n`; });
  return bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
}

async function adminLastU(chatId) {
  const top = db.allUsers().sort((a,b)=>(b.joined||"").localeCompare(a.joined||"")).slice(0,15);
  let txt = `${em(E.lastUsers,"🕐")} <b>آخرین کاربران</b>\n\n`;
  top.forEach((u,i) => { txt += `${i+1}. ${u.uname?"@"+u.uname:u.fname||"ناشناس"} | <code>${u.id}</code>\n`; });
  return bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
}

async function adminRichest(chatId) {
  const top = db.allUsers().sort((a,b)=>b.pts-a.pts).slice(0,10);
  let txt = `${em(E.richest,"💰")} <b>ثروتمندترین‌ها</b>\n\n`;
  top.forEach((u,i) => { txt += `${i+1}. ${u.uname?"@"+u.uname:u.fname||"ناشناس"} | ${em(E.coin,"💰")} ${u.pts}\n`; });
  return bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
}

async function adminTopSvc(chatId) {
  const top = db.allUsers().sort((a,b)=>b.svcs-a.svcs).slice(0,10);
  let txt = `${em(E.topService,"🏆")} <b>بیشترین سرویس</b>\n\n`;
  top.forEach((u,i) => { txt += `${i+1}. ${u.uname?"@"+u.uname:u.fname||"ناشناس"} | ${em(E.topService,"🏆")} ${u.svcs}\n`; });
  return bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
}

async function adminAllUsers(chatId) {
  const u = db.allUsers();
  let txt = `${em(E.allUsers,"📋")} <b>همه کاربران (${u.length})</b>\n\n`;
  u.slice(0,25).forEach((x,i) => { txt += `${i+1}. ${x.blocked?"🔴":"🟢"} ${x.uname?"@"+x.uname:x.fname||"ناشناس"} | <code>${x.id}</code>\n`; });
  if (u.length>25) txt += `\n... و ${u.length-25} نفر دیگر`;
  return bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
}

async function adminMonthly(chatId) {
  const m = new Date().toISOString().slice(0,7);
  const u = db.allUsers(), newU = u.filter(x=>x.joined?.startsWith(m)).length;
  const txs = db.data.tx.filter(t=>t.at?.startsWith(m)&&t.amt>0);
  return bot.sendMessage(chatId,
    `${em(E.monthly,"📅")} <b>آمار ماهانه (${m})</b>\n\n` +
    `${em(E.allUsers,"👥")} کاربران جدید: <b>${newU}</b>\n` +
    `${em(E.coin,"💰")} امتیازات داده‌شده: <b>${txs.reduce((s,t)=>s+t.amt,0)}</b>\n` +
    `${em(E.check,"✅")} تراکنش‌ها: <b>${txs.length}</b>`,
    { parse_mode:"HTML" }
  );
}

async function adminReport(chatId) {
  const u = db.allUsers(), c = db.data.c;
  const top = [...u].sort((a,b)=>b.pts-a.pts)[0];
  const topRef = [...u].sort((a,b)=>b.refs-a.refs)[0];
  return bot.sendMessage(chatId,
    `${em(E.report,"📊")} <b>گزارش کامل</b>\n\n` +
    `${em(E.allUsers,"👥")} کل: ${u.length} | فعال: ${u.filter(x=>!x.blocked).length} | مسدود: ${u.filter(x=>x.blocked).length}\n` +
    `${em(E.configs,"💎")} کانفیگ‌ها: ${c.length} | موجود: ${c.filter(x=>!x.used_by).length}\n` +
    `${em(E.coin,"💰")} کل امتیازات: ${u.reduce((s,x)=>s+x.pts,0)}\n` +
    `${em(E.richest,"🏆")} ثروتمندترین: ${top?(top.uname?"@"+top.uname:top.fname||"—"):"—"} (${top?.pts||0})\n` +
    `${em(E.topInvites,"👥")} برترین دعوت: ${topRef?(topRef.uname?"@"+topRef.uname:topRef.fname||"—"):"—"} (${topRef?.refs||0})`,
    { parse_mode:"HTML" }
  );
}

async function adminCoinMenu(uid, chatId) {
  await bot.sendMessage(chatId,
    `${em(E.coinSettings,"⚙️")} <b>تنظیمات سکه‌ها</b>\n\n` +
    `${em(E.coin,"💰")} هزینه اشتراک: <b>${db.get("cost")} امتیاز</b>\n` +
    `${em(E.add,"➕")} امتیاز هر دعوت: <b>${db.get("ref_pts")}</b>\n\n` +
    `دستور تغییر هزینه: <code>cost عدد</code>\nدستور تغییر دعوت: <code>ref عدد</code>`,
    { parse_mode:"HTML" }
  );
  setState(uid, "COIN_CMD", {});
}

async function adminChMenu(uid, chatId) {
  const chs = JSON.parse(db.get("force_chs"));
  let txt = `${em(E.channels,"📡")} <b>کانال‌های اجباری</b>\n\n`;
  if (chs.length) chs.forEach((c,i) => { txt += `${i+1}. <b>${c.title}</b> — @${c.username}\n`; });
  else txt += "هیچ کانالی ثبت نشده.\n";
  txt += `\n${em(E.add,"➕")} برای افزودن فقط @یوزرنیم یا لینک کانال بفرستید.\n${em(E.deleteUser,"➖")} برای حذف بنویسید: <code>del @یوزرنیم</code>`;
  await bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
  setState(uid, "CH_CMD", {});
}

async function adminMsgMenu(uid, chatId) {
  await bot.sendMessage(chatId,
    `${em(E.edit,"✏️")} <b>ویرایش پیام‌ها</b>\n\nنام پیام را بفرستید:\n\n` +
    `<code>welcome</code> — خوش‌آمد\n<code>forcejoin</code> — عضویت اجباری\n<code>forcebtn</code> — متن دکمه تأیید\n` +
    `<code>sub_ok</code> — موفقیت اشتراک\n<code>sub_noconfig</code> — کانفیگ نیست\n<code>sub_nopoints</code> — امتیاز کم\n` +
    `<code>ref_notify</code> — اعلام رفرال\n<code>rules</code> — قوانین\n<code>guide</code> — راهنما\n<code>support</code> — پشتیبانی\n` +
    `<code>blocked</code> — مسدودی\n<code>maintenance</code> — تعمیر`,
    { parse_mode:"HTML" }
  );
  setState(uid, "MSG_KEY", {});
}

async function adminKbMenu(uid, chatId) {
  const rows = JSON.parse(db.get("main_kb"));
  let txt = `${em(E.keyboard,"⌨️")} <b>مدیریت دکمه‌ها</b>\n\n`;
  rows.forEach((row,ri) => row.forEach((b,bi) => {
    txt += `ردیف ${ri+1}، دکمه ${bi+1}: ${b.text} ${b.primary?"🟢":"⬜"}\n`;
  }));
  txt += `\n${em(E.add,"➕")} افزودن: <code>add متن | ردیف | ایموجی‌آیدی</code>\n`;
  txt += `${em(E.deleteUser,"➖")} حذف: <code>del متن‌دکمه</code>\n`;
  txt += `${em(E.star,"🎨")} رنگی/بی‌رنگ: <code>color متن‌دکمه</code>\n`;
  txt += `${em(E.resetCoin,"🔄")} بازنشانی: <code>reset</code>`;
  await bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
  setState(uid, "KB_CMD", {});
}

async function adminCfgMenu(uid, chatId) {
  const avail = db.data.c.filter(c=>!c.used_by).length;
  const used = db.data.c.filter(c=>c.used_by).length;
  await bot.sendMessage(chatId,
    `${em(E.configs,"💎")} <b>مدیریت کانفیگ</b>\n\n` +
    `${em(E.check,"✅")} موجود: <b>${avail}</b>\n${em(E.block,"🔴")} استفاده‌شده: <b>${used}</b>\n\n` +
    `${em(E.add,"➕")} برای افزودن، کانفیگ را مستقیم بفرستید (هر خط یک کانفیگ).\n` +
    `برای حذف آخرین کانفیگ: <code>dellast</code>\n` +
    `برای نمایش ۱۰ تا: <code>list</code>`,
    { parse_mode:"HTML" }
  );
  setState(uid, "CFG_CMD", {});
}

async function adminToggleMaintain(chatId) {
  const next = db.get("maintain") === "1" ? "0" : "1";
  db.set("maintain", next);
  return bot.sendMessage(chatId,
    `${em(E.maintenance,"🔧")} حالت تعمیر ${next==="1"?"🔴 فعال":"🟢 غیرفعال"} شد.`,
    { parse_mode:"HTML" }
  );
}

function showUserInfo(u) {
  return `${em(E.userInfo,"👤")} <b>اطلاعات کاربر</b>\n\n` +
    `${em(E.star,"🆔")} آیدی: <code>${u.id}</code>\n` +
    `${em(E.allUsers,"👤")} نام: ${u.fname||"—"}\n` +
    `${em(E.search,"ℹ️")} یوزرنیم: ${u.uname?"@"+u.uname:"—"}\n` +
    `${em(E.coin,"💰")} امتیاز: <b>${u.pts}</b>\n` +
    `${em(E.clan,"👥")} دعوت‌ها: <b>${u.refs}</b>\n` +
    `${em(E.topService,"🏆")} سرویس‌ها: <b>${u.svcs}</b>\n` +
    `${em(E.calendar,"📅")} عضویت: ${u.joined||"—"}\n` +
    `${em(E.status,"📊")} وضعیت: ${u.blocked?"🔴 مسدود":"🟢 فعال"}`;
}

// ===== STATE HANDLER =====
async function handleState(uid, chatId, msg, { s, d }) {
  const text = msg.text || "";

  switch (s) {
    case "BC": {
      clearState(uid);
      const all = db.allUsers().filter(u=>!u.blocked);
      const sm = await bot.sendMessage(chatId, `${em(E.broadcast,"📢")} در حال ارسال به ${all.length} کاربر...`, { parse_mode:"HTML" });
      let ok=0,fail=0;
      for (const u of all) { try { await bot.copyMessage(u.id,chatId,msg.message_id); ok++; } catch { fail++; } await new Promise(r=>setTimeout(r,35)); }
      try { await bot.editMessageText(`${em(E.check,"✅")} ارسال تمام!\n✅ موفق: ${ok}\n❌ ناموفق: ${fail}`,{chat_id:chatId,message_id:sm.message_id,parse_mode:"HTML"}); } catch {}
      break;
    }
    case "MSG_UID": { const tid=parseInt(text); if(isNaN(tid)){return bot.sendMessage(chatId,"❌ آیدی نامعتبر!");} setState(uid,"MSG_TXT",{tid}); return bot.sendMessage(chatId,"پیام را بفرستید:"); }
    case "MSG_TXT": { clearState(uid); try{await bot.copyMessage(d.tid,chatId,msg.message_id);bot.sendMessage(chatId,`${em(E.check,"✅")} ارسال شد.`,{parse_mode:"HTML"});}catch{bot.sendMessage(chatId,"❌ ارسال ناموفق.");} break; }
    case "INFO_UID":
    case "SRCH": {
      clearState(uid);
      let u = text.startsWith("@") ? db.findByUname(text.slice(1)) : db.getUser(parseInt(text));
      if (!u) return bot.sendMessage(chatId, `${em(E.alarm,"❌")} کاربر یافت نشد!`, { parse_mode:"HTML" });
      return bot.sendMessage(chatId, showUserInfo(u), { parse_mode:"HTML" });
    }
    case "UNBLK": { clearState(uid); const tid=parseInt(text); db.updateUser(tid,{blocked:0}); try{await bot.sendMessage(tid,`${em(E.check,"✅")} حساب شما رفع مسدودی شد.`,{parse_mode:"HTML"});}catch{} return bot.sendMessage(chatId,`${em(E.check,"✅")} رفع مسدودی <code>${tid}</code>.`,{parse_mode:"HTML"}); }
    case "BLK":   { clearState(uid); const tid=parseInt(text); db.updateUser(tid,{blocked:1}); try{await bot.sendMessage(tid,db.get("blocked"),{parse_mode:"HTML"});}catch{} return bot.sendMessage(chatId,`${em(E.block,"🚫")} مسدود شد <code>${tid}</code>.`,{parse_mode:"HTML"}); }
    case "DEL_UID":{ clearState(uid); const tid=parseInt(text); db.delUser(tid); return bot.sendMessage(chatId,`${em(E.check,"✅")} کاربر <code>${tid}</code> حذف شد.`,{parse_mode:"HTML"}); }
    case "ADDPTS_UID": { const tid=parseInt(text); if(isNaN(tid))return bot.sendMessage(chatId,"❌ آیدی نامعتبر!"); setState(uid,"ADDPTS_AMT",{tid}); return bot.sendMessage(chatId,`${em(E.addCoin,"💰")} مقدار امتیاز برای <code>${tid}</code>:`,{parse_mode:"HTML"}); }
    case "ADDPTS_AMT": { clearState(uid); const amt=parseInt(text); if(isNaN(amt))return bot.sendMessage(chatId,"❌ عدد نامعتبر!"); db.addPts(d.tid,amt,"admin","ادمین"); try{await bot.sendMessage(d.tid,`${em(E.addCoin,"💰")} <b>${amt} امتیاز</b> به حسابتان افزوده شد.`,{parse_mode:"HTML"});}catch{} return bot.sendMessage(chatId,`${em(E.check,"✅")} ${amt} امتیاز به <code>${d.tid}</code> اضافه شد.`,{parse_mode:"HTML"}); }
    case "SETPTS_UID": { const tid=parseInt(text); if(isNaN(tid))return bot.sendMessage(chatId,"❌ آیدی نامعتبر!"); setState(uid,"SETPTS_AMT",{tid}); return bot.sendMessage(chatId,`${em(E.setCoin,"💲")} امتیاز جدید برای <code>${tid}</code>:`,{parse_mode:"HTML"}); }
    case "SETPTS_AMT": { clearState(uid); const amt=parseInt(text); if(isNaN(amt))return bot.sendMessage(chatId,"❌ عدد نامعتبر!"); db.updateUser(d.tid,{pts:amt}); return bot.sendMessage(chatId,`${em(E.check,"✅")} امتیاز <code>${d.tid}</code> = <b>${amt}</b>`,{parse_mode:"HTML"}); }
    case "RSTPTS": { clearState(uid); const tid=parseInt(text); db.updateUser(tid,{pts:0}); return bot.sendMessage(chatId,`${em(E.check,"✅")} امتیاز <code>${tid}</code> ری‌ست شد.`,{parse_mode:"HTML"}); }
    case "SVC_UID": { const tid=parseInt(text); if(isNaN(tid))return bot.sendMessage(chatId,"❌ آیدی نامعتبر!"); setState(uid,"SVC_CFG",{tid}); return bot.sendMessage(chatId,`${em(E.manualSvc,"🎁")} کانفیگ برای <code>${tid}</code>:`,{parse_mode:"HTML"}); }
    case "SVC_CFG": { clearState(uid); try{await bot.sendMessage(d.tid,`${em(E.gem,"💎")} <b>سرویس دریافت شد:</b>\n\n<code>${text}</code>`,{parse_mode:"HTML"});const c=db.addConfig(text,uid);db.useConfig(c.id,d.tid);const u=db.getUser(d.tid);if(u)db.updateUser(d.tid,{svcs:u.svcs+1});bot.sendMessage(chatId,`${em(E.check,"✅")} ارسال شد به <code>${d.tid}</code>.`,{parse_mode:"HTML"});}catch{bot.sendMessage(chatId,"❌ ارسال ناموفق.");} break; }
    case "COIN_CMD": {
      if (text.startsWith("cost ")) { const v=parseInt(text.slice(5)); if(!isNaN(v)){db.set("cost",String(v));return bot.sendMessage(chatId,`${em(E.check,"✅")} هزینه اشتراک: <b>${v} امتیاز</b>`,{parse_mode:"HTML"});} }
      else if (text.startsWith("ref ")) { const v=parseInt(text.slice(4)); if(!isNaN(v)){db.set("ref_pts",String(v));return bot.sendMessage(chatId,`${em(E.check,"✅")} امتیاز هر دعوت: <b>${v}</b>`,{parse_mode:"HTML"});} }
      else { return bot.sendMessage(chatId,`❌ دستور نامعتبر!\nمثال: <code>cost 2</code> یا <code>ref 1</code>`,{parse_mode:"HTML"}); }
      clearState(uid); break;
    }
    case "CH_CMD": {
      if (text.startsWith("del ")) {
        let un = text.slice(4).trim().replace("@","");
        const chs = JSON.parse(db.get("force_chs")).filter(c=>c.username!==un);
        db.set("force_chs", JSON.stringify(chs));
        clearState(uid);
        return bot.sendMessage(chatId, `${em(E.check,"✅")} کانال @${un} حذف شد.`, { parse_mode:"HTML" });
      }
      // Add channel
      let uname = text.trim();
      if (uname.includes("t.me/")) uname = uname.split("t.me/")[1].split("/")[0].split("?")[0];
      if (uname.startsWith("@")) uname = uname.slice(1);
      let title = uname;
      try { const chat = await bot.getChat("@"+uname); title = chat.title || uname; } catch {}
      const chs = JSON.parse(db.get("force_chs"));
      if (!chs.find(c=>c.username===uname)) {
        chs.push({ username: uname, title, url: `https://t.me/${uname}` });
        db.set("force_chs", JSON.stringify(chs));
      }
      clearState(uid);
      return bot.sendMessage(chatId, `${em(E.check,"✅")} کانال <b>${title}</b> اضافه شد.\n${em(E.alarm,"⚠️")} ربات باید ادمین کانال باشد.`, { parse_mode:"HTML" });
    }
    case "MSG_KEY": {
      const key = text.trim();
      if (!db.data.s.hasOwnProperty(key)) return bot.sendMessage(chatId, "❌ نام پیام نامعتبر!");
      setState(uid, "EDIT_MSG", { key });
      return bot.sendMessage(chatId, `${em(E.edit,"✏️")} متن فعلی:\n${db.get(key)}\n\n<b>متن جدید:</b>`, { parse_mode:"HTML" });
    }
    case "EDIT_MSG": {
      clearState(uid);
      db.set(d.key, text);
      return bot.sendMessage(chatId, `${em(E.check,"✅")} پیام <code>${d.key}</code> ذخیره شد.`, { parse_mode:"HTML" });
    }
    case "KB_CMD": {
      if (text === "reset") { db.set("main_kb",JSON.stringify([[{text:"دریافت اشتراک",eid:E.download,primary:true}],[{text:"دعوت دوستان",eid:E.invite,primary:true},{text:"پروفایل",eid:E.profile}],[{text:"قوانین",eid:E.rules},{text:"پشتیبانی",eid:E.support}],[{text:"راهنما",eid:E.guide}]])); clearState(uid); return bot.sendMessage(chatId,`${em(E.check,"✅")} کیبورد بازنشانی شد.`,{parse_mode:"HTML"}); }
      if (text.startsWith("add ")) {
        const parts = text.slice(4).split("|").map(p=>p.trim());
        if (parts.length<2) return bot.sendMessage(chatId,"❌ فرمت: add متن | ردیف | ایموجی‌آیدی");
        const btnText=parts[0], rowIdx=parseInt(parts[1])-1, eid=parts[2]||null;
        if (isNaN(rowIdx)||rowIdx<0) return bot.sendMessage(chatId,"❌ ردیف نامعتبر!");
        const rows=JSON.parse(db.get("main_kb")); while(rows.length<=rowIdx)rows.push([]); rows[rowIdx].push({text:btnText,...(eid?{eid}:{}),primary:true});
        db.set("main_kb",JSON.stringify(rows)); clearState(uid);
        return bot.sendMessage(chatId,`${em(E.check,"✅")} دکمه «${btnText}» اضافه شد.`,{parse_mode:"HTML"});
      }
      if (text.startsWith("del ")) {
        const btnText=text.slice(4).trim(); const rows=JSON.parse(db.get("main_kb")); let found=false;
        const nr=rows.map(row=>row.filter(b=>{if(b.text===btnText){found=true;return false;}return true;})).filter(r=>r.length>0);
        if(!found)return bot.sendMessage(chatId,"❌ دکمه‌ای با این متن یافت نشد!");
        db.set("main_kb",JSON.stringify(nr)); clearState(uid);
        return bot.sendMessage(chatId,`${em(E.check,"✅")} دکمه «${btnText}» حذف شد.`,{parse_mode:"HTML"});
      }
      if (text.startsWith("color ")) {
        const btnText=text.slice(6).trim(); const rows=JSON.parse(db.get("main_kb")); let found=false;
        rows.forEach(row=>row.forEach(b=>{if(b.text===btnText){found=true;b.primary=!b.primary;}}));
        if(!found)return bot.sendMessage(chatId,"❌ دکمه یافت نشد!");
        db.set("main_kb",JSON.stringify(rows)); clearState(uid);
        const isPrimary=rows.flat().find(b=>b.text===btnText)?.primary;
        return bot.sendMessage(chatId,`${em(E.check,"✅")} دکمه «${btnText}» ${isPrimary?"🟢 رنگی":"⬜ بی‌رنگ"} شد.`,{parse_mode:"HTML"});
      }
      return bot.sendMessage(chatId,"❌ دستور نامعتبر! از add / del / color / reset استفاده کنید.");
    }
    case "CFG_CMD": {
      if (text === "dellast") { const list=db.data.c.filter(c=>!c.used_by); if(!list.length)return bot.sendMessage(chatId,"❌ کانفیگی نیست!"); db.delConfig(list[list.length-1].id); clearState(uid); return bot.sendMessage(chatId,`${em(E.check,"✅")} آخرین کانفیگ موجود حذف شد.`,{parse_mode:"HTML"}); }
      if (text === "list") { const list=db.data.c.filter(c=>!c.used_by).slice(0,10); return bot.sendMessage(chatId,`${em(E.configs,"💎")} <b>${list.length} کانفیگ موجود</b>\n\n`+(list.length?list.map((c,i)=>`${i+1}. <code>${c.txt.slice(0,60)}</code>`).join("\n"):"خالی"),{parse_mode:"HTML"}); }
      // Add configs (each line)
      const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
      for(const l of lines) db.addConfig(l,uid);
      clearState(uid);
      return bot.sendMessage(chatId,`${em(E.check,"✅")} <b>${lines.length}</b> کانفیگ اضافه شد.`,{parse_mode:"HTML"});
    }
  }
}

// ===== USER FEATURES =====
async function showSub(uid, chatId) {
  if (!db.getUser(uid)) db.createUser(uid, null, null, null);
  const user = db.getUser(uid);
  const cost = parseInt(db.get("cost") || "2");

  if (user.pts < cost) {
    let txt = db.get("sub_nopoints")
      .replace("{cost}", cost).replace("{points}", user.pts).replace("{shortage}", cost - user.pts);
    return bot.sendMessage(chatId, txt, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "دعوت دوستان و کسب امتیاز", callback_data: "go:invite" }]] },
    });
  }

  const cfg = db.freeConfig();
  if (!cfg) return bot.sendMessage(chatId, db.get("sub_noconfig"), { parse_mode:"HTML" });

  const remaining = user.pts - cost;
  db.addPts(uid, -cost, "sub", "اشتراک");
  db.useConfig(cfg.id, uid);
  db.updateUser(uid, { svcs: user.svcs + 1 });

  let txt = db.get("sub_ok")
    .replace("{config}", cfg.txt).replace("{cost}", cost).replace("{remaining}", remaining);
  await bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
}

async function showInvite(uid, chatId) {
  if (!db.getUser(uid)) db.createUser(uid, null, null, null);
  const user = db.getUser(uid);
  const pts = db.get("ref_pts") || "1";
  const cost = db.get("cost") || "2";
  const link = `https://t.me/${ME.username}?start=add_${uid}`;
  const shareText = `با این لینک به ربات کانفیگ رایگان بپیوندید و ${pts} امتیاز رایگان بگیرید!`;

  await bot.sendMessage(chatId,
    `${em(E.invite,"🎁")} <b>سیستم دعوت دوستان</b>\n\n` +
    `${em(E.add,"➕")} امتیاز هر دعوت: <b>${pts}</b>\n` +
    `${em(E.clan,"👥")} تعداد دعوت‌های شما: <b>${user.refs}</b>\n` +
    `${em(E.coin,"💰")} امتیاز فعلی: <b>${user.pts}</b>\n\n` +
    `${em(E.guide,"🔗")} <b>لینک اختصاصی شما:</b>\n<code>${link}</code>\n\n` +
    `${em(E.bell,"💡")} با هر دعوت <b>${pts} امتیاز</b> — با <b>${cost} امتیاز</b> اشتراک رایگان!`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{
        text: "اشتراک‌گذاری لینک دعوت",
        url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`
      }]] },
    }
  );
}

async function showProfile(uid, chatId) {
  if (!db.getUser(uid)) db.createUser(uid, null, null, null);
  const u = db.getUser(uid);
  await bot.sendMessage(chatId,
    `${em(E.profile,"👤")} <b>پروفایل</b>\n\n` +
    `${em(E.star,"🆔")} آیدی: <code>${uid}</code>\n` +
    `${em(E.allUsers,"👤")} نام: ${u.fname||"—"}\n` +
    `${em(E.search,"ℹ️")} یوزرنیم: ${u.uname?"@"+u.uname:"—"}\n` +
    `${em(E.coin,"💰")} امتیاز: <b>${u.pts}</b>\n` +
    `${em(E.clan,"👥")} دعوت‌های موفق: <b>${u.refs}</b>\n` +
    `${em(E.topService,"🏆")} سرویس‌های دریافتی: <b>${u.svcs}</b>\n` +
    `${em(E.calendar,"📅")} تاریخ عضویت: ${u.joined||"—"}`,
    { parse_mode:"HTML" }
  );
}

// ===== HEALTH =====
http.createServer((_, res) => { res.writeHead(200); res.end("OK"); }).listen(PORT, () => console.log("Port:", PORT));
bot.on("polling_error", e => console.error("Poll:", e.message));
process.on("SIGTERM", () => { db.saveSync(); bot.stopPolling(); process.exit(0); });
