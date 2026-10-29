#!/bin/sh
set -e

SOURCE="$1"
if [ "$SOURCE" != "proxy" ] && [ "$SOURCE" != "official" ]; then
	echo "FAIL: 参数必须是 proxy 或 official（实际收到: $SOURCE）" >&2
	exit 1
fi

NODE=$(command -v node) || NODE=""
MV=$(command -v mv) || MV=""
RM=$(command -v rm) || RM=""
BUNDLE=/usr/libexec/substore/sub-store.bundle.js
TMP="$BUNDLE.tmp"
PROXY_PREFIX=$(uci -q get substore.config.download_proxy) || PROXY_PREFIX=""
PROXY_PREFIX="${PROXY_PREFIX%/}"
[ -n "$PROXY_PREFIX" ] && PROXY_PREFIX="$PROXY_PREFIX/"
GITHUB_TOKEN=$(uci -q get substore.config.github_token) || GITHUB_TOKEN=""
OFFICIAL_URL="https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js"
PROXY_URL="$PROXY_PREFIX$OFFICIAL_URL"
GITHUB_API_URL="https://api.github.com/repos/sub-store-org/Sub-Store/releases/latest"
PROXY_API_URL="$PROXY_PREFIX$GITHUB_API_URL"
VERSION_FILE="/usr/libexec/substore/backend.version"

if [ -z "$NODE" ]; then
	echo "FAIL: node 命令未找到" >&2
	exit 1
fi

if [ "$SOURCE" = "proxy" ] && [ -z "$PROXY_PREFIX" ]; then
	echo "DOWNLOAD_FAILED: 未配置更新加速代理"
	exit 0
fi

case "$SOURCE" in
	proxy) URL="$PROXY_URL" ;;
	official) URL="$OFFICIAL_URL" ;;
esac

CURRENT_VERSION=""
[ -f "$VERSION_FILE" ] && CURRENT_VERSION=$(cat "$VERSION_FILE" 2>/dev/null | tr -d '\r\n')

LATEST_TAG=$(GITHUB_TOKEN_ENV="$GITHUB_TOKEN" SOURCE_ENV="$SOURCE" PROXY_API_URL_ENV="$PROXY_API_URL" GITHUB_API_URL_ENV="$GITHUB_API_URL" "$NODE" -e "
function looksLikeVersionTag(s) {
  if (!s) return false;
  var t = String(s).trim();
  if (!t || t.length > 40) return false;
  if (/[<>\r\n\s]/.test(t)) return false;
  return /^[A-Za-z0-9._+-]+\$/.test(t);
}

var token = process.env.GITHUB_TOKEN_ENV || '';
var authHeaders = token ? { 'Authorization': 'token ' + token } : {};
var source = process.env.SOURCE_ENV || 'official';
var proxyApiUrl = process.env.PROXY_API_URL_ENV || '';
var githubApiUrl = process.env.GITHUB_API_URL_ENV || '';

async function fromProxyApi() {
  try {
    const res = await fetch(proxyApiUrl, { signal: AbortSignal.timeout(8000), headers: authHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    var tag = data && data.tag_name;
    return looksLikeVersionTag(tag) ? tag : null;
  } catch (e) {
    return null;
  }
}

async function fromDirectApi() {
  try {
    const res = await fetch(githubApiUrl, { signal: AbortSignal.timeout(8000), headers: authHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    var tag = data && data.tag_name;
    return looksLikeVersionTag(tag) ? tag : null;
  } catch (e) {
    return null;
  }
}

var ORDER = {
  proxy:    [fromProxyApi, fromDirectApi],
  official: [fromDirectApi, fromProxyApi]
};

(async () => {
  var fns = ORDER[source] || ORDER.official;
  var tag = null;
  for (var i = 0; i < fns.length; i++) {
    tag = await fns[i]();
    if (tag) break;
  }
  if (tag) console.log(tag);
})();
" 2>/dev/null | tr -d '\r\n')

if [ -n "$LATEST_TAG" ] && [ -n "$CURRENT_VERSION" ] && [ "$LATEST_TAG" = "$CURRENT_VERSION" ]; then
	echo "ALREADY_LATEST:$LATEST_TAG"
	exit 0
fi

DL_OUTPUT=$(SUBSTORE_URL_ENV="$URL" "$NODE" -e "
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

var url = process.env.SUBSTORE_URL_ENV || '';

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream('$TMP'));
  const head = fs.readFileSync('$TMP', { encoding: 'utf8', flag: 'r' }).slice(0, 200);
  if (/<html|<!DOCTYPE/i.test(head)) {
    throw new Error('返回内容像是 HTML 错误页，不是 js bundle');
  }
}

download(url).catch(function(e) {
  console.log('DOWNLOAD_FAILED: ' + (e && e.message || e));
});
")

if [ -n "$DL_OUTPUT" ]; then
	"$RM" -f "$TMP"
	echo "$DL_OUTPUT"
	exit 0
fi

if [ ! -s "$TMP" ]; then
	"$RM" -f "$TMP"
	echo "DOWNLOAD_FAILED: 下载后文件为空"
	exit 0
fi

"$MV" -f "$TMP" "$BUNDLE"

/etc/init.d/substore restart

sleep 2

if ! pgrep -f "$BUNDLE" >/dev/null; then
	echo "FAIL: 重启后未检测到进程运行" >&2
	exit 1
fi

if [ -n "$LATEST_TAG" ]; then
	printf '%s' "$LATEST_TAG" > "$VERSION_FILE"
else
GITHUB_TOKEN_ENV="$GITHUB_TOKEN" SOURCE_ENV="$SOURCE" PROXY_API_URL_ENV="$PROXY_API_URL" GITHUB_API_URL_ENV="$GITHUB_API_URL" "$NODE" -e "
const fs = require('fs');

function looksLikeVersionTag(s) {
  if (!s) return false;
  var t = String(s).trim();
  if (!t || t.length > 40) return false;
  if (/[<>\r\n\s]/.test(t)) return false;
  return /^[A-Za-z0-9._+-]+\$/.test(t);
}

var token = process.env.GITHUB_TOKEN_ENV || '';
var authHeaders = token ? { 'Authorization': 'token ' + token } : {};
var source = process.env.SOURCE_ENV || 'official';
var proxyApiUrl = process.env.PROXY_API_URL_ENV || '';
var githubApiUrl = process.env.GITHUB_API_URL_ENV || '';

async function fromProxyApi() {
  try {
    const res = await fetch(proxyApiUrl, { signal: AbortSignal.timeout(8000), headers: authHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    var tag = data && data.tag_name;
    return looksLikeVersionTag(tag) ? tag : null;
  } catch (e) {
    return null;
  }
}

async function fromDirectApi() {
  try {
    const res = await fetch(githubApiUrl, { signal: AbortSignal.timeout(8000), headers: authHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    var tag = data && data.tag_name;
    return looksLikeVersionTag(tag) ? tag : null;
  } catch (e) {
    return null;
  }
}

var ORDER = {
  proxy:    [fromProxyApi, fromDirectApi],
  official: [fromDirectApi, fromProxyApi]
};

(async () => {
  var fns = ORDER[source] || ORDER.official;
  var tag = null;
  for (var i = 0; i < fns.length; i++) {
    tag = await fns[i]();
    if (tag) break;
  }

  if (tag) {
    fs.writeFileSync('$VERSION_FILE', tag);
  } else {
    console.error('本次没能确定版本号，保留原有记录');
  }
})().catch(function(e) {
  console.error('版本号查询流程异常（不影响本次更新结果）：' + (e && e.message || e));
});
" || true
fi

echo "OK"
exit 0
