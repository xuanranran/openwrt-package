# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk

PKG_VERSION:=0.3.1
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only

LUCI_TITLE:=Per-device internet access schedules
LUCI_DEPENDS:=+luci-base +luci-mod-network +firewall4 +flock +ucode-mod-rtnl
LUCI_PKGARCH:=all
LUCI_MINIFY_CSS:=0

define Package/luci-app-device-access/conffiles
/etc/config/device_access
endef

define Build/Prepare/luci-app-device-access
	chmod 0755 $(PKG_BUILD_DIR)/root/etc/init.d/device_access \
		$(PKG_BUILD_DIR)/root/usr/libexec/device-access
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
