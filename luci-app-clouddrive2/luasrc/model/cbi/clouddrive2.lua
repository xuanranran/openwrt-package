local m, s, o

m = Map("clouddrive2", translate("CloudDrive2"), translate("Configure and manage CloudDrive2"))

m:section(SimpleSection).template  = "clouddrive2/status"

s = m:section(TypedSection, "clouddrive2", translate("Settings"))
s.anonymous = true
s.addremove = false

o = s:option(Flag, "enabled", translate("Enable"))
o.rmempty = false

o = s:option(Value, "port", translate("Port"))
o.datatype = "port"
o.default = "19798"
o.rmempty = false

o = s:option(Value, "mount_point", translate("Mount Point"))
o.default = "/mnt/clouddrive"
o.rmempty = false

o = s:option(Button, "_webui", translate("Web UI"))
o.inputtitle = translate("Open Web UI")
o.write = function(self, section)
	local port = m.uci:get("clouddrive2", section, "port") or "19798"
	luci.http.redirect("http://" .. luci.http.getenv("SERVER_NAME") .. ":" .. port)
end

return m
