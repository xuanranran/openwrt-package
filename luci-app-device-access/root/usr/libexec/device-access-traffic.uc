// SPDX-License-Identifier: GPL-2.0-only

'use strict';

import { cursor } from 'uci';
import { popen, readfile, rename, writefile } from 'fs';
import { counterName, getClients, nftJson, profileOwners, readCommand, trafficTable } from 'device_access';

const state = '/var/run/luci-device-access/traffic';
const forward = 'inet ' + trafficTable + ' forward';

function sortedValues(values) {
	const items = {};
	for (let value in values)
		items[value] = true;
	return sort(keys(items));
}

function interfaces(values, allowWildcard) {
	const names = filter(values, (name) => match(name, /^[a-zA-Z0-9_.:@+-]+\*?$/) &&
		(allowWildcard || !match(name, /\*$/)));
	return join(', ', map(sortedValues(names), (name) => '"' + name + '"'));
}

function makePlan() {
	const config = cursor();
	const zone = config.get('device_access', 'main', 'zone') || 'wan';
	if (!match(zone, /^[a-zA-Z0-9_-]+$/))
		return null;
	const output = readCommand('fw4 zone ' + zone + ' 2>/dev/null');
	if (output == null)
		return null;
	const wan = interfaces(split(output, '\n'), true);
	const clients = getClients(config);
	if (clients == null)
		return null;
	const owners = profileOwners(config);
	const groups = {};
	for (let mac in sort(keys(owners))) {
		const owner = owners[mac];
		const group = groups[owner.key] ??= { upload: owner.upload, download: owner.download, macs: [], paths: {} };
		push(group.macs, mac);
	}
	for (let client in clients) {
		const mac = client.mac;
		const key = owners[mac]?.key || mac;
		const group = groups[key] ??= { upload: 0, download: 0, macs: [ mac ], paths: {} };
		for (let path in client.paths) {
			const port = interfaces([ path.device ], false);
			if (!port)
				continue;
			const selector = 'oifname ' + port + ' ' + path.family + ' daddr';
			push(group.paths[selector] ??= [], path.address);
		}
	}
	for (let mac in keys(groups))
		for (let selector in keys(groups[mac].paths))
			groups[mac].paths[selector] = sortedValues(groups[mac].paths[selector]);
	return { wan, groups };
}

function prepare(plan, objects) {
	const found = {};
	for (let object in objects) {
		const entry = object.counter || object.limit;
		if (entry?.table == trafficTable && match(entry.name, /^[ud]_[0-9a-f]{12}(_[0-9]+)?$/))
			found[entry.name] = object.counter ? 'counter' : 'limit';
	}
	const desired = {};
	const definitions = [];
	const rules = [];
	function use(kind, name, definition) {
		if (!found[name] && !desired[name])
			push(definitions, 'add ' + kind + ' inet ' + trafficTable + ' ' + name + definition);
		desired[name] = true;
	}
	function append(direction, mac, cap, selectors) {
		const name = counterName(direction, mac);
		use('counter', name, '');
		for (let selector in selectors) {
			if (cap > 0) {
				const limit = name + '_' + cap;
				const bytes = cap * 125;
				const burst = bytes < 131072 ? 16384 : int(bytes / 8);
				use('limit', limit, sprintf(' { rate over %d bytes/second burst %d bytes; }', bytes, burst));
				push(rules, 'add rule ' + forward + ' ' + selector + ' limit name "' + limit + '" drop');
			}
			push(rules, 'add rule ' + forward + ' ' + selector + ' counter name "' + name + '" return');
		}
	}
	if (plan.wan) {
		const incoming = 'iifname { ' + plan.wan + ' } ';
		for (let mac in sort(keys(plan.groups))) {
			const group = plan.groups[mac];
			append('u', mac, group.upload, [
				'oifname { ' + plan.wan + ' } ether saddr { ' + join(', ', group.macs) + ' }'
			]);
			const selectors = map(sort(keys(group.paths)), (selector) =>
				incoming + selector + ' { ' + join(', ', group.paths[selector]) + ' }');
			append('d', mac, group.download, selectors);
		}
	}
	const removals = [];
	for (let name in sort(keys(found)))
		if (!desired[name])
			push(removals, 'delete ' + found[name] + ' inet ' + trafficTable + ' ' + name);

	return join('\n', [
		'add table inet ' + trafficTable,
		'add chain ' + forward + ' { type filter hook forward priority 10; policy accept; }',
		'flush chain ' + forward,
		...removals, ...definitions, ...rules, ''
	]);
}

const plan = makePlan();
if (!plan)
	exit(1);
const serialized = sprintf('%J', plan);
const objects = nftJson('nft -j list table inet ' + trafficTable + ' 2>/dev/null');
if (objects && serialized == readfile(state))
	exit(0);

// Keep named counters and token buckets when only device addresses change.
const nft = popen('nft -f -', 'w');
if (!nft)
	exit(1);
nft.write(prepare(plan, objects || []));
if (nft.close() != 0)
	exit(1);
if (!writefile(state + '.new', serialized) || !rename(state + '.new', state))
	exit(1);
