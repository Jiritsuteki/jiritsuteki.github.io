import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	workers: 1,
	timeout: 45_000,
	expect: { timeout: 10_000 },
	reporter: [['list'], ['html', { open: 'never' }]],
	outputDir: '.test-results',
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4178',
		channel: 'chrome',
		viewport: { width: 1440, height: 900 },
		launchOptions: { args: ['--enable-unsafe-swiftshader'] },
		trace: 'retain-on-failure'
	},
	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
				url: 'http://127.0.0.1:4178',
				reuseExistingServer: !process.env.CI,
				timeout: 60_000
			}
});
