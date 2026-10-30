/** Stable Projects API; the persistent AudioManager now owns every sound. */
export { PROJECTS_TIMING, type ProjectsSoundState } from '$lib/audio/manager';
import { armProjectsEntry, createProjectsTimeline, preloadSfx } from '$lib/audio/manager';

export const preloadProjectsAudio = () => preloadSfx('braam');
export const prepareProjectsEntry = armProjectsEntry;
export const createProjectsExperience = createProjectsTimeline;
