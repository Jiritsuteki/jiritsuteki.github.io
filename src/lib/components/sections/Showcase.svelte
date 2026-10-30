<script lang="ts">
	import { motion } from '@humanspeak/svelte-motion';
	import { CONTACT } from '$lib';
	import { experiences } from '$lib/experiences';
	import Section from './Section.svelte';
	import ProjectsLink from '$lib/components/projects/ProjectsLink.svelte';
	import LinkedIn from '$lib/components/icons/LinkedIn.svelte';
</script>

<Section class="-mt-20 lg:-mt-24">
	<div class="showcase-stack">
		<motion.div
			initial={{ opacity: 0, y: 28 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.4 }}
			transition={{ duration: 0.6 }}
		>
			<h2 class="mb-8 text-3xl">Projects</h2>
			<div
				class="flex min-h-64 flex-col justify-center rounded-2xl border-2 border-neutral-600/25 p-8 sm:p-12"
			>
				<h3 class="mb-3 text-3xl text-shadow-[0_0_12px]">Slat Graph</h3>
				<p class="max-w-xl text-lg opacity-60">Explore this project.</p>
				<p class="mt-6 font-mono text-sm opacity-40">// more projects coming soon</p>
				<ProjectsLink />
			</div>
		</motion.div>

		<motion.div
			initial={{ opacity: 0, y: 28 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.5 }}
			transition={{ duration: 0.6 }}
		>
			<h2 class="mb-8 text-3xl" id="experiences-title">Experiences</h2>
			<ul class="experience-list" data-experience-list aria-labelledby="experiences-title">
				{#each experiences as experience (experience.id)}
					<li class="experience-item" data-experience-id={experience.id}>
						<span class="timeline-line" aria-hidden="true"></span>
						<span class="timeline-dot" aria-hidden="true"></span>
						<p class="experience-role">
							<span>{experience.role}</span><span aria-hidden="true"> · </span><span
								>{experience.duration}</span
							>
						</p>
						<h3>{experience.company}</h3>
						<p class="experience-description">{experience.description}</p>
					</li>
				{/each}
			</ul>
		</motion.div>

		<div class="linkedin-region" data-linkedin-region>
			{#if CONTACT.linkedin}
				<a
					href={CONTACT.linkedin}
					target="_blank"
					rel="external noopener noreferrer"
					class="linkedin-link icon-trigger"
				>
					<LinkedIn /><span>LinkedIn</span><span aria-hidden="true">↗</span>
				</a>
			{:else}
				<button
					type="button"
					class="linkedin-link icon-trigger unavailable"
					aria-disabled="true"
					aria-describedby="linkedin-status"
					title="LinkedIn profile coming soon"
				>
					<LinkedIn /><span>LinkedIn</span><span aria-hidden="true">↗</span>
				</button>
				<span class="sr-only" id="linkedin-status"
					>The LinkedIn profile link has not been added yet.</span
				>
			{/if}
		</div>
	</div>
</Section>

<style>
	.showcase-stack {
		display: flex;
		flex-direction: column;
		gap: 96px;
	}
	.experience-list {
		width: min(100%, 530px);
	}
	.experience-item {
		position: relative;
		padding: 0 0 32px 32px;
	}
	.timeline-line {
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 100%;
		background: #262626;
	}
	.timeline-dot {
		position: absolute;
		top: 4px;
		left: -6px;
		width: 12px;
		height: 12px;
		border: 2px solid #262626;
		border-radius: 50%;
		background: #000;
	}
	.experience-role {
		margin-bottom: 8px;
		font-size: 14px;
		color: rgb(255 255 255 / 60%);
	}
	.experience-item h3 {
		margin-bottom: 10px;
		font-size: 24px;
		line-height: 1.3;
	}
	.experience-description {
		font-size: 17px;
		line-height: 1.7;
		color: rgb(255 255 255 / 60%);
	}
	.linkedin-region {
		display: flex;
		justify-content: flex-start;
		margin-top: -32px;
	}
	.linkedin-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 10px 17px;
		border: 1px solid rgb(255 255 255 / 22%);
		border-radius: 8px;
		background: rgb(8 8 11 / 24%);
		color: rgb(255 255 255 / 80%);
		font-size: 14px;
		line-height: 1.3;
		cursor: pointer;
		transition:
			border-color 180ms ease,
			background 180ms ease,
			color 180ms ease;
	}
	.linkedin-link:hover {
		border-color: rgb(255 255 255 / 45%);
		background: rgb(255 255 255 / 5%);
		color: #fff;
	}
	.linkedin-link:focus-visible {
		outline: 2px solid #eeedf2;
		outline-offset: 5px;
	}
	.unavailable {
		opacity: 0.65;
		cursor: default;
	}
	@media (max-width: 600px) {
		.showcase-stack {
			gap: 76px;
		}
		.experience-description {
			font-size: 16px;
		}
		.linkedin-region {
			margin-top: -20px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.linkedin-link {
			transition: none;
		}
	}
</style>
