//go:build !windows

package function

import (
	"os"
	"os/exec"
)

func environmentKey(name string) string { return name }

func executableCandidates(path, _, _ string) []string { return []string{path} }

func isExecutable(info os.FileInfo) bool { return info.Mode()&0111 != 0 }

func configureCommand(_ *exec.Cmd) {}
