<h4 align="right"><strong>English</strong> | <a href="README_zh.md">简体中文</a></h4>
<h1 align="center">LuCI App Aurora Config</h1>
<p align="center"><strong>The personalized assistant for the Aurora Theme.</strong></p>
<h4 align="center">🎨 Visual Customization | 📐 Interface Layout | 🚀 One-Click Updates</h4>
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

## Features

- **Professional Color System**: Five built-in presets (Default, Monochrome, Sage Green, Amber Sand, Sky Blue) plus a live color editor with independent Light and Dark palettes; derived colors are generated automatically.
- **Layout & Typography**: Switch the navigation between Mega Menu, Dropdown, and Sidebar; fine-tune spacing scale, corner radius, and content max width with sliders; and pick downloadable sans-serif and monospace typefaces that are fetched and cached on the router.
- **Branding & PWA**: Drag-and-drop brand assets into the library, then assign the logo, favicons, Apple Touch / 192×192 / 512×512 app icons, and a full-screen login background. A generated web app manifest makes the panel installable as a PWA.
- **Shortcut Toolbar**: Add, label, icon, and drag-reorder entries in the floating launcher for quick access to frequently used pages.
- **Backup & Updates**: Export, import, or reset the entire configuration in one click, and update the theme and config app directly from the interface—no CLI or SSH required.

<div align="center">
  <img src="https://raw.githubusercontent.com/eamonxg/assets/master/aurora/preview/config/multi-theme-showcase.png" alt="Multi Theme Showcase" width="1200">
</div>

## Compatibility

| Component             | Requirement | Note                                             |
| :-------------------- | :---------- | :----------------------------------------------- |
| **LuCI Theme Aurora** | `≥ v1.0.0`  | Older versions will ignore these configurations. |
| **OpenWrt**           | `≥ 23.05`   | Lua-based LuCI are not supported.                |

## Install a pre-built release

### Using opkg:

```sh
cd /tmp && uclient-fetch -O luci-app-aurora-config.ipk https://github.com/eamonxg/luci-app-aurora-config/releases/latest/download/luci-app-aurora-config_1.0.0-r20260619_all.ipk && opkg install luci-app-aurora-config.ipk
```

### Using apk:

```sh
cd /tmp && uclient-fetch -O luci-app-aurora-config.apk https://github.com/eamonxg/luci-app-aurora-config/releases/latest/download/luci-app-aurora-config-1.0.0-r20260619.apk && apk add --allow-untrusted luci-app-aurora-config.apk
```

## Build from source

Build the package yourself with the OpenWrt build system. Host prerequisites: [Build system setup](https://openwrt.org/docs/guide-developer/toolchain/install-buildsystem). The build writes the package to `bin/packages/<arch>/base/` (e.g. `bin/packages/x86_64/base/luci-app-aurora-config_*_all.ipk`); copy it to your router and install it as above.

### Via the OpenWrt buildroot

```sh
# Clone OpenWrt — the openwrt-24.10 branch builds an .ipk, the main branch builds an .apk
git clone https://github.com/openwrt/openwrt.git
cd openwrt
git checkout openwrt-24.10       # omit to stay on main (snapshots → .apk)

# Add this package and install feeds (provides luci-base)
git clone https://github.com/eamonxg/luci-app-aurora-config.git package/luci-app-aurora-config
./scripts/feeds update -a
./scripts/feeds install -a

# Select the app in menuconfig: LuCI → Applications → luci-app-aurora-config
make menuconfig

# Build host tools + toolchain, then compile the package
make tools/install -j$(nproc)
make toolchain/install -j$(nproc)
make package/luci-app-aurora-config/compile -j$(nproc) V=s
```

### Via the prebuilt SDK (faster)

The [OpenWrt SDK](https://openwrt.org/docs/guide-developer/toolchain/using_the_sdk) bundles a prebuilt toolchain, so the `tools/install` / `toolchain/install` steps are skipped. Download the SDK for your target from [downloads.openwrt.org](https://downloads.openwrt.org) (a release SDK builds `.ipk`, a snapshot SDK builds `.apk`), extract it, then from the SDK directory:

```sh
git clone https://github.com/eamonxg/luci-app-aurora-config.git package/luci-app-aurora-config
./scripts/feeds update -a
./scripts/feeds install -a

# Select the app in menuconfig: LuCI → Applications → luci-app-aurora-config
make menuconfig
make package/luci-app-aurora-config/compile -j$(nproc) V=s
```
