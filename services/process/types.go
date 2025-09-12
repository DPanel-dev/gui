package process

import (
	"context"
	"log/slog"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"

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
	Name        string
	cmd         *exec.Cmd
	ctx         context.Context
	ctxCancel   context.CancelFunc
	logs        []string
	max         int
	mu          sync.Mutex
	StopHandler func()
	stopDone    chan bool
}

func (self *Process) SaveLog(line string) {
	self.mu.Lock()
	defer self.mu.Unlock()
	if len(self.logs) == self.max {
		self.logs = self.logs[1:]
	}
	self.logs = append(self.logs, line)
	slog.Debug("process service save log", "length", len(self.logs))
}

func (self *Process) GetLog() string {
	return strings.Join(self.logs, "")
}

func (self *Process) Close() {
	if self.StopHandler != nil {
		self.StopHandler()
	}
	if self.cmd != nil && self.cmd.Process != nil {
		err := self.cmd.Process.Kill()
		if err != nil {
			slog.Info("process service process kill ", "err", err)
		}
		err = self.cmd.Process.Signal(syscall.SIGTERM)
		if err != nil {
			slog.Info("process service process signal ", "err", err)
		}
		err = self.cmd.Process.Signal(os.Interrupt)
		if err != nil {
			slog.Info("process service process signal", "err", err)
		}
		self.cmd = nil
	}
	self.ctxCancel()
}

type Config struct {
	App            *application.App
	StartupHandler func(ctx context.Context, self *ProcessService)
}

type RunOption struct {
	AutoLaunch   bool
	WorkDir      string
	StartCommand string
	StopCommand  string
	Environment  []string
	LogMaxLine   int
}

type ProcessEventMessage struct {
	Status string
	Log    string
}
