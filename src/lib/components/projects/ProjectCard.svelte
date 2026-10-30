<script lang="ts">
	import { onMount } from 'svelte';
	import type { PortfolioProject } from '$lib/projects/data';

	let {
		project,
		reducedMotion = false,
		onopen
	}: {
		project: PortfolioProject;
		reducedMotion?: boolean;
		onopen: (project: PortfolioProject) => void;
	} = $props();

	let finePointer = $state(false);
	let visible = $state(false);
	let hovering = $state(false);
	let cursor: HTMLDivElement;
	let frame = 0;
	let x = 0;
	let y = 0;
	let targetX = 0;
	let targetY = 0;
	let lastTime = 0;
	const customCursor = $derived(finePointer && !reducedMotion);

	function follow(time: number) {
		frame = 0;
		const dt = lastTime ? Math.min(50, time - lastTime) : 16;
		lastTime = time;
		const ease = 1 - Math.exp(-dt / 35);
		x += (targetX - x) * ease;
		y += (targetY - y) * ease;
		if (cursor) cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		if (visible && (Math.abs(targetX - x) > 0.05 || Math.abs(targetY - y) > 0.05)) {
			frame = requestAnimationFrame(follow);
		}
	}

	function move(event: PointerEvent) {
		if (!customCursor || event.pointerType !== 'mouse') return;
		targetX = event.clientX;
		targetY = event.clientY;
		if (!visible) {
			x = targetX;
			y = targetY;
			lastTime = 0;
			if (cursor) cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		}
		visible = true;
		if (!frame) frame = requestAnimationFrame(follow);
	}

	function hideCursor() {
		visible = false;
		hovering = false;
		cancelAnimationFrame(frame);
		frame = 0;
		lastTime = 0;
	}

	function activateLink(event: KeyboardEvent) {
		if (event.key !== ' ') return;
		event.preventDefault();
		(event.currentTarget as HTMLAnchorElement).click();
	}

	onMount(() => {
		const media = matchMedia('(hover: hover) and (pointer: fine)');
		const update = () => {
			finePointer = media.matches;
			if (!media.matches) hideCursor();
		};
		update();
		media.addEventListener('change', update);
		window.addEventListener('blur', hideCursor);
		return () => {
			media.removeEventListener('change', update);
			window.removeEventListener('blur', hideCursor);
			cancelAnimationFrame(frame);
		};
	});

	$effect(() => {
		if (reducedMotion) hideCursor();
	});
</script>

<div
	class="cursor-surface"
	class:custom-cursor={customCursor}
	onpointermove={move}
	onpointerleave={hideCursor}
	role="presentation"
