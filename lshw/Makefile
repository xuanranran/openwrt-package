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
PKG_SOURCE_DATE:=2026-08-05
PKG_SOURCE_VERSION:=50895cca394621b4014a11b78f2b6b78f353631f
PKG_MIRROR_HASH:=1d39ec731d62574cc715d5abd2e973bbb1a6c649647dde72aa5a79bdcb559979

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
