(function () {
  'use strict';
  const S = () => Store.get();
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d) => { d = d == null ? 2 : d; const a = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); return (n < 0 && Number(a.replace(/,/g, '')) !== 0 ? '-' : '') + a; };
  const eur = n => (n < 0 ? '-' : '') + '€' + fmt(Math.abs(n));
  const usd = n => (n < 0 ? '-' : '') + '$' + fmt(Math.abs(n));
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const wdIdx = s => (Store.parse(s).getDay() + 6) % 7;
  const dshort = s => { const d = Store.parse(s); return DAYS[wdIdx(s)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
  const dlabel = s => { const t = Store.today(); if (s === t) return 'Today'; if (s === Store.addDays(t, -1)) return 'Yesterday'; if (s === Store.addDays(t, 1)) return 'Tomorrow'; return dshort(s); };
  const price = p => { p = Number(p); if (!p) return '0'; if (p >= 1) return p.toFixed(2); if (p >= 0.01) return p.toFixed(4); return p.toFixed(Math.min(10, 2 - Math.floor(Math.log10(p)))); };
  const tsMs = t => new Date(String(t).replace(' ', 'T')).getTime();
  const dtl = t => { const m = String(t).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? (+m[3]) + ' ' + MON[+m[2] - 1] + ', ' + m[4] + ':' + m[5] : t; };
  const tm = s => s || '';

  const t0 = Store.today();
  const ui = { tab: 'home', range: '1W', sel: {}, bMonth: t0.slice(0, 7), wStart: Store.weekStart(t0), wSel: t0, allDays: false };
  let desk = null, deskLoaded = false;
  try { desk = JSON.parse(localStorage.getItem('vantage.desk') || 'null'); } catch (e) {}

  // ---------- helpers
  function toast(msg) { const t = $('#toast'); t.innerHTML = ic('check', 18) + '<span>' + esc(msg) + '</span>'; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1900); }
  function countUp(root) {
    $$('[data-count]', root).forEach(el => {
      const to = parseFloat(el.dataset.count), cur = el.dataset.cur || '', dec = el.dataset.dec == null ? 2 : +el.dataset.dec, suf = el.dataset.suf || '';
      if (!isFinite(to) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const t0 = performance.now(), dur = 800;
      (function step(now) { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = to * e; el.textContent = (v < 0 ? '-' : '') + cur + fmt(Math.abs(v), dec) + suf; if (p < 1) requestAnimationFrame(step); })(t0);
    });
  }
  const num = (v, cur, dec, suf) => '<span data-count="' + v + '" data-cur="' + (cur || '') + '" data-dec="' + (dec == null ? 2 : dec) + '" data-suf="' + (suf || '') + '">' + (v < 0 ? '-' : '') + (cur || '') + fmt(Math.abs(v), dec == null ? 2 : dec) + (suf || '') + '</span>';
  const exPill = '<span class="pill ex">Example</span>';
  const exDot = '<span class="ex-dot">EX</span>';
  const isEx = list => list.length > 0 && list.every(x => x.example);
  const anyEx = list => list.some(x => x.example);
  const catOf = (type, id) => (type === 'income' ? Store.INC_CATS : Store.EXP_CATS).find(c => c.id === id) || { name: id, icon: 'dots', color: '#94A3B8' };

  function banner() {
    if (!Store.hasExamples()) return '';
    return '<div class="banner"><span><b>Example data</b> to try the app</span><button data-act="clearEx">Clear examples</button></div>';
  }

  // ---------- views
  const dayTot = d => Store.dayTotal(d);
  const weekTot = ws => { let n = 0; const nz = []; for (let k = 0; k < 7; k++) { const v = dayTot(Store.addDays(ws, k)); n += v; if (v > 0) nz.push(v); } return { total: Store.round2(n), nz }; };
  const eurS = n => { const a = Math.abs(n), s = n < 0 ? '-' : ''; return a >= 10000 ? s + '€' + (a / 1000).toFixed(1) + 'k' : s + '€' + fmt(a, 0); };
  // Candles of daily tips: body = previous day's tips -> this day's tips (mint = more than the day before, lavender = less). 3M uses weeks, wicks = best/quietest day.
  function earnCandles(range) {
    const t = Store.today(), ws0 = Store.weekStart(t), out = [];
    if (range === '3M') {
      for (let i = 12; i >= 0; i--) {
        const ws = Store.addDays(ws0, -7 * i), cur = weekTot(ws), prev = weekTot(Store.addDays(ws, -7)), d = Store.parse(ws), lab = d.getDate() + ' ' + MON[d.getMonth()];
        out.push({ o: prev.total, c: cur.total, h: Math.max.apply(null, [prev.total, cur.total].concat(cur.nz)), l: Math.min.apply(null, [prev.total, cur.total].concat(cur.nz)), label: lab, tip: 'Week of ' + lab + ' ' + eur(cur.total) });
      }
    } else {
      const days = range === '1W' ? Array.from({ length: 7 }, (_, k) => Store.addDays(ws0, k)) : Array.from({ length: 30 }, (_, k) => Store.addDays(t, k - 29));
      days.forEach((d, k) => {
        const lab = range === '1W' ? DAYS[k] : String(Store.parse(d).getDate());
        if (d > t) { out.push({ empty: true, label: lab }); return; }
        const c = dayTot(d), o = dayTot(Store.addDays(d, -1));
        out.push({ o, c, h: Math.max(o, c), l: Math.min(o, c), label: lab, tip: (range === '1W' ? DAYS[k] : dshort(d)) + ' ' + eur(c) });
      });
    }
    return out;
  }
  const rangeInfo = range => {
    const t = Store.today(), ws0 = Store.weekStart(t);
    const from = range === '1W' ? ws0 : range === '1M' ? Store.addDays(t, -29) : Store.addDays(ws0, -84), to = range === '3M' ? Store.addDays(ws0, 6) : t;
    const l = Store.tipsBetween(from, to);
    return { total: Store.sumTips(l), n: new Set(l.filter(x => x.amount > 0).map(x => x.date)).size, ex: l.length > 0 && l.every(x => x.example), name: range === '1W' ? 'This week' : range === '1M' ? 'Last 30 days' : 'Last 13 weeks' };
  };
  const rseg = () => '<div class="rseg">' + ['1W', '1M', '3M'].map(r => '<button data-act="range" data-n="' + r + '" class="' + (ui.range === r ? 'on' : '') + '">' + r + '</button>').join('') + '</div>';
  function earnChart(id, defaultSel) {
    const cs = earnCandles(ui.range);
    if (cs.every(c => c.empty || (c.c === 0 && c.o === 0))) return '<div class="chart-empty">' + ic('wallet', 28) + '<br>No tips in this period yet.<br>Add your tips and your candles appear here.</div>';
    let sel = ui.sel[id]; if (sel === undefined) sel = defaultSel ? cs.map((c, i) => (c.empty ? -1 : i)).filter(i => i >= 0).pop() : null;
    return candleChart(cs, { id, sel, labelEvery: ui.range === '1W' ? 1 : ui.range === '1M' ? 7 : 3, h: id === 'home' ? 190 : 230, aria: 'Daily tips candles' });
  }
  const legend = () => '<div class="legend"><span><i style="background:var(--mint)"></i>More than the ' + (ui.range === '3M' ? 'week' : 'day') + ' before</span><span><i style="background:var(--lav)"></i>Lower</span><span>Tap a candle for details</span></div>';
  const head = (title, sub, back) => '<div class="hd">' + (back ? '<button class="back" data-act="tab" data-tab="home">' + ic('chevronL', 16) + 'Home</button><br>' : '') + '<h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>';
  const pc = (cls, icon, title, val, tag, act, tab, small) => '<' + (act ? 'button data-act="' + act + '" data-tab="' + tab + '"' : 'div') + ' class="pc ' + cls + (act ? '' : ' flat') + '"><span class="p-ic">' + ic(icon, 18) + '</span>' + (tag ? '<span class="p-x">EX</span>' : '') + '<span><div class="p-t">' + title + '</div><div class="p-v' + (small ? ' sm' : '') + '">' + val + '</div></span></' + (act ? 'button' : 'div') + '>';

  function viewHome() {
    const s = S(), t = Store.today(), ws = Store.weekStart(t), wk = weekTot(ws), pw = weekTot(Store.addDays(ws, -7));
    const wkTips = Store.tipsBetween(ws, Store.addDays(ws, 6)), chg = pw.total > 0 ? (wk.total - pw.total) / pw.total * 100 : null;
    const b = Store.budgetStats(t.slice(0, 7)), gs = s.goals.filter(g => g.target > 0), gT = gs.reduce((n, g) => n + g.target, 0), gS = gs.reduce((n, g) => n + g.saved, 0);
    const ri = rangeInfo(ui.range), todayPlan = s.plan.filter(x => x.date === t).length, sk = Store.streak();
    const todayTips = Store.tipsBetween(t, t), todayHas = todayTips.length > 0;
    return head('Vantage', 'Hi ' + esc(s.settings.name || '')) + banner() +
      '<button class="hero" data-act="tab" data-tab="earnings">' + (wkTips.length && wkTips.every(x => x.example) ? '<span class="pill ex">Example</span>' : '') +
        '<div class="h-n">' + num(wk.total, '€', 0) + '</div><div class="h-l">tips this week</div>' +
        (chg != null ? '<div class="h-c ' + (chg < 0 ? 'dn' : '') + '">' + (chg >= 0 ? '+' : '') + Math.round(chg) + '% vs last week</div>' : '<div class="h-c mu">' + (wkTips.length ? 'No earlier week to compare' : 'Add your first tips to start') + '</div>') + '</button>' +
      '<div class="pgrid">' +
        (todayHas ? pc('lav', 'sparkle', 'Today', eur(Store.sumTips(todayTips)), todayTips.every(x => x.example), 'tab', 'earnings', true) : pc('lav', 'plus', 'Today', 'Add tips', false, 'addTip', '', true)) +
        pc('blue', 'wallet', 'Budget', b.list.length ? eurS(b.net) + ' left' : '—', b.list.length && b.list.every(x => x.example), 'tab', 'budget', true) +
        pc('mint', 'check', 'Savings', gT > 0 ? Math.round(gS / gT * 100) + '%' : '—', gs.length && gs.every(g => g.example), 'tab', 'budget') + '</div>' +
      '<div class="card" style="margin-top:12px;padding-bottom:12px"><div class="card-t"><span>' + ri.name + '</span>' + rseg() + '</div>' + earnChart('home', false) + '</div>' +
      '<button class="row" data-act="tab" data-tab="planner" style="margin-top:12px"><span class="r-ic">' + ic('calendar', 20) + '</span><span class="r-main"><div class="r-t">Weekly planner</div><div class="r-s">' + (todayPlan ? todayPlan + ' planned today' : 'Plan your learning and to-dos') + '</div></span>' + ic('chevron', 20, 'ch') + '</button>' +
      '<button class="row" data-act="tab" data-tab="trading"><span class="r-ic">' + ic('trend', 20) + '</span><span class="r-main"><div class="r-t">Practice portfolio</div><div class="r-s">' + (desk ? usd(desk.equity) + ' · ' + (desk.pct >= 0 ? '+' : '') + fmt(desk.pct) + '% · practice money' : 'Practice money only') + '</div></span>' + ic('chevron', 20, 'ch') + '</button>' +
      '<button class="row" data-act="tab" data-tab="learn"><span class="r-ic">' + ic('flame', 20) + '</span><span class="r-main"><div class="r-t">Learning streak</div><div class="r-s">' + (sk.n ? sk.n + '-day streak · keep it going' : 'Start a 3-minute lesson') + '</div></span>' + ic('chevron', 20, 'ch') + '</button>';
  }

  // ----- Earnings (tips only)
  function viewEarnings() {
    const st = Store.earnStats(), s = S(), ri = rangeInfo(ui.range);
    const ordered = s.tips.slice().sort((a, b) => b.date.localeCompare(a.date)), shown = ui.allDays ? ordered : ordered.slice(0, 6);
    const rows = shown.map(x => '<button class="li" data-act="editTip" data-id="' + x.id + '"><span class="l-ic mt">' + ic('check', 18) + '</span><span class="l-main"><div class="l-t">' + dshort(x.date) + ' ' + (x.example ? exDot : '') + '</div><div class="l-s">' + (x.note ? esc(x.note) : (dlabel(x.date) === dshort(x.date) ? DAYS_FULL[wdIdx(x.date)] : dlabel(x.date))) + '</div></span><span class="l-v">' + eur(x.amount) + '</span></button>').join('');
    return '<div class="hd"><h1>' + num(ri.total, '€', 0) + (ri.ex ? ' ' + exPill : '') + '</h1><p>Tips · ' + ri.name.toLowerCase() + (ri.n ? ' · ' + ri.n + (ri.n === 1 ? ' day' : ' days') : '') + '</p></div>' +
      '<div style="display:flex;justify-content:flex-end;margin:-4px 0 6px">' + rseg() + '</div>' + banner() +
      '<div class="cardless">' + earnChart('earn', true) + legend() + '</div>' +
      '<div class="grid3" style="margin-top:18px">' + [['Today', st.today], ['This week', st.week], ['This month', st.month]].map(a => '<div class="stat"><div class="s-l">' + a[0] + '</div><div class="s-v ' + (a[0] === 'Today' ? 't' : '') + '">' + eurS(a[1].total) + '</div><div class="s-d">' + a[1].days + (a[1].days === 1 ? ' day' : ' days') + '</div></div>').join('') + '</div>' +
      '<div class="card" style="margin-top:12px"><div class="card-t"><span>Recent days</span>' + (ordered.length > 6 ? '<button data-act="allDays">' + (ui.allDays ? 'Show less' : 'See all ' + ordered.length) + '</button>' : '') + '</div>' +
        (ordered.length ? '<div style="margin:0 -18px -18px;border-top:1px solid var(--line)">' + rows + '</div>' : '<div class="empty" style="padding:18px 0 6px">' + ic('wallet', 28) + '<br>No tips yet.<br>Tap “Add tips” to log your first day.</div>') + '</div>' +
      '<div style="margin:14px 0 4px"><button class="btn" data-act="addTip">' + ic('plus', 20) + ' Add tips</button></div>' +
      '<div class="grid2" style="margin-top:12px"><div class="stat"><div class="s-l">Best day</div><div class="s-v t">' + (st.best ? eur(st.best.total) : '—') + '</div><div class="s-d">' + (st.best ? dshort(st.best.date) : 'Nothing logged yet') + '</div></div>' +
        '<div class="stat"><div class="s-l">Average per day (month)</div><div class="s-v">' + (st.month.days ? eur(st.avgDay) : '—') + '</div><div class="s-d">' + st.month.days + (st.month.days === 1 ? ' day' : ' days') + ' with tips</div></div></div>';
  }

  // ----- Planner
  function viewPlanner() {
    const s = S(), ws = ui.wStart, we = Store.addDays(ws, 6), t = Store.today();
    const weekItems = s.plan.filter(x => x.date >= ws && x.date <= we);
    const items = s.plan.filter(x => x.date === ui.wSel).sort((a, b) => (a.start || '99').localeCompare(b.start || '99') || a.title.localeCompare(b.title));
    const learnH = weekItems.filter(x => x.type === 'learn').reduce((n, x) => n + Store.hoursBetween(x.start, x.end), 0);
    const todos = weekItems.filter(x => x.type === 'todo'), todosDone = todos.filter(x => x.done).length;
    const d1 = Store.parse(ws), d2 = Store.parse(we), rangeTxt = d1.getDate() + ' ' + MON[d1.getMonth()] + ' – ' + d2.getDate() + ' ' + MON[d2.getMonth()], isThisWeek = ws === Store.weekStart(t);
    const meta = { learn: ['book', 'bl', 'var(--blue)', 'Learning'], todo: ['list', 'mt', 'var(--mint)', 'To-do'] };
    const rows = items.map(x => { const m = meta[x.type], hh = Store.hoursBetween(x.start, x.end), sub = (x.type === 'todo' ? 'To-do' : m[3] + ' · ' + x.start + '–' + x.end + ' · ' + fmt(hh, 1) + 'h');
      return '<div class="li ' + (x.done ? 'done' : '') + '"><button class="chk ' + (x.done ? 'on' : '') + '" data-act="togglePlan" data-id="' + x.id + '" aria-label="Mark done">' + ic('check', 14) + '</button><button class="l-main" data-act="editPlan" data-id="' + x.id + '" style="text-align:left"><div class="l-t">' + esc(x.title) + ' ' + (x.example ? exDot : '') + '</div><div class="l-s" style="color:' + m[2] + '">' + sub + '</div></button></div>'; }).join('');
    return head('Planner', rangeTxt, true) + banner() +
      '<div class="weeknav"><button class="icon-btn" data-act="weekNav" data-d="-1" aria-label="Previous week">' + ic('chevronL', 20) + '</button><div class="w-t">' + (isThisWeek ? 'This week' : 'Week of ' + d1.getDate() + ' ' + MON[d1.getMonth()]) + '<small>' + rangeTxt + '</small></div><button class="icon-btn" data-act="weekNav" data-d="1" aria-label="Next week">' + ic('chevron', 20) + '</button></div>' +
      '<div class="days">' + DAYS.map((n, i) => { const d = Store.addDays(ws, i), has = s.plan.some(x => x.date === d); return '<button class="day ' + (d === ui.wSel ? 'sel ' : '') + (d === t ? 'today' : '') + '" data-act="selDay" data-d="' + d + '">' + n + '<b>' + Store.parse(d).getDate() + '</b><i class="pip ' + (has ? 'on' : '') + '"></i></button>'; }).join('') + '</div>' +
      '<h2 class="sec" style="margin-top:4px">' + dlabel(ui.wSel) + ' <button data-act="addPlan">' + ic('plus', 16) + ' Add</button></h2>' +
      (items.length ? '<div class="list">' + rows + '</div>' : '<div class="list"><div class="empty">' + ic('calendar', 28) + '<br>Nothing planned for this day.<br>Add a learning block or a to-do.</div></div>') +
      '<h2 class="sec">Week summary</h2><div class="grid2"><div class="stat"><div class="s-l">Learning</div><div class="s-v t">' + fmt(learnH, 1) + 'h</div><div class="s-d">' + weekItems.filter(x => x.type === 'learn').length + ' blocks</div></div>' +
      '<div class="stat"><div class="s-l">To-dos</div><div class="s-v">' + todosDone + '/' + todos.length + '</div><div class="s-d">done</div></div></div>' +
      '<div style="margin-top:16px"><button class="btn" data-act="addPlan">' + ic('plus', 20) + ' Add to this day</button></div>';
  }

  // ----- Trading (practice)
  function deskCandles() {
    const ser = desk.equity_series.map(x => ({ ms: tsMs(x.t), v: x.equity, t: x.t }));
    const span = ser[ser.length - 1].ms - ser[0].ms, M = 60000, sizes = [5, 10, 15, 30, 60, 120, 360, 720, 1440, 2880, 10080].map(m => m * M);
    const size = sizes.find(z => span / z <= 11) || sizes[sizes.length - 1], buckets = [];
    ser.forEach(p => { const k = Math.floor((p.ms - ser[0].ms) / size); let b = buckets[buckets.length - 1]; if (!b || b.k !== k) { b = { k, pts: [], t: p.t }; buckets.push(b); } b.pts.push(p.v); });
    let prev = ser[0].v; const day = size >= 1440 * M;
    return buckets.map(b => { const c = b.pts[b.pts.length - 1], o = prev; prev = c; const lab = day ? b.t.slice(5, 10) : b.t.slice(11, 16); const dlt = c - o;
      return { o, c, h: Math.max.apply(null, b.pts.concat([o])), l: Math.min.apply(null, b.pts.concat([o])), label: lab, tip: (day ? b.t.slice(5, 10) : b.t.slice(11, 16)) + ' · ' + usd(c) + (dlt ? ' (' + (dlt > 0 ? '+' : '-') + usd(Math.abs(dlt)) + ')' : '') }; });
  }
  function viewTrading() {
    if (!desk) return head('Portfolio', '') + '<div class="card"><div class="empty">' + ic('briefcase', 28) + '<br>' + (deskLoaded ? 'Desk data file not found.<br>Make sure <b>data/desk.json</b> is deployed with the app.' : 'Loading practice portfolio…') + '</div></div>';
    const d = desk, up = d.pct >= 0, cs = deskCandles(), total = d.wins + d.losses, capUsed = Math.max(0, -d.daily_pnl);
    let sel = ui.sel.port; if (sel === undefined) sel = cs.length - 1;
    const acts = d.feed.filter(f => f.kind === 'buy' || f.kind === 'sell').slice(0, 12);
    return '<div class="hd"><p style="margin:0 0 4px">Portfolio</p><h1>' + num(d.equity, '$') + ' <span style="font-size:20px;color:var(--mute);font-weight:400">practice</span></h1></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:-4px 0 16px"><span class="pill pm">Practice money</span><span class="pill ' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '') + fmt(d.pct) + '% · ' + (up ? '+' : '-') + usd(Math.abs(d.equity - d.start)) + '</span></div>' +
      '<div class="cardless">' + candleChart(cs, { id: 'port', sel, labelEvery: Math.max(1, Math.ceil(cs.length / 6)), h: 220, aria: 'Practice portfolio candles' }) +
        '<div class="legend"><span><i style="background:var(--mint)"></i>Equity up</span><span><i style="background:var(--lav)"></i>Down</span><span>Each candle is a time slice</span></div></div>' +
      '<div class="grid3" style="margin-top:18px"><div class="stat"><div class="s-l">Wins</div><div class="s-v g">' + d.wins + '</div></div><div class="stat"><div class="s-l">Losses</div><div class="s-v r">' + d.losses + '</div></div><div class="stat"><div class="s-l">Open</div><div class="s-v t">' + d.open_count + '</div></div></div>' +
      '<div class="grid2" style="margin-top:10px"><div class="stat"><div class="s-l">Realised P&amp;L</div><div class="s-v ' + (d.realised >= 0 ? 'g' : 'r') + '">' + (d.realised >= 0 ? '+' : '-') + usd(Math.abs(d.realised)) + '</div><div class="s-d">' + total + ' closed trade' + (total === 1 ? '' : 's') + (total < 20 ? ' · too few to judge' : '') + '</div></div>' +
        '<div class="stat"><div class="s-l">Free cash</div><div class="s-v">' + usd(d.cash) + '</div><div class="s-d">' + usd(d.open_cost) + ' in open (at cost)</div></div></div>' +
      '<div class="card" style="margin-top:12px"><div class="card-t"><span>Open positions</span><span style="color:var(--mute);font-size:14px;font-family:var(--font)">' + d.open_positions.length + '</span></div>' +
        (d.open_positions.length ? '<div style="margin:0 -18px -18px;border-top:1px solid var(--line)">' + d.open_positions.map(p => '<a class="li" href="' + esc(p.link) + '" target="_blank" rel="noopener"><span class="kind buy">' + esc(Array.from(p.coin.replace(/[^\p{L}\p{N}]/gu, '') || '?')[0]) + '</span><span class="l-main"><div class="l-t">' + esc(p.coin) + '</div><div class="l-s">Entry $' + price(p.entry) + ' · ' + dtl(p.opened) + '</div></span><span class="l-v">' + usd(p.size) + '<small>at cost</small></span></a>').join('') + '</div>' : '<div class="empty" style="padding:14px 0 4px">No open positions.</div>') + '</div>' +
      '<div class="card" style="margin-top:12px"><div class="card-t"><span>Recent activity</span></div>' +
        (acts.length ? '<div style="margin:0 -18px -18px;border-top:1px solid var(--line)">' + acts.map(f => { const sell = f.kind === 'sell', pl = sell ? (f.text.match(/P&L \$(-?[\d.]+)/) || [])[1] : null, w = pl != null && parseFloat(pl) >= 0;
          return '<a class="li" href="' + esc(f.link) + '" target="_blank" rel="noopener"><span class="kind ' + (sell ? (w ? 'win' : 'loss') : 'buy') + '">' + ic(sell ? 'arrowDown' : 'arrowUp', 18) + '</span><span class="l-main"><div class="l-t">' + (sell ? 'Sold ' : 'Bought ') + esc(f.coin) + '</div><div class="l-s">' + esc(f.why || '') + '</div></span><span class="l-v ' + (pl != null ? (w ? 'pos' : 'neg') : '') + '">' + (pl != null ? (w ? '+' : '-') + usd(Math.abs(parseFloat(pl))) : '') + '<small>' + dtl(f.t) + '</small></span></a>'; }).join('') + '</div>' : '<div class="empty" style="padding:14px 0 4px">No trades yet.</div>') + '</div>' +
      '<div class="card" style="margin-top:12px;padding:6px 18px"><div class="kv"><span>Daily loss cap</span><b>' + usd(d.daily_cap) + (capUsed > 0 ? ' (used ' + usd(capUsed) + ')' : '') + '</b></div>' +
        '<div class="kv"><span>Loss streak stop</span><b>' + d.loss_streak + ' / ' + d.streak_limit + '</b></div>' +
        '<div class="kv"><span>Trading halted</span><b style="color:' + (d.halt ? 'var(--danger)' : 'var(--mint)') + '">' + (d.halt ? esc(d.halt) : 'No') + '</b></div>' +
        '<div class="kv"><span>Scans · coins checked</span><b>' + d.scans + ' · ' + d.scanned + '</b></div><div class="kv"><span>Passed gates · rejected</span><b>' + d.passed + ' · ' + d.rejected + '</b></div></div>' +
      '<div class="note">Practice money only, nothing real is traded. Open positions are valued at cost (no live prices), so equity changes only when a trade closes. Snapshot from <b>' + dtl(d.generated) + '</b> (' + esc(d.tz) + '). To refresh, re-run <b>tools/bundle_desk.py</b> and redeploy.</div>';
  }

  // ----- Budget
  function viewBudget() {
    const s = S(), ym = ui.bMonth, b = Store.budgetStats(ym), t = Store.today(), [Y, M] = ym.split('-').map(Number), isNow = ym === t.slice(0, 7);
    const cats = Store.EXP_CATS.map(c => ({ c, v: b.byCat[c.id] || 0 })).filter(x => x.v > 0).sort((a, c) => c.v - a.v), rate = b.income > 0 ? Math.round(b.net / b.income * 100) : null;
    const txs = b.list.slice().sort((a, c) => c.date.localeCompare(a.date)); let tl = '', cur = '';
    txs.forEach(x => { if (x.date !== cur) { cur = x.date; tl += (tl ? '</div>' : '') + '<div class="dayh"' + (tl ? '' : ' style="padding-top:0"') + '><span>' + dlabel(cur) + '</span></div><div class="list">'; }
      const c = catOf(x.type, x.cat), inc = x.type === 'income';
      tl += '<button class="li" data-act="editTx" data-id="' + x.id + '"><span class="l-ic" style="background:' + c.color + '26;color:' + c.color + '">' + ic(c.icon, 18) + '</span><span class="l-main"><div class="l-t">' + esc(x.note || c.name) + ' ' + (x.example ? exDot : '') + '</div><div class="l-s">' + c.name + '</div></span><span class="l-v ' + (inc ? 'pos' : '') + '">' + (inc ? '+' : '-') + eur(x.amount) + '</span></button>'; });
    if (tl) tl += '</div>';
    const goals = s.goals.map(g => { const p = g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 0; return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><button data-act="editGoal" data-id="' + g.id + '" style="text-align:left;flex:1;min-width:0"><div style="font-family:var(--head);font-weight:500;font-size:18px;display:flex;gap:8px;align-items:center"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(g.name) + '</span> ' + (g.example ? exDot : '') + '</div></button><span style="color:var(--mint);font-weight:600;font-family:var(--head);font-size:18px">' + Math.round(p) + '%</span></div><div class="bar" style="margin:12px 0 10px"><i style="width:' + p.toFixed(1) + '%"></i></div><div class="meta"><span><b>' + eur(g.saved) + '</b> of ' + eur(g.target) + '</span><button class="chip on" style="padding:6px 13px;font-size:12.5px" data-act="fundGoal" data-id="' + g.id + '">+ Add money</button></div></div>'; }).join('');
    return '<div class="hd"><p style="margin:0 0 4px">Budget</p><h1>' + num(b.net, '€', 0) + ' <span style="font-size:20px;color:var(--mute);font-weight:400">left</span></h1></div>' + banner() +
      '<div class="weeknav"><button class="icon-btn" data-act="bMonth" data-d="-1" aria-label="Previous month">' + ic('chevronL', 20) + '</button><div class="w-t">' + MONF[M - 1] + ' ' + Y + '<small>' + (isNow ? 'This month' : 'Month overview') + '</small></div><button class="icon-btn" data-act="bMonth" data-d="1" aria-label="Next month">' + ic('chevron', 20) + '</button></div>' +
      '<div class="pgrid" style="margin-top:0">' + pc('mint', 'arrowUp', 'Income', eurS(b.income)) + pc('lav', 'arrowDown', 'Spent', eurS(b.expense)) + pc('blue', 'target', 'Saved', rate == null ? '—' : rate + '%') + '</div>' +
      (cats.length ? '<div class="card" style="margin-top:12px"><div class="card-t"><span>Where it went</span></div><div class="stack">' + cats.map(x => '<i style="flex:' + x.v + ';background:' + x.c.color + '"></i>').join('') + '</div>' + cats.map(x => '<div style="display:flex;align-items:center;gap:10px;padding:9px 0"><span style="width:10px;height:10px;border-radius:50%;background:' + x.c.color + '"></span><span style="flex:1;font-size:14.5px">' + x.c.name + '</span><span style="color:var(--mute);font-size:13px">' + Math.round(x.v / b.expense * 100) + '%</span><b style="min-width:76px;text-align:right;font-weight:600">' + eur(x.v) + '</b></div>').join('') + '</div>' : '') +
      '<div style="margin:14px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn sm" data-act="addTx" data-type="expense" style="margin:0">' + ic('arrowDown', 18) + ' Expense</button><button class="btn ghost sm" data-act="addTx" data-type="income" style="margin:0">' + ic('arrowUp', 18) + ' Income</button></div>' +
      '<h2 class="sec">Transactions</h2>' + (tl || '<div class="list"><div class="empty">' + ic('wallet', 28) + '<br>No entries this month.<br>Add your first income or expense.</div></div>') +
      '<h2 class="sec">Savings goals <button data-act="addGoal">' + ic('plus', 16) + ' New goal</button></h2>' + (goals || '<div class="list"><div class="empty">' + ic('target', 28) + '<br>No goals yet. Set one, like an emergency fund.</div></div>');
  }

  // ----- Learn
  function viewLearn() {
    const s = S(), sk = Store.streak(), t = Store.today(), ws = Store.weekStart(t), done = Object.keys(s.lessons).length;
    return head('Learn', 'Short money lessons') + banner() +
      '<div class="card"><div class="streak"><div class="flame ' + (sk.n ? '' : 'off') + '">' + ic('flame', 30) + '</div><div style="flex:1"><div class="s-n">' + num(sk.n, '', 0) + '<small>day streak</small></div><div style="color:var(--mute);font-size:13.5px;margin-top:8px">' + (sk.doneToday ? 'Today’s lesson done. Nice.' : sk.n ? 'Do a lesson today to keep it alive.' : 'Finish a lesson to start a streak.') + '</div></div></div>' +
      '<div class="weekdots">' + DAYS.map((n, i) => { const d = Store.addDays(ws, i); return '<div class="' + (d === t ? 'td' : '') + '"><i class="' + (sk.days.has(d) ? 'on' : '') + '">' + ic('check', 14) + '</i>' + n[0] + '</div>'; }).join('') + '</div></div>' +
      '<div class="card" style="margin-top:12px"><div class="meta"><span>Lessons completed</span><b>' + done + ' / ' + LESSONS.length + '</b></div><div class="bar lv" style="margin-top:12px"><i style="width:' + (done / LESSONS.length * 100) + '%"></i></div></div>' +
      '<h2 class="sec">Lessons · 3 min each</h2><div class="list">' + LESSONS.map(l => { const d = s.lessons[l.id]; return '<div class="li ' + (d ? 'done' : '') + '"><button class="chk ' + (d ? 'on' : '') + '" data-act="toggleLesson" data-id="' + l.id + '" aria-label="Mark done">' + ic('check', 14) + '</button><button class="l-main" data-act="lesson" data-id="' + l.id + '" style="text-align:left"><div class="l-t">' + l.title + ' ' + (d && d.example ? exDot : '') + '</div><div class="l-s">' + l.min + ' min' + (d ? ' · done ' + dlabel(d.date) : '') + '</div></button><span style="color:var(--dim)">' + ic('chevron', 18) + '</span></div>'; }).join('') + '</div>' +
      '<div class="note">General education, not financial advice.</div>';
  }

  function viewProfile() {
    const s = S(), name = s.settings.name || 'You', standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const row = (icn, t, sub, act) => '<button class="li" data-act="' + act + '"><span class="l-ic lv">' + ic(icn, 18) + '</span><span class="l-main"><div class="l-t">' + t + '</div><div class="l-s">' + sub + '</div></span><span style="color:var(--dim)">' + ic('chevron', 18) + '</span></button>';
    return head('Profile', '', true) + '<div class="profile-h"><div class="avatar">' + esc(Array.from(name)[0] || 'V') + '</div><div><div class="p-n">' + esc(name) + '</div><div class="p-s">Vantage · your money, work and growth</div></div></div>' + banner() +
      '<div class="list">' + row('user', 'Name', esc(name), 'editName') + '</div>' +
      '<h2 class="sec">Data</h2><div class="list">' + (Store.hasExamples() ? row('sparkle', 'Clear example data', 'Remove sample entries, keep your own', 'clearEx') : row('sparkle', 'Load example data', 'Add sample entries to explore', 'restoreEx')) +
        row('download', 'Export backup', 'Download everything as a JSON file', 'exportData') + row('upload', 'Import backup', 'Restore from a backup file', 'importData') + row('trash', 'Erase all my data', 'Cannot be undone', 'resetAll') + '</div>' +
      '<input type="file" id="file" accept="application/json,.json" hidden>' +
      '<h2 class="sec">About</h2><div class="card" style="padding:4px 18px"><div class="kv"><span>Version</span><b>2.1</b></div><div class="kv"><span>Storage</span><b>' + (Store.storageOK() ? 'On this phone' : 'Unavailable!') + '</b></div><div class="kv"><span>Installed as app</span><b>' + (standalone ? 'Yes' : 'Not yet') + '</b></div></div>' +
      (standalone ? '' : '<div class="note">To install: iPhone, open in <b>Safari</b> → Share → <b>Add to Home Screen</b>. Android, open in <b>Chrome</b> → ⋮ → <b>Install app</b>.</div>') +
      '<div class="note">Your earnings, budget, plan and lessons are saved only in this browser on this phone. Use <b>Export backup</b> now and then. The trading desk is practice money only.</div>';
  }

  // ---------- render
  const NAV = [['home', 'Home'], ['earnings', 'Earnings'], ['trading', 'Trading'], ['budget', 'Budget'], ['learn', 'Learn']];
  const VIEWS = { home: viewHome, earnings: viewEarnings, trading: viewTrading, budget: viewBudget, learn: viewLearn, planner: viewPlanner, profile: viewProfile };
  function renderTabs() { $('#tabbar').innerHTML = NAV.map(n => '<button class="' + (ui.tab === n[0] ? 'on' : '') + '" data-act="tab" data-tab="' + n[0] + '"' + (ui.tab === n[0] ? ' aria-current="page"' : '') + '>' + n[1] + '</button>').join(''); }
  function render(anim) {
    const view = $('#view');
    view.innerHTML = VIEWS[ui.tab]();
    view.className = anim ? '' : 'noanim';
    if (anim) { Array.from(view.children).forEach((el, i) => { el.classList.add('rise'); el.style.setProperty('--i', Math.min(i, 9)); }); countUp(view); }
    renderTabs();
    $('#bell').innerHTML = ic('bell', 20);
    $('#avatar').textContent = Array.from(S().settings.name || 'V')[0].toUpperCase();
    $('#bell-dot').hidden = reminders().filter(r => r.act).length === 0;
    const f = $('#file'); if (f) f.onchange = importFile;
  }
  function go(tab) {
    if (!VIEWS[tab]) tab = 'home';
    ui.tab = tab; render(true); $('#scroll').scrollTo({ top: 0 });
    try { history.replaceState(null, '', '#' + tab); } catch (e) {}
  }

  // ---------- sheets
  let sheetEl = null;
  function openSheet(title, body, o) {
    o = o || {};
    closeSheet(true);
    const root = $('#sheet-root');
    root.innerHTML = '<div class="backdrop" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="s-grab"><i></i></div><div class="s-head"><h3>' + esc(title) + (o.badge || '') + '</h3><button class="close" data-act="closeSheet" aria-label="Close">' + ic('x', 18) + '</button></div><div class="s-body">' + body + '</div></div>';
    const sh = $('.sheet', root), bd = $('.backdrop', root);
    sheetEl = sh;
    requestAnimationFrame(() => requestAnimationFrame(() => { sh.classList.add('show'); bd.classList.add('show'); }));
    // drag to dismiss
    let y0 = null, dy = 0;
    const start = e => { y0 = e.clientY; dy = 0; sh.classList.add('drag'); e.currentTarget.setPointerCapture(e.pointerId); };
    const move = e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = 'translateY(' + dy + 'px)'; };
    const end = () => { if (y0 == null) return; sh.classList.remove('drag'); y0 = null; if (dy > 110) closeSheet(); else sh.style.transform = ''; };
    [$('.s-grab', sh), $('.s-head', sh)].forEach(el => { el.addEventListener('pointerdown', start); el.addEventListener('pointermove', move); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); });
    if (o.onMount) o.onMount(sh);
    return sh;
  }
  function closeSheet(instant) {
    const root = $('#sheet-root'); if (!sheetEl) { root.innerHTML = ''; return; }
    const sh = sheetEl; sheetEl = null;
    if (instant) { root.innerHTML = ''; return; }
    sh.style.transform = ''; sh.classList.remove('show', 'drag'); const bd = $('.backdrop', root); if (bd) bd.classList.remove('show');
    setTimeout(() => { if (!sheetEl) root.innerHTML = ''; }, 380);
  }
  const money = (name, val, ph) => '<div class="money"><span>' + (ph || '€') + '</span><input class="in" name="' + name + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + (val === '' || val == null ? '' : val) + '"></div>';
  const fld = (label, inner) => '<div class="fld"><label>' + label + '</label>' + inner + '</div>';
  const delBtn = (act, id, label) => '<button type="button" class="btn danger" data-act="' + act + '" data-id="' + id + '">' + ic('trash', 18) + ' ' + (label || 'Delete') + '</button>';
  const val = (f, n) => f.elements[n].value;

  function tipSheet(id) {
    const old = id ? S().tips.find(x => x.id === id) : null;
    const t = old || { date: Store.today(), amount: '', note: '' };
    const body = '<form id="f" autocomplete="off">' + fld('Date', '<input class="in" type="date" name="date" value="' + t.date + '" required>') +
      fld('Tips collected', money('amount', t.amount)) +
      fld('Note (optional)', '<input class="in" name="note" maxlength="60" value="' + esc(t.note || '') + '" placeholder="e.g. busy Friday">') +
      '<div class="preview"><div><small>Tips for this day</small><b id="pv-t">€0.00</b></div><div style="text-align:right"><small id="pv-d">' + dlabel(t.date) + '</small></div></div>' +
      '<button class="btn" type="submit">' + (old ? 'Save changes' : 'Save tips') + '</button>' + (old ? delBtn('delTip', old.id, 'Delete this day') : '') + '</form>';
    openSheet(old ? 'Edit tips' : 'Add tips', body, { badge: old && old.example ? ' ' + exPill : '', onMount: sh => {
      const f = $('#f', sh), upd = () => { $('#pv-t', sh).textContent = eur(Store.num(val(f, 'amount'))); const d = val(f, 'date'); $('#pv-d', sh).textContent = d ? dlabel(d) : ''; };
      f.addEventListener('input', upd); upd();
      f.addEventListener('submit', e => { e.preventDefault();
        const amount = Store.round2(Store.num(val(f, 'amount')));
        if (!(amount > 0)) { f.elements.amount.focus(); toast('Enter the tips amount'); return; }
        const item = { id: old ? old.id : undefined, date: val(f, 'date'), amount, note: val(f, 'note').trim() }; if (!item.id) delete item.id;
        let msg = old ? 'Tips updated' : 'Tips saved';
        // one entry per day: a second entry for the same day is added to it; a real entry replaces example data
        const same = S().tips.find(x => x.date === item.date && x.id !== (old && old.id));
        if (same) {
          if (same.example) { Store.remove('tips', same.id); }
          else { item.amount = Store.round2(item.amount + same.amount); item.note = item.note || same.note || ''; Store.remove('tips', same.id); msg = 'Added to ' + dshort(item.date); }
        }
        Store.upsert('tips', item); closeSheet(); render(false); toast(msg); });
    } });
  }

  function txSheet(id, type) {
    const old = id ? S().txs.find(x => x.id === id) : null;
    let ty = old ? old.type : (type || 'expense'), cat = old ? old.cat : (ty === 'income' ? 'delivery' : 'food');
    const body = '<form id="f" autocomplete="off"><div class="seg sm" id="tyseg"><button type="button" data-ty="expense">Expense</button><button type="button" data-ty="income">Income</button></div>' +
      fld('Amount', money('amount', old ? old.amount : '')) + fld('Category', '<div class="chips" id="cats"></div>') +
      '<div class="two">' + fld('Date', '<input class="in" type="date" name="date" value="' + (old ? old.date : Store.today()) + '" required>') + fld('Note (optional)', '<input class="in" name="note" maxlength="60" placeholder="e.g. Groceries" value="' + esc(old ? old.note : '') + '">') + '</div>' +
      '<button class="btn" type="submit">' + (old ? 'Save changes' : 'Save') + '</button>' + (old ? delBtn('delTx', old.id) : '') + '</form>';
    openSheet(old ? 'Edit entry' : 'Add entry', body, { badge: old && old.example ? ' ' + exPill : '', onMount: sh => {
      const f = $('#f', sh);
      const paint = () => { $$('#tyseg button', sh).forEach(b => b.classList.toggle('on', b.dataset.ty === ty)); const list = ty === 'income' ? Store.INC_CATS : Store.EXP_CATS; if (!list.some(c => c.id === cat)) cat = list[0].id; $('#cats', sh).innerHTML = list.map(c => '<button type="button" class="chip ' + (c.id === cat ? 'on' : '') + '" data-cat="' + c.id + '">' + ic(c.icon, 15) + c.name + '</button>').join(''); };
      paint();
      sh.addEventListener('click', e => { const b = e.target.closest('[data-ty]'); if (b) { ty = b.dataset.ty; paint(); } const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; paint(); } });
      f.addEventListener('submit', e => { e.preventDefault(); const amt = Store.num(val(f, 'amount')); if (amt <= 0) { f.elements.amount.focus(); return; }
        const item = { id: old ? old.id : undefined, type: ty, cat, amount: amt, date: val(f, 'date'), note: val(f, 'note').trim() }; if (!item.id) delete item.id;
        Store.upsert('txs', item); if (item.date.slice(0, 7) !== ui.bMonth && ui.tab === 'budget') ui.bMonth = item.date.slice(0, 7); closeSheet(); render(false); toast('Saved'); });
    } });
  }

  function goalSheet(id) {
    const old = id ? S().goals.find(x => x.id === id) : null;
    const body = '<form id="f" autocomplete="off">' + fld('Goal name', '<input class="in" name="name" maxlength="40" placeholder="e.g. Emergency fund" value="' + esc(old ? old.name : '') + '" required>') +
      '<div class="two">' + fld('Target', money('target', old ? old.target : '')) + fld('Saved so far', money('saved', old ? old.saved : '0')) + '</div>' +
      '<button class="btn" type="submit">' + (old ? 'Save changes' : 'Create goal') + '</button>' + (old ? delBtn('delGoal', old.id) : '') + '</form>';
    openSheet(old ? 'Edit goal' : 'New goal', body, { badge: old && old.example ? ' ' + exPill : '', onMount: sh => {
      const f = $('#f', sh);
      f.addEventListener('submit', e => { e.preventDefault(); const target = Store.num(val(f, 'target')); if (target <= 0) { f.elements.target.focus(); return; }
        const item = { id: old ? old.id : undefined, name: val(f, 'name').trim(), target, saved: Store.num(val(f, 'saved')) }; if (!item.id) delete item.id;
        Store.upsert('goals', item); closeSheet(); render(false); toast('Goal saved'); });
    } });
  }
  function fundSheet(id) {
    const g = S().goals.find(x => x.id === id); if (!g) return;
    openSheet('Add to “' + g.name + '”', '<form id="f" autocomplete="off">' + fld('Amount to add', money('amt', '')) + '<div class="chips" style="margin-bottom:16px">' + [10, 25, 50, 100].map(n => '<button type="button" class="chip" data-q="' + n + '">+€' + n + '</button>').join('') + '</div><button class="btn" type="submit">Add money</button></form>', { onMount: sh => {
      const f = $('#f', sh); sh.addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (q) { f.elements.amt.value = (Store.num(f.elements.amt.value) + +q.dataset.q).toString(); } });
      f.addEventListener('submit', e => { e.preventDefault(); const a = Store.num(val(f, 'amt')); if (a === 0) { f.elements.amt.focus(); return; } const item = Object.assign({}, g, { saved: Store.round2(g.saved + a) }); Store.upsert('goals', item); closeSheet(); render(false); toast('Added ' + eur(a)); });
    } });
  }

  function planSheet(id, date) {
    const old = id ? S().plan.find(x => x.id === id) : null;
    let ty = old && old.type !== 'shift' ? old.type : 'learn';
    const body = '<form id="f" autocomplete="off"><div class="seg sm" id="tyseg"><button type="button" data-ty="learn">Learning</button><button type="button" data-ty="todo">To-do</button></div>' +
      fld('Title', '<input class="in" name="title" maxlength="60" value="' + esc(old ? old.title : '') + '" placeholder="">') + fld('Date', '<input class="in" type="date" name="date" value="' + (old ? old.date : (date || ui.wSel)) + '" required>') +
      '<div class="two" id="times">' + fld('Start', '<input class="in" type="time" name="start" value="' + (old && old.start ? old.start : '15:00') + '">') + fld('End', '<input class="in" type="time" name="end" value="' + (old && old.end ? old.end : '15:30') + '">') + '</div>' +
      '<button class="btn" type="submit">' + (old ? 'Save changes' : 'Add to planner') + '</button>' + (old ? delBtn('delPlan', old.id) : '') + '</form>';
    openSheet(old ? 'Edit plan item' : 'Add to planner', body, { badge: old && old.example ? ' ' + exPill : '', onMount: sh => {
      const f = $('#f', sh);
      const defs = { learn: ['Lesson: ', '15:00', '15:30'], todo: ['e.g. Check bike brakes'] };
      const paint = () => { $$('#tyseg button', sh).forEach(b => b.classList.toggle('on', b.dataset.ty === ty)); $('#times', sh).style.display = ty === 'todo' ? 'none' : ''; f.elements.title.placeholder = defs[ty][0]; };
      paint();
      sh.addEventListener('click', e => { const b = e.target.closest('[data-ty]'); if (b) { ty = b.dataset.ty; paint(); if (!old && ty !== 'todo') { f.elements.start.value = defs[ty][1]; f.elements.end.value = defs[ty][2]; } } });
      f.addEventListener('submit', e => { e.preventDefault(); let title = val(f, 'title').trim(); if (!title) { if (ty === 'todo') { f.elements.title.focus(); return; } title = 'Learning block'; }
        const item = { id: old ? old.id : undefined, type: ty, title, date: val(f, 'date'), start: ty === 'todo' ? '' : val(f, 'start'), end: ty === 'todo' ? '' : val(f, 'end'), done: old ? old.done : false }; if (!item.id) delete item.id;
        Store.upsert('plan', item); if (item.date < ui.wStart || item.date > Store.addDays(ui.wStart, 6)) { ui.wStart = Store.weekStart(item.date); } ui.wSel = item.date; closeSheet(); render(false); toast('Added to planner'); });
    } });
  }

  function lessonSheet(id) {
    const l = LESSONS.find(x => x.id === id), d = S().lessons[id];
    openSheet(l.title, '<div style="color:var(--mute);font-size:13px;margin:-4px 0 12px">' + l.min + ' min read</div><p style="font-size:16.5px;line-height:1.45;margin:0;font-weight:500">' + l.lead + '</p><ul class="lesson-pts">' + l.points.map(p => '<li>' + p + '</li>').join('') + '</ul><div class="callout"><b>Try this</b>' + l.task + '</div>' +
      '<button class="btn ' + (d ? 'ghost' : '') + '" data-act="toggleLesson" data-id="' + id + '" data-close="1">' + ic('check', 20) + (d ? ' Completed · tap to undo' : ' Mark as done') + '</button>', { badge: d && d.example ? ' ' + exPill : '' });
  }

  function reminders() {
    const s = S(), t = Store.today(), out = [], now = new Date();
    if (!s.tips.some(x => x.date === t)) out.push({ icon: 'wallet', t: 'No tips logged today', s: 'Add what you collected', act: 'addTip' });
    const sk = Store.streak(); if (!sk.doneToday) out.push({ icon: 'flame', t: sk.n ? 'Keep your ' + sk.n + '-day streak' : 'Start a learning streak', s: 'One 3-minute lesson', act: 'go-learn' });
    const b = Store.budgetStats(t.slice(0, 7)); if (b.net < 0) out.push({ icon: 'wallet', t: 'Spending is above income this month', s: eur(b.net), act: 'go-budget' });
    if (desk) out.push({ icon: 'briefcase', t: 'Practice desk updated ' + dtl(desk.generated), s: usd(desk.equity) + ' · ' + (desk.pct >= 0 ? '+' : '') + fmt(desk.pct) + '% · practice money', act: null });
    return out;
  }
  function bellSheet() {
    const r = reminders();
    openSheet('Notifications', '<div class="list">' + (r.length ? r.map(x => '<button class="li" data-act="' + (x.act || 'closeSheet') + '"><span class="l-ic" style="background:rgba(201,182,245,.16);color:var(--lav)">' + ic(x.icon, 20) + '</span><span class="l-main"><div class="l-t">' + esc(x.t) + '</div><div class="l-s">' + esc(x.s) + '</div></span></button>').join('') : '<div class="empty">All caught up.</div>') + '</div>');
  }

  // ---------- backup
  function exportData() {
    const blob = new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'vantage-backup-' + Store.today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Backup downloaded');
  }
  function importFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); if (!o || !(Array.isArray(o.shifts) || Array.isArray(o.tips))) throw 0; Store.replace(o); render(false); toast('Backup restored'); } catch (x) { toast('That file is not a Vantage backup'); } }; r.readAsText(f);
  }

  // ---------- actions
  const A = {
    tab: d => go(d.tab), go: d => go(d.tab),
    bell: () => bellSheet(), closeSheet: () => closeSheet(),
    candle: d => { ui.sel[d.id] = ui.sel[d.id] === +d.i ? null : +d.i; render(false); },
    range: d => { ui.range = d.n; ui.sel.home = undefined; ui.sel.earn = undefined; render(false); }, allDays: () => { ui.allDays = !ui.allDays; render(false); },
    addTip: () => tipSheet(), editTip: d => tipSheet(d.id), delTip: (d, el) => confirmDel(el, () => { Store.remove('tips', d.id); closeSheet(); render(false); toast('Deleted'); }),
    addTx: d => txSheet(null, d.type), editTx: d => txSheet(d.id), delTx: (d, el) => confirmDel(el, () => { Store.remove('txs', d.id); closeSheet(); render(false); toast('Deleted'); }),
    addGoal: () => goalSheet(), editGoal: d => goalSheet(d.id), fundGoal: d => fundSheet(d.id), delGoal: (d, el) => confirmDel(el, () => { Store.remove('goals', d.id); closeSheet(); render(false); toast('Deleted'); }),
    addPlan: () => planSheet(null, ui.wSel), editPlan: d => planSheet(d.id), delPlan: (d, el) => confirmDel(el, () => { Store.remove('plan', d.id); closeSheet(); render(false); toast('Deleted'); }),
    togglePlan: d => { const p = S().plan.find(x => x.id === d.id); if (p) { p.done = !p.done; Store.save(); render(false); } },
    selDay: d => { ui.wSel = d.d; render(false); },
    weekNav: d => { ui.wStart = Store.addDays(ui.wStart, 7 * +d.d); ui.wSel = ui.wStart === Store.weekStart(Store.today()) ? Store.today() : ui.wStart; render(false); },
    bMonth: d => { const [y, m] = ui.bMonth.split('-').map(Number), dt = new Date(y, m - 1 + +d.d, 1); ui.bMonth = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); render(false); },
    lesson: d => lessonSheet(d.id),
    toggleLesson: d => { const L = S().lessons; if (L[d.id]) delete L[d.id]; else L[d.id] = { date: Store.today() }; Store.save(); if (d.close) closeSheet(); render(false); if (L[d.id]) toast('Lesson done'); },
    clearEx: () => { Store.clearExamples(); render(false); toast('Examples cleared'); }, restoreEx: () => { Store.restoreExamples(); render(false); toast('Examples loaded'); },
    exportData, importData: () => $('#file').click(),
    resetAll: (d, el) => { openSheet('Erase all data?', '<p style="color:var(--mute);line-height:1.5;margin:0 0 16px">This deletes every tip, entry, goal, plan item and lesson on this phone. Export a backup first if you might want it back.</p><button class="btn danger" data-act="doReset">' + ic('trash', 18) + ' Erase everything</button><button class="btn ghost" data-act="closeSheet">Cancel</button>'); },
    doReset: () => { Store.reset(); closeSheet(); render(true); toast('All data erased'); },
    editName: () => openSheet('Your name', '<form id="f"><div class="fld"><input class="in" name="n" maxlength="24" value="' + esc(S().settings.name) + '"></div><button class="btn" type="submit">Save</button></form>', { onMount: sh => $('#f', sh).addEventListener('submit', e => { e.preventDefault(); S().settings.name = e.target.elements.n.value.trim() || 'You'; Store.save(); closeSheet(); render(false); }) }),
    'go-plan': () => { closeSheet(true); go('planner'); }, 'go-learn': () => { closeSheet(true); go('learn'); }, 'go-budget': () => { closeSheet(true); go('budget'); }
  };
  function confirmDel(el, fn) { if (el.classList.contains('armed')) { fn(); return; } el.classList.add('armed'); el.innerHTML = ic('trash', 18) + ' Tap again to confirm'; setTimeout(() => { if (el.isConnected) { el.classList.remove('armed'); el.innerHTML = ic('trash', 18) + ' Delete'; } }, 3000); }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = A[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'A') return;
    fn(el.dataset, el);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  // ---------- boot
  function loadDesk() {
    fetch('data/desk.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => {
      const first = !desk; desk = j; deskLoaded = true; try { localStorage.setItem('vantage.desk', JSON.stringify(j)); } catch (e) {}
      if (!sheetEl) render(first);
    }).catch(() => { deskLoaded = true; if (!desk && !sheetEl) render(false); });
  }
  (function boot() {
    const h = (location.hash || '').replace('#', '').split('/');
    const ht = VIEWS[h[0]] ? h[0] : VIEWS[h[1]] ? h[1] : null; if (ht) ui.tab = ht;
    render(true); loadDesk();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) navigator.serviceWorker.register('sw.js').catch(() => {});
    // refresh "today" things when app returns to foreground
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !sheetEl) { loadDesk(); render(false); } });
  })();
  window.__vantage = { go, render, ui };
})();
