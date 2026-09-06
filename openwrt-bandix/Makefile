include $(TOPDIR)/rules.mk

PKG_NAME:=bandix
PKG_VERSION:=0.12.10
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_VERSION:=0.12.10
RUST_BINARY_FILENAME:=bandix-$(RUST_BANDIX_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix/releases/download/v$(RUST_BANDIX_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=653e554a95ff1a336def82b9b4899466b6fc62a6e8fd42ff786eaedebfe0b911
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
		PKG_HASH:=4b6c96715fbda3e2e60c41aa72286fb10da09997a05ed98311cf377c22848e65
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=4280c24049fb25743a8876b7437e4954fbeb00e58ce940c509cdcc70b7cea576
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=7ba5247c674ace48c88e9ea65c4cb6ab754a5e5dd1d4cd2911442018545c33a8
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=6c7f4454b3100fc448149caf8cb97dbcb75b284bab93b53dc885a370c496cc29
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=41377aa71c2a2da4481112c45b0129f167b96bc4b0c55d3f77309b4b82001891
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=a08fae7eae3c852a8b6c310276c881f135eabf86c18f689edd134800dc270e71
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=499134680d7667fd256425d0f86b846dc4d00023b2315c48ed5337a7dae65926
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=f40f51453c274774bdf64a170fe3ea1d87cf3761ba4a679ca8f08bdd2819f2e4
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=4b18915eab8e3435fb6cc1d50298ad84708b14921fb1b60713f37864140aa1ab
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=aeab01d678f92f176ba41d08363765ac53719bdaaff26bbd0e93c4fdc12bea20
else
	PKG_HASH:=dummy
endif

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Bandix - Network traffic monitoring tool
	DEPENDS:=+zoneinfo-all +conntrack +iw
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
