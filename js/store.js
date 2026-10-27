// State, persistence (localStorage), date helpers, example data, selectors
(function () {
  const KEY = 'vantage.v1';
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const weekStart = s => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
  const today = () => ymd(new Date());
  const hoursBetween = (a, b) => {
    if (!a || !b) return 0;
    const x = a.split(':').map(Number), y = b.split(':').map(Number);
    let m = (y[0] * 60 + y[1]) - (x[0] * 60 + x[1]);
    if (m < 0) m += 1440;
    return m / 60;
  };
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
  const round2 = n => Math.round(n * 100) / 100;

  const EXP_CATS = [
    { id: 'rent', name: 'Rent & bills', icon: 'home', color: '#60A5FA' },
    { id: 'food', name: 'Food', icon: 'utensils', color: '#FBBF24' },
    { id: 'bike', name: 'Bike & fuel', icon: 'bike', color: '#2DD4BF' },
    { id: 'phone', name: 'Phone & data', icon: 'phone', color: '#A78BFA' },
    { id: 'learn', name: 'Learning', icon: 'book', color: '#34D399' },
    { id: 'fun', name: 'Fun', icon: 'sparkle', color: '#F472B6' },
    { id: 'other', name: 'Other', icon: 'dots', color: '#94A3B8' }
  ];
  const INC_CATS = [
    { id: 'delivery', name: 'Delivery payout', icon: 'bike', color: '#2DD4BF' },
    { id: 'side', name: 'Side income', icon: 'bolt', color: '#60A5FA' },
    { id: 'gift', name: 'Gift', icon: 'gift', color: '#F472B6' },
    { id: 'other', name: 'Other', icon: 'dots', color: '#94A3B8' }
  ];

  function blank() {
    return { v: 2, examples: false, tips: [], txs: [], goals: [], plan: [], lessons: {}, legacy: { shifts: [], plan: [] }, settings: { name: 'Γιαννης', weeklyGoal: 400 }, seenIntro: false };
  }

  function exampleData(t) {
    const ex = o => Object.assign({ id: uid(), example: true }, o);
    // [daysAgo, tips] one tip total per day worked (days off have no entry)
    const rows = [[0, 28.45, 'Evening rush'], [1, 24.20], [2, 12.00], [4, 38.30, 'Great Friday'], [5, 27.00], [6, 14.60], [8, 9.40], [9, 18.30], [11, 34.50], [12, 22.00], [14, 8.00], [15, 15.50], [18, 26.00], [19, 24.50], [22, 10.50], [25, 19.00], [26, 28.00]];
    const tips = rows.map(r => ex({ date: addDays(t, -r[0]), amount: r[1], note: r[2] || '' }));

    const txs = [];
    const mo = (offset, day) => { const d = parse(t); d.setDate(1); d.setMonth(d.getMonth() + offset); d.setDate(day); return ymd(d); };
    const td = parse(t).getDate();
    const cur = [[1, 'income', 'delivery', 240, 'Weekly payout'], [1, 'expense', 'rent', 380, 'Rent'], [2, 'expense', 'phone', 18, 'Mobile plan'], [3, 'expense', 'food', 34.8, 'Groceries'],
      [4, 'expense', 'bike', 22, 'Fuel'], [6, 'income', 'delivery', 265, 'Weekly payout'], [7, 'expense', 'food', 12.5, 'Lunch out'], [8, 'expense', 'learn', 9.99, 'Course month'],
      [10, 'expense', 'bike', 36, 'Chain & brake pads'], [12, 'expense', 'fun', 25, 'Cinema + coffee'], [13, 'income', 'delivery', 290, 'Weekly payout'], [14, 'expense', 'food', 41.2, 'Groceries'],
      [16, 'expense', 'bike', 22, 'Fuel'], [18, 'expense', 'rent', 56, 'Electricity'], [20, 'income', 'delivery', 275, 'Weekly payout'], [21, 'expense', 'food', 29.4, 'Groceries'],
      [23, 'expense', 'fun', 18, 'Night out'], [25, 'income', 'side', 60, 'Translation gig'], [27, 'income', 'delivery', 280, 'Weekly payout'], [28, 'expense', 'bike', 22, 'Fuel']];
    cur.forEach(r => { if (r[0] <= td) txs.push(ex({ date: mo(0, r[0]), type: r[1], cat: r[2], amount: r[3], note: r[4] })); });
    const prev = [[1, 'income', 'delivery', 255, 'Weekly payout'], [1, 'expense', 'rent', 380, 'Rent'], [3, 'expense', 'phone', 18, 'Mobile plan'], [5, 'expense', 'food', 38, 'Groceries'],
      [8, 'income', 'delivery', 270, 'Weekly payout'], [12, 'expense', 'bike', 44, 'Fuel'], [15, 'income', 'delivery', 285, 'Weekly payout'], [17, 'expense', 'food', 46, 'Groceries'],
      [20, 'expense', 'fun', 30, 'Weekend out'], [22, 'income', 'delivery', 262, 'Weekly payout'], [26, 'expense', 'learn', 9.99, 'Course month'], [29, 'income', 'delivery', 275, 'Weekly payout']];
    prev.forEach(r => txs.push(ex({ date: mo(-1, Math.min(r[0], 28)), type: r[1], cat: r[2], amount: r[3], note: r[4] })));

    const goals = [
      ex({ name: 'Emergency fund', target: 600, saved: 180 }),
      ex({ name: 'Bike upgrade', target: 350, saved: 95 }),
      ex({ name: 'Learning fund', target: 200, saved: 60 })
    ];

    const ws = weekStart(t);
    const plan = [
      ex({ type: 'learn', date: addDays(ws, 1), title: 'Lesson: Position sizing', start: '15:00', end: '15:30', done: false }),
      ex({ type: 'todo', date: addDays(ws, 1), title: 'Check bike brakes', start: '', end: '', done: false }),
      ex({ type: 'learn', date: addDays(ws, 4), title: 'Lesson: Emergency fund', start: '14:00', end: '14:30', done: false }),
      ex({ type: 'todo', date: addDays(ws, 4), title: 'Move €50 to emergency fund', start: '', end: '', done: false }),
      ex({ type: 'learn', date: addDays(ws, 6), title: 'Review the week + plan next', start: '11:00', end: '11:45', done: false }),
      ex({ type: 'todo', date: addDays(ws, 6), title: 'Refill tyre pressure', start: '', end: '', done: false })
    ];
    const lessons = {};
    lessons.budgeting = { date: addDays(t, -2), example: true };
    lessons.emergency = { date: addDays(t, -1), example: true };
    return { tips, txs, goals, plan, lessons };
  }

  // v1 -> v2: shifts are gone; each day's tips become one tip entry. Old shifts are archived (not shown) so nothing is lost.
  function migrate(o) {
    if (!Array.isArray(o.tips)) o.tips = [];
    o.legacy = o.legacy || { shifts: [], plan: [] };
    if (Array.isArray(o.shifts)) {
      const real = {}, exm = {};
      o.shifts.forEach(x => { const v = parseFloat(x.tips) || 0; if (v <= 0) return; (x.example ? exm : real)[x.date] = Math.round(((x.example ? exm : real)[x.date] || 0) * 100 + v * 100) / 100 / 1; });
      Object.keys(real).forEach(d => o.tips.push({ id: uid(), date: d, amount: Math.round(real[d] * 100) / 100, note: '' }));
      Object.keys(exm).forEach(d => { if (!real[d]) o.tips.push({ id: uid(), date: d, amount: Math.round(exm[d] * 100) / 100, note: '', example: true }); });
      o.legacy.shifts = o.legacy.shifts.concat(o.shifts.filter(x => !x.example)); delete o.shifts;
    }
    if (Array.isArray(o.plan)) { const sh = o.plan.filter(x => x.type === 'shift'); if (sh.length) { o.legacy.plan = o.legacy.plan.concat(sh.filter(x => !x.example)); o.plan = o.plan.filter(x => x.type !== 'shift'); } }
    o.v = 2; return o;
  }
  let S;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { S = Object.assign(blank(), migrate(JSON.parse(raw))); S.settings = Object.assign(blank().settings, S.settings || {}); return; } } catch (e) {}
    S = blank();
    const ex = exampleData(today());
    Object.assign(S, ex, { examples: true });
    save();
  }
  let storageOK = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; } catch (e) { storageOK = false; } }
  load();

  const api = {
    get: () => S, save, ymd, parse, addDays, weekStart, today, hoursBetween, uid, num, round2, EXP_CATS, INC_CATS,
    storageOK: () => storageOK,
    reset() { S = blank(); save(); },
    replace(obj) { S = Object.assign(blank(), migrate(obj)); S.settings = Object.assign(blank().settings, S.settings || {}); save(); },
    clearExamples() {
      S.tips = S.tips.filter(x => !x.example); S.txs = S.txs.filter(x => !x.example); S.goals = S.goals.filter(x => !x.example); S.plan = S.plan.filter(x => !x.example);
      Object.keys(S.lessons).forEach(k => { if (S.lessons[k].example) delete S.lessons[k]; });
      S.examples = false; save();
    },
    restoreExamples() {
      const ex = exampleData(today());
      ['tips', 'txs', 'goals', 'plan'].forEach(k => { S[k] = S[k].filter(x => !x.example).concat(ex[k]); });
      Object.keys(ex.lessons).forEach(k => { if (!S.lessons[k]) S.lessons[k] = ex.lessons[k]; });
      S.examples = true; save();
    },
    hasExamples() {
      return S.tips.some(x => x.example) || S.txs.some(x => x.example) || S.goals.some(x => x.example) || S.plan.some(x => x.example) || Object.values(S.lessons).some(x => x.example);
    },
    // upsert helpers (editing an example makes it the user's own)
    upsert(list, item) {
      const arr = S[list]; const i = arr.findIndex(x => x.id === item.id);
      delete item.example;
      if (i >= 0) arr[i] = item; else arr.push(Object.assign({ id: uid() }, item));
      save();
    },
    remove(list, id) { S[list] = S[list].filter(x => x.id !== id); save(); }
  };

  // ---- selectors (tips only; one entry per day)
  api.tipsBetween = (a, b) => S.tips.filter(x => x.date >= a && x.date <= b);
  api.sumTips = list => round2(list.reduce((n, x) => n + (x.amount || 0), 0));
  api.dayTotal = d => api.sumTips(S.tips.filter(x => x.date === d));
  api.earnStats = () => {
    const t = today(), ws = weekStart(t), mo = t.slice(0, 7);
    const stat = l => ({ total: api.sumTips(l), days: new Set(l.filter(x => x.amount > 0).map(x => x.date)).size });
    const day = S.tips.filter(x => x.date === t), wk = api.tipsBetween(ws, addDays(ws, 6)), mn = S.tips.filter(x => x.date.slice(0, 7) === mo);
    const byDay = {}; S.tips.forEach(x => { byDay[x.date] = round2((byDay[x.date] || 0) + x.amount); });
    let best = null; Object.keys(byDay).forEach(d => { if (byDay[d] > 0 && (!best || byDay[d] > best.total)) best = { date: d, total: byDay[d] }; });
    const m = stat(mn);
    return { today: stat(day), week: stat(wk), month: m, best, avgDay: m.days ? round2(m.total / m.days) : 0 };
  };
  api.monthTx = ym => S.txs.filter(x => x.date.slice(0, 7) === ym);
  api.budgetStats = ym => {
    const l = api.monthTx(ym); const inc = round2(l.filter(x => x.type === 'income').reduce((n, x) => n + x.amount, 0)); const exp = round2(l.filter(x => x.type === 'expense').reduce((n, x) => n + x.amount, 0));
    const byCat = {}; l.filter(x => x.type === 'expense').forEach(x => { byCat[x.cat] = round2((byCat[x.cat] || 0) + x.amount); });
    return { income: inc, expense: exp, net: round2(inc - exp), byCat, list: l };
  };
  api.streak = () => {
    const days = new Set(Object.values(S.lessons).map(x => x.date));
    let d = today(); if (!days.has(d)) d = addDays(d, -1);
    let n = 0; while (days.has(d)) { n++; d = addDays(d, -1); }
    return { n, doneToday: days.has(today()), days };
  };
  window.Store = api;
})();
