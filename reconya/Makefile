include $(TOPDIR)/rules.mk

PKG_NAME:=reconya
PKG_VERSION:=0.23.0
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/Dyneteq/reconya.git
PKG_MIRROR_HASH:=skip
PKG_SOURCE_VERSION:=dd3fb55f6f59a076d5465b72c08d34b3db1f5e7b

PKG_MAINTAINER:=Developer
PKG_LICENSE:=CC-BY-NC-4.0

PKG_BUILD_DEPENDS:=golang/host
include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-values.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/reconya
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Network reconnaissance and asset discovery tool
  DEPENDS:=$(GO_ARCH_DEPENDS) +nmap +sqlite3-cli
  URL:=https://github.com/Dyneteq/reconya
endef

define Package/reconya/description
  Reconya discovers and monitors devices on your network with real-time updates using Go and HTMX.
endef

GO_PKG_BUILD_PKG:=reconya-ai/cmd
GO_PKG_SOURCE_ROOT:=$(PKG_BUILD_DIR)/backend

define Package/reconya/install
	$(call GoPackage/Package/Install/Bin,$(1))
	$(INSTALL_DIR) $(1)/usr/share/reconya/static
	$(INSTALL_DIR) $(1)/usr/share/reconya/templates
	$(CP) $(PKG_BUILD_DIR)/backend/static/* $(1)/usr/share/reconya/static/
	$(CP) $(PKG_BUILD_DIR)/backend/templates/* $(1)/usr/share/reconya/templates/
	
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/reconya.config $(1)/etc/config/reconya
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/reconya.init $(1)/etc/init.d/reconya
endef

$(eval $(call GoPackage,$(PKG_NAME)))
$(eval $(call BuildPackage,$(PKG_NAME)))