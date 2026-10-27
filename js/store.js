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
    return { v: 1, examples: false, shifts: [], txs: [], goals: [], plan: [], lessons: {}, settings: { name: 'Γιαννης', weeklyGoal: 400 }, seenIntro: false };
  }

  function exampleData(t) {
    const ex = o => Object.assign({ id: uid(), example: true }, o);
    const shifts = [];
    // [daysAgo, start, end, base, tips, orders] two on today so the home card reads like the design
    const rows = [
      [0, '12:00', '14:30', 38.00, 8.45, 6], [0, '18:00', '22:00', 62.00, 20.00, 11],
      [1, '17:30', '22:30', 71.50, 24.20, 13], [2, '18:00', '23:00', 66.00, 12.00, 12],
      [4, '12:00', '15:00', 41.00, 6.50, 7], [4, '18:00', '23:30', 84.00, 31.80, 16],
      [5, '17:00', '23:00', 78.50, 27.00, 15], [6, '11:30', '15:30', 55.00, 14.60, 9],
      [8, '18:00', '22:30', 58.00, 9.40, 10], [9, '17:30', '22:00', 63.50, 18.30, 12],
      [11, '12:00', '15:00', 40.00, 5.00, 7], [11, '18:00', '23:30', 82.00, 29.50, 15],
      [12, '17:00', '23:00', 74.00, 22.00, 14], [14, '18:00', '22:00', 52.00, 8.00, 9],
      [15, '18:00', '23:00', 67.00, 15.50, 12], [18, '17:30', '23:00', 76.00, 26.00, 14],
      [19, '17:00', '23:00', 79.00, 24.50, 15], [22, '18:00', '22:30', 57.00, 10.50, 10],
      [25, '17:30', '23:00', 73.00, 19.00, 13], [26, '17:00', '23:00', 80.00, 28.00, 15]
    ];
    rows.forEach(r => shifts.push(ex({ date: addDays(t, -r[0]), start: r[1], end: r[2], base: r[3], tips: r[4], orders: r[5] })));

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
      ex({ type: 'shift', date: ws, title: 'Evening shift', start: '18:00', end: '22:30', done: false }),
      ex({ type: 'shift', date: addDays(ws, 1), title: 'Lunch + evening', start: '12:00', end: '22:00', done: false }),
      ex({ type: 'learn', date: addDays(ws, 1), title: 'Lesson: Position sizing', start: '15:00', end: '15:30', done: false }),
      ex({ type: 'todo', date: addDays(ws, 1), title: 'Check bike brakes', start: '', end: '', done: false }),
      ex({ type: 'shift', date: addDays(ws, 3), title: 'Evening shift', start: '17:30', end: '23:00', done: false }),
      ex({ type: 'shift', date: addDays(ws, 4), title: 'Evening shift', start: '17:00', end: '23:30', done: false }),
      ex({ type: 'learn', date: addDays(ws, 4), title: 'Lesson: Emergency fund', start: '14:00', end: '14:30', done: false }),
      ex({ type: 'todo', date: addDays(ws, 4), title: 'Move €50 to emergency fund', start: '', end: '', done: false }),
      ex({ type: 'shift', date: addDays(ws, 5), title: 'Lunch + evening', start: '11:30', end: '23:00', done: false }),
      ex({ type: 'learn', date: addDays(ws, 6), title: 'Review the week + plan next', start: '11:00', end: '11:45', done: false }),
      ex({ type: 'todo', date: addDays(ws, 6), title: 'Refill tyre pressure', start: '', end: '', done: false })
    ];
    const lessons = {};
    lessons.budgeting = { date: addDays(t, -2), example: true };
    lessons.emergency = { date: addDays(t, -1), example: true };
    return { shifts, txs, goals, plan, lessons };
  }

  let S;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { S = Object.assign(blank(), JSON.parse(raw)); S.settings = Object.assign(blank().settings, S.settings || {}); return; } } catch (e) {}
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
    replace(obj) { S = Object.assign(blank(), obj); S.settings = Object.assign(blank().settings, S.settings || {}); save(); },
    clearExamples() {
      S.shifts = S.shifts.filter(x => !x.example); S.txs = S.txs.filter(x => !x.example); S.goals = S.goals.filter(x => !x.example); S.plan = S.plan.filter(x => !x.example);
      Object.keys(S.lessons).forEach(k => { if (S.lessons[k].example) delete S.lessons[k]; });
      S.examples = false; save();
    },
    restoreExamples() {
      const ex = exampleData(today());
      ['shifts', 'txs', 'goals', 'plan'].forEach(k => { S[k] = S[k].filter(x => !x.example).concat(ex[k]); });
      Object.keys(ex.lessons).forEach(k => { if (!S.lessons[k]) S.lessons[k] = ex.lessons[k]; });
      S.examples = true; save();
    },
    hasExamples() {
      return S.shifts.some(x => x.example) || S.txs.some(x => x.example) || S.goals.some(x => x.example) || S.plan.some(x => x.example) || Object.values(S.lessons).some(x => x.example);
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

  // ---- selectors
  const pay = s => round2((s.base || 0) + (s.tips || 0));
  const hrs = s => hoursBetween(s.start, s.end);
  api.pay = pay; api.hrs = hrs;
  api.shiftsBetween = (a, b) => S.shifts.filter(s => s.date >= a && s.date <= b);
  api.sumPay = list => round2(list.reduce((n, s) => n + pay(s), 0));
  api.sumHrs = list => list.reduce((n, s) => n + hrs(s), 0);
  api.dailyTotals = (endDate, n) => { const out = []; for (let i = n - 1; i >= 0; i--) { const d = addDays(endDate, -i); out.push({ date: d, total: api.sumPay(S.shifts.filter(s => s.date === d)) }); } return out; };
  api.earnStats = () => {
    const t = today(), ws = weekStart(t), we = addDays(ws, 6), mo = t.slice(0, 7);
    const day = S.shifts.filter(s => s.date === t), wk = api.shiftsBetween(ws, we), mn = S.shifts.filter(s => s.date.slice(0, 7) === mo);
    const stat = l => ({ total: api.sumPay(l), hours: api.sumHrs(l), orders: l.reduce((n, s) => n + (s.orders || 0), 0), tips: round2(l.reduce((n, s) => n + (s.tips || 0), 0)), tipCount: l.filter(s => (s.tips || 0) > 0).length, count: l.length });
    // best weekday by average pay per hour
    const wd = Array.from({ length: 7 }, () => ({ total: 0, hours: 0, n: 0 }));
    S.shifts.forEach(s => { const k = (parse(s.date).getDay() + 6) % 7; wd[k].total += pay(s); wd[k].hours += hrs(s); wd[k].n++; });
    const per = wd.map(x => (x.hours > 0 ? x.total / x.hours : 0));
    let best = -1; per.forEach((v, i) => { if (v > 0 && (best < 0 || v > per[best])) best = i; });
    return { today: stat(day), week: stat(wk), month: stat(mn), weekdays: wd, perHour: per, best };
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
