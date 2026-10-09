package process

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/donknap/dpanel-gui/function"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func New(config *Config) *ProcessService {
	return &ProcessService{config: config, processList: make(map[string]*Process)}
}

type ProcessService struct {
	config      *Config
	ctx         context.Context
	mu          sync.RWMutex
	processList map[string]*Process
}

func (self *ProcessService) ServiceShutdown() error {
	self.mu.RLock()
	names := make([]string, 0, len(self.processList))
	for name := range self.processList {
		names = append(names, name)
	}
	self.mu.RUnlock()
	for _, name := range names {
		self.Stop(name)
	}
	return nil
}

func (self *ProcessService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	self.ctx = ctx
	if self.config.StartupHandler != nil {
		self.config.StartupHandler(ctx, self)
	}
	return nil
}

func (self *ProcessService) ServiceName() string {
	return "github.com/donknap/dpanel-gui/process"
}

func (self *ProcessService) Run(name string, option RunOption) bool {
	self.mu.Lock()
	if current := self.processList[name]; current != nil && current.running() {
		self.mu.Unlock()
		return true
	}
	if option.LogMaxLine <= 0 {
		option.LogMaxLine = 500
	}
	process := &Process{Name: name, max: option.LogMaxLine, done: make(chan struct{}), status: StatusStopped}
	workDir := option.WorkDir
	if !filepath.IsAbs(workDir) {
		workDir = filepath.Join(os.Getenv(function.EnvWorkDir), workDir)
	}
	workDir, err := filepath.Abs(workDir)
	if err != nil {
		process.status = StatusError
		process.SaveLog(err.Error() + "\n")
		close(process.done)
		self.processList[name] = process
		self.mu.Unlock()
		self.EventEmit(self.GetEventName(name), &ProcessEventMessage{Status: StatusError, Log: err.Error() + "\n"})
		return false
	}
	runEnv, err := function.BuildRunEnv(workDir, option.Environment)
	if err == nil {
		ctx := self.ctx
		if ctx == nil {
			ctx = context.Background()
		}
		ctx, process.ctxCancel = context.WithCancel(ctx)
		process.cmd, err = function.NewCommand(ctx, workDir, option.StartCommand, runEnv)
		if err == nil {
			var output io.ReadCloser
			output, err = process.cmd.StdoutPipe()
			if err == nil {
				process.cmd.Stderr = process.cmd.Stdout
				err = process.cmd.Start()
				if err != nil {
					_ = output.Close()
				}
			}
			if err == nil {
				process.status = fmt.Sprintf("%s (%d)", StatusRunning, process.cmd.Process.Pid)
				process.output = output
				process.stopCommand = func() { self.runStopCommand(process, option.StopCommand, workDir, runEnv) }
				self.processList[name] = process
				self.mu.Unlock()
				self.EventEmit(self.GetEventName(name), &ProcessEventMessage{Status: process.status, Log: "Running....\n"})
				go self.collectOutput(process, output)
				return true
			}
		}
	}
	if process.ctxCancel != nil {
		process.ctxCancel()
	}
	process.status = StatusError
	process.SaveLog(err.Error() + "\n")
	close(process.done)
	self.processList[name] = process
	self.mu.Unlock()
	self.EventEmit(self.GetEventName(name), &ProcessEventMessage{Status: StatusError, Log: err.Error() + "\n"})
	return false
}

func (self *ProcessService) collectOutput(process *Process, output io.ReadCloser) {
	reader := bufio.NewReader(output)
	var readErr error
	for {
		line, err := reader.ReadString('\n')
		if line != "" {
			if !strings.HasSuffix(line, "\n") {
				line += "\n"
			}
			process.SaveLog(line)
			self.EventEmit(self.GetEventName(process.Name), &ProcessEventMessage{Status: process.snapshot().Status, Log: line})
		}
		if err != nil {
			if err != io.EOF {
				readErr = err
				process.ctxCancel()
			}
			break
		}
	}
	waitErr := process.cmd.Wait()
	process.mu.Lock()
	if readErr != nil && !process.stopRequested {
		process.status = StatusError
		if len(process.logs) >= process.max {
			process.logs = process.logs[1:]
		}
		process.logs = append(process.logs, readErr.Error()+"\n")
	} else if waitErr != nil && !process.stopRequested {
		process.status = StatusError
		if len(process.logs) >= process.max {
			process.logs = process.logs[1:]
		}
		process.logs = append(process.logs, waitErr.Error()+"\n")
	} else {
		process.status = StatusStopped
	}
	status := process.status
	process.mu.Unlock()
	message := ""
	if readErr != nil && status == StatusError {
		message = readErr.Error() + "\n"
	} else if status == StatusError {
		message = waitErr.Error() + "\n"
	}
	self.EventEmit(self.GetEventName(process.Name), &ProcessEventMessage{Status: status, Log: message})
	process.ctxCancel()
	close(process.done)
}

func (self *ProcessService) runStopCommand(process *Process, command, workDir string, runEnv []string) {
	if command == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	cmd, err := function.NewCommand(ctx, workDir, command, runEnv)
	if err != nil {
		process.SaveLog(err.Error() + "\n")
		return
	}
	if output, err := cmd.CombinedOutput(); err != nil {
		slog.Warn("stop command failed", "name", process.Name, "error", err, "output", string(output))
	}
}

func (self *ProcessService) Stop(name string) {
	self.mu.RLock()
	process := self.processList[name]
	self.mu.RUnlock()
	if process == nil || !process.running() {
		return
	}
	process.stopOnce.Do(func() {
		process.mu.Lock()
		process.stopRequested = true
		process.mu.Unlock()
		process.stopCommand()
		process.ctxCancel()
		_ = process.output.Close()
	})
	<-process.done
}

func (self *ProcessService) EventEmit(eventName string, message *ProcessEventMessage) {
	if self.config.App != nil {
		self.config.App.Event.Emit(eventName, message)
	}
}

func (self *ProcessService) GetEventName(processName string) string {
	return fmt.Sprintf(EventMessage, processName)
}

func (self *ProcessService) GetProcessStatus(name string) ProcessEventMessage {
	self.mu.RLock()
	process := self.processList[name]
	self.mu.RUnlock()
	if process == nil {
		return ProcessEventMessage{Status: StatusStopped}
	}
	return process.snapshot()
}
