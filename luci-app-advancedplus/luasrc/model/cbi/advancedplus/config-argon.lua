local fs = require 'nixio.fs'
local ipkg = require 'luci.model.ipkg'
local util = require 'nixio.util'
local uci = luci.model.uci.cursor()

local primary, dark_primary, blur, blur_dark, transparency, transparency_dark, mode, online_wallpaper
if fs.access('/etc/config/argon') then
	primary = uci:get_first('argon', 'global', 'primary')
	dark_primary = uci:get_first('argon', 'global', 'dark_primary')
	blur = uci:get_first('argon', 'global', 'blur')
	blur_dark = uci:get_first('argon', 'global', 'blur_dark')
	transparency = uci:get_first('argon', 'global', 'transparency')
	transparency_dark = uci:get_first('argon', 'global', 'transparency_dark')
	mode = uci:get_first('argon', 'global', 'mode')
	online_wallpaper = uci:get_first('argon', 'global', 'online_wallpaper')
end

local br, s, o

br = SimpleForm('config', "Argon"..translate("Theme Config"), translate("Here you can adjust various theme settings. [Recommend Chrome]"))
br.reset = false
br.submit = false
s = br:section(SimpleSection)

o = s:option(ListValue, 'online_wallpaper', translate("Wallpaper Source"))
o:value('none', translate("Local Wallpaper"))
o:value('bing', translate("Bing Wallpaper"))
o.default = online_wallpaper
o.rmempty = false

o = s:option(ListValue, 'mode', translate("Theme Mode"))
o:value('normal', translate("Follow System"))
o:value('light', translate("Force Light"))
o:value('dark', translate("Force Dark"))
o.default = mode
o.rmempty = false
o.description = translate("You can choose Theme color mode here")

o = s:option(Value, 'primary', translate("[Light Mode]")..translate(" Primary Color"), translate("A HEX Color"))
o.default = primary
o.datatype = ufloat
o.rmempty = false

o = s:option(Value, 'transparency', translate("[Light Mode]")..translate(" Transparency"), translate("0 Transparent - 1 Opaque"))
o.default = transparency
o.datatype = ufloat
o.rmempty = false

o = s:option(Value, 'blur', translate("[Light Mode]")..translate(" Frosted Glass Radius"), translate("0 Clear - 10 Blur"))
o.default = blur
o.datatype = ufloat
o.rmempty = false

o = s:option(Value, 'dark_primary', translate("[Dark Mode]")..translate(" Primary Color"), translate("A HEX Color"))
o.default = dark_primary
o.datatype = ufloat
o.rmempty = false

o = s:option(Value, 'transparency_dark', translate("[Dark Mode]")..translate(" Transparency"), translate("0 Transparent - 1 Opaque"))
o.default = transparency_dark
o.datatype = ufloat
o.rmempty = false

o = s:option(Value, 'blur_dark', translate("[Dark Mode]")..translate(" Frosted Glass Radius"), translate("0 Clear - 10 Blur"))
o.default = blur_dark
o.datatype = ufloat
o.rmempty = false

o = s:option(Button, 'save', translate("Save Changes"))
o.inputstyle = 'reload'

function br.handle(self, state, data)
	if (state == FORM_VALID and data.blur ~= nil and data.blur_dark ~= nil and data.transparency ~= nil and data.transparency_dark ~= nil and data.mode ~= nil and data.online_wallpaper ~= nil) then
		fs.writefile('/tmp/argon.tmp', data)
		for key, value in pairs(data) do
			uci:set('argon', '@global[0]', key, value)
		end
		uci:commit('argon')
	end
	return true
end

return br
