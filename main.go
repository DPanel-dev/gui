package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "DPanel Desktop",
		Width:     1200,
		Height:    800,
		MinWidth:  600,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Frameless:        false,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},

		Windows: &windows.Options{
			Theme: windows.Dark,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
