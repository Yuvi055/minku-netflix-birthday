import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL =
  'https://yqjbjzmedunclslhvrro.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_1ZHJWTv1mcBaJuh6fyCtrg_Plv9q9fn';

const BUCKET =
  'minku-private-media';

const PROFILE_FILE =
  'Photo 2.JPG.jpeg';

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );

const $ = (selector) =>
  document.querySelector(selector);

const state = {
  objects: [],
  musicUrl: '',
  selected: false
};


/* =========================================================
   STATUS
========================================================= */

function showStatus(
  message,
  isError = false
) {
  const status =
    $('#status');

  if (!status) return;

  status.textContent =
    message;

  status.style.color =
    isError
      ? '#ffb3b3'
      : '#bbb';

  status.classList.add(
    'show'
  );

  clearTimeout(
    showStatus.timer
  );

  showStatus.timer =
    setTimeout(
      () =>
        status.classList.remove(
          'show'
        ),
      3500
    );
}


/* =========================================================
   BOOT / NETFLIX INTRO
========================================================= */

function revealProfileScreen() {

  const boot =
    $('#boot');

  const profiles =
    $('#profiles');

  /*
    Very important:
    remove the permanent black Netflix N layer.
  */

  if (boot) {
    boot.style.opacity =
      '0';

    boot.style.visibility =
      'hidden';

    boot.style.pointerEvents =
      'none';

    boot.setAttribute(
      'aria-hidden',
      'true'
    );
  }

  if (profiles) {
    profiles.classList.add(
      'ready'
    );
  }
}


/* =========================================================
   AUTH SESSION
========================================================= */

async function ensureSession() {

  const {
    data
  } =
    await supabase.auth.getSession();

  if (data?.session) {
    return data.session;
  }

  const {
    data: signInData,
    error
  } =
    await supabase.auth
      .signInAnonymously();

  if (error) {
    throw new Error(
      `Anonymous sign-in failed: ${error.message}`
    );
  }

  return signInData?.session;
}


/* =========================================================
   LIST PRIVATE FILES
========================================================= */

async function listMedia() {

  const {
    data,
    error
  } =
    await supabase.storage
      .from(BUCKET)
      .list(
        '',
        {
          limit: 100,
          offset: 0
        }
      );

  if (error) {
    throw new Error(
      `Private media list failed: ${error.message}`
    );
  }

  return Array.isArray(data)
    ? data.filter(
        item =>
          item &&
          item.name
      )
    : [];
}


/* =========================================================
   SIGNED URL
========================================================= */

async function signedUrl(
  path
) {

  const {
    data,
    error
  } =
    await supabase.storage
      .from(BUCKET)
      .createSignedUrl(
        path,
        60 * 60
      );

  if (error) {
    throw new Error(
      `Signed URL failed for ${path}: ${error.message}`
    );
  }

  return data?.signedUrl ||
    null;
}


/* =========================================================
   FILE HELPERS
========================================================= */

function isImage(
  name
) {
  return /\.(jpe?g|png|webp|gif|avif)$/i
    .test(
      String(name || '')
    );
}


function isVideo(
  name
) {
  return /\.(mp4|mov|m4v|webm)$/i
    .test(
      String(name || '')
    );
}


function findExact(
  name
) {

  const target =
    String(name || '')
      .trim()
      .toLowerCase();

  return (
    state.objects.find(
      item =>
        String(item.name)
          .trim()
          .toLowerCase() ===
        target
    ) || null
  );
}


function findMusic() {

  /*
    Prefer filename containing
    music/song/audio/sound.
  */

  const named =
    state.objects.find(
      item =>
        /music|song|audio|sound/i
          .test(item.name) &&
        isVideo(item.name)
    );

  if (named) {
    return named;
  }

  /*
    Fallback:
    use MP4/MOV file if there is
    only one obvious media file.
  */

  const videos =
    state.objects.filter(
      item =>
        isVideo(item.name)
    );

  return (
    videos.find(
      item =>
        /\.mp4$/i
          .test(item.name)
    ) ||
    null
  );
}


/* =========================================================
   PROFILE CARDS
   Creates them IMMEDIATELY so the
   Netflix screen never waits for Supabase.
========================================================= */

