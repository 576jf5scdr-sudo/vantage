// Tiny SVG chart helpers (no deps)
(function () {
  let uid = 0;
  const clamp = (v, a, b) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), v));
  function smooth(pts) {
    if (pts.length < 2) return '';
    let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.2;
      const c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = clamp(p1[1] + (p2[1] - p0[1]) * t, p1[1], p2[1]);
      const c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = clamp(p2[1] - (p3[1] - p1[1]) * t, p1[1], p2[1]);
      d += 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }
  // values: number[]; opts: w,h,xs(optional numeric x), color, padTop, padBottom, grid, labels:[left,right], dot, minY
  window.lineChart = function (values, o) {
    o = o || {};
    const w = o.w || 320, h = o.h || 110, color = o.color || '#2DD4BF', id = 'g' + (++uid);
    const padT = o.padTop == null ? 14 : o.padTop, padB = o.padBottom == null ? 10 : o.padBottom, padX = o.padX == null ? 10 : o.padX;
    let v = values.slice();
    if (v.length === 0) v = [0, 0];
    if (v.length === 1) v = [v[0], v[0]];
    let xs = o.xs && o.xs.length === v.length ? o.xs : v.map((_, i) => i);
    const xmin = xs[0], xmax = xs[xs.length - 1] || 1;
    let lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    if (o.minY != null) lo = Math.min(lo, o.minY);
    if (hi === lo) { hi = lo + 1; lo = lo - 1; }
    const X = x => padX + (xmax === xmin ? 0 : (x - xmin) / (xmax - xmin)) * (w - padX * 2);
    const Y = y => padT + (1 - (y - lo) / (hi - lo)) * (h - padT - padB);
    const pts = v.map((y, i) => [X(xs[i]), Y(y)]);
    const line = smooth(pts);
    const last = pts[pts.length - 1];
    const fill = line + 'L' + last[0].toFixed(1) + ',' + h + 'L' + pts[0][0].toFixed(1) + ',' + h + 'Z';
    let grid = '';
    if (o.grid) for (let i = 0; i < 4; i++) { const y = padT + i * ((h - padT - padB) / 3); grid += '<line x1="0" x2="' + w + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="rgba(255,255,255,.06)" stroke-dasharray="3 5"/>'; }
    let labels = '';
    if (o.labels) labels = '<text x="' + padX + '" y="' + (h - 1) + '" class="ch-lab">' + o.labels[0] + '</text><text x="' + (w - padX) + '" y="' + (h - 1) + '" text-anchor="end" class="ch-lab">' + o.labels[1] + '</text>';
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + (h + (o.labels ? 10 : 0)) + '" width="100%" role="img" aria-label="' + (o.aria || 'chart') + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".30"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient>' +
      '<filter id="' + id + 'f" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs>' +
      grid + '<path d="' + fill + '" fill="url(#' + id + ')" class="ch-fill"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="5" stroke-opacity=".35" filter="url(#' + id + 'f)" class="ch-line draw" pathLength="1"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="ch-line draw" pathLength="1"/>' +
      (o.dot === false ? '' : '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" fill="' + color + '" class="ch-dot"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="8" fill="' + color + '" fill-opacity=".22" class="ch-dot"/>') +
      labels + '</svg>';
  };
})();

// Candlestick chart. cs: [{o,c,h,l,label,tip,empty}], opts: id, sel (index|null), labelEvery, h
(function () {
  window.candleChart = function (cs, o) {
    o = o || {};
    const w = 340, h = o.h || 200, padX = 6, padT = 46, padB = 28, n = cs.length;
    const real = cs.filter(c => !c.empty);
    if (!real.length) return '';
    let lo = Math.min.apply(null, real.map(c => c.l)), hi = Math.max.apply(null, real.map(c => c.h));
    if (hi === lo) { hi = lo + 1; lo = lo - 1; }
    const span = hi - lo; lo -= span * 0.06; hi += span * 0.06;
    const slot = (w - padX * 2) / n, bw = Math.min(26, Math.max(3, slot * 0.58)), wk = n > 16 ? 1.4 : 2;
    const Y = v => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);
    const step = o.labelEvery || 1;
    let g = '', lab = '', hit = '', tip = '';
    cs.forEach((c, i) => {
      const x = padX + slot * (i + 0.5), sel = o.sel === i;
      if (i % step === 0 || (i === n - 1 && (i % step) >= step * 0.6))
        lab += '<text x="' + x.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" class="lab ' + (sel ? 'on' : '') + '">' + c.label + '</text>';
      if (c.empty) return;
      const up = c.c >= c.o, col = up ? '#9fdcb5' : '#c9b6f5';
      const yt = Y(Math.max(c.o, c.c)), yb = Y(Math.min(c.o, c.c)), bh = Math.max(3, yb - yt);
      if (sel) g += '<rect x="' + (padX + slot * i + 1).toFixed(1) + '" y="' + (padT - 8) + '" width="' + (slot - 2).toFixed(1) + '" height="' + (h - padB - padT + 10) + '" rx="10" fill="rgba(255,255,255,.055)"/>';
      g += '<g class="cn" style="--k:' + i + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Y(c.h).toFixed(1) + '" y2="' + Y(c.l).toFixed(1) + '" stroke="' + col + '" stroke-width="' + wk + '" stroke-linecap="round" opacity="' + (o.sel == null || sel ? 1 : .8) + '"/>' +
        '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="' + Math.min(5, bw / 3).toFixed(1) + '" fill="' + col + '"/></g>';
      if (sel && c.tip) {
        const left = Math.max(26, Math.min(74, x / w * 100)), dx = (x / w * 100 - left) / 100 * w;
        tip = '<div class="tip" style="left:' + left.toFixed(1) + '%;top:0;--dx:' + dx.toFixed(1) + 'px">' + c.tip + '</div>';
      }
    });
    if (o.id) cs.forEach((c, i) => { if (!c.empty) hit += '<rect class="hit" data-act="candle" data-id="' + o.id + '" data-i="' + i + '" x="' + (padX + slot * i).toFixed(1) + '" y="0" width="' + slot.toFixed(1) + '" height="' + h + '"/>'; });
    return '<div class="cwrap" data-chart="' + (o.id || '') + '"><svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + (o.aria || 'candlestick chart') + '">' + g + lab + hit + '</svg>' + tip + '</div>';
  };
})();
