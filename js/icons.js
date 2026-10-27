// Minimal stroke icon set (24x24, currentColor)
(function () {
  const P = {
    home: '<path d="M3.5 11 12 3.5 20.5 11"/><path d="M5.5 9.5V20h4.5v-6h4v6h4.5V9.5"/>',
    activity: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    insights: '<rect x="4" y="8" width="16" height="12" rx="2.5"/><path d="M9 8V6.2A1.2 1.2 0 0 1 10.2 5h3.6A1.2 1.2 0 0 1 15 6.2V8"/><path d="M4 13.5h16"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-3.8 3.7-5.8 7.5-5.8s6.9 2 7.5 5.8"/>',
    bell: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.8 1.8H4.2z"/><path d="M10 21h4"/>',
    chevron: '<path d="m9.5 6 6 6-6 6"/>',
    chevronL: '<path d="m14.5 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
    flame: '<path d="M12 3c.6 3.6 5 5 5 10a5 5 0 0 1-10 0c0-2 .9-3.2 2-4.2.1 1.9.9 2.7 1.8 3C10.4 8.4 10.6 5.6 12 3z"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>',
    pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    edit: '<path d="m4.5 19.5 1-4L16.6 4.4a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L8.5 18.5z"/>',
    trend: '<path d="m3.5 17 5.5-5.5 4 4L20.5 8"/><path d="M15 8h5.5v5.5"/>',
    utensils: '<path d="M7 3v8M4.8 3v5a2.2 2.2 0 0 0 4.4 0V3M7 11v10M17 3c-2.2 1.8-3 4.5-3 8h3v10"/>',
    bike: '<circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="m6 16.5 3.5-7h5l3.5 7M9.5 9.5 8.5 6.5H6.5M12 16.5l2.5-7"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
    sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    dots: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.6 7.5 9 4.3-1.4 7.5-4.4 7.5-9V6z"/><path d="m8.8 12 2.4 2.4 4-4.6"/>',
    download: '<path d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5M5 20h14"/>',
    upload: '<path d="M12 16V5M7.5 9.2 12 4.7l4.5 4.5M5 20h14"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4M4 4v4h4M4 13a8 8 0 0 0 14.3 4M20 20v-4h-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6A2 2 0 0 0 4 6v7.5A2 2 0 0 0 6 15.5h2.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18v3.5H3zM12 9v11M12 9c-2.5 0-4-1-4-2.5S9.5 4 12 9zm0 0c2.5 0 4-1 4-2.5S14.5 4 12 9z"/>',
    briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 13h17"/>'
  };
  window.ic = function (name, size, cls) {
    size = size || 22;
    return '<svg class="ic ' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  };
})();
