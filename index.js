const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const ADMIN_IDS = [6622580245];
const DB_PATH = process.env.DB_PATH || "./bot.db.json";

// Premium emoji IDs for MESSAGE bodies only (not inline button text)
const E = {
  download:   "5206607081334906820",
  invite:     "5422439311196834318",
  profile:    "5213383002129702114",
  rules:      "5461117441612462242",
  support:    "5264713049637409446",
  guide:      "5785033300867288899",
  stats:      "5395444784611480792",
  back:       "6300757202651055745",
  coin:       "5190806721286657692",
  check:      "5440660757194744323",
  block:      "5447644880824181073",
  fire:       "5785193735075663481",
  bell:       "5785219784052314091",
  star:       "6037618875846102911",
  gem:        "4981404027402061416",
  clan:       "5436113877181941026",
  calendar:   "5391112412445288650",
  broadcast:  "5413704112220949842",
  search:     "5375296873982604963",
  settings:   "5472027899789843495",
  users:      "5231200819986047254",
  configs:    "5994495364084796671",
  messages:   "5264713049637409446",
  channels:   "5424818078833715060",
  add:        "5271604874419647061",
  remove:     "5453957997418004470",
  edit:       "5334544901428229844",
  maintenance:"5255883984151276991",
  alarm:      "5924664865208671041",
  keyboard_e: "5421516124027482021",
};

// Use in message body only
const em = (id, fb = "•") => `<tg-emoji emoji-id="${id}">${fb}</tg-emoji>`;

// ===== JSON DATABASE =====
class JsonDB {
  constructor(path) {
    this.path = path;
    this._t = null;
    this.load();
  }

  load() {
    try { this.data = JSON.parse(fs.readFileSync(this.path, "utf8")); } catch { this.data = {}; }
    if (!this.data.settings) this.data.settings = {};
    if (!this.data.users) this.data.users = {};
    if (!this.data.configs) this.data.configs = [];
    if (!this.data.transactions) this.data.transactions = [];
    if (!this.data._cid) this.data._cid = 1;

    const D = {
      welcome_text: `${em(E.fire,"🔥")} <b>به ربات کانفیگ رایگان خوش آمدید</b>\n\n${em(E.bell,"🔔")} با این ربات می‌توانید:\n${em(E.check,"✅")} کانفیگ رایگان دریافت کنید\n${em(E.check,"✅")} با دعوت دوستان امتیاز کسب کنید\n${em(E.check,"✅")} با امتیاز، اشتراک رایگان بگیرید`,
      force_join_text: `${em(E.channels,"📌")} <b>برای استفاده از ربات ابتدا عضو کانال‌های زیر شوید</b>\n\n${em(E.bell,"💡")} پس از عضویت دکمه تأیید را بزنید.`,
      force_join_btn: "✅ تأیید عضویت",
      subscription_ok_text: `${em(E.check,"✅")} <b>اشتراک دریافت شد!</b>\n\n${em(E.coin,"💰")} کسر شده: {cost} امتیاز\n${em(E.check,"🏅")} باقیمانده: {remaining}\n\n${em(E.gem,"💎")} <b>کانفیگ شما:</b>\n<code>{config}</code>`,
      no_config_text: `${em(E.block,"❌")} <b>در حال حاضر کانفیگی موجود نیست!</b>\n\n${em(E.bell,"💡")} بعداً مراجعه کنید.`,
      no_points_text: `${em(E.block,"❌")} <b>امتیاز کافی نیست!</b>\n\n${em(E.settings,"🎭")} هزینه: <b>{cost} امتیاز</b>\n${em(E.check,"🏅")} امتیاز شما: <b>{points}</b>\n${em(E.star,"🔄")} کمبود: <b>{shortage}</b>\n\n${em(E.bell,"💡")} با دعوت دوستان امتیاز کسب کنید!`,
      referral_notify: `${em(E.star,"🎉")} <b>زیرمجموعه جدید!</b>\n\n${em(E.bell,"🟡")} {name} به ربات پیوست\n\n${em(E.coin,"💰")} امتیاز: {before} ← <b>{after}</b> (+{pts})\n${em(E.clan,"👥")} کل زیرمجموعه‌ها: {total}`,
      blocked_text: `${em(E.block,"🚫")} <b>حساب شما مسدود شده است.</b>`,
      maintenance_text: `${em(E.maintenance,"🔧")} <b>ربات در حالت تعمیر است.</b>`,
      rules_text: `${em(E.rules,"📋")} <b>قوانین استفاده</b>\n\n🔒 اطلاعات شما محرمانه است.\n👥 تقلب در دعوت = مسدودی دائم.\n🚫 اشتراک فقط برای استفاده شخصی.\n‼️ استفاده مخرب ممنوع.`,
      guide_text: `${em(E.guide,"❓")} <b>راهنما</b>\n\n1️⃣ از بخش «دعوت» لینک بگیر.\n2️⃣ لینک را برای دوستان بفرست.\n3️⃣ با امتیاز از «دریافت اشتراک» کانفیگ بگیر.`,
      support_text: "فاقد ورودی!",
      subscription_cost: "2",
      referral_points: "1",
      maintenance_mode: "0",
      force_channels: JSON.stringify([{ username: "lnterFreedom", title: "InterFreedom", url: "https://t.me/lnterFreedom" }]),
      main_keyboard: JSON.stringify([
        [{ text: "دریافت اشتراک", emoji_id: E.download, style: "primary" }],
        [{ text: "دعوت دوستان", emoji_id: E.invite, style: "primary" }, { text: "پروفایل", emoji_id: E.profile }],
        [{ text: "قوانین", emoji_id: E.rules }, { text: "پشتیبانی", emoji_id: E.support }],
        [{ text: "راهنما", emoji_id: E.guide }],
      ]),
    };
    for (const [k, v] of Object.entries(D)) {
      if (!this.data.settings[k]) this.data.settings[k] = v;
    }
    this.save();
  }

  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch (e) { console.error("DB:", e.message); }
    }, 300);
  }
  saveSync() { try { fs.writeFileSync(this.path, JSON.stringify(this.data)); } catch {} }

  get(k) { return this.data.settings[k] ?? ""; }
  set(k, v) { this.data.settings[k] = v; this.save(); }

  getUser(id) { return this.data.users[String(id)] || null; }
  createUser(id, username, first, last, ref = null) {
    const key = String(id);
    if (this.data.users[key]) {
      if (username) this.data.users[key].username = username;
      if (first) this.data.users[key].first_name = first;
      this.save(); return false;
    }
    this.data.users[key] = { user_id: id, username: username || null, first_name: first || null, last_name: last || null, points: 0, referral_count: 0, referred_by: ref, join_date: ts(), is_blocked: 0, services_received: 0 };
    this.save(); return true;
  }
  updateUser(id, u) { const r = this.getUser(id); if (r) { Object.assign(r, u); this.save(); } }
  addPoints(id, amt, type, desc) {
    const u = this.getUser(id);
    if (u) { u.points += amt; this.data.transactions.push({ id: Date.now() + Math.random(), user_id: id, amount: amt, type, desc, at: ts() }); this.save(); }
  }
  allUsers() { return Object.values(this.data.users); }
  freeConfig() { return this.data.configs.find(c => !c.used_by) || null; }
  addConfig(text, by) { const c = { id: this.data._cid++, config_text: text, added_by: by, used_by: null, used_at: null, at: ts() }; this.data.configs.push(c); this.save(); return c; }
  useConfig(id, uid) { const c = this.data.configs.find(c => c.id === id); if (c) { c.used_by = uid; c.used_at = ts(); this.save(); } }
  delConfig(id) { this.data.configs = this.data.configs.filter(c => c.id !== id); this.save(); }
  delUser(id) { delete this.data.users[String(id)]; this.save(); }
  findByUname(u) { return Object.values(this.data.users).find(x => x.username === u) || null; }
}

