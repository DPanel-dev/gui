//go:build windows

package setting

import (
	"github.com/donknap/dpanel-gui/function"
	"golang.org/x/sys/windows/registry"
	"strings"
)
import "errors"

func (self *SettingService) GetAutoLaunchStatus() *function.Response {
	regKey, err := registry.OpenKey(registry.CURRENT_USER, AutoLaunchKey, registry.READ)
	if err != nil {
		slog.Info("setting service auto launch failed", "err", err)
		return function.Error(err)
	}
	defer func() {
		_ = regKey.Close()
	}()

	values, _, err := regKey.GetStringValue("DPanelDesktop")
	if err != nil && strings.Contains(err.Error(), "Access is denied") {
		slog.Info("setting service auto launch permission", "err", err)
		return function.Error(err)
	}
	return function.Result(values)
	return function.Error(errors.New("only support windows"))
}

func (self *SettingService) SaveAutoLaunchStatus(status bool) *function.Response {
	regKey, err := registry.OpenKey(registry.CURRENT_USER, AutoLaunchKey, registry.SET_VALUE)
	if err != nil {
		slog.Info("setting service auto launch failed", "err", err)
		return function.Error(err)
	}
	defer func() {
		_ = regKey.Close()
	}()
	if status == true {
		return function.Error(regKey.SetStringValue("DPanelDesktop", filepath.Join(filepath.Dir(self.configFilePath), "dpanel-desktop.exe")))
	}
	if status == false {
		return function.Error(regKey.DeleteValue("DPanelDesktop"))
	}
	return nil
}
