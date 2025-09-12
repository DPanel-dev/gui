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
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/sys/windows"

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
			slog.Info("process service shutdown", "process", v)
			v.Close()
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

	if option.LogMaxLine <= 0 {
		option.LogMaxLine = 500
	}
	process := &Process{
		Name:     name,
		max:      option.LogMaxLine,
		logs:     make([]string, 0),
		stopDone: make(chan bool),
	}
	process.ctx, process.ctxCancel = context.WithCancel(self.ctx)

	defer func() {
		slog.Info("process service defer", "process", process)
		// 这里退出后，表示命令还未开始或是已经执行完成，需要重重置掉 cmd 对象，但是还需要保留执行结果，不能把 process 对象删除
		process.Close()
		// 无论如何都存储起来，需要收集错误及信息
		self.processList.Store(name, process)
	}()

	workDir := ""
	if filepath.IsAbs(option.WorkDir) {
		workDir = option.WorkDir
	} else {
		workDir = filepath.Join(os.Getenv(function.EnvWorkDir), option.WorkDir)
	}

	runEnv := make([]string, 0)
	runEnv = append(runEnv, function.EnvWorkDir+"="+workDir)
	runEnv = append(runEnv, function.EnvHomeDir+"="+os.Getenv(function.EnvHomeDir))
	runEnv = append(runEnv, option.Environment...)
	appEnvMap, err := godotenv.Unmarshal(strings.Join(runEnv, "\n"))
	slog.Debug("process service parse env", "runEnv", runEnv)
	if err != nil {
		process.SaveLog(err.Error())
		self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
			Status: StatusError,
			Log:    err.Error() + "333\n",
		})
		return false
	}
	runEnv = function.PluckMapWalkArray(appEnvMap, func(name string, value string) (string, bool) {
		return fmt.Sprintf("%s=%s", name, value), true
	})
	// 将应用的运行目录附加上环境变量中，方便调用命令
	_ = os.Setenv("PATH", fmt.Sprintf("%s%s%s", os.Getenv("PATH"), string(filepath.ListSeparator), workDir))
	// 最后附加上系统环境变量
	runEnv = append(runEnv, os.Environ()...)

	if option.StopCommand != "" {
		process.StopHandler = func() {
			killCtx, killCancel := context.WithTimeout(context.Background(), time.Second*20)
			defer func() {
				killCancel()
			}()
			slog.Info("process service start kill", "err", err)
			cmdName, cmdArgs := function.SplitCommandArray(option.StopCommand)
			killCmd := exec.CommandContext(killCtx, cmdName, cmdArgs...)
			killCmd.Env = runEnv
			killCmd.Dir = workDir
			killOut, err := killCmd.CombinedOutput()
			if err != nil {
				slog.Info("process service process kill", "err", err)
			}
			slog.Info("process service kill out", "out", string(killOut))
		}
	}

	out, err := func() (io.ReadCloser, error) {
		cmdName, cmdArgs := function.SplitCommandArray(option.StartCommand)
		process.cmd = exec.CommandContext(process.ctx, cmdName, cmdArgs...)
		process.cmd.Dir = workDir
		process.cmd.Env = runEnv
		if runtime.GOOS == "windows" {
			process.cmd.SysProcAttr = &windows.SysProcAttr{
				HideWindow: true,
			}
		}
		slog.Info("process service run params", "name", cmdName, "args", cmdArgs, "env", process.cmd.Env)

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
			defer func() {
				slog.Info("process service process wait quit chan")
				process.stopDone <- true
			}()
			if err != nil {
				process.SaveLog(err.Error())
				self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
					Status: StatusError,
					Log:    err.Error() + "222\n",
				})
				slog.Info("process service process wait", "err", err)
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
			Log:    err.Error() + "111\n",
		})
		return false
	}

	self.processList.Store(name, process)
	self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
		Status: fmt.Sprintf("%s (%d)", StatusRunning, process.cmd.Process.Pid),
		Log:    "Running.... \n",
	})

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

	self.EventEmit(self.GetEventName(name), &ProcessEventMessage{
		Status: StatusStopped,
		Log:    "",
	})
	slog.Info("process service read out close")
	return true
}

func (self *ProcessService) Stop(name string) {
	if v, ok := self.processList.LoadAndDelete(name); ok {
		myProcess := v.(*Process)
		slog.Info("process service stop", "process", myProcess.Name)
		myProcess.Close()
		// 这里需要等待进程真正的退出
		<-myProcess.stopDone
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
			slog.Info("process service run process", "pid", myProcess.cmd.Process.Pid, "error", myProcess.cmd.Err)
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