function ts() { return new Date().toISOString().replace("T", " ").slice(0, 19); }
if (!TOKEN) { console.error("BOT_TOKEN required"); process.exit(1); }

const db = new JsonDB(DB_PATH);
const isAdmin = (id) => ADMIN_IDS.includes(Number(id));
const bot = new TelegramBot(TOKEN, { polling: true });
let ME = { username: "bot" };
bot.getMe().then(m => { ME = m; console.log("Bot:", m.username); }).catch(console.error);

const states = new Map();
const getState = (uid) => states.get(uid) || { s: "IDLE", d: {} };
const setState = (uid, s, d = {}) => states.set(uid, { s, d });
const clearState = (uid) => states.delete(uid);
const pendingRef = new Map(); // uid -> referrerId

// ===== KEYBOARDS =====
function buildMainKb() {
  const rows = JSON.parse(db.get("main_keyboard"));
  return {
    keyboard: rows.map(row => row.map(btn => ({
      text: btn.text,
      ...(btn.emoji_id ? { icon_custom_emoji_id: btn.emoji_id } : {}),
      ...(btn.style === "primary" ? { style: "primary" } : {}),
    }))),
    resize_keyboard: true,
  };
}

// Admin panel uses PLAIN TEXT emojis in buttons (not tg-emoji tags)
function adminKb() {
  return { inline_keyboard: [
    [{ text: "📊 آمار", callback_data: "a:stats" }, { text: "👥 کاربران", callback_data: "a:users" }],
    [{ text: "💎 کانفیگ‌ها", callback_data: "a:configs" }, { text: "📡 کانال‌ها", callback_data: "a:channels" }],
    [{ text: "✉️ ویرایش پیام‌ها", callback_data: "a:messages" }, { text: "⌨️ دکمه‌های کیبورد", callback_data: "a:keyboard" }],
    [{ text: "⚙️ تنظیمات", callback_data: "a:settings" }, { text: "📢 پیام همگانی", callback_data: "a:broadcast" }],
    [{ text: "🔧 حالت تعمیر", callback_data: "a:maintenance" }],
  ]};
}

const backBtn = (d) => [{ text: "◀️ بازگشت", callback_data: d }];

// ===== FORCE JOIN =====
async function checkJoin(uid) {
  const channels = JSON.parse(db.get("force_channels"));
  const missing = [];
  for (const ch of channels) {
    try {
      const m = await bot.getChatMember("@" + ch.username, uid);
      if (["left", "kicked"].includes(m.status)) missing.push(ch);
    } catch { missing.push(ch); }
  }
  return missing;
}

async function sendForceJoin(chatId, channels) {
  const btns = channels.map(ch => [{ text: "📢 " + ch.title, url: ch.url }]);
  btns.push([{ text: db.get("force_join_btn"), callback_data: "join:check" }]);
  await bot.sendMessage(chatId, db.get("force_join_text"), { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } });
}

// ===== /start =====
bot.onText(/\/start(.*)/, async (msg, match) => {
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const param = (match[1] || "").trim();

  if (db.get("maintenance_mode") === "1" && !isAdmin(uid))
    return bot.sendMessage(chatId, db.get("maintenance_text"), { parse_mode: "HTML" });

  if (param.startsWith("add_")) {
    const rid = parseInt(param.replace("add_", ""));
    if (!isNaN(rid) && rid !== uid) pendingRef.set(uid, rid);
  }

  const missing = await checkJoin(uid);
  if (missing.length > 0) return sendForceJoin(chatId, missing);

  await doStart(uid, chatId, msg.from);
});

