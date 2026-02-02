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
	PKG_HASH:=603e1708874a70d72079fe04c337338ae295e8076b5db1cc8b3d8aef93c47117
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
		PKG_HASH:=af233e036ef4315fe7895ebcf3537cc021901d86e27ea64ed1d22a47d4b21436
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=21acf99b2f8f3d432c094bbf11c722ce606a6c797406a67824d06dfcbbaa208e
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=ea534c88270744e0f37c46b710b77581dbf417289212627b0b90f9a51dce5b6e
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=c7d8eed7e4bca9f98f73565a41a6bb0c3626fdb0d9695d45f61e5fc1eb1f638e
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=6ea15d54b315dfe12d4d32a7e933223fa78337920ae0e966531f43c174754640
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=bbd4fa4e0d1c9df0e460208773e7e43a92ebc3da2aa98c7f932a1d6539f00e36
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=e992d886cc45ccca9925eda22c22f27eba468e44f79705431d7decc3090dd517
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=00fac64e2f03fd05c01817b7f5f02bb55e3179baa852cf56c961a068b686d4c3
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=86a9d98ae544b042e5ba4a7360c59f7d47c84c06c657f262a605adaa95962a5a
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=9d7804d7e8e428a64326ddcd965699dc5ba3abb148635375a6655bde8a6b06f4
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
