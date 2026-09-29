import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/* =========================================================
   CONFIG
========================================================= */

const SUPABASE_URL =
  'https://yqjbjzmedunclslhvrro.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_1ZHJWTv1mcBaJuh6fyCtrg_Plv9q9fn';

const BUCKET =
  'minku-private-media';

const PROFILE_FILE =
  'Photo 2.JPG.jpeg';

const INTRO_HINT =
  '2026-09-29 at 11.21.12';

const INTRO_FALLBACK_MS =
  12000;


/* =========================================================
   SUPABASE
========================================================= */

const supabase = createClient(
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


/* =========================================================
   GLOBAL STATE
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const state = {
  objects: [],
  musicUrl: '',
  selected: false,
  introObject: null,
  introFinished: false
};


/* =========================================================
   STATUS
========================================================= */

function showStatus(
  message,
  error = false
) {
  const el =
    $('#status');

  if (!el) return;

  el.textContent =
    message;

  el.style.color =
    error
      ? '#ffb3b3'
      : '#bbb';

  el.classList.add(
    'show'
  );

  clearTimeout(
    showStatus.timer
  );

  showStatus.timer =
    setTimeout(() => {
      el.classList.remove(
        'show'
      );
    }, 3500);
}


/* =========================================================
   SESSION
========================================================= */

async function ensureSession() {

  const current =
    await supabase.auth.getSession();

  if (
    current?.data?.session
  ) {
    return current.data.session;
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
   PRIVATE FILE LIST
========================================================= */

async function listMedia() {

  const {
    data,
    error
  } =
    await supabase.storage
      .from(BUCKET)
      .list('', {
        limit: 100,
        offset: 0
      });

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

  if (!data?.signedUrl) {
    throw new Error(
      `No signed URL returned for ${path}`
    );
  }

  return data.signedUrl;
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


/* =========================================================
   EXACT INTRO FINDER
========================================================= */

function findIntroVideo() {

  const exact =
    state.objects.find(
      item =>
        isVideo(item.name) &&
        String(item.name)
          .toLowerCase()
          .includes(
            INTRO_HINT.toLowerCase()
          )
    );

  if (exact) {
    return exact;
  }

  return (
    state.objects.find(
      item =>
        isVideo(item.name) &&
        /whatsapp.*video/i.test(
          item.name
        )
    ) ||
    null
  );
}


/* =========================================================
   MUSIC FINDER
========================================================= */

function findMusic() {

  return (
    state.objects.find(
      item =>
        isVideo(item.name) &&
        /music|song|audio|sound/i.test(
          item.name
        )
    ) ||
    null
  );
}


/* =========================================================
   FINISH EXACT INTRO
========================================================= */

function finishReferenceIntro() {

  if (
    state.introFinished
  ) {
    return;
  }

  state.introFinished =
    true;

  const video =
    $('#referenceIntro');

  const boot =
    $('#boot');

  const profiles =
    $('#profiles');

  const startButton =
    $('#introStart');

  if (video) {
    try {
      video.pause();
    } catch (_) {}

    video.removeAttribute(
      'src'
    );

    video.load();
  }

  if (startButton) {
    startButton.hidden =
      true;
  }

  if (boot) {

    boot.classList.remove(
      'reference-playing'
    );

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

    profiles.style.display =
      'flex';

    profiles.style.visibility =
      'visible';

    profiles.style.opacity =
      '1';

    profiles.classList.add(
      'ready'
    );
  }
}


/* =========================================================
   PLAY EXACT REFERENCE INTRO
========================================================= */

async function setupReferenceIntro() {

  const video =
    $('#referenceIntro');

  const boot =
    $('#boot');

  const fallback =
    $('#introFallback');

  const startButton =
    $('#introStart');

  const profiles =
    $('#profiles');


  /*
    Make sure Netflix profile screen
    starts hidden.
  */

  if (profiles) {

    profiles.classList.remove(
      'ready'
    );

    profiles.style.visibility =
      'hidden';

    profiles.style.opacity =
      '0';
  }


  if (
    !video ||
    !boot
  ) {

    finishReferenceIntro();

    return;
  }


  state.introObject =
    findIntroVideo();


  /*
    Intro video not found:
    use existing fallback N animation,
    then continue.
  */

  if (
    !state.introObject
  ) {

    console.warn(
      'Exact intro MP4 not found.'
    );

    if (fallback) {
      fallback.classList.add(
        'visible'
      );
    }

    setTimeout(
      finishReferenceIntro,
      2500
    );

    return;
  }


  try {

    const url =
      await signedUrl(
        state.introObject.name
      );

    video.src =
      url;

    video.currentTime =
      0;

    video.preload =
      'auto';

    video.controls =
      false;

    video.loop =
      false;

    video.playsInline =
      true;

    video.setAttribute(
      'playsinline',
      ''
    );

    video.setAttribute(
      'webkit-playsinline',
      ''
    );


    /*
      Original sound ON.
    */

    video.muted =
      false;

    video.volume =
      1;


    boot.classList.add(
      'reference-playing'
    );


    /*
      When the exact MP4 finishes,
      move to Netflix profiles.
    */

    video.addEventListener(
      'ended',
      () => {

        finishReferenceIntro();

      },
      {
        once: true
      }
    );


    video.addEventListener(
      'error',
      () => {

        console.error(
          'Reference intro video failed to play.'
        );

        if (fallback) {
          fallback.classList.add(
            'visible'
          );
        }

        if (startButton) {
          startButton.hidden =
            false;
        }
      },
      {
        once: true
      }
    );


    /*
      First attempt:
      autoplay with original audio.
    */

    try {

      await video.play();

    } catch (autoplayError) {

      console.warn(
        'Autoplay blocked:',
        autoplayError
      );


      /*
        Mobile Safari / Chrome can block
        audible autoplay. Show tap button.
      */

      if (startButton) {

        startButton.hidden =
          false;

        startButton.onclick =
          async () => {

            startButton.hidden =
              true;

            try {

              video.muted =
                false;

              video.volume =
                1;

              await video.play();

            } catch (playError) {

              console.error(
                'Manual intro play failed:',
                playError
              );

              video.muted =
                true;

              try {

                await video.play();

              } catch (_) {}

            }
          };
      }
    }


    /*
      Absolute emergency timeout.
      Never leave a visitor stuck forever.
    */

    setTimeout(
      () => {

        if (
          !state.introFinished
        ) {

          finishReferenceIntro();
        }

      },
      INTRO_FALLBACK_MS
    );


  } catch (error) {

    console.error(
      'Reference intro setup error:',
      error
    );

    if (fallback) {
      fallback.classList.add(
        'visible'
      );
    }

    setTimeout(
      finishReferenceIntro,
      2200
    );
  }
}


/* =========================================================
   PROFILE CARDS
========================================================= */

async function buildProfiles() {

  const grid =
    $('#profileGrid');

  if (!grid) {
    throw new Error(
      'profileGrid not found'
    );
  }

  grid.innerHTML =
    '';


  const allImages =
    state.objects.filter(
      item =>
        isImage(
          item.name
        )
    );


  const minkuProfile =
    findExact(
      PROFILE_FILE
    ) ||
    allImages[0] ||
    null;


  const alternates =
    allImages.filter(
      item =>
        item.name !==
        minkuProfile?.name
    );


  const profiles = [

    {
      object:
        minkuProfile,

      name:
        'Minku',

      badge:
        '❤️',

      active:
        true
    },

    {
      object:
        alternates[0] ||
        minkuProfile,

      name:
        'Yuvi',

      badge:
        '✨',

      active:
        false
    },

    {
      object:
        alternates[1] ||
        minkuProfile,

      name:
        'Memories',

      badge:
        '💕',

      active:
        false
    },

    {
      object:
        alternates[2] ||
        minkuProfile,

      name:
        'Friends',

      badge:
        '🥰',

      active:
        false
    }

  ];


  for (
    const profile of profiles
  ) {

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


    if (profile.object) {

      try {

        const url =
          await signedUrl(
            profile.object.name
          );

        const img =
          document.createElement(
            'img'
          );

        img.src =
          url;

        img.alt =
          profile.name;

        avatar.appendChild(
          img
        );

      } catch (error) {

        console.error(
          'Profile image error:',
          error
        );

        avatar.textContent =
          profile.active
            ? 'M'
            : '♥';
      }

    } else {

      avatar.textContent =
        profile.active
          ? 'M'
          : '♥';
    }


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


    if (profile.active) {

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
  }
}


/* =========================================================
   PHOTOS + VIDEOS
========================================================= */

async function loadMediaRows() {

  const photoRow =
    $('#photoRow');

  const videoRow =
    $('#videoRow');

  if (
    !photoRow ||
    !videoRow
  ) {
    return;
  }

  photoRow.innerHTML =
    '';

  videoRow.innerHTML =
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


  const music =
    findMusic();


  const videos =
    state.objects.filter(
      item =>
        isVideo(
          item.name
        ) &&
        item.name !==
          music?.name &&
        !item.name
          .toLowerCase()
          .includes(
            '2026-09-29 at 11.21.12'
          )
    );


  /* PHOTOS */

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
      `Minku memory ${i + 1}`;

    img.loading =
      'lazy';


    try {

      img.src =
        await signedUrl(
          object.name
        );

    } catch (error) {

      console.error(
        'Photo error:',
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


    photoRow.appendChild(
      card
    );
  }


  /* VIDEOS */

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
        'Video error:',
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


    videoRow.appendChild(
      card
    );
  }
}


/* =========================================================
   MUSIC
========================================================= */

async function prepareMusic() {

  const music =
    findMusic();

  if (!music) {
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

  } catch (_) {

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
   NETFLIX HOME
========================================================= */

function showApp() {

  const profiles =
    $('#profiles');

  const app =
    $('#app');

  if (profiles) {

    profiles.style.display =
      'none';

    profiles.style.visibility =
      'hidden';

    profiles.style.pointerEvents =
      'none';
  }


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


  const button =
    $('#musicButton');

  if (button) {

    button.classList.remove(
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
    Profile click counts as user interaction,
    so browser allows music to begin.
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
   BUTTON EVENTS
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
   INIT
========================================================= */

async function init() {

  try {

    /*
      Start exact intro independently.
      We don't wait for photos/videos/music.
    */

    setupReferenceIntro();


    /*
      Show profile structure immediately.
    */

    const profilePromise =
      buildProfiles();


    /*
      Private media loading.
    */

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
      Wait only for the profile
      structure, not all media.
    */

    await profilePromise;


    /*
      Exact profile image can load
      after the Netflix screen is ready.
    */


    /*
      Load everything else independently.
    */

    await Promise.allSettled([
      loadMediaRows(),
      prepareMusic()
    ]);


  } catch (error) {

    console.error(
      '[Minku app]',
      error
    );

    showStatus(
      error.message,
      true
    );


    /*
      Never trap user on intro forever.
    */

    setTimeout(
      finishReferenceIntro,
      3000
    );
  }
}


/* =========================================================
   START
========================================================= */

init();