async function doStart(uid, chatId, from) {
  const refBy = pendingRef.get(uid) || null;
  pendingRef.delete(uid);

  const isNew = db.createUser(uid, from.username, from.first_name, from.last_name, refBy);

  if (isNew && refBy) {
    const refUser = db.getUser(refBy);
    if (refUser && !refUser.is_blocked) {
      const pts = parseInt(db.get("referral_points") || "1");
      const before = refUser.points;
      db.addPoints(refBy, pts, "referral", `دعوت @${from.username || uid}`);
      db.updateUser(refBy, { referral_count: refUser.referral_count + 1 });
      try {
        const name = from.username ? `@${from.username}` : (from.first_name || String(uid));
        let txt = db.get("referral_notify")
          .replace("{name}", name).replace("{before}", before)
          .replace("{after}", before + pts).replace("{pts}", pts)
          .replace("{total}", refUser.referral_count + 1);
        await bot.sendMessage(refBy, txt, { parse_mode: "HTML" });
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
  await bot.sendMessage(msg.chat.id, "📊 <b>پنل مدیریت</b>", { parse_mode: "HTML", reply_markup: adminKb() });
});

// ===== CALLBACK QUERY =====
bot.on("callback_query", async (q) => {
  const uid = q.from.id;
  const chatId = q.message.chat.id;
  const msgId = q.message.message_id;
  const data = q.data;

  if (data === "join:check") {
    const missing = await checkJoin(uid);
    if (missing.length > 0) return bot.answerCallbackQuery(q.id, { text: "❌ هنوز عضو همه کانال‌ها نشدی!", show_alert: true });
    await bot.answerCallbackQuery(q.id, { text: "✅ عضویت تأیید شد!" });
    try { await bot.deleteMessage(chatId, msgId); } catch {}
    db.createUser(uid, q.from.username, q.from.first_name, q.from.last_name);
    return doStart(uid, chatId, q.from);
  }

  if (data === "go:invite") { await bot.answerCallbackQuery(q.id); return showInvite(uid, chatId); }

  if (!isAdmin(uid)) return bot.answerCallbackQuery(q.id, { text: "❌ دسترسی ندارید!" });
  await bot.answerCallbackQuery(q.id);
  await adminCb(q, uid, chatId, msgId, data);
});

// ===== ADMIN CALLBACKS =====
async function adminCb(q, uid, chatId, msgId, data) {
  const upd = (txt, kb) => bot.editMessageText(txt, { chat_id: chatId, message_id: msgId, parse_mode: "HTML", reply_markup: kb });

  // Main
  if (data === "a:main") return upd("📊 <b>پنل مدیریت</b>", adminKb());

  // ── STATS ──
  if (data === "a:stats") {
    const u = db.allUsers(), cfgs = db.data.configs;
    return upd(
      `📊 <b>آمار کامل</b>\n\n👥 کل کاربران: <b>${u.length}</b>\n🚫 مسدود: <b>${u.filter(x=>x.is_blocked).length}</b>\n💎 کانفیگ کل: <b>${cfgs.length}</b> | موجود: <b>${cfgs.filter(c=>!c.used_by).length}</b>\n💰 کل امتیازات: <b>${u.reduce((s,x)=>s+x.points,0)}</b>`,
      { inline_keyboard: [
        [{ text:"👥 برترین دعوت‌ها", callback_data:"a:top_inv" }, { text:"💰 ثروتمندترین‌ها", callback_data:"a:top_pts" }],
        [{ text:"🏆 بیشترین سرویس", callback_data:"a:top_svc" }, { text:"🕐 آخرین کاربران", callback_data:"a:last_u" }],
        backBtn("a:main"),
      ]}
    );
  }
  if (data === "a:top_inv") { const top = db.allUsers().sort((a,b)=>b.referral_count-a.referral_count).slice(0,10); return upd("👥 <b>برترین دعوت‌ها</b>\n\n"+top.map((u,i)=>`${i+1}. ${u.username?"@"+u.username:u.first_name||"ناشناس"} | 👥 ${u.referral_count}`).join("\n"), { inline_keyboard:[backBtn("a:stats")] }); }
  if (data === "a:top_pts") { const top = db.allUsers().sort((a,b)=>b.points-a.points).slice(0,10); return upd("💰 <b>ثروتمندترین‌ها</b>\n\n"+top.map((u,i)=>`${i+1}. ${u.username?"@"+u.username:u.first_name||"ناشناس"} | 💰 ${u.points}`).join("\n"), { inline_keyboard:[backBtn("a:stats")] }); }
  if (data === "a:top_svc") { const top = db.allUsers().sort((a,b)=>b.services_received-a.services_received).slice(0,10); return upd("🏆 <b>بیشترین سرویس</b>\n\n"+top.map((u,i)=>`${i+1}. ${u.username?"@"+u.username:u.first_name||"ناشناس"} | 🏆 ${u.services_received}`).join("\n"), { inline_keyboard:[backBtn("a:stats")] }); }
  if (data === "a:last_u") { const top = db.allUsers().sort((a,b)=>(b.join_date||"").localeCompare(a.join_date||"")).slice(0,15); return upd("🕐 <b>آخرین کاربران</b>\n\n"+top.map((u,i)=>`${i+1}. ${u.username?"@"+u.username:u.first_name||"ناشناس"} | <code>${u.user_id}</code>`).join("\n"), { inline_keyboard:[backBtn("a:stats")] }); }

  // ── USERS ──
  if (data === "a:users") return upd(`👥 <b>مدیریت کاربران</b>\n\nکل: <b>${db.allUsers().length}</b>`, { inline_keyboard:[
    [{ text:"🔍 جستجو با آیدی عددی", callback_data:"a:u:sid" }],
    [{ text:"🔍 جستجو با @یوزرنیم", callback_data:"a:u:sun" }],
    backBtn("a:main"),
  ]});
  if (data === "a:u:sid") { setState(uid,"WAIT_UID",{msgId}); return upd("🔍 آیدی عددی کاربر:", { inline_keyboard:[backBtn("a:users")] }); }
  if (data === "a:u:sun") { setState(uid,"WAIT_UUN",{msgId}); return upd("🔍 @یوزرنیم کاربر:", { inline_keyboard:[backBtn("a:users")] }); }

  if (data.startsWith("a:u:v:")) {
    const tid = parseInt(data.split(":")[3]);
    const u = db.getUser(tid);
    if (!u) return upd("کاربر یافت نشد!", { inline_keyboard:[backBtn("a:users")] });
    return upd(
      `👤 <b>اطلاعات کاربر</b>\n\n🆔 آیدی: <code>${u.user_id}</code>\n👤 نام: ${u.first_name||"—"}\nℹ️ یوزرنیم: ${u.username?"@"+u.username:"—"}\n💰 امتیاز: <b>${u.points}</b>\n👥 دعوت: <b>${u.referral_count}</b>\n🏆 سرویس: <b>${u.services_received}</b>\n📅 عضویت: ${u.join_date||"—"}\n${u.is_blocked?"🔴 مسدود":"🟢 فعال"}`,
      { inline_keyboard:[
        [
          { text: u.is_blocked?"✅ رفع مسدودی":"🚫 مسدود کردن", callback_data:`a:u:${u.is_blocked?"ub":"bl"}:${tid}` },
          { text:"🗑 حذف", callback_data:`a:u:del:${tid}` },
        ],
        [
          { text:"➕ افزودن امتیاز", callback_data:`a:u:ap:${tid}` },
          { text:"💲 تنظیم امتیاز", callback_data:`a:u:sp:${tid}` },
        ],
        [{ text:"📨 پیام به کاربر", callback_data:`a:u:msg:${tid}` }, { text:"🎁 سرویس دستی", callback_data:`a:u:svc:${tid}` }],
        backBtn("a:users"),
      ]}
    );
  }
  if (data.startsWith("a:u:bl:")) { const tid=parseInt(data.split(":")[3]); db.updateUser(tid,{is_blocked:1}); try{await bot.sendMessage(tid,db.get("blocked_text"),{parse_mode:"HTML"});}catch{} return adminCb(q,uid,chatId,msgId,`a:u:v:${tid}`); }
  if (data.startsWith("a:u:ub:")) { const tid=parseInt(data.split(":")[3]); db.updateUser(tid,{is_blocked:0}); try{await bot.sendMessage(tid,"✅ حساب شما رفع مسدودی شد.",{parse_mode:"HTML"});}catch{} return adminCb(q,uid,chatId,msgId,`a:u:v:${tid}`); }
  if (data.startsWith("a:u:del:")) { const tid=parseInt(data.split(":")[3]); db.delUser(tid); return upd("✅ کاربر حذف شد.",{inline_keyboard:[backBtn("a:users")]}); }
  if (data.startsWith("a:u:ap:")) { const tid=parseInt(data.split(":")[3]); setState(uid,"WAIT_AP",{tid,msgId}); return upd(`➕ مقدار امتیاز برای <code>${tid}</code>:`,{parse_mode:"HTML",inline_keyboard:[backBtn(`a:u:v:${tid}`)]}); }
  if (data.startsWith("a:u:sp:")) { const tid=parseInt(data.split(":")[3]); setState(uid,"WAIT_SP",{tid,msgId}); return upd(`💲 امتیاز جدید برای <code>${tid}</code>:`,{parse_mode:"HTML",inline_keyboard:[backBtn(`a:u:v:${tid}`)]}); }
  if (data.startsWith("a:u:msg:")) { const tid=parseInt(data.split(":")[3]); setState(uid,"WAIT_UMSG",{tid,msgId}); return upd("📨 پیام را ارسال کنید:",{inline_keyboard:[backBtn(`a:u:v:${tid}`)]}); }
  if (data.startsWith("a:u:svc:")) { const tid=parseInt(data.split(":")[3]); setState(uid,"WAIT_SVC",{tid,msgId}); return upd(`🎁 کانفیگ برای <code>${tid}</code>:`,{parse_mode:"HTML",inline_keyboard:[backBtn(`a:u:v:${tid}`)]}); }

  // ── CONFIGS ──
  if (data === "a:configs") {
    const avail=db.data.configs.filter(c=>!c.used_by).length, used=db.data.configs.filter(c=>c.used_by).length;
    return upd(`💎 <b>کانفیگ‌ها</b>\n\n✅ موجود: <b>${avail}</b>\n🔴 استفاده‌شده: <b>${used}</b>`, { inline_keyboard:[
      [{ text:"➕ افزودن کانفیگ", callback_data:"a:cfg:add" }],
      [{ text:"📋 نمایش ۱۰ کانفیگ اول", callback_data:"a:cfg:list" }],
      [{ text:"🗑 حذف آخرین کانفیگ موجود", callback_data:"a:cfg:dellast" }],
      backBtn("a:main"),
    ]});
  }
  if (data === "a:cfg:add") { setState(uid,"WAIT_CFGADD",{msgId}); return upd("➕ <b>افزودن کانفیگ</b>\n\nکانفیگ را ارسال کنید.\n<i>چند کانفیگ با خط جدید جدا کنید.</i>",{parse_mode:"HTML",inline_keyboard:[backBtn("a:configs")]}); }
  if (data === "a:cfg:list") { const list=db.data.configs.filter(c=>!c.used_by).slice(0,10); return upd(`💎 <b>کانفیگ‌های موجود (${list.length})</b>\n\n`+(list.length?list.map((c,i)=>`${i+1}. <code>${c.config_text.slice(0,50)}</code>`).join("\n"):"هیچ کانفیگی ندارید."),{parse_mode:"HTML",inline_keyboard:[backBtn("a:configs")]}); }
  if (data === "a:cfg:dellast") { const list=db.data.configs.filter(c=>!c.used_by); if(!list.length) return upd("❌ کانفیگ موجودی نیست!",{inline_keyboard:[backBtn("a:configs")]}); db.delConfig(list[list.length-1].id); return upd("✅ آخرین کانفیگ موجود حذف شد.",{inline_keyboard:[backBtn("a:configs")]}); }

  // ── CHANNELS ──
  if (data === "a:channels") {
    const chs = JSON.parse(db.get("force_channels"));
    const btns = chs.map(c => [{ text:`❌ حذف @${c.username}`, callback_data:`a:ch:del:${c.username}` }]);
    btns.push([{ text:"➕ افزودن کانال جدید", callback_data:"a:ch:add" }]);
    btns.push(backBtn("a:main"));
    let txt = `📡 <b>کانال‌های اجباری</b>\n\n`;
    if (chs.length) chs.forEach((c,i)=>{ txt+=`${i+1}. <b>${c.title}</b> — @${c.username}\n`; });
    else txt += "هیچ کانالی ثبت نشده.";
    return upd(txt, { inline_keyboard: btns });
  }
  if (data === "a:ch:add") { setState(uid,"WAIT_CHADD",{msgId}); return upd("➕ <b>افزودن کانال</b>\n\n@یوزرنیم یا لینک کانال را ارسال کنید:\n<i>مثال: @myChannel</i>",{parse_mode:"HTML",inline_keyboard:[backBtn("a:channels")]}); }
  if (data.startsWith("a:ch:del:")) { const un=data.split(":")[3]; const chs=JSON.parse(db.get("force_channels")).filter(c=>c.username!==un); db.set("force_channels",JSON.stringify(chs)); return adminCb(q,uid,chatId,msgId,"a:channels"); }

  // ── MESSAGES ──
  if (data === "a:messages") return upd("✉️ <b>ویرایش پیام‌ها</b>", { inline_keyboard:[
    [{ text:"🔥 پیام خوش‌آمد", callback_data:"a:msg:welcome_text" }],
    [{ text:"📌 پیام عضویت اجباری", callback_data:"a:msg:force_join_text" }],
    [{ text:"✅ متن دکمه تأیید عضویت", callback_data:"a:msg:force_join_btn" }],
    [{ text:"💎 پیام موفقیت اشتراک", callback_data:"a:msg:subscription_ok_text" }],
    [{ text:"❌ پیام کانفیگ موجود نیست", callback_data:"a:msg:no_config_text" }],
    [{ text:"❌ پیام امتیاز ناکافی", callback_data:"a:msg:no_points_text" }],
    [{ text:"🎉 اعلام رفرال به دعوت‌کننده", callback_data:"a:msg:referral_notify" }],
    [{ text:"📋 متن قوانین", callback_data:"a:msg:rules_text" }],
    [{ text:"❓ متن راهنما", callback_data:"a:msg:guide_text" }],
    [{ text:"💬 پیام پشتیبانی", callback_data:"a:msg:support_text" }],
    [{ text:"🔧 پیام تعمیر", callback_data:"a:msg:maintenance_text" }],
    [{ text:"🚫 پیام مسدودی", callback_data:"a:msg:blocked_text" }],
    backBtn("a:main"),
  ]});
  if (data.startsWith("a:msg:")) { const key=data.replace("a:msg:",""); setState(uid,"WAIT_MSGEDIT",{key,msgId}); return upd(`✏️ <b>ویرایش پیام</b>\n\n<b>متن فعلی:</b>\n${db.get(key)}\n\n<b>متن جدید را ارسال کنید:</b>\n<i>از HTML و ایموجی استفاده کنید</i>`,{parse_mode:"HTML",inline_keyboard:[backBtn("a:messages")]}); }

  // ── KEYBOARD ──
  if (data === "a:keyboard") {
    const rows = JSON.parse(db.get("main_keyboard"));
    let txt = "⌨️ <b>دکمه‌های کیبورد اصلی</b>\n\n";
    rows.forEach((row,ri) => row.forEach((btn,bi) => {
      txt += `ردیف ${ri+1}، دکمه ${bi+1}: ${btn.text}${btn.style==="primary"?" 🟢":""}\n`;
    }));
    return upd(txt, { inline_keyboard:[
      [{ text:"➕ افزودن دکمه", callback_data:"a:kb:add" }],
      [{ text:"🗑 حذف دکمه", callback_data:"a:kb:del" }],
      [{ text:"🟢 رنگی/بی‌رنگ کردن دکمه", callback_data:"a:kb:color" }],
      [{ text:"🔄 بازنشانی پیش‌فرض", callback_data:"a:kb:reset" }],
      backBtn("a:main"),
    ]});
  }
  if (data === "a:kb:add") { setState(uid,"WAIT_KBADD",{msgId}); return upd("➕ <b>افزودن دکمه</b>\n\nفرمت:\n<code>متن دکمه | شماره ردیف | آیدی ایموجی پریمیوم (اختیاری)</code>\n\nمثال:\n<code>اطلاعات | 3 | 5206607081334906820</code>\n\n<i>دکمه به صورت پیش‌فرض رنگی (primary) ثبت می‌شود.</i>",{parse_mode:"HTML",inline_keyboard:[backBtn("a:keyboard")]}); }
  if (data === "a:kb:del") { setState(uid,"WAIT_KBDEL",{msgId}); return upd("🗑 متن دکمه‌ای که می‌خواهید حذف کنید:",{inline_keyboard:[backBtn("a:keyboard")]}); }
  if (data === "a:kb:color") { setState(uid,"WAIT_KBCOLOR",{msgId}); return upd("🎨 <b>رنگی/بی‌رنگ کردن دکمه</b>\n\nمتن دکمه را ارسال کنید تا وضعیت رنگش برعکس شود:\n<i>🟢 primary = رنگی | بدون = بی‌رنگ</i>",{parse_mode:"HTML",inline_keyboard:[backBtn("a:keyboard")]}); }
  if (data === "a:kb:reset") { db.set("main_keyboard",JSON.stringify([[{text:"دریافت اشتراک",emoji_id:E.download,style:"primary"}],[{text:"دعوت دوستان",emoji_id:E.invite,style:"primary"},{text:"پروفایل",emoji_id:E.profile}],[{text:"قوانین",emoji_id:E.rules},{text:"پشتیبانی",emoji_id:E.support}],[{text:"راهنما",emoji_id:E.guide}]])); return upd("✅ کیبورد به حالت پیش‌فرض بازنشانی شد.",{inline_keyboard:[backBtn("a:keyboard")]}); }

  // ── SETTINGS ──
  if (data === "a:settings") return upd(`⚙️ <b>تنظیمات</b>\n\n💰 هزینه اشتراک: <b>${db.get("subscription_cost")} امتیاز</b>\n➕ امتیاز هر دعوت: <b>${db.get("referral_points")}</b>`, { inline_keyboard:[
    [{ text:`💰 هزینه اشتراک (${db.get("subscription_cost")})`, callback_data:"a:set:cost" }],
    [{ text:`➕ امتیاز دعوت (${db.get("referral_points")})`, callback_data:"a:set:ref" }],
    backBtn("a:main"),
  ]});
  if (data === "a:set:cost") { setState(uid,"WAIT_COST",{msgId}); return upd(`💰 هزینه فعلی: <b>${db.get("subscription_cost")}</b>\n\nعدد جدید:`,{parse_mode:"HTML",inline_keyboard:[backBtn("a:settings")]}); }
  if (data === "a:set:ref") { setState(uid,"WAIT_REF",{msgId}); return upd(`➕ امتیاز دعوت فعلی: <b>${db.get("referral_points")}</b>\n\nعدد جدید:`,{parse_mode:"HTML",inline_keyboard:[backBtn("a:settings")]}); }

  // ── MAINTENANCE ──
  if (data === "a:maintenance") {
    const next = db.get("maintenance_mode")==="1"?"0":"1";
    db.set("maintenance_mode",next);
    return upd(`🔧 حالت تعمیر ${next==="1"?"🔴 فعال":"🟢 غیرفعال"} شد.`,{inline_keyboard:[backBtn("a:main")]});
  }

  // ── BROADCAST ──
  if (data === "a:broadcast") { setState(uid,"WAIT_BC",{msgId}); return upd("📢 پیامی که می‌خواهید به همه ارسال شود را بفرستید:",{inline_keyboard:[backBtn("a:main")]}); }
}

// ===== MESSAGE HANDLER =====
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (db.get("maintenance_mode")==="1" && !isAdmin(uid))
    return bot.sendMessage(chatId, db.get("maintenance_text"), { parse_mode:"HTML" });

  const st = getState(uid);

  if (isAdmin(uid) && st.s !== "IDLE") return handleState(uid, chatId, msg, st);

  if (!isAdmin(uid)) {
    const missing = await checkJoin(uid);
    if (missing.length > 0) return sendForceJoin(chatId, missing);
    const user = db.getUser(uid);
    if (user?.is_blocked) return bot.sendMessage(chatId, db.get("blocked_text"), { parse_mode:"HTML" });
  }

  // Main keyboard routing
  if (text === "دریافت اشتراک") return showSubscription(uid, chatId);
  if (text === "دعوت دوستان") return showInvite(uid, chatId);
  if (text === "پروفایل") return showProfile(uid, chatId);
  if (text === "قوانین") return bot.sendMessage(chatId, db.get("rules_text"), { parse_mode:"HTML" });
  if (text === "پشتیبانی") return bot.sendMessage(chatId, db.get("support_text"), { parse_mode:"HTML" });
  if (text === "راهنما") return bot.sendMessage(chatId, db.get("guide_text"), { parse_mode:"HTML" });
  if (text === "بازگشت به منوی اصلی") return bot.sendMessage(chatId, "منوی اصلی", { reply_markup: buildMainKb() });

  // Check custom keyboard buttons
  const rows = JSON.parse(db.get("main_keyboard"));
  for (const row of rows) {
    for (const btn of row) {
      if (btn.text === text && btn.action) return bot.sendMessage(chatId, btn.action, { parse_mode:"HTML" });
    }
  }
});

