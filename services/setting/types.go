package setting

import (
	"encoding/json"

	"github.com/donknap/dpanel-gui/services/process"
)

type Config struct {
	Path           string
	DefaultSetting AllSetting
}

type System struct {
	CloseWindowHide bool
	Theme           string
	Language        string
}

type App struct {
	Name      string
	HomeUrl   string `json:",omitempty"`
	RunOption process.RunOption
	Setting   Setting `json:",omitempty"`
}

type AllSetting struct {
	System System
	Apps   []App
	// Preset contains the built-in directory variables for display only.
	Preset map[string]string
}

type LocalizedText map[string]string

func (text *LocalizedText) UnmarshalJSON(data []byte) error {
	if len(data) > 0 && data[0] == '"' {
		var legacy string
		if err := json.Unmarshal(data, &legacy); err != nil {
			return err
		}
		*text = LocalizedText{"zh-CN": legacy}
		return nil
	}
	return json.Unmarshal(data, (*map[string]string)(text))
}

type EnvironmentItem struct {
	Description  LocalizedText
	Help         LocalizedText `json:",omitempty"`
	DefaultValue string `json:",omitempty"`
	Disabled     bool   `json:",omitempty"`
}

type Setting struct {
	Environment map[string]EnvironmentItem
}

type FormAppEnvironment []struct {
	Name        string   `json:"name"`
	Environment []string `json:"environment"`
}
