package function

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
)

// BuildRunEnv applies DPanel directory variables and app overrides to the parent environment.
func BuildRunEnv(workDir string, overrides []string) ([]string, error) {
	values := make(map[string]string)
	for _, entry := range os.Environ() {
		name, value, ok := splitEnvironmentEntry(entry)
		if ok {
			values[environmentKey(name)] = value
		}
	}

	variables := make([]string, 0, len(overrides)+2)
	variables = append(variables, EnvWorkDir+"="+workDir, EnvHomeDir+"="+os.Getenv(EnvHomeDir))
	variables = append(variables, overrides...)
	parsed, err := godotenv.Unmarshal(strings.Join(variables, "\n"))
	if err != nil {
		return nil, err
	}
	for name, value := range parsed {
		values[environmentKey(name)] = value
	}

	pathKey := environmentKey("PATH")
	if values[pathKey] == "" {
		values[pathKey] = workDir
	} else {
		values[pathKey] += string(os.PathListSeparator) + workDir
	}

	keys := make([]string, 0, len(values))
	for name := range values {
		keys = append(keys, name)
	}
	sort.Strings(keys)
	env := make([]string, 0, len(keys))
	for _, name := range keys {
		env = append(env, name+"="+values[name])
	}
	return env, nil
}

// NewCommand parses a command line and prepares it with the child environment.
func NewCommand(ctx context.Context, workDir, command string, env []string) (*exec.Cmd, error) {
	name, args, err := SplitCommandArray(command)
	if err != nil {
		return nil, err
	}
	cmd := exec.CommandContext(ctx, commandPath(workDir, name, env), args...)
	cmd.Dir = workDir
	cmd.Env = env
	configureCommand(cmd)
	return cmd, nil
}

func commandPath(workDir, name string, env []string) string {
	if filepath.IsAbs(name) {
		return name
	}
	if strings.ContainsAny(name, `/\`) {
		return filepath.Join(workDir, name)
	}

	// Bundled programs in WorkDir take precedence over PATH entries.
	directories := append([]string{workDir}, filepath.SplitList(environmentValue(env, "PATH"))...)
	pathExt := environmentValue(env, "PATHEXT")
	for _, directory := range directories {
		if directory == "" {
			continue
		}
		if !filepath.IsAbs(directory) {
			directory = filepath.Join(workDir, directory)
		}
		candidate := filepath.Join(directory, name)
		for _, path := range executableCandidates(candidate, name, pathExt) {
			if info, err := os.Stat(path); err == nil && !info.IsDir() && isExecutable(info) {
				return path
			}
		}
	}
	return filepath.Join(workDir, name)
}

func environmentValue(env []string, key string) string {
	key = environmentKey(key)
	for _, entry := range env {
		name, value, ok := splitEnvironmentEntry(entry)
		if ok && environmentKey(name) == key {
			return value
		}
	}
	return ""
}

func splitEnvironmentEntry(entry string) (string, string, bool) {
	separator := strings.IndexByte(entry, '=')
	if separator == 0 {
		// Windows also exposes drive-directory entries such as =C:=C:\\work.
		next := strings.IndexByte(entry[1:], '=')
		if next < 0 {
			return "", "", false
		}
		separator = next + 1
	}
	if separator < 0 {
		return "", "", false
	}
	return entry[:separator], entry[separator+1:], true
}
