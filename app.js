import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://yqjbjzmedunclslhvrro.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1ZHJWTv1mcBaJuh6fyCtrg_Plv9q9fn';
const BUCKET = 'minku-private-media';
const PROFILE_FILE = 'Photo 2.JPG.jpeg';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

const $ = (sel) => document.querySelector(sel);
const state = { objects: [], musicUrl: '', selected: false };

function showStatus(message, error = false) {
  const el = $('#status');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  el.style.color = error ? '#ffb3b3' : '#bbb';
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => el.classList.remove('show'), 3200);
}

async function ensureSession() {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return existing.data.session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Anonymous sign-in failed: ${error.message}`);
  return data.session;
}

async function listMedia() {
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 100, offset: 0 });
  if (error) throw new Error(`Private media list failed: ${error.message}`);
  return (data || []).filter(x => x && x.name);
}

async function signedUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw new Error(`Signed URL failed for ${path}: ${error.message}`);
  return data.signedUrl;
}

function findExact(name) {
  const n = String(name).trim().toLowerCase();
  return state.objects.find(o => String(o.name).trim().toLowerCase() === n) || null;
}

function isImage(name) {
  return /\.(jpe?g|png|webp|gif|avif)$/i.test(name);
}

function isVideo(name) {
  return /\.(mp4|mov|m4v|webm)$/i.test(name);
}

function findMusic() {
  return state.objects.find(o => /music|song|audio|sound/i.test(o.name) && isVideo(o.name)) || null;
}

async function buildProfiles() {
  const grid = $('#profileGrid');
  grid.innerHTML = '';

  const allImages = state.objects.filter(o => isImage(o.name));
  const profile = findExact(PROFILE_FILE) || allImages[0];
  const alternates = allImages.filter(o => o.name !== profile?.name).slice(0, 3);
  const cards = [
    { obj: alternates[0] || profile, label: '🎂🎈', active: false },
    { obj: profile, label: '❤️', active: true },
    { obj: alternates[1] || profile, label: '✨💕', active: false },
    { obj: alternates[2] || profile, label: '😻', active: false }
  ];

  for (let i = 0; i < cards.length; i++) {
    const item = cards[i];
    const button = document.createElement('button');
    button.className = `profile-card${item.active ? ' active' : ''}`;
    button.type = 'button';

    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';

    const img = document.createElement('img');
    img.alt = item.active ? 'Minku' : 'Profile';

    if (item.obj) {
      try { img.src = await signedUrl(item.obj.name); } catch (e) { console.error(e); }
    }

    avatar.appendChild(img);
    button.appendChild(avatar);

    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = item.active ? 'Minku' : 'Profile';
    button.appendChild(name);

    const badge = document.createElement('div');
    badge.className = 'profile-badge';
    badge.textContent = item.label;
    button.appendChild(badge);

    if (item.active) {
      button.addEventListener('click', selectMinku);
    } else {
      button.addEventListener('click', () => showStatus('This story is private. ❤️'));
    }

    grid.appendChild(button);
  }
}

async function loadMediaRows() {
  const photoRow = $('#photoRow');
  const videoRow = $('#videoRow');
  photoRow.innerHTML = '';
  videoRow.innerHTML = '';

  const imageObjects = state.objects.filter(o => isImage(o.name) && o.name !== PROFILE_FILE);
  const music = findMusic();
  const videoObjects = state.objects.filter(o => isVideo(o.name) && o.name !== music?.name);

  for (let i = 0; i < imageObjects.length; i++) {
    const obj = imageObjects[i];
    const card = document.createElement('article');
    card.className = 'photo-card';
    const frame = document.createElement('div');
    frame.className = 'photo-frame';
    const img = document.createElement('img');
    img.alt = `Minku memory ${i + 1}`;
    try { img.src = await signedUrl(obj.name); } catch (e) { console.error(e); }
    frame.appendChild(img);
    const title = document.createElement('div');
    title.className = 'photo-title';
    title.textContent = `Beautiful Memory ${i + 1} ❤️`;
    card.append(frame, title);
    card.addEventListener('click', () => openViewer('image', img.src, `Beautiful Memory ${i + 1}`));
    photoRow.appendChild(card);
  }

  for (let i = 0; i < videoObjects.length; i++) {
    const obj = videoObjects[i];
    const card = document.createElement('article');
    card.className = 'video-card';
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    try { video.src = await signedUrl(obj.name); } catch (e) { console.error(e); }
    thumb.appendChild(video);
    const title = document.createElement('div');
    title.className = 'video-title';
    title.textContent = `Episode ${i + 1} — A Moment Worth Keeping 🎬`;
    const meta = document.createElement('div');
    meta.className = 'video-meta';
    meta.textContent = 'MINKU ORIGINAL';
    card.append(thumb, title, meta);
    card.addEventListener('click', () => openViewer('video', video.src, `Episode ${i + 1}`));
    videoRow.appendChild(card);
  }
}

async function prepareMusic() {
  const music = findMusic();
  if (!music) {
    showStatus('Music MP4 was not found in the private bucket.', true);
    return;
  }

  try {
    state.musicUrl = await signedUrl(music.name);
    const player = $('#musicPlayer');
    player.src = state.musicUrl;
    player.loop = true;
    player.volume = 0.38;
  } catch (e) {
    console.error(e);
    showStatus(e.message, true);
  }
}

async function startMusic() {
  const player = $('#musicPlayer');
  if (!state.musicUrl) return;
  try {
    await player.play();
    $('#musicButton').classList.remove('hidden');
    $('#musicButton').textContent = '🔊 MUSIC ON';
  } catch (e) {
    $('#musicButton').classList.remove('hidden');
    $('#musicButton').textContent = '▶ PLAY MUSIC';
  }
}

function showApp() {
  $('#profiles').classList.remove('ready');
  $('#profiles').style.display = 'none';
  $('#app').classList.remove('hidden');
  requestAnimationFrame(() => $('#app').classList.add('ready'));
  $('#musicButton').classList.remove('hidden');
}

async function selectMinku() {
  if (state.selected) return;
  state.selected = true;
  showApp();
  await startMusic();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openViewer(type, src, title) {
  const viewer = $('#viewer');
  const media = $('#viewerMedia');
  media.innerHTML = '';
  if (type === 'image') {
    const img = document.createElement('img');
    img.src = src;
    img.alt = title;
    media.appendChild(img);
  } else {
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.addEventListener('play', () => $('#musicPlayer').pause());
    video.addEventListener('ended', () => startMusic());
    media.appendChild(video);
  }
  viewer.classList.remove('hidden');
  viewer.setAttribute('aria-hidden', 'false');
}

function closeViewer() {
  $('#viewer').classList.add('hidden');
  $('#viewer').setAttribute('aria-hidden', 'true');
  const video = $('#viewerMedia video');
  if (video) video.pause();
  $('#viewerMedia').innerHTML = '';
}

async function init() {
  try {
    await ensureSession();
    state.objects = await listMedia();
    console.info('[Minku private media] files:', state.objects.map(x => x.name));

    await buildProfiles();
    await loadMediaRows();
    await prepareMusic();

    setTimeout(() => $('#profiles').classList.add('ready'), 2150);
  } catch (error) {
    console.error(error);
    showStatus(error.message, true);
    setTimeout(() => $('#profiles').classList.add('ready'), 2150);
  }
}

$('#viewerClose').addEventListener('click', closeViewer);
$('#viewer').addEventListener('click', (e) => { if (e.target.id === 'viewer') closeViewer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeViewer(); });
$('#playStory').addEventListener('click', () => { window.scrollTo({ top: document.querySelector('#episodes').offsetTop - 58, behavior: 'smooth' }); });
$('#musicButton').addEventListener('click', async () => {
  const player = $('#musicPlayer');
  if (player.paused) await startMusic();
  else { player.pause(); $('#musicButton').textContent = '▶ PLAY MUSIC'; }
});

document.addEventListener('pointerdown', () => { if (state.selected && $('#musicPlayer').paused) startMusic(); }, { once: true, passive: true });

init();
