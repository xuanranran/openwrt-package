# SPDX-License-Identifier: GPL-2.0-only

define Package/netdata-tools-log2journal
  $(call Package/netdata/Default)
  TITLE:=Tools: convert text logs to journal export format
  DEPENDS:=+netdata +libpcre2
endef

define Package/netdata-tools-log2journal/install
	$(CP) $(PKG_INSTALL_DIR)/tools-log2journal/. $(1)/
endef

ifneq ($(CONFIG_PACKAGE_netdata-tools-log2journal),)
NETDATA_COMPONENTS+=tools-log2journal
endif
PKG_CONFIG_DEPENDS+=CONFIG_PACKAGE_netdata-tools-log2journal
NETDATA_PACKAGES+=netdata-tools-log2journal
