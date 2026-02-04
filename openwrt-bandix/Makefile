include $(TOPDIR)/rules.mk

PKG_NAME:=bandix
PKG_VERSION:=0.12.4
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_VERSION:=0.12.4
RUST_BINARY_FILENAME:=bandix-$(RUST_BANDIX_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix/releases/download/v$(RUST_BANDIX_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=e66475aa822f2844f24c70b70430bf39dbd969d1fe94d868d3fdc89028c9d2cf
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
		PKG_HASH:=00aecf89da7f41c56363147c31475d75cd708224cb4c8a4fb07280882d099215
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=35ab252408b02bda3449a405e957fa8abc20b50e945225dc2b70b58a3eba456c
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=94b32c40425d24006cbb264c9f29bae58dca0d0f463f1f75d9d6eb70324fee96
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=45aab9ee782b16c9eba491b621231b43392e2938de7331343499862136b10fb9
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=ba2e85f7afe61d0ed9c1727d7f959f18fafeeee9d6cc40ad2c5b2ee426106d6d
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=9bb07e3c4c04f1ee1efa4ab7c47d1d45dc27a2210189accf2f2bd0e1c8c97133
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=8d00d643c4124bfb3a6455e02cd013167c34d9fe7560d1f20510f57770e18408
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=57cfcbbfbd2f1260261c5c8053b994363c7327c2e414706498a98587a3e83966
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=0604e8a93228181a75d87c02a09085c9b7d0c2c54279c6a07f2c97b8eb9f4be1
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=2c8dbec16ce913950bc326e3846c4777f332196054aeef7db835413ff7e55648
else
	PKG_HASH:=dummy
endif

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Bandix - Network traffic monitoring tool
	DEPENDS:=+zoneinfo-all
endef

define Package/$(PKG_NAME)/description
	Bandix core service for network traffic monitoring
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
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/bandix $(1)/usr/bin/

	# 添加启动脚本和配置文件
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_BIN) ./files/bandix.init $(1)/etc/init.d/bandix

	# 安装配置文件
	$(INSTALL_DIR) $(1)/usr/share/bandix
	$(INSTALL_CONF) ./files/bandix.config $(1)/etc/config/bandix
	
	# 配置 sysupgrade 保留列表
	$(INSTALL_DIR) $(1)/lib/upgrade/keep.d
	$(INSTALL_DATA) ./files/bandix.keep $(1)/lib/upgrade/keep.d/bandix
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/bandix
endef

$(eval $(call BuildPackage,bandix))