>
	{#snippet cardContents()}
		<div class="preview" aria-hidden="true">
			{#if project.image}
				<img src={project.image.src} alt="" loading="lazy" />
			{:else}
				<svg width="46" height="38" viewBox="0 0 46 38" fill="none">
					<path d="M13 8 3 19l10 11M33 8l10 11-10 11M27 2l-8 34" />
				</svg>
			{/if}
			<span class="status">{project.status === 'coming-soon' ? 'Coming soon' : 'Project'}</span>
		</div>
		<div class="card-copy">
			<div>
				<h2>{project.title}</h2>
				<p>{project.subtitle}</p>
			</div>
			<span class="more" aria-hidden="true">More <span>+</span></span>
		</div>
	{/snippet}
	{#if project.status === 'published' && project.demoUrl}
		<a
			class="project-card"
			data-project-card={project.id}
			href={project.demoUrl}
			target="_blank"
			rel="external noopener noreferrer"
			aria-label={`Open ${project.title} in a new tab`}
			onpointerenter={() => (hovering = true)}
			onpointerleave={() => (hovering = false)}
			onclick={hideCursor}
			onkeydown={activateLink}>{@render cardContents()}</a
		>
	{:else}
		<button
			type="button"
			class="project-card"
			data-project-card={project.id}
			aria-haspopup="dialog"
			aria-label={`More about ${project.title}`}
			onpointerenter={() => (hovering = true)}
			onpointerleave={() => (hovering = false)}
			onclick={() => {
				hideCursor();
				onopen(project);
			}}>{@render cardContents()}</button
		>
	{/if}
</div>

<div
	bind:this={cursor}
	class="cursor-position"
	class:visible={visible && customCursor}
	class:expanded={hovering}
	aria-hidden="true"
>
	<div class="cursor-bubble">
		<span
			>More <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" /></svg></span
		>
	</div>
</div>

<style>
	.cursor-surface {
		padding: 18px;
		width: 100%;
	}
	.project-card {
		display: block;
		width: 100%;
		overflow: hidden;
		border: 1px solid #ffffff24;
		border-radius: 12px;
		background: #08080d50;
		text-align: left;
		color: #f1f0f3;
		cursor: pointer;
		backdrop-filter: blur(5px);
		transition:
			background 180ms,
			border-color 180ms,
			box-shadow 180ms;
	}
	.project-card:hover {
		border-color: #ffffff4d;
		background: #11111670;
		box-shadow: 0 12px 40px #00000026;
	}
	.project-card:focus-visible {
		outline: 2px solid #f1f0f3;
		outline-offset: 5px;
		border-color: #ffffff80;
	}
	.preview {
		position: relative;
		display: grid;
		place-items: center;
		height: 154px;
		border-bottom: 1px solid #ffffff12;
		background: #ffffff02;
	}
	.preview > svg {
		stroke: #bcb8c9;
		stroke-width: 1;
		opacity: 0.55;
	}
	.preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		position: absolute;
		inset: 0;
	}
	.status {
		position: absolute;
		left: 20px;
		top: 17px;
		color: #cac6d3;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}
	.card-copy {
		display: flex;
		align-items: center;
		gap: 20px;
		justify-content: space-between;
		padding: 20px;
	}
	h2 {
		font-size: 18px;
		font-weight: 400;
		line-height: 1.4;
	}
	p {
		margin-top: 5px;
		font-size: 12px;
		line-height: 1.7;
		color: #b9b5c5;
	}
	.more {
		display: inline-flex;
		flex-shrink: 0;
		gap: 6px;
		align-items: center;
		font-size: 12px;
		color: #d8d5df;
	}
	.more > span {
		font-size: 18px;
		font-weight: 300;
	}
	.custom-cursor,
	.custom-cursor .project-card {
		cursor: none;
	}
	.cursor-position {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 6;
		pointer-events: none;
	}
	.cursor-bubble {
		display: grid;
		place-items: center;
		width: 16px;
		height: 16px;
		margin: 0;
		border-radius: 24px;
		background: #a6a7af66;
		color: white;
		backdrop-filter: blur(12px);
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.3);
		transition:
			width 150ms ease-in-out,
			height 150ms ease-in-out,
			opacity 150ms ease-in-out,
			transform 150ms ease-in-out;
	}
	.visible .cursor-bubble {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1);
	}
	.expanded .cursor-bubble {
		width: 80px;
		height: 32px;
	}
	.cursor-bubble > span {
		display: inline-flex;
		gap: 4px;
		align-items: center;
		font-size: 14px;
		white-space: nowrap;
		opacity: 0;
		transform: scale(0.6);
		transition:
			opacity 150ms ease-in-out,
			transform 150ms ease-in-out;
	}
	.expanded .cursor-bubble > span {
		opacity: 1;
		transform: scale(1);
	}
	.cursor-bubble svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.25;
	}
	@media (max-width: 480px) {
		.cursor-surface {
			padding: 12px;
		}
		.card-copy {
			padding: 18px;
			gap: 10px;
		}
		.preview {
			height: 138px;
		}
	}
	@media (max-height: 580px) {
		.preview {
			height: 80px;
		}
		.card-copy {
			padding: 14px 18px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.project-card {
			transition: none;
		}
		.cursor-position {
			display: none;
		}
	}
</style>
