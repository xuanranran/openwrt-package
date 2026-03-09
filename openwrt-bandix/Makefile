include $(TOPDIR)/rules.mk

PKG_NAME:=bandix
PKG_VERSION:=0.12.7
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_VERSION:=0.12.7
RUST_BINARY_FILENAME:=bandix-$(RUST_BANDIX_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix/releases/download/v$(RUST_BANDIX_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=5ba0853c3937cf6dcc720d0148bb03aa2fc49af427b9bcec4c18d0cc8ac62569
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
		PKG_HASH:=ea6bc24e7e4292e0857bbc1c553f7e5ccf44b59e93e40077179905e1cdc8db70
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=83ea3c17cae516bbad0d42e46b887aa7f447ad5d2453444630a8da8ac6014439
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=a6435af3253f20177578865202d047e01ca048806b4c2da38dad3127c3ee9d8f
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=a839d56b5a97ca33c28f60eac15fcbb3b3828e54ba346f97229a441b542aaeaf
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=2768ed546e587455261d8182e431fcab06b968ab11692d3999b3860c47988fc9
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=68e8aadd7976821e084931d36e468ea3a73c282898efee52005c68409090845f
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=cd9977ea44e409294e46a96075d4ce9d1447c77d9697171c768b15af0747fde9
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=71f793a5fd99e263ee31a394c1e149250ddf59b295f2cf1005686c80a5aac2cc
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=2665dbfbcd69e5e22a6d21b151c2aa7f73d9e6aa9f4281ff59cf5033202957f5
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=4b2609098bbd26b0ca02b8a386e0f7a882277e45e2f8989580fcfb923ee6c695
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
