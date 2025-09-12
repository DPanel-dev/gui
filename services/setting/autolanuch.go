package setting

import (
	"errors"
	"github.com/donknap/dpanel-gui/function"
)

func (self *SettingService) GetAutoLaunchStatus() *function.Response {
	return function.Error(errors.New("only support windows"))
}

func (self *SettingService) SaveAutoLaunchStatus(status bool) *function.Response {
	return function.Error(errors.New("only support windows"))
}
