//go:build !windows

package process

import (
	"context"
	"os/exec"
)

func (self *ProcessService) newCmd(ctx context.Context, commandName string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, commandName, args...)
	return cmd
}
