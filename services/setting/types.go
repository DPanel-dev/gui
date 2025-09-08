package setting

type Config struct {
	WorkDir string
}

type System struct {
	AutoLaunch      bool
	CloseWindowHide bool
	Theme           string
}

type App struct {
	Name        string
	Environment []EnvironmentItem
	CommandName string
	Args        []string
	AutoRun     bool
}

type AllConfig struct {
	System System
	Apps   []App
}

type EnvironmentLabelItem struct {
	ZhCN string
	EnUS string
}

type EnvironmentItem struct {
	Name  string
	Value string
	Label EnvironmentLabelItem
}
