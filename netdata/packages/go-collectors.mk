# SPDX-License-Identifier: GPL-2.0-only

# Local systemd-only collectors are deliberately excluded on OpenWrt.
NETDATA_GO_COLLECTORS:=activemq adaptec_raid ap apache apcupsd azure_monitor beanstalk bind boinc cassandra cato_networks ceph chrony clickhouse cloudwatch cockroachdb consul coredns couchbase couchdb dcgm dmcache dns_query dnsdist dnsmasq_dhcp dnsmasq docker_engine docker dockerhub dovecot elasticsearch envoy ethtool exim fail2ban filecheck fluentd freeradius gearman geth hddtemp hdfs hpssa httpcheck icecast intelgpu ipfs isc_dhcpd k8s_apiserver k8s_kubelet k8s_kubeproxy k8s_state lighttpd litespeed logstash lvm maxscale megacli memcached mongodb monit mssql mysql nats nginx nginxplus nginxunit nginxvts nsd ntpd nvidia_smi nvme openldap openvpn_status_log openvpn oracledb panos pgbouncer phpdaemon phpfpm pihole pika ping portcheck postfix postgres powerdns_recursor powerdns powerstore powervault prometheus proxysql pulsar puppet rabbitmq redfish redis rethinkdb riakkv rspamd s3check samba scaleio smartctl smbios_memory snmp_topology snmp_traps snmp spigotmc squid squidlog storcli supervisord tengine tomcat tor traefik typesense unbound upsd uwsgi varnish vcsa vernemq vsphere w1sensor web_log whoisquery wireguard x509check yugabytedb zfspool zookeeper

define NetdataGoCollector
  define Package/netdata-collector-$(subst _,-,$(1))
    $$(call Package/netdata/Default)
    SUBMENU:=Netdata Go collectors
    TITLE:=Go collector: $(1)
    DEPENDS:=+netdata-plugin-go
    PKGARCH:=all
  endef

  define Package/netdata-collector-$(subst _,-,$(1))/install
	$$(INSTALL_DIR) $$(1)/usr/lib/netdata/conf.d/go.d
	$$(INSTALL_DATA) $$(PKG_INSTALL_DIR)/plugin-go/usr/lib/netdata/conf.d/go.d/$(1).conf $$(1)/usr/lib/netdata/conf.d/go.d/
  endef

  define Package/netdata-collector-$(subst _,-,$(1))/postinst
#!/bin/sh
"$$$${IPKG_INSTROOT}/usr/libexec/netdata/update-go-config" "$$$${IPKG_INSTROOT}"
  endef

  define Package/netdata-collector-$(subst _,-,$(1))/postrm
#!/bin/sh
[ ! -x "$$$${IPKG_INSTROOT}/usr/libexec/netdata/update-go-config" ] || \
    "$$$${IPKG_INSTROOT}/usr/libexec/netdata/update-go-config" "$$$${IPKG_INSTROOT}"
exit 0
  endef

  NETDATA_PACKAGES+=netdata-collector-$(subst _,-,$(1))
endef

$(foreach collector,$(NETDATA_GO_COLLECTORS),$(eval $(call NetdataGoCollector,$(collector))))
