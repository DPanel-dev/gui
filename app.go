package main

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	runtime2 "runtime"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	EventProcess = "event-process"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if screen, err := runtime.ScreenGetAll(a.ctx); err == nil && len(screen) > 1 {
		runtime.WindowSetPosition(ctx, screen[0].Size.Width, 10)
	}
	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug, // ⬅️ 关键：设置最低输出级别为 Debug
	})
	logger := slog.New(handler)
	slog.SetDefault(logger)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

type OSInfoResult struct {
	Platform string `json:"platform"`
}

func (a *App) GetOSInfo() OSInfoResult {
	return OSInfoResult{
		Platform: runtime2.GOOS,
	}
}

const (
	ProcessStatusRunning = "running"
	ProcessStatusStopped = "stopped"
	ProcessStatusError   = "error"
)

func (a *App) ProcessRun(command string, args []string) bool {
	eventsEmit := func(eventName string, status string, message string) {
		runtime.EventsEmit(a.ctx, EventProcess, status, message)
		slog.Debug("process run", "status", status, "message", message)
	}

	cmd := exec.CommandContext(a.ctx, command, args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		eventsEmit(EventProcess, ProcessStatusError, err.Error()+"\n")
		return false
	}
	cmd.Stderr = cmd.Stdout
	if err = cmd.Start(); err != nil {
		eventsEmit(EventProcess, ProcessStatusError, err.Error()+"\n")
		return false
	}

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			eventsEmit(EventProcess, ProcessStatusRunning, line)
		}
	}()

	eventsEmit(EventProcess, ProcessStatusRunning, "")
	if err := cmd.Wait(); err != nil {
		eventsEmit(EventProcess, ProcessStatusError, err.Error()+"\n")
		return false
	} else {
		eventsEmit(EventProcess, ProcessStatusStopped, "")
		runtime.EventsEmit(a.ctx, EventProcess, ProcessStatusStopped, "")
	}
	return true
}
