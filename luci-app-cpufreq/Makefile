# SPDX-License-Identifier: GPL-3.0-only
#
# Copyright (C) 2021 ImmortalWrt.org

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI for CPU Freq Setting
LUCI_DEPENDS:=@TARGET_rockchip +irqbalance +luci-compat +kmod-hwmon-pwmfan

PKG_NAME:=luci-app-cpufreq
PKG_VERSION:=1.1
PKG_RELEASE:=1

define Package/$(PKG_NAME)/conffiles
/etc/config/cpufreq
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
