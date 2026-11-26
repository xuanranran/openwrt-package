include $(TOPDIR)/rules.mk

PKG_NAME:=bandix-plus
PKG_VERSION:=0.1.3
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_PLUS_VERSION:=0.1.3
RUST_BINARY_FILENAME:=bandix-plus-$(RUST_BANDIX_PLUS_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix-plus/releases/download/v$(RUST_BANDIX_PLUS_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=46de71c39939b86989d8088818e51c89358c9cf77fbdad40b94ed0b4f5fd96ea
else ifeq ($(ARCH),arm) # update.sh skip this tag, do not delete this comment
	# Ref https://github.com/openwrt/packages/blob/master/lang/rust/rust-values.mk

	ARM_CPU_TYPE:=arm-armel
	ifeq ($(CONFIG_arm_v6)$(CONFIG_arm_v7),)
		ARM_CPU_TYPE:=$(subst arm-,armv5te-,$(ARM_CPU_TYPE))
	else ifeq ($(CONFIG_arm_v7),y)
		ARM_CPU_TYPE:=$(subst arm-,armv7-,$(ARM_CPU_TYPE))
	endif

	ifeq ($(CONFIG_HAS_FPU),y)
		ARM_CPU_TYPE:=$(subst -armel,-armhf,$(ARM_CPU_TYPE))
	endif

	ifeq ($(ARM_CPU_TYPE),arm-armel)
		PKG_HASH:=720a399292e37f45b0105df283336915849bec4bf89654b7925356c7ae374119
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=549921f1f29abbe56d44ee7e0012d0574ee74f2092f473775b74059bfdc39cc2
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=38d38928ac395a816e210099b7ced3068a827673b2b318f764b47741576c0c64
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=4dfd05292a77b11ff2016180872ca5a587080c9b5e62739e1adea1691e74eaa5
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=e995dab9f309afef692992c046af87b5abcb5fd58263f5c7023918afff175981
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=7ae63c459c3923bb384e22e0bfc7178090bf13c25309ea9acf68cd4dd29ff0e7
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=b2047c8bb6046542fd4333c9d2d958d16850619bec3dbb1d4efd7a7a035136ea
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=e5ac95ee368d1e60c82567f0181695004dcb5687b2f7b0fddb2cd341c7a389b0
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=024d17b6224def4353aeebb3fe82570c1cb2c5536cb22f277700d49a6b40b708
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=8b3199845c8ca1c1aed943ec73e41eac1e3a979deb247f9d5b0c70d0c5e7994a
else
	PKG_HASH:=dummy
endif

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Bandix Plus - Network traffic monitoring tool
	DEPENDS:=+zoneinfo-all +conntrack +iw
endef

define Package/$(PKG_NAME)/description
	Bandix Plus core service for network traffic monitoring
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)/bin
	gzip -dc "$(DL_DIR)/$(PKG_SOURCE)" | tar -C $(PKG_BUILD_DIR)/bin --strip-components=1 -xf -
	$(Build/Patch)
endef

define Build/Compile
	# nothing to do
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/bandix-plus $(1)/usr/bin/

	# 添加启动脚本和配置文件
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_BIN) ./files/bandix-plus.init $(1)/etc/init.d/bandix-plus

	# 安装配置文件
	$(INSTALL_DIR) $(1)/usr/share/bandix-plus
	$(INSTALL_CONF) ./files/bandix_plus.config $(1)/etc/config/bandix_plus

	# 安装 UCI defaults（仅补齐缺失配置项，不覆盖用户已有值）
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/99-bandix-plus-defaults $(1)/etc/uci-defaults/99-bandix-plus-defaults
	
	# 配置 sysupgrade 保留列表
	$(INSTALL_DIR) $(1)/lib/upgrade/keep.d
	$(INSTALL_DATA) ./files/bandix-plus.keep $(1)/lib/upgrade/keep.d/bandix-plus
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/bandix_plus
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] && exit 0

DEFAULTS_SCRIPT="/etc/uci-defaults/99-bandix-plus-defaults"
if [ -x "$$DEFAULTS_SCRIPT" ]; then
	"$$DEFAULTS_SCRIPT" && rm -f "$$DEFAULTS_SCRIPT"
fi

exit 0
endef

$(eval $(call BuildPackage,bandix-plus))
