<script lang="ts">
	import { onMount } from 'svelte';
	import { claimHomeIntro } from '$lib/home-entry';
	import { startHomeIntro } from '$lib/audio/manager';

	let { oncomplete }: { oncomplete?: () => void } = $props();
	let state = $state<'pending' | 'loading' | 'revealing' | 'complete'>('pending');
	let fallback = 0;
	let removeTimer = 0;
	let mounted = false;

	function finish() {
		if (!mounted || state === 'revealing' || state === 'complete') return;
		window.clearTimeout(fallback);
		state = 'revealing';
		void startHomeIntro();
		oncomplete?.();
		removeTimer = window.setTimeout(() => (state = 'complete'), 450);
	}

	function animationFinished(event: AnimationEvent) {
		if (event.pseudoElement === '::after') finish();
	}

	onMount(() => {
		mounted = true;
		if (!claimHomeIntro()) {
			state = 'complete';
			void startHomeIntro();
			oncomplete?.();
		} else {
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				state = 'complete';
				void startHomeIntro();
				oncomplete?.();
			} else {
				state = 'loading';
				// animationend owns the 1.8s finish; this covers disabled/broken CSS.
				fallback = window.setTimeout(finish, 1950);
			}
		}
		return () => {
			mounted = false;
			window.clearTimeout(fallback);
			window.clearTimeout(removeTimer);
		};
	});
</script>

<div data-loader-state={state}>
	{#if state !== 'complete'}
		<div
			class="loader-screen"
			class:revealing={state === 'revealing'}
			role="status"
			aria-label="Loading portfolio"
		>
			<div class="loader" onanimationend={animationFinished} aria-hidden="true"></div>
			<span class="sr-only">Loading portfolio</span>
		</div>
	{/if}
</div>

<style>
	.loader-screen {
		position: fixed;
		inset: 0;
		z-index: 999;
		display: grid;
		place-items: center;
		background: #000;
		opacity: 1;
		transition: opacity 450ms ease;
	}
	.revealing {
		opacity: 0;
		pointer-events: none;
	}
	/* Uiverse / Shoh2008: supplied pulsIn + pulsOut, adapted to one 1.8s cycle. */
	.loader {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		aspect-ratio: 1;
	}
	.loader::before,
	.loader::after {
		content: '';
		position: absolute;
		border-radius: 50%;
		animation: pulsOut 1.8s ease-in-out 1 both;
		filter: drop-shadow(0 0 1rem rgb(255 255 255 / 75%));
	}
	.loader::before {
		width: 100%;
		padding-bottom: 100%;
		box-shadow: inset 0 0 0 1rem #fff;
		animation-name: pulsIn;
	}
	.loader::after {
		width: calc(100% - 2rem);
		padding-bottom: calc(100% - 2rem);
		box-shadow: 0 0 0 0 #fff;
	}
	@keyframes pulsIn {
		0% {
			box-shadow: inset 0 0 0 1rem #fff;
			opacity: 1;
		}
		50%,
		100% {
			box-shadow: inset 0 0 0 0 #fff;
			opacity: 0;
		}
	}
	@keyframes pulsOut {
		0%,
		50% {
			box-shadow: 0 0 0 0 #fff;
			opacity: 0;
		}
		100% {
			box-shadow: 0 0 0 1rem #fff;
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.loader-screen {
			transition: none;
		}
		.loader::before,
		.loader::after {
			animation: none;
		}
	}
</style>
