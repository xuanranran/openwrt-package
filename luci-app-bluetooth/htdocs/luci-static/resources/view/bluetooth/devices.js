'use strict';
'require view';
'require ui';
'require rpc';
'require poll';
'require dom';

var getStatus = rpc.declare({
    object: 'luci.bluetooth',
    method: 'get_status',
    expect: { '': {} }
});

var getDevices = rpc.declare({
    object: 'luci.bluetooth',
    method: 'get_devices',
    expect: { '': {} }
});

var setPower = rpc.declare({
    object: 'luci.bluetooth',
    method: 'set_power',
    params: [ 'on' ]
});

var startScan = rpc.declare({
    object: 'luci.bluetooth',
    method: 'start_scan',
    params: [ 'on' ]
});

var pairDevice = rpc.declare({
    object: 'luci.bluetooth',
    method: 'pair',
    params: [ 'mac' ]
});

var connectDevice = rpc.declare({
    object: 'luci.bluetooth',
    method: 'connect',
    params: [ 'mac' ]
});

var disconnectDevice = rpc.declare({
    object: 'luci.bluetooth',
    method: 'disconnect',
    params: [ 'mac' ]
});

var removeDevice = rpc.declare({
    object: 'luci.bluetooth',
    method: 'remove_device',
    params: [ 'mac' ]
});

var setAlias = rpc.declare({
    object: 'luci.bluetooth',
    method: 'set_alias',
    params: [ 'alias' ]
});

var setCodec = rpc.declare({
    object: 'luci.bluetooth',
    method: 'set_codec',
    params: [ 'data' ]
});

var setVolume = rpc.declare({
    object: 'luci.bluetooth',
    method: 'set_volume',
    params: [ 'data' ]
});

function renderStatus(status) {
    var spanTemp = '<em><span style="color:%s"><strong>%s</strong></span></em>';
    var renderHTML;
    if (status.powered) {
        renderHTML = spanTemp.format('green', _('Bluetooth is enabled'));
    } else {
        renderHTML = spanTemp.format('red', _('Bluetooth is disabled'));
    }
    return renderHTML;
}

function renderBluealsaTooltip(bluealsa) {
    var entries = [];
    if (!bluealsa) {
        return E('div', {});
    }

    var keyToLabel = {
        'sequence': _('Sequence'),
        'transport': _('Transport'),
        'mode': _('Mode'),
        'running': _('Running'),
        'format': _('Format'),
        'channels': _('Channels'),
        'channelMap': _('Channel Map'),
        'rate': _('Rate'),
        'availableCodecs': _('Available Codecs'),
        'selectedCodec': _('Selected Codec'),
        'delay': _('Delay'),
        'clientDelay': _('Client Delay'),
        'softVolume': _('Soft Volume'),
        'volume': _('Volume'),
        'mute': _('Mute')
    };

    for (var key in bluealsa) {
        if (keyToLabel.hasOwnProperty(key)) {
            var val = bluealsa[key];
            if (typeof(val) === 'boolean') {
                val = val ? _('Yes') : _('No');
            }
            entries.push(E('div', {}, '%s: %s'.format(keyToLabel[key], val)));
        }
    }
    return E('div', {}, entries);
}

