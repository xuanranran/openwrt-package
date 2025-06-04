local uci = luci.model.uci.cursor()
local m, s, o, dl, ul

m = Map("advancedplus")
m.title = translate("Advanced Setting")
m.description = translate("The enhanced version of the original advanced settings allows for unified setting and management of background images for kucat/Agron/Opentopd themes, without the need to upload them separately. Color schemes for kucat/Agron/design themes can be set.<br>")..
translate("At the same time, important plugin parameters can be compiled. At the same time, some system parameters can also be set, such as display and hide settings.")..
translate("</br>For specific usage, see:").."<a href=\'https://github.com/sirpdboy/luci-app-advancedplus.git' target=\'_blank\'>GitHub @sirpdboy/luci-app-advancedplus </a>"

s = m:section(TypedSection, "basic")
s.anonymous = true

o = s:option(Flag, "qos", translate("Qos automatic optimization"), translate("Enable QOS automatic optimization strategy (testing function)"))
o.default = "0"
o.rmempty = false

dl = s:option(Value, "download", translate("Download bandwidth (Mbit/s)"))
dl.default = '200'
dl:depends("qos", true)

ul = s:option(Value, "upload", translate("Upload bandwidth (Mbit/s)"))
ul.default = '30'
ul:depends("qos", true)

o = s:option(Flag, "uhttps", translate("Accessing using HTTPS"), translate("Open the address in the background and use HTTPS for secure access"))



o = s:option(Flag, "wizard", translate("Hide Wizard"), translate("Show or hide the setup wizard menu"))
o.default = "0"
o.rmempty = false

o = s:option(Flag, "tsoset", translate("TSO optimization for network card interruption"), translate("Turn off the TSO parameters of the INTEL225 network card to improve network interruption"))
o.default = "1"
o.rmempty = false

o = s:option(Flag, "set_ttyd", translate("Allow TTYD external network access"))
o.default = "0"

o = s:option(Flag, "set_firewall_wan", translate("Set firewall wan to open"))
o.default = "0"

o = s:option(Flag, "dhcp_domain", translate("Add Android host name mapping"), translate("Resolve the issue of Android native TV not being able to connect to WiFi for the first time"))
o.default = "0"

return m
