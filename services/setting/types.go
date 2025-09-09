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
	Name      string
	RunOption process.RunOption
	Setting   Setting
}

type AllConfig struct {
	System System
	Apps   []App
}

type EnvironmentLabelItem struct {
	ZhCN string
	EnUS string
}

type Setting struct {
	HomeUrl     string
	Environment map[string]EnvironmentLabelItem
}