function renderDevices(devices, view) {
    if (!devices || devices.length === 0) {
        return E('em', {}, _('No devices found.'));
    }

    var head = E('tr', { 'class': 'tr cbi-section-table-titles anonymous' }, [
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Name')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('MAC Address')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Paired')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Bonded')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Connected')),
        E('th', { 'class': 'th cbi-section-table-cell cbi-section-actions' }, _('Actions'))
    ]);

    var rows = devices.map(function(dev) {
        var pairBtn = E('button', {
            'class': 'btn cbi-button cbi-button-action',
            'click': ui.createHandlerFn(view, function() {
                ui.showModal(_('Pairing...'), E('p', _('Attempting to pair with %s. Please check your device to confirm the pairing request.').format(dev.mac)));

                return pairDevice(dev.mac).then(function(response) {
                    ui.hideModal();
                    ui.addNotification(null, E('p', _('Pairing request sent. The device list will refresh automatically.')));
                }).catch(function(err) {
                    ui.hideModal();
                    ui.addNotification(null, E('p', _('Failed to send pairing request: %s').format(err.message)), 'error');
                });
            })
        }, _('Pair'));

        var connectBtn = E('button', {
            'class': 'btn cbi-button cbi-button-action',
            'click': ui.createHandlerFn(view, function() {
                return connectDevice(dev.mac);
            })
        }, _('Connect'));

        var disconnectBtn = E('button', {
            'class': 'btn cbi-button cbi-button-remove',
            'click': ui.createHandlerFn(view, function() {
                return disconnectDevice(dev.mac);
            })
        }, _('Disconnect'));

        var removeBtn = E('button', {
            'class': 'btn cbi-button cbi-button-remove',
            'style': 'margin-left: 8px;',
            'click': ui.createHandlerFn(view, function() {
                return removeDevice(dev.mac);
            })
        }, _('Remove'));

        var buttons = [];
        if (dev.connected) {
            buttons.push(disconnectBtn);
        } else if (dev.paired) {
            buttons.push(connectBtn);
        } else {
            buttons.push(pairBtn);
        }

        if (dev.paired) {
            buttons.push(removeBtn);
        }

        var macCell;
        if (dev.connected && dev.bluealsa) {
            macCell = E('td', { 'class': 'td cbi-value-field cbi-tooltip-container' }, [
                dev.mac,
                E('span', { 'class': 'cbi-tooltip' }, renderBluealsaTooltip(dev.bluealsa))
            ]);
        } else {
            macCell = E('td', { 'class': 'td cbi-value-field' }, dev.mac);
        }

        var connectedCell = E('td', { 'class': 'td cbi-value-field' }, dev.connected ? _('Yes') : _('No'));

        return E('tr', { 'class': 'tr cbi-section-table-row' }, [
            E('td', { 'class': 'td cbi-value-field' }, dev.name || dev.mac),
            macCell,
            E('td', { 'class': 'td cbi-value-field' }, dev.paired ? _('Yes') : _('No')),
            E('td', { 'class': 'td cbi-value-field' }, dev.bonded ? _('Yes') : _('No')),
            connectedCell,
            E('td', { 'class': 'td cbi-section-table-cell nowrap cbi-section-actions' }, E('div', {}, buttons))
        ]);
    });

    return E('table', { 'class': 'table cbi-section-table' }, [
        E('thead', { 'class': 'thead cbi-section-thead' }, [ head ]),
        E('tbody', { 'class': 'tbody cbi-section-tbody' }, rows)
    ]);
}

function renderAudioDevices(devices, view) {
    var audioDevices = devices.filter(function(dev) {
        return dev.connected && dev.bluealsa;
    });

    if (audioDevices.length === 0) {
        return E('em', {}, _('No audio devices connected.'));
    }

    var head = E('tr', { 'class': 'tr cbi-section-table-titles anonymous' }, [
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Name')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('MAC Address')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Codec')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Volume')),
        E('th', { 'class': 'th cbi-section-table-cell' }, _('Delay'))
    ]);

    var rows = audioDevices.map(function(dev) {
        var codecId = 'codec-' + dev.mac;
        var volumeId = 'volume-' + dev.mac;

        var codecSelect = E('select', { 'id': codecId, 'style': 'width: 70px;' });
        if (dev.bluealsa.availableCodecs) {
            dev.bluealsa.availableCodecs.split(' ').forEach(function(codec) {
                var option = E('option', { 'value': codec }, codec);
                if (codec === dev.bluealsa.selectedCodec) {
                    option.selected = 'selected';
                }
                codecSelect.appendChild(option);
            });
        }

        var codecBtn = E('button', {
            'class': 'btn cbi-button cbi-button-action',
            'style': 'margin-left: 8px;',
            'click': ui.createHandlerFn(view, function() {
                var selectedCodec = document.getElementById(codecId).value;
                return setCodec({ mac: dev.mac, codec: selectedCodec });
            })
        }, _('Set'));

        const volumeMap = Array.from({ length: 11 }, function(_, i) {
            const p = i * 10;
            return { percent: p + '%', value: Math.round(p * 1.27) };
        });

        function findClosestVolumeStep(currentValue, map) {
            return map.reduce(function(prev, curr) {
                return (Math.abs(curr.value - currentValue) < Math.abs(prev.value - currentValue) ? curr : prev);
            });
        }

        var volumeSelect = E('select', { 'id': volumeId, 'style': 'width: 70px;' });
        var currentVolume = parseInt(dev.bluealsa.volume.split(' ')[0], 10);
        var closestStep = findClosestVolumeStep(currentVolume, volumeMap);

        volumeMap.forEach(function(step) {
            var option = E('option', { 'value': step.value }, step.percent);
            if (step.value === closestStep.value) {
                option.selected = 'selected';
            }
            volumeSelect.appendChild(option);
        });

        var volumeBtn = E('button', {
            'class': 'btn cbi-button cbi-button-action',
            'style': 'margin-left: 8px;',
            'click': ui.createHandlerFn(view, function() {
                var newVolume = document.getElementById(volumeId).value;
                return setVolume({ mac: dev.mac, volume: parseInt(newVolume, 10) });
            })
        }, _('Set'));

        return E('tr', { 'class': 'tr cbi-section-table-row' }, [
            E('td', { 'class': 'td cbi-value-field' }, dev.name || dev.mac),
            E('td', { 'class': 'td cbi-value-field' }, dev.mac),
            E('td', { 'class': 'td cbi-value-field' }, [ codecSelect, codecBtn ]),
            E('td', { 'class': 'td cbi-value-field' }, [ volumeSelect, volumeBtn ]),
            E('td', { 'class': 'td cbi-value-field' }, dev.bluealsa.delay ? (dev.bluealsa.delay) : '-')
        ]);
    });

    return E('table', { 'class': 'table cbi-section-table' }, [
        E('thead', { 'class': 'thead cbi-section-thead' }, [ head ]),
        E('tbody', { 'class': 'tbody cbi-section-tbody' }, rows)
    ]);
}

