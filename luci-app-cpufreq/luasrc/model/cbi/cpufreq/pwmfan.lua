fan = Map("cpufreq", translate("PWM Fan Controller"))
fan.description = translate("Smart control PWM fan start/stop and fan speed based on CPU temperature.")

s = fan:section(NamedSection, "cpufreq", "settings")
s.addremove = false
s.anonymous = true

o = s:option(Flag, "pwm_fan", translate("Enabled"))
o.rmefanty = false

o = s:option(Value, "pwm_fan_threshold", translate("Fan temperature activation (°C)"))
o.datatype = "and(uinteger,min(1),max(100))"
o.default = "35"

o = s:option(Flag, "pwm_fan_strict", translate("Fan always on"))
o.default = true

o = s:option(ListValue, "pwm_fan_enforce_level", translate("Fan speed"))
o:value("auto", translate("Auto"))
o:value("1", translate("Level 1"))
o:value("2", translate("Level 2"))
o:value("3", translate("Level 3"))
o:value("4", translate("Level 4"))
o.default = "auto"
o:depends("pwm_fan_strict", true)

return fan
