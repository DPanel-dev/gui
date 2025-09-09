package tests

import (
	"bufio"
	"context"
	"fmt"
	"github.com/joho/godotenv"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestCommand(t *testing.T) {
	path := "D:\\Workspace\\dpanel-gui-wails-v3\\bin\\nginx-1.29.1\\nginx.exe"
	rootPath := "D:\\Workspace\\dpanel-gui-wails-v3\\bin\\"
	println(path)
	cmd := exec.Command(path)
	if !filepath.IsAbs(path) {
		cmd.Dir = rootPath
	} else {
		cmd.Dir = filepath.Dir(path)
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		panic(err)
	}
	println(string(out))
}

func TestEnv(t *testing.T) {
	appEnv := []string{
		"DP_WORK_DIR=/User/test",
		"APP_SERVER_PORT1=8086",
		"STORAGE_LOCAL_PATH=${DP_WORK_DIR}/data",
	}
	//runEnv := os.Environ()
	appEnvMap, err := godotenv.Unmarshal(strings.Join(appEnv, "\n"))
	if err != nil {
		panic(err)
	}
	envStr, err := godotenv.Marshal(appEnvMap)
	if err != nil {
		panic(err)
	}
	fmt.Printf("TestEnv %v \n", envStr)

	a := "http://127.0.0.1:${APP_SERVER_PORT}"
	fmt.Printf("TestEnv %v \n", os.Expand(a, func(s string) string {
		return appEnvMap[s]
	}))
	fmt.Printf("TestEnv %v \n", a)
}

func TestRunProcess(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer func() {
		cancel()
	}()
	cmd := exec.CommandContext(ctx, "/Users/renchao/Workspace/go/dpanel/bin/dpanel")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		panic(err)
	}
	cmd.Stderr = cmd.Stdout
	if err = cmd.Start(); err != nil {
		panic(err)
	}
	go func() {
		err := cmd.Wait()
		if err != nil {
			fmt.Printf("Anonymous function %v \n", err)
		}
	}()

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasSuffix(line, "\n") {
			line = line + "\n"
		}
		fmt.Printf("TestRunProcess %v \n", line)
	}

}
