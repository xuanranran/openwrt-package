m = Map("reconya", "Reconya", "Network reconnaissance and asset discovery tool")
s = m:section(TypedSection, "main", "General Settings")
s.anonymous = true

s:option(Flag, "enabled", "Enable Service")
s:option(Value, "port", "Listening Port")
s:option(Value, "username", "Admin Username")
p = s:option(Value, "password", "Admin Password")
p.password = true

return m