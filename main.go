package main

import (
	"embed"
	_ "embed"
	"fmt"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/donknap/dpanel-gui/services/config"
	"github.com/donknap/dpanel-gui/services/process"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/kvstore"
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

	storeConfigFile := filepath.Join(workDir, "setting.json")
	store := kvstore.NewWithConfig(&kvstore.Config{
		Filename: storeConfigFile,
		AutoSave: true,
	})
	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	app := application.New(application.Options{
		Name:        "dpanel-gui-wails-v3",
		Description: "A demo of using raw HTML & CSS",
		Services: []application.Service{
			application.NewService(log2.New()),
			application.NewService(notifications.New()),
			application.NewService(store),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.RegisterService(application.NewService(process.New(&process.Config{
		App:     app,
		WorkDir: workDir,
	})))

	// 初始化配置
	if _, err := os.Stat(storeConfigFile); err != nil {
		err = store.Set("system", config.System{
			AutoLaunch:      false,
			CloseWindowHide: true,
			Theme:           "light",
			AutoOpenAppUrl:  false,
		})
		if err != nil {
			panic(err)
		}
		err = store.Set("dpanel", config.App{
			Env: []string{
				"APP_SERVER_PORT=8086",
				fmt.Sprintf("STORAGE_LOCAL_PATH=%s", filepath.Join(workDir, "data")),
			},
			Command: "./dpanel",
			Args: []string{
				"server:start",
			},
		})
		if err != nil {
			panic(err)
		}
	}

	// Create a new window with the necessary options.
	// 'Title' is the title of the window.
	// 'Mac' options tailor the window when running on macOS.
	// 'BackgroundColour' is the background colour of the window.
	// 'URL' is the URL that will be loaded into the webview.
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "DPanel Desktop",
		Width:     1200,
		Height:    800,
		MinWidth:  600,
		MinHeight: 600,
		Windows:   application.WindowsWindow{},
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
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

	// Run the application. This blocks until the application has been exited.
	err = app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
