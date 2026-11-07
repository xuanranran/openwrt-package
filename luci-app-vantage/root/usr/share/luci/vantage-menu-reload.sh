#!/bin/sh

# Menu dependencies are cached by LuCI. Re-evaluate the active theme after
# applying /etc/config/luci so switching themes also updates the dashboard.
rm -f /tmp/luci-indexcache /tmp/luci-indexcache.*
