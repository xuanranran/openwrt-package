include $(TOPDIR)/rules.mk

PKG_NAME:=momo
PKG_VERSION:=2025.08.11
PKG_RELEASE:=1

PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
PKG_SOURCE_SUBDIR:=$(PKG_NAME)-$(PKG_VERSION)
PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/SagerNet/sing-box.git
PKG_SOURCE_VERSION:=v1.12.1
PKG_MIRROR_HASH:=355eb77d48a249fdf6d59bc21a9b250fa29f154ed7132dfed3e6bd7c9d386d91

PKG_LICENSE:=GPL-3.0+
PKG_MAINTAINER:=Joseph Mory <morytyann@gmail.com>

PKG_BUILD_DEPENDS:=golang/host
PKG_BUILD_PARALLEL:=1
PKG_BUILD_FLAGS:=no-mips16

GO_PKG:=github.com/sagernet/sing-box
GO_PKG_BUILD_PKG:=$(GO_PKG)/cmd/sing-box
GO_PKG_LDFLAGS_X:=$(GO_PKG)/constant.Version=$(PKG_SOURCE_VERSION)
GO_PKG_TAGS:=with_quic,with_utls,with_gvisor,with_wireguard,with_tailscale,with_acme,with_clash_api

include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/momo
  SECTION:=net
  CATEGORY:=Network
  TITLE:=The universal proxy platform.
  URL:=https://sing-box.sagernet.org
  DEPENDS:=$(GO_ARCH_DEPENDS) +ca-bundle +curl +jq firewall4 +ip-full +kmod-inet-diag +kmod-nft-socket +kmod-nft-tproxy +kmod-tun
  PROVIDES:=momo sing-box
endef

define Package/momo/description
  The universal proxy platform.
endef

define Package/momo/conffiles
/etc/config/momo
endef

define Package/momo/install
	$(call GoPackage/Package/Install/Bin,$(1))

	$(INSTALL_DIR) $(1)/etc/momo
	$(INSTALL_DIR) $(1)/etc/momo/ucode
	$(INSTALL_DIR) $(1)/etc/momo/scripts
	$(INSTALL_DIR) $(1)/etc/momo/firewall
	$(INSTALL_DIR) $(1)/etc/momo/profiles
	$(INSTALL_DIR) $(1)/etc/momo/subscriptions
	$(INSTALL_DIR) $(1)/etc/momo/run

	$(INSTALL_BIN) $(CURDIR)/files/ucode/include.uc $(1)/etc/momo/ucode/include.uc
	$(INSTALL_BIN) $(CURDIR)/files/ucode/hijack.ut $(1)/etc/momo/ucode/hijack.ut

	$(INSTALL_BIN) $(CURDIR)/files/scripts/include.sh $(1)/etc/momo/scripts/include.sh
	$(INSTALL_BIN) $(CURDIR)/files/scripts/firewall_include.sh $(1)/etc/momo/scripts/firewall_include.sh
	$(INSTALL_BIN) $(CURDIR)/files/scripts/debug.sh $(1)/etc/momo/scripts/debug.sh

	$(INSTALL_BIN) $(CURDIR)/files/firewall/geoip_cn.nft $(1)/etc/momo/firewall/geoip_cn.nft
	$(INSTALL_BIN) $(CURDIR)/files/firewall/geoip6_cn.nft $(1)/etc/momo/firewall/geoip6_cn.nft

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) $(CURDIR)/files/momo.conf $(1)/etc/config/momo

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(CURDIR)/files/momo.init $(1)/etc/init.d/momo

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) $(CURDIR)/files/uci-defaults/firewall.sh $(1)/etc/uci-defaults/99_firewall_momo
	$(INSTALL_BIN) $(CURDIR)/files/uci-defaults/migrate.sh $(1)/etc/uci-defaults/99_migrate_momo

	$(INSTALL_DIR) $(1)/lib/upgrade/keep.d
	$(INSTALL_DATA) $(CURDIR)/files/momo.upgrade $(1)/lib/upgrade/keep.d/momo
endef

$(eval $(call GoBinPackage,momo))
$(eval $(call BuildPackage,momo))