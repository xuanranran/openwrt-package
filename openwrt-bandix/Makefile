include $(TOPDIR)/rules.mk

PKG_NAME:=bandix
PKG_VERSION:=0.12.1
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_VERSION:=0.12.1
RUST_BINARY_FILENAME:=bandix-$(RUST_BANDIX_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix/releases/download/v$(RUST_BANDIX_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=79950ad4d4af4701f6473f965350c86533aac8d0170ff0f749b4dc3f4835970e
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
		PKG_HASH:=302f2ee5834909aab2fd2f3fb627bc8e483c07ba4a092970750cad11e2307288
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=4d9bd0521d5f31b395ddc44b2b38ec33cd5bb3e36a35f1be589e1846bcaa3a9e
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=5d49280edafa03f6a4c2a64754475db1274e52a47ef3000a6a47b7a90cc1dcb1
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=f7ac19647c2db8fc2aa512d78a21e8e01d41ee1adab59fba5587ec0262cdfa43
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=7574d115715e1092e28b3a4e7c591b56deb5ee0974bddf45751beabcd69e8133
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=142cf7997e51ca5eeb33943cad8ce3a6692734c39833ecea6d23e7dc46cfdf2e
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=8c85fd9fabba81f2d1f4277985cb23fddec6bc9c578f791c99dfd465d5f38c6d
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=d17e9849cd0efc32bc2941629eb08cb4a5af0825090fb5b069dfd0e34f27bbc0
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=ce483e7c138648ea9745764352d61d11aedb61b46cf73b08a0a2580fb88a9bcb
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=4e10cebbdf5f841cedf659daf0f677b61be6ccfba003a565024d34972cf76891
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
