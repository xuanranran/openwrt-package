local opacity_sets = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
local transparency_sets = {0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1}
local m, s, o

m = Map("advancedplus")
m.title = "KuCat"..translate("Theme Config")
m.description = translate("Set and manage features such as KuCat themed background wallpaper, main background color, partition background, transparency, blur, toolbar retraction and shortcut pointing.</br>")..
translate("There are 6 preset color schemes, and only the desktop background image can be set to display or not. The custom color values are RGB values such as 255,0,0 (representing red), and a blur radius of 0 indicates no lag in the image.")..
translate("</br>For specific usage, see:").."<a href=\'https://github.com/sirpdboy/luci-app-advancedplus.git' target=\'_blank\'>GitHub @sirpdboy/luci-app-advancedplus </a>"

s = m:section(TypedSection, "basic")
s.anonymous = true

o = s:option(ListValue, 'background', translate("Wallpaper Source"), translate("Local wallpapers need to be uploaded on their own, and only the first update downloaded on the same day will be automatically downloaded."))
o:value('0', translate("Local Wallpaper"))
o:value('1', translate("Iciba Wallpaper"))
o:value('2', translate("Unsplash Wallpaper"))
o:value('3', translate("Bing Wallpaper"))
o:value('4', translate("Bird 4K Wallpaper"))
o.default = '3'
o.rmempty = false

o = s:option(Flag, "bklock", translate("Wallpaper Synchronization"), translate("Is the login wallpaper consistent with the desktop wallpaper? If not selected, it indicates that the desktop wallpaper and login wallpaper are set independently."))
o.rmempty = false
o.default = '1'

o = s:option(Flag, "setbar", translate("Expand Toolbar"), translate("Expand or shrink the toolbar"))
o.rmempty = false
o.default = '0'

o = s:option(Flag, "bgqs", translate("Thin Mode"), translate("Cancel background glass fence special effects"))
o.rmempty = false
o.default = '1'

o = s:option(Flag, "dayword", translate("Enable Daily Word"))
o.rmempty = false
o.default = '0'

o = s:option(Value, 'gohome', translate("Status key Settings"))
o:value('overview', translate("Overview"))
o:value('routes', translate("Routing"))
o:value('logs', translate("System Log"))
o:value('processes', translate("Processes"))
o:value('realtime', translate("Realtime Graphs"))
o.default = 'overview'
o.rmempty = false

o = s:option(Value, 'gouser', translate("System key Settings"))
o:value('advancedplus', translate("Advanced plus"))
o:value('system', translate("System"))
o:value('admin', translate("Administration"))
o:value('opkg', translate("Software"))
o:value('startup', translate("Startup"))
o:value('crontab', translate("Scheduled Tasks"))
o:value('mounts', translate("Mount Points"))
o:value('diskman', translate("Disk Man"))
o:value('leds', translate("LED Configuration"))
o:value('flash', translate("Backup / Flash"))
o:value('autoreboot', translate("Scheduled Reboot"))
o:value('reboot', translate("Reboot"))
o.default = 'advancedplus'
o.rmempty = false

o = s:option(Value, 'gossr', translate("Proxy Key Settings"))
o:value('helloworld', 'helloworld')
o:value('homeproxy', 'homeproxy')
o:value('mihomo', 'mihomo')
o:value('openclash', 'openclash')
o:value('passwall', 'passwall')
o:value('passwall2', 'passwall2')
o.default = 'homeproxy'
o.rmempty = false

o = s:option(Flag, "fontmode", translate("Care Mode (large font)"))
o.rmempty = false
o.default = '0'

s = m:section(TypedSection, "theme", translate("Color Scheme List"))
s.template = "cbi/tblsection"
s.anonymous = true
s.addremove = true

o = s:option(Value, 'remarks', translate("Theme Name"))

o = s:option(Flag, "use", translate("Enable Color Matching"))
o.rmempty = false
o.default = '1'

o = s:option(ListValue, 'mode', translate("Theme Mode"))
o:value('auto', translate("Follow System"))
o:value('light', translate("Force Light"))
o:value('dark', translate("Force Dark"))
o.default = 'auto'

o = s:option(Value, 'primary_rgbm', translate("Main Background Color (RGB)"))
o:value("blue", translate("Royal Blue"))
o:value("green", translate("Medium Sea Green"))
o:value("orange", translate("Sandy Brown"))
o:value("red", translate("Tomato Red"))
o:value("black", translate("Black Tea Eye Protection Gray"))
o:value("gray", translate("Cool Night Time"))
o:value("bluets", translate("Cool Ocean Heart"))
o.default='blue'
o.datatype = ufloat

o = s:option(Flag, "bkuse", translate("Enable Wallpaper"))
o.rmempty = false
o.default = '0'

o = s:option(Value, 'primary_rgbm_ts', translate("Wallpaper Transparency"))
for _, v in ipairs(transparency_sets) do
	o:value(v)
end
o.datatype = ufloat
o.rmempty = false
o.default='0.9'

o = s:option(Value, 'primary_opacity', translate("Wallpaper Blur Radius"))
for _, v in ipairs(opacity_sets) do
	o:value(v)
end
o.datatype = ufloat
o.rmempty = false
o.default='0'

o = s:option(Value, 'primary_rgbs', translate("Fence Background (RGB)"))
o.default='28,66,188'
o.datatype = ufloat

o = s:option(Value, 'primary_rgbs_ts', translate("Fence Background Transparency"))
for _, v in ipairs(transparency_sets) do
	o:value(v)
end
o.datatype = ufloat
o.rmempty = false
o.default='0.1'

m.apply_on_parse = true
m.on_after_apply = function(self,map)
	luci.sys.exec("/etc/init.d/advancedplus start >/dev/null 2>&1")
	luci.http.redirect(luci.dispatcher.build_url("admin", "system", "advancedplus", "config-kucat"))
end

return m
