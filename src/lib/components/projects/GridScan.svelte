<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createGridScan,
		type GridScanController,
		type GridStatus
	} from '$lib/projects/grid-scan';

	interface Props {
		getTime: () => number | null;
		reducedMotion?: boolean;
		introDuration?: number;
		scanDuration?: number;
		scanDelay?: number;
		onready?: (available: boolean) => void;
	}

	let {
		getTime,
		reducedMotion = false,
		introDuration = 4,
		scanDuration = 4.8,
		scanDelay = 2,
		onready
	}: Props = $props();
	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let status = $state<GridStatus>('fallback');
	let controller: GridScanController | null = null;

	$effect(() => {
		const reduced = reducedMotion;
		controller?.setReducedMotion(reduced);
	});

	onMount(() => {
		controller = createGridScan(canvas, container, {
			getTime: () => getTime(),
			reducedMotion,
			introDuration,
			scanDuration,
			scanDelay,
			onstatus: (value) => (status = value)
		});
		onready?.(controller !== null);
		return () => {
			controller?.dispose();
			controller = null;
		};
	});
</script>

<div
	class="grid-scan"
	class:fallback={status === 'fallback'}
	bind:this={container}
	data-grid-status={status}
	aria-hidden="true"
>
	<div class="static-tunnel">
		{#each [0, 1, 2, 3, 4, 5] as ring (ring)}
			<span style={`--ring: ${ring}`}></span>
		{/each}
	</div>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
	.grid-scan {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		background: #050506;
	}

	canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
	}

	.static-tunnel {
		position: absolute;
		inset: 0;
		display: none;
		background: radial-gradient(ellipse at center, #050506 10%, #0d0c10 85%);
	}

	.static-tunnel span {
		position: absolute;
		inset: calc(var(--ring) * 6%);
		border: 1px solid #4d4757;
		opacity: calc(0.5 - var(--ring) * 0.065);
	}

	.fallback .static-tunnel {
		display: block;
	}

	.fallback canvas {
		visibility: hidden;
	}
</style>
