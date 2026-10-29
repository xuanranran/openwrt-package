# SPDX-License-Identifier: GPL-2.0-only

DASHBOARD_SOURCE:=$(PKG_NAME)-dashboard-v$(PKG_VERSION).tar.gz
DASHBOARD_SOURCE_URL:=https://app.netdata.cloud
DASHBOARD_HASH:=skip

define Download/netdata-dashboard
	FILE:=$(DASHBOARD_SOURCE)
	URL:=$(DASHBOARD_SOURCE_URL)
	URL_FILE:=agent.tar.gz
	HASH:=$(DASHBOARD_HASH)
endef
ifneq ($(CONFIG_PACKAGE_netdata-dashboard-v3),)
$(eval $(call Download,netdata-dashboard))
endif

define Package/netdata-dashboard-v3
  $(call Package/netdata/Default)
  TITLE:=Local Netdata V3 dashboard
  DEPENDS:=+netdata
  PKGARCH:=all
endef

define Package/netdata-dashboard-v3/install
	$(INSTALL_DIR) $(1)/usr/share/netdata/web
	$(TAR) -xzf $(DL_DIR)/$(DASHBOARD_SOURCE) \
		-C $(1)/usr/share/netdata/web --strip-components=2 dist/agent
	find $(1)/usr/share/netdata/web/v3 -name '*.map' -delete
	$(INSTALL_DATA) ./files/web-index.html $(1)/usr/share/netdata/web/index.html
endef
