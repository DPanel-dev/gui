//go:build (!darwin && !windows) || ios

package function

import "github.com/wailsapp/wails/v3/pkg/application"

func SetNativeTheme(*application.WebviewWindow, string) {}
