# See /LICENSE for more information.
# This is free software, licensed under the GNU General Public License v3.

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for OTA upgrade
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+otahelper +jsonfilter
PKG_VERSION:=1.3
PKG_RELEASE:=1
PKG_MAINTAINER:=jjm2473 <jjm2473@gmail.com> \
		sbwml <admin@cooluc.com>

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
