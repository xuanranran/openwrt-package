include $(TOPDIR)/rules.mk

PKG_NAME:=gecoosac
PKG_VERSION:=2.2.20250912
PKG_RELEASE:=1

ifeq ($(ARCH),aarch64)
  PKG_ARCH:=ac_linux_arm64
  PKG_HASH:=157bef7afc7eb7dc6164cddafe26fd39f58cf9d42d27446300bf5324b13dd15a
else ifeq ($(ARCH),arm)
  PKG_ARCH:=ac_linux_arm
  PKG_HASH:=b41fbc425aa7475576288aaceec4c1f96bda68e1d19208882f57c14187f2ef25
else ifeq ($(ARCH),mips)
  PKG_ARCH:=ac_linux_mips
  PKG_HASH:=9b1d2b23b648d0f8727918dd7153550f09a5b3738e37e145ec754e6d1f0c46eb
else ifeq ($(ARCH),mipsel)
  PKG_ARCH:=ac_linux_mipsle
  PKG_HASH:=34a49be0d864cc181e0bda4ef512106309ed452f861e5fbf298f36adea8d7aef
else ifeq ($(ARCH),i386)
  PKG_ARCH:=ac_linux_386
  PKG_HASH:=3628fe472212bd6d6898ca36747e28c22abdbb16680d9d8e421e269bdd87bc2b
else ifeq ($(ARCH),x86_64)
  PKG_ARCH:=ac_linux_amd64
  PKG_HASH:=e48187be75bdfae082b52a2d8c75be3b039f1d739ed0a184dbab073e2daeb4ba
else
  PKG_HASH:=dummy
endif

PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION)-$(ARCH_PACKAGES)
PKG_SOURCE_URL:=https://github.com/lwb1978/gecoosac-core/releases/download/V$(PKG_VERSION)/$(PKG_ARCH)?
UNPACK_CMD=$(CP) $(DL_DIR)/$(PKG_SOURCE) $(PKG_BUILD_DIR)/$(PKG_NAME)

PKG_LICENSE:=AGPL-3.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=lwb1978 <lwb1978@gmail.com>

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=net
  CATEGORY:=Network
  TITLE:=gecoosac server (version $(PKG_VERSION))
  URL:=http://www.cnrouter.com/
  DEPENDS:=@(aarch64||arm||i386||mips||mipsel||x86_64)
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(PKG_NAME) $(1)/usr/bin
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
