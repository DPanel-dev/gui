//go:build darwin && !ios

package function

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa

#include <stdbool.h>
#import <Cocoa/Cocoa.h>

static void setNativeTheme(bool dark) {
	NSAppearance *appearance = [NSAppearance appearanceNamed:dark ? NSAppearanceNameDarkAqua : NSAppearanceNameAqua];
	NSApp.appearance = appearance;
	for (NSWindow *window in NSApp.windows) {
		window.appearance = appearance;
	}
}
*/
import "C"

import "github.com/wailsapp/wails/v3/pkg/application"

func SetNativeTheme(_ *application.WebviewWindow, theme string) {
	application.InvokeSync(func() {
		C.setNativeTheme(C.bool(theme == "black"))
	})
}
