<svg
	width="18"
	height="18"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path
		class="letter"
		pathLength="1"
		d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
	/>
	<rect class="stem" pathLength="1" width="4" height="12" x="2" y="9" />
	<circle class="dot" pathLength="1" cx="4" cy="4" r="2" />
</svg>

<style>
	svg {
		flex: 0 0 auto;
		transform-origin: center;
	}
	path,
	rect,
	circle {
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
	}
	:global(.icon-trigger:is(:hover, :focus)) svg {
		animation: pulse 600ms ease both;
	}
	:global(.icon-trigger:is(:hover, :focus)) .letter {
		animation: draw 550ms ease both;
	}
	:global(.icon-trigger:is(:hover, :focus)) .stem {
		animation: draw 450ms 80ms ease both;
	}
	:global(.icon-trigger:is(:hover, :focus)) .dot {
		animation: draw 450ms 140ms ease both;
	}
	@keyframes draw {
		from {
			stroke-dashoffset: 1;
			opacity: 0.15;
		}
		to {
			stroke-dashoffset: 0;
			opacity: 1;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.08);
		}
		70% {
			transform: scale(0.97);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.icon-trigger:is(:hover, :focus)) svg,
		:global(.icon-trigger:is(:hover, :focus)) path,
		:global(.icon-trigger:is(:hover, :focus)) rect,
		:global(.icon-trigger:is(:hover, :focus)) circle {
			animation: none;
		}
	}
</style>
