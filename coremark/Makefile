#
# Copyright (C) 2018 Lim Guo Wei
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=coremark
PKG_VERSION:=2023.01.25~d5fad6bd
PKG_RELEASE:=1

ifeq ($(CONFIG_USE_MUSL),y)
  PKG_LIBC:=musl
else
  PKG_LIBC:=glibc
endif

include $(INCLUDE_DIR)/package.mk

define Package/coremark
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=CoreMark Embedded Microprocessor Benchmark
  DEPENDS:=@(aarch64||x86_64)
  URL:=https://github.com/eembc/coremark
endef

define Package/coremark/description
  Embedded Microprocessor Benchmark
endef

define Package/coremark/conffiles
/etc/bench.log
endef

define Build/Compile
endef

define Package/coremark/install
	$(INSTALL_DIR) $(1)/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(PKG_LIBC)/coremark.$(ARCH) $(1)/bin/coremark
	$(INSTALL_DIR) $(1)/etc
	$(INSTALL_BIN) ./coremark.sh $(1)/etc/
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./coremark $(1)/etc/uci-defaults/xxx-coremark
endef

define Package/coremark/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || sed -i '/coremark/d' /etc/crontabs/root
[ -n "$${IPKG_INSTROOT}" ] || echo "0 4 * * * /etc/coremark.sh" >> /etc/crontabs/root
[ -n "$${IPKG_INSTROOT}" ] || crontab /etc/crontabs/root
endef

$(eval $(call BuildPackage,coremark))
