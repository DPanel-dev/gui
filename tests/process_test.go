package tests

import (
	"os/exec"
	"path/filepath"
	"testing"
)

func TestCommand(t *testing.T) {
	path := "D:\\Workspace\\dpanel-gui-wails-v3\\bin\\nginx-1.29.1\\nginx.exe"
	rootPath := "D:\\Workspace\\dpanel-gui-wails-v3\\bin\\"
	println(path)
	cmd := exec.Command(path)
	if !filepath.IsAbs(path) {
		cmd.Dir = rootPath
	} else {
		cmd.Dir = filepath.Dir(path)
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		panic(err)
	}
	println(string(out))
}
