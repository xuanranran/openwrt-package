#!/bin/bash
# From: QiuSimons

echo 'teamviewer.com
epicgames.com
dangdang.com
account.synology.com
ddns.synology.com
checkip.synology.com
checkip.dyndns.org
checkipv6.synology.com
ntp.aliyun.com
cn.ntp.org.cn
ntp.ntsc.ac.cn' >>./openwrt_helloworld/luci-app-passwall/root/usr/share/passwall/rules/direct_host


echo 'account.synology.com
ddns.synology.com
checkip.synology.com
checkip.dyndns.org
checkipv6.synology.com
ntp.aliyun.com
cn.ntp.org.cn
ntp.ntsc.ac.cn' >>./luci-app-mosdns/luci-app-mosdns/root/etc/mosdns/rule/whitelist.txt

exit 0
