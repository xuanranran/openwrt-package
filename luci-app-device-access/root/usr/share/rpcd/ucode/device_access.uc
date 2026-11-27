// SPDX-License-Identifier: GPL-2.0-only

'use strict';

import { cursor } from 'uci';
import { clientCounters, counterName, getClients, profileOwners } from 'device_access';

function listClients() {
	const config = cursor();
	const clients = getClients(config);
	if (clients == null)
		return { clients: null };

	const owners = profileOwners(config);
	const counters = clientCounters();
	const result = map(clients, (client) => {
		const mac = client.mac;
		const key = owners[mac]?.key || mac;
		return {
			mac, ipv4: client.ipv4, ipv6: client.ipv6, reachable: client.reachable,
			privateMac: client.privateMac, group: key,
			upload: counters[counterName('u', key)],
			download: counters[counterName('d', key)]
		};
	});
	return { clients: result };
}

return { 'luci.device_access': { clients: { call: listClients } } };
