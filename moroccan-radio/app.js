'use strict';

// Zenders komen live uit de open Radio Browser-database (radio-browser.info),
// zodat stream-URL's actueel blijven. Meerdere mirrors voor als er één plat ligt.
const API_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

// Bekende Marokkaanse zenders voor het tabblad "Populair" (match op naam).
const FEATURED = [
  'hit radio', 'medi 1', 'radio mars', 'chada', 'radio 2m', 'aswat', 'mfm',
  'luxe radio', 'cap radio', 'radio plus', 'medina fm', 'chaine inter',
  'al idaa al watania', 'amazigh', 'mohammed vi', 'atlantic', 'yabiladi',
];

const STORAGE = { favs: 'rm.favs', recent: 'rm.recent', volume: 'rm.volume', theme: 'rm.theme', cache: 'rm.stations' };

const $ = (id) => document.getElementById(id);
const els = {
  search: $('search'), genres: $('genres'), status: $('status'), list: $('stations'),
  player: $('player'), npLogo: $('npLogo'), npName: $('npName'), npMeta: $('npMeta'),
  play: $('playBtn'), prev: $('prevBtn'), next: $('nextBtn'), fav: $('favBtn'),
  volume: $('volume'), audio: $('audio'), theme: $('themeToggle'),
};

const state = {
  stations: [],
  visible: [],
  view: 'all',
  genre: null,
  query: '',
  current: null,
  apiBase: null,
  favs: new Set(load(STORAGE.favs, [])),
  recent: load(STORAGE.recent, []),
};

let hls = null;

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* opslag niet beschikbaar */ }
}

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

async function fetchJson(path) {
  const mirrors = state.apiBase ? [state.apiBase, ...API_MIRRORS.filter((m) => m !== state.apiBase)] : shuffle([...API_MIRRORS]);
  let lastErr;
  for (const base of mirrors) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(base + path, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.apiBase = base;
      return await res.json();
    } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cleanStations(raw) {
  const seen = new Set();
  return raw
    .filter((s) => s.url_resolved && s.lastcheckok !== 0)
    .filter((s) => {
      const key = normalize(s.name).replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({
      id: s.stationuuid,
      name: s.name.trim(),
      url: s.url_resolved,
      favicon: s.favicon || '',
      tags: (s.tags || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      city: s.state || '',
      codec: s.codec || '',
      bitrate: s.bitrate || 0,
      hls: !!s.hls || /\.m3u8(\?|$)/i.test(s.url_resolved),
      votes: s.votes || 0,
      clicks: s.clickcount || 0,
      homepage: s.homepage || '',
    }));
}

async function loadStations() {
  const cached = load(STORAGE.cache, null);
  if (cached && cached.stations?.length) {
    state.stations = cached.stations;
    render();
  }
  try {
    const raw = await fetchJson('/json/stations/bycountrycodeexact/MA?hidebroken=true&order=clickcount&reverse=true&limit=500');
    state.stations = cleanStations(raw);
    save(STORAGE.cache, { at: Date.now(), stations: state.stations });
    render();
  } catch (err) {
    if (!state.stations.length) {
      setStatus('Kon de zenderlijst niet laden. Controleer je internetverbinding en probeer opnieuw.', true);
    }
    console.error(err);
  }
}

function isFeatured(s) {
  const n = normalize(s.name);
  return FEATURED.some((f) => n.includes(f));
}

function filtered() {
  let list = state.stations;
  if (state.view === 'featured') list = list.filter(isFeatured);
  if (state.view === 'favorites') list = list.filter((s) => state.favs.has(s.id));
  if (state.view === 'recent') {
    const byId = new Map(list.map((s) => [s.id, s]));
    list = state.recent.map((id) => byId.get(id)).filter(Boolean);
  }
  if (state.genre) list = list.filter((s) => s.tags.includes(state.genre));
  if (state.query) {
    const q = normalize(state.query);
    list = list.filter((s) => normalize([s.name, s.city, s.tags.join(' ')].join(' ')).includes(q));
  }
  return list;
}

function renderGenres() {
  const counts = new Map();
  for (const s of state.stations) for (const t of s.tags) counts.set(t, (counts.get(t) || 0) + 1);
  const top = [...counts.entries()]
    .filter(([t, n]) => n >= 3 && !['morocco', 'maroc', 'marokko', 'moroccan'].includes(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([t]) => t);

  els.genres.replaceChildren(...top.map((t) => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.genre === t ? ' active' : '');
    b.textContent = t;
    b.addEventListener('click', () => {
      state.genre = state.genre === t ? null : t;
      render();
    });
    return b;
  }));
}

function initials(name) {
  return name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '♪';
}

function logoEl(s, cls) {
  const wrap = document.createElement('span');
  wrap.className = cls;
  wrap.textContent = initials(s.name);
  if (s.favicon && s.favicon.startsWith('https')) {
    const img = new Image();
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.className = cls;
    img.onload = () => wrap.replaceWith(img);
    img.src = s.favicon;
  }
  return wrap;
}

function metaText(s) {
  const parts = [];
  if (s.city) parts.push(s.city);
  if (s.tags.length) parts.push(s.tags.slice(0, 3).join(', '));
  if (s.bitrate) parts.push(s.bitrate + ' kbps');
  return parts.join(' · ') || 'Marokko';
}

function render() {
  renderGenres();
  const list = filtered();
  state.visible = list;

  const items = list.map((s) => {
    const li = document.createElement('li');
    const card = document.createElement('div');
    card.className = 'card' + (state.current?.id === s.id ? ' playing' : '');
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.setAttribute('aria-label', 'Speel ' + s.name);

    const body = document.createElement('span');
    body.className = 'card-body';
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = s.name;
    const meta = document.createElement('span');
    meta.className = 'card-meta';
    meta.textContent = metaText(s);
    body.append(name, meta);

    const fav = document.createElement('button');
    fav.className = 'card-fav' + (state.favs.has(s.id) ? ' on' : '');
    fav.textContent = state.favs.has(s.id) ? '★' : '☆';
    fav.setAttribute('aria-label', state.favs.has(s.id) ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten');
    fav.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(s); });

    card.append(logoEl(s, 'logo'), body, fav);
    card.addEventListener('click', () => play(s));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(s); }
    });
    li.append(card);
    return li;
  });
  els.list.replaceChildren(...items);

  if (!state.stations.length) return;
  if (!list.length) {
    const empty = {
      favorites: 'Nog geen favorieten. Tik op ☆ bij een zender om hem toe te voegen.',
      recent: 'Nog niets beluisterd.',
    }[state.view] || 'Geen zenders gevonden.';
    setStatus(empty);
  } else {
    setStatus(list.length + (list.length === 1 ? ' zender' : ' zenders'));
  }
}

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle('error', isError);
}

