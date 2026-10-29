# SPDX-License-Identifier: GPL-2.0-only
$(eval $(call NetdataPlugin,cups,plugin-cups,ENABLE_PLUGIN_CUPS,Printing: CUPS monitoring,+libcups +libpng +libjpeg +libusb-1.0 +zlib))

# OpenWrt's libcups is BUILDONLY and does not ship a runtime package.
define Package/netdata-plugin-cups/install
	$(CP) $(PKG_INSTALL_DIR)/plugin-cups/. $(1)/
	$(INSTALL_DIR) $(1)/usr/lib
	$(CP) $(STAGING_DIR)/usr/lib/libcups.so.* $(1)/usr/lib/
endef
