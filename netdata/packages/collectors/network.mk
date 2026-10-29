# SPDX-License-Identifier: GPL-2.0-only
$(eval $(call NetdataPlugin,network-viewer,plugin-network-viewer,ENABLE_PLUGIN_NETWORK_VIEWER,Network: connection viewer,))
$(eval $(call NetdataPlugin,local-listeners,plugin-local-listeners,ENABLE_PLUGIN_LOCAL_LISTENERS,Network: local listening sockets,))
$(eval $(call NetdataPlugin,cgroup-network,plugin-cgroup-network,ENABLE_PLUGIN_CGROUP_NETWORK,Network: cgroup namespace helper,))
$(eval $(call NetdataPlugin,nfacct,plugin-nfacct,ENABLE_PLUGIN_NFACCT,Network: Netfilter accounting,+libnetfilter-acct))