// ===== ADMIN STATE HANDLER =====
async function handleState(uid, chatId, msg, { s, d }) {
  const text = msg.text || "";

  const done = async (replyText, kb) => {
    clearState(uid);
    if (d.msgId) {
      try { return await bot.editMessageText(replyText, { chat_id: chatId, message_id: d.msgId, parse_mode:"HTML", reply_markup: kb }); } catch {}
    }
    return bot.sendMessage(chatId, replyText, { parse_mode:"HTML", reply_markup: kb });
  };

  switch (s) {
    case "WAIT_BC": {
      clearState(uid);
      const all = db.allUsers().filter(u=>!u.is_blocked);
      const sm = await bot.sendMessage(chatId, `📢 در حال ارسال به ${all.length} کاربر...`, { parse_mode:"HTML" });
      let ok=0, fail=0;
      for (const u of all) {
        try { await bot.copyMessage(u.user_id, chatId, msg.message_id); ok++; } catch { fail++; }
        await new Promise(r=>setTimeout(r,35));
      }
      try { await bot.editMessageText(`✅ ارسال تمام!\n✅ موفق: ${ok}\n❌ ناموفق: ${fail}`,{chat_id:chatId,message_id:sm.message_id,parse_mode:"HTML"}); } catch {}
      break;
    }
    case "WAIT_UID": { const tid=parseInt(text); if(isNaN(tid)) return bot.sendMessage(chatId,"❌ آیدی نامعتبر!"); const u=db.getUser(tid); if(!u) return done("کاربر یافت نشد!",{inline_keyboard:[backBtn("a:users")]}); clearState(uid); return adminCb(null,uid,chatId,d.msgId,`a:u:v:${tid}`); }
    case "WAIT_UUN": { const un=text.replace("@",""); const u=db.findByUname(un); if(!u) return done("کاربر یافت نشد!",{inline_keyboard:[backBtn("a:users")]}); clearState(uid); return adminCb(null,uid,chatId,d.msgId,`a:u:v:${u.user_id}`); }
    case "WAIT_AP": { const amt=parseInt(text); if(isNaN(amt)) return bot.sendMessage(chatId,"❌ عدد نامعتبر!"); db.addPoints(d.tid,amt,"admin_add","ادمین"); try{await bot.sendMessage(d.tid,`${em(E.add,"💰")} <b>${amt} امتیاز</b> به حساب شما افزوده شد.`,{parse_mode:"HTML"});}catch{} return done(`✅ ${amt} امتیاز به <code>${d.tid}</code> اضافه شد.`,{parse_mode:"HTML",inline_keyboard:[backBtn(`a:u:v:${d.tid}`)]}); }
    case "WAIT_SP": { const amt=parseInt(text); if(isNaN(amt)) return bot.sendMessage(chatId,"❌ عدد نامعتبر!"); db.updateUser(d.tid,{points:amt}); return done(`✅ امتیاز <code>${d.tid}</code> = <b>${amt}</b>`,{parse_mode:"HTML",inline_keyboard:[backBtn(`a:u:v:${d.tid}`)]}); }
    case "WAIT_UMSG": { clearState(uid); try{await bot.copyMessage(d.tid,chatId,msg.message_id);await bot.sendMessage(chatId,"✅ پیام ارسال شد.",{parse_mode:"HTML"});}catch{await bot.sendMessage(chatId,"❌ ارسال ناموفق.");} break; }
    case "WAIT_SVC": { clearState(uid); try{await bot.sendMessage(d.tid,`${em(E.configs,"🎁")} <b>سرویس دستی:</b>\n\n<code>${text}</code>`,{parse_mode:"HTML"});const cfg=db.addConfig(text,uid);db.useConfig(cfg.id,d.tid);const u=db.getUser(d.tid);if(u)db.updateUser(d.tid,{services_received:u.services_received+1});await bot.sendMessage(chatId,`✅ سرویس به <code>${d.tid}</code> ارسال شد.`,{parse_mode:"HTML"});}catch{await bot.sendMessage(chatId,"❌ ارسال ناموفق.");} break; }
    case "WAIT_CFGADD": { const lines=text.split("\n").map(l=>l.trim()).filter(Boolean); for(const l of lines) db.addConfig(l,uid); return done(`✅ <b>${lines.length}</b> کانفیگ اضافه شد.`,{parse_mode:"HTML",inline_keyboard:[backBtn("a:configs")]}); }
    case "WAIT_CHADD": {
      let uname = text.trim();
      if (uname.includes("t.me/")) uname = uname.split("t.me/")[1];
      if (uname.startsWith("@")) uname = uname.slice(1);
      uname = uname.split("/")[0].split("?")[0];
      let title = uname;
      try { const chat = await bot.getChat("@"+uname); title = chat.title || uname; } catch {}
      const chs = JSON.parse(db.get("force_channels"));
      if (chs.find(c=>c.username===uname)) return done("❌ این کانال قبلاً اضافه شده.",{inline_keyboard:[backBtn("a:channels")]});
      chs.push({ username: uname, title, url: `https://t.me/${uname}` });
      db.set("force_channels", JSON.stringify(chs));
      return done(`✅ کانال <b>${title}</b> اضافه شد.\n\n⚠️ ربات باید ادمین کانال باشد.`,{parse_mode:"HTML",inline_keyboard:[backBtn("a:channels")]});
    }
    case "WAIT_MSGEDIT": { db.set(d.key, text); return done("✅ پیام ذخیره شد.",{inline_keyboard:[backBtn("a:messages")]}); }
    case "WAIT_KBADD": {
      const parts = text.split("|").map(p=>p.trim());
      if (parts.length < 2) return bot.sendMessage(chatId, "❌ فرمت: متن | ردیف | ایموجی‌آیدی");
      const btnText = parts[0];
      const rowIdx = parseInt(parts[1]) - 1;
      const emojiId = parts[2] || null;
      if (isNaN(rowIdx)||rowIdx<0) return bot.sendMessage(chatId,"❌ ردیف نامعتبر!");
      const rows = JSON.parse(db.get("main_keyboard"));
      while (rows.length <= rowIdx) rows.push([]);
      rows[rowIdx].push({ text: btnText, ...(emojiId?{emoji_id:emojiId}:{}), style:"primary" });
      db.set("main_keyboard", JSON.stringify(rows));
      return done(`✅ دکمه «${btnText}» به ردیف ${rowIdx+1} اضافه شد.`,{inline_keyboard:[backBtn("a:keyboard")]});
    }
    case "WAIT_KBDEL": {
      const rows = JSON.parse(db.get("main_keyboard"));
      let found = false;
      const newRows = rows.map(row=>row.filter(btn=>{if(btn.text===text){found=true;return false;}return true;})).filter(r=>r.length>0);
      if (!found) return bot.sendMessage(chatId,"❌ دکمه‌ای با این متن یافت نشد!");
      db.set("main_keyboard", JSON.stringify(newRows));
      return done(`✅ دکمه «${text}» حذف شد.`,{inline_keyboard:[backBtn("a:keyboard")]});
    }
    case "WAIT_KBCOLOR": {
      const rows = JSON.parse(db.get("main_keyboard"));
      let found = false;
      rows.forEach(row=>row.forEach(btn=>{
        if (btn.text===text) { found=true; btn.style = btn.style==="primary" ? undefined : "primary"; }
      }));
      if (!found) return bot.sendMessage(chatId,"❌ دکمه‌ای با این متن یافت نشد!");
      db.set("main_keyboard", JSON.stringify(rows));
      const isNowPrimary = rows.flat().find(b=>b.text===text)?.style==="primary";
      return done(`✅ دکمه «${text}» ${isNowPrimary?"🟢 رنگی":"⬜ بی‌رنگ"} شد.`,{inline_keyboard:[backBtn("a:keyboard")]});
    }
    case "WAIT_COST": { const v=parseInt(text); if(isNaN(v)) return bot.sendMessage(chatId,"❌ عدد نامعتبر!"); db.set("subscription_cost",String(v)); return done(`✅ هزینه اشتراک: <b>${v} امتیاز</b>`,{parse_mode:"HTML",inline_keyboard:[backBtn("a:settings")]}); }
    case "WAIT_REF": { const v=parseInt(text); if(isNaN(v)) return bot.sendMessage(chatId,"❌ عدد نامعتبر!"); db.set("referral_points",String(v)); return done(`✅ امتیاز هر دعوت: <b>${v}</b>`,{parse_mode:"HTML",inline_keyboard:[backBtn("a:settings")]}); }
  }
}

