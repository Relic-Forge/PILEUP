# Known Issues

- Phase 3 intentionally uses graybox placeholder room layers, player shape, props, and enemy markers. Production art import remains deferred.
- Phase 3 exposes a dev-only `?scene=level` shortcut and debug telemetry for browser QA. This should stay development-only and can be removed once automated smoke tests exist.
- In-app Browser screenshot capture timed out late in Phase 3 QA after initial screenshots succeeded. Console checks still passed, and `npm run typecheck` / `npm run build` passed.
- The production bundle currently triggers Vite's default chunk-size warning because Phaser ships as a large dependency. This is acceptable for early phases and should be revisited during hardening/code-splitting work.
