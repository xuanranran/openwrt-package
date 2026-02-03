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
	PKG_HASH:=c4150d4fcfd178c0289494f881db5ea5f275a995b6062da3fa4754647b6cf354
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
		PKG_HASH:=a4bc45f7786025e65964a8ad31614e03208f56aa62fec293247778682c0b9632
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=b2734fc3fd7d689bb6d90653d8aa8106e497d3ab233e51beb476f89c86e077cd
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=16e21ea0b8551dd62b31e0531de79101aff72d1291d8815f9e6c1f113365da8c
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=9aabfaf7c9c7188e8f155d2bb4c9a3f0f9c91276e6cf6421529279bd1a566a09
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=96d19ed26ff5bcc07d8e74f2745da3f69efb21534cf5256ca2f14777a2e2da9f
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=afd1fb052a41b2ba584d33c4e0a07c44b52cba5ecd8891944d73f8058a37f4de
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=375abc9e39521c3b16a07ae15bb7e862af21a0b0ebceccb83887ebaf811c049a
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=eba86a04989536d54556b9b97c6b5bde7db921d9765e3525000f4dc4028b5d72
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=2c14e869da91d7341f6b311fc80a8b059f4fe9afddfb38f08d022d9049ad6728
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=321d79446486b8b42791c2a955703617a1657ed00e3e63ae5e49a1aca5a917d6
else
	PKG_HASH:=dummy
endif

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Bandix - Network traffic monitoring tool
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
