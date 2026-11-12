# Project preferences

- Display the build version at the bottom of the app menu, never in the page footer.
- Canonical app names live in `public/brand.js`: English `Karshvar`, Persian `کَرشوَر`. Reuse `brandName(language)` for new interface copy and these exact spellings in static content.

- Start the development server only when making application changes that need previewing or browser verification. Do not start it for ordinary questions, explanations, read-only reviews, or documentation-only edits. When needed, ensure it is running at http://localhost:5174/ so the user can preview changes. Reuse an existing server on that port; otherwise start the Vite development server and verify it responds.
- Keep the development server running while working and after completing the task. Shut it down only after the user explicitly approves stopping it.
- Treat smooth, fast motion as a core product requirement. Avoid heavy synchronous work during interactions and immediately after they end. Keep rendering on the GPU where appropriate, move expensive calculations off the main thread, and verify interaction and settling performance in the browser when changing animation or rendering behavior.

# Required checks before every push

- Before every push, run all CI validation steps on the final changes: `npm run format:check`, `npm test` (including its offline-generation pretest), and `npm run build`.
- Push only when all three checks exit successfully. A passing test suite alone is not sufficient. Fix failures and rerun affected checks before pushing.
- If a check cannot run, report the blocker and do not claim validation passed or proceed with the push.
- Equivalent direct Node commands may be used when npm is unavailable; preserve the package-script arguments and lifecycle steps. Set `PYTHON` to a working interpreter for the build when needed.
- After pushing a release to `main`, check the GitHub Actions validation and deployment result; distinguish a successful push from a successful deployment.
