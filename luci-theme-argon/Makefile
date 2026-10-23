#
# Copyright (C) 2008-2019 Jerrykuku
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Argon Theme
LUCI_DEPENDS:=+luci-base +curl +jsonfilter +ucode-mod-math +flock
PKG_VERSION:=3.1.0
PKG_RELEASE:=20261023
PKG_LICENSE:=Apache-2.0 MIT

# Keep styles intact and ship template source across stable/snapshot runtimes.
CONFIG_LUCI_CSSTIDY:=
CONFIG_LUCI_UTMIN:=
LUCI_MINIFY_UT:=0

define Package/luci-theme-argon/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	uci -q delete luci.themes.Argon
	uci set luci.main.mediaurlbase='/luci-static/bootstrap'
	uci commit luci
}
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
