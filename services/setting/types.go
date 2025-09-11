package setting

import "github.com/donknap/dpanel-gui/services/process"

const AutoLaunchKey = "Software\\Microsoft\\Windows\\CurrentVersion\\Run"

type Config struct {
	WorkDir        string
	DefaultSetting AllConfig
}

type System struct {
	AutoLaunch      bool
	CloseWindowHide bool
	Theme           string
}

type App struct {
	Name      string
	HomeUrl   string `json:",omitempty"`
	RunOption process.RunOption
	Setting   Setting `json:",omitempty"`
}

type AllConfig struct {
	System System
	Apps   []App
}

type EnvironmentItem struct {
	Description  string
	DefaultValue string `json:",omitempty"`
}

type Setting struct {
	Environment map[string]EnvironmentItem
}

type FormAppEnvironment []struct {
	Name        string   `json:"name"`
	Environment []string `json:"environment"`
}
