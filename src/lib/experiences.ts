export interface PortfolioExperience {
	id: string;
	company: string;
	role: string;
	duration: string;
	description: string;
}

// Future experiences go here; the LinkedIn region follows the entire list.
export const experiences: PortfolioExperience[] = [
	{
		id: 'halkbank-internship',
		company: 'Halkbank',
		role: 'Internship',
		duration: '3 months',
		description:
			'Completed a three-month internship, gaining experience in software development and basic banking operations.'
	}
];
