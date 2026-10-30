import { expect, test, type Page } from '@playwright/test';

type ProbeSource = {
	kind: string;
	duration: number;
	at: number;
	offset: number;
	contextAtStart: number;
	startedAt: number;
	stops: number;
	disconnects: number;
	endedAt: number | null;
	end(): void;
};
type AudioProbe = {
	policy: 'allowed' | 'blocked' | 'pending';
	overrideTime: number | null;
	sources: ProbeSource[];
	scanZ: number | null;
	musicPlays: { at: number; activeSfx: number }[];
	musicPauses: number[];
	musicElements: HTMLMediaElement[];
	releaseBraam?: () => void;
};
declare global {
	interface Window {
		__audioProbe: AudioProbe;
	}
}

async function mockAudio(
	page: Page,
	options: {
		policy?: 'allowed' | 'blocked' | 'pending';
		muted?: boolean;
		deferBraam?: boolean;
	} = {}
) {
	await page.addInitScript((settings) => {
		if (settings.muted)
			localStorage.setItem('ozerk-audio-settings', JSON.stringify({ muted: true, volume: 35 }));
		const probe: AudioProbe = {
			policy: settings.policy ?? 'allowed',
			overrideTime: null,
			sources: [],
			scanZ: null,
			musicPlays: [],
			musicPauses: [],
			musicElements: []
		};
		window.__audioProbe = probe;
		class MockAudioContext extends EventTarget {
			state: AudioContextState = 'suspended';
			destination = {};
			private origin = performance.now();
			get currentTime() {
				return probe.overrideTime ?? (performance.now() - this.origin) / 1000;
			}
			resume(): Promise<void> {
				if (probe.policy === 'blocked') return Promise.reject(new Error('Autoplay blocked'));
				if (probe.policy === 'pending') return new Promise(() => {});
				this.state = 'running';
				return Promise.resolve();
			}
			close() {
				this.state = 'closed';
				return Promise.resolve();
			}
			decodeAudioData(data: ArrayBuffer) {
				const kind =
					data.byteLength === 137448 ? 'treasure' : data.byteLength === 44328 ? 'swoop' : 'braam';
				const buffer = {
					kind,
					duration: kind === 'treasure' ? 3.432 : kind === 'swoop' ? 1.104 : 7.152
				};
				if (settings.deferBraam && kind === 'braam')
					return new Promise((resolve) => (probe.releaseBraam = () => resolve(buffer)));
				return Promise.resolve(buffer);
			}
			createBufferSource() {
				const record: ProbeSource = {
					kind: 'unknown',
					duration: 0,
					at: 0,
					offset: 0,
					contextAtStart: 0,
					startedAt: 0,
					stops: 0,
					disconnects: 0,
					endedAt: null,
					end() {
						record.endedAt = performance.now();
						source.onended?.();
					}
				};
				const source = {
					buffer: null as { kind: string; duration: number } | null,
					onended: null as (() => void) | null,
					connect() {},
					disconnect() {
						record.disconnects++;
					},
					start: (at: number, offset: number) => {
						record.kind = source.buffer!.kind;
						record.duration = source.buffer!.duration;
						record.at = at;
						record.offset = offset;
						record.contextAtStart = this.currentTime;
						record.startedAt = performance.now();
						probe.sources.push(record);
					},
					stop() {
						record.stops++;
					}
				};
				return source;
			}
			createGain() {
				return {
					gain: { value: 0, cancelScheduledValues() {}, setTargetAtTime() {} },
					connect() {},
					disconnect() {}
				};
			}
		}
		window.AudioContext = MockAudioContext as unknown as typeof AudioContext;
		const paused = new WeakMap<HTMLMediaElement, boolean>();
		const openingSources = new WeakMap<HTMLMediaElement, ProbeSource>();
		Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
			configurable: true,
			get() {
				return paused.get(this) ?? true;
			}
		});
		HTMLMediaElement.prototype.play = function () {
			// Treasure uses native media; music uses a separate preload='none' element.
			if (this.preload === 'auto') {
				if (probe.policy !== 'allowed')
					return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
				paused.set(this, false);
				if (!openingSources.has(this)) {
					const source: ProbeSource = {
						kind: 'treasure',
						duration: 3.432,
						at: 0,
						offset: 0,
						contextAtStart: 0,
						startedAt: performance.now(),
						stops: 0,
						disconnects: 0,
						endedAt: null,
						end: () => {
							source.endedAt = performance.now();
							paused.set(this, true);
							this.dispatchEvent(new Event('ended'));
						}
					};
					openingSources.set(this, source);
					probe.sources.push(source);
				}
				return Promise.resolve();
			}
			paused.set(this, false);
			if (!probe.musicElements.includes(this)) probe.musicElements.push(this);
			probe.musicPlays.push({
				at: performance.now(),
				activeSfx: probe.sources.filter((source) => !source.stops && source.endedAt === null).length
			});
			return Promise.resolve();
		};
		HTMLMediaElement.prototype.pause = function () {
			const opening = openingSources.get(this);
			if (opening && !this.paused && opening.endedAt === null) opening.stops++;
			paused.set(this, true);
			probe.musicPauses.push(performance.now());
		};
		if (window.WebGL2RenderingContext) {
			const names = new WeakMap<WebGLUniformLocation, string>();
			const proto = WebGL2RenderingContext.prototype;
			const originalGet = proto.getUniformLocation;
			const originalSet = proto.uniform1f;
			proto.getUniformLocation = function (program, name) {
				const location = originalGet.call(this, program, name);
				if (location) names.set(location, name);
				return location;
			};
			proto.uniform1f = function (location, value) {
				if (location && names.get(location) === 'uScanZ') probe.scanZ = value;
				return originalSet.call(this, location, value);
			};
		}
	}, options);
}

