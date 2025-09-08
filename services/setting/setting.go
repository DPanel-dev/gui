package setting

import (
	"context"
	"github.com/donknap/dpanel-gui/function"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/kvstore"
	"log/slog"
	"os"
	"path/filepath"
)

var defaultConfig = AllConfig{
	System: System{
		AutoLaunch:      false,
		CloseWindowHide: true,
		Theme:           "light",
	},
	Apps: []App{
		{
			Name:        "dpanel",
			CommandName: "./dpanel",
			Args: []string{
				"server:start",
			},
			Environment: []EnvironmentItem{
				{
					Name:  "APP_SERVER_PORT",
					Value: "8086",
					Label: EnvironmentLabelItem{
						ZhCN: "服务运行端口",
						EnUS: "Service running port",
					},
				},
				{
					Name:  "STORAGE_LOCAL_PATH",
					Value: "${DP_WORK_DIR}/data",
					Label: EnvironmentLabelItem{
						ZhCN: "数据存储目录",
						EnUS: "Data storage directory",
					},
				},
			},
			AutoRun: true,
		},
	},
}

func New(config *Config) *SettingService {
	kvStoreServiceConfigFile := filepath.Join(config.WorkDir, "setting.json")
	kvStoreService := kvstore.NewWithConfig(&kvstore.Config{
		Filename: kvStoreServiceConfigFile,
		AutoSave: true,
	})
	slog.Debug("config service", "config file path", kvStoreServiceConfigFile)
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
		err = self.kvStoreService.Set("setting", defaultConfig)
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

func (self *SettingService) Get() AllConfig {
	return defaultConfig
}

func (self *SettingService) GetApp(name string) App {
	if v, ok := function.PluckArrayItemWalk(self.Get().Apps, func(item App) bool {
		if name == item.Name {
			return true
		}
		return false
	}); ok {
		return v
	}
	return App{}
}