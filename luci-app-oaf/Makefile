#
# Copyright (C) 2026 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-oaf
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=sbwml <admin@cooluc.com>
PKG_LICENSE:=GPL-3.0-or-later

LUCI_TITLE:=LuCI support for OAF
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+appfilter

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
