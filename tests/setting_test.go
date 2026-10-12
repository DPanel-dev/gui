package tests

import (
	"bytes"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/donknap/dpanel-gui/function"
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

func TestLanguageDefaultsAndOverrides(t *testing.T) {
	tests := []struct {
		name   string
		config string
		want   string
	}{
		{name: "missing System", config: `{}`, want: "auto"},
		{name: "existing System", config: `{"System":{"Theme":"black"}}`, want: "auto"},
		{name: "explicit language", config: `{"System":{"Language":"en-US"}}`, want: "en-US"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "setting.json")
			if err := os.WriteFile(path, []byte(test.config), 0600); err != nil {
				t.Fatal(err)
			}
			service := setting.New(&setting.Config{
				Path:           path,
				DefaultSetting: setting.AllSetting{System: setting.System{Language: "auto"}},
			})
			if got := service.GetAll().System.Language; got != test.want {
				t.Fatalf("Language = %q, want %q", got, test.want)
			}
		})
	}
}

func TestDPanelStorageUsesConfiguredEnvironment(t *testing.T) {
	homeDir := t.TempDir()
	t.Setenv(function.EnvHomeDir, homeDir)
	path := filepath.Join(t.TempDir(), "setting.json")
	config := `{"Apps":[{"Name":"dpanel","RunOption":{"Environment":["APP_SERVER_PORT=8086","DP_SYSTEM_STORAGE_LOCAL_PATH=${DP_HOME_DIR}/dpanel"]},"Setting":{"Environment":{"DP_SYSTEM_STORAGE_LOCAL_PATH":{"Disabled":true}}}},{"Name":"other","RunOption":{"Environment":["CUSTOM_VALUE=other"]}}]}`
	if err := os.WriteFile(path, []byte(config), 0600); err != nil {
		t.Fatal(err)
	}
	service := setting.New(&setting.Config{Path: path})
	loaded := service.GetAll()
	if loaded.Preset[function.EnvHomeDir] != homeDir {
		t.Fatalf("unexpected preset home directory: %+v", loaded.Preset)
	}
	if len(loaded.Apps) != 2 || !slices.Contains(loaded.Apps[0].RunOption.Environment, "DP_SYSTEM_STORAGE_LOCAL_PATH=${DP_HOME_DIR}/dpanel") || !loaded.Apps[0].Setting.Environment["DP_SYSTEM_STORAGE_LOCAL_PATH"].Disabled {
		t.Fatalf("GetAll changed saved applications: %+v", loaded.Apps)
	}
	runEnv, err := function.BuildRunEnv(homeDir, loaded.Apps[0].RunOption.Environment)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(runEnv, "DP_SYSTEM_STORAGE_LOCAL_PATH="+filepath.Join(homeDir, "dpanel")) {
		t.Fatalf("configured storage path was not expanded: %+v", runEnv)
	}
	result := service.SaveAppEnvironment(setting.FormAppEnvironment{{Name: "dpanel", Environment: []string{"APP_SERVER_PORT=8087", "DP_SYSTEM_STORAGE_LOCAL_PATH=${DP_HOME_DIR}/dpanel"}}})
	if result != nil && result.Error != "" {
		t.Fatal(result.Error)
	}
	updated := service.GetAll().Apps[0].RunOption.Environment
	if len(updated) != 2 || !slices.Contains(updated, "APP_SERVER_PORT=8087") || !slices.Contains(updated, "DP_SYSTEM_STORAGE_LOCAL_PATH=${DP_HOME_DIR}/dpanel") || !slices.Contains(service.GetAll().Apps[1].RunOption.Environment, "CUSTOM_VALUE=other") {
		t.Fatalf("unexpected saved environments: %+v", service.GetAll().Apps)
	}
	stored, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(stored, []byte("DP_SYSTEM_STORAGE_LOCAL_PATH=${DP_HOME_DIR}/dpanel")) {
		t.Fatalf("configured storage path was not persisted: %s", stored)
	}
}
