package process

import (
	"context"
	"io"
	"os/exec"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const EventMessage = "dp-process-%s"

const (
	StatusRunning = "running"
	StatusStopped = "stopped"
	StatusError   = "error"
)

type Process struct {
	Name          string
	cmd           *exec.Cmd
	output        io.ReadCloser
	ctxCancel     context.CancelFunc
	stopCommand   func()
	stopOnce      sync.Once
	done          chan struct{}
	max           int
	mu            sync.Mutex
	logs          []string
	status        string
	stopRequested bool
}

func (process *Process) SaveLog(line string) {
	process.mu.Lock()
	defer process.mu.Unlock()
	if len(process.logs) >= process.max {
		process.logs = process.logs[1:]
	}
	process.logs = append(process.logs, line)
}

func (process *Process) GetLog() string {
	process.mu.Lock()
	defer process.mu.Unlock()
	return strings.Join(process.logs, "")
}

func (process *Process) snapshot() ProcessEventMessage {
	process.mu.Lock()
	defer process.mu.Unlock()
	return ProcessEventMessage{Status: process.status, Log: strings.Join(process.logs, "")}
}

func (process *Process) running() bool {
	process.mu.Lock()
	defer process.mu.Unlock()
	return strings.HasPrefix(process.status, StatusRunning)
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
