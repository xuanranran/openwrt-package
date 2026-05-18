#
# Map package architecture names to Rust musl target triples.
#

RUST_CARGO_TARGET:=

RUST_TARGET_x86_64:=x86_64-unknown-linux-musl
RUST_TARGET_armv7l:=armv7-unknown-linux-musleabihf
RUST_TARGET_armv6l:=arm-unknown-linux-musleabihf
RUST_TARGET_aarch64:=aarch64-unknown-linux-musl
RUST_TARGET_loongarch64:=loongarch64-unknown-linux-musl

RUST_CARGO_TARGET:=$(RUST_TARGET_$(ARCH))
