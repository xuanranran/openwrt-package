#!/usr/bin/env python3

from __future__ import annotations

import argparse
import io
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
from pathlib import Path


PKG_NAME = "luci-theme-win98"
PKG_VERSION = "2026.05.16-r147"
PKG_ARCH = "all"
PKG_DEPENDS = "luci-base, luci-theme-openwrt"
PKG_DESCRIPTION = "OpenWrt LuCI 24.x Windows 98 retro theme"
PKG_MAINTAINER = "Codex"
PKG_SECTION = "luci"
PKG_PRIORITY = "optional"
VERSION_RE = re.compile(r'^(?P<base>\d{4}\.\d{2}\.\d{2})-r(?P<revision>\d+)$')
PKG_VERSION_RE = re.compile(r'^(PKG_VERSION = ")([^"]+)(")$', re.MULTILINE)
EXCLUDED_DATA_SUFFIXES = {".ico"}


def bump_version(version: str) -> str:
    match = VERSION_RE.match(version)
    if not match:
        raise ValueError(f"Unsupported package version format: {version}")

    revision = int(match.group("revision")) + 1
    return f"{match.group('base')}-r{revision}"


def bump_script_version(script_path: Path) -> str:
    text = script_path.read_text(encoding="utf-8")
    match = PKG_VERSION_RE.search(text)
    if not match:
        raise ValueError(f"PKG_VERSION assignment not found in {script_path}")

    next_version = bump_version(match.group(2))
    updated = PKG_VERSION_RE.sub(rf'\g<1>{next_version}\g<3>', text, count=1)
    with script_path.open("w", encoding="utf-8", newline="") as fh:
        fh.write(updated)
    return next_version


def normalize_mode(path: Path) -> int:
    if path.name == "30_luci-theme-win98":
        return 0o755
    if path.suffix == ".sh":
        return 0o755
    return 0o644


def add_dir_entry(tf: tarfile.TarFile, arcname: str) -> None:
    arcname = arcname.rstrip("/")
    if not arcname:
        return

    info = tarfile.TarInfo(name=arcname)
    info.type = tarfile.DIRTYPE
    info.mode = 0o755
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    info.mtime = int(time.time())
    tf.addfile(info)


def add_parent_dirs(tf: tarfile.TarFile, arcname: str, seen_dirs: set[str]) -> None:
    pure = Path(arcname.lstrip("./"))
    parts = pure.parts[:-1]
    current: list[str] = []
    for part in parts:
        current.append(part)
        dirname = "./" + "/".join(current)
        if dirname not in seen_dirs:
            add_dir_entry(tf, dirname)
            seen_dirs.add(dirname)


def add_tree(tf: tarfile.TarFile, src_root: Path, dst_root: str) -> None:
    if not src_root.exists():
        return

    seen_dirs: set[str] = set()
    if dst_root and dst_root != ".":
        current: list[str] = []
        for part in Path(dst_root.lstrip("./")).parts:
            current.append(part)
            dirname = "./" + "/".join(current)
            if dirname not in seen_dirs:
                add_dir_entry(tf, dirname)
                seen_dirs.add(dirname)

    for path in sorted(src_root.rglob("*")):
        if path.is_file() and path.suffix.lower() in EXCLUDED_DATA_SUFFIXES:
            continue

        rel = path.relative_to(src_root).as_posix()
        arcname = f"{dst_root}/{rel}" if dst_root else rel

        if path.is_dir():
            dirname = arcname.rstrip("/")
            if dirname and dirname not in seen_dirs:
                add_parent_dirs(tf, dirname + "/.", seen_dirs)
                add_dir_entry(tf, dirname)
                seen_dirs.add(dirname)
            continue

        add_parent_dirs(tf, arcname, seen_dirs)
        info = tf.gettarinfo(str(path), arcname=arcname)
        info.uid = 0
        info.gid = 0
        info.uname = "root"
        info.gname = "root"
        info.mode = normalize_mode(path)
        with path.open("rb") as fh:
            tf.addfile(info, fh)


def tar_from_entries(entries: list[tuple[str, bytes, int]]) -> bytes:
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz", format=tarfile.GNU_FORMAT) as tf:
        add_dir_entry(tf, ".")
        for name, data, mode in entries:
            info = tarfile.TarInfo(name=name)
            info.size = len(data)
            info.mode = mode
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            info.mtime = int(time.time())
            tf.addfile(info, io.BytesIO(data))
    return output.getvalue()


