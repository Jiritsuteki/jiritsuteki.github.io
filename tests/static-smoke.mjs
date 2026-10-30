import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from '@playwright/test';

// A plain file host, deliberately without SvelteKit's development/SPA fallback.
const mount = process.argv[2] || '';
const root = resolve('build');
const types = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.jpg': 'image/jpeg',
	'.mp3': 'audio/mpeg'
};
const server = createServer(async (request, response) => {
	try {
		const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
		if (mount && pathname !== mount && !pathname.startsWith(`${mount}/`)) {
			response.writeHead(404).end();
			return;
		}
		const local = pathname.slice(mount.length) || '/';
		const file = resolve(root, `.${local}${local.endsWith('/') ? 'index.html' : ''}`);
		if (!file.startsWith(root + sep)) {
			response.writeHead(403).end();
			return;
		}
		try {
			const body = await readFile(file);
			response.writeHead(200, {
				'Content-Type': types[extname(file)] || 'application/octet-stream'
			});
			response.end(body);
		} catch (error) {
			if (error.code === 'EISDIR' || error.code === 'EPERM') {
				response.writeHead(308, { Location: `${pathname}/` }).end();
			} else response.writeHead(404).end();
		}
	} catch {
		response.writeHead(400).end();
	}
});

await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const errors = [];
	const missing = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('response', (response) => {
		if (response.url().startsWith(origin) && response.status() >= 400) missing.push(response.url());
	});
	const home = await page.goto(`${origin}${mount}/`);
	assert.equal(home.status(), 200);
	await page.locator('[data-home-ready="true"]').waitFor();
	const opening = await page.locator('.audio-controls').evaluate((element) => ({
		permission: element.getAttribute('data-audio-permission'),
		error: element.getAttribute('data-opening-error')
	}));
	console.log('Native opening audio (no mock, no prior click):', opening);
	for (const notice of ['THIRD_PARTY_NOTICES.txt', 'THIRD_PARTY_DEPENDENCIES.md', '.nojekyll']) {
		const response = await page.request.get(`${origin}${mount}/${notice}`);
		assert.equal(response.status(), 200);
	}
	const direct = await page.goto(`${origin}${mount}/projects/`);
	assert.equal(direct.status(), 200);
	await page.locator('[data-experience-ready="true"]').waitFor();
	assert.equal(await page.title(), 'Projects — Ozerk');
	assert.equal(await page.locator('footer').count(), 0);
	await page.reload();
	await page.locator('[data-experience-ready="true"]').waitFor();
	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await page.locator('[data-projects-ready="true"]').waitFor();
	assert.equal(new URL(page.url()).pathname, `${mount}/`);
	const wallpaper = await page
		.locator('.portfolio-background')
		.evaluate((element) => getComputedStyle(element).backgroundImage);
	assert.ok(wallpaper.includes(`${mount}/wallpaper.jpg`));
	const favicon = new URL(await page.locator('link[rel="icon"]').getAttribute('href'), page.url());
	assert.equal(favicon.pathname, `${mount}/favicon.svg`);
	await page.locator('[data-home-ready="true"]').waitFor();
	assert.equal(await page.getByText('Click to enter!', { exact: true }).count(), 0);
	await page.getByRole('link', { name: 'View Projects' }).click();
	await page.locator('[data-experience-ready="true"]').waitFor();
	assert.equal(new URL(page.url()).pathname, `${mount}/projects/`);
	const card = page.getByRole('link', { name: 'Open Slat Graph in a new tab' });
	const demoPath = `${mount}/demos/slat-graph/index.html`;
	assert.equal(await card.getAttribute('href'), demoPath);
	assert.equal(await card.getAttribute('target'), '_blank');
	const demoResponse = await page.request.get(`${origin}${demoPath}`);
	assert.equal(demoResponse.status(), 200);
	assert.ok((await demoResponse.text()).includes('<title>Slat Graph</title>'));
	for (const [sound, bytes] of [
		['braam', 286248],
		['swoop', 44328],
		['treasure', 137448]
	]) {
		const audioResponse = await page.request.get(`${origin}${mount}/sounds/${sound}.mp3`);
		assert.equal(audioResponse.status(), 200);
		assert.equal((await audioResponse.body()).length, bytes);
	}
	const decoded = await page.evaluate(async (mount) => {
		const audio = new AudioContext();
		try {
			return await Promise.all(
				['treasure', 'swoop', 'braam'].map(async (sound) => {
					const response = await fetch(`${mount}/sounds/${sound}.mp3`);
					const buffer = await audio.decodeAudioData(await response.arrayBuffer());
					return { sound, duration: buffer.duration, channels: buffer.numberOfChannels };
				})
			);
		} finally {
			await audio.close();
		}
	}, mount);
	for (const [index, duration] of [3.432, 1.104, 7.152].entries()) {
		assert.ok(Math.abs(decoded[index].duration - duration) < 0.01);
		assert.equal(decoded[index].channels, 2);
	}
	console.log('Real MP3 decode:', decoded);
	const slash = await page.goto(`${origin}${mount}/projects`);
	assert.equal(slash.status(), 200);
	assert.equal(new URL(page.url()).pathname, `${mount}/projects/`);
	await page.locator('[data-experience-ready="true"]').waitFor();
	assert.deepEqual(missing, []);
	assert.deepEqual(errors, []);
	console.log(
		`Static hosting passed: ${mount || '/'} — direct URL, refresh, assets, navigation, details, directory redirect.`
	);
} finally {
	await browser.close();
	await new Promise((done) => server.close(done));
}
