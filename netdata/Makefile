# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk

PKG_NAME:=netdata
PKG_VERSION:=2.12.2
PKG_RELEASE:=1

PKG_MAINTAINER:=Josef Schlehofer <pepe.schlehofer@gmail.com>, Daniel Engberg <daniel.engberg.lists@pyret.net>
PKG_LICENSE:=GPL-3.0-or-later
PKG_LICENSE_FILES:=COPYING
PKG_CPE_ID:=cpe:/a:netdata:netdata

PKG_SOURCE:=$(PKG_NAME)-v$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://github.com/netdata/netdata/releases/download/v$(PKG_VERSION)
PKG_HASH:=87f2074aa99b53f2e0ad211a44e5a869a1b7175459e5edba831bb570e94c0acd
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-v$(PKG_VERSION)
PKG_INSTALL:=1
PKG_BUILD_PARALLEL:=1
PKG_BUILD_FLAGS:=no-mips16 gc-sections
PKG_BUILD_DEPENDS:=protobuf/host

NETDATA_PLUGIN_PACKAGES:=apps debugfs perf slabinfo python charts network-viewer local-listeners cgroup-network nfacct cups go scripts statsd otel netflow systemd-journal ebpf
PKG_CONFIG_DEPENDS:=$(foreach plugin,$(NETDATA_PLUGIN_PACKAGES),CONFIG_PACKAGE_netdata-plugin-$(plugin))
PKG_CONFIG_DEPENDS+=CONFIG_NETDATA_DBENGINE CONFIG_NETDATA_LIBUNWIND CONFIG_NETDATA_ML CONFIG_NETDATA_PROMETHEUS_REMOTE_WRITE CONFIG_NETDATA_WEBRTC CONFIG_NETDATA_CGROUP_LOOKUP CONFIG_NETDATA_ND_MCP
PKG_CONFIG_DEPENDS+=CONFIG_NETDATA_EXTERNAL_TOOLCHAINS
NETDATA_RUNTIME_FEATURES:=PROC DISKSPACE TIMEX CGROUPS TC IDLEJITTER HEALTH REGISTRY EXPORTING
PKG_CONFIG_DEPENDS+=$(foreach feature,$(NETDATA_RUNTIME_FEATURES),CONFIG_NETDATA_RUNTIME_$(feature))

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/cmake.mk
include $(INCLUDE_DIR)/nls.mk

define Package/netdata/Default
  SECTION:=admin
  CATEGORY:=Administration
  SUBMENU:=Netdata
  URL:=https://www.netdata.cloud/
endef

NETDATA_COMPONENTS:=netdata
NETDATA_PACKAGES:=netdata netdata-dashboard-v3 netdata-plugin-logread

include ./packages/sources.mk
include ./packages/core.mk
include ./packages/dashboard.mk
include ./packages/plugins.mk
include ./packages/tools.mk
include ./build-options.mk
include ./toolchains.mk

# Keep upstream CMake component ownership when staging the individual packages.
define Build/Install
	$(foreach component,$(NETDATA_COMPONENTS), \
		DESTDIR="$(PKG_INSTALL_DIR)/$(component)" cmake --install "$(CMAKE_BINARY_DIR)" --component "$(component)" || exit 1;)
endef

$(foreach package,$(NETDATA_PACKAGES),$(eval $(call BuildPackage,$(package))))
