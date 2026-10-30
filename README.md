# Ozerk — Personal Portfolio

A customized portfolio built with SvelteKit, Tailwind CSS and Svelte Motion, adapted from an existing portfolio. Ozerk does not grant a project-wide MIT license. Inherited code and third-party assets retain their respective licenses; see [source notices](docs/licenses/README.md).

## Run locally

**Windows:** double-click `BASLAT.bat`.

Or manually:

1. Install Node.js (current LTS).
2. In this folder, run `npm install` once.
3. Start the site using `npm run dev -- --open`.

The local development server will show the URL in the terminal (typically `http://localhost:5173/`).

## Update your details

- `src/routes/+page.svelte`: centered profile, introduction, location, availability and corner layout.
- `src/lib/projects/data.ts`: real project cards and URLs.
- `src/lib/experiences.ts`: experience entries, including Halkbank.
- `src/lib/components/sections/Showcase.svelte`: home showcase and independent LinkedIn region.
- `src/lib/audio/tracks.ts`: real music files added under `static/music/`; the list is initially empty.
- `src/lib/index.ts`: your GitHub, Discord, email and LinkedIn URLs. Empty entries intentionally display non-clickable placeholders.
- `static/wallpaper.jpg`: background image.
- `src/routes/layout.css`: colors, contrast and typography.

The supplied wallpaper is the background. The original owner's audio/video and external owner-linked API code remain removed. The three user-supplied entrance/transition effects are under `static/sounds/`; music and effects share one audio manager.

## Build

`npm run build` creates a static site in the `build/` folder for GitHub Pages.

Deployment, base paths and custom domains: [docs/YAYINLAMA.md](docs/YAYINLAMA.md).
Music setup: [docs/MUZIK_EKLEME.md](docs/MUZIK_EKLEME.md).
Source credits: [docs/licenses/README.md](docs/licenses/README.md).
