package setting

import "github.com/donknap/dpanel-gui/services/process"

type Config struct {
	WorkDir string
}

type System struct {
	AutoLaunch      bool
	CloseWindowHide bool
	Theme           string
}

type App struct {
	RunParams process.RunParams
	RunOption process.RunOption
	Setting   map[string]EnvironmentLabelItem
}

type AllConfig struct {
	System System
	Apps   []App
}

type EnvironmentLabelItem struct {
	ZhCN string
	EnUS string
}