// ===== USER FEATURES =====
async function showSubscription(uid, chatId) {
  if (!db.getUser(uid)) db.createUser(uid, null, null, null);
  const user = db.getUser(uid);
  const cost = parseInt(db.get("subscription_cost") || "2");

  if (user.points < cost) {
    let txt = db.get("no_points_text")
      .replace("{cost}", cost).replace("{points}", user.points).replace("{shortage}", cost - user.points);
    return bot.sendMessage(chatId, txt, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text:"👥 دعوت دوستان و کسب امتیاز", callback_data:"go:invite" }]] },
    });
  }

  const cfg = db.freeConfig();
  if (!cfg) return bot.sendMessage(chatId, db.get("no_config_text"), { parse_mode:"HTML" });

  db.addPoints(uid, -cost, "subscription", "اشتراک");
  db.useConfig(cfg.id, uid);
  db.updateUser(uid, { services_received: user.services_received + 1 });

  let txt = db.get("subscription_ok_text")
    .replace("{cost}", cost).replace("{remaining}", user.points - cost).replace("{config}", cfg.config_text);
  await bot.sendMessage(chatId, txt, { parse_mode:"HTML" });
}

async function showInvite(uid, chatId) {
  if (!db.getUser(uid)) db.createUser(uid, null, null, null);
  const user = db.getUser(uid);
  const pts = db.get("referral_points") || "1";
  const cost = db.get("subscription_cost") || "2";
  const link = `https://t.me/${ME.username}?start=add_${uid}`;
  const shareText = `با این لینک به ربات کانفیگ رایگان بپیوندید و امتیاز رایگان بگیرید! 🎁`;

  await bot.sendMessage(chatId,
    `${em(E.invite,"🎁")} <b>سیستم دعوت دوستان</b>\n\n` +
    `${em(E.add,"➕")} امتیاز هر دعوت: <b>${pts}</b>\n` +
    `${em(E.clan,"👥")} دعوت‌های شما: <b>${user.referral_count}</b>\n` +
    `${em(E.coin,"💰")} امتیاز فعلی: <b>${user.points}</b>\n\n` +
    `${em(E.guide,"🔗")} <b>لینک اختصاصی شما:</b>\n<code>${link}</code>\n\n` +
    `${em(E.bell,"💡")} با هر دعوت <b>${pts} امتیاز</b> — با <b>${cost} امتیاز</b> اشتراک رایگان!`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [
        [{ text:"📤 اشتراک‌گذاری لینک دعوت", url:`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}` }],
      ]},
    }
  );
}