function createProfileCard({
  name,
  label,
  active
}) {

  const button =
    document.createElement(
      'button'
    );

  button.type =
    'button';

  button.className =
    `profile-card${
      active
        ? ' active'
        : ''
    }`;

  const avatar =
    document.createElement(
      'div'
    );

  avatar.className =
    'profile-avatar';

  /*
    Temporary fallback so profile
    never appears empty.
  */

  avatar.textContent =
    active
      ? 'M'
      : '♥';

  avatar.style.display =
    'grid';

  avatar.style.placeItems =
    'center';

  avatar.style.fontSize =
    'clamp(35px,7vw,70px)';

  avatar.style.fontWeight =
    '900';

  avatar.style.color =
    '#fff';

  avatar.style.background =
    active
      ? 'linear-gradient(135deg,#8b0000,#e50914)'
      : '#222';

  const nameEl =
    document.createElement(
      'div'
    );

  nameEl.className =
    'profile-name';

  nameEl.textContent =
    name;

  const badge =
    document.createElement(
      'div'
    );

  badge.className =
    'profile-badge';

  badge.textContent =
    label;

  button.append(
    avatar,
    nameEl,
    badge
  );

  if (active) {

    button.addEventListener(
      'click',
      selectMinku
    );

  } else {

    button.addEventListener(
      'click',
      () =>
        showStatus(
          'This profile is private. ❤️'
        )
    );
  }

  return {
    button,
    avatar,
    active
  };
}


function buildProfileSkeleton() {

  const grid =
    $('#profileGrid');

  if (!grid) {
    console.error(
      'profileGrid not found'
    );

    return;
  }

  grid.innerHTML =
    '';

  const profiles = [
    {
      name: 'Minku',
      label: '🎂❤️',
      active: true
    },
    {
      name: 'Yuvi',
      label: '✨',
      active: false
    },
    {
      name: 'Memories',
      label: '💕',
      active: false
    },
    {
      name: 'Friends',
      label: '🥰',
      active: false
    }
  ];

  const cards =
    [];

  profiles.forEach(
    profile => {

      const card =
        createProfileCard(
          profile
        );

      cards.push(
        card
      );

      grid.appendChild(
        card.button
      );
    }
  );

  return cards;
}


/* =========================================================
   LOAD ACTUAL PROFILE IMAGES
========================================================= */

async function hydrateProfileImages() {

  const grid =
    $('#profileGrid');

  if (!grid) return;

  const cards =
    Array.from(
      grid.querySelectorAll(
        '.profile-card'
      )
    );

  const allImages =
    state.objects.filter(
      item =>
        isImage(
          item.name
        )
    );

  /*
    Minku MUST use Photo 2.
  */

  const minkuProfile =
    findExact(
      PROFILE_FILE
    ) ||
    allImages[0] ||
    null;

  const alternateImages =
    allImages.filter(
      item =>
        item.name !==
        minkuProfile?.name
    );

  const selectedImages = [
    minkuProfile,
    alternateImages[0] ||
      minkuProfile,
    alternateImages[1] ||
      minkuProfile,
    alternateImages[2] ||
      minkuProfile
  ];

  for (
    let i = 0;
    i < cards.length;
    i++
  ) {

    const object =
      selectedImages[i];

    if (!object) {
      continue;
    }

    const avatar =
      cards[i].querySelector(
        '.profile-avatar'
      );

    if (!avatar) {
      continue;
    }

    try {

      const url =
        await signedUrl(
          object.name
        );

      const img =
        document.createElement(
          'img'
        );

      img.src =
        url;

      img.alt =
        i === 0
          ? 'Minku'
          : 'Birthday profile';

      img.style.width =
        '100%';

      img.style.height =
        '100%';

      img.style.objectFit =
        'cover';

      img.style.display =
        'block';

      avatar.textContent =
        '';

      avatar.style.display =
        'block';

      avatar.appendChild(
        img
      );

    } catch (error) {

      console.error(
        'Profile image error:',
        error
      );
    }
  }
}


/* =========================================================
   LOAD PHOTOS
========================================================= */

