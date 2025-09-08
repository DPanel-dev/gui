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
	if self.config.StartupRun != nil {
		for _, params := range self.config.StartupRun {
			self.Run(params)
		}
	}
	return nil
}

func (self *ProcessService) ServiceName() string {
	return "github.com/donknap/dpanel-gui/process"
}

func (self *ProcessService) Run(params *RunParams) bool {
	if v, ok := self.processList.Load(params.Name); ok && v.(*Process).cmd.Process != nil && v.(*Process).cmd.ProcessState.Success() {
		self.EventEmit(self.GetEventName(params.Name), &ProcessEventMessage{
			Status: StatusRunning,
			Log:    v.(*Process).GetLog(),
		})
		return true
	}
	process := &Process{
		Name: params.Name,
		max:  200,
		logs: make([]string, 200),
	}
	process.ctx, process.ctxCancel = context.WithCancel(self.ctx)
	defer func() {
		slog.Debug("process service", "defer", process)
		// 无论如何都存储起来，需要收集错误及信息
		self.processList.Store(params.Name, process)
	}()

	out, err := func() (io.ReadCloser, error) {
		process.cmd = exec.CommandContext(process.ctx, params.CommandName, params.Args...)
		process.cmd.Dir = self.config.WorkDir
		for _, item := range os.Environ() {
			if strings.HasPrefix(item, "PATH=") {
				process.cmd.Env = append(process.cmd.Env, fmt.Sprintf("PATH=%s%s%s", os.Getenv("PATH"), string(filepath.ListSeparator), self.config.WorkDir))
			} else {
				process.cmd.Env = append(process.cmd.Env, item)
			}
		}
		slog.Debug("process service", "op", "process cmd", "workdir", self.config.WorkDir, "env", process.cmd.Env)

		stdout, err := process.cmd.StdoutPipe()
		if err != nil {
			return nil, err
		}
		process.cmd.Stderr = process.cmd.Stdout
		if err = process.cmd.Start(); err != nil {
			return nil, err
		}
		go func() {
			err := process.cmd.Wait()
			if err != nil {
				process.logs = append(process.logs, err.Error())
				self.EventEmit(self.GetEventName(params.Name), &ProcessEventMessage{
					Status: StatusError,
					Log:    err.Error() + "333\n",
				})
				slog.Debug("process service", "op", "process wait", "err", err)
			}
		}()
		return stdout, nil
	}()

	if err != nil {
		process.logs = append(process.logs, err.Error())
		self.EventEmit(self.GetEventName(params.Name), &ProcessEventMessage{
			Status: StatusError,
			Log:    err.Error() + "222\n",
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
		self.EventEmit(self.GetEventName(params.Name), &ProcessEventMessage{
			Status: StatusRunning,
			Log:    line,
		})
	}
	return true
}

func (self *ProcessService) EventEmit(eventName string, message *ProcessEventMessage) {
	self.config.App.Event.Emit(eventName, message)
	slog.Debug("process run", "event", eventName, "message", message)
}

func (self *ProcessService) GetEventName(processName string) string {
	return fmt.Sprintf(EventMessage, processName)
}

func (self *ProcessService) GetProcessStatus(name string) ProcessEventMessage {
	if v, ok := self.processList.Load(name); ok {
		return ProcessEventMessage{
			Status: v.(*Process).cmd.ProcessState.String(),
			Log:    v.(*Process).GetLog(),
		}
	} else {
		return ProcessEventMessage{
			Status: StatusStopped,
			Log: "",
		}
	}
}