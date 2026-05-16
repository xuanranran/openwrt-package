#
# Copyright (C) 2008-2024 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=netdata
PKG_VERSION:=2.10.3
PKG_RELEASE:=1

PKG_MAINTAINER:=Josef Schlehofer <pepe.schlehofer@gmail.com>, Daniel Engberg <daniel.engberg.lists@pyret.net>
PKG_LICENSE:=GPL-3.0-or-later
PKG_LICENSE_FILES:=COPYING
PKG_CPE_ID:=cpe:/a:netdata:netdata

PKG_SOURCE:=$(PKG_NAME)-v$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://github.com/netdata/netdata/releases/download/v$(PKG_VERSION)
PKG_HASH:=d7f178b89dc327f4f761aeaf5bd6e76a13ba220497c64c30f587f98ddc65b42b
PKG_BUILD_DIR=$(BUILD_DIR)/$(PKG_NAME)-v$(PKG_VERSION)

DASHBOARD_SOURCE:=$(PKG_NAME)-dashboard-v$(PKG_VERSION).tar.gz
DASHBOARD_SOURCE_URL:=https://app.netdata.cloud
DASHBOARD_HASH:=0a175680392e20c2bb9737c31f4610d4169a144ef93cd60b0626e3d9a23ecda7

PKG_INSTALL:=1
PKG_BUILD_PARALLEL:=1
PKG_BUILD_FLAGS:=no-mips16 gc-sections

PKG_BUILD_DEPENDS:=protobuf/host

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/cmake.mk
include $(INCLUDE_DIR)/nls.mk

define Download/netdata-dashboard
	FILE:=$(DASHBOARD_SOURCE)
	URL:=$(DASHBOARD_SOURCE_URL)
	URL_FILE:=agent.tar.gz
	HASH:=$(DASHBOARD_HASH)
endef
$(eval $(call Download,netdata-dashboard))

define Package/netdata
  SECTION:=admin
  CATEGORY:=Administration
  DEPENDS:=+zlib +libstdcpp +libuuid +libuv +libmnl +liblz4 +libjson-c +libyaml +libopenssl +libcurl +protobuf +libzstd
  TITLE:=Real-time performance monitoring tool
  URL:=https://www.netdata.cloud/
endef

define Package/netdata/description
  netdata is a highly optimized Linux daemon providing real-time performance
  monitoring for Linux systems, applications and SNMP devices over the web.

  If you want to use Python plugins install python3, python3-yaml and
  python3-urllib3
endef

define Package/netdata-dashboard-v3
  SECTION:=admin
  CATEGORY:=Administration
  DEPENDS:=+netdata
  TITLE:=Local Netdata v3 dashboard
  URL:=https://www.netdata.cloud/
endef

define Package/netdata-dashboard-v3/description
  Local v3 dashboard assets for the Netdata web UI.
endef

TARGET_CFLAGS := $(filter-out -O%,$(TARGET_CFLAGS)) -O3
TARGET_LDFLAGS += -L$(STAGING_DIR)/usr/lib

CMAKE_OPTIONS += \
	-DCMAKE_INSTALL_PREFIX="/" \
	-DCMAKE_CROSSCOMPILING=True \
	-DProtobuf_PROTOC_EXECUTABLE=$(STAGING_DIR_HOSTPKG)/bin/protoc \
	-DENABLE_DASHBOARD=Off \
	-DENABLE_DBENGINE=On \
	-DENABLE_EXPORTER_PROMETHEUS_REMOTE_WRITE=Off \
	-DENABLE_EXPORTER_MONGODB=Off \
	-DENABLE_H2O=Off \
	-DENABLE_LIBBACKTRACE=Off \
	-DENABLE_LIBUNWIND=Off \
	-DENABLE_LOGS_MANAGEMENT_TESTS=Off \
	-DENABLE_ML=Off \
	-DENABLE_PLUGIN_APPS=Off \
	-DENABLE_PLUGIN_IBM=Off \
	-DENABLE_PLUGIN_CGROUP_NETWORK=Off \
	-DENABLE_PLUGIN_CUPS=Off \
	-DENABLE_PLUGIN_DEBUGFS=Off \
	-DENABLE_PLUGIN_EBPF=Off \
	-DENABLE_PLUGIN_FREEIPMI=Off \
	-DENABLE_PLUGIN_GO=Off \
	-DENABLE_PLUGIN_LOCAL_LISTENERS=Off \
	-DENABLE_PLUGIN_LOGS_MANAGEMENT=Off \
	-DENABLE_PLUGIN_NETWORK_VIEWER=Off \
	-DENABLE_PLUGIN_NFACCT=Off \
	-DENABLE_PLUGIN_OTEL=Off \
	-DENABLE_PLUGIN_OTEL_SIGNAL_VIEWER=Off \
	-DENABLE_PLUGIN_PERF=Off \
	-DENABLE_PLUGIN_SCRIPTS=Off \
	-DENABLE_PLUGIN_SLABINFO=Off \
	-DENABLE_PLUGIN_SYSTEMD_JOURNAL=Off \
	-DENABLE_PLUGIN_SYSTEMD_UNITS=Off \
	-DENABLE_PLUGIN_XENSTAT=Off \
	-DENABLE_SYSTEMD_DBUS=Off \
	-DENABLE_WEBRTC=Off

define Package/netdata/conffiles
/etc/netdata/
endef

define Package/netdata/install
	#netdata binary
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/sbin/netdata $(1)/usr/sbin

	#netdata libs
	$(INSTALL_DIR) $(1)/usr/lib/netdata
	$(CP) $(PKG_INSTALL_DIR)/usr/lib/netdata/conf.d $(1)/usr/lib/netdata

	#netdata plugins
	$(INSTALL_DIR) $(1)/usr/libexec/netdata
	$(CP) $(PKG_INSTALL_DIR)/usr/libexec/netdata/charts.d $(1)/usr/libexec/netdata
	$(CP) $(PKG_INSTALL_DIR)/usr/libexec/netdata/plugins.d $(1)/usr/libexec/netdata
	$(CP) $(PKG_INSTALL_DIR)/usr/libexec/netdata/python.d $(1)/usr/libexec/netdata

	#netdata configuration
	$(INSTALL_DIR) $(1)/etc/netdata
	$(CP) $(PKG_INSTALL_DIR)/etc/netdata $(1)/etc
	$(INSTALL_DATA) ./files/netdata.conf $(1)/etc/netdata
	touch $(1)/etc/netdata/.opt-out-from-anonymous-statistics
	touch $(1)/etc/netdata/claim.conf
	chmod 640 $(1)/etc/netdata/claim.conf
	
	#netdata init
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/netdata.init $(1)/etc/init.d/netdata

endef

define Package/netdata-dashboard-v3/install
	$(INSTALL_DIR) $(1)/usr/share/netdata/web
	$(TAR) -xzf $(DL_DIR)/$(DASHBOARD_SOURCE) \
		-C $(1)/usr/share/netdata/web \
		--strip-components=2 \
		dist/agent
	find $(1)/usr/share/netdata/web/v3 -name '*.map' -delete
	$(INSTALL_DATA) ./files/web-index.html $(1)/usr/share/netdata/web/index.html
endef

$(eval $(call BuildPackage,netdata))
$(eval $(call BuildPackage,netdata-dashboard-v3))
