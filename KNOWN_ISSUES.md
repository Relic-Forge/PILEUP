# Known Issues

- The current prototype intentionally uses graybox placeholder room layers, player shape, props, and enemy markers. Production art import remains deferred.
- Public QA on a 1080p monitor exposed an oversized dark band on the left side of the playfield. Current evidence points to the screen-space darkness/vignette overlay and camera-at-world-edge composition in `DarknessSystem`, not a GitHub Pages layout issue.
- Public QA also exposed a large FPS jump when the flashlight battery dies: the game can run around 30 FPS while the flashlight/darkness reveal path is active, then jump to the monitor refresh rate once the light stops rendering. Current evidence points to the per-frame flashlight reveal stamps, render texture erase pass, beam haze, and vignette work in `DarknessSystem`.
- The prototype exposes a dev-only `?scene=level` shortcut plus seed/debug telemetry for browser QA. This should stay development-only and can be removed once automated smoke tests exist.
- In-app Browser screenshot capture can occasionally time out during QA after successful page verification. Console checks still passed, and `npm run typecheck` / `npm run build` passed.
- The production bundle currently triggers Vite's default chunk-size warning because Phaser ships as a large dependency. This is acceptable for early phases and should be revisited during hardening/code-splitting work.
