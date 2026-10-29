include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Sub-Store (Subscription Manager)
LUCI_DEPENDS:=+node +unzip +wget-ssl

PKG_NAME:=luci-app-substore
PKG_VERSION:=2026.10.10
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=xiaohaisly

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-substore/install
	sh $(CURDIR)/scripts/package-install.sh $(1) $(CURDIR)
endef

define Package/luci-app-substore/conffiles
/etc/config/substore
/etc/sub-store
endef

define Package/luci-app-substore/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/usr/libexec/substore/postinstall.sh
exit 0
endef

$(eval $(call BuildPackage,luci-app-substore))
