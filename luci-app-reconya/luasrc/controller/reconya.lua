module("luci.controller.reconya", package.seeall)

function index()
    if not nixio.fs.access("/etc/config/reconya") then return end

    entry({"admin", "services", "reconya"}, alias("admin", "services", "reconya", "config"), _("Reconya"), 60)
    entry({"admin", "services", "reconya", "config"}, cbi("reconya"), _("Settings"), 10)
    entry({"admin", "services", "reconya", "view"}, template("reconya/main"), _("Open Dashboard"), 20)
end