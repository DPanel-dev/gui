package function

import (
	"fmt"
	"unicode"
)

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

func SplitCommandArray(command string) (string, []string, error) {
	var args []string
	var field []rune
	var quote rune
	started := false
	runes := []rune(command)
	for i := 0; i < len(runes); i++ {
		char := runes[i]
		if quote != 0 {
			if char == quote {
				if i+1 < len(runes) && runes[i+1] == quote {
					field = append(field, char)
					i++
				} else {
					quote = 0
				}
			} else {
				field = append(field, char)
			}
			continue
		}
		if char == '\'' || char == '"' {
			quote = char
			started = true
		} else if unicode.IsSpace(char) {
			if started {
				args = append(args, string(field))
				field = nil
				started = false
			}
		} else {
			field = append(field, char)
			started = true
		}
	}
	if quote != 0 {
		return "", nil, fmt.Errorf("unclosed quote in command")
	}
	if started {
		args = append(args, string(field))
	}
	if len(args) == 0 || args[0] == "" {
		return "", nil, fmt.Errorf("empty command")
	}
	return args[0], args[1:], nil
}