function toggleFav(s) {
  if (state.favs.has(s.id)) state.favs.delete(s.id);
  else state.favs.add(s.id);
  save(STORAGE.favs, [...state.favs]);
  updatePlayerFav();
  render();
}

function updatePlayerFav() {
  const on = state.current && state.favs.has(state.current.id);
  els.fav.textContent = on ? '★' : '☆';
  els.fav.classList.toggle('on', !!on);
}

function stopStream() {
  if (hls) { hls.destroy(); hls = null; }
  els.audio.pause();
  els.audio.removeAttribute('src');
  els.audio.load();
}

function play(s) {
  if (state.current?.id === s.id && !els.audio.paused) { togglePlay(); return; }
  stopStream();
  state.current = s;

  els.player.hidden = false;
  els.npName.textContent = s.name;
  els.npMeta.textContent = 'Verbinden…';
  els.npLogo.src = s.favicon && s.favicon.startsWith('https') ? s.favicon : 'icon.svg';
  els.npLogo.onerror = () => { els.npLogo.src = 'icon.svg'; };
  els.play.classList.add('loading');
  updatePlayerFav();

  const useHls = s.hls && window.Hls?.isSupported() && !els.audio.canPlayType('application/vnd.apple.mpegurl');
  if (useHls) {
    hls = new window.Hls();
    hls.on(window.Hls.Events.ERROR, (_e, data) => { if (data.fatal) onError(); });
    hls.loadSource(s.url);
    hls.attachMedia(els.audio);
  } else {
    els.audio.src = s.url;
  }
  els.audio.play().catch(() => { /* afgehandeld via error-event */ });

  state.recent = [s.id, ...state.recent.filter((id) => id !== s.id)].slice(0, 20);
  save(STORAGE.recent, state.recent);

  // Telt de klik mee in Radio Browser, zoals hun gebruiksrichtlijnen vragen.
  if (state.apiBase) fetch(state.apiBase + '/json/url/' + s.id).catch(() => {});

  setMediaSession(s);
  render();
}

function onError() {
  els.play.classList.remove('loading');
  els.play.textContent = '▶';
  els.npMeta.textContent = 'Deze zender is nu niet bereikbaar. Probeer een andere.';
}

function togglePlay() {
  if (!state.current) return;
  if (els.audio.paused) {
    if (!els.audio.src && !hls) { play(state.current); return; }
    els.audio.play().catch(onError);
  } else {
    els.audio.pause();
  }
}

function step(dir) {
  const list = state.visible.length ? state.visible : state.stations;
  if (!list.length) return;
  const i = list.findIndex((s) => s.id === state.current?.id);
  const next = list[(i + dir + list.length) % list.length];
  play(next);
}

function setMediaSession(s) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: s.name,
    artist: 'Radio Maroc',
    album: metaText(s),
    artwork: s.favicon && s.favicon.startsWith('https') ? [{ src: s.favicon, sizes: '512x512' }] : [],
  });
  navigator.mediaSession.setActionHandler('play', togglePlay);
  navigator.mediaSession.setActionHandler('pause', togglePlay);
  navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
  navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
}

// Audio-events
els.audio.addEventListener('playing', () => {
  els.play.classList.remove('loading');
  els.play.textContent = '⏸';
  els.play.setAttribute('aria-label', 'Pauzeren');
  const s = state.current;
  els.npMeta.textContent = 'Live · ' + [s.codec, s.bitrate ? s.bitrate + ' kbps' : ''].filter(Boolean).join(' ');
});
els.audio.addEventListener('pause', () => {
  els.play.textContent = '▶';
  els.play.setAttribute('aria-label', 'Afspelen');
});
els.audio.addEventListener('waiting', () => els.play.classList.add('loading'));
els.audio.addEventListener('error', () => { if (state.current && !hls) onError(); });

// Bediening
els.play.addEventListener('click', togglePlay);
els.prev.addEventListener('click', () => step(-1));
els.next.addEventListener('click', () => step(1));
els.fav.addEventListener('click', () => state.current && toggleFav(state.current));

els.volume.value = load(STORAGE.volume, 0.9);
els.audio.volume = Number(els.volume.value);
els.volume.addEventListener('input', () => {
  els.audio.volume = Number(els.volume.value);
  save(STORAGE.volume, els.audio.volume);
});

let searchTimer;
els.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.query = els.search.value; render(); }, 120);
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    state.view = tab.dataset.view;
    render();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.target.matches('input, textarea, button, [role="button"]')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});

// Thema
const savedTheme = load(STORAGE.theme, null);
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
els.theme.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  save(STORAGE.theme, next);
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

loadStations();
