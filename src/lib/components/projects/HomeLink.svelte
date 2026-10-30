<script lang="ts">
	import { resolve } from '$app/paths';
	import { prepareHomeReturn } from '$lib/audio/manager';
	import { skipHomeIntro } from '$lib/home-entry';
	import { markNavigationCue } from '$lib/navigation';
	let pending = false;

	function returnHome(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		if (pending) {
			event.preventDefault();
			return;
		}
		pending = true;
		skipHomeIntro();
		markNavigationCue('home');
		prepareHomeReturn();
	}
</script>

<a class="home-link" href={resolve('/')} onclick={returnHome}
	><span aria-hidden="true">←</span> Home</a
>

<style>
	.home-link {
		pointer-events: auto;
	}
	.home-link {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 8px 10px;
		border: 1px solid transparent;
		border-radius: 6px;
		color: #d0cdd9;
		font-size: 12px;
		transition:
			color 180ms,
			border-color 180ms,
			background 180ms;
	}
	.home-link:hover {
		color: white;
		border-color: #ffffff24;
		background: #11111660;
	}
	.home-link:focus-visible {
		outline: 2px solid #eeeef3;
		outline-offset: 4px;
	}
	span {
		font-size: 18px;
		line-height: 1;
	}
	@media (prefers-reduced-motion: reduce) {
		.home-link {
			transition: none;
		}
	}
</style>