async function openHome(page: Page) {
	await page.goto('/');
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await expect(page.locator('[data-loader-state]')).toHaveAttribute(
		'data-loader-state',
		'complete'
	);
}
async function openProjects(page: Page) {
	await page.getByRole('link', { name: 'View Projects' }).click();
	await expect(page).toHaveURL(/\/projects\/?$/);
	await expect(page.locator('.projects-experience')).toHaveAttribute(
		'data-experience-ready',
		'true'
	);
}
async function musicFixture(page: Page) {
	// A test-only module fixture. The production playlist remains intentionally empty.
	await page.route('**/src/lib/audio/tracks.ts*', (route) =>
		route.fulfill({
			contentType: 'application/javascript',
			body: `export const tracks = [{ id: 'test-only', title: 'Test-only audio fixture', src: '/sounds/treasure.mp3' }];`
		})
	);
}

test('initial treasure does not hold the 1.8-second loader and an empty playlist stays honest', async ({
	page
}) => {
	await mockAudio(page);
	await openHome(page);
	expect(
		await page.evaluate(() => window.__audioProbe.sources.map((source) => source.kind))
	).toEqual(['treasure']);
	expect(await page.evaluate(() => window.__audioProbe.sources[0].duration)).toBe(3.432);
	await expect(page.locator('.audio-controls')).toHaveAttribute('data-audio-sfx', 'treasure');
	expect(await page.evaluate(() => window.__audioProbe.musicPlays.length)).toBe(0);
	await page.getByRole('button', { name: 'Choose music' }).click();
	await expect(page.getByText('No tracks added yet')).toBeVisible();
});

test('Braam shares the real shader clock; loops stay silent; returning starts one swoop', async ({
	page
}) => {
	await mockAudio(page);
	await openHome(page);
	await openProjects(page);
	await expect
		.poll(() =>
			page.evaluate(
				() => window.__audioProbe.sources.filter((source) => source.kind === 'braam').length
			)
		)
		.toBe(1);
	const braam = await page.evaluate(() => {
		const source = window.__audioProbe.sources.find((entry) => entry.kind === 'braam')!;
		return { at: source.at, contextAtStart: source.contextAtStart, offset: source.offset };
	});
	expect(braam.at - braam.contextAtStart).toBeGreaterThan(0.25);
	expect(braam.at - braam.contextAtStart).toBeLessThanOrEqual(0.281);
	expect(braam.offset).toBe(0);
	await page.evaluate(() => {
		const probe = window.__audioProbe;
		probe.overrideTime = probe.sources.find((source) => source.kind === 'braam')!.at + 2;
	});
	await expect.poll(() => page.evaluate(() => window.__audioProbe.scanZ)).toBeCloseTo(5, 1);
	await page.evaluate(() => {
		const probe = window.__audioProbe;
		probe.overrideTime = probe.sources.find((source) => source.kind === 'braam')!.at + 16;
	});
	await expect.poll(() => page.evaluate(() => window.__audioProbe.scanZ)).not.toBeCloseTo(5, 1);
	expect(
		await page.evaluate(
			() => window.__audioProbe.sources.filter((source) => source.kind === 'braam').length
		)
	).toBe(1);
	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await expect(page.locator('[data-loader-state]')).toHaveAttribute(
		'data-loader-state',
		'complete'
	);
	expect(
		await page.evaluate(() =>
			window.__audioProbe.sources.map((source) => ({ kind: source.kind, stops: source.stops }))
		)
	).toEqual([
		{ kind: 'treasure', stops: 1 },
		{ kind: 'braam', stops: 1 },
		{ kind: 'swoop', stops: 0 }
	]);
});

