# luci-app-device-access

适用于使用 firewall4 的 OpenWrt 和 ImmortalWrt。通过 LuCI 按设备 MAC 地址控制外网访问。

## 使用

打开 **网络 → 设备上网控制**。从「已连接设备」选择 **禁止联网** 或 **设置联网时段**，也可以在「访问规则」中手动添加 MAC 地址。

- **始终断网**会持续限制该设备的外网访问。
- **时段内断网**会在选定星期和时段限制外网访问。
- **仅时段内允许上网**会限制设定时段以外的外网访问。

时段按路由器本地时间执行。跨午夜的时段归入开始当天。配置完成后点 **保存并应用**。

外网出口默认选 `wan`。断网规则会在 OpenClash 等透明代理接管流量前，拦截原始目标走所选外网出口的 IPv4 和 IPv6 流量。访问路由器和其他局域网仍按原有防火墙规则处理。流量卸载或显式连接路由器上的代理端口可能绕过断网规则。实时速率和限速针对经过所选外网区域的常规转发流量。

## 实时速率和设备档案

「已连接设备」显示外网的上传和下载速率。点 **设备设置** 可修改显示名称、添加同一设备的其他 MAC 地址，并分别填写上传和下载限速，单位为 `kbit/s`。留空或填 `0` 表示不限速。限速使用 nftables 的令牌桶，超出额度的包会丢弃。下载限速通过路由器已学习的客户端 IPv4 或 IPv6 邻居地址匹配。

带有本地管理标记的 MAC 会提示「疑似随机 MAC」。发现主机名与已有设备档案唯一匹配时，关联窗口会给出建议，由用户确认。关联后的地址共用名称、限速和上网规则。

## 加入固件编译

在已配置目标设备和 LuCI feed 的 OpenWrt 或 ImmortalWrt 编译目录中执行以下命令。

```sh
git clone https://github.com/xuanranran/luci-app-device-access.git package/luci-app-device-access
make menuconfig
make defconfig
make package/luci-app-device-access/compile V=s
```

在 `menuconfig` 中搜索 `luci-app-device-access`。选 `y` 将插件打进固件，选 `m` 生成可单独安装的软件包。需要简体中文时，同时启用 `luci-i18n-device-access-zh-cn`。

## 许可证

GPL-2.0-only。完整条款见 [LICENSE](LICENSE)。
