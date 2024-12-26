module("luci.controller.cpufreq", package.seeall)

function index()
	if not nixio.fs.access("/etc/config/cpufreq") or not nixio.fs.access("/etc/config/irqbalance") then
		return
	end

	local page = entry({"admin", "system", "cpufreq"}, alias("admin", "system", "cpufreq", "cpufreq"), _("CPU Freq"), 90)
	page.dependent = true
	page.acl_depends = { "luci-app-cpufreq" }

	entry({"admin", "system", "cpufreq", "cpufreq"}, cbi("cpufreq/cpufreq"), _("CPU Setting"), 1).leaf = true
	entry({"admin", "system", "cpufreq", "pwmfan"}, cbi("cpufreq/pwmfan"), _("PWM Fan Controller"), 2).leaf = true
	entry({"admin", "system", "cpufreq", "irqbalance"}, cbi("cpufreq/irqbalance"), _("Irqbalance"), 3).leaf = true
	entry({"admin", "system", "cpufreq", "mglru"}, cbi("cpufreq/mglru"), _("Multi-Gen LRU"), 4).leaf = true

	entry({"admin", "system", "cpufreq", "irq_status"}, call("irq_status")).leaf = true
end

function irq_status()
	local log_data={}
	log_data.syslog=luci.sys.exec("cat /proc/interrupts | egrep '^[ ]*(CPU|[0-9]*:)'")
	luci.http.prepare_content("application/json")
	luci.http.write_json(log_data)
end
