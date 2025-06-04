#
# Copyright (C) 2007-2016 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=lshw
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/lyonel/lshw.git
PKG_SOURCE_DATE:=2023-03-20
PKG_SOURCE_VERSION:=b4e067307906ec6f277cce5c8a882f5edd03cbbc
PKG_MIRROR_HASH:=947b521cbeabd991480e3f952dc148eef07d03cc5d797a3fb438c2978092e8bb

PKG_MAINTAINER:=sbwml <admin@cooluc.com>
PKG_LICENSE:=GPL-2.0
PKG_LICENSE_FILES:=LICENSE

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=lshw
  URL:=http://lshw.ezix.org
  DEPENDS:=+libstdcpp
endef

define Package/$(PKG_NAME)/description
  HardWare LiSter for Linux
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/src/lshw $(1)/usr/bin/lshw
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
