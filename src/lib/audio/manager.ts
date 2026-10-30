import { base } from '$app/paths';
import { get, writable } from 'svelte/store';
import { tracks, type MusicTrack } from './tracks';

export const PROJECTS_TIMING = {
	entryDelay: 0.28,
	introDuration: 4,
	scanDuration: 4.8,
	scanDelay: 2
} as const;
export type SfxName = 'treasure' | 'braam' | 'swoop';
export interface AudioState {
	openingError?: string;
	muted: boolean;
	volume: number;
	permission: 'unknown' | 'allowed' | 'blocked' | 'unavailable';
	sfx: SfxName | null;
	musicStatus: 'empty' | 'paused' | 'playing' | 'blocked';
	selectedTrackId: string | null;
}
export type ProjectsSoundState = {
	muted: boolean;
	status: 'idle' | 'scheduled' | 'playing' | 'paused' | 'ended' | 'blocked' | 'unavailable';
	hasGesture: boolean;
};
export interface ProjectsTimeline {
	start(): Promise<void>;
	getTime(): number | null;
	setMuted(muted: boolean): void;
	setReducedMotion(reduced: boolean): void;
	enableSound(): Promise<void>;
	destroy(): void;
	pause(): void;
	resume(canUseAudio: boolean): void;
	useSilentClock(): void;
}

const state = writable<AudioState>({
	muted: false,
	volume: 35,
	permission: 'unknown',
	sfx: null,
	musicStatus: tracks.length ? 'paused' : 'empty',
	selectedTrackId: tracks[0]?.id ?? null
});
export const audioState = { subscribe: state.subscribe };
const SETTINGS_KEY = 'ozerk-audio-settings';
const MUSIC_MAX_GAIN = 0.4;
const SFX_MAX_GAIN = 0.32;
const MUSIC_GAP_MS = 500;
const MUSIC_FADE_MS = 600;
let initialized = false;
let initializedRefs = 0;
let unlockingFromInteraction = false;
let homeActive = false;
let homeIntroAttempted = false;
let context: AudioContext | null = null;
const buffers = new Map<SfxName, Promise<AudioBuffer | null>>();
let effectSerial = 0;
let pendingEffect: SfxName | null = null;
let music: HTMLAudioElement | null = null;
let musicWanted = true;
let musicGeneration = 0;
let pendingMusicGeneration: number | null = null;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let quietUntil = 0;
let fadeFrame = 0;
let armedEntry: { expires: number; resumed: Promise<boolean> } | null = null;
let activeProjects: ProjectsTimeline | null = null;
const readinessCancels = new Set<() => void>();
type Effect = {
	serial: number;
	kind: SfxName;
	buffer: AudioBuffer;
	source: AudioBufferSourceNode | null;
	gain: GainNode | null;
	at: number;
	offset: number;
	pausedOffset: number | null;
	onended?: () => void;
};
let effect: Effect | null = null;
let openingClip: HTMLAudioElement | null = null;
let openingAudio: HTMLAudioElement | null = null;

function getOpeningClip() {
	if (!openingClip) {
		openingClip = new Audio(`${base}/sounds/treasure.mp3`);
		openingClip.preload = 'auto';
	}
	return openingClip;
}

