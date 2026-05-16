# luci-theme-win98

[中文文档](README.zh.md)

`luci-theme-win98` is an OpenWrt 24.x / LuCI theme with a Windows 98 inspired desktop style. It uses classic gray window chrome, raised buttons, recessed inputs, blue title bars, a teal desktop background, and a fixed taskbar footer.

## Preview

![LuCI Windows 98 login preview](docs/login.png)

![LuCI Windows 98 desktop preview](docs/overview.png)

## Features

- OpenWrt 24.x / LuCI ucode theme structure
- Windows 98 inspired desktop background, taskbar, window frames, tabs, buttons, and forms
- Classic menu icons sourced from the GPL-2.0 `nestoris/Win98SE` icon theme and bundled under `htdocs/luci-static/win98/icons/menu/`
- Start button flag asset is downloaded from the public-domain Wikimedia Commons `Windows logo - 1992.svg` file.
- Uses `Pixelated MS Sans Serif` from the MIT-licensed `jdan/98.css` project as the primary UI font
- Static assets served from `/luci-static/win98`
- LuCI theme registration name: `Win98`
- Includes login page, header, footer, desktop icon, table, form, alert, and mobile styles
- Can be packaged locally as an `.ipk`

## Directory Layout

```text
htdocs/luci-static/win98/         # Static assets and CSS
ucode/template/themes/win98/      # LuCI ucode templates
root/etc/uci-defaults/            # Theme registration script
scripts/build_ipk.py              # Local .ipk package builder
```

## Use In An OpenWrt Feed

Place this directory under a LuCI feed path, then run:

```sh
./scripts/feeds update -a
./scripts/feeds install luci-theme-win98
make menuconfig
```

Enable it under:

```text
LuCI -> Themes -> luci-theme-win98
```

After installation, switch to `Win98` in the LuCI theme settings.

## Local Packaging

This repository includes a buildroot-independent packaging script:

```sh
python scripts/build_ipk.py
```

Each run increments the package revision suffix in `scripts/build_ipk.py`, for example from `2026.05.16-r13` to `2026.05.16-r14`, and uses that new version for the package control metadata. The default artifact is written to `dist/`. You can also specify an output path:

```sh
python scripts/build_ipk.py --out dist/luci-theme-win98.ipk
```

## GitHub Actions

The included workflow builds the package on push, pull request, and manual dispatch, then uploads the `.ipk` artifact.
