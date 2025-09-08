package process

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func New(config *Config) *ProcessService {
	return &ProcessService{
		config:      config,
		processList: &sync.Map{},
	}
}

type ProcessService struct {
	config      *Config
	ctx         context.Context
	processList *sync.Map
}

func (self *ProcessService) ServiceShutdown() error {
	self.processList.Range(func(key, value interface{}) bool {
		if v, ok := value.(*Process); ok && v.ctxCancel != nil {
			v.ctxCancel()
		}
		return true
	})
	return nil
}

func (self *ProcessService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	self.ctx = ctx
	return nil
}

func (self *ProcessService) ServiceName() string {
	return "github.com/donknap/dpanel-gui/process"
}

func (self *ProcessService) Run(processName string, commandName string, args ...string) bool {
	if v, ok := self.processList.Load(processName); ok {
		self.event(processName, &Event{
			Status: StatusRunning,
			Log:    v.(*Process).GetLog(),
		})
		return true
	}
	process := &Process{
		Name: processName,
		max:  200,
		logs: make([]string, 200),
	}
	process.ctx, process.ctxCancel = context.WithCancel(self.ctx)

	out, err := func() (io.ReadCloser, error) {
		cmd := exec.CommandContext(process.ctx, commandName, args...)
		cmd.Dir = self.config.WorkDir
		for _, item := range os.Environ() {
			if strings.HasPrefix(item, "PATH=") {
				cmd.Env = append(cmd.Env, fmt.Sprintf("PATH=%s%s%s", os.Getenv("PATH"), string(filepath.ListSeparator), self.config.WorkDir))
			} else {
				cmd.Env = append(cmd.Env, item)
			}
		}
		slog.Debug("process service", "op", "process cmd", "workdir", self.config.WorkDir, "env", cmd.Env)

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return nil, err
		}
		cmd.Stderr = cmd.Stdout
		if err = cmd.Start(); err != nil {
			return nil, err
		}
		go func() {
			err := cmd.Wait()
			if err != nil {
				self.event(processName, &Event{
					Status: StatusError,
					Log:    err.Error() + "\n",
				})
				slog.Debug("process service", "op", "process wait", "err", err)
			}
		}()
		self.processList.Store(processName, process)
		return stdout, nil
	}()

	if err != nil {
		self.event(processName, &Event{
			Status: StatusError,
			Log:    err.Error() + "\n",
		})
		return false
	}

	scanner := bufio.NewScanner(out)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasSuffix(line, "\n") {
			line = line + "\n"
		}
		process.SaveLog(line)
		self.event(processName, &Event{
			Status: StatusRunning,
			Log:    line,
		})
	}
	return true
}

func (self ProcessService) event(processName string, message *Event) {
	eventName := fmt.Sprintf(EventMessage, processName)
	self.config.App.Event.Emit(eventName, message)
	slog.Debug("process run", "event", eventName, "message", message)
}
