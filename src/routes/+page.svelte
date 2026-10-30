<script lang="ts">
	import { onMount } from 'svelte';
	import Background from '$lib/components/Background.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import Showcase from '$lib/components/sections/Showcase.svelte';
	import AudioControls from '$lib/components/audio/AudioControls.svelte';
	import LocationMap from '$lib/components/icons/LocationMap.svelte';
	import AvailabilityChartLine from '$lib/components/icons/AvailabilityChartLine.svelte';
	import { enterHome, leaveHome } from '$lib/audio/manager';
	import { CONTACT } from '$lib';

	let ready = $state(false);

	onMount(() => {
		enterHome();
		return () => leaveHome();
	});
</script>

<Loading oncomplete={() => (ready = true)} />
<Background />

<main class="home-main" class:ready data-home-ready={ready} inert={!ready} aria-busy={!ready}>
	<section class="home-hero" data-home-hero aria-labelledby="home-name">
		<header class="home-corners" data-home-header>
			<div class="corner-quote">
				<span class="corner-mark" aria-hidden="true">✦ ｡˚ ⋆ ☾ ⋆ ˚｡ ✦</span>
				<p>“A little space for the things I'm curious about.”</p>
			</div>
			<div class="home-audio"><AudioControls /></div>
		</header>

		<div class="home-profile" data-home-profile>
			<h1 id="home-name">Ozerk</h1>
			<div class="social-links">
				{#if CONTACT.github}
					<a
						href={CONTACT.github}
						aria-label="GitHub"
						target="_blank"
						rel="external noopener noreferrer"><i class="ri-github-fill" aria-hidden="true"></i></a
					>
				{:else}
					<span
						class="social-placeholder"
						title="GitHub link coming soon"
						aria-label="GitHub link not set"><i class="ri-github-fill" aria-hidden="true"></i></span
					>
				{/if}
				{#if CONTACT.discord}
					<a
						href={CONTACT.discord}
						aria-label="Discord"
						target="_blank"
						rel="external noopener noreferrer"><i class="ri-discord-fill" aria-hidden="true"></i></a
					>
				{:else}
					<span
						class="social-placeholder"
						title="Discord link coming soon"
						aria-label="Discord link not set"
						><i class="ri-discord-fill" aria-hidden="true"></i></span
					>
				{/if}
				{#if CONTACT.email}
					<a href={'mailto:' + CONTACT.email} aria-label="Email"
						><i class="ri-mail-line" aria-hidden="true"></i></a
					>
				{:else}
					<span
						class="social-placeholder"
						title="Email link coming soon"
						aria-label="Email link not set"><i class="ri-mail-line" aria-hidden="true"></i></span
					>
				{/if}
			</div>
			<p class="biography">
				Hello, I'm an eighteen-year-old developer who enjoys exploring different areas of
				programming.
			</p>

			<div class="profile-details">
				<button
					type="button"
					class="profile-detail icon-trigger"
					aria-label="Location: Ankara, Türkiye"
				>
					<span class="detail-label"><LocationMap /> Location</span>
					<span class="detail-value">Ankara, Türkiye</span>
				</button>
				<button
					type="button"
					class="profile-detail icon-trigger"
					aria-label="Availabilities: Open to learning and interesting opportunities"
				>
					<span class="detail-label"><AvailabilityChartLine /> Availabilities</span>
					<span class="detail-value availability-value">
						<span class="availability-indicator" aria-hidden="true"
							><span class="status-ping"></span><span class="status-dot"></span></span
						>
						Open to learning and interesting opportunities
					</span>
				</button>
			</div>
		</div>
	</section>

	<Showcase />
</main>

<style>
	.home-main {
		opacity: 0;
		transform: translateY(6px);
		filter: blur(2px);
		transition:
			opacity 500ms ease,
			transform 500ms ease,
			filter 500ms ease;
	}
	.home-main.ready {
		opacity: 1;
		transform: none;
		filter: none;
	}
	.home-hero {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 100svh;
		padding: 130px 24px;
	}
	.home-corners {
		position: absolute;
		inset: 0 0 auto;
		z-index: 2;
		pointer-events: none;
	}
	.corner-quote {
		position: absolute;
		top: 30px;
		left: 32px;
		width: 230px;
		color: rgb(255 255 255 / 62%);
		font-size: 12px;
		line-height: 1.7;
	}
	.corner-mark {
		display: block;
		margin-bottom: 8px;
		font-size: 15px;
		letter-spacing: 0.08em;
		opacity: 0.75;
	}
	.home-audio {
		position: absolute;
		top: max(24px, env(safe-area-inset-top));
		right: max(32px, env(safe-area-inset-right));
		pointer-events: auto;
	}
	.home-profile {
		width: min(100%, 560px);
		text-align: center;
	}
	h1 {
		font-size: 40px;
		line-height: 1.2;
		font-weight: 400;
		letter-spacing: -0.025em;
		text-shadow: 0 0 12px rgb(255 255 255 / 45%);
	}
	.social-links {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		margin: 18px 0 26px;
		font-size: 21px;
		line-height: 1;
	}
	.social-links a {
		opacity: 0.85;
		transition: opacity 150ms ease;
	}
	.social-links a:hover {
		opacity: 1;
	}
	.social-placeholder {
		opacity: 0.5;
	}
	.biography {
		max-width: 390px;
		margin: 0 auto;
		font-size: 16px;
		line-height: 1.75;
		color: rgb(255 255 255 / 88%);
	}
	.profile-details {
		display: grid;
		grid-template-columns: 0.85fr 1.15fr;
		gap: 22px;
		margin-top: 35px;
	}
	.profile-detail {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 5px 6px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: center;
		cursor: default;
	}
	.detail-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 13px;
		color: rgb(255 255 255 / 70%);
	}
	.detail-value {
		font-size: 18px;
		line-height: 1.45;
	}
	.availability-value {
		max-width: 275px;
	}
	.availability-indicator {
		position: relative;
		display: inline-flex;
		width: 10px;
		height: 10px;
		margin-right: 6px;
	}
	.status-ping,
	.status-dot {
		position: absolute;
		inset: 0;
		display: inline-flex;
		border-radius: 50%;
		background: #22c55e;
	}
	.status-ping {
		animation: availability-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	.social-links a:focus-visible,
	.profile-detail:focus-visible {
		outline: 2px solid #eeedf2;
		outline-offset: 6px;
	}
	@keyframes availability-ping {
		75%,
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}
	@media (max-width: 600px) {
		.home-hero {
			padding: 155px 24px;
		}
		.corner-quote {
			top: 76px;
			left: 24px;
			width: 215px;
			font-size: 11px;
		}
		.corner-mark {
			margin-bottom: 5px;
			font-size: 13px;
		}
		.home-audio {
			top: max(20px, env(safe-area-inset-top));
			right: max(20px, env(safe-area-inset-right));
		}
		.home-profile {
			max-width: 390px;
		}
		.profile-details {
			grid-template-columns: 1fr;
			gap: 19px;
			margin-top: 28px;
		}
		.biography {
			font-size: 15px;
			max-width: 340px;
		}
		h1 {
			font-size: 36px;
		}
		.detail-value {
			font-size: 17px;
		}
	}
	@media (max-height: 650px) {
		.home-hero {
			padding-top: 140px;
			padding-bottom: 140px;
		}
		.biography {
			font-size: 14px;
		}
		.social-links {
			margin-top: 14px;
			margin-bottom: 20px;
		}
		.profile-details {
			margin-top: 22px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.home-main {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}
		.status-ping {
			animation: none;
			opacity: 0;
		}
		.social-links a {
			transition: none;
		}
	}
</style>