return view.extend({
    __status: {},
    render: function(data) {
        var devices = data[0].devices || [];
        var view = this;

        poll.add(function () {
            return Promise.all([
                getStatus(),
                getDevices()
            ]).then(function(res) {
                var status = res[0];
                var devices = res[1].devices || [];

                view.__status = status;
                var statusEl = document.getElementById('service_status');
                if (statusEl) {
                    statusEl.innerHTML = renderStatus(status);
                }

                var powerButtonEl = document.getElementById('power_button');
                if (powerButtonEl) {
                    powerButtonEl.className = 'cbi-button ' + (status.powered ? 'cbi-button-apply' : 'cbi-button-remove');
                    powerButtonEl.innerText = status.powered ? _('Turn Off') : _('Turn On');
                }

                var aliasEl = document.getElementById('adapter_alias');
                if (aliasEl) {
                    aliasEl.innerText = _('Adapter Alias:') + ' ' + status.alias
                }

                var devicesEl = document.getElementById('devices_list');
                if (devicesEl) {
                    dom.content(devicesEl, renderDevices(devices, view));
                }

                var audioDevicesEl = document.getElementById('audio_devices_list');
                if (audioDevicesEl) {
                    dom.content(audioDevicesEl, renderAudioDevices(devices, view));
                }
            });
        });

        var powerButton = E('button', {
            'id': 'power_button',
            'class': 'cbi-button',
            'style': 'margin-right: 8px;',
            'click': ui.createHandlerFn(this, function() {
                return setPower(!view.__status.powered ? 1 : 0);
            })
        }, _('Collecting data...'));

        var scanButton = E('button', {
            'class': 'cbi-button cbi-button-action',
            'click': ui.createHandlerFn(this, function() {
                ui.showModal(_('Scanning...'), E('p', _('Scanning for devices. This may take a few moments.')));
                return startScan(1).then(function() {
                    setTimeout(function() {
                        startScan(0).then(function() {
                            ui.hideModal();
                            return view.load().then(view.render.bind(view));
                        });
                    }, 5000); // Wait scan for 5 seconds
                });
            })
        }, _('Scan for Devices'));

        var aliasField = E('input', { 'type': 'text', 'id': 'bt_alias', 'style': 'margin-right: 8px;' });
        var aliasButton = E('button', {
            'class': 'cbi-button',
            'click': ui.createHandlerFn(this, function() {
                var newAlias = document.getElementById('bt_alias').value;
                return setAlias(newAlias).then(function() {
                    return view.load().then(view.render.bind(view));
                });
            })
        }, _('Rename Adapter'));

        var deviceTable = E('div', { 'id': 'devices_list' }, E('em', {}, _('Collecting data...')));
        var audioDeviceTable = E('div', { 'id': 'audio_devices_list' }, E('em', {}, _('Collecting data...')));

        return E([], [
            E('h2', {}, _('Bluetooth Management')),
            E('div', { 'class': 'cbi-section' }, [
                E('p', { id: 'adapter_alias' }, _('Adapter Alias: ...')),
                E('p', { id: 'service_status' }, _('Collecting data...')),
                E('div', { 'style': 'display: flex; justify-content: space-between; align-items: center; margin-top: 12px;' }, [
                    E('div', {}, [
                        powerButton,
                        scanButton
                    ]),
                    E('div', {}, [
                        aliasField,
                        aliasButton
                    ])
                ])
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('h3', {}, _('Discovered & Paired Devices')),
                deviceTable
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('h3', {}, _('Connected Audio Devices')),
                audioDeviceTable
            ])
        ]);
    },

    load: function() {
        return Promise.all([
            getDevices()
        ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