def build_control_tar() -> bytes:
    control_text = "\n".join(
        [
            f"Package: {PKG_NAME}",
            f"Version: {PKG_VERSION}",
            f"Depends: {PKG_DEPENDS}",
            "Source: local",
            f"Section: {PKG_SECTION}",
            f"Priority: {PKG_PRIORITY}",
            f"Maintainer: {PKG_MAINTAINER}",
            f"Architecture: {PKG_ARCH}",
            f"Description: {PKG_DESCRIPTION}",
            "",
        ]
    ).encode("utf-8")

    postinst = """#!/bin/sh
[ -n "${IPKG_INSTROOT}" ] || {
\tif ! uci -q get luci.themes.Win98 >/dev/null 2>&1; then
\t\tuci set luci.themes.Win98='/luci-static/win98'
\tfi
\tif ! uci -q get luci.main.mediaurlbase >/dev/null 2>&1; then
\t\tuci set luci.main.mediaurlbase='/luci-static/win98'
\tfi
\tuci commit luci
\trm -f /tmp/luci-indexcache.*
\trm -rf /tmp/luci-modulecache/
\t/etc/init.d/rpcd reload 2>/dev/null
\texit 0
}
""".encode("utf-8")

    postrm = """#!/bin/sh
[ -n "${IPKG_INSTROOT}" ] || {
\tif [ "$(uci -q get luci.main.mediaurlbase)" = "/luci-static/win98" ]; then
\t\tuci -q set luci.main.mediaurlbase='/luci-static/openwrt.org'
\tfi
\tuci -q delete luci.themes.Win98
\tuci commit luci
}
""".encode("utf-8")

    return tar_from_entries(
        [
            ("./control", control_text, 0o644),
            ("./postinst", postinst, 0o755),
            ("./postrm", postrm, 0o755),
        ]
    )


def build_data_tar(root: Path) -> bytes:
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz", format=tarfile.GNU_FORMAT) as tf:
        add_tree(tf, root / "htdocs", "./www")
        add_tree(tf, root / "root", ".")
        add_tree(tf, root / "ucode", "./usr/share/ucode/luci")
    return output.getvalue()


def find_ar() -> str:
    candidates = [
        shutil.which("llvm-ar"),
        shutil.which("ar"),
        r"C:\Users\fffon\scoop\apps\llvm\19.1.7\bin\llvm-ar.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    raise FileNotFoundError("No ar/llvm-ar executable found")


def build_ipk_ar(root: Path, output_path: Path) -> None:
    control = build_control_tar()
    data = build_data_tar(root)
    ar_path = find_ar()

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        (tmpdir / "debian-binary").write_bytes(b"2.0\n")
        (tmpdir / "data.tar.gz").write_bytes(data)
        (tmpdir / "control.tar.gz").write_bytes(control)

        if output_path.exists():
            output_path.unlink()

        subprocess.run(
            [
                ar_path,
                "rcS",
                str(output_path),
                "debian-binary",
                "data.tar.gz",
                "control.tar.gz",
            ],
            cwd=tmpdir,
            check=True,
        )


def build_ipk_tar(root: Path, output_path: Path) -> None:
    control = build_control_tar()
    data = build_data_tar(root)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    with tarfile.open(output_path, mode="w:gz", format=tarfile.GNU_FORMAT) as tf:
        add_dir_entry(tf, ".")
        entries = [
            ("./debian-binary", b"2.0\n", 0o644),
            ("./data.tar.gz", data, 0o644),
            ("./control.tar.gz", control, 0o644),
        ]
        for name, body, mode in entries:
            info = tarfile.TarInfo(name=name)
            info.size = len(body)
            info.mode = mode
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            info.mtime = int(time.time())
            tf.addfile(info, io.BytesIO(body))


def main() -> int:
    global PKG_VERSION

    parser = argparse.ArgumentParser(description="Build a local .ipk for luci-theme-win98")
    parser.add_argument(
        "--root",
        default=Path(__file__).resolve().parents[1],
        type=Path,
        help="Repository root",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output .ipk path",
    )
    parser.add_argument(
        "--format",
        choices=("tar", "ar"),
        default="tar",
        help="Outer package container format",
    )
    args = parser.parse_args()

    PKG_VERSION = bump_script_version(Path(__file__).resolve())

    root = args.root.resolve()
    output_path = args.out or (root / "dist" / f"{PKG_NAME}_{PKG_VERSION}_{PKG_ARCH}.ipk")
    output_path = output_path.resolve()
    if args.format == "ar":
        build_ipk_ar(root, output_path)
    else:
        build_ipk_tar(root, output_path)
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
