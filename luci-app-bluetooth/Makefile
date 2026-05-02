# See /LICENSE for more information.
# This is free software, licensed under the GNU General Public License v3.

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for bluetooth
LUCI_DEPENDS:=+luci-base +bluez-daemon +bluez-alsa +bluez-alsa-utils +expect
LUCI_PKGARCH:=all

PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=sbwml <admin@cooluc.com>

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
