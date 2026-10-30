import { expect, test, type Page } from '@playwright/test';

const slatGraph = '/demos/slat-graph/index.html';
const internship =
	'Completed a three-month internship, gaining experience in software development and basic banking operations.';

async function home(page: Page) {
	await page.goto('/');
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await expect(page.locator('[data-loader-state]')).toHaveAttribute(
		'data-loader-state',
		'complete'
	);
	await expect(page.locator('main')).toHaveCSS('filter', 'none');
	await expect(page.locator('[data-projects-ready]')).toHaveAttribute(
		'data-projects-ready',
		'true'
	);
}

async function projects(page: Page) {
	await page.goto('/projects/');
	await expect(page.locator('main')).toHaveAttribute('data-experience-ready', 'true');
	await expect(page.locator('[data-route-transition]')).toHaveAttribute(
		'data-route-transition',
		'false'
	);
}

test('one automatic loader reveals home and does not replay on the return transition', async ({
	page
}) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await expect(page.getByRole('button', { name: 'Enter website' })).toHaveCount(0);
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await expect(page.getByRole('heading', { name: 'Ozerk', exact: true })).toBeVisible();
	await expect(page.getByText('Ankara, Türkiye', { exact: true })).toBeVisible();
	await expect(page.getByText('Click to enter!', { exact: true })).toHaveCount(0);
	await page.getByRole('link', { name: 'View Projects' }).click();
	await expect(page).toHaveURL(/\/projects\/$/);
	await expect(page.locator('[data-route-transition]')).toHaveAttribute(
		'data-route-transition',
		'false'
	);
	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await expect(page.locator('[data-loader-state="loading"]')).toHaveCount(0);
	await expect(page.locator('[data-route-transition]')).toHaveAttribute(
		'data-route-transition',
		'false'
	);
	await expect(page.locator('footer')).toContainText('Ozerk. All rights reserved.');
});

test('Experiences contains the exact description followed by independent left-aligned LinkedIn and footer', async ({
	page
}) => {
	await home(page);
	await expect(page.getByRole('heading', { name: 'Halkbank', exact: true })).toBeVisible();
	await expect(page.getByText(internship, { exact: true })).toBeVisible();
	await expect(page.getByText('Internship', { exact: true })).toBeVisible();
	const linkedIn = page.locator('[data-linkedin-region]');
	const order = await linkedIn.evaluate((element) => {
		const list = document.querySelector('[data-experience-list]')!;
		const footer = document.querySelector('footer')!;
		return {
			insideExperience: Boolean(element.closest('li, [data-experience-list]')),
			afterList: Boolean(list.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
			beforeFooter: Boolean(
				element.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
			),
			fakeAnchor: Boolean(element.querySelector('a[href="#"]'))
		};
	});
	expect(order).toEqual({
		insideExperience: false,
		afterList: true,
		beforeFooter: true,
		fakeAnchor: false
	});
	const box = await linkedIn.boundingBox();
	const button = await linkedIn.getByRole('button', { name: /LinkedIn/ }).boundingBox();
	expect(Math.abs(button!.x - box!.x)).toBeLessThan(1);
	await page.screenshot({ path: '.test-results/home-v3-desktop.png' });
	await linkedIn.scrollIntoViewIfNeeded();
	await expect(page.locator('[data-experience-list]').locator('..')).toHaveCSS('opacity', '1');
	await page.screenshot({ path: '.test-results/experiences-v3-desktop.png' });
});

test('desktop hero is centered and upper corner regions stay separate', async ({ page }) => {
	await home(page);
	const title = await page.getByRole('heading', { name: 'Ozerk', exact: true }).boundingBox();
	const quote = await page
		.getByText("“A little space for the things I'm curious about.”", { exact: true })
		.boundingBox();
	const header = await page.locator('[data-home-header]').boundingBox();
	expect(Math.abs(title!.x + title!.width / 2 - 720)).toBeLessThan(4);
	expect(header!.y).toBeLessThan(title!.y);
	expect(quote!.y + quote!.height).toBeLessThan(title!.y);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
	await page.screenshot({ path: '.test-results/home-v3-hero.png' });
});

test('Slat Graph links to its local demo centered in the tunnel, with no Projects sound toggle', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await projects(page);
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
	await expect(page.locator('footer')).toHaveCount(0);
	await expect(page.locator('.sound-control')).toHaveCount(0);
	await expect(page.getByRole('button', { name: /sound/i })).toHaveCount(0);
	const card = page.getByRole('link', { name: 'Open Slat Graph in a new tab' });
	await expect(card).toHaveAttribute('href', slatGraph);
	await expect(card).toHaveAttribute('target', '_blank');
	await expect(page.getByText('More projects coming soon', { exact: true })).toBeVisible();
	await expect(page.getByText('Nothing here. Yet.', { exact: true })).toHaveCount(0);
	const box = await card.boundingBox();
	expect(Math.abs(box!.x + box!.width / 2 - 720)).toBeLessThan(2);
	expect(Math.abs(box!.y + box!.height / 2 - 450)).toBeLessThan(2);
	await page.screenshot({ path: '.test-results/projects-v3-desktop.png' });
	expect(errors).toEqual([]);
});

