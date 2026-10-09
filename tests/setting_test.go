package tests

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/donknap/dpanel-gui/services/setting"
)

func TestCloseWindowHideDefaultsAndOverrides(t *testing.T) {
	tests := []struct {
		name         string
		defaultValue bool
		config       string
		want         bool
	}{
		{name: "mac missing System", defaultValue: true, config: `{}`, want: true},
		{name: "mac missing field", defaultValue: true, config: `{"System":{"Theme":"black"}}`, want: true},
		{name: "mac explicit close", defaultValue: true, config: `{"System":{"CloseWindowHide":false}}`, want: false},
		{name: "windows missing field", config: `{"System":{}}`, want: false},
		{name: "windows explicit hide", config: `{"System":{"CloseWindowHide":true}}`, want: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "setting.json")
			if err := os.WriteFile(path, []byte(test.config), 0600); err != nil {
				t.Fatal(err)
			}
			service := setting.New(&setting.Config{
				Path:           path,
				DefaultSetting: setting.AllSetting{System: setting.System{CloseWindowHide: test.defaultValue}},
			})
			if got := service.GetAll().System.CloseWindowHide; got != test.want {
				t.Fatalf("CloseWindowHide = %v, want %v", got, test.want)
			}
		})
	}
}
