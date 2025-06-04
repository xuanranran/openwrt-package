local fs = require "nixio.fs"
local http = require "luci.http"
local uci = luci.model.uci.cursor()
local ap = "advancedplus"
module("luci.controller.advancedplus", package.seeall)

function index()
	if not fs.access("/etc/config/advancedplus") then return end

	local page
	page = entry({"admin", "system", "advancedplus"}, alias("admin", "system", "advancedplus", "advancededit"), _("Advanced Plus"), 61)
	page.dependent = true
	page.acl_depends = { "luci-app-advancedplus" }
	entry({"admin", "system", "advancedplus", "advancededit"}, cbi("advancedplus/advancededit"), _("Advanced Edit"), 10).leaf = true
	entry({"admin", "system", "advancedplus", "advancedset"}, cbi("advancedplus/advancedset"), _("Advanced Setting"), 20).leaf = true
	if fs.access('/www/luci-static/kucat/css/style.css') then
		entry({"admin", "system", "advancedplus", "config-kucat"}, cbi("advancedplus/config-kucat"), _("KuCat Theme Config"), 40).leaf = true
	end
	if fs.access('/www/luci-static/argon/css/cascade.css') then
		entry({"admin", "system", "advancedplus", "config-argon"}, form("advancedplus/config-argon"), _("Argon Theme Config"), 50).leaf = true
	end
	if fs.access('/www/luci-static/design/css/style.css') then
		entry({"admin", "system", "advancedplus", "config-design"}, form("advancedplus/config-design"), _("Design heme Config"), 60).leaf = true
	end
	entry({"admin", "system", "advancedplus", "upload-login"}, form("advancedplus/upload-login"), _("Login Background Upload"), 70).leaf = true
	entry({"admin", "system", "advancedplus", "upload-desktop"}, form("advancedplus/upload-desktop"), _("Desktop Background Upload"), 80).leaf = true
	entry({"admin", "system", "advancedplus", "advancedrun"}, call("advanced_run"))
	entry({"admin", "system", "advancedplus", "check"}, call("act_check"))
end

function act_check()
	http.prepare_content("text/plain; charset=utf-8")
	local f = io.open("/tmp/advancedplus.log", "r+")
	local fdp = fs.readfile("/tmp/advancedpos") or 0
	f:seek("set", fdp)
	local a = f:read(2048000) or ""
	fdp = f:seek()
	fs.writefile("/tmp/advancedpos", tostring(fdp))
	f:close()
	http.write(a)
end

function advanced_run()
	local selectipk = http.formvalue('select_ipk')
	luci.sys.exec("echo 'start' > /tmp/advancedplus.log && echo 'start' > /tmp/advancedpos")
	uci:set(ap, 'advancedplus', 'select_ipk', selectipk)
	uci:commit(ap)
	fs.writefile("/tmp/advancedpos", "0")
	http.prepare_content("application/json")
	http.write('')
	luci.sys.exec(string.format("bash /usr/bin/advancedplusipk "..selectipk.." > /tmp/advancedplus.log 2>&1 &" ))
end
