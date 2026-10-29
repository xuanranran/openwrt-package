# SPDX-License-Identifier: GPL-2.0-only

define Package/netdata-plugin-logread
  $(call Package/netdata/Default)
  TITLE:=OpenWrt system and application log viewer
  DEPENDS:=+netdata
  PKGARCH:=all
endef

define Package/netdata-plugin-logread/install
	$(INSTALL_DIR) $(1)/usr/libexec/netdata/plugins.d
	$(INSTALL_BIN) ./files/logread.plugin $(1)/usr/libexec/netdata/plugins.d/logread.plugin
endef

# Parameters: package suffix, upstream component, CMake option, title, dependencies.
define NetdataPlugin
  define Package/netdata-plugin-$(1)
    $$(call Package/netdata/Default)
    TITLE:=$(4)
    DEPENDS:=+netdata $(5)
  endef

  define Package/netdata-plugin-$(1)/install
	$$(CP) $$(PKG_INSTALL_DIR)/$(2)/. $$(1)/
  endef

  CMAKE_OPTIONS += -D$(3)=$$(if $$(CONFIG_PACKAGE_netdata-plugin-$(1)),On,Off)
  ifneq ($$(CONFIG_PACKAGE_netdata-plugin-$(1)),)
    NETDATA_COMPONENTS += $(2)
  endif
  NETDATA_PACKAGES += netdata-plugin-$(1)
endef

include ./packages/collectors/process.mk
include ./packages/collectors/kernel.mk
include ./packages/collectors/network.mk
include ./packages/collectors/hardware.mk
include ./packages/collectors/scripts.mk
include ./packages/collectors/advanced.mk
include ./packages/go-collectors.mk