function patch(value: Partial<AudioState>) {
	state.update((current) => ({ ...current, ...value }));
}
function persist() {
	const { muted, volume, selectedTrackId } = get(state);
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted, volume, selectedTrackId }));
	} catch {
		/* Preferences are optional. */
	}
}
function ensureInitialized() {
	if (initialized || typeof window === 'undefined') return;
	initialized = true;
	try {
		const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
		const volume = Number(saved.volume);
		patch({
			muted: false,
			volume: Number.isFinite(volume) && volume > 0 ? Math.min(100, volume) : 35,
			selectedTrackId: tracks.some((track) => track.id === saved.selectedTrackId)
				? saved.selectedTrackId
				: (tracks[0]?.id ?? null)
		});
	} catch {
		/* Malformed or unavailable storage must never block the site. */
	}
	document.addEventListener('visibilitychange', visibilityChanged);
	document.addEventListener('click', unlockAfterInteraction, { capture: true, passive: true });
	document.addEventListener('keydown', unlockAfterInteraction, { capture: true, passive: true });
}
function removeAudioUnlockListeners() {
	document.removeEventListener('click', unlockAfterInteraction, true);
	document.removeEventListener('keydown', unlockAfterInteraction, true);
}
function unlockAfterInteraction(event: Event) {
	if (!event.isTrusted || unlockingFromInteraction) return;
	if (
		event instanceof KeyboardEvent &&
		(event.repeat || (event.key !== 'Enter' && event.key !== ' '))
	)
		return;
	if (event.target instanceof Element && event.target.closest('.projects-link, .home-link')) return;
	const current = get(state);
	if (current.permission === 'allowed') {
		removeAudioUnlockListeners();
		return;
	}
	if (current.muted || current.volume === 0) return;
	unlockingFromInteraction = true;
	void enableAudio()
		.then(() => {
			if (get(state).permission === 'allowed') removeAudioUnlockListeners();
		})
		.finally(() => {
			unlockingFromInteraction = false;
		});
}
function getContext(): AudioContext | null {
	ensureInitialized();
	if (typeof window === 'undefined') return null;
	if (context?.state === 'closed') {
		context = null;
		buffers.clear();
	}
	if (context) return context;
	const AudioContextClass =
		window.AudioContext ??
		(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!AudioContextClass) {
		patch({ permission: 'unavailable' });
		return null;
	}
	try {
		context = new AudioContextClass();
		context.addEventListener('statechange', contextStateChanged);
		return context;
	} catch {
		patch({ permission: 'unavailable' });
		return null;
	}
}
function resumeContext(): Promise<boolean> {
	const audio = getContext();
	if (!audio) return Promise.resolve(false);
	try {
		// Gesture entry points reach resume() synchronously, before their first await.
		return audio.resume().then(
			() => {
				const allowed = audio.state === 'running';
				patch({ permission: allowed ? 'allowed' : 'blocked' });
				return allowed;
			},
			() => {
				patch({ permission: 'blocked' });
				return false;
			}
		);
	} catch {
		patch({ permission: 'blocked' });
		return Promise.resolve(false);
	}
}
export function preloadSfx(name: SfxName): Promise<AudioBuffer | null> {
	const audio = getContext();
	if (!audio) return Promise.resolve(null);
	let loading = buffers.get(name);
	if (!loading) {
		loading = fetch(`${base}/sounds/${name}.mp3`)
			.then((response) => {
				if (!response.ok) throw new Error('Sound unavailable');
				return response.arrayBuffer();
			})
			.then((data) => audio.decodeAudioData(data))
			.catch(() => {
				buffers.delete(name);
				return null;
			});
		buffers.set(name, loading);
	}
	return loading;
}
function readyAudio(
	resumed: Promise<boolean>,
	name: SfxName
): Promise<[boolean, AudioBuffer | null]> {
	return new Promise((resolve) => {
		let settled = false;
		function finish(result: [boolean, AudioBuffer | null]) {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			readinessCancels.delete(cancel);
			resolve(result);
		}
		const cancel = () => finish([false, null]);
		// Failure deadline only; actual audiovisual onset is scheduled on the audio clock.
		const timeout = setTimeout(cancel, 1500);
		readinessCancels.add(cancel);
		void Promise.all([resumed, preloadSfx(name)]).then(finish, cancel);
	});
}
function sfxVolume() {
	const current = get(state);
	return current.muted ? 0 : Math.min(SFX_MAX_GAIN, (current.volume / 100) * 0.7);
}
function musicVolume() {
	const current = get(state);
	return current.muted ? 0 : (current.volume / 100) * MUSIC_MAX_GAIN;
}
function clearMusicResume() {
	if (resumeTimer !== null) clearTimeout(resumeTimer);
	resumeTimer = null;
}
function pauseMusic() {
	musicGeneration++;
	pendingMusicGeneration = null;
	clearMusicResume();
	cancelAnimationFrame(fadeFrame);
	fadeFrame = 0;
	music?.pause();
	if (music) music.volume = 0;
	patch({ musicStatus: tracks.length ? 'paused' : 'empty' });
}
function canPlayMusic() {
	const current = get(state);
	return (
		homeActive &&
		homeIntroAttempted &&
		!document.hidden &&
		musicWanted &&
		!current.muted &&
		current.volume > 0 &&
		current.permission === 'allowed' &&
		!effect &&
		!openingAudio &&
		!pendingEffect &&
		resumeTimer === null &&
		performance.now() >= quietUntil
	);
}
function selectedTrack(): MusicTrack | undefined {
	return tracks.find((track) => track.id === get(state).selectedTrackId);
}
function getMusic(): HTMLAudioElement | null {
	const track = selectedTrack();
	if (!track) return null;
	const url = `${base}${track.src.startsWith('/') ? track.src : `/${track.src}`}`;
	if (!music) {
		music = new Audio();
		music.preload = 'none';
		music.loop = true;
	}
	if (music.getAttribute('src') !== url) {
		music.pause();
		music.src = url;
	}
	return music;
}
function beginMusicFade(element: HTMLAudioElement, generation: number) {
	const startedAt = performance.now();
	function step(time: number) {
		if (generation !== musicGeneration || !canPlayMusic()) {
			fadeFrame = 0;
			return;
		}
		const progress = Math.min(1, (time - startedAt) / MUSIC_FADE_MS);
		element.volume = musicVolume() * progress;
		if (progress < 1) fadeFrame = requestAnimationFrame(step);
		else fadeFrame = 0;
	}
	fadeFrame = requestAnimationFrame(step);
}
function playMusic() {
	if (performance.now() < quietUntil) {
		resumeMusicAfterGap();
		return;
	}
	if (!canPlayMusic()) return;
	const element = getMusic();
	if (!element) return;
	if (pendingMusicGeneration !== null) return;
	if (!element.paused && get(state).musicStatus === 'playing') return;
	const generation = ++musicGeneration;
	pendingMusicGeneration = generation;
	element.volume = 0;
	try {
		// A direct track/control click can call this before user activation expires.
		void element.play().then(
			() => {
				if (pendingMusicGeneration === generation) pendingMusicGeneration = null;
				if (generation !== musicGeneration) return;
				if (!canPlayMusic()) {
					element.pause();
					return;
				}
				patch({ musicStatus: 'playing' });
				beginMusicFade(element, generation);
			},
			() => {
				if (pendingMusicGeneration === generation) pendingMusicGeneration = null;
				if (generation === musicGeneration) patch({ musicStatus: 'blocked' });
			}
		);
	} catch {
		if (pendingMusicGeneration === generation) pendingMusicGeneration = null;
		patch({ musicStatus: 'blocked' });
	}
}
function resumeMusicAfterGap(beginGap = false) {
	if (beginGap) quietUntil = performance.now() + MUSIC_GAP_MS;
	clearMusicResume();
	if (!homeActive || document.hidden) return;
	const generation = musicGeneration;
	resumeTimer = setTimeout(
		() => {
			resumeTimer = null;
			if (generation === musicGeneration) playMusic();
		},
		Math.max(0, quietUntil - performance.now())
	);
}
function disconnectEffect(active: Effect) {
	if (active.source) {
		active.source.onended = null;
		try {
			active.source.stop();
		} catch {
			/* Already ended. */
		}
		active.source.disconnect();
	}
	active.gain?.disconnect();
	active.source = null;
	active.gain = null;
}
function cancelEffect() {
	effectSerial++;
	pendingEffect = null;
	if (openingAudio) {
		openingAudio.onended = null;
		openingAudio.pause();
		openingAudio.currentTime = 0;
		openingAudio = null;
	}
	if (effect) disconnectEffect(effect);
	effect = null;
	patch({ sfx: null });
	clearMusicResume();
}
function requestEffect(name: SfxName) {
	pauseMusic();
	cancelEffect();
	pendingEffect = name;
	patch({ sfx: name });
	return effectSerial;
}
function runEffect(active: Effect): boolean {
	const audio = context;
	if (!audio || audio.state !== 'running' || active.offset >= active.buffer.duration) return false;
	try {
		const source = audio.createBufferSource();
		const gain = audio.createGain();
		source.buffer = active.buffer;
		gain.gain.value = sfxVolume();
		source.connect(gain);
		gain.connect(audio.destination);
		active.source = source;
		active.gain = gain;
		active.pausedOffset = null;
		effect = active;
		pendingEffect = null;
		patch({ sfx: active.kind });
		source.onended = () => {
			if (effect !== active || source !== active.source) return;
			source.disconnect();
			gain.disconnect();
			active.source = null;
			active.gain = null;
			effect = null;
			patch({ sfx: null });
			active.onended?.();
			// This actual ended callback, never an estimated duration, starts the gap.
			if (active.kind === 'treasure' || active.kind === 'swoop') resumeMusicAfterGap(true);
		};
		source.start(active.at, active.offset);
		return true;
	} catch {
		disconnectEffect(active);
		effect = null;
		pendingEffect = null;
		patch({ sfx: null, permission: 'blocked' });
		return false;
	}
}
async function playHomeEffect(name: 'treasure' | 'swoop', resumed = resumeContext()) {
	const serial = requestEffect(name);
	if (get(state).muted || get(state).volume === 0) {
		pendingEffect = null;
		patch({ sfx: null });
		return;
	}
	const [allowed, buffer] = await readyAudio(resumed, name);
	if (serial !== effectSerial) return;
	if (!allowed || !buffer || context?.state !== 'running' || document.hidden) {
		pendingEffect = null;
		patch({ sfx: null, permission: context ? 'blocked' : 'unavailable' });
		return;
	}
	runEffect({
		serial,
		kind: name,
		buffer,
		source: null,
		gain: null,
		at: context.currentTime,
		offset: 0,
		pausedOffset: null
	});
}
export function initializeAudio(): () => void {
	ensureInitialized();
	initializedRefs++;
	if (!openingAudio) getOpeningClip().load();
	for (const name of ['treasure', 'braam', 'swoop'] as const) void preloadSfx(name);
	return () => {
		initializedRefs--;
		if (initializedRefs > 0) return;
		activeProjects?.destroy();
		activeProjects = null;
		cancelEffect();
		pauseMusic();
		for (const cancel of readinessCancels) cancel();
		document.removeEventListener('visibilitychange', visibilityChanged);
		removeAudioUnlockListeners();
		context?.removeEventListener('statechange', contextStateChanged);
		void context?.close().catch(() => {});
		context = null;
		buffers.clear();
		music = null;
		openingClip?.removeAttribute('src');
		openingClip?.load();
		openingClip = null;
		initialized = false;
	};
}
export function enterHome() {
	ensureInitialized();
	homeActive = true;
	if (homeIntroAttempted && !effect && !pendingEffect) resumeMusicAfterGap();
}
export function leaveHome() {
	homeActive = false;
	pauseMusic();
	if (openingAudio || effect?.kind === 'treasure' || pendingEffect === 'treasure') cancelEffect();
}
export async function startHomeIntro() {
	ensureInitialized();
	if (homeIntroAttempted) return;
	homeIntroAttempted = true;
	if (get(state).muted || get(state).volume === 0 || document.hidden) return;
	const serial = requestEffect('treasure');
	const clip = getOpeningClip();
	openingAudio = clip;
	clip.currentTime = 0;
	clip.volume = sfxVolume();
	clip.onended = () => {
		if (serial !== effectSerial || openingAudio !== clip) return;
		clip.onended = null;
		openingAudio = null;
		pendingEffect = null;
		patch({ sfx: null });
		resumeMusicAfterGap(true);
	};
	try {
		// Native play() reports autoplay denial directly instead of leaving resume() pending.
		await clip.play();
		if (serial !== effectSerial || openingAudio !== clip) return;
		pendingEffect = null;
		patch({ sfx: 'treasure', permission: 'allowed', openingError: undefined });
	} catch (error) {
		if (serial !== effectSerial || openingAudio !== clip) return;
		clip.onended = null;
		clip.pause();
		openingAudio = null;
		pendingEffect = null;
		patch({
			sfx: null,
			permission: 'blocked',
			openingError: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
		});
	}
}
export function prepareHomeReturn() {
	ensureInitialized();
	homeIntroAttempted = true;
	const resumed = resumeContext();
	void playHomeEffect('swoop', resumed);
}
export function armProjectsEntry() {
	ensureInitialized();
	pauseMusic();
	cancelEffect();
	armedEntry = { expires: performance.now() + 10_000, resumed: resumeContext() };
	void preloadSfx('braam');
}
export function setMuted(muted: boolean) {
	ensureInitialized();
	patch({ muted });
	persist();
	if (openingAudio) openingAudio.volume = sfxVolume();
	if (effect?.gain && context) {
		effect.gain.gain.cancelScheduledValues(context.currentTime);
		effect.gain.gain.setTargetAtTime(sfxVolume(), context.currentTime, 0.015);
	}
	if (muted) pauseMusic();
	else if (!effect && !pendingEffect && resumeTimer === null) playMusic();
}
export function setVolume(volume: number) {
	ensureInitialized();
	patch({ volume: Math.min(100, Math.max(0, Math.round(volume))) });
	persist();
	if (openingAudio) openingAudio.volume = sfxVolume();
	if (effect?.gain && context)
		effect.gain.gain.setTargetAtTime(sfxVolume(), context.currentTime, 0.015);
	if (music && get(state).volume === 0) {
		cancelAnimationFrame(fadeFrame);
		fadeFrame = 0;
		music.volume = 0;
	} else if (music && get(state).musicStatus === 'playing' && !fadeFrame)
		music.volume = musicVolume();
	if (get(state).volume > 0 && (!music || music.paused)) playMusic();
}
export async function enableAudio() {
	ensureInitialized();
	const resumed = resumeContext();
	setMuted(false);
	if (context?.state === 'running') patch({ permission: 'allowed' });
	if (!effect && !pendingEffect && resumeTimer === null) playMusic();
	const [allowed] = await readyAudio(resumed, 'treasure');
	if (!allowed) patch({ permission: context ? 'blocked' : 'unavailable' });
	else if (!effect && !pendingEffect && resumeTimer === null) playMusic();
}
export function selectTrack(id: string) {
	ensureInitialized();
	if (!tracks.some((track) => track.id === id)) return;
	pauseMusic();
	patch({ selectedTrackId: id });
	musicWanted = true;
	persist();
	void enableAudio();
}
export function toggleMusic() {
	if (!tracks.length || pendingMusicGeneration !== null) return;
	if (get(state).musicStatus === 'playing') {
		musicWanted = false;
		pauseMusic();
	} else {
		musicWanted = true;
		void enableAudio();
	}
}
export function nextTrack() {
	if (!tracks.length) return;
	const index = tracks.findIndex((track) => track.id === get(state).selectedTrackId);
	selectTrack(tracks[(index + 1) % tracks.length].id);
}
function visibilityChanged() {
	if (document.hidden) {
		openingAudio?.pause();
		activeProjects?.pause();
		if (effect && context) {
			effect.pausedOffset = context.currentTime - effect.at + effect.offset;
			disconnectEffect(effect);
		}
		pauseMusic();
		return;
	}
	if (openingAudio && homeActive) {
		const clip = openingAudio;
		void clip.play().catch(() => {
			if (openingAudio !== clip) return;
			cancelEffect();
			patch({ permission: 'blocked' });
		});
	}
	if (effect && effect.pausedOffset !== null) {
		if (context?.state === 'running' && effect.pausedOffset < effect.buffer.duration) {
			effect.offset = Math.max(0, effect.pausedOffset);
			effect.at = context.currentTime + Math.max(0, -effect.pausedOffset);
			runEffect(effect);
		} else cancelEffect();
	}
	activeProjects?.resume(context?.state === 'running');
	if (homeActive && !effect && !pendingEffect) resumeMusicAfterGap();
}
function contextStateChanged() {
	if (openingAudio && !openingAudio.paused) return;
	if (document.hidden || context?.state === 'running') return;
	activeProjects?.useSilentClock();
	if (effect) cancelEffect();
	patch({ permission: 'blocked' });
}

