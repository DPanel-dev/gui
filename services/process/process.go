package process

import (
	"bufio"
	"context"
	"fmt"
	"github.com/joho/godotenv"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/donknap/dpanel-gui/function"
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
			slog.Info("process service", "shutdown", v)
			v.ctxCancel()
		}
		return true
	})
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
	if v := self.GetProcessStatus(name); strings.Contains(v.Status, StatusRunning) {
		return true
	}
	slog.Info("process service", "name", name, "option", option)

	process := &Process{
		Name: name,
		max:  option.LogMaxLine,
		logs: make([]string, 0),
	}
	process.ctx, process.ctxCancel = context.WithCancel(self.ctx)

	defer func() {
		slog.Info("process service defer", "process", process)
		// 这里退出后，表示命令已经执行完成，需要重重置掉 cmd 对象，但是还需要保留执行结果，不能把 process 对象删除
		process.Close()
		// 无论如何都存储起来，需要收集错误及信息
		self.processList.Store(name, process)
	}()

	workDir := ""
	if filepath.IsAbs(option.WorkDir) {
		workDir = option.WorkDir
	} else {
		workDir = filepath.Join(self.config.WorkDir, option.WorkDir)
	}

	runEnv := os.Environ()
	runEnv = append(runEnv, "DP_WORK_DIR="+workDir)
	runEnv = append(runEnv, option.Environment...)
	appEnvMap, err := godotenv.Unmarshal(strings.Join(runEnv, "\n"))
	if err != nil {
		process.SaveLog(err.Error())
		self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
			Status: StatusError,
			Log:    err.Error() + "\n",
		})
		return false
	}
	runEnv = function.PluckMapWalkArray(appEnvMap, func(name string, value string) (string, bool) {
		return fmt.Sprintf("%s=%s", name, value), true
	})
	out, err := func() (io.ReadCloser, error) {
		cmdParams := function.SplitCommandArray(option.StartCommand)
		process.cmd = exec.CommandContext(process.ctx, cmdParams[0], cmdParams[1:]...)
		process.cmd.Dir = workDir
		process.cmd.Env = runEnv

		slog.Info("process service", "op", "process cmd", "cmd", cmdParams, "env", process.cmd.Env)

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
				process.SaveLog(err.Error())
				self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
					Status: StatusError,
					Log:    err.Error() + "333\n",
				})
				slog.Info("process service", "op", "process wait", "err", err)
				return
			}
			self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
				Status: StatusStopped,
				Log:    "",
			})
		}()
		return stdout, nil
	}()

	if err != nil {
		process.SaveLog(err.Error())
		self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
			Status: StatusError,
			Log:    err.Error() + "222\n",
		})
		return false
	}

	if option.StopCommand != "" {
		go func() {
			<-process.ctx.Done()
			killCtx, killCancel := context.WithCancel(process.ctx)
			defer func() {
				killCancel()
			}()
			cmdParams := function.SplitCommandArray(option.StartCommand)
			killCmd := exec.CommandContext(killCtx, cmdParams[0], cmdParams[1:]...)
			killCmd.Env = runEnv
			killCmd.Dir = workDir
			err = killCmd.Run()
			if err != nil {
				slog.Info("process service", "op", "process kill", "err", err)
			}
		}()
	}

	self.processList.Store(name, process)
	scanner := bufio.NewScanner(out)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasSuffix(line, "\n") {
			line = line + "\n"
		}
		process.SaveLog(line)
		self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
			Status: fmt.Sprintf("%s (%d)", StatusRunning, process.cmd.Process.Pid),
			Log:    line,
		})
	}
	slog.Info("process service read out close")

	return true
}

func (self *ProcessService) Stop(name string) {
	if v, ok := self.processList.LoadAndDelete(name); ok {
		myProcess := v.(*Process)
		slog.Info("process service stop", "process", myProcess.Name)
		myProcess.Close()
	}
}

func (self *ProcessService) EventEmit(eventName string, message *ProcessEventMessage) {
	self.config.App.Event.Emit(eventName, message)
	slog.Info("process run", "event", eventName, "message", message)
}

func (self *ProcessService) GetEventName(processName string) string {
	return fmt.Sprintf(EventMessage, processName)
}

func (self *ProcessService) GetProcessStatus(name string) ProcessEventMessage {
	if v, ok := self.processList.Load(name); ok {
		myProcess := v.(*Process)
		slog.Info("process service run exists")
		status := StatusStopped
		if myProcess.cmd != nil && myProcess.cmd.Process != nil {
			slog.Info("process service run exists", "error", myProcess.cmd.Err, "pid", myProcess.cmd.Process.Pid)
			if myProcess.cmd.Process.Pid > 0 {
				status = fmt.Sprintf("%s (%d)", StatusRunning, myProcess.cmd.Process.Pid)
			} else {
				status = myProcess.cmd.ProcessState.String()
			}
		}
		return ProcessEventMessage{
			Status: status,
			Log:    v.(*Process).GetLog(),
		}
	}
	return ProcessEventMessage{
		Status: StatusStopped,
		Log:    "",
	}
}
