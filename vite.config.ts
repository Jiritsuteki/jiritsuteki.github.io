import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// GitHub Pages supplies this for repository sites, e.g. /Ozerk-Portfolio.
const base = process.env.BASE_PATH ?? '';
if (base && (!base.startsWith('/') || base.endsWith('/'))) {
	throw new Error('BASE_PATH must start with / and have no trailing slash.');
}

export default defineConfig({
	build: { license: { fileName: 'THIRD_PARTY_DEPENDENCIES.md' } },
	plugins: [
		tailwindcss(),
		sveltekit({
			paths: { base: base as '' | `/${string}`, relative: false },
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
