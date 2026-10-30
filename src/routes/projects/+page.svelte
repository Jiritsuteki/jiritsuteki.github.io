<script lang="ts">
	import { onMount, tick } from 'svelte';
	import HomeLink from '$lib/components/projects/HomeLink.svelte';
	import GridScan from '$lib/components/projects/GridScan.svelte';
	import ProjectCard from '$lib/components/projects/ProjectCard.svelte';
	import { projects, type PortfolioProject } from '$lib/projects/data';
	import {
		createProjectsExperience,
		PROJECTS_TIMING,
		type ProjectsSoundState
	} from '$lib/projects/experience';

	let reducedMotion = $state(false);
	let ready = $state(false);
	let initialized = $state(false);
	let sound = $state<ProjectsSoundState>({ muted: false, status: 'idle', hasGesture: false });
	let experience: ReturnType<typeof createProjectsExperience> | undefined;
	let selected = $state<PortfolioProject | null>(null);
	let dialog: HTMLDialogElement;
	let returnFocus: HTMLElement | null = null;
	const getTime = () => experience?.getTime() ?? null;

	function gridReady() {
		ready = true;
		void experience?.start();
	}

	async function openProject(project: PortfolioProject) {
		returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		selected = project;
		await tick();
		dialog.showModal();
	}

	function dialogClosed() {
		selected = null;
		if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
	}

	function keepDialogFocus(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const controls = Array.from(
			dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')
		).filter((element) => element.getClientRects().length > 0);
		const first = controls[0];
		const last = controls.at(-1);
		if (!first || !last) return;
		const active = document.activeElement;
		if (event.shiftKey && (active === first || !dialog.contains(active))) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
			event.preventDefault();
			first.focus();
		}
	}

	function closeOnBackdrop(event: MouseEvent) {
		if (event.target !== dialog) return;
		const bounds = dialog.getBoundingClientRect();
		if (
			event.clientX < bounds.left ||
			event.clientX > bounds.right ||
			event.clientY < bounds.top ||
			event.clientY > bounds.bottom
		)
			dialog.close();
	}

	onMount(() => {
		const media = matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = media.matches;
		experience = createProjectsExperience({
			reducedMotion,
			onState: (state) => (sound = state)
		});
		initialized = true;
		const updateMotion = () => {
			reducedMotion = media.matches;
			experience?.setReducedMotion(media.matches);
		};
		media.addEventListener('change', updateMotion);
		return () => {
			media.removeEventListener('change', updateMotion);
			experience?.destroy();
			experience = undefined;
		};
	});
</script>

<svelte:head>
	<title>Projects — Ozerk</title>
	<meta
		name="description"
		content="Explore Ozerk’s projects, starting with Slat Graph. More projects coming soon."
	/>
</svelte:head>

<main
	class="projects-experience"
	class:ready
	class:reduced-motion={reducedMotion}
	data-experience-ready={ready}
	data-sound-status={sound.status}
