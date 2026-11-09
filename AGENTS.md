# Project preferences

- Start the development server only when making application changes that need previewing or browser verification. Do not start it for ordinary questions, explanations, read-only reviews, or documentation-only edits. When needed, ensure it is running at http://localhost:5174/ so the user can preview changes. Reuse an existing server on that port; otherwise start the Vite development server and verify it responds.
- Keep the development server running while working and after completing the task. Shut it down only after the user explicitly approves stopping it.
- Treat smooth, fast motion as a core product requirement. Avoid heavy synchronous work during interactions and immediately after they end. Keep rendering on the GPU where appropriate, move expensive calculations off the main thread, and verify interaction and settling performance in the browser when changing animation or rendering behavior.
