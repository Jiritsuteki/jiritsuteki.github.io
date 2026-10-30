<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { prepareProjectsEntry, preloadProjectsAudio } from '$lib/projects/experience';
	import { markNavigationCue } from '$lib/navigation';

	let {
		label = 'View Projects',
		class: className = ''
	}: {
		label?: string;
		class?: string;
	} = $props();
	let pending = false;
	let hydrated = $state(false);
	let reset: ReturnType<typeof setTimeout> | undefined;

	function enter(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		if (pending) {
			event.preventDefault();
			return;
		}
		pending = true;
		markNavigationCue('projects');
		prepareProjectsEntry();
		reset = setTimeout(() => (pending = false), 1000);
	}

	onMount(() => {
		hydrated = true;
		void preloadProjectsAudio();
		return () => clearTimeout(reset);
	});
</script>

<a
	href={resolve('/projects')}
	data-projects-ready={hydrated}
	onclick={enter}
	onpointerenter={() => void preloadProjectsAudio()}
	onfocus={() => void preloadProjectsAudio()}
	class={`projects-link ${className}`}
>
	{label}
	<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
		<path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5" />
	</svg>
</a>

<style>
	.projects-link {
		display: inline-flex;
		width: fit-content;
		align-items: center;
		gap: 0.8rem;
		margin-top: 1.5rem;
		padding: 0.7rem 1rem;
		border: 1px solid rgb(255 255 255 / 20%);
		border-radius: 0.6rem;
		color: rgb(255 255 255 / 85%);
		font-size: 0.875rem;
		transition:
			background 180ms ease,
			border-color 180ms ease;
	}

	.projects-link:hover {
		border-color: rgb(255 255 255 / 45%);
		background: rgb(255 255 255 / 6%);
	}

	.projects-link:focus-visible {
		outline: 2px solid white;
		outline-offset: 5px;
	}

	@media (prefers-reduced-motion: reduce) {
		.projects-link {
			transition: none;
		}
	}
</style>
