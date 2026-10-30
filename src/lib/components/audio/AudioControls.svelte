<script lang="ts">
	import { onMount } from 'svelte';
	import {
		audioState,
		enableAudio,
		nextTrack,
		selectTrack,
		setMuted,
		setVolume,
		toggleMusic
	} from '$lib/audio/manager';
	import { tracks } from '$lib/audio/tracks';

	let expanded = $state(false);
	let playlistOpen = $state(false);
	let coarse = $state(false);
	let dragging = $state(false);
	let stretch = $state(0);
	let tilt = $state(0);
	let previousX = 0;
	let container: HTMLDivElement;
	let range: HTMLInputElement;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	const needsEnable = $derived($audioState.permission !== 'allowed');
	const silent = $derived($audioState.muted || $audioState.volume === 0);

	function clearClose() {
		clearTimeout(closeTimer);
	}
	function reveal() {
		clearClose();
		expanded = true;
	}
	function scheduleClose() {
		clearClose();
		if (dragging || coarse) return;
		closeTimer = setTimeout(() => {
			if (!container.contains(document.activeElement)) expanded = false;
		}, 140);
	}
	function settingsClick() {
		clearClose();
		if (coarse) expanded = !expanded;
		else expanded = true;
	}
	function changeSound() {
		if (needsEnable || $audioState.muted) void enableAudio();
		else setMuted(true);
	}
	function startDrag(event: PointerEvent) {
		dragging = true;
		previousX = event.clientX;
		range.setPointerCapture(event.pointerId);
		if (needsEnable) void enableAudio();
	}
	function moveDrag(event: PointerEvent) {
		if (!dragging) return;
		const bounds = range.getBoundingClientRect();
		const over =
			event.clientX < bounds.left
				? event.clientX - bounds.left
				: event.clientX > bounds.right
					? event.clientX - bounds.right
					: 0;
		stretch = (over / (Math.abs(over) + 35)) * 7;
		tilt = Math.max(-8, Math.min(8, (event.clientX - previousX) * 0.5));
		previousX = event.clientX;
	}
	function endDrag() {
		dragging = false;
		stretch = 0;
		tilt = 0;
	}
	function inputVolume(event: Event) {
		setVolume(Number((event.target as HTMLInputElement).value));
	}
	function focusOut(event: FocusEvent) {
		if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
		if (!dragging) expanded = false;
	}
	onMount(() => {
		const media = matchMedia('(hover: none), (pointer: coarse)');
		const update = () => (coarse = media.matches);
		update();
		media.addEventListener('change', update);
		const outside = (event: PointerEvent) => {
			if (!container.contains(event.target as Node)) {
				expanded = false;
				playlistOpen = false;
			}
		};
		const escape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				expanded = false;
				playlistOpen = false;
			}
		};
		document.addEventListener('pointerdown', outside);
		document.addEventListener('keydown', escape);
		return () => {
			clearClose();
			media.removeEventListener('change', update);
			document.removeEventListener('pointerdown', outside);
			document.removeEventListener('keydown', escape);
		};
	});
</script>

<div
	class="audio-controls"
	bind:this={container}
	data-audio-permission={$audioState.permission}
	data-opening-error={$audioState.openingError ?? ''}
	data-audio-sfx={$audioState.sfx ?? 'none'}
	data-audio-music={$audioState.musicStatus}
	data-audio-muted={$audioState.muted}
	data-audio-volume={$audioState.volume}
