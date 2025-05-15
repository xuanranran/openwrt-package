include $(TOPDIR)/rules.mk

PKG_NAME:=gecoosac
PKG_VERSION:=2.2.20250515
PKG_RELEASE:=1

ifeq ($(ARCH),aarch64)
  PKG_ARCH:=ac_linux_arm64
  PKG_HASH:=2c89f19574ef45e8941d646f138d1204c505c01a8b095c77b7d295ad9836e84a
else ifeq ($(ARCH),arm)
  PKG_ARCH:=ac_linux_arm
  PKG_HASH:=9a8f39b38f8bd8c0904cf1679b82997916b675e617bbae149cf793df5061c12a
else ifeq ($(ARCH),mips)
  PKG_ARCH:=ac_linux_mips
  PKG_HASH:=88194fc6c6a9008a95f562709ce88d9f4779ab129d51da0937ced4f87ee385a4
else ifeq ($(ARCH),mipsel)
  PKG_ARCH:=ac_linux_mipsle
  PKG_HASH:=8963e6cec58f2167eda8c49d5887a15dad18dcf7b5c8090387bfa86c3e68b030
else ifeq ($(ARCH),i386)
  PKG_ARCH:=ac_linux_386
  PKG_HASH:=652a0c0d8014ce36722b0125f18f0273609a6ef54182d26727cc0b155400c81d
else ifeq ($(ARCH),x86_64)
  PKG_ARCH:=ac_linux_amd64
  PKG_HASH:=b81229e07fe2a4eca4259a27015b480e911e1c086f120cb3b5bdb4df2b961a9e
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
