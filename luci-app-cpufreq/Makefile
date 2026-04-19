#
# Copyright (C) 2026 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI for CPU Freq Setting
LUCI_DEPENDS:=@TARGET_rockchip +irqbalance +kmod-hwmon-pwmfan

PKG_NAME:=luci-app-cpufreq
PKG_VERSION:=1.2.0
PKG_RELEASE:=1

PKG_MAINTAINER:=sbwml <admin@cooluc.com>

define Package/$(PKG_NAME)/conffiles
/etc/config/cpufreq
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
