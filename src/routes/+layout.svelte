<script lang="ts">
	import './layout.css';
	import Footer from '$lib/components/Footer.svelte';
	import { page } from '$app/state';
	import { asset } from '$app/paths';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { initializeAudio, prepareHomeReturn } from '$lib/audio/manager';
	import { prepareProjectsEntry } from '$lib/projects/experience';
	import { skipHomeIntro } from '$lib/home-entry';
	import { consumeNavigationCue } from '$lib/navigation';
	let { children } = $props();
	let frame: HTMLDivElement;
	let activeAnimation: Animation | undefined;
	let generation = 0;
	let transitioning = $state(false);

	onMount(() => {
		if (page.route.id === '/projects') skipHomeIntro();
		const cleanupAudio = initializeAudio();
		return () => {
			generation++;
			activeAnimation?.cancel();
			cleanupAudio();
		};
	});

	onNavigate(async (navigation) => {
		if (navigation.willUnload || navigation.from?.url.pathname === navigation.to?.url.pathname)
			return;
		if (navigation.to?.route.id === '/projects' && !consumeNavigationCue('projects'))
			prepareProjectsEntry();
		if (navigation.from?.route.id === '/projects' && navigation.to?.route.id === '/') {
			skipHomeIntro();
			if (!consumeNavigationCue('home')) prepareHomeReturn();
		}
		const ticket = ++generation;
		activeAnimation?.cancel();
		if (!frame || matchMedia('(prefers-reduced-motion: reduce)').matches || !frame.animate) {
			transitioning = false;
			return;
		}
		transitioning = true;
		const exit = frame.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 260,
			easing: 'cubic-bezier(.4,0,.2,1)',
			fill: 'forwards'
		});
		activeAnimation = exit;
		await exit.finished.catch(() => {});
		return () => {
			if (ticket !== generation || !frame?.isConnected) {
				exit.cancel();
				return;
			}
			exit.cancel();
			const entrance = frame.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: 340,
				easing: 'cubic-bezier(.2,.7,.2,1)'
			});
			activeAnimation = entrance;
			void entrance.finished
				.catch(() => {})
				.finally(() => {
					entrance.cancel();
					if (ticket === generation) transitioning = false;
				});
		};
	});
</script>

<svelte:head>
	<title>Ozerk</title>
	<meta name="description" content="Ozerk's personal corner of the internet." />
	<link rel="icon" href={asset('/favicon.svg')} type="image/svg+xml" />
</svelte:head>

<div class="route-viewport">
	<div
		bind:this={frame}
		class="route-frame"
		data-route-transition={transitioning}
		inert={transitioning}
	>
		{@render children()}
		{#if page.route.id !== '/projects'}
			<Footer />
		{/if}
	</div>
</div>

<style>
	.route-viewport {
		overflow: clip;
	}
</style>
