include $(TOPDIR)/rules.mk

PKG_NAME:=bandix
PKG_VERSION:=0.12.2
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=timsaya

include $(INCLUDE_DIR)/package.mk

# 使用OpenWrt的Rust映射机制
include $(TOPDIR)/feeds/packages/lang/rust/rust-values.mk

# 二进制文件的文件名和URL
RUST_BANDIX_VERSION:=0.12.2
RUST_BINARY_FILENAME:=bandix-$(RUST_BANDIX_VERSION)-$(RUSTC_TARGET_ARCH).tar.gz


# 修正下载地址定义方式
PKG_SOURCE:=$(RUST_BINARY_FILENAME)
PKG_SOURCE_URL:=https://github.com/timsaya/bandix/releases/download/v$(RUST_BANDIX_VERSION)

# 修正二进制文件校验值
ifeq ($(ARCH),aarch64)
	PKG_HASH:=1e902d433206e080d6112a46e0bab15c137951365623456b9208e0ce79b1bcc8
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
		PKG_HASH:=4d07dbfcf3c43f47ed6bebd0cde550dda371dbdba6aa58e328e98185a2a9fdfe
	else ifeq ($(ARM_CPU_TYPE),arm-armhf)
		PKG_HASH:=cbb7baad611346c8040056e3a15562e3f715f7ba0ff55a46185d82f95479346f
	else ifeq ($(ARM_CPU_TYPE),armv5te-armel)
		PKG_HASH:=893af72fd2e12502c8a266321dc6fc20f79979ba2c3d95861c06af5267b14223
	else ifeq ($(ARM_CPU_TYPE),armv7-armel)
		PKG_HASH:=d07d6ee4f5a5266627d190a15064a46e97418723edd82d18a4e9f2869cc72162
	else ifeq ($(ARM_CPU_TYPE),armv7-armhf)
		PKG_HASH:=34179a0edddf9189ad218faba0b3f3b6b3e65457cbe17fddd478a155c34bb255
	else
		PKG_HASH:=dummy
	endif
else ifeq ($(ARCH),mips)
	PKG_HASH:=a47eaaca2f6abfe36870ca1f102d47dd06b9918aee3afe373a22c6434a593245
else ifeq ($(ARCH),mipsel)
	PKG_HASH:=9f204b44678c9c8ae9792939e9b09658a550000391c871d954867a80fdc308c8
else ifeq ($(ARCH),powerpc64)
	PKG_HASH:=4ca27b5a5d9ba7e0e4d843e3bc1a8b4c7cf3e2c7378a659ac5853d8cc01bd1dd
else ifeq ($(ARCH),riscv64)
	PKG_HASH:=60cbcfc611e05a349c980819476bac4775b873af6ab9d1f304ecb98443c43ea7
else ifeq ($(ARCH),x86_64)
	PKG_HASH:=46d071794fb45b6c8e2eadd639c5f582b966bfa60868407347958425e2f30c12
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
