#!/bin/sh

set -e

SUBSTORE_BACKEND_URL="https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js"
SUBSTORE_FRONTEND_URL="https://github.com/sub-store-org/Sub-Store-Front-End/releases/latest/download/dist.zip"

WGET_OPTS="${WGET_OPTS:---timeout=15 --tries=2 --waitretry=3}"

KIND="$1"
LIBEXEC_DIR="$2"
WWW_DIR="$3"

if [ -z "$KIND" ] || [ -z "$LIBEXEC_DIR" ]; then
	echo "错误: download-assets.sh 用法不对，至少需要 <backend|frontend> <libexec_dir>" >&2
	exit 1
fi

fetch_tag() {
	repo="$1"
	AUTH_HEADER=""
	[ -n "$GITHUB_TOKEN" ] && AUTH_HEADER="--header=Authorization: token $GITHUB_TOKEN"
	wget $WGET_OPTS $AUTH_HEADER -qO- "https://api.github.com/repos/$repo/releases/latest" 2>/dev/null \
	    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1
}

case "$KIND" in
backend)
	OUT="$LIBEXEC_DIR/sub-store.bundle.js"
	echo "下载 Sub-Store 后端 bundle..."
	if wget $WGET_OPTS -q -O "$OUT" "$SUBSTORE_BACKEND_URL" \
	   && [ -s "$OUT" ] \
	   && ! head -c 200 "$OUT" | grep -qi '<html\|<!DOCTYPE'; then
		echo "下载后端 bundle 成功"
	else
		echo "错误: 后端 bundle 下载失败（拿不到有效文件）" >&2
		rm -f "$OUT"
		exit 1
	fi

	echo "查询后端版本号（上游 API）..."
	BACKEND_TAG_LIVE="$(fetch_tag "sub-store-org/Sub-Store")"
	if [ -n "$BACKEND_TAG_LIVE" ]; then
		echo "$BACKEND_TAG_LIVE" > "$LIBEXEC_DIR/backend.version"
		echo "上游 API 查询成功，后端版本号: $BACKEND_TAG_LIVE"
	else
		echo "unknown" > "$LIBEXEC_DIR/backend.version"
		echo "上游 API 查询失败，标记为 unknown" >&2
	fi
	;;

frontend)
	if [ -z "$WWW_DIR" ]; then
		echo "错误: frontend 模式需要第三个参数 <www_dir>" >&2
		exit 1
	fi

	TMP_ZIP="/tmp/substore-dist-luci-app-substore.zip"
	echo "下载 Sub-Store 前端 dist..."
	if wget $WGET_OPTS -q -O "$TMP_ZIP" "$SUBSTORE_FRONTEND_URL" \
	   && [ -s "$TMP_ZIP" ] \
	   && unzip -tq "$TMP_ZIP" >/dev/null 2>&1; then
		echo "下载前端 dist 成功"
	else
		echo "错误: 前端 dist 下载失败（拿不到有效 zip）" >&2
		rm -f "$TMP_ZIP"
		exit 1
	fi

	unzip -q -o "$TMP_ZIP" -d "$WWW_DIR"
	rm -f "$TMP_ZIP"

	echo "查询前端版本号（上游 API）..."
	FRONTEND_TAG_LIVE="$(fetch_tag "sub-store-org/Sub-Store-Front-End")"
	if [ -n "$FRONTEND_TAG_LIVE" ]; then
		echo "$FRONTEND_TAG_LIVE" > "$LIBEXEC_DIR/frontend.version"
		echo "上游 API 查询成功，前端版本号: $FRONTEND_TAG_LIVE"
	else
		echo "unknown" > "$LIBEXEC_DIR/frontend.version"
		echo "上游 API 查询失败，标记为 unknown" >&2
	fi

	if [ ! -f "$WWW_DIR/dist/index.html" ]; then
		echo "错误: 解压后没找到 dist/index.html，前端包结构可能变了" >&2
		exit 1
	fi
	;;

*)
	echo "错误: 未知的类型 $KIND，只支持 backend/frontend" >&2
	exit 1
	;;
esac
