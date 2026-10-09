//go:build windows

package function

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/w32"
)

func SetNativeTheme(window *application.WebviewWindow, theme string) {
	application.InvokeSync(func() {
		if hwnd := window.NativeWindow(); hwnd != nil {
			w32.SetTheme(uintptr(hwnd), theme == "black")
		}
	})
}
