package setting

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/donknap/dpanel-gui/function"
	"github.com/joho/godotenv"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/kvstore"
	"golang.org/x/sys/windows/registry"
)

func New(config *Config) *SettingService {
	kvStoreServiceConfigFile := filepath.Join(config.WorkDir, "setting.json")
	kvStoreService := kvstore.NewWithConfig(&kvstore.Config{
		Filename: kvStoreServiceConfigFile,
		AutoSave: true,
	})
	slog.Info("config service", "config file path", kvStoreServiceConfigFile)
	return &SettingService{
		configFilePath: kvStoreServiceConfigFile,
		kvStoreService: kvStoreService,
		defaultSetting: config.DefaultSetting,
	}
}

type SettingService struct {
	ctx            context.Context
	kvStoreService *kvstore.KVStoreService
	configFilePath string
	defaultSetting AllSetting
}

func (self *SettingService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	self.ctx = ctx
	if _, err := os.Stat(self.configFilePath); err != nil {
		err = self.kvStoreService.Set("System", self.defaultSetting.System)
		if err != nil {
			return err
		}
		err = self.kvStoreService.Set("Apps", self.defaultSetting.Apps)
		if err != nil {
			return err
		}
	}
	return nil
}

func (self *SettingService) ServiceShutdown() error {
	return nil
}

func (self *SettingService) ServiceName() string {
	return "github.com/donknap/dpanel-gui/config"
}

func (self *SettingService) GetAll() AllSetting {
	_ = self.kvStoreService.Load()
	if data := self.kvStoreService.Get(""); data != nil {
		if dataStr, err := json.Marshal(data); err == nil {
			slog.Info("config get data", "data", string(dataStr))
			config := AllSetting{}
			err = json.Unmarshal(dataStr, &config)
			if err != nil {
				return self.defaultSetting
			} else {
				return config
			}
		}
	}
	return self.defaultSetting
}

func (self *SettingService) GetApp(name string) *App {
	if v, ok := function.PluckArrayItemWalk(self.GetAll().Apps, func(item App) bool {
		if name == item.Name {
			return true
		}
		return false
	}); ok {
		if appEnv, err := godotenv.Unmarshal(strings.Join(v.RunOption.Environment, "\n")); err == nil {
			v.HomeUrl = os.Expand(v.HomeUrl, func(s string) string {
				return appEnv[s]
			})
		}
		return &v
	}
	return nil
}

func (self *SettingService) SaveSystem(value System) *function.Response {
	allConfig := self.GetAll()
	allConfig.System = value
	err := self.kvStoreService.Set("System", allConfig.System)
	if err != nil {
		return function.Error(err)
	}
	return nil
}

func (self *SettingService) SaveAppEnvironment(env FormAppEnvironment) *function.Response {
	allConfig := self.GetAll()
	for i, app := range allConfig.Apps {
		for _, item := range env {
			if app.Name == item.Name {
				allConfig.Apps[i].RunOption.Environment = item.Environment
			}
		}
	}
	return function.Error(self.kvStoreService.Set("Apps", allConfig.Apps))
}

func (self *SettingService) GetAutoLaunchStatus() *function.Response {
	if runtime.GOOS == "windows" {
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
	}
	return function.Error(errors.New("only support windows"))
}

func (self *SettingService) SaveAutoLaunchStatus(status bool) *function.Response {
	if runtime.GOOS == "windows" {
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
	}
	return nil
}

func (self *SettingService) OpenFolder(path string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", path)
	case "darwin": // macOS
		cmd = exec.Command("open", path)
	case "linux":
		cmd = exec.Command("xdg-open", path)
	default:
		return fmt.Errorf("unsupported platform")
	}
	return cmd.Run()
}

func (self *SettingService) OpenWorkDir() bool {
	err := self.OpenFolder(os.Getenv(function.EnvWorkDir))
	if err != nil {
		return false
	}
	return true
}

func (self *SettingService) OpenHomeDir() bool {
	err := self.OpenFolder(os.Getenv(function.EnvHomeDir))
	if err != nil {
		return false
	}
	return true
}
