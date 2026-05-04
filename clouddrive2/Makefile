#
# Copyright (C) 2017-2024
#
# This is free software, licensed under the GNU General Public License v2.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=clouddrive2
PKG_VERSION:=1.0.7
PKG_RELEASE:=1

PKG_MAINTAINER:=Hannibal

include $(INCLUDE_DIR)/package.mk

ifeq ($(ARCH),x86_64)
  PKG_ARCH_Ctl:=x86_64
  PKG_HASH:=c156c2125b85c9a9e8332d708abf3b6a145da29ec2e2520b227da3079076f7e3
endif
ifeq ($(ARCH),aarch64)
  PKG_ARCH_Ctl:=aarch64
  PKG_HASH:=1f3160f4b5dd60ed5b1a96a1e6983fc66bfeffb72e5429cdb2b8a7dbc61cfce4
endif
ifeq ($(ARCH),arm)
  PKG_ARCH_Ctl:=armv7
  PKG_HASH:=ac79c8137d116c4acb809f36603da3903376c1c6abedbe29b46c39dcf56156f5
endif

define Package/clouddrive2
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Cloud Manager
  TITLE:=CloudDrive2
  URL:=https://www.clouddrive2.com/
  DEPENDS:=@(arm||aarch64||x86_64) +fuse-utils +ca-bundle
endef

define Package/clouddrive2/description
  CloudDrive2 is a cloud storage mounting tool for OpenWrt.
endef

define Download/clouddrive2
  URL:=https://github.com/cloud-fs/cloud-fs.github.io/releases/download/v$(PKG_VERSION)
  URL_FILE:=clouddrive-2-linux-$(PKG_ARCH_Ctl)-$(PKG_VERSION).tgz
  FILE:=clouddrive-2-linux-$(PKG_ARCH_Ctl)-$(PKG_VERSION).tgz
  HASH:=$(PKG_HASH)
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	tar -xzvf $(DL_DIR)/clouddrive-2-linux-$(PKG_ARCH_Ctl)-$(PKG_VERSION).tgz -C $(PKG_BUILD_DIR)/
	# Move files from subfolder to root if they exist in a subfolder
	if [ -d "$(PKG_BUILD_DIR)/clouddrive-2-linux-$(PKG_ARCH_Ctl)-$(PKG_VERSION)" ]; then \
		mv $(PKG_BUILD_DIR)/clouddrive-2-linux-$(PKG_ARCH_Ctl)-$(PKG_VERSION)/* $(PKG_BUILD_DIR)/; \
		rmdir $(PKG_BUILD_DIR)/clouddrive-2-linux-$(PKG_ARCH_Ctl)-$(PKG_VERSION); \
	fi
	ls -al $(PKG_BUILD_DIR)/
endef

define Build/Compile
endef

define Package/clouddrive2/install
	$(INSTALL_DIR) $(1)/bg/clouddrive2
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/clouddrive2.init $(1)/etc/init.d/clouddrive2
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/clouddrive2.config $(1)/etc/config/clouddrive2
	$(INSTALL_DIR) $(1)/usr/share/clouddrive2
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/clouddrive $(1)/usr/share/clouddrive2/
	cp -rf $(PKG_BUILD_DIR)/wwwroot $(1)/usr/share/clouddrive2/
endef

$(eval $(call Download,clouddrive2))
$(eval $(call BuildPackage,clouddrive2))
