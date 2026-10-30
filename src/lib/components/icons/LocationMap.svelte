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
		class="map-outline"
		pathLength="1"
		d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
	/>
	<path class="fold first" pathLength="1" d="M15 5.764v15" />
	<path class="fold second" pathLength="1" d="M9 3.236v15" />
</svg>

<style>
	svg {
		flex: 0 0 auto;
		transform-origin: center;
	}
	path {
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
	}
	:global(.icon-trigger:is(:hover, :focus)) svg {
		animation: map-fold 650ms ease both;
	}
	:global(.icon-trigger:is(:hover, :focus)) .map-outline {
		animation: draw 550ms ease both;
	}
	:global(.icon-trigger:is(:hover, :focus)) .first {
		animation: draw 420ms 130ms ease both;
	}
	:global(.icon-trigger:is(:hover, :focus)) .second {
		animation: draw 420ms 220ms ease both;
	}
	@keyframes draw {
		from {
			stroke-dashoffset: 1;
			opacity: 0.2;
		}
		to {
			stroke-dashoffset: 0;
			opacity: 1;
		}
	}
	@keyframes map-fold {
		0%,
		100% {
			transform: scaleX(1);
		}
		35% {
			transform: scaleX(0.91);
		}
		70% {
			transform: scaleX(1.035);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.icon-trigger:is(:hover, :focus)) svg,
		:global(.icon-trigger:is(:hover, :focus)) path {
			animation: none;
		}
	}
</style>
