async function init() {

  // IMPORTANT:
  // Netflix profile screen should appear independently
  // of private-media loading.

  setTimeout(() => {
    const profiles = $('#profiles');

    if (profiles) {
      profiles.classList.add('ready');
    }
  }, 2200);


  try {

    // Start private session in background
    await ensureSession();

    // Get private files
    state.objects = await listMedia();

    console.info(
      '[Minku private media] files:',
      state.objects.map(
        x => x.name
      )
    );


    // Build Netflix profiles
    // This can finish after the profile screen
    // is already visible.
    await buildProfiles();


    // Load photos/videos/music independently
    await Promise.allSettled([
      loadMediaRows(),
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

    // The Netflix profile screen
    // must still remain available.
    const profiles =
      $('#profiles');

    if (profiles) {
      profiles.classList.add(
        'ready'
      );
    }
  }
}
