# SPDX-License-Identifier: GPL-2.0-only

NETDATA_SQLITE_SOURCE:=sqlite-src-3530400.zip
NETDATA_EBPF_SOURCE:=netdata-ebpf-co-re-glibc-v1.7.0.3.tar.xz

define Download/netdata-sqlite
  FILE:=$(NETDATA_SQLITE_SOURCE)
  URL:=https://www.sqlite.org/2026
  HASH:=d18fa15aec74d8c17e1463f861095adc01b5ad190256acb4f91d22f0368d232b
endef
$(eval $(call Download,netdata-sqlite))

define Download/netdata-ebpf-core
  FILE:=$(NETDATA_EBPF_SOURCE)
  URL:=https://github.com/netdata/ebpf-co-re/releases/download/v1.7.0.3
  HASH:=b6363b308db6aa0bc637acacc7a3b3faafce13e5026a15b9e5764dc3a16e88d7
endef
ifneq ($(CONFIG_PACKAGE_netdata-plugin-ebpf),)
$(eval $(call Download,netdata-ebpf-core))
endif

PKG_BUILD_DEPENDS+=NETDATA_FEED_TOOLCHAINS:tcl/host
CMAKE_OPTIONS+= \
	-DSQLITE_SOURCE_ARCHIVE=$(DL_DIR)/$(NETDATA_SQLITE_SOURCE) \
	-DEBPF_CORE_SOURCE_ARCHIVE=$(DL_DIR)/$(NETDATA_EBPF_SOURCE) \
	-DNETDATA_HOST_CC:STRING="$(HOSTCC)" \
	-DNETDATA_HOST_CFLAGS:STRING="$(HOST_CFLAGS)" \
	-DNETDATA_HOST_LDFLAGS:STRING="$(HOST_LDFLAGS)"
