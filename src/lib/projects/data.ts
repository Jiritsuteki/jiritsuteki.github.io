import { base } from '$app/paths';

export type PortfolioProject = {
	id: string;
	title: string;
	subtitle: string;
	status: 'coming-soon' | 'published';
	description: string;
	image?: { src: string; alt: string };
	repoUrl?: string;
	demoUrl?: string;
};

// Add only projects and details you are ready to share.
export const projects: PortfolioProject[] = [
	{
		id: 'slat-graph',
		title: 'Slat Graph',
		subtitle: 'Explore this project',
		status: 'published',
		description: 'Explore Slat Graph.',
		demoUrl: `${base}/demos/slat-graph/index.html`
	}
];
