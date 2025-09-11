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
build:
	export PRODUCTION=true
	wails3 build
	# $env:PRODUCTION="true"; wails3 build
	# wails3 task windows:create:nsis:installer
clean:
	rm -rf ./bin/*