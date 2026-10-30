type Destination = 'home' | 'projects';
let cue: { destination: Destination; at: number } | null = null;

// Keep real-click audio activation ahead of the asynchronous route transition.
export function markNavigationCue(destination: Destination) {
	cue = { destination, at: performance.now() };
}

export function consumeNavigationCue(destination: Destination) {
	const prepared = cue?.destination === destination && performance.now() - cue.at < 3000;
	cue = null;
	return prepared;
}