async function showProfile(uid, chatId) {
  if (!db.getUser(uid)) db.createUser(uid, null, null, null);
  const u = db.getUser(uid);
  await bot.sendMessage(chatId,
    `${em(E.profile,"👤")} <b>پروفایل</b>\n\n` +
    `${em(E.star,"🆔")} آیدی: <code>${uid}</code>\n` +
    `${em(E.users,"👤")} نام: ${u.first_name||"—"}\n` +
    `${em(E.edit,"ℹ️")} یوزرنیم: ${u.username?"@"+u.username:"—"}\n` +
    `${em(E.coin,"💰")} امتیاز: <b>${u.points}</b>\n` +
    `${em(E.clan,"👥")} دعوت‌ها: <b>${u.referral_count}</b>\n` +
    `${em(E.configs,"🏆")} سرویس‌ها: <b>${u.services_received}</b>\n` +
    `${em(E.calendar,"📅")} تاریخ عضویت: ${u.join_date||"—"}`,
    { parse_mode:"HTML" }
  );
}

// ===== HEALTH SERVER =====
http.createServer((_, res) => { res.writeHead(200); res.end("OK"); }).listen(PORT, () => console.log("Port:", PORT));
bot.on("polling_error", e => console.error("Poll:", e.message));
process.on("SIGTERM", () => { db.saveSync(); bot.stopPolling(); process.exit(0); });