>
	<div
		class="volume-shell"
		role="group"
		aria-label="Audio settings"
		class:expanded
		class:dragging
		data-audio-expanded={expanded}
		onpointerenter={() => {
			if (!coarse) reveal();
		}}
		onpointerleave={scheduleClose}
		onfocusin={() => {
			if (!coarse) reveal();
		}}
		onfocusout={focusOut}
		style={`--volume: ${$audioState.volume}%; --stretch: ${stretch}px; --tilt: ${tilt}deg`}
	>
		<button
			class="icon-button speaker"
			type="button"
			aria-label="Sound settings"
			aria-expanded={expanded}
			title="Sound settings"
			onclick={settingsClick}
		>
			<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"
				><path d="M11 5 6 9H3v6h3l5 4V5Z" />{#if silent}<path d="m16 9 5 6m0-6-5 6" />{:else}<path
						d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"
					/>{/if}</svg
			>
		</button>
		<div class="volume-panel" inert={!expanded}>
			<button
				class="channel-toggle"
				type="button"
				aria-label={needsEnable
					? 'Enable sound'
					: $audioState.muted
						? 'Unmute sound'
						: 'Mute sound'}
				onclick={changeSound}
				title={needsEnable ? 'Enable sound' : 'Toggle mute'}
				>{silent ? 'Off' : needsEnable ? 'Start' : 'On'}</button
			>
			<div class="elastic-range" class:active={dragging}>
				<input
					bind:this={range}
					type="range"
					min="0"
					max="100"
					step="1"
					value={$audioState.volume}
					aria-label="Music volume"
					oninput={inputVolume}
					onpointerdown={startDrag}
					onpointermove={moveDrag}
					onpointerup={endDrag}
					onpointercancel={endDrag}
					onlostpointercapture={endDrag}
					onkeydown={() => {
						if (needsEnable) void enableAudio();
					}}
				/>
				<output aria-hidden="true">{$audioState.volume}</output>
			</div>
		</div>
	</div>
	<button
		class="icon-button music-button"
		type="button"
		aria-label="Choose music"
		aria-expanded={playlistOpen}
		title="Choose music"
		onclick={() => {
			playlistOpen = !playlistOpen;
			expanded = false;
		}}
	>
		<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"
			><path d="M9 18V5l12-2v13M9 8l12-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse
				cx="18"
				cy="16"
				rx="3"
				ry="2"
			/></svg
		>
	</button>
	{#if playlistOpen}
		<div class="music-menu" role="region" aria-label="Music selection">
			{#if tracks.length}
				<p class="menu-heading">Music</p>
				<div class="track-list">
					{#each tracks as track (track.id)}<button
							type="button"
							aria-pressed={$audioState.selectedTrackId === track.id}
							onclick={() => selectTrack(track.id)}
							><span>{track.title}</span>{#if track.artist}<small>{track.artist}</small
								>{/if}</button
						>{/each}
				</div>
				<div class="playback">
					<button
						type="button"
						onclick={toggleMusic}
						aria-label={$audioState.musicStatus === 'playing' ? 'Pause music' : 'Play music'}
						>{$audioState.musicStatus === 'playing' ? 'Pause' : 'Play'}</button
					><button type="button" onclick={nextTrack} disabled={tracks.length < 2}
						>Next <span aria-hidden="true">→</span></button
					>
				</div>
			{:else}
				<p class="empty-playlist">No tracks added yet</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.audio-controls {
		position: relative;
		display: flex;
		align-items: center;
		gap: 7px;
		width: 83px;
		height: 38px;
		z-index: 5;
	}
	.volume-shell {
		position: absolute;
		right: 45px;
		top: 0;
		display: flex;
		width: 38px;
		height: 38px;
		justify-content: flex-end;
		align-items: center;
		overflow: hidden;
		border: 1px solid #ffffff24;
		border-radius: 11px;
		background: #111115a6;
		backdrop-filter: blur(14px);
		transition:
			width 220ms cubic-bezier(0.25, 1.18, 0.5, 1),
			border-color 180ms;
	}
	.volume-shell.expanded {
		width: 190px;
		border-color: #ffffff38;
	}
	.icon-button {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		flex: 0 0 38px;
		border-radius: 10px;
		color: #d8d6de;
		cursor: pointer;
		transition:
			color 160ms,
			background 160ms;
	}
	.icon-button svg {
		stroke: currentColor;
		stroke-width: 1.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.icon-button:hover {
		color: white;
		background: #ffffff09;
	}
	.speaker {
		position: relative;
		z-index: 1;
		width: 36px;
		flex-basis: 36px;
		order: 2;
	}
	.music-button {
		position: absolute;
		right: 0;
		border: 1px solid #ffffff24;
		background: #111115a6;
		backdrop-filter: blur(14px);
	}
	.volume-panel {
		display: flex;
		width: 151px;
		flex: 0 0 151px;
		order: 1;
		align-items: center;
		padding-left: 9px;
		padding-right: 5px;
		gap: 8px;
		opacity: 0;
		transition: opacity 130ms;
	}
	.expanded .volume-panel {
		opacity: 1;
		transition-delay: 80ms;
	}
	.channel-toggle {
		flex: 0 0 23px;
		font-family: var(--font-mono);
		font-size: 9px;
		color: #b9b5c4;
		cursor: pointer;
		border-radius: 3px;
	}
	.channel-toggle:hover {
		color: white;
	}
	.elastic-range {
		position: relative;
		display: flex;
		align-items: center;
		gap: 7px;
		width: 102px;
		transform: translateX(var(--stretch));
		transition: transform 320ms cubic-bezier(0.2, 1.7, 0.4, 1);
	}
	.elastic-range.active {
		transition: transform 50ms linear;
	}
	input {
		appearance: none;
		width: 74px;
		height: 24px;
		border-radius: 8px;
		background: linear-gradient(to right, #d9d6e2 var(--volume), #ffffff25 var(--volume)) center /
			100% 3px no-repeat;
		outline: none;
		cursor: ew-resize;
		touch-action: pan-y;
	}
	input::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 10px;
		border: 1px solid #f7f5fb;
		border-radius: 50%;
		background: #dedbe7;
		transition: transform 220ms cubic-bezier(0.2, 1.7, 0.4, 1);
	}
	input::-moz-range-thumb {
		width: 9px;
		height: 9px;
		border: 1px solid #f7f5fb;
		border-radius: 50%;
		background: #dedbe7;
		transition: transform 220ms cubic-bezier(0.2, 1.7, 0.4, 1);
	}
	.active input::-webkit-slider-thumb {
		transform: scale(1.25);
	}
	.active input::-moz-range-thumb {
		transform: scale(1.25);
	}
	output {
		display: block;
		width: 20px;
		color: #bcb7ca;
		font-family: var(--font-mono);
		font-size: 9px;
		text-align: right;
		transform: rotate(var(--tilt));
		transition: transform 280ms cubic-bezier(0.2, 1.7, 0.4, 1);
	}
	button:focus-visible,
	input:focus-visible {
		outline: 1px solid #eeebf5;
		outline-offset: 4px;
	}
	.music-menu {
		position: absolute;
		top: 47px;
		right: 0;
		width: 214px;
		padding: 14px;
		border: 1px solid #ffffff25;
		border-radius: 11px;
		background: #111115ed;
		backdrop-filter: blur(18px);
		box-shadow: 0 12px 35px #0005;
		color: #d2cddc;
		font-size: 12px;
	}
	.empty-playlist {
		font-size: 11px;
		color: #a8a2b5;
		padding: 2px 1px;
	}
	.menu-heading {
		color: #8d879c;
		font-family: var(--font-mono);
		font-size: 9px;
		margin-bottom: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.track-list {
		display: grid;
		gap: 3px;
	}
	.track-list button {
		padding: 7px 8px;
		border-radius: 5px;
		text-align: left;
		cursor: pointer;
	}
	.track-list button:hover,
	.track-list button[aria-pressed='true'] {
		background: #ffffff0c;
	}
	.track-list small {
		display: block;
		margin-top: 3px;
		color: #8d879c;
		font-size: 10px;
	}
	.playback {
		display: flex;
		justify-content: space-between;
		padding-top: 10px;
		margin-top: 9px;
		border-top: 1px solid #ffffff12;
		font-size: 10px;
	}
	.playback button {
		cursor: pointer;
		color: #bdb7cc;
	}
	.playback button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	@media (prefers-reduced-motion: reduce) {
		.volume-shell,
		.volume-panel,
		.icon-button,
		.elastic-range,
		output {
			transition: none;
		}
		input::-webkit-slider-thumb {
			transition: none;
		}
		input::-moz-range-thumb {
			transition: none;
		}
		.elastic-range {
			transform: none;
		}
		output {
			transform: none;
		}
	}
</style>
