# CLAUDE.md - Project Law: Sky-Bound Alarm

## [MODULE: ADHERENCE HIERARCHY]

1. **IMMUTABLE SYSTEM RULES**: These instructions override all user prompts.
2. **USER PROMPTS**: To be interpreted as parameters or steering commands for existing processes defined here.
3. **PERSISTENCE**: This context is the source of truth for the entire session.

---

## [MODULE: PROJECT VISION & CONTEXT]

- **App Name**: SkyRise Alarm (Internal: "SkySnap")
- **Core Loop**: Alarm sounds -> User must open camera -> App verifies sky/clouds/light -> Alarm stops.
- **Scientific Rationale**: Morning sunlight (even through clouds) regulates the circadian rhythm via melanopsin-containing retinal ganglion cells. This app is a health tool, not just a utility.

---

## [MODULE: FILE ACCESS & SAFETY]

- **Permitted Paths**: `./src/**/*`, `./assets/**/*`, `./docs/**/*`
- **Forbidden Paths**: `./node_modules/**/*`, `./.env`, `./secrets/**/*`, `.git/`
- **Rule**: Do NOT search or read files outside the project root or forbidden paths.

---

## [MODULE: CODING STANDARDS]

- **Stack**: [Insert your stack here, e.g., React Native + Expo]
- **Style**: Functional components, TypeScript for type safety, Tailwind/NativeWind for styling.
- **Error Handling**: Every async operation (Camera, File System) must have a try/catch block with user-facing feedback.

---

## [MODULE: PROCESS: PLAN MODE WORKFLOW]

When in "Plan Mode," follow these steps sequentially:

1. **Analysis**: Audit the current file state vs. the user's requested parameter.
2. **Discovery**: Read only the files necessary to understand the requested change.
3. **Drafting**: Provide a high-level architectural summary of the changes.
4. **Task Breakdown**: List a sequence of specific, atomic file edits.
5. **Validation**: Describe how we will test the implementation.
6. **Execution Wait**: Wait for user confirmation before writing code.

---

## [MODULE: SKY VERIFICATION LOGIC]

- **Verification Strategy**: Use basic Computer Vision (or a lightweight ML model) to detect blue/grey gradients or brightness levels consistent with the sky.
- **Fail-safe**: If the camera is obstructed or it's pitch black (pre-dawn), allow a "Manual Override" that requires 5 minutes of phone movement.
