.PHONY: test bins clean
PROJECT_ROOT = github.com/uber-common/cadence-samples

export PATH := $(GOPATH)/bin:$(PATH)

# default target
default: test

PROGS = pizzaactivity

TEST_ARG ?= -race -v -timeout 5m
BUILD := ./build
SAMPLES_DIR=./cmd/samples

export PATH := $(GOPATH)/bin:$(PATH)

# Automatically gather all srcs
ALL_SRC := $(shell find ./cmd/samples/common -name "*.go")

# all directories with *_test.go files in them
TEST_DIRS=

pizzaactivity:
	go build -i -o bin/pizzaactivity cmd/samples/recipes/pizzaactivity/*.go

bins: pizzaactivity

test: bins
	@rm -f test
	@rm -f test.log
	@echo $(TEST_DIRS)
	@for dir in $(TEST_DIRS); do \
		go test -coverprofile=$@ "$$dir" | tee -a test.log; \
	done;

clean:
	rm -rf bin
	rm -Rf $(BUILD)
