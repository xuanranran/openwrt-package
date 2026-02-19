include $(TOPDIR)/rules.mk

PKG_NAME:=rtp2httpd

PKG_VERSION:=3.9.1
PKG_RELEASE:=1
PKG_MAINTAINER:=Stackie Jia <jsq2627@gmail.com>
PKG_LICENSE:=GPL-2.0-or-later
PKG_LICENSE_FILES:=LICENSE

PKG_FIXUP:=autoreconf

PKG_SOURCE:=rtp2httpd-v$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://codeload.github.com/stackia/rtp2httpd/tar.gz/v$(PKG_VERSION)?
PKG_HASH:=b040c99b5fd8a2adce71a4d4b0f92c92a7a2b4c2f1fd9abad24ae7e657ec56e5

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

define Build/Prepare
	$(call Build/Prepare/Default)
	find $(PKG_BUILD_DIR) -name 'Makefile.am' -exec touch {} +
	find $(PKG_BUILD_DIR) -name 'configure.ac' -exec touch {} +
	find $(PKG_BUILD_DIR) -name 'aclocal.m4' -exec touch {} +
	find $(PKG_BUILD_DIR) -name 'Makefile.in' -exec touch {} +
	find $(PKG_BUILD_DIR) -name 'configure' -exec touch {} +
endef

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