for (const policy of ['blocked', 'pending'] as const) {
	test(`${policy} autoplay opens the home and tunnel normally without fake audio permission`, async ({
		page
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await mockAudio(page, { policy });
		await openHome(page);
		await expect(page.locator('.audio-controls')).toHaveAttribute(
			'data-audio-permission',
			'blocked'
		);
		expect(await page.evaluate(() => window.__audioProbe.sources.length)).toBe(0);
		await openProjects(page);
		await expect(page.locator('.projects-experience')).toHaveAttribute(
			'data-sound-status',
			'blocked'
		);
		await expect.poll(() => page.evaluate(() => window.__audioProbe.scanZ)).toBeGreaterThan(0);
		expect(await page.evaluate(() => window.__audioProbe.sources.length)).toBe(0);
		expect(errors).toEqual([]);
	});
}

test('direct Projects is silent; its Home action plays swoop without a repeat loader or treasure', async ({
	page
}) => {
	await mockAudio(page);
	await page.goto('/projects/');
	await expect(page.locator('.projects-experience')).toHaveAttribute(
		'data-experience-ready',
		'true'
	);
	expect(await page.evaluate(() => window.__audioProbe.sources.length)).toBe(0);
	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	expect(
		await page.evaluate(() => window.__audioProbe.sources.map((source) => source.kind))
	).toEqual(['swoop']);
	await expect(page.locator('.loader-screen')).toHaveCount(0);
});

test('actual SFX end enforces 500ms silence even during track changes, then fades music safely', async ({
	page
}) => {
	await musicFixture(page);
	await mockAudio(page);
	await openHome(page);
	expect(await page.evaluate(() => window.__audioProbe.musicPlays.length)).toBe(0);
	await page.evaluate(() => window.__audioProbe.sources[0].end());
	await page.getByRole('button', { name: 'Choose music' }).click();
	await page.getByRole('button', { name: 'Test-only audio fixture', exact: true }).click();
	await expect.poll(() => page.evaluate(() => window.__audioProbe.musicPlays.length)).toBe(1);
	const gap = await page.evaluate(
		() => window.__audioProbe.musicPlays[0].at - window.__audioProbe.sources[0].endedAt!
	);
	expect(gap).toBeGreaterThanOrEqual(495);
	expect(await page.evaluate(() => window.__audioProbe.musicPlays[0].activeSfx)).toBe(0);
	await expect
		.poll(() => page.evaluate(() => window.__audioProbe.musicElements[0].volume))
		.toBeCloseTo(0.14, 2);
	await page.getByRole('button', { name: 'Sound settings' }).hover();
	await page.getByRole('slider', { name: 'Music volume' }).focus();
	await page.getByRole('slider', { name: 'Music volume' }).press('End');
	await expect
		.poll(() => page.evaluate(() => window.__audioProbe.musicElements[0].volume))
		.toBeCloseTo(0.4, 3);
	await page.getByRole('button', { name: 'Choose music' }).click();
	await openProjects(page);
	const pausedBeforeBraam = await page.evaluate(() => {
		const probe = window.__audioProbe;
		const braam = probe.sources.find((source) => source.kind === 'braam');
		return Boolean(
			braam && probe.musicElements[0].paused && probe.musicPauses.some((at) => at < braam.startedAt)
		);
	});
	expect(pausedBeforeBraam).toBe(true);
});

test('swoop uses its actual ended event; a new Projects navigation cancels the pending music gap', async ({
	page
}) => {
	await musicFixture(page);
	await mockAudio(page);
	await openHome(page);
	await page.evaluate(() => window.__audioProbe.sources[0].end());
	await expect.poll(() => page.evaluate(() => window.__audioProbe.musicPlays.length)).toBe(1);
	await openProjects(page);
	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	expect(await page.evaluate(() => window.__audioProbe.musicPlays.length)).toBe(1);
	// End at the actual navigation gesture, before the application's bubbling handler.
	// Waiting for scroll stability must not accidentally consume the 500ms under test.
	await expect(page.locator('[data-route-transition]')).toHaveAttribute(
		'data-route-transition',
		'false'
	);
	await page.getByRole('link', { name: 'View Projects' }).evaluate((element) => {
		element.addEventListener(
			'click',
			() => window.__audioProbe.sources.find((source) => source.kind === 'swoop')!.end(),
			{ capture: true, once: true }
		);
	});
	await openProjects(page);
	await page.waitForTimeout(650);
	expect(await page.evaluate(() => window.__audioProbe.musicPlays.length)).toBe(1);
	expect(await page.evaluate(() => window.__audioProbe.musicElements[0].paused)).toBe(true);
});

test('global mute survives routes and a real Enable sound gesture unlocks future Braam', async ({
	page
}) => {
	await mockAudio(page, { muted: true });
	await openHome(page);
	// A fresh page starts unmuted, as requested; mute then persists across SPA routes.
	await expect(page.locator('.audio-controls')).toHaveAttribute('data-audio-muted', 'false');
	await page.getByRole('button', { name: 'Sound settings' }).hover();
	await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
	await expect(page.locator('.audio-controls')).toHaveAttribute('data-audio-muted', 'true');
	await openProjects(page);
	expect(
		await page.evaluate(() => window.__audioProbe.sources.map((source) => source.kind))
	).toEqual(['treasure']);
	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	expect(
		await page.evaluate(() => window.__audioProbe.sources.map((source) => source.kind))
	).toEqual(['treasure']);
	await page.getByRole('button', { name: 'Sound settings' }).hover();
	await page.getByRole('button', { name: /Enable sound|Unmute sound/ }).click();
	await expect(page.locator('.audio-controls')).toHaveAttribute('data-audio-muted', 'false');
	await openProjects(page);
	await expect
		.poll(() =>
			page.evaluate(
				() => window.__audioProbe.sources.filter((source) => source.kind === 'braam').length
			)
		)
		.toBe(1);
});

test('hidden tabs preserve the remaining pre-onset delay and then resume the same audio sample', async ({
	page
}) => {
	await mockAudio(page);
	await openHome(page);
	await openProjects(page);
	await expect
		.poll(() =>
			page.evaluate(
				() => window.__audioProbe.sources.filter((source) => source.kind === 'braam').length
			)
		)
		.toBe(1);
	await page.evaluate(() => {
		const probe = window.__audioProbe;
		probe.overrideTime = probe.sources.find((source) => source.kind === 'braam')!.at - 0.1;
		Object.defineProperty(document, 'hidden', { configurable: true, value: true });
		document.dispatchEvent(new Event('visibilitychange'));
		probe.overrideTime += 20;
	});
	await expect(page.locator('[data-grid-status]')).toHaveAttribute('data-grid-status', 'paused');
	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, value: false });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect
		.poll(() =>
			page.evaluate(
				() => window.__audioProbe.sources.filter((source) => source.kind === 'braam').length
			)
		)
		.toBe(2);
	const remaining = await page.evaluate(() => {
		const source = window.__audioProbe.sources.filter((entry) => entry.kind === 'braam')[1];
		return { delay: source.at - source.contextAtStart, offset: source.offset };
	});
	expect(remaining.delay).toBeCloseTo(0.1, 5);
	expect(remaining.offset).toBe(0);
	await page.evaluate(() => {
		const probe = window.__audioProbe;
		probe.overrideTime = probe.sources.filter((source) => source.kind === 'braam')[1].at + 1.25;
	});
	await expect.poll(() => page.evaluate(() => window.__audioProbe.scanZ)).toBeCloseTo(3.05, 1);
});

test('a late Braam decode cannot replace the swoop from a newer Home navigation', async ({
	page
}) => {
	await mockAudio(page, { deferBraam: true });
	await openHome(page);
	await openProjects(page);
	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('[data-home-ready]')).toHaveAttribute('data-home-ready', 'true');
	await page.evaluate(() => window.__audioProbe.releaseBraam?.());
	await expect(page.locator('.audio-controls')).toHaveAttribute('data-audio-sfx', 'swoop');
	expect(
		await page.evaluate(() => window.__audioProbe.sources.some((source) => source.kind === 'braam'))
	).toBe(false);
});
