include $(TOPDIR)/rules.mk

PKG_NAME:=bandix
PKG_VERSION:=0.12.0
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_VERSION:=0.12.0
RUST_BINARY_FILENAME:=bandix-$(RUST_BANDIX_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix/releases/download/v$(RUST_BANDIX_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=94478899ea199cda12c8ec0cd84e4eea3b23d6f45a2b85f819db0d266e47a2bf
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
		PKG_HASH:=8377752775e818eae4fc40b3e2d373327082bda50ec29de738c53d90c983d4bc
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=df287f2cb9dc0bd336f27615c92292ba7c61fc78e1169455fd1a2b340ba3e033
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=73f5d4d89da6b1b78a85665ab0b22fb33c9eb2c755da1ec9a472ac33c9e02842
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=ed3f01ccad01daabb08460dd10bec800a83b65dd632165e29495763d49894e97
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=d38c8e13e8cb550d1a54df00ad692d6a6e00385127a7dc00d9e73b31ccd72887
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=1f7e16a16b20ad6e7a8eb15530c8f29aad0d3f7089c89e6df89572711242403a
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=1641a08d7a7b7e96da267f9ea4288cc0e3b842993d59d85e9f06f4adc9577abd
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=27b9b3572ffb1c6721656c70469ed6e23e799b3ffd2f075f10866d3466fbf86a
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=ca76daf5d06b190d258a2981e9e015285928b0c28f9baafb355bdcd7c2d2bd55
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=70d81f874f0e949206a10f6511dc71b42ad5d22bfe8d3dafa8e7f247124b7a84
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

	# 将配置文件安装到临时位置，由 postinst 决定是否复制到最终位置
	$(INSTALL_DIR) $(1)/usr/share/bandix
	$(INSTALL_CONF) ./files/bandix.config $(1)/etc/config/bandix
endef


define Package/$(PKG_NAME)/postinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then

    # 添加到 sysupgrade.conf 以在系统升级时保留
    if ! grep -q "^/usr/share/bandix$$" /etc/sysupgrade.conf; then
        echo "/usr/share/bandix" >> /etc/sysupgrade.conf
    fi
    if ! grep -q "^/etc/config/bandix$$" /etc/sysupgrade.conf; then
        echo "/etc/config/bandix" >> /etc/sysupgrade.conf
    fi
fi
endef

$(eval $(call BuildPackage,bandix))
