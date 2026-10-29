# SPDX-License-Identifier: GPL-2.0-only

NETDATA_GO_SELECTED:=$(strip $(foreach p,go scripts statsd,$(CONFIG_PACKAGE_netdata-plugin-$(p))))
NETDATA_RUST_SELECTED:=$(strip $(foreach p,otel netflow systemd-journal,$(CONFIG_PACKAGE_netdata-plugin-$(p))))

# DUMP scans do not load .config; keep conditional dependencies discoverable.
PKG_BUILD_DEPENDS+=$(foreach p,go scripts statsd,PACKAGE_netdata-plugin-$(p)&&NETDATA_FEED_TOOLCHAINS:golang1.27/host)
PKG_BUILD_DEPENDS+=$(foreach p,otel netflow systemd-journal,PACKAGE_netdata-plugin-$(p)&&NETDATA_FEED_TOOLCHAINS:rust/host)

ifneq ($(NETDATA_GO_SELECTED),)
include $(TOPDIR)/feeds/packages/lang/golang/golang-values.mk
NETDATA_GO_ROOT:=$(if $(CONFIG_NETDATA_EXTERNAL_TOOLCHAINS),$(NETDATA_GO_ROOT),$(STAGING_DIR_HOSTPKG)/lib/go-1.27)
export GOROOT:=$(NETDATA_GO_ROOT)
export GOOS:=linux
export GOARCH:=$(GO_ARCH)
export GOARM:=$(GO_ARM)
export GOARM64:=$(GO_ARM64)
export GOMIPS:=$(GO_MIPS)
export GOMIPS64:=$(GO_MIPS64)
export GOTOOLCHAIN:=local
export GOCACHE:=$(TMP_DIR)/netdata-go-build
export GOMODCACHE:=$(DL_DIR)/go-mod-cache
export CC:=$(TARGET_CC)
export CXX:=$(TARGET_CXX)
endif

ifneq ($(NETDATA_RUST_SELECTED),)
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk
CMAKE_OPTIONS+=-DRust_CARGO_TARGET=$(RUSTC_TARGET_ARCH)
NETDATA_RUSTC:=$(if $(CONFIG_NETDATA_EXTERNAL_TOOLCHAINS),$(NETDATA_RUSTC),$(STAGING_DIR)/host/bin/rustc)
NETDATA_CARGO:=$(if $(CONFIG_NETDATA_EXTERNAL_TOOLCHAINS),$(NETDATA_CARGO),$(STAGING_DIR)/host/bin/cargo)
CMAKE_OPTIONS+=-DRust_COMPILER=$(NETDATA_RUSTC) -DRust_CARGO=$(NETDATA_CARGO) -DRust_RESOLVE_RUSTUP_TOOLCHAINS=Off
export RUSTC:=$(NETDATA_RUSTC)
export CARGO:=$(NETDATA_CARGO)
export CARGO_HOME
export CARGO_TARGET_$(RUSTC_TARGET_UPPER)_LINKER:=$(TARGET_CC_NOCACHE)
export RUSTFLAGS:=$(CARGO_RUSTFLAGS)
export CC:=$(TARGET_CC_NOCACHE)
export TARGET_CC:=$(TARGET_CC_NOCACHE)
export TARGET_CFLAGS:=$(TARGET_CFLAGS) $(RUSTC_CFLAGS)
endif

ifneq ($(NETDATA_GO_SELECTED)$(NETDATA_RUST_SELECTED),)
export PATH:=$(if $(NETDATA_GO_SELECTED),$(NETDATA_GO_ROOT)/bin:)$(STAGING_DIR)/host/bin:$(STAGING_DIR_HOSTPKG)/bin:$(PATH)
endif
