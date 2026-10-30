const SESSION_KEY = 'ozerk.home-intro.v3';
let introSeen = false;

/** Shared with navigation so a Projects → Home return never replays the loader. */
export function skipHomeIntro() {
	introSeen = true;
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(SESSION_KEY, '1');
	} catch {
		// The module flag also covers storage-disabled browser sessions.
	}
}

export function claimHomeIntro(): boolean {
	if (introSeen) return false;
	if (typeof window !== 'undefined') {
		try {
			if (window.sessionStorage.getItem(SESSION_KEY) === '1') {
				introSeen = true;
				return false;
			}
		} catch {
			// Session storage may be unavailable in private/restricted contexts.
		}
	}
	skipHomeIntro();
	return true;
}
