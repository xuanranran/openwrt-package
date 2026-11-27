// SPDX-License-Identifier: GPL-2.0-only

'use strict';

import { connect } from 'ubus';
import { popen } from 'fs';

const rtnl = require('rtnl');
const rt = rtnl.const;
export const trafficTable = 'luci_device_access_traffic';

function stringList(value) {
	return type(value) == 'array' ? value : split(value || '', / +/);
}

export function macAddress(value) {
	const mac = lc(value || '');
	return match(mac, /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/) && match(substr(mac, 1, 1), /^[02468ace]$/)
		&& mac != '00:00:00:00:00' ? mac : null;
}

function rate(value) {
	return match(value || '', /^[1-9][0-9]{0,7}$/) && +value <= 10000000 ? +value : 0;
}

export function profileOwners(config) {
	const owners = {};
	config.foreach('device_access', 'client', (profile) => {
		const macs = filter(map(stringList(profile.macs), macAddress), (mac) => mac && !owners[mac]);
		if (length(macs) == 0)
			return;
		const owner = { key: macs[0], upload: rate(profile.upload), download: rate(profile.download) };
		for (let mac in macs)
			owners[mac] = owner;
	});
	return owners;
}

export function readCommand(command) {
	const pipe = popen(command, 'r');
	if (!pipe)
		return null;
	const output = pipe.read('all');
	return pipe.close() == 0 ? output : null;
}

export function nftJson(command) {
	const output = readCommand(command);
	return output ? json(output)?.nftables : null;
}

export function counterName(direction, mac) {
	return direction + '_' + join('', split(mac, ':'));
}

function clientInterfaces(config) {
	const wan = config.get('device_access', 'main', 'zone') || 'wan';
	const sources = { lan: true };
	config.foreach('firewall', 'forwarding', (entry) => {
		if (entry.dest == wan && entry.src && entry.enabled != '0')
			sources[entry.src] = true;
	});
	delete sources[wan];

	const interfaces = {};
	const conn = connect();
	const status = conn?.call('network.interface', 'dump')?.interface ?? [];
	for (let iface in status)
		if (iface.up && iface.l3_device)
			interfaces[iface.interface] = iface.l3_device;

	const devices = {};
	config.foreach('firewall', 'zone', (zone) => {
		if (!sources[zone.name])
			return;
		for (let name in stringList(zone.network))
			if (interfaces[name])
				devices[interfaces[name]] = true;
		for (let device in stringList(zone.device))
			if (device)
				devices[device] = true;
	});
	return devices;
}

export function getClients(config) {
	const devices = clientInterfaces(config);
	const entries = rtnl.request(rt.RTM_GETNEIGH, rt.NLM_F_REQUEST | rt.NLM_F_DUMP,
		{ family: rt.AF_UNSPEC });
	if (type(entries) != 'array')
		return null;

	const clients = {};
	const valid = rt.NUD_REACHABLE | rt.NUD_STALE | rt.NUD_DELAY | rt.NUD_PROBE;
	for (let entry in entries) {
		if (!devices[entry.dev] || !(entry.state & valid) || (entry.flags & rt.NTF_PROXY))
			continue;
		const mac = macAddress(entry.lladdr);
		const ip = iptoarr(entry.dst || '');
		if (!mac || (length(ip) != 4 && length(ip) != 16))
			continue;

		const client = clients[mac] ??= {
			mac, ipv4: [], ipv6: [], paths: [], reachable: false,
			privateMac: !!match(substr(mac, 1, 1), /^[26ae]$/)
		};
		const address = arrtoip(ip);
		const family = length(ip) == 4 ? 'ip' : 'ip6';
		const addresses = family == 'ip' ? client.ipv4 : client.ipv6;
		if (!(address in addresses))
			push(addresses, address);
		push(client.paths, { device: entry.dev, family, address });
		if (entry.state & rt.NUD_REACHABLE)
			client.reachable = true;
	}

	return map(sort(keys(clients)), (mac) => clients[mac]);
}

export function clientCounters() {
	const counters = {};
	const objects = nftJson('nft -a -j list counters inet ' + trafficTable + ' 2>/dev/null') || [];
	for (let object in objects) {
		const counter = object.counter;
		if (counter?.table == trafficTable)
			counters[counter.name] = { bytes: counter.bytes, handle: counter.handle };
	}
	return counters;
}
