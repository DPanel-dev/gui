package process

import (
	"context"
	"os/exec"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	EventMessage = "dp-process-%s"
)

const (
	StatusRunning = "running"
	StatusStopped = "stopped"
	StatusError   = "error"
)

type Process struct {
	Name      string
	cmd       *exec.Cmd
	ctx       context.Context
	ctxCancel context.CancelFunc
	// FIFO 环形缓冲区
	logs  []string
	max   int
	tail  int
	count int
	mu    sync.Mutex
}

func (self *Process) SaveLog(line string) {
	self.mu.Lock()
	defer self.mu.Unlock()
	self.logs[self.tail] = line
	self.tail = (self.tail + 1) % self.max
	if self.count < self.max {
		self.count++
	}
}

func (self *Process) GetLog() string {
	return strings.Join(self.logs, "")
}

type Config struct {
	App            *application.App
	WorkDir        string
	StartupHandler func(ctx context.Context, self *ProcessService)
}

type RunParams struct {
	Name        string
	CommandName string
	Args        []string
	Environment []EnvironmentItem
}

type RunOption struct {
	LogMaxLine int
	AutoRun    bool
	WorkDir    string
	KillParams RunParams
}

type EnvironmentItem struct {
	Name  string
	Value string
}

type ProcessEventMessage struct {
	Status string
	Log    string
}
