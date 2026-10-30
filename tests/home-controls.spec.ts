import { expect, test, type Page } from '@playwright/test';

declare global {
	interface Window {
		__loaderEvents: { started: number | null; ended: number | null; elapsed: number | null };
	}
}

async function readyHome(page: Page) {
	await page.goto('/');
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await expect(page.locator('[data-loader-state]')).toHaveAttribute(
		'data-loader-state',
		'complete'
	);
	await expect(page.locator('main')).toHaveCSS('transform', 'none');
}

test('the real one-cycle 1.8s loader finishes automatically while treasure is still unavailable', async ({
	page
}) => {
	await page.addInitScript(() => {
		window.__loaderEvents = { started: null, ended: null, elapsed: null };
		document.addEventListener('animationstart', (event) => {
			if (
				event.target instanceof Element &&
				event.target.matches('.loader') &&
				event.pseudoElement === '::after'
			) {
				window.__loaderEvents.started = performance.now();
			}
		});
		document.addEventListener('animationend', (event) => {
			if (
				event.target instanceof Element &&
				event.target.matches('.loader') &&
				event.pseudoElement === '::after'
			) {
				window.__loaderEvents.ended = performance.now();
				window.__loaderEvents.elapsed = event.elapsedTime;
			}
		});
	});
	let releaseTreasure = () => {};
	const held = new Promise<void>((resolve) => (releaseTreasure = resolve));
	let treasureRequested = false;
	let treasureReleased = false;
	await page.route('**/sounds/treasure.mp3', async (route) => {
		treasureRequested = true;
		await held;
		treasureReleased = true;
		await route.continue();
	});
	try {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await expect(page.locator('[data-loader-state]')).toHaveAttribute(
			'data-loader-state',
			'loading'
		);
		const animation = await page.locator('.loader').evaluate((element) => {
			const style = getComputedStyle(element, '::after');
			return { duration: style.animationDuration, iterations: style.animationIterationCount };
		});
		expect(animation).toEqual({ duration: '1.8s', iterations: '1' });
		await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
		const events = await page.evaluate(() => window.__loaderEvents);
		expect(events.started).not.toBeNull();
		expect(events.ended).not.toBeNull();
		expect(events.elapsed).toBeCloseTo(1.8, 2);
		expect(events.ended! - events.started!).toBeGreaterThan(1650);
		expect(events.ended! - events.started!).toBeLessThan(2250);
		expect(treasureRequested).toBe(true);
		expect(treasureReleased).toBe(false);
		await expect(page.getByRole('heading', { name: 'Ozerk', exact: true })).toBeVisible();
	} finally {
		releaseTreasure();
	}
});

test('hover and keyboard focus animate only the supplied icon paths without moving their text', async ({
	page
}) => {
	await readyHome(page);
	const cases = [
		{
			trigger: page.getByRole('button', { name: 'Location: Ankara, Türkiye', exact: true }),
			path: '.map-outline',
			text: '.detail-value'
		},
		{
			trigger: page.getByRole('button', {
				name: 'Availabilities: Open to learning and interesting opportunities',
				exact: true
			}),
			path: '.chart-line',
			text: '.detail-value'
		},
		{
			trigger: page.locator('[data-linkedin-region] button'),
			path: '.letter',
			text: 'span:first-of-type'
		}
	];
	for (const item of cases) {
		await item.trigger.scrollIntoViewIfNeeded();
		await page.mouse.move(0, 0);
		const path = item.trigger.locator(item.path);
		await expect(path).toHaveCSS('animation-name', 'none');
		await expect(path).toHaveCSS('stroke-dashoffset', '0px');
		const before = await item.trigger.locator(item.text).boundingBox();
		await item.trigger.hover();
		await expect(path).not.toHaveCSS('animation-name', 'none');
		const during = await item.trigger.locator(item.text).boundingBox();
		for (const key of ['x', 'y', 'width', 'height'] as const) {
			expect(Math.abs(during![key] - before![key])).toBeLessThan(0.25);
		}
		await page.mouse.move(0, 0);
		await expect(path).toHaveCSS('animation-name', 'none');
		await item.trigger.focus();
		await expect(path).not.toHaveCSS('animation-name', 'none');
		await item.trigger.evaluate((element) => (element as HTMLElement).blur());
		await expect(path).toHaveCSS('animation-name', 'none');
	}
});

