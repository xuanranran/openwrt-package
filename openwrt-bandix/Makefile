include $(TOPDIR)/rules.mk

PKG_NAME:=bandix
PKG_VERSION:=0.12.9
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_VERSION:=0.12.9
RUST_BINARY_FILENAME:=bandix-$(RUST_BANDIX_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix/releases/download/v$(RUST_BANDIX_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=678904e611de5042ae40827fb706c44ebb1760c8f2910b1cbf84535ac3a1eab6
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
		PKG_HASH:=55e30654312c8fd36ddaaffc6573665dc8e366554b9f79110a1b5c1d57604987
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=5e77b8b02f7bd1334a5092c33246659c49f7e38abce15715f17aec0ff1a36b21
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=03beab578408677e1126832afd8504505400e531dcefc747f683056ebe52200c
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=1359e2ae29db29ad95837a2dd849b2b44e3ddddca3551cc5fc0184cf4fad734e
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=7932815934816eab792378b2bce7a57b6cea6d8d37e997c2b578dea1ca559456
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=029bc1f6c936e7bfc8a686aaa56d1f9068613295d12401a662eafadb040d115b
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=8026a6c5534aac0fe33482de670abba968ec9bcf84a5f20d11e174365baad46d
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=9159e10f1df1fbff34d2353caf525decf8e7a95264007cbb4551e7bac63ed57c
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=0dd77e1581c24285af610116f1a15527f766b796e3b6adf42db5a8645f72c4a1
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=e5746912b4b175e56c5f80d8db4065a6d92236f8c9fc9e831a65224b1daaba31
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
