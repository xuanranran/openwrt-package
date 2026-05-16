include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-theme-win98
LUCI_TITLE:=Windows 98 Retro Theme
LUCI_DEPENDS:=+luci-base +luci-theme-openwrt

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Codex

define Package/luci-theme-win98/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	if [ "$$(uci -q get luci.main.mediaurlbase)" = "/luci-static/win98" ]; then
		uci -q set luci.main.mediaurlbase='/luci-static/openwrt.org'
	fi
	uci -q delete luci.themes.Win98
	uci commit luci
}
endef

define Package/luci-theme-win98/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	if ! uci -q get luci.themes.Win98 >/dev/null 2>&1; then
		uci set luci.themes.Win98='/luci-static/win98'
	fi
	if ! uci -q get luci.main.mediaurlbase >/dev/null 2>&1; then
		uci set luci.main.mediaurlbase='/luci-static/win98'
	fi
	uci commit luci
	rm -f /tmp/luci-indexcache.*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload 2>/dev/null
	exit 0
}
endef

ifneq ($(wildcard $(TOPDIR)/feeds/luci/luci.mk),)
include $(TOPDIR)/feeds/luci/luci.mk
else
include $(TOPDIR)/feeds/luci/luci.mk
endif

# call BuildPackage - OpenWrt buildroot signature