test('Cursor1 keeps its 16px dot, 80 by 32 More pill and viewport position', async ({ page }) => {
	await projects(page);
	const surface = await page.locator('.cursor-surface').boundingBox();
	await page.mouse.move(surface!.x + 4, surface!.y + surface!.height / 2);
	await expect(page.locator('.cursor-position')).toHaveClass(/visible/);
	await expect(page.locator('.cursor-bubble')).toHaveCSS('width', '16px');
	await page.locator('[data-project-card]').hover();
	await expect(page.locator('.cursor-bubble')).toHaveCSS('width', '80px');
	await expect(page.locator('.cursor-bubble')).toHaveCSS('height', '32px');
	const cursor = await page.locator('.cursor-bubble').boundingBox();
	const card = await page.locator('[data-project-card]').boundingBox();
	expect(Math.abs(cursor!.x + cursor!.width / 2 - (card!.x + card!.width / 2))).toBeLessThan(2);
	expect(Math.abs(cursor!.y + cursor!.height / 2 - (card!.y + card!.height / 2))).toBeLessThan(2);
	await page.screenshot({ path: '.test-results/projects-v3-cursor.png' });
	await page.mouse.move(30, 180);
	await expect(page.locator('.cursor-position')).not.toHaveClass(/visible/);
});

test('published project opens its real URL using Enter and Space', async ({ page }) => {
	await projects(page);
	const card = page.getByRole('link', { name: 'Open Slat Graph in a new tab' });
	for (const key of ['Enter', 'Space']) {
		await card.focus();
		const opened = page.waitForEvent('popup');
		await page.keyboard.press(key);
		const popup = await opened;
		await popup.waitForLoadState('domcontentloaded');
		await expect(popup).toHaveURL(new URL(slatGraph, page.url()).href);
		await expect(popup).toHaveTitle('Slat Graph');
		await popup.close();
	}
});

test('360px touch layout preserves ordering, avoids header overlap and keeps native project taps', async ({
	browser
}) => {
	const context = await browser.newContext({
		viewport: { width: 360, height: 800 },
		hasTouch: true,
		isMobile: true,
		deviceScaleFactor: 2
	});
	const page = await context.newPage();
	await page.goto(`${test.info().project.use.baseURL}/`);
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await expect(page.locator('[data-loader-state]')).toHaveAttribute(
		'data-loader-state',
		'complete'
	);
	await expect(page.locator('main')).toHaveCSS('filter', 'none');
	const title = await page.getByRole('heading', { name: 'Ozerk', exact: true }).boundingBox();
	const header = await page.locator('[data-home-header]').boundingBox();
	expect(Math.abs(title!.x + title!.width / 2 - 180)).toBeLessThan(4);
	expect(header!.y + header!.height).toBeLessThan(title!.y);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
	await page.screenshot({ path: '.test-results/home-v3-mobile.png' });
	await expect(page.getByText(internship, { exact: true })).toBeVisible();
	await page.locator('[data-linkedin-region]').scrollIntoViewIfNeeded();
	await expect(page.locator('[data-experience-list]').locator('..')).toHaveCSS('opacity', '1');
	await page.screenshot({ path: '.test-results/experiences-v3-mobile.png' });
	await page.getByRole('link', { name: 'View Projects' }).tap();
	await expect(page.locator('[data-route-transition]')).toHaveAttribute(
		'data-route-transition',
		'false'
	);
	await expect(page.locator('[data-experience-ready]')).toHaveAttribute(
		'data-experience-ready',
		'true'
	);
	await expect(page.locator('.more')).toBeVisible();
	await expect(page.locator('.cursor-position')).not.toHaveClass(/visible/);
	const box = await page.locator('[data-project-card]').boundingBox();
	expect(Math.abs(box!.y + box!.height / 2 - 400)).toBeLessThan(2);
	await page.screenshot({ path: '.test-results/projects-v3-mobile.png' });
	const opened = page.waitForEvent('popup');
	await page.locator('[data-project-card]').tap();
	const popup = await opened;
	await popup.waitForLoadState('domcontentloaded');
	await expect(popup).toHaveURL(new URL(slatGraph, page.url()).href);
	await expect(popup).toHaveTitle('Slat Graph');
	await context.close();
});

test('reduced motion skips the loader and leaves an accessible static project', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await home(page);
	await expect(page.locator('[data-loader-state="loading"]')).toHaveCount(0);
	await page.getByRole('link', { name: 'View Projects' }).click();
	await expect(page.locator('main')).toHaveClass(/reduced-motion/);
	await expect(page.locator('.cursor-position')).toHaveCSS('display', 'none');
	await expect(page.getByRole('link', { name: 'Open Slat Graph in a new tab' })).toBeVisible();
});

test('WebGL2 fallback and context restoration keep the project functional', async ({
	page,
	context
}) => {
	await context.addInitScript(() => {
		const original = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function (
			this: HTMLCanvasElement,
			type: string,
			...args: unknown[]
		) {
			if (type === 'webgl2') return null;
			return Reflect.apply(original, this, [type, ...args]);
		} as typeof original;
	});
	await projects(page);
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'fallback');
	await expect(page.locator('.static-tunnel')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open Slat Graph in a new tab' })).toBeVisible();
});

test('context loss restores and three route returns release old canvases without replaying the loader', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await projects(page);
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
	await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
		const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
		extension?.loseContext();
		setTimeout(() => extension?.restoreContext(), 350);
	});
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'fallback');
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
	for (let index = 0; index < 3; index++) {
		await page.getByRole('link', { name: 'Home', exact: true }).click();
		await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
		await expect(page.locator('[data-loader-state="loading"]')).toHaveCount(0);
		await expect(page.locator('[data-route-transition]')).toHaveAttribute(
			'data-route-transition',
			'false'
		);
		await page.getByRole('link', { name: 'View Projects' }).click();
		await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
		await expect(page.locator('[data-route-transition]')).toHaveAttribute(
			'data-route-transition',
			'false'
		);
		await expect(page.locator('canvas')).toHaveCount(1);
	}
	expect(errors).toEqual([]);
});
