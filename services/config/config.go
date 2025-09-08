package config

type System struct {
	AutoLaunch      bool   `json:"autoLaunch"`
	CloseWindowHide bool   `json:"closeWindowHide"`
	Theme           string `json:"theme"`
	AutoOpenAppUrl  bool   `json:"autoOpenAppUrl"`
}

type App struct {
	Env     []string `json:"env"`
	Command string   `json:"command"`
	Args    []string `json:"args"`
}
