# Opening audio: verified diagnosis

28 October 2026. Scope: Treasure opening cue only.

## Observed in the actual Codex in-app browser

Fresh tab at `http://127.0.0.1:4180/`, with no click before the opening cue:

- document hidden: false
- muted: false
- volume: 35
- opening cue called native HTMLAudioElement.play()
- permission state after that call: blocked
- exact rejected promise:

> NotAllowedError: play() failed because the user didn't interact with the document first. https://goo.gl/xX8pDD

This confirms an autoplay rejection in this browser, rather than assuming it from silence. The current site does not satisfy the requested no-click audible opening in that environment. Do not report it fixed on the basis of mocked AudioContext tests or an enabled speaker icon.

The error is retained in the audio store's optional `openingError` and the control's `data-opening-error` attribute. No unrelated page feature was changed during this investigation.

Current playback remains tied to Loading.finish()/page reveal. Native Treasure is preloaded, uses shared mute/volume, stops on navigation, and is not retried late on arbitrary clicks. Browser settings have not been changed or bypassed.

Next step needs an autoplay-permitted browser/host configuration, or an explicitly accepted user-gesture entry. The website cannot grant itself autoplay permission.

Primary reference: https://developer.chrome.com/blog/autoplay/

## 30 October audit follow-up

The audio manager's runtime logic was not changed during the source audit (its TypeScript AST matched the pre-audit file). In the separate Google Chrome static-hosting smoke test, a fresh home load without a prior click returned `permission: allowed`, with an empty opening error, both at `/` and `/Ozerk-Portfolio`. Actual MP3 decoding also succeeded. This does not override the earlier in-app browser rejection or prove audible playback on the user's device. No autoplay restrictions or browser settings were bypassed. See `KAYNAK_DENETIMI.md` for the current audit.
