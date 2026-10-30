# Background music

No music tracks have been supplied yet, so the playlist is intentionally empty.

Add your real audio files to `static/music/`. Then add one entry per file to
`src/lib/audio/tracks.ts` with `id`, `title`, `src: '/music/your-file.mp3'` and
optional `artist`. Use only files you are allowed to publish.

Music runs on the home page, obeys shared mute/volume settings, waits for the
actual treasure/swoop ended event, leaves 500 ms of silence, then fades in
over 600 ms. It pauses before a Projects entrance.
