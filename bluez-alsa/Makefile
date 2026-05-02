#
# Copyright (C) 2015-2016 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=bluez-alsa
PKG_VERSION:=4.3.1
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/arkq/bluez-alsa.git
PKG_SOURCE_VERSION:=2fa7fb00e791df26d0666e8e2178fd6649ccb518
PKG_MIRROR_HASH:=0ec694e7cafada3672b83fea9f70cdb03a1745b7fed4135b076b80817ca0e267

PKG_MAINTAINER:=sbwml <admin@cooluc.com>
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=LICENSE

PKG_FIXUP:=autoreconf
PKG_INSTALL:=1
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

define Package/bluez-alsa
  SECTION:=sound
  CATEGORY:=Sound
  DEPENDS:=+alsa-lib +bluez-daemon +fdk-aac +sbc +libmpg123
  TITLE:=BlueZ ALSA backend (A2DP)
  URL:=https://github.com/Arkq/bluez-alsa
endef

define Package/bluez-alsa/description
  BlueZ ALSA backend providing A2DP Bluetooth audio support and
  exposing Bluetooth audio as ALSA PCM devices.
endef

define Package/bluez-alsa-utils
  SECTION:=sound
  CATEGORY:=Sound
  DEPENDS:=+bluez-alsa
  TITLE:=Bluetooth Audio ALSA Backend utils
endef

CONFIGURE_ARGS += \
	--enable-a2dpconf \
	--enable-aac \
	--enable-cli \
	--enable-mpg123

define Package/bluez-alsa/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/bluealsad $(1)/usr/bin/bluealsa

	$(INSTALL_DIR) $(1)/etc/alsa/conf.d
	$(INSTALL_DATA) $(PKG_INSTALL_DIR)/usr/share/alsa/alsa.conf.d/20-bluealsa.conf $(1)/etc/alsa/conf.d

	$(INSTALL_DIR) $(1)/etc/dbus-1/system.d
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/src/org.bluealsa.conf $(1)/etc/dbus-1/system.d/bluealsa.conf

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/bluealsa.init $(1)/etc/init.d/bluealsa

	$(INSTALL_DIR) $(1)/usr/lib/alsa-lib
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/src/asound/.libs/libasound_module_ctl_bluealsa.so $(1)/usr/lib/alsa-lib
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/src/asound/.libs/libasound_module_pcm_bluealsa.so $(1)/usr/lib/alsa-lib
endef

define Package/bluez-alsa-utils/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/a2dpconf $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/bluealsa-aplay $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/bluealsactl $(1)/usr/bin
endef

$(eval $(call BuildPackage,bluez-alsa))
$(eval $(call BuildPackage,bluez-alsa-utils))
