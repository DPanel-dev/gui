# Repository Guidelines

## Purpose and Layout

This Wails 3 GUI targets Windows and macOS. It configures and runs DPanel, displays its logs, and can manage other command-line programs listed in `setting.json`. `main.go` starts the app. `services/setting/` reads and saves configuration; `services/process/` starts programs and streams their output. The React/TypeScript interface lives in `frontend/src/`, assets in `frontend/src/assets/`, and generated Wails code in `frontend/bindings/`. Platform build and packaging tasks live in `build/`.

## Configuration and Runtime Rules

Place `Apps` and `System` at the root of `setting.json`. Each app's `RunOption.AutoLaunch` starts that CLI program when the GUI starts, independently of which console page is open. The GUI has no operating-system login startup feature. Run commands are executable names plus arguments, not shell scripts; pipes and redirects are unsupported. Resolve relative executables against the app's `WorkDir`; look up bare names using the child process's `PATH`. Build each child environment from the parent environment, then apply DPanel directory variables and app overrides without changing the GUI process environment. Avoid logging environment values, which may contain secrets. Retain logs after exit and make stop operations safe to repeat.

## Build and Development

- `wails3 dev`: run the desktop app with frontend hot reload.
- `wails3 build`: build the GUI for the current platform.
- `cd frontend && npm ci && npm run build`: install locked dependencies, type-check, and bundle the UI.
- `go test ./...` and `go vet ./...`: test and check the Go code.

For local macOS development, build `../dpanel/runtime/DPanel` in the sibling project first; `darwin:run` copies that existing binary into the development app. macOS release packaging takes a matching architecture DPanel binary downloaded from the `donknap/dpanel` GitHub Release. Do not build or edit the sibling project as part of GUI packaging. Regenerate bindings with `wails3 generate bindings -i -ts` after changing exposed Go APIs.

## Style, Tests, and Reviews

Use `gofmt` and idiomatic Go names. Follow neighboring TypeScript style: two-space indentation, PascalCase components, and camelCase functions. Put all test code under the repository-root `tests/` directory, including Go `*_test.go` files. Test exported behavior through package APIs so `go test ./...` discovers and runs the tests from that directory. Use portable fixtures instead of developer-specific executable paths. Recent commits favor short imperative subjects, sometimes prefixed `feat:`. Pull requests should describe behavior and Windows/macOS impact, list checks run, link relevant issues, and include screenshots for UI changes.