>
	{#if initialized}
		<GridScan
			{getTime}
			{reducedMotion}
			onready={gridReady}
			introDuration={PROJECTS_TIMING.introDuration}
			scanDuration={PROJECTS_TIMING.scanDuration}
			scanDelay={PROJECTS_TIMING.scanDelay}
		/>
	{/if}

	<nav class="experience-nav" aria-label="Projects navigation">
		<HomeLink />
	</nav>

	<div class="projects-stage">
		<div class="center-composition">
			<header class="projects-heading">
				<p class="eyebrow">Ozerk / Projects</p>
				<h1>Projects</h1>
				<p class="intro-copy">A few things are taking shape.</p>
			</header>
			<div class="project-list" class:multiple={projects.length > 1}>
				{#each projects as project (project.id)}
					<ProjectCard {project} {reducedMotion} onopen={openProject} />
				{/each}
			</div>
		</div>
	</div>

	<p class="experience-note">More projects coming soon</p>
	<span class="sr-only" role="status"
		>{sound.status === 'blocked' || sound.status === 'unavailable'
			? 'Sound is unavailable. You can continue without it.'
			: ''}</span
	>
</main>

<dialog
	bind:this={dialog}
	class="project-dialog"
	aria-labelledby="project-detail-title"
	onclose={dialogClosed}
	onclick={closeOnBackdrop}
	onkeydown={keepDialogFocus}
>
	{#if selected}
		<div class="dialog-copy">
			<div class="dialog-topline">
				<p class="eyebrow">
					{selected.status === 'coming-soon' ? 'Coming soon' : 'Project details'}
				</p>
				<button
					type="button"
					class="close-dialog"
					aria-label="Close project details"
					onclick={() => dialog.close()}>×</button
				>
			</div>
			<h2 id="project-detail-title">{selected.title}</h2>
			<p class="description">{selected.description}</p>
			{#if selected.repoUrl || selected.demoUrl}
				<div class="project-links">
					{#if selected.repoUrl}<a
							href={selected.repoUrl}
							target="_blank"
							rel="external noopener noreferrer">Source code ↗</a
						>{/if}
					{#if selected.demoUrl}<a
							href={selected.demoUrl}
							target="_blank"
							rel="external noopener noreferrer">View project ↗</a
						>{/if}
				</div>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	.projects-experience {
		position: relative;
		isolation: isolate;
		width: 100%;
		height: 100svh;
		min-height: 360px;
		overflow: hidden;
		background: #050508;
		color: #eeedf2;
	}
	.experience-nav {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: max(26px, env(safe-area-inset-top)) 32px 20px;
		pointer-events: none;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid #eeeef3;
		outline-offset: 4px;
	}
	.projects-stage {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		place-items: center;
		overflow-y: auto;
		padding: 0 22px;
		pointer-events: none;
	}
	.center-composition {
		position: relative;
		width: min(100%, 456px);
		opacity: 0;
		transition: opacity 500ms 100ms;
	}
	.ready .center-composition {
		opacity: 1;
	}
	.projects-heading {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 100%;
		padding-bottom: 16px;
		text-align: center;
	}
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #aaa5b8;
	}
	h1 {
		margin-top: 12px;
		font-size: clamp(32px, 4vw, 44px);
		line-height: 1.15;
		letter-spacing: -0.04em;
		font-weight: 400;
	}
	.intro-copy {
		margin-top: 12px;
		font-size: 13px;
		color: #bcb7c9;
	}
	.project-list {
		pointer-events: auto;
	}
	.project-list.multiple {
		display: grid;
		gap: 0;
	}
	.experience-note {
		position: absolute;
		bottom: max(24px, env(safe-area-inset-bottom));
		left: 20px;
		right: 20px;
		z-index: 2;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.025em;
		color: #aaa5b7;
		pointer-events: none;
	}
	.project-dialog {
		width: min(440px, calc(100% - 40px));
		margin: auto;
		padding: 0;
		border: 1px solid #ffffff30;
		border-radius: 14px;
		color: #eeedf2;
		background: #111015ee;
		box-shadow: 0 24px 100px #0008;
		backdrop-filter: blur(24px);
	}
	.project-dialog::backdrop {
		background: #03030699;
		backdrop-filter: blur(5px);
	}
	.dialog-copy {
		padding: 26px 28px 30px;
	}
	.dialog-topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 22px;
	}
	.close-dialog {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border: 1px solid #ffffff20;
		border-radius: 50%;
		color: #ddd8e6;
		font-size: 23px;
		line-height: 1;
		cursor: pointer;
		transition: background 150ms;
	}
	.close-dialog:hover {
		background: #ffffff12;
	}
	.dialog-copy h2 {
		font-size: 25px;
		line-height: 1.2;
		font-weight: 400;
		letter-spacing: -0.025em;
	}
	.description {
		margin-top: 18px;
		color: #bcb7c9;
		font-size: 14px;
		line-height: 1.85;
	}
	.project-links {
		display: flex;
		gap: 20px;
		margin-top: 24px;
		font-size: 13px;
		text-decoration: underline;
		text-underline-offset: 5px;
	}
	@media (min-width: 1000px) {
		.center-composition:has(.multiple) {
			width: min(100%, 880px);
		}
		.project-list.multiple {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 480px) {
		.experience-nav {
			padding: max(18px, env(safe-area-inset-top)) 14px 16px;
		}
		.projects-stage {
			padding: 0 12px;
		}
		.intro-copy {
			font-size: 12px;
		}
	}
	@media (max-height: 580px) {
		h1 {
			font-size: 28px;
			margin-top: 7px;
		}
		.intro-copy {
			margin-top: 7px;
		}
		.projects-heading {
			padding-bottom: 8px;
		}
		.projects-heading .eyebrow {
			display: none;
		}
		.experience-note {
			bottom: 15px;
		}
		.experience-nav {
			padding-top: 12px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.center-composition {
			opacity: 1;
			transform: none;
			transition: none;
		}
		.close-dialog {
			transition: none;
		}
	}
</style>
