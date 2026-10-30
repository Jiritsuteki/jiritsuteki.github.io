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
	<path d="M3 3v16a2 2 0 0 0 2 2h16" />
	<path class="chart-line" pathLength="1" d="m7 13 3-3 4 4 5-5" />
</svg>

<style>
	svg {
		flex: 0 0 auto;
	}
	.chart-line {
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
	}
	:global(.icon-trigger:is(:hover, :focus)) .chart-line {
		animation: draw 300ms 150ms ease both;
	}
	@keyframes draw {
		from {
			stroke-dashoffset: 1;
			opacity: 0;
		}
		to {
			stroke-dashoffset: 0;
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.icon-trigger:is(:hover, :focus)) .chart-line {
			animation: none;
		}
	}
</style>
