package setting

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/donknap/dpanel-gui/function"
	"github.com/donknap/dpanel-gui/services/process"
	"github.com/joho/godotenv"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/kvstore"
)

var defaultConfig = AllConfig{
	System: System{
		AutoLaunch:      false,
		CloseWindowHide: true,
		Theme:           "light",
	},
	Apps: []App{
		{
			Name:    "dpanel",
			HomeUrl: "http://127.0.0.1:${APP_SERVER_PORT}",
			RunOption: process.RunOption{
				AutoLaunch:   true,
				WorkDir:      "./",
				StartCommand: "./dpanel server:start",
				StopCommand:  "",
				Environment: []string{
					"APP_SERVER_PORT=8086",
					"STORAGE_LOCAL_PATH=${DP_WORK_DIR}/data",
				},
				LogMaxLine: 1000,
			},
			Setting: Setting{
				Environment: map[string]EnvironmentLabelItem{
					"APP_SERVER_PORT": {
						ZhCN: "服务运行端口",
						EnUS: "Service running port",
					},
					"STORAGE_LOCAL_PATH": {
						ZhCN: "数据存储目录",
						EnUS: "Data storage directory",
					},
				},
			},
		},
	},
}

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
	}
}

type SettingService struct {
	ctx            context.Context
	kvStoreService *kvstore.KVStoreService
	configFilePath string
}

func (self *SettingService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	self.ctx = ctx
	if _, err := os.Stat(self.configFilePath); err != nil {
		err = self.kvStoreService.Set("Setting", defaultConfig)
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

func (self *SettingService) GetAll() AllConfig {
	_ = self.kvStoreService.Load()
	if data := self.kvStoreService.Get(""); data != nil {
		if dataStr, err := json.Marshal(data.(map[string]any)["Setting"]); err == nil {
			slog.Info("config get data", "data", string(dataStr))
			config := AllConfig{}
			err = json.Unmarshal(dataStr, &config)
			if err != nil {
				return defaultConfig
			} else {
				return config
			}
		}
	}
	return defaultConfig
}

func (self *SettingService) GetApp(name string) App {
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
		return v
	}
	return App{}
}
