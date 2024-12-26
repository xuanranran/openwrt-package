mp = Map("cpufreq", translate("Multi-Gen LRU"))
mp.description = translate("The multi-gen LRU is an alternative LRU implementation that optimizes page reclaim and improves performance under memory pressure. Page reclaim decides the kernel's caching policy and ability to overcommit memory. It directly impacts the kswapd CPU usage and RAM efficiency.")

s = mp:section(NamedSection, "cpufreq", "settings")
s.anonymouse = true

o = s:option(Flag, "mglru_enabled", translate("Enabled"))
o.default = true
o.rmempty = false

o = s:option(Value, "mglru_min_ttl_ms", translate("Thrashing prevention (ms)"), translate("Set the thrashing prevention vaule to prevent the working set of N milliseconds from getting evicted. The OOM killer is triggered if this working set cannot be kept in memory. (0 means disabled, Default value 1000)"))
o.datatype = "and(uinteger,min(0))"
o.default = "1000"
o.rmempty = false

return mp
