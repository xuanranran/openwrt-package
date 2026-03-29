# luci-app-ota

一款简易的 LuCI 在线更新 (OTA) 插件，用于在 LuCI 上为 OpenWrt 在线检查和升级固件。

## 工作原理

通过对比固件本地的构建时间戳和 API JSON 的时间戳，来判断是否有新版本。

## 如何使用

### 1. 固件配置

固件在编译时，需在 `/etc/os-release` 文件中写入一个 `BUILD_DATE` 变量。

该 `BUILD_DATE` 必须是 **Unix 时间戳**，更新检查依赖此值。

**/etc/os-release 文件示例:**
```
BUILD_DATE="1774124635"
```

### 2. API 配置

API 的配置文件路径为：

```
/etc/config/ota
```

需将文件内的 `api_url` 选项设置为 API 地址

### 3. API JSON 格式

API 需提供一个 JSON 文件。JSON 的第一层键名是设备标识符（例如 `x86_64`），脚本会根据此标识符查找对应的固件信息。

每个固件信息包含以下字段：

- `build_date`: 固件的构建时间戳，用于和本地 `BUILD_DATE` 对比。
- `sha256sum`: 固件的 SHA256 校验和，用于在下载后检查文件完整性。
- `url`: 固件的下载地址。

- `logs` (可选, 字符串): 固件的更新日志。如果提供了这个字段，当检测到新版本时，日志内容会显示在界面上。

**JSON 格式示例:**

```json
{
    "x86_64": [
        {
            "build_date": "1774124660",
            "sha256sum": "b6745d159df428e9a74d74fc3f4bbbc15498f468072cfb4aa785be1019d4e163",
            "url": "https://example.com/path/to/firmware1.img.gz",
            "logs": "- 修复了 xxx 问题\n- 新增了 yyy 功能（可选）"
        }
    ],
    "friendlyarm,nanopi-r76s": [
        {
            "build_date": "1774124622",
            "sha256sum": "415bd9d0081cf03a99db4e041defba87e80d2c6ae54cf0dff3fe9a4cca528b9c",
            "url": "https://example.com/path/to/firmware2.img.gz",
            "logs": "- 修复了 xxx 问题\n- 新增了 yyy 功能（可选）"
        }
    ]
}
```

## 感谢

- `/usr/bin/ota` 脚本来自 [jjm2473](https://github.com/jjm2473)
