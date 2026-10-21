.PHONY: build test soak fmt lint deploy

build:
	stellar contract build

# Builds first so the wasm tests run against current source.
test: build
	cargo test -- --include-ignored

# Longer random run of the model test.
soak:
	MODEL_SEEDS=300 cargo test model

fmt:
	cargo fmt --all

lint:
	cargo fmt --all -- --check
	cargo clippy --all-targets -- -D warnings

deploy:
	./scripts/deploy.sh
