#!/bin/sh
set -e

SOURCE="$1"
METHOD="$2"

if [ "$SOURCE" != "proxy" ] && [ "$SOURCE" != "official" ]; then
	echo "FAIL: 参数必须是 proxy 或 official（实际收到: $SOURCE）" >&2
	exit 1
fi

DIR="/usr/libexec/substore"
NODE_SCRIPT="$DIR/node-fetch-update-frontend.sh"
WGET_SCRIPT="$DIR/wget-ssl-update-frontend.sh"

if [ -z "$METHOD" ]; then
	METHOD=$(uci -q get substore.config.download_method) || METHOD=""
	[ -z "$METHOD" ] && METHOD="node"
fi

if [ "$METHOD" != "node" ] && [ "$METHOD" != "wget" ]; then
	echo "FAIL: 更新方式参数必须是 node 或 wget（实际收到: $METHOD）" >&2
	exit 1
fi

if [ "$METHOD" = "wget" ]; then
	if ! command -v wget >/dev/null 2>&1; then
		echo "FAIL: 未检测到 wget-ssl，请先安装 wget-ssl 软件包，或将更新下载方式切换为 node-fetch" >&2
		exit 1
	fi
	exec "$WGET_SCRIPT" "$SOURCE"
fi

exec "$NODE_SCRIPT" "$SOURCE"
