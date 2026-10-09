//go:build windows

package function

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"golang.org/x/sys/windows"
)

func environmentKey(name string) string { return strings.ToUpper(name) }

func executableCandidates(path, name, pathExt string) []string {
	paths := []string{path}
	if filepath.Ext(name) != "" {
		return paths
	}
	if pathExt == "" {
		pathExt = ".COM;.EXE;.BAT;.CMD"
	}
	for _, extension := range strings.Split(pathExt, ";") {
		if extension != "" {
			paths = append(paths, path+strings.ToLower(extension))
		}
	}
	return paths
}

func isExecutable(_ os.FileInfo) bool { return true }

func configureCommand(cmd *exec.Cmd) {
	cmd.SysProcAttr = &windows.SysProcAttr{HideWindow: true}
}