/** A route owns only its visual clock. The persistent manager owns every sound. */
export function createProjectsTimeline(
	options: { reducedMotion?: boolean; onState?: (value: ProjectsSoundState) => void } = {}
): ProjectsTimeline {
	ensureInitialized();
	activeProjects?.destroy();
	const arm = armedEntry && armedEntry.expires > performance.now() ? armedEntry : null;
	armedEntry = null;
	let reduced = options.reducedMotion ?? false;
	let started = false;
	let starting = false;
	let destroyed = false;
	let audioClock = false;
	let onset = 0;
	let paused = false;
	let frozen = 0;
	let ownSerial = -1;
	let generation = 0;
	let status: ProjectsSoundState['status'] = 'idle';
	let explicitGesture = Boolean(arm);
	function publish() {
		options.onState?.({
			muted: get(state).muted || !explicitGesture,
			status,
			hasGesture: explicitGesture
		});
	}
	const unsubscribe = state.subscribe(() => publish());
	function now() {
		return audioClock && context ? context.currentTime : performance.now() / 1000;
	}
	function raw() {
		return paused ? frozen : now() - onset;
	}
	function beginVisual(withAudio: boolean) {
		audioClock = withAudio;
		onset = now() + PROJECTS_TIMING.entryDelay;
		started = true;
		starting = false;
		paused = document.hidden;
		frozen = -PROJECTS_TIMING.entryDelay;
		status = withAudio ? 'scheduled' : get(state).permission === 'blocked' ? 'blocked' : 'idle';
		publish();
	}
	async function begin(resumed: Promise<boolean> | null) {
		const request = ++generation;
		starting = true;
		const current = get(state);
		if (!resumed || current.muted || current.volume === 0 || reduced) {
			beginVisual(false);
			return;
		}
		ownSerial = requestEffect('braam');
		const [allowed, buffer] = await readyAudio(resumed, 'braam');
		if (destroyed || request !== generation || ownSerial !== effectSerial) return;
		if (
			!allowed ||
			!buffer ||
			context?.state !== 'running' ||
			document.hidden ||
			get(state).muted ||
			reduced
		) {
			pendingEffect = null;
			patch({
				sfx: null,
				permission:
					!allowed || !buffer ? (context ? 'blocked' : 'unavailable') : get(state).permission
			});
			beginVisual(false);
			return;
		}
		beginVisual(true);
		if (
			!runEffect({
				serial: ownSerial,
				kind: 'braam',
				buffer,
				source: null,
				gain: null,
				at: onset,
				offset: 0,
				pausedOffset: null,
				onended: () => {
					status = 'ended';
					publish();
				}
			})
		)
			useSilentClock();
	}
	async function start() {
		if (started || starting || destroyed) return;
		await begin(arm?.resumed ?? null);
	}
	function getTime(): number | null {
		if (!started || destroyed) return null;
		const elapsed = raw();
		if (elapsed < 0) return null;
		if (!paused && status === 'scheduled') {
			status = 'playing';
			publish();
		}
		return elapsed;
	}
	function pause() {
		if (!started || paused || destroyed) return;
		frozen = raw();
		paused = true;
		status = 'paused';
		publish();
	}
	function resume(canUseAudio: boolean) {
		if (!paused || destroyed) return;
		paused = false;
		audioClock = audioClock && canUseAudio;
		onset = now() - frozen;
		status = effect?.serial === ownSerial ? (frozen < 0 ? 'scheduled' : 'playing') : 'idle';
		publish();
	}
	function useSilentClock() {
		if (destroyed || !started || !audioClock) return;
		const elapsed = raw();
		audioClock = false;
		onset = now() - elapsed;
		status = 'blocked';
		publish();
	}
	function setReducedMotion(value: boolean) {
		reduced = value;
		if (!value) return;
		if (pendingEffect === 'braam' && ownSerial === effectSerial) {
			generation++;
			cancelEffect();
			beginVisual(false);
		} else if (effect?.serial === ownSerial) {
			cancelEffect();
			useSilentClock();
		}
	}
	async function enableSound() {
		if (destroyed || starting) return;
		explicitGesture = true;
		const resumed = resumeContext();
		setMuted(false);
		await begin(resumed);
	}
	function destroy() {
		if (destroyed) return;
		destroyed = true;
		generation++;
		if (effect?.serial === ownSerial || (pendingEffect === 'braam' && ownSerial === effectSerial))
			cancelEffect();
		unsubscribe();
		if (activeProjects === controller) activeProjects = null;
	}
	const controller: ProjectsTimeline = {
		start,
		getTime,
		setMuted,
		setReducedMotion,
		enableSound,
		destroy,
		pause,
		resume,
		useSilentClock
	};
	activeProjects = controller;
	return controller;
}
