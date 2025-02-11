include $(TOPDIR)/rules.mk

PKG_NAME:=vlmcsd
PKG_VERSION:=2023.7.28
PKG_RELEASE:=1

PKG_BUILD_PARALLEL:=1
PKG_MAINTAINER:=sbwml <admin@cooluc.com>

include $(INCLUDE_DIR)/package.mk

define Package/vlmcsd
  SECTION:=net
  CATEGORY:=Network
  TITLE:=KMS Emulator in C
  URL:=https://github.com/Wind4/vlmcsd
  DEPENDS:=+libpthread
endef

define Package/vlmcsd/description
  vlmcsd is an open-source KMS (Key Management Service) server emulator that allows
  for the activation of Microsoft products such as Windows and Office within a local network,
  without needing to connect to Microsoft's official KMS servers.
endef

define Package/vlmcsd/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/vlmcsd $(1)/usr/bin/vlmcsd
	$(INSTALL_DIR) $(1)/etc/vlmcsd
	$(INSTALL_BIN) ./files/vlmcsd.ini $(1)/etc/vlmcsd/vlmcsd.ini
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/vlmcsd.config $(1)/etc/config/vlmcsd
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/vlmcsd.init $(1)/etc/init.d/vlmcsd
endef

$(eval $(call BuildPackage,vlmcsd))
