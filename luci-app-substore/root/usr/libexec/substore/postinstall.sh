#!/bin/sh

mkdir -p /etc/sub-store

chmod +x /etc/init.d/substore
/etc/init.d/substore enable

echo "Sub-Store installed."

rm -f /tmp/luci-indexcache* 2>/dev/null
rm -f /tmp/luci-modulecache/* 2>/dev/null
rm -f /tmp/luci-indexcache
killall -HUP rpcd 2>/dev/null

exit 0
