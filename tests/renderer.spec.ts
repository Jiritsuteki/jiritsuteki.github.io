import { expect, test, type Page } from '@playwright/test';

type ResourceKind = 'Program' | 'Shader' | 'Texture' | 'Framebuffer' | 'VertexArray';
type ResourceCounts = Record<ResourceKind, number>;
type ContextProbe = {
	created: ResourceCounts;
	deleted: ResourceCounts;
	alive: ResourceCounts;
	draws: number;
	pingFrames: number;
};
type RendererProbe = { contexts: ContextProbe[] };

declare global {
	interface Window {
		__rendererProbe: RendererProbe;
	}
}

/** Observe actual browser GL calls; no production hooks or mocked renderer. */
async function instrumentRenderer(page: Page) {
	await page.addInitScript(() => {
		const counts = (): ResourceCounts => ({
			Program: 0,
			Shader: 0,
			Texture: 0,
			Framebuffer: 0,
			VertexArray: 0
		});
		window.__rendererProbe = { contexts: [] };
		const records = new WeakMap<WebGL2RenderingContext, ContextProbe>();
		const resources = new WeakMap<WebGL2RenderingContext, Record<ResourceKind, Set<object>>>();
		const uniforms = new WeakMap<WebGLUniformLocation, string>();
		const prototype = WebGL2RenderingContext.prototype as unknown as Record<
			string,
			(this: WebGL2RenderingContext, ...args: unknown[]) => unknown
		>;

		function record(context: WebGL2RenderingContext) {
			let probe = records.get(context);
			if (!probe) {
				probe = { created: counts(), deleted: counts(), alive: counts(), draws: 0, pingFrames: 0 };
				records.set(context, probe);
				resources.set(context, {
					Program: new Set(),
					Shader: new Set(),
					Texture: new Set(),
					Framebuffer: new Set(),
					VertexArray: new Set()
				});
				window.__rendererProbe.contexts.push(probe);
			}
			return probe;
		}

		for (const kind of ['Program', 'Shader', 'Texture', 'Framebuffer', 'VertexArray'] as const) {
			const create = prototype[`create${kind}`];
			const remove = prototype[`delete${kind}`];
			prototype[`create${kind}`] = function (...args) {
				const resource = Reflect.apply(create, this, args) as object | null;
				if (resource) {
					const probe = record(this);
					resources.get(this)![kind].add(resource);
					probe.created[kind]++;
					probe.alive[kind]++;
				}
				return resource;
			};
			prototype[`delete${kind}`] = function (...args) {
				const resource = args[0] as object | null;
				const probe = record(this);
				if (resource && resources.get(this)![kind].delete(resource)) {
					probe.deleted[kind]++;
					probe.alive[kind]--;
				}
				return Reflect.apply(remove, this, args);
			};
		}

		const draw = prototype.drawArrays;
		prototype.drawArrays = function (...args) {
			record(this).draws++;
			return Reflect.apply(draw, this, args);
		};
		const getLocation = prototype.getUniformLocation;
		prototype.getUniformLocation = function (...args) {
			const location = Reflect.apply(getLocation, this, args) as WebGLUniformLocation | null;
			if (location) uniforms.set(location, String(args[1]));
			return location;
		};
		const setUniform = prototype.uniform1fv;
		prototype.uniform1fv = function (...args) {
			const location = args[0] as WebGLUniformLocation | null;
			if (location && uniforms.get(location) === 'uPingAlpha') {
				const values = Array.from(args[1] as ArrayLike<number>);
				if (values.some((value) => value > 0)) record(this).pingFrames++;
			}
			return Reflect.apply(setUniform, this, args);
		};
	});
}

const snapshot = (page: Page) => page.evaluate(() => window.__rendererProbe.contexts);

test('route exit releases every GL resource and stops drawing before a clean reentry', async ({
	page
}) => {
	await instrumentRenderer(page);
	await page.goto('/projects/');
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
	await expect.poll(async () => (await snapshot(page))[0]?.draws ?? 0).toBeGreaterThan(0);
	const first = (await snapshot(page))[0];
	expect(first.alive.Program).toBeGreaterThan(0);
	expect(first.alive.Texture).toBeGreaterThan(0);
	expect(first.alive.Framebuffer).toBeGreaterThan(0);
	expect(first.alive.VertexArray).toBeGreaterThan(0);
	// Shader objects can already be deleted after linking; they must not leak either.
	expect(first.created.Shader).toBeGreaterThan(0);

	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('canvas')).toHaveCount(0);
	await expect
		.poll(async () => Object.values((await snapshot(page))[0].alive))
		.toEqual([0, 0, 0, 0, 0]);
	const stopped = (await snapshot(page))[0];
	expect(stopped.deleted).toEqual(stopped.created);
	await page.waitForTimeout(400);
	expect((await snapshot(page))[0].draws).toBe(stopped.draws);

	await expect(page.getByRole('link', { name: 'View Projects' })).toHaveAttribute(
		'data-projects-ready',
		'true'
	);
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await page.getByRole('link', { name: 'View Projects' }).click();
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
	await expect.poll(async () => (await snapshot(page)).length).toBe(2);
	await expect.poll(async () => (await snapshot(page))[1].draws).toBeGreaterThan(0);
	const reentered = await snapshot(page);
	expect(reentered[0].draws).toBe(stopped.draws);
	expect(reentered[1].alive.Texture).toBeGreaterThan(0);
	await expect(page.locator('canvas')).toHaveCount(1);

	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('canvas')).toHaveCount(0);
	await expect
		.poll(async () =>
			(await snapshot(page)).every((probe) =>
				Object.values(probe.alive).every((count) => count === 0)
			)
		)
		.toBe(true);
	for (const probe of await snapshot(page)) expect(probe.deleted).toEqual(probe.created);
});

test('Slat Graph opens its local demo without a ping; blank tunnel activation reaches the ping shader', async ({
	page
}) => {
	await instrumentRenderer(page);
	await page.goto('/projects/');
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
	const card = page.getByRole('link', { name: 'Open Slat Graph in a new tab' });
	await expect(card).toHaveAttribute('target', '_blank');
	const opened = page.waitForEvent('popup');
	await card.click();
	const popup = await opened;
	await expect(popup).toHaveURL(new URL('/demos/slat-graph/index.html', page.url()).href);
	await expect(popup).toHaveTitle('Slat Graph');
	await expect(popup.getByRole('heading', { name: 'Contributions in motion.' })).toBeVisible();
	await page.waitForTimeout(250);
	expect((await snapshot(page))[0].pingFrames).toBe(0);
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await popup.close();
	await page.bringToFront();
	const size = page.viewportSize()!;
	await page.mouse.click(70, size.height / 2);
	await expect.poll(async () => (await snapshot(page))[0].pingFrames).toBeGreaterThan(0);
});

test('reduced motion leaves the GPU idle after the initial static frame', async ({ page }) => {
	await instrumentRenderer(page);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/projects/');
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'ready');
	await expect.poll(async () => (await snapshot(page))[0]?.draws ?? 0).toBeGreaterThan(0);
	// Let initial ResizeObserver and IntersectionObserver notifications settle.
	await page.waitForTimeout(300);
	const draws = (await snapshot(page))[0].draws;
	await page.mouse.move(70, 300);
	await page.mouse.click(70, 300);
	await page.waitForTimeout(600);
	expect((await snapshot(page))[0].draws).toBe(draws);
	expect((await snapshot(page))[0].pingFrames).toBe(0);
});
