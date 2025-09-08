package function

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