async function loadPhotos() {

  const row =
    $('#photoRow');

  if (!row) {
    return;
  }

  row.innerHTML =
    '';

  const photos =
    state.objects.filter(
      item =>
        isImage(
          item.name
        ) &&
        item.name !==
          PROFILE_FILE
    );

  for (
    let i = 0;
    i < photos.length;
    i++
  ) {

    const object =
      photos[i];

    const card =
      document.createElement(
        'article'
      );

    card.className =
      'photo-card';

    const frame =
      document.createElement(
        'div'
      );

    frame.className =
      'photo-frame';

    const img =
      document.createElement(
        'img'
      );

    img.alt =
      `Minku memory ${
        i + 1
      }`;

    img.loading =
      'lazy';

    try {

      img.src =
        await signedUrl(
          object.name
        );

    } catch (error) {

      console.error(
        error
      );
    }

    frame.appendChild(
      img
    );

    const title =
      document.createElement(
        'div'
      );

    title.className =
      'photo-title';

    title.textContent =
      `Beautiful Memory ${
        i + 1
      } ❤️`;

    card.append(
      frame,
      title
    );

    card.addEventListener(
      'click',
      () =>
        openViewer(
          'image',
          img.src,
          title.textContent
        )
    );

    row.appendChild(
      card
    );
  }
}


/* =========================================================
   LOAD VIDEOS
========================================================= */

async function loadVideos() {

  const row =
    $('#videoRow');

  if (!row) {
    return;
  }

  row.innerHTML =
    '';

  const music =
    findMusic();

  const videos =
    state.objects.filter(
      item =>
        isVideo(
          item.name
        ) &&
        item.name !==
          music?.name
    );

  for (
    let i = 0;
    i < videos.length;
    i++
  ) {

    const object =
      videos[i];

    const card =
      document.createElement(
        'article'
      );

    card.className =
      'video-card';

    const thumb =
      document.createElement(
        'div'
      );

    thumb.className =
      'thumb';

    const video =
      document.createElement(
        'video'
      );

    video.muted =
      true;

    video.playsInline =
      true;

    video.preload =
      'metadata';

    try {

      video.src =
        await signedUrl(
          object.name
        );

    } catch (error) {

      console.error(
        error
      );
    }

    thumb.appendChild(
      video
    );

    const title =
      document.createElement(
        'div'
      );

    title.className =
      'video-title';

    title.textContent =
      `Episode ${
        i + 1
      } — A Moment Worth Keeping 🎬`;

    const meta =
      document.createElement(
        'div'
      );

    meta.className =
      'video-meta';

    meta.textContent =
      'MINKU ORIGINAL';

    card.append(
      thumb,
      title,
      meta
    );

    card.addEventListener(
      'click',
      () =>
        openViewer(
          'video',
          video.src,
          title.textContent
        )
    );

    row.appendChild(
      card
    );
  }
}


/* =========================================================
   LOAD ALL MEDIA
========================================================= */

async function loadMedia() {

  await Promise.allSettled([
    loadPhotos(),
    loadVideos(),
    prepareMusic()
  ]);
}


/* =========================================================
   MUSIC
========================================================= */

async function prepareMusic() {

  const music =
    findMusic();

  if (!music) {

    console.warn(
      'No music MP4/MOV detected.'
    );

    return;
  }

  try {

    state.musicUrl =
      await signedUrl(
        music.name
      );

    const player =
      $('#musicPlayer');

    if (!player) {
      return;
    }

    player.src =
      state.musicUrl;

    player.loop =
      true;

    player.volume =
      0.38;

  } catch (error) {

    console.error(
      'Music error:',
      error
    );

    showStatus(
      error.message,
      true
    );
  }
}


async function startMusic() {

  const player =
    $('#musicPlayer');

  if (
    !player ||
    !state.musicUrl
  ) {
    return;
  }

  try {

    await player.play();

    const button =
      $('#musicButton');

    if (button) {

      button.classList.remove(
        'hidden'
      );

      button.textContent =
        '🔊 MUSIC ON';
    }

  } catch (error) {

    const button =
      $('#musicButton');

    if (button) {

      button.classList.remove(
        'hidden'
      );

      button.textContent =
        '▶ PLAY MUSIC';
    }
  }
}


/* =========================================================
   OPEN MAIN NETFLIX HOME
========================================================= */

function showApp() {

  const profiles =
    $('#profiles');

  if (profiles) {

    profiles.style.opacity =
      '0';

    profiles.style.pointerEvents =
      'none';

    profiles.style.visibility =
      'hidden';
  }

  const app =
    $('#app');

  if (!app) {
    return;
  }

  app.classList.remove(
    'hidden'
  );

  requestAnimationFrame(
    () => {

      app.classList.add(
        'ready'
      );

    }
  );

  const musicButton =
    $('#musicButton');

  if (musicButton) {

    musicButton.classList.remove(
      'hidden'
    );
  }
}


