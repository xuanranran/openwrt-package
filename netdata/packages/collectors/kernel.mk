# SPDX-License-Identifier: GPL-2.0-only
$(eval $(call NetdataPlugin,debugfs,plugin-debugfs,ENABLE_PLUGIN_DEBUGFS,Kernel: DebugFS and hardware sensors,))
$(eval $(call NetdataPlugin,perf,plugin-perf,ENABLE_PLUGIN_PERF,Kernel: performance counters,))
$(eval $(call NetdataPlugin,slabinfo,plugin-slabinfo,ENABLE_PLUGIN_SLABINFO,Kernel: SLAB allocator monitoring,))
