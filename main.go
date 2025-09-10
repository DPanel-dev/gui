package main

import (
	"context"
	"embed"
	"fmt"
	"github.com/wailsapp/wails/v3/pkg/events"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/donknap/dpanel-gui/services/process"
	"github.com/donknap/dpanel-gui/services/setting"
	"github.com/wailsapp/wails/v3/pkg/application"
	log2 "github.com/wailsapp/wails/v3/pkg/services/log"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {
	slog.SetDefault(application.DefaultLogger(slog.LevelDebug))

	exePath, err := os.Executable()
	if err != nil {
		panic(err)
	}
	workDir := filepath.Dir(exePath)
	_ = os.Setenv("DP_WORK_DIR", workDir)

	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	app := application.New(application.Options{
		Name:        "dpanel-desktop",
		Description: "A service manager that runs the DPanel cli program",
		Services: []application.Service{
			application.NewService(log2.New()),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	settingService := setting.New(&setting.Config{
		WorkDir: workDir,
	})
	app.RegisterService(application.NewService(settingService))

	processService := process.New(&process.Config{
		App:     app,
		WorkDir: workDir,
		StartupHandler: func(ctx context.Context, self *process.ProcessService) {
			if v := settingService.GetAll(); v.Apps != nil {
				for _, item := range v.Apps {
					if item.RunOption.AutoLaunch {
						go self.Run(item.Name, item.RunOption)
					}
				}
			}
		},
	})
	app.RegisterService(application.NewService(processService))

	if runtime.GOOS == "windows" {
		notificationService := notifications.New()
		app.RegisterService(application.NewService(notificationService))
	}

	// Create a new window with the necessary options.
	// 'Title' is the title of the window.
	// 'Mac' options tailor the window when running on macOS.
	// 'BackgroundColour' is the background colour of the window.
	// 'URL' is the URL that will be loaded into the webview.
	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:      "main",
		Title:     "DPanel Desktop",
		Width:     1200,
		Height:    800,
		MinWidth:  600,
		MinHeight: 600,
		Windows:   application.WindowsWindow{},
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropLiquidGlass,
			TitleBar:                application.MacTitleBarDefault,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
		X:                2000,
		Y:                10,
	})

	// Create a goroutine that emits an event containing the current time every second.
	// The frontend can listen to this event and update the UI accordingly.
	go func() {
		for {
			now := time.Now().Format(time.RFC1123)
			app.Event.Emit("ping", now)
			time.Sleep(time.Second)
		}
	}()

	mainWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		mainWindow.Minimise()
		event.Cancel()
	})

	icon, err := assets.ReadFile("frontend/dist/icon.png")
	if err != nil {
		panic(err)
	}
	trayMenu := application.NewMenu()
	viewMenu := trayMenu.Add("Go to the Dashboard")
	viewMenu.OnClick(func(c *application.Context) {
		mainWindow.Show()
		mainWindow.Restore()
		mainWindow.Focus()
		// 这里需要一直等待到主窗口显示出来才可以
		for !mainWindow.IsVisible() {
			fmt.Printf("go to dasboard %v \n", mainWindow.IsVisible())
			time.Sleep(time.Millisecond * 100)
		}
		app.Show()
	})
	trayMenu.AddSeparator()
	trayMenu.Add("Documentation").OnClick(func(c *application.Context) {
		_ = app.Browser.OpenURL("https://dpanel.cc")
	})
	trayMenu.Add("Repository").OnClick(func(c *application.Context) {
		_ = app.Browser.OpenURL("https://github.com/donknap/dpanel")
	})
	trayMenu.AddSeparator()
	trayMenu.AddRole(application.Quit)

	systray := app.SystemTray.New()
	systray.SetTemplateIcon(icon)
	systray.SetMenu(trayMenu)
	// Run the application. This blocks until the application has been exited.
	err = app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
