# Copyright (C) 2016 Openwrt.org
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support arp online
LUCI_DEPENDS:=+luci-base +ubus +rpcd +rpcd-mod-file
LUCI_PKGARCH:=all
PKG_NAME:=luci-app-onliner
PKG_VERSION:=2.0
PKG_RELEASE:=1

define Package/luci-app-onliner/postinst
#!/bin/sh
	rm -f /tmp/luci-indexcache
	rm -f /tmp/luci-modulecache/*
	[ -n "$${IPKG_INSTROOT}" ] || /etc/init.d/rpcd restart >/dev/null 2>&1 || true
exit 0
endef
include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
