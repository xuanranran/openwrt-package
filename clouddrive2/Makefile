#
# Copyright (C) 2017-2024
#
# This is free software, licensed under the GNU General Public License v2.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=clouddrive2
PKG_VERSION:=0.9.23
PKG_RELEASE:=1

PKG_MAINTAINER:=Hannibal

include $(INCLUDE_DIR)/package.mk

ifeq ($(ARCH),x86_64)
  PKG_ARCH_Ctl:=x86_64
  PKG_HASH:=40335f480f4312b112d50aeb790c85669804bf4b6068c6a8d6fb257bf8c761b7
endif
ifeq ($(ARCH),aarch64)
  PKG_ARCH_Ctl:=aarch64
  PKG_HASH:=dddbf3149b282a112099212a4f0eda2b8ebacdec5441e4c3904d17a985580e86
endif
ifeq ($(ARCH),arm)
  PKG_ARCH_Ctl:=armv7
  PKG_HASH:=79130a9d9a73ff2017c1f6819325a0131ccb35e9d9240be11a51d283ae0c6c23
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