async function selectMinku() {

  if (
    state.selected
  ) {
    return;
  }

  state.selected =
    true;

  showApp();

  /*
    Minku's profile click is a user
    gesture, so music can start here.
  */

  await startMusic();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =========================================================
   FULLSCREEN VIEWER
========================================================= */

function openViewer(
  type,
  src,
  title
) {

  const viewer =
    $('#viewer');

  const media =
    $('#viewerMedia');

  if (
    !viewer ||
    !media
  ) {
    return;
  }

  media.innerHTML =
    '';

  if (
    type ===
    'image'
  ) {

    const img =
      document.createElement(
        'img'
      );

    img.src =
      src;

    img.alt =
      title;

    media.appendChild(
      img
    );

  } else {

    const video =
      document.createElement(
        'video'
      );

    video.src =
      src;

    video.controls =
      true;

    video.autoplay =
      true;

    video.playsInline =
      true;

    video.addEventListener(
      'play',
      () => {

        const music =
          $('#musicPlayer');

        if (music) {
          music.pause();
        }
      }
    );

    video.addEventListener(
      'ended',
      () =>
        startMusic()
    );

    media.appendChild(
      video
    );
  }

  viewer.classList.remove(
    'hidden'
  );

  viewer.setAttribute(
    'aria-hidden',
    'false'
  );
}


function closeViewer() {

  const viewer =
    $('#viewer');

  if (viewer) {

    viewer.classList.add(
      'hidden'
    );

    viewer.setAttribute(
      'aria-hidden',
      'true'
    );
  }

  const video =
    $('#viewerMedia video');

  if (video) {
    video.pause();
  }

  const media =
    $('#viewerMedia');

  if (media) {
    media.innerHTML =
      '';
  }
}


/* =========================================================
   BUTTONS
========================================================= */

const viewerClose =
  $('#viewerClose');

if (viewerClose) {

  viewerClose.addEventListener(
    'click',
    closeViewer
  );
}


const viewer =
  $('#viewer');

if (viewer) {

  viewer.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        viewer
      ) {
        closeViewer();
      }
    }
  );
}


document.addEventListener(
  'keydown',
  event => {

    if (
      event.key ===
      'Escape'
    ) {

      closeViewer();
    }
  }
);


const playStory =
  $('#playStory');

if (playStory) {

  playStory.addEventListener(
    'click',
    () => {

      const episodes =
        $('#episodes');

      if (!episodes) {
        return;
      }

      window.scrollTo({
        top:
          episodes.offsetTop -
          58,
        behavior:
          'smooth'
      });
    }
  );
}


const musicButton =
  $('#musicButton');

if (musicButton) {

  musicButton.addEventListener(
    'click',
    async () => {

      const player =
        $('#musicPlayer');

      if (!player) {
        return;
      }

      if (
        player.paused
      ) {

        await startMusic();

      } else {

        player.pause();

        musicButton.textContent =
          '▶ PLAY MUSIC';
      }
    }
  );
}


/* =========================================================
   MAIN INITIALIZATION
========================================================= */

async function init() {

  /*
    FIRST:
    create visible Netflix profile
    placeholders immediately.
  */

  buildProfileSkeleton();


  /*
    Reveal profile screen after
    Netflix N animation.
  */

  setTimeout(
    () => {

      revealProfileScreen();

    },
    2300
  );


  /*
    THEN:
    private media loads in background.
  */

  try {

    await ensureSession();


    state.objects =
      await listMedia();


    console.info(
      '[Minku private media] files:',
      state.objects.map(
        item =>
          item.name
      )
    );


    /*
      Replace Minku placeholder
      with private Photo 2.
    */

    await hydrateProfileImages();


    /*
      Load remaining photos,
      videos and music.
    */

    await loadMedia();


  } catch (error) {

    console.error(
      '[Minku private media]',
      error
    );

    showStatus(
      error.message,
      true
    );

    /*
      Even if private media has
      a problem, Netflix intro
      must still work.
    */
  }
}


/* =========================================================
   START
========================================================= */

init();
