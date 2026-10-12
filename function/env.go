package function

const EnvWorkDir = "DP_WORK_DIR"
const EnvHomeDir = "DP_HOME_DIR"

type Response struct {
	Error string
	Data  any
}

func Error(err error) *Response {
	if err == nil {
		return nil
	}
	return &Response{
		Error: err.Error(),
	}
}

func Result(data any) *Response {
	return &Response{
		Data: data,
	}
}
