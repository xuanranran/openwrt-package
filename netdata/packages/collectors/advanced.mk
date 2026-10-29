# SPDX-License-Identifier: GPL-2.0-only

$(eval $(call NetdataPlugin,go,plugin-go,ENABLE_PLUGIN_GO,Collectors: Go engine,@(aarch64||arm||i386||loongarch64||mips||mips64||mips64el||mipsel||riscv64||x86_64)))
$(eval $(call NetdataPlugin,scripts,plugin-scripts,ENABLE_PLUGIN_SCRIPTS,Collectors: Nagios-compatible scripts,@(aarch64||arm||i386||loongarch64||mips||mips64||mips64el||mipsel||riscv64||x86_64)))
$(eval $(call NetdataPlugin,statsd,plugin-statsd,ENABLE_PLUGIN_STATSD,Metrics: StatsD receiver,@(aarch64||arm||i386||loongarch64||mips||mips64||mips64el||mipsel||riscv64||x86_64)))
$(eval $(call NetdataPlugin,otel,plugin-otel,ENABLE_PLUGIN_OTEL,Telemetry: OpenTelemetry metrics logs and traces,@(aarch64||x86_64)))
$(eval $(call NetdataPlugin,netflow,plugin-netflow,ENABLE_PLUGIN_NETFLOW,Network: NetFlow IPFIX and sFlow receiver,@(aarch64||x86_64)))
$(eval $(call NetdataPlugin,systemd-journal,plugin-systemd-journal,ENABLE_PLUGIN_SYSTEMD_JOURNAL,Logs: read journal files without systemd,@(aarch64||x86_64)))
$(eval $(call NetdataPlugin,ebpf,plugin-ebpf,ENABLE_PLUGIN_EBPF,Kernel: eBPF CO-RE collectors,+libelf @(aarch64||x86_64)))

# Go is one executable; collector configuration is owned by separate subpackages.
define Package/netdata-plugin-go/install
	$(CP) $(PKG_INSTALL_DIR)/plugin-go/. $(1)/
	$(RM) $(1)/usr/lib/netdata/conf.d/go.d/*.conf
	$(INSTALL_DIR) $(1)/usr/libexec/netdata
	$(INSTALL_BIN) ./files/update-go-config $(1)/usr/libexec/netdata/update-go-config
endef

define Package/netdata-plugin-go/postinst
#!/bin/sh
"$${IPKG_INSTROOT}/usr/libexec/netdata/update-go-config" "$${IPKG_INSTROOT}"
endef
