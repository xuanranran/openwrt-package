#
# Copyright (C) 2026 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-diskman
PKG_VERSION:=1.0.0
PKG_RELEASE:=2

PKG_MAINTAINER:=sbwml <admin@cooluc.com>
PKG_LICENSE:=GPL-3.0-or-later

LUCI_TITLE:=LuCI Support for Disk Manager
LUCI_DESCRIPTION:=Provides Web UI for Disk Manager

LUCI_DEPENDS:=+luci-base +ucode +block-mount \
	+parted +smartmontools +wipefs \
	+btrfs-progs +dosfstools +e2fsprogs +exfat-fsck +exfat-mkfs \
	+f2fs-tools +swap-utils +xfs-mkfs \
	+kmod-fs-exfat +kmod-fs-f2fs +kmod-fs-vfat +kmod-fs-xfs

LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
