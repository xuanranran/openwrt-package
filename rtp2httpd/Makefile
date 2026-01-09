include $(TOPDIR)/rules.mk

PKG_NAME:=rtp2httpd

PKG_VERSION:=3.6.2
PKG_RELEASE:=1
PKG_MAINTAINER:=Stackie Jia <jsq2627@gmail.com>
PKG_LICENSE:=GPL-2.0-or-later
PKG_LICENSE_FILES:=LICENSE

PKG_FIXUP:=autoreconf

PKG_SOURCE:=rtp2httpd-v$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://codeload.github.com/stackia/rtp2httpd/tar.gz/v$(PKG_VERSION)?
PKG_HASH:=73868e57a7bb5a1a4be1cfbb1055106545e6d9e7e6975547bd9f8f745a21a961

include $(INCLUDE_DIR)/package.mk

define Package/rtp2httpd
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Convert RTP/UDP/RTSP streams into HTTP streams with FCC support
	URL:=https://github.com/stackia/rtp2httpd
endef

define Package/rtp2httpd/description
	rtp2httpd converts RTP/UDP/RTSP media into http stream.
	It acts as a tiny HTTP server. When client connect,
	pre-configured multicast RTP service is choosen by URL.
	Program then join pre-configured multicast address and translate
	incoming RTP data to HTTP stream.
endef

CONFIGURE_VARS += \
	RELEASE_VERSION="$(PKG_VERSION)"

define Package/rtp2httpd/conffiles
/etc/config/rtp2httpd
/etc/rtp2httpd.conf
endef

define Package/rtp2httpd/install
	$(INSTALL_DIR) $(1)/etc/init.d $(1)/etc/config $(1)/usr/bin
	$(INSTALL_CONF) ./files/rtp2httpd.conf $(1)/etc/config/rtp2httpd
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/rtp2httpd.conf $(1)/etc
	$(INSTALL_BIN) ./files/rtp2httpd.init $(1)/etc/init.d/rtp2httpd
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/src/rtp2httpd $(1)/usr/bin
endef

$(eval $(call BuildPackage,rtp2httpd))
