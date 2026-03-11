#!/bin/sh
# ETag Cache Management Library

ETAG_CACHE="/etc/openclash/history/etag"

# 读取指定 URL 的 ETag
GET_ETAG_FROM_CACHE() {
    local url=$1
    [ ! -f "$ETAG_CACHE" ] && return 1
    
    local url_hash=$(echo -n "$url" | md5sum | cut -d' ' -f1)
    
    awk -v hash="$url_hash" '
        $0 ~ "^\\[" hash "\\]" { found=1; next }
        /^\[/ { found=0 }
        found && /^etag=/ { print $0; exit }
    ' "$ETAG_CACHE" | cut -d'=' -f2-
}

# 读取指定 URL 的时间戳
GET_TIMESTAMP_FROM_CACHE() {
    local url=$1
    [ ! -f "$ETAG_CACHE" ] && return 1
    
    local url_hash=$(echo -n "$url" | md5sum | cut -d' ' -f1)
    
    awk -v hash="$url_hash" '
        $0 ~ "^\\[" hash "\\]" { found=1; next }
        /^\[/ { found=0 }
        found && /^timestamp=/ { print $0; exit }
    ' "$ETAG_CACHE" | cut -d'=' -f2-
}

# 根据 path 读取时间戳
GET_TIMESTAMP_BY_PATH() {
    local path=$1
    [ ! -f "$ETAG_CACHE" ] && return 1
    
    awk -v search_path="$path" '
        /^\[/ { found=0 }
        found && /^path=/ && $0 ~ search_path { found_path=1 }
        found_path && /^timestamp=/ { print $0; exit }
        /^\[/ { found=1; found_path=0 }
    ' "$ETAG_CACHE" | cut -d'=' -f2-
}

# 根据 path 读取 ETag
GET_ETAG_BY_PATH() {
    local path=$1
    [ ! -f "$ETAG_CACHE" ] && return 1
    
    awk -v search_path="$path" '
        /^\[/ { found=0 }
        found && /^path=/ && $0 ~ search_path { found_path=1 }
        found_path && /^etag=/ { print $0; exit }
        /^\[/ { found=1; found_path=0 }
    ' "$ETAG_CACHE" | cut -d'=' -f2-
}

# 保存或更新 ETag
SAVE_ETAG_TO_CACHE() {
    local url=$1
    local etag=$2
    local path=$3
    
    local url_hash=$(echo -n "$url" | md5sum | cut -d' ' -f1)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    mkdir -p "$(dirname "$ETAG_CACHE")"
    
    [ ! -f "$ETAG_CACHE" ] && echo "# ETag Cache File" > "$ETAG_CACHE"
    
    if grep -q "^\[$url_hash\]" "$ETAG_CACHE"; then
        local temp_file="${ETAG_CACHE}.tmp"
        awk -v hash="$url_hash" \
            -v new_url="$url" \
            -v new_etag="$etag" \
            -v new_path="$path" \
            -v new_ts="$timestamp" '
            $0 ~ "^\\[" hash "\\]" { 
                print; 
                found=1; 
                next 
            }
            /^\[/ { found=0 }
            found && /^url=/ { 
                print "url=" new_url; 
                next 
            }
            found && /^path=/ { 
                print "path=" new_path; 
                next 
            }
            found && /^etag=/ { 
                print "etag=" new_etag; 
                next 
            }
            found && /^timestamp=/ { 
                print "timestamp=" new_ts; 
                next 
            }
            { print }
        ' "$ETAG_CACHE" > "$temp_file"
        mv "$temp_file" "$ETAG_CACHE"
    else
        cat >> "$ETAG_CACHE" << EOF

[$url_hash]
url=$url
path=$path
etag=$etag
timestamp=$timestamp
EOF
    fi
}

# 删除指定 URL 的缓存
DELETE_ETAG_FROM_CACHE() {
    local url=$1
    [ ! -f "$ETAG_CACHE" ] && return 1
    
    local url_hash=$(echo -n "$url" | md5sum | cut -d' ' -f1)
    local temp_file="${ETAG_CACHE}.tmp"
    
    awk -v hash="$url_hash" '
        $0 ~ "^\\[" hash "\\]" { skip=1; next }
        /^\[/ && !/^\\[/ hash "\\]/ { skip=0 }
        !skip { print }
    ' "$ETAG_CACHE" > "$temp_file"
    mv "$temp_file" "$ETAG_CACHE"
}

# 列出所有缓存
LIST_ETAG_CACHE() {
    [ ! -f "$ETAG_CACHE" ] && return 1
    cat "$ETAG_CACHE"
}

# 查询指定 URL 的缓存
QUERY_CACHE_BY_URL() {
    local url=$1
    local url_hash=$(echo -n "$url" | md5sum | cut -d' ' -f1)
    
    awk -v hash="$url_hash" '
        $0 ~ "^\\[" hash "\\]" { found=1 }
        /^\[/ && !/^\\[/ hash "\\]/ { found=0 }
        found { print }
    ' "$ETAG_CACHE"
}