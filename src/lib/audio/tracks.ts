export interface MusicTrack {
	id: string;
	title: string;
	src: string;
	artist?: string;
}

/** Add real files to static/music/, then list them here. An empty list makes no music requests. */
export const tracks: MusicTrack[] = [];
