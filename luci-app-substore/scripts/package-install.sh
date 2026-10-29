#!/bin/sh

set -e

DEST="$1"
SRC="$2"

if [ -z "$DEST" ] || [ -z "$SRC" ]; then
	echo "错误: package-install.sh 需要两个参数 <目标目录> <包源码目录>" >&2
	exit 1
fi

install -d "$DEST/etc/init.d"
install -m0755 "$SRC/root/etc/init.d/substore" "$DEST/etc/init.d/substore"

install -d "$DEST/etc/config"
install -m0644 "$SRC/root/etc/config/substore" "$DEST/etc/config/substore"

install -d "$DEST/usr/libexec/substore"
install -m0755 "$SRC/root/usr/libexec/substore/postinstall.sh" "$DEST/usr/libexec/substore/postinstall.sh"
install -m0755 "$SRC/root/usr/libexec/substore/update-backend.sh" "$DEST/usr/libexec/substore/update-backend.sh"
install -m0755 "$SRC/root/usr/libexec/substore/update-frontend.sh" "$DEST/usr/libexec/substore/update-frontend.sh"
install -m0755 "$SRC/root/usr/libexec/substore/node-fetch-update-backend.sh" "$DEST/usr/libexec/substore/node-fetch-update-backend.sh"
install -m0755 "$SRC/root/usr/libexec/substore/node-fetch-update-frontend.sh" "$DEST/usr/libexec/substore/node-fetch-update-frontend.sh"
install -m0755 "$SRC/root/usr/libexec/substore/wget-ssl-update-backend.sh" "$DEST/usr/libexec/substore/wget-ssl-update-backend.sh"
install -m0755 "$SRC/root/usr/libexec/substore/wget-ssl-update-frontend.sh" "$DEST/usr/libexec/substore/wget-ssl-update-frontend.sh"

install -d "$DEST/usr/share/luci/menu.d"
install -m0644 "$SRC/root/usr/share/luci/menu.d/luci-app-substore.json" "$DEST/usr/share/luci/menu.d/luci-app-substore.json"

install -d "$DEST/usr/share/rpcd/acl.d"
install -m0644 "$SRC/root/usr/share/rpcd/acl.d/luci-app-substore.json" "$DEST/usr/share/rpcd/acl.d/luci-app-substore.json"

install -d "$DEST/www/luci-static/resources/view/substore"
for f in main.js advanced.js network.js cron.js icon-running.png icon-stopped.png; do
	install -m0644 "$SRC/root/www/luci-static/resources/view/substore/$f" \
		"$DEST/www/luci-static/resources/view/substore/$f"
done

sh "$SRC/scripts/download-assets.sh" backend "$DEST/usr/libexec/substore"

install -d "$DEST/www/sub-store"
sh "$SRC/scripts/download-assets.sh" frontend "$DEST/usr/libexec/substore" "$DEST/www/sub-store"
