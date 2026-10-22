# Welcome to Your New Wails3 Project!

Congratulations on generating your Wails3 application! This README will guide you through the next steps to get your project up and running.

## Getting Started

1. Navigate to your project directory in the terminal.

2. To run your application in development mode, use the following command:

   ```
   wails3 dev
   ```

   This will start your application and enable hot-reloading for both frontend and backend changes.

3. To build your application for production, use:

   ```
   wails3 build
   ```

   This will create a production-ready executable in the `build` directory.

## Windows Builds

With Go, Node.js, and the Wails CLI version specified in the release workflow installed, build either Windows architecture:

```sh
wails3 task windows:build PRODUCTION=true ARCH=amd64 OUTPUT=bin/dpanel-desktop-amd64.exe
wails3 task windows:build PRODUCTION=true ARCH=arm64 OUTPUT=bin/dpanel-desktop-arm64.exe
```

These commands directly produce `bin/dpanel-desktop-amd64.exe` and `bin/dpanel-desktop-arm64.exe`, without a rename step. When `OUTPUT` is omitted, the build writes `bin/dpanel-desktop.exe`. To create an NSIS installer on Windows, install NSIS, place the required binaries in `build/windows/resource`, then run:

```sh
wails3 task windows:create:nsis:installer ARCH=arm64
```

The resource directory must contain `docker.exe`, `docker-compose.exe`, and `dpanel.exe`, all matching the target Windows architecture. The DPanel binary must also match the target edition and release version. The installer task builds the GUI for the selected architecture and writes `bin/dpanel-desktop-arm64-installer.exe`. Use `ARCH=amd64` for an amd64 installer.

The release workflow publishes both architectures to the GUI and `donknap/dpanel` GitHub Releases:

- Desktop binaries: `dpanel-desktop-amd64.exe` and `dpanel-desktop-arm64.exe`. Packaging downloads the matching asset as `dpanel-desktop.exe` so the executable name inside each package remains unchanged.
- CE/PE installers: `dpanel-desktop-{ce|pe}-{amd64|arm64}-installer.exe`.
- CE/PE portable packages: `dpanel-desktop-{ce|pe}-{amd64|arm64}-portable.zip`.

Both installers and portable packages bundle Docker and Compose tools matching the target architecture from the `DPanel-dev/actions` `build-toolchain` Release. A failed tool download stops packaging; there is no fallback to another architecture. ARM64 packages contain native ARM64 GUI, DPanel, Docker, and Compose binaries; actual operation must still be verified on a Windows ARM64 device. ARM64 Windows packages are not added to COS or Scoop.

## Exploring Wails3 Features

Now that you have your project set up, it's time to explore the features that Wails3 offers:

1. **Check out the examples**: The best way to learn is by example. Visit the `examples` directory in the `v3/examples` directory to see various sample applications.

2. **Run an example**: To run any of the examples, navigate to the example's directory and use:

   ```
   go run .
   ```

   Note: Some examples may be under development during the alpha phase.

3. **Explore the documentation**: Visit the [Wails3 documentation](https://v3.wails.io/) for in-depth guides and API references.

4. **Join the community**: Have questions or want to share your progress? Join the [Wails Discord](https://discord.gg/JDdSxwjhGf) or visit the [Wails discussions on GitHub](https://github.com/wailsapp/wails/discussions).

## Project Structure

Take a moment to familiarize yourself with your project structure:

- `frontend/`: Contains your frontend code (HTML, CSS, JavaScript/TypeScript)
- `main.go`: The entry point of your Go backend
- `app.go`: Define your application structure and methods here
- `wails.json`: Configuration file for your Wails project

## Next Steps

1. Modify the frontend in the `frontend/` directory to create your desired UI.
2. Add backend functionality in `main.go`.
3. Use `wails3 dev` to see your changes in real-time.
4. When ready, build your application with `wails3 build`.

Happy coding with Wails3! If you encounter any issues or have questions, don't hesitate to consult the documentation or reach out to the Wails community.
