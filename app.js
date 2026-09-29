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

const $ =
  (selector) =>
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
  const el =
    $('#status');

  if (!el) return;

  el.textContent =
    message;

  el.style.color =
    isError
      ? '#ffb3b3'
      : '#bbb';

  el.classList.add(
    'show'
  );

  clearTimeout(
    showStatus.timer
  );

  showStatus.timer =
    setTimeout(
      () =>
        el.classList.remove(
          'show'
        ),
      3500
    );
}


/* =========================================================
   BOOT / NETFLIX INTRO
========================================================= */

function finishIntro() {

  const boot =
    $('#boot');

  const profiles =
    $('#profiles');

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
   PRIVATE SUPABASE SESSION
========================================================= */

async function ensureSession() {

  const existing =
    await supabase.auth.getSession();

  if (
    existing?.data?.session
  ) {
    return existing.data.session;
  }

  const {
    data,
    error
  } =
    await supabase.auth
      .signInAnonymously();

  if (error) {

    throw new Error(
      `Anonymous sign-in failed: ${error.message}`
    );
  }

  return data?.session;
}


/* =========================================================
   LIST PRIVATE MEDIA
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

  return (
    Array.isArray(data)
      ? data.filter(
          item =>
            item &&
            item.name
        )
      : []
  );
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

  return (
    data?.signedUrl ||
    null
  );
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
    ) ||
    null
  );
}


function findMusic() {

  const namedMusic =
    state.objects.find(
      item =>
        /music|song|audio|sound/i
          .test(
            item.name
          ) &&
        isVideo(
          item.name
        )
    );

  if (namedMusic) {
    return namedMusic;
  }

  const mp4 =
    state.objects.find(
      item =>
        /\.mp4$/i.test(
          item.name
        )
    );

  return mp4 || null;
}


/* =========================================================
   CREATE PROFILE SCREEN IMMEDIATELY
========================================================= */

function buildProfileSkeleton() {

  const grid =
    $('#profileGrid');

  if (!grid) {
    console.error(
      'profileGrid not found'
    );
    return [];
  }

  grid.innerHTML =
    '';

  const profiles = [
    {
      name: 'Minku',
      badge: '❤️',
      active: true
    },
    {
      name: 'Yuvi',
      badge: '✨',
      active: false
    },
    {
      name: 'Memories',
      badge: '💕',
      active: false
    },
    {
      name: 'Friends',
      badge: '🥰',
      active: false
    }
  ];

  const buttons = [];

  profiles.forEach(
    profile => {

      const button =
        document.createElement(
          'button'
        );

      button.type =
        'button';

      button.className =
        `profile-card${
          profile.active
            ? ' active'
            : ''
        }`;


      const avatar =
        document.createElement(
          'div'
        );

      avatar.className =
        'profile-avatar';

      avatar.textContent =
        profile.active
          ? 'M'
          : '♥';

      avatar.style.display =
        'grid';

      avatar.style.placeItems =
        'center';

      avatar.style.fontSize =
        'clamp(42px,7vw,72px)';

      avatar.style.fontWeight =
        '900';

      avatar.style.color =
        '#fff';

      avatar.style.background =
        profile.active
          ? 'linear-gradient(135deg,#4a0505,#e50914)'
          : '#222';


      const name =
        document.createElement(
          'div'
        );

      name.className =
        'profile-name';

      name.textContent =
        profile.name;


      const badge =
        document.createElement(
          'div'
        );

      badge.className =
        'profile-badge';

      badge.textContent =
        profile.badge;


      button.append(
        avatar,
        name,
        badge
      );


      if (
        profile.active
      ) {

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


      grid.appendChild(
        button
      );

      buttons.push(
        button
      );
    }
  );

  return buttons;
}


/* =========================================================
   LOAD PROFILE IMAGES AFTER SCREEN IS VISIBLE
========================================================= */

async function hydrateProfileImages(
  buttons
) {

  if (
    !buttons ||
    !buttons.length
  ) {
    return;
  }

  const allImages =
    state.objects.filter(
      item =>
        isImage(
          item.name
        )
    );

  const minku =
    findExact(
      PROFILE_FILE
    ) ||
    allImages[0] ||
    null;

  const alternates =
    allImages.filter(
      item =>
        item.name !==
        minku?.name
    );


  const selected = [
    minku,
    alternates[0] || minku,
    alternates[1] || minku,
    alternates[2] || minku
  ];


  await Promise.all(
    buttons.map(
      async (
        button,
        index
      ) => {

        const object =
          selected[index];

        if (!object) {
          return;
        }

        const avatar =
          button.querySelector(
            '.profile-avatar'
          );

        if (!avatar) {
          return;
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
            index === 0
              ? 'Minku'
              : 'Profile';

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
    )
  );
}


/* =========================================================
   PHOTOS
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
   VIDEOS
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
   LOAD MUSIC
========================================================= */

async function prepareMusic() {

  const music =
    findMusic();

  if (!music) {

    showStatus(
      'Music MP4 was not found in the private bucket.',
      true
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
      error
    );

    showStatus(
      error.message,
      true
    );
  }
}


/* =========================================================
   START MUSIC
========================================================= */

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
   OPEN NETFLIX HOME
========================================================= */

function showApp() {

  const profiles =
    $('#profiles');

  if (profiles) {

    profiles.style.opacity =
      '0';

    profiles.style.visibility =
      'hidden';

    profiles.style.pointerEvents =
      'none';
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
    () =>
      app.classList.add(
        'ready'
      )
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

  if (state.selected) {
    return;
  }

  state.selected =
    true;

  showApp();

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
   MAIN INITIALIZATION
========================================================= */

async function init() {

  /*
    THIS IS THE IMPORTANT FIX:
    Build the profile UI FIRST.
    Supabase must never block Netflix intro.
  */

  const profileButtons =
    buildProfileSkeleton();


  /*
    Wait only for the Netflix N animation.
  */

  setTimeout(
    finishIntro,
    2300
  );


  /*
    Load private media in background.
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
      Update the profile images
      after the screen is already visible.
    */

    hydrateProfileImages(
      profileButtons
    );


    /*
      Photos, videos and music
      load independently.
    */

    await Promise.allSettled([

      loadPhotos(),

      loadVideos(),

      prepareMusic()

    ]);

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
      Never block Netflix profile screen
      because of private-media problems.
    */
  }
}


/* =========================================================
   EVENTS
========================================================= */

if ($('#viewerClose')) {

  $('#viewerClose')
    .addEventListener(
      'click',
      closeViewer
    );
}


if ($('#viewer')) {

  $('#viewer')
    .addEventListener(
      'click',
      event => {

        if (
          event.target.id ===
          'viewer'
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


if ($('#playStory')) {

  $('#playStory')
    .addEventListener(
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


if ($('#musicButton')) {

  $('#musicButton')
    .addEventListener(
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

          $('#musicButton')
            .textContent =
            '▶ PLAY MUSIC';
        }
      }
    );
}


/*
  First user gesture can also start music.
*/

document.addEventListener(
  'pointerdown',
  () => {

    if (
      state.selected &&
      $('#musicPlayer')?.paused
    ) {

      startMusic();
    }

  },
  {
    once: true,
    passive: true
  }
);


/* =========================================================
   START APP
========================================================= */

init();