test('an additional experience from the data module still precedes the independent LinkedIn region', async ({
	page
}) => {
	let injected = false;
	await page.route('**/src/lib/experiences.ts*', async (route) => {
		const response = await route.fetch();
		const source = await response.text();
		const fixture = {
			id: 'test-second-experience',
			company: 'Synthetic second experience',
			role: 'Testing only',
			duration: 'Test fixture',
			description: 'A browser-test fixture, never published portfolio content.'
		};
		injected = true;
		await route.fulfill({
			response,
			body: `${source}\nexperiences.push(${JSON.stringify(fixture)});\n`
		});
	});
	await readyHome(page);
	expect(injected).toBe(true);
	const entries = page.locator('[data-experience-list] > li');
	await expect(entries).toHaveCount(2);
	await expect(entries.nth(1)).toContainText('Synthetic second experience');
	const linkedIn = page.locator('[data-linkedin-region]');
	await linkedIn.scrollIntoViewIfNeeded();
	const ordering = await linkedIn.evaluate((element) => {
		const last = document.querySelector('[data-experience-list] > li:last-child')!;
		const footer = document.querySelector('footer')!;
		return {
			afterLastEntry: Boolean(
				last.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING
			),
			outsideList: element.closest('[data-experience-list], li') === null,
			belowLastEntry: element.getBoundingClientRect().top >= last.getBoundingClientRect().bottom,
			beforeFooter: Boolean(
				element.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
			)
		};
	});
	expect(ordering).toEqual({
		afterLastEntry: true,
		outsideList: true,
		belowLastEntry: true,
		beforeFooter: true
	});
});

test('the compact volume control expands left on hover and focus, supports arrows and elastic dragging', async ({
	page
}) => {
	await readyHome(page);
	const settings = page.getByRole('button', { name: 'Sound settings', exact: true });
	const shell = page.locator('.volume-shell');
	const slider = page.getByRole('slider', { name: 'Music volume', exact: true });
	await expect(shell).toHaveCSS('width', '38px');
	const collapsed = await shell.boundingBox();
	await settings.hover();
	await expect(settings).toHaveAttribute('aria-expanded', 'true');
	await expect(shell).toHaveCSS('width', '190px');
	const expanded = await shell.boundingBox();
	expect(Math.abs(expanded!.x + expanded!.width - collapsed!.x - collapsed!.width)).toBeLessThan(
		0.5
	);
	expect(expanded!.x).toBeLessThan(collapsed!.x);
	await slider.focus();
	const before = Number(await slider.inputValue());
	await slider.press('ArrowRight');
	await expect(slider).toHaveValue(String(before + 1));
	await expect(page.locator('.audio-controls')).toHaveAttribute(
		'data-audio-volume',
		String(before + 1)
	);
	await slider.press('ArrowLeft');
	await expect(slider).toHaveValue(String(before));
	const range = await slider.boundingBox();
	await page.mouse.move(range!.x + range!.width / 2, range!.y + range!.height / 2);
	await page.mouse.down();
	await page.mouse.move(range!.x + range!.width + 24, range!.y + range!.height / 2);
	await expect(page.locator('.elastic-range')).toHaveClass(/active/);
	await expect
		.poll(() =>
			page
				.locator('.elastic-range')
				.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)
		)
		.toBeGreaterThan(0);
	await page.mouse.up();
	await expect(page.locator('.elastic-range')).not.toHaveClass(/active/);
	await expect
		.poll(() =>
			page
				.locator('.elastic-range')
				.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)
		)
		.toBe(0);
	await page.mouse.move(300, 300);
	await page.getByRole('button', { name: 'Location: Ankara, Türkiye', exact: true }).focus();
	await expect(shell).toHaveCSS('width', '38px');
	await settings.focus();
	await expect(settings).toHaveAttribute('aria-expanded', 'true');
	await expect(shell).toHaveCSS('width', '190px');
});

test('360px touch controls open, change volume, dismiss outside and show an honest empty playlist', async ({
	browser
}) => {
	const context = await browser.newContext({
		viewport: { width: 360, height: 800 },
		hasTouch: true,
		isMobile: true,
		deviceScaleFactor: 2
	});
	const page = await context.newPage();
	const musicRequests: string[] = [];
	page.on('request', (request) => {
		if (new URL(request.url()).pathname.includes('/music/')) musicRequests.push(request.url());
	});
	try {
		await page.goto(`${test.info().project.use.baseURL}/`);
		await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
		await expect(page.locator('[data-loader-state]')).toHaveAttribute(
			'data-loader-state',
			'complete'
		);
		const settings = page.getByRole('button', { name: 'Sound settings', exact: true });
		await settings.tap();
		await expect(settings).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('.volume-shell')).toHaveCSS('width', '190px');
		const bounds = await page.locator('.volume-shell').boundingBox();
		expect(bounds!.x).toBeGreaterThanOrEqual(0);
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(360);
		const slider = page.getByRole('slider', { name: 'Music volume', exact: true });
		const range = await slider.boundingBox();
		await slider.tap({ position: { x: range!.width * 0.82, y: range!.height / 2 } });
		await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(60);
		await page.getByRole('heading', { name: 'Ozerk', exact: true }).tap();
		await expect(settings).toHaveAttribute('aria-expanded', 'false');
		await expect(page.locator('.volume-shell')).toHaveCSS('width', '38px');
		await page.getByRole('button', { name: 'Choose music', exact: true }).tap();
		await expect(page.getByRole('region', { name: 'Music selection' })).toBeVisible();
		await expect(page.getByText('No tracks added yet', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Play music', exact: true })).toHaveCount(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
		expect(musicRequests).toEqual([]);
		await page.getByRole('heading', { name: 'Ozerk', exact: true }).tap();
		await expect(page.getByRole('region', { name: 'Music selection' })).toHaveCount(0);
	} finally {
		await context.close();
	}
});
