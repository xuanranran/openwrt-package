# SPDX-License-Identifier: GPL-2.0-only

define Package/netdata
  $(call Package/netdata/Default)
  TITLE:=Real-time performance monitoring agent
  DEPENDS:=+zlib +libstdcpp +libuuid +libuv +libmnl +liblz4 +libjson-c +libyaml +libopenssl +libcurl +protobuf +libzstd +NETDATA_LIBUNWIND:libunwind
endef

define Package/netdata/config
  source "$(SOURCE)/Config.in"
endef

define Package/netdata/description
  Netdata agent with built-in system collectors, database and cloud support.
  Install dashboard and collector packages separately as needed.
endef

define Package/netdata/install
	$(CP) $(PKG_INSTALL_DIR)/netdata/usr $(1)/
	$(INSTALL_DATA) ./files/netdata.conf $(1)/usr/lib/netdata/conf.d/netdata.conf.openwrt
	$(SHELL) ./files/render-config $(1)/usr/lib/netdata/conf.d/netdata.conf.openwrt \
		$(foreach feature,$(filter-out EXPORTING,$(NETDATA_RUNTIME_FEATURES)),$(feature)=$(if $(CONFIG_NETDATA_RUNTIME_$(feature)),yes,no))
	$(SHELL) ./files/render-config $(1)/usr/lib/netdata/conf.d/exporting.conf EXPORTING=$(if $(CONFIG_NETDATA_RUNTIME_EXPORTING),yes,no)
	$(if $(CONFIG_NETDATA_DBENGINE),true,sed -i 's/db = dbengine/db = ram/' $(1)/usr/lib/netdata/conf.d/netdata.conf.openwrt)
	$(INSTALL_DIR) $(1)/etc/netdata $(1)/etc/init.d $(1)/lib/upgrade/keep.d
	$(INSTALL_BIN) ./files/netdata.init $(1)/etc/init.d/netdata
	$(INSTALL_DATA) ./files/netdata.sysupgrade $(1)/lib/upgrade/keep.d/netdata
endef

define Package/netdata/postinst
$(file <./files/netdata.postinst)
endef
