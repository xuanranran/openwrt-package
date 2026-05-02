#!/usr/bin/env ucode

'use strict';

import { popen } from 'fs';

function shellquote(s) {
	return `'${replace(s, "'", "'\\''")}'`;
}

function run_btctl(command) {
    try {
        const cmd_str = `bluetoothctl ${command} 2>&1`;
        const handle = popen(cmd_str, 'r');
        if (!handle) return null;

        let output = handle.read("all");
        handle.close();
        
        return output;
    }
    catch (e) {
        return null;
    }
}

const methods = {
    get_status: {
        call: function() {
            const output = run_btctl('show');
            if (!output) {
                return {
                    controller: 'Unknown',
                    powered: false,
                    name: 'Unknown',
                    alias: 'Unknown',
                    discoverable: false,
                    pairable: false,
                    discovering: false
                };
            }

            function parse_value(regex) {
                const m = match(output, regex);
                return m ? trim(m[1]) : null;
            }

            function parse_bool(regex) {
                const val = parse_value(regex);
                return val === 'yes';
            }

            return {
                controller: parse_value(/Controller\s+([0-9A-F:]+)/) || 'Unknown',
                powered: parse_bool(/Powered:\s*([a-z]+)/),
                name: parse_value(/Name:\s*([^\n]+)/) || 'Unknown',
                alias: parse_value(/Alias:\s*([^\n]+)/) || 'Unknown',
                discoverable: parse_bool(/Discoverable:\s*([a-z]+)/),
                pairable: parse_bool(/Pairable:\s*([a-z]+)/),
                discovering: parse_bool(/Discovering:\s*([a-z]+)/)
            };
        }
    },

    get_devices: {
        call: function() {
            try {
                const handle = popen('/usr/libexec/bluetooth/bt_device.sh', 'r');
                if (!handle) {
                    return { devices: [] };
                }
                
                const output = handle.read('all');
                handle.close();

                if (!output) {
                    return { devices: [] };
                }

                try {
                    const result = json(output);
                    
                    if (result && result.devices) {
                        return result;
                    } else {
                        return { devices: [] };
                    }
                } catch (e) {
                    return { devices: [] };
                }
            }
            catch (e) {
                return { devices: [] };
            }
        }
    },

    set_power: {
        args: { on: 0 },
        call: function(req) {
            const val = req.args.on;
            const is_on = (val === true || val === 1 || val === "1" || val === "true" || val === "on");
            const cmd = is_on ? 'power on' : 'power off';
            run_btctl(cmd);
            return { success: true };
        }
    },

    start_scan: {
        args: { on: 0 },
        call: function(req) {
            const val = req.args.on;
            const is_on = (val === true || val === 1 || val === "1" || val === "true" || val === "on");
            const cmd = is_on ? '--timeout 5 scan on' : 'scan off';
            run_btctl(cmd);
            return { success: true };
        }
    },

    pair: {
        args: { mac: 'string' },
        call: function(req) {
            if (!req.args.mac) {
                return { success: false, error: 'MAC address required' };
            }

            const cmd = `unbuffer /usr/libexec/bluetooth/bt_pair_exp.sh ${shellquote(req.args.mac)}`;

            try {
                const handle = popen(cmd, 'r');
                if (!handle) {
                    return { success: false, error: 'Failed to execute pairing script.' };
                }

                handle.read('all');
                handle.close();

                return { success: true };

            } catch (e) {
                return { success: false, error: 'Exception while running pairing script.', details: e.message };
            }
        }
    },

    connect: {
        args: { mac: 'string' },
        call: function(req) {
            if (!req.args.mac) return { success: false, error: 'MAC address required' };
            run_btctl(`connect ${shellquote(req.args.mac)}`);
            return { success: true };
        }
    },

    disconnect: {
        args: { mac: 'string' },
        call: function(req) {
            if (!req.args.mac) return { success: false, error: 'MAC address required' };
            run_btctl(`disconnect ${shellquote(req.args.mac)}`);
            return { success: true };
        }
    },

    remove_device: {
        args: { mac: 'string' },
        call: function(req) {
            try {
                if (!req.args.mac) {
                    return { success: false, error: 'MAC address required' };
                }

                run_btctl(`remove ${shellquote(req.args.mac)}`);

                return { success: true };

            } catch (e) {
                return { success: false, error: 'Exception while removing device.', details: e };
            }
        }
    },

    set_alias: {
        args: { alias: 'string' },
        call: function(req) {
            if (!req.args.alias) return { success: false, error: 'Alias required' };
            run_btctl(`system-alias ${shellquote(req.args.alias)}`);
            return { success: true };
        }
    },

    set_codec: {
        args: { data: {} },
        call: function(req) {
            try {
                if (!req.args.data) {
                    return { success: false, error: 'Invalid request: "data" object is missing.' };
                }

                const mac = req.args.data.mac;
                const codec = req.args.data.codec;

                if (!mac) return { success: false, error: 'MAC address required in data object.' };
                if (!codec) return { success: false, error: 'Codec required in data object.' };

                const bluealsa_mac = replace(mac, /:/g, '_');
                const bluealsa_path = `/org/bluealsa/hci0/dev_${bluealsa_mac}/a2dpsrc/sink`;
                const cmd = `bluealsactl codec ${shellquote(bluealsa_path)} ${shellquote(codec)} 2>&1`;

                const handle = popen(cmd, 'r');
                if (!handle) {
                    return { success: false, error: 'Failed to execute command via popen.' };
                }

                const output = handle.read('all');
                handle.close();

                if (output && trim(output).length > 0) {
                    return { success: false, error: 'Command execution failed.', details: trim(output) };
                }

                return { success: true };
            } catch (e) {
                return { success: false, error: 'An unexpected exception occurred.', details: e.message };
            }
        }
    },

    set_volume: {
        args: { data: {} },
        call: function(req) {
            try {
                if (!req.args.data) {
                    return { success: false, error: 'Invalid request: "data" object is missing.' };
                }

                const mac = req.args.data.mac;
                const volume = req.args.data.volume;

                if (!mac) {
                    return { success: false, error: 'MAC address required in data object.' };
                }

                if (volume == null) {
                    return { success: false, error: 'Volume required in data object.' };
                }

                const bluealsa_mac = replace(mac, /:/g, '_');
                const bluealsa_path = `/org/bluealsa/hci0/dev_${bluealsa_mac}/a2dpsrc/sink`;
                const cmd = `bluealsactl volume ${shellquote(bluealsa_path)} ${volume} 2>&1`;

                const handle = popen(cmd, 'r');
                if (!handle) {
                    return { success: false, error: 'Failed to execute command via popen.' };
                }

                const output = handle.read('all');
                handle.close();

                if (output && trim(output).length > 0) {
                    return { success: false, error: 'Command execution failed.', details: trim(output) };
                }

                return { success: true };
            } catch (e) {
                return { success: false, error: 'An unexpected exception occurred.', details: e.message };
            }
        }
    }
};

return { 'luci.bluetooth': methods };
