include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Support for Reconya
LUCI_DEPENDS:=+reconya
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-reconya
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

include $(TOPDIR)/feeds/luci/luci.mk

$(eval $(call BuildPackage,$(PKG_NAME)))