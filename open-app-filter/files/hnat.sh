
disable_hnat=`uci get appfilter.global.disable_hnat`

if [ x"1" != x"$disable_hnat" ];then
    return
fi

# mt798x                                          
test -d /sys/kernel/debug/hnat  && {              
    echo 0 >/sys/kernel/debug/hnat/hook_toggle    
}                                                                                 
# qca ecm                                                                         
test -d /sys/kernel/debug/ecm/ && {                                               
    echo "1000000" > /sys/kernel/debug/ecm/ecm_classifier_default/accel_delay_pkts
}                                      

# turbo acc
test -f /etc/config/turboacc && {
    uci -q set "turboacc.config.fastpath_fo_hw"="0"
    uci -q set "turboacc.config.fastpath_fc_ipv6"="0"
    uci -q set "turboacc.config.fastpath"="none"
    uci -q set "turboacc.config.fullcone"="0"
    uci -q commit turboacc
    /etc/init.d/turboacc restart &
}

disable_offload_nat6()
{
	if [ "$(uci -q get firewall.@defaults[0].flow_offloading)" = 1 ]; then
		touch /etc/appfilter/flow_offloading
		uci -q del firewall.@defaults[0].flow_offloading
		uci commit firewall
	fi
	if [ "$(uci -q get firewall.@defaults[0].flow_offloading_hw)" = 1 ]; then
		touch /etc/appfilter/flow_offloading_hw
		uci -q del firewall.@defaults[0].flow_offloading_hw
		uci commit firewall
	fi
	if [ "$(uci -q get firewall.@defaults[0].nat6)" = 1 ]; then
		touch /etc/appfilter/firewall_nat6
		uci -q del firewall.@defaults[0].nat6
		uci commit firewall
		/etc/init.d/nat6 reload >/dev/null 2>&1
	fi
	/etc/init.d/firewall reload >/dev/null 2>&1
}

enable_offload()
{
	rm -f /etc/appfilter/flow_offloading
	uci -q set firewall.@defaults[0].flow_offloading='1'
	uci commit firewall
}

enable_offload_hw()
{
	rm -f /etc/appfilter/flow_offloading_hw
	uci -q set firewall.@defaults[0].flow_offloading_hw='1'
	uci commit firewall
}

enable_nat6()
{
	rm -f /etc/appfilter/firewall_nat6
	uci -q set firewall.@defaults[0].nat6='1'
	uci commit firewall
	/etc/init.d/nat6 reload >/dev/null 2>&1
}

if [ "$1" = "restore" ]; then
	[ -f "/etc/appfilter/flow_offloading" ] && enable_offload
	[ -f "/etc/appfilter/flow_offloading_hw" ] && enable_offload_hw
	[ -f "/etc/appfilter/firewall_nat6" ] && enable_nat6
else
	disable_offload_nat6
fi
