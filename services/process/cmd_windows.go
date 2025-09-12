//go:build windows

package process

import (
	"context"
	"golang.org/x/sys/windows"
	"os/exec"
)

func (self *ProcessService) newCmd(ctx context.Context, commandName string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, commandName, args...)
	cmd.SysProcAttr = &windows.SysProcAttr{
		HideWindow: true,
	}
	return cmd
}
