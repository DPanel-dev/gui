package tests

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/donknap/dpanel-gui/function"
	"github.com/donknap/dpanel-gui/services/process"
)

func TestProcessHelper(t *testing.T) {
	if os.Getenv("DPANEL_TEST_HELPER") != "1" {
		return
	}
	switch os.Getenv("DPANEL_TEST_MODE") {
	case "environment":
		fmt.Printf("CUSTOM_VALUE=%s\nDP_WORK_DIR=%s\nDATA_PATH=%s\n", os.Getenv("CUSTOM_VALUE"), os.Getenv(function.EnvWorkDir), os.Getenv("DATA_PATH"))
	case "path":
		fmt.Println("PATH_HELPER_OK")
	default:
		fmt.Println(strings.Repeat("x", 70*1024))
	}
	if os.Getenv("DPANEL_TEST_WAIT") == "1" {
		time.Sleep(30 * time.Second)
	}
}

func TestProcessNaturalExit(t *testing.T) {
	t.Setenv("DPANEL_TEST_HELPER", "1")
	service := testService(t)
	if !service.Run("helper", testOption(t)) {
		t.Fatal("helper did not start")
	}
	status := waitForProcessExit(t, service, "helper")
	if status.Status != process.StatusStopped || len(status.Log) < 70*1024 {
		t.Fatalf("unexpected status %q or truncated log length %d", status.Status, len(status.Log))
	}
	service.Stop("helper")
}

func TestProcessStopAndDuplicateRun(t *testing.T) {
	t.Setenv("DPANEL_TEST_HELPER", "1")
	t.Setenv("DPANEL_TEST_WAIT", "1")
	service := testService(t)
	option := testOption(t)
	if !service.Run("helper", option) {
		t.Fatal("helper did not start")
	}
	first := service.GetProcessStatus("helper").Status
	if !service.Run("helper", option) || service.GetProcessStatus("helper").Status != first {
		t.Fatal("duplicate run started another process")
	}
	done := make(chan struct{})
	go func() {
		service.Stop("helper")
		service.Stop("helper")
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("stop did not finish")
	}
	if status := service.GetProcessStatus("helper"); status.Status != process.StatusStopped {
		t.Fatalf("status after stop = %q", status.Status)
	}
}

func TestProcessStartFailure(t *testing.T) {
	service := testService(t)
	option := process.RunOption{WorkDir: t.TempDir(), StartCommand: "./missing-program"}
	if service.Run("missing", option) {
		t.Fatal("missing command unexpectedly started")
	}
	service.Stop("missing")
	if status := service.GetProcessStatus("missing"); status.Status != process.StatusError {
		t.Fatalf("status after start failure = %q", status.Status)
	}
}

func TestProcessEnvironmentOverridesParent(t *testing.T) {
	t.Setenv("DPANEL_TEST_HELPER", "1")
	t.Setenv("DPANEL_TEST_MODE", "environment")
	t.Setenv("CUSTOM_VALUE", "parent-value")
	t.Setenv(function.EnvWorkDir, "parent-work-dir")
	before := os.Getenv("PATH")
	workDir := t.TempDir()
	service := testService(t)
	option := testOption(t)
	option.WorkDir = workDir
	option.Environment = []string{"CUSTOM_VALUE=app-value", "DATA_PATH=${DP_WORK_DIR}/data"}
	if !service.Run("helper", option) {
		t.Fatal("helper did not start")
	}
	status := waitForProcessExit(t, service, "helper")
	if status.Status != process.StatusStopped {
		t.Fatalf("helper status = %q, log = %q", status.Status, status.Log)
	}
	for _, expected := range []string{"CUSTOM_VALUE=app-value", "DP_WORK_DIR=" + workDir, "DATA_PATH=" + filepath.Join(workDir, "data")} {
		if !strings.Contains(status.Log, expected) {
			t.Fatalf("helper log missing %q: %q", expected, status.Log)
		}
	}
	if os.Getenv("PATH") != before || os.Getenv("CUSTOM_VALUE") != "parent-value" || os.Getenv(function.EnvWorkDir) != "parent-work-dir" {
		t.Fatal("GUI process environment changed")
	}
}

func TestProcessCommandUsesChildPath(t *testing.T) {
	t.Setenv("DPANEL_TEST_HELPER", "1")
	t.Setenv("DPANEL_TEST_MODE", "path")
	service := testService(t)
	option := process.RunOption{
		WorkDir:      t.TempDir(),
		StartCommand: fmt.Sprintf("%q -test.run=TestProcessHelper$", filepath.Base(os.Args[0])),
		Environment:  []string{"PATH=" + filepath.Dir(os.Args[0])},
	}
	if !service.Run("path-helper", option) {
		t.Fatal("helper was not found using the child PATH")
	}
	status := waitForProcessExit(t, service, "path-helper")
	if status.Status != process.StatusStopped || !strings.Contains(status.Log, "PATH_HELPER_OK") {
		t.Fatalf("helper status = %q, log = %q", status.Status, status.Log)
	}
}

func testService(t *testing.T) *process.ProcessService {
	t.Helper()
	service := process.New(&process.Config{})
	t.Cleanup(func() { _ = service.ServiceShutdown() })
	return service
}

func testOption(t *testing.T) process.RunOption {
	t.Helper()
	return process.RunOption{WorkDir: t.TempDir(), StartCommand: fmt.Sprintf("%q -test.run=TestProcessHelper$", os.Args[0])}
}

func waitForProcessExit(t *testing.T, service *process.ProcessService, name string) process.ProcessEventMessage {
	t.Helper()
	deadline := time.After(5 * time.Second)
	for {
		status := service.GetProcessStatus(name)
		if status.Status == process.StatusStopped || status.Status == process.StatusError {
			return status
		}
		select {
		case <-time.After(10 * time.Millisecond):
		case <-deadline:
			t.Fatalf("process %q did not exit; status = %q", name, status.Status)
		}
	}
}
