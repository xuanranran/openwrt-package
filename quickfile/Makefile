#
# Copyright (C) 2015-2016 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=quickfile
PKG_VERSION:=1.0.5
PKG_RELEASE:=1

PKG_SOURCE:=quickfile-$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://down.cooluc.com/bin/quickfile/openwrt
PKG_HASH:=95eddfc98baee63804f89475e392fa022e1d9a212f593d1c871c1a465617d96d

include $(INCLUDE_DIR)/package.mk

define Package/quickfile
	SECTION:=net
	CATEGORY:=Network
	SUBMENU:=Web Servers/Proxies
	TITLE:=Quick File Manager
	DEPENDS:=@(aarch64||x86_64)
	URL:=https://git.cooluc.com/sbwml/quickfile
endef

define Package/quickfile/description
  Lightweight web-based file manager for OpenWrt/LuCI with minimal resource usage.
endef

define Build/Compile
endef

define Package/quickfile/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/quickfile-$(ARCH_PACKAGES) $(1)/usr/bin/quickfile
	$(INSTALL_DIR) $(1)/etc/init.d $(1)/etc/nginx/conf.d
	$(INSTALL_BIN) $(CURDIR)/files/quickfile.init $(1)/etc/init.d/quickfile
	$(INSTALL_CONF) $(CURDIR)/files/quickfile.locations $(1)/etc/nginx/conf.d/quickfile.locations
endef

$(eval $(call BuildPackage,quickfile))
