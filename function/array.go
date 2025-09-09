package function

import "strings"

func PluckArrayWalk[T interface{}, R interface{}](v []T, walk func(i T) (R, bool)) []R {
	result := make([]R, 0)
	for _, item := range v {
		newItem, ok := walk(item)
		if ok {
			result = append(result, newItem)
		}
	}
	return result
}

func PluckArrayItemWalk[T interface{}](v []T, walk func(item T) bool) (T, bool) {
	var result T
	for _, item := range v {
		if ok := walk(item); ok {
			return item, true
		}
	}
	return result, false
}

func SplitCommandArray(cmd string) []string {
	result := make([]string, 0)
	field := ""
	ignoreSpace := false
	for _, s := range strings.Split(cmd, "") {
		if s == " " && !ignoreSpace {
			result = append(result, field)
			field = ""
			continue
		}
		if s == "\"" || s == "'" {
			ignoreSpace = !ignoreSpace
			continue
		}
		field += s
	}
	if field != "" {
		result = append(result, field)
	}
	return result
}
