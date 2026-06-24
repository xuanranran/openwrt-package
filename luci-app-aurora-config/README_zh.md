<h4 align="right"><a href="README.md"><strong>English</strong></a> | 简体中文</h4>
<h1 align="center">LuCI App Aurora Config</h1>
<p align="center"><strong>Aurora 主题的个性化助手。</strong></p>
<h4 align="center">🎨 视觉定制 | 📐 界面布局 | 🚀 一键更新</h4>
<div align="center">
  <a href="https://openwrt.org"><img alt="OpenWrt" src="https://img.shields.io/badge/OpenWrt-%E2%89%A523.05-00B5E2?logo=openwrt&logoColor=white"></a>
  <a href="https://github.com/eamonxg/luci-theme-aurora"><img alt="LuCI Theme Aurora" src="https://img.shields.io/badge/Theme-Aurora-46a3d1?logo=openwrt&logoColor=white"></a>
  <a href="https://github.com/eamonxg/luci-app-aurora-config/releases/latest"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/eamonxg/luci-app-aurora-config?logo=github&color=4ADE80"></a>
  <a href="https://github.com/eamonxg/luci-app-aurora-config/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/eamonxg/luci-app-aurora-config/total?color=orange"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue?logo=apache"></a>
</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/eamonxg/assets/master/aurora/preview/config/theme-settings-showcase.png" alt="Theme Settings Showcase" width="100%">
</div>

## 功能特性

- **专业配色系统**：内置 5 种主题预设（Default、Monochrome、Sage Green、Amber Sand、Sky Blue），并提供浅色/深色独立的实时配色编辑器，派生色彩自动生成。
- **布局与排版**：在 Mega Menu、下拉菜单、侧边栏三种导航样式间切换；通过滑块微调间距比例、圆角半径与内容最大宽度；并可选择无衬线与等宽字体，字体会自动下载并缓存到路由器。
- **品牌标识与 PWA**：拖拽上传品牌资源到资源库，再分配 Logo、favicon、Apple Touch / 192×192 / 512×512 应用图标，以及全屏登录背景。生成的 Web 应用清单（manifest）让面板可作为 PWA 安装。
- **悬浮工具栏**：在悬浮启动器中添加、命名、配图标并拖拽排序快捷方式，快速访问常用页面。
- **备份与更新**：一键导出、导入或重置整套配置，并直接在界面中更新主题和配置应用，无需使用 CLI 命令行或 SSH。

<div align="center">
  <img src="https://raw.githubusercontent.com/eamonxg/assets/master/aurora/preview/config/multi-theme-showcase.png" alt="Multi Theme Showcase" width="1200">
</div>

## 兼容性

| 组件                  | 要求        | 说明                     |
| :-------------------- | :---------- | :----------------------- |
| **LuCI Theme Aurora** | `≥ v1.0.0`  | 旧版本将忽略这些配置。   |
| **OpenWrt**           | `≥ 23.05`   | 不支持基于 Lua 的 LuCI。 |

## 安装预编译包

### 使用 opkg:

```sh
cd /tmp && uclient-fetch -O luci-app-aurora-config.ipk https://github.com/eamonxg/luci-app-aurora-config/releases/latest/download/luci-app-aurora-config_1.0.0-r20260619_all.ipk && opkg install luci-app-aurora-config.ipk
```

### 使用 apk:

```sh
cd /tmp && uclient-fetch -O luci-app-aurora-config.apk https://github.com/eamonxg/luci-app-aurora-config/releases/latest/download/luci-app-aurora-config-1.0.0-r20260619.apk && apk add --allow-untrusted luci-app-aurora-config.apk
```

## 从源码构建

使用 OpenWrt 构建系统自行编译。主机前置条件见 [Build system setup](https://openwrt.org/docs/guide-developer/toolchain/install-buildsystem)。产物位于 `bin/packages/<arch>/base/`（例如 `bin/packages/x86_64/base/luci-app-aurora-config_*_all.ipk`），拷贝到路由器后按上文方式安装即可。

### 通过 OpenWrt buildroot

```sh
# 克隆 OpenWrt——openwrt-24.10 分支构建 .ipk，main 分支构建 .apk
git clone https://github.com/openwrt/openwrt.git
cd openwrt
git checkout openwrt-24.10       # 省略则停留在 main（snapshot → .apk）

# 加入本软件包并安装 feeds（提供 luci-base）
git clone https://github.com/eamonxg/luci-app-aurora-config.git package/luci-app-aurora-config
./scripts/feeds update -a
./scripts/feeds install -a

# 在 menuconfig 中勾选应用：LuCI → Applications → luci-app-aurora-config
make menuconfig

# 先编译主机工具与工具链，再编译本软件包
make tools/install -j$(nproc)
make toolchain/install -j$(nproc)
make package/luci-app-aurora-config/compile -j$(nproc) V=s
```

### 通过预编译 SDK（更快）

[OpenWrt SDK](https://openwrt.org/docs/guide-developer/toolchain/using_the_sdk) 自带预编译工具链，可省去 `tools/install` / `toolchain/install` 步骤。从 [downloads.openwrt.org](https://downloads.openwrt.org) 下载与目标匹配的 SDK（release SDK 构建 `.ipk`，snapshot SDK 构建 `.apk`）并解压，然后在 SDK 目录中执行：

```sh
git clone https://github.com/eamonxg/luci-app-aurora-config.git package/luci-app-aurora-config
./scripts/feeds update -a
./scripts/feeds install -a

# 在 menuconfig 中勾选应用：LuCI → Applications → luci-app-aurora-config
make menuconfig
make package/luci-app-aurora-config/compile -j$(nproc) V=s
```
