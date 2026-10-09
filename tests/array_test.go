package tests

import (
	"reflect"
	"testing"

	"github.com/donknap/dpanel-gui/function"
)

func TestSplitCommandArray(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		command string
		args    []string
		wantErr bool
	}{
		{name: "simple", input: "./dpanel server:start", command: "./dpanel", args: []string{"server:start"}},
		{name: "quoted path", input: `"C:\Program Files\DPanel\dpanel.exe" --config "C:\My Data\config.json"`, command: `C:\Program Files\DPanel\dpanel.exe`, args: []string{"--config", `C:\My Data\config.json`}},
		{name: "multiple spaces", input: "  nginx   -t  ", command: "nginx", args: []string{"-t"}},
		{name: "empty argument", input: `command ""`, command: "command", args: []string{""}},
		{name: "empty command", input: " \t ", wantErr: true},
		{name: "unclosed quote", input: `command "value`, wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			command, args, err := function.SplitCommandArray(test.input)
			if (err != nil) != test.wantErr {
				t.Fatalf("error = %v, wantErr = %v", err, test.wantErr)
			}
			if err == nil && (command != test.command || !reflect.DeepEqual(args, test.args)) {
				t.Fatalf("got %q %q, want %q %q", command, args, test.command, test.args)
			}
		})
	}
}
