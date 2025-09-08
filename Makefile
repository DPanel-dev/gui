PROJECT_NAME=dpanel-desktop

help:
	@echo "make build"
	@echo "make test VERSION="
	@echo "make all r1 r2 VERSION="
	@echo "make clean"

run:
	wails3 dev
generate-bindings:
	wails3 generate bindings -i -ts