'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetDiskInfo = rpc.declare({
	object: 'luci.diskman',
	method: 'get_disk_info',
	expect: { disks: [] }
});

var callGetBtrfsInfo = rpc.declare({
	object: 'luci.diskman',
	method: 'get_btrfs_info',
	expect: { pools: [] }
});

var callBtrfsCreate = rpc.declare({
	object: 'luci.diskman',
	method: 'btrfs_create',
	params: ['level', 'devices'],
	expect: { '': {} }
});

var callBtrfsRemove = rpc.declare({
	object: 'luci.diskman',
	method: 'btrfs_remove',
	params: ['uuid'],
	expect: { '': {} }
});

var callCheckTask = rpc.declare({
	object: 'luci.diskman',
	method: 'check_task',
	params: ['task_id'],
	expect: { '': {} }
});

var callEjectDisk = rpc.declare({
	object: 'luci.diskman',
	method: 'eject_disk',
	params: ['device'],
	expect: { '': {} }
});

var callSetPtable = rpc.declare({
	object: 'luci.diskman',
	method: 'set_ptable',
	params: ['device', 'label'],
	expect: { '': {} }
});

var callMountDevice = rpc.declare({
	object: 'luci.diskman',
	method: 'mount_device',
	params: ['device', 'target', 'options'],
	expect: { '': {} }
});

var callUmountDevice = rpc.declare({
	object: 'luci.diskman',
	method: 'umount_device',
	params: ['device'],
	expect: { '': {} }
});

var partColors = [
	'#81ecec',
	'#74b9ff',
	'#a29bfe',
	'#55efc4',
	'#fab1a0',
	'#ffeaa7',
	'#fd79a8'
];

function formatSize(bytes) {
	if (bytes === 0) return '0 B';
	var k = 1024,
		sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

return view.extend({
	load: function () {
		return Promise.all([
			callGetDiskInfo(),
			callGetBtrfsInfo()
		]);
	},

	handleRescan: function () {
		ui.showModal(_('Scanning disks...'), [
			E('p', { 'class': 'spinning' }, _('Scanning disks, please wait...'))
		]);
		setTimeout(function () {
			location.reload();
		}, 500);
	},

	handleSetPtable: function (diskPath, label) {
		var labelName = (label === 'msdos') ? 'MBR' : 'GPT';
		if (!confirm(_('Warning: Creating a %s partition table on %s will erase all data.\nAre you sure you want to continue?').format(labelName, diskPath)))
			return;

		ui.showModal(_('Processing...'), [
			E('p', { 'class': 'spinning' }, _('Writing partition table, do not power off...'))
		]);

		callSetPtable(diskPath, label).then(function (res) {
			ui.hideModal();
			if (res && res.code === 0) {
				ui.addNotification(null, E('p', _('Partition table created successfully.')), 'success');
				setTimeout(function () {
					location.reload();
				}, 1000);
			} else {
				ui.addNotification(null, E('p', _('Failed to set partition table: ') + (res.error || '')), 'danger');
			}
		}).catch(function (e) {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleUmount: function (partPath) {
		if (!confirm(_('Are you sure you want to force unmount %s?\nIf the device is being read or written to, unmounting may fail.').format(partPath)))
			return;

		ui.showModal(_('Unmounting...'), [
			E('p', { 'class': 'spinning' }, _('Attempting to unmount device, please wait...'))
		]);

		callUmountDevice(partPath).then(function (res) {
			ui.hideModal();
			if (res && res.code === 0) {
				location.reload();
			} else {
				ui.addNotification(null, E('p', _('Unmount failed (device may be busy): ') + (res.error || '')), 'danger');
			}
		}).catch(function (e) {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleMount: function (partPath, poolUuid) {
		var targetInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': '/mnt/btrfs_' + poolUuid.substring(0, 8), 'placeholder': '/mnt/btrfs_' + poolUuid.substring(0, 8) });
		var optionsInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': _('defaults') });

		var modalContent = [
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Pool Device')),
				E('div', { 'class': 'cbi-value-field' }, E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': partPath, 'readonly': 'readonly' }))
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Mount Point')),
				E('div', { 'class': 'cbi-value-field' }, targetInput)
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Mount Options')),
				E('div', { 'class': 'cbi-value-field' }, optionsInput)
			]),
			E('div', { 'class': 'alert-message', 'style': 'margin-top: 15px; margin-bottom: 0;' }, [
				_('This operation is a temporary mount. For persistent mounting, please use the system\'s '),
				E('a', { 'href': L.url('admin/system/mounts') }, _('Mount Points')),
				_(' feature.')
			]),
			E('div', { 'class': 'right', 'style': 'margin-top: 15px;' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-action important',
					'click': ui.createHandlerFn(this, function () {
						var target = targetInput.value.trim();
						var options = optionsInput.value.trim();
						if (!target) target = targetInput.placeholder;
						if (!options) options = optionsInput.placeholder;

						ui.hideModal();
						ui.showModal(_('Mounting...'), [E('p', { 'class': 'spinning' }, _('Attempting to mount device, please wait...'))]);

						callMountDevice(partPath, target, options).then(function (res) {
							ui.hideModal();
							if (res && res.code === 0) {
								location.reload();
							} else {
								ui.addNotification(null, E('p', _('Mount failed: ') + (res.error || '')), 'danger');
							}
						}).catch(function (e) {
							ui.hideModal();
							ui.addNotification(null, E('p', e.message), 'danger');
						});
					})
				}, _('Execute Mount')),
				' ',
				E('button', { 'class': 'btn cbi-button', 'click': ui.hideModal }, _('Cancel'))
			])
		];

		ui.showModal(_('Manual Mount'), modalContent);
	},

	handleEject: function (diskPath) {
		if (!confirm(_('Are you sure you want to eject disk %s?\nAll mounted partitions on this disk will be unmounted!').format(diskPath)))
			return;

		ui.showModal(_('Processing...'), [
			E('p', { 'class': 'spinning' }, _('Ejecting disk...'))
		]);

		callEjectDisk(diskPath).then(function (res) {
			ui.hideModal();
			if (res && res.code === 0) {
				ui.addNotification(null, E('p', _('Disk ejected successfully. You can now safely remove the device.')), 'success');
				setTimeout(function () {
					location.reload();
				}, 2000);
			} else {
				ui.addNotification(null, E('p', _('Eject failed: ') + (res.error || '')), 'danger');
			}
		}).catch(function (e) {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleBtrfsRemove: function (uuid) {
		if (!confirm(_('Are you sure you want to remove this BTRFS pool?\nThis will unmount the pool and clear signature data from member disks, resulting in data loss!')))
			return;

		ui.showModal(_('Processing...'), [
			E('p', { 'class': 'spinning' }, _('Removing BTRFS pool...'))
		]);

		callBtrfsRemove(uuid).then(function (res) {
			ui.hideModal();
			if (res && res.code === 0) {
				ui.addNotification(null, E('p', _('Storage pool removed successfully.')), 'success');
				setTimeout(function () {
					location.reload();
				}, 2000);
			} else {
				ui.addNotification(null, E('p', _('Remove failed: ') + (res.error || '')), 'danger');
			}
		}).catch(function (e) {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleBtrfsCreateShow: function (disks) {
		var levelSelect = E('select', { 'class': 'cbi-input-select', 'style': 'width: 200px;' }, [
			E('option', { 'value': 'single' }, _('Single (No redundancy)')),
			E('option', { 'value': 'raid0' }, _('RAID 0 (Striping)')),
			E('option', { 'value': 'raid1' }, _('RAID 1 (Mirroring)')),
			E('option', { 'value': 'raid10' }, 'RAID 10')
		]);

		var devsTable = E('table', { 'class': 'table', 'style': 'width: 100%; max-height: 250px; display: block; overflow-y: auto; margin-top: 5px;' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th', 'style': 'width: 40px;' }, ''),
				E('th', { 'class': 'th' }, _('Device')),
				E('th', { 'class': 'th' }, _('Name')),
				E('th', { 'class': 'th' }, _('Size'))
			])
		]);

		for (var i = 0; i < disks.length; i++) {
			var d = disks[i];
			var hasParts = (d.partitions && d.partitions.length > 0);
			if (hasParts) {
				for (var j = 0; j < d.partitions.length; j++) {
					var p = d.partitions[j];
					if (p.mount) continue; // Skip mounted partitions
					devsTable.appendChild(E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, E('input', { 'type': 'checkbox', 'class': 'cbi-input-checkbox', 'data-dev': p.path })),
						E('td', { 'class': 'td' }, p.path),
						E('td', { 'class': 'td' }, d.model + ' (' + p.name + ')'),
						E('td', { 'class': 'td' }, formatSize(p.size))
					]));
				}
			} else {
				if (d.ptable === '-' || !d.ptable) {
					devsTable.appendChild(E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, E('input', { 'type': 'checkbox', 'class': 'cbi-input-checkbox', 'data-dev': d.path })),
						E('td', { 'class': 'td' }, d.path),
						E('td', { 'class': 'td' }, d.model),
						E('td', { 'class': 'td' }, formatSize(d.size))
					]));
				}
			}
		}

		var btnCreate = E('button', {
			'class': 'btn cbi-button cbi-button-apply important',
			'click': ui.createHandlerFn(this, function () {
				var targetLevel = levelSelect.value;
				var selectedDevs = [];
				var checkboxes = devsTable.querySelectorAll('input[type="checkbox"]');
				for (var idx = 0; idx < checkboxes.length; idx++) {
					if (checkboxes[idx].checked && checkboxes[idx].getAttribute('data-dev')) {
						selectedDevs.push(checkboxes[idx].getAttribute('data-dev'));
					}
				}

				if (selectedDevs.length === 0) {
					ui.addNotification(null, E('p', _('Please select at least one device')), 'danger');
					return;
				}

				ui.hideModal();
				ui.showModal(_('Processing...'), [
					E('p', { 'class': 'spinning' }, _('Creating BTRFS pool, this may take some time...')),
					E('pre', { 'id': 'btrfs-task-output', 'style': 'max-height: 200px; overflow-y: auto; font-size: 12px; margin-top: 10px; display: none;' }, '')
				]);

				callBtrfsCreate(targetLevel, selectedDevs.join(' ')).then(function (res) {
					if (res && res.background) {
						var checkTask = function() {
							callCheckTask(res.task_id).then(function(taskRes) {
								if (taskRes.status === 'running') {
									var logEl = document.getElementById('btrfs-task-output');
									if (logEl && taskRes.output) {
										logEl.style.display = 'block';
										logEl.textContent = taskRes.output;
										logEl.scrollTop = logEl.scrollHeight;
									}
									setTimeout(checkTask, 2000);
								} else if (taskRes.status === 'completed') {
									ui.hideModal();
									ui.addNotification(null, E('p', _('Storage pool created successfully.')), 'success');
									setTimeout(function () { location.reload(); }, 2000);
								} else {
									ui.hideModal();
									ui.addNotification(null, E('p', _('Creation failed: ') + (taskRes.error || '')), 'danger');
								}
							}).catch(function(e) {
								ui.hideModal();
								ui.addNotification(null, E('p', _('Task check failed: ') + e.message), 'danger');
							});
						};
						setTimeout(checkTask, 2000);
					} else if (res && res.code === 0) {
						ui.hideModal();
						ui.addNotification(null, E('p', _('Storage pool created successfully.')), 'success');
						setTimeout(function () { location.reload(); }, 2000);
					} else {
						ui.hideModal();
						ui.addNotification(null, E('p', _('Creation failed: ') + (res.error || '')), 'danger');
					}
				}).catch(function (e) {
					ui.hideModal();
					ui.addNotification(null, E('p', e.message), 'danger');
				});
			})
		}, _('Confirm Creation'));

		var btnCancel = E('button', {
			'class': 'btn cbi-button',
			'click': ui.hideModal
		}, _('Cancel'));

		ui.showModal(_('Create BTRFS Pool'), [
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title', 'style': 'padding-top: 10px;' }, _('Storage Configuration')),
				E('div', { 'class': 'cbi-value-field' }, levelSelect)
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title', 'style': 'padding-top: 10px;' }, _('Member Devices')),
				E('div', { 'class': 'cbi-value-field' }, devsTable)
			]),
			E('div', { 'class': 'right', 'style': 'margin-top: 15px;' }, [btnCancel, ' ', btnCreate])
		]);
	},

	render: function (data) {
		var disks = data[0] || [];
		var pools = data[1] || [];
		var css = `
			.dkm-card {
				margin-bottom: 20px;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
			}
			.theme-dark .dkm-card {
				box-shadow: none;
				border: 1px solid #444;
				background: #2a2a2a;
			}
			.dkm-card-inner {
				padding: 20px;
			}
			.dkm-card-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				border-bottom: 1px solid #eee;
				padding-bottom: 15px;
				margin-bottom: 20px;
			}
			.theme-dark .dkm-card-header {
				border-bottom-color: #444;
			}
			.dkm-card-title {
				font-size: 18px;
				font-weight: bold;
				color: #333;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.theme-dark .dkm-card-title {
				color: #eee;
			}
			.dkm-card-actions {
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.dkm-card-actions select {
				padding: 4px 8px;
				font-size: 12px;
				height: auto;
			}
			.dkm-card-body {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 20px;
				margin-bottom: 20px;
			}
			.dkm-item-label {
				font-size: 13px;
				color: #666;
				text-transform: uppercase;
				margin-bottom: 4px;
			}
			.theme-dark .dkm-item-label {
				color: #aaa;
			}
			.dkm-item-value {
				font-size: 16px;
				color: #333;
				font-weight: 500;
			}
			.theme-dark .dkm-item-value {
				color: #eee;
			}
			.dm-part-bar {
				display: flex;
				width: 100%;
				height: 30px;
				background: #e4e7ed;
				border-radius: 6px;
				overflow: hidden;
				margin-top: 10px;
			}
			.theme-dark .dm-part-bar {
				background: #444;
			}
			.dm-part-segment {
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 12px;
				font-weight: bold;
				color: rgba(0, 0, 0, 0.8);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				padding: 0 8px;
				border-right: 1px solid rgba(255, 255, 255, 0.4);
			}
			.dm-part-segment:last-child {
				border-right: none;
			}
			.dm-part-segment:hover {
				opacity: 0.8;
			}
			.dm-part-free {
				color: #666;
			}
			.theme-dark .dm-part-free {
				color: #aaa;
			}
			@media max-width: 600px {
				.dkm-card-header {
					flex-direction: column;
					align-items: flex-start;
					gap: 10px;
				}
				.dkm-card-actions {
					width: 100%;
					justify-content: flex-end;
				}
			}
		`;
		document.head.appendChild(E('style', { 'type': 'text/css' }, css));

		var container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('DiskMan Management')),
			E('div', { 'class': 'cbi-map-descr' }, _('Manage disks via LuCI')),
			E('button', {
				'class': 'btn cbi-button cbi-button-apply',
				'style': 'margin-bottom: 20px;',
				'click': ui.createHandlerFn(this, this.handleRescan)
			}, _('Rescan Disks'))
		]);

		var disksContainer = E('div', { 'id': 'dkm-disks' });

		if (disks.length === 0) {
			disksContainer.appendChild(E('div', { 'class': 'cbi-section dkm-card' }, [
				E('div', { 'class': 'cbi-section-node dkm-card-inner' }, E('em', _('No disks found.')))
			]));
		} else {
			for (var i = 0; i < disks.length; i++) {
				var d = disks[i];

				var btnEject = E('button', {
					'class': 'btn cbi-button cbi-button-remove',
					'click': ui.createHandlerFn(this, this.handleEject, d.path)
				}, _('Eject'));

				var btnEdit = E('button', {
					'class': 'btn cbi-button cbi-button-action important',
					'click': ui.createHandlerFn(this, function (devName) {
						window.location.href = L.url('admin/system/diskman/partition', devName);
					}, d.name)
				}, _('Edit'));

				var noPtable = (!d.ptable || d.ptable === '-' || d.ptable === 'unknown');
				var ptableDisplayNode = '';
				var ptableDisplayValue = d.ptable;

				if (noPtable) {
					ptableDisplayNode = E('select', {
						'class': 'cbi-input-select',
						'change': ui.createHandlerFn(this, function (path, ev) {
							var val = ev.target.value;
							if (val) {
								this.handleSetPtable(path, val);
							}
							ev.target.value = '';
						}, d.path)
					}, [
						E('option', { 'value': '' }, _('-- Create Partition Table --')),
						E('option', { 'value': 'msdos' }, 'MBR'),
						E('option', { 'value': 'gpt' }, 'GPT')
					]);
					ptableDisplayValue = E('em', { 'style': 'color: #e6a23c;' }, _('Not Set'));

					btnEdit.disabled = true;
					btnEdit.title = _('Please create a partition table first');
					btnEdit.classList.add('disabled');
				}

				var healthText = d.health;
				if (healthText !== '-') {
					healthText = E('span', {
						'style': /PASS|OK/i.test(d.health) ? 'color: #67c23a; font-weight: bold;' : 'color: #f56c6c; font-weight: bold;'
					}, d.health);
				}

				var partBar = E('div', { 'class': 'dm-part-bar' });
				var blocksToRender = [];
				var currentOffset = 0;
				var GAP_THRESHOLD = 5242880; // 5MB

				d.partitions.sort(function (a, b) {
					return a.start - b.start;
				});

				for (var j = 0; j < d.partitions.length; j++) {
					var p = d.partitions[j];
					var gapSize = p.start - currentOffset;

					if (gapSize > GAP_THRESHOLD) {
						blocksToRender.push({
							type: 'free',
							size: gapSize,
							label: _('Unallocated') + ' ' + formatSize(gapSize)
						});
					}

					blocksToRender.push({
						type: 'part',
						size: p.size,
						label: p.name + ' ' + p.fs_type + ' ' + formatSize(p.size),
						colorIndex: j
					});

					currentOffset = Math.max(currentOffset, p.start + p.size);
				}

				var endGap = d.size - currentOffset;
				if (endGap > GAP_THRESHOLD) {
					blocksToRender.push({
						type: 'free',
						size: endGap,
						label: _('Unallocated') + ' ' + formatSize(endGap)
					});
				}

				var minWidthPct = 8;
				if (blocksToRender.length > 0 && blocksToRender.length * minWidthPct > 100) {
					minWidthPct = Math.floor(100 / blocksToRender.length);
				}

				for (var k = 0; k < blocksToRender.length; k++) {
					var block = blocksToRender[k];
					var percent = d.size > 0 ? ((block.size / d.size) * 100) : 0;

					if (block.type === 'free') {
						partBar.appendChild(E('div', {
							'class': 'dm-part-segment dm-part-free',
							'style': 'flex-grow: ' + percent + '; flex-shrink: 1; min-width: ' + minWidthPct + '%;',
							'title': block.label
						}, block.label));
					} else {
						var bgColor = partColors[block.colorIndex % partColors.length];
						partBar.appendChild(E('div', {
							'class': 'dm-part-segment',
							'style': 'flex-grow: ' + percent + '; flex-shrink: 1; min-width: ' + minWidthPct + '%; background-color: ' + bgColor + ';',
							'title': block.label
						}, block.label));
					}
				}

				var cardActions = [ptableDisplayNode, btnEject, btnEdit];

				var diskCard = E('div', { 'class': 'cbi-section dkm-card' }, [
					E('div', { 'class': 'cbi-section-node dkm-card-inner' }, [
						E('div', { 'class': 'dkm-card-header' }, [
							E('div', { 'class': 'dkm-card-title' }, [
								E('span', {}, d.model + ' (' + d.path + ')')
							]),
							E('div', { 'class': 'dkm-card-actions' }, cardActions)
						]),
						E('div', { 'class': 'dkm-card-body' }, [
							E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Size')), E('div', { 'class': 'dkm-item-value' }, formatSize(d.size))]),
							E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Serial Number')), E('div', { 'class': 'dkm-item-value' }, d.serial)]),
							E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Partition Table')), E('div', { 'class': 'dkm-item-value' }, ptableDisplayValue)]),
							E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Health Status')), E('div', { 'class': 'dkm-item-value' }, healthText)]),
							E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Temperature')), E('div', { 'class': 'dkm-item-value' }, d.temp)]),
							E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('NVMe/SATA Version')), E('div', { 'class': 'dkm-item-value' }, d.sata_ver)])
						]),
						E('div', { 'class': 'dkm-part-container' }, [
							E('div', { 'style': 'font-size: 0.9rem; font-weight: bold; margin-bottom: 8px;' }, _('Partitions')),
							partBar
						])
					])
				]);

				disksContainer.appendChild(diskCard);
			}
		}

		container.appendChild(E('h3', _('Disks')));
		container.appendChild(disksContainer);

		var poolTable = E('table', { 'class': 'table cbi-section-table', 'style': 'margin-top: 15px;' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('UUID / Label')),
				E('th', { 'class': 'th' }, _('Size')),
				E('th', { 'class': 'th' }, _('Member Devices')),
				E('th', { 'class': 'th' }, _('Mount Status')),
				E('th', { 'class': 'th center' }, _('Actions'))
			])
		]);

		if (pools.length === 0) {
			poolTable.appendChild(E('tr', { 'class': 'tr placeholder' }, [
				E('td', { 'class': 'td' }, E('em', _('No BTRFS pools found.')))
			]));

			if (poolTable.lastChild && poolTable.lastChild.firstChild) {
				poolTable.lastChild.firstChild.setAttribute('colspan', '5');
			}
		} else {
			for (var l = 0; l < pools.length; l++) {
				var arr = pools[l];

				var btnRemoved = E('button', {
					'class': 'btn cbi-button cbi-button-remove',
					'style': 'margin-right: 5px;',
					'click': ui.createHandlerFn(this, this.handleBtrfsRemove, arr.uuid)
				}, _('Remove'));

				var devsDiv = E('div', { 'style': 'display: flex; flex-direction: column; gap: 4px;' });
				var totalSizeBytes = 0;
				if (arr.devices && arr.devices.length > 0) {
					for (var m = 0; m < arr.devices.length; m++) {
						var devObj = arr.devices[m];
						var pathDisplay = (typeof devObj === 'string') ? devObj : devObj.path;
						var sizeDisplay = '';
						if (typeof devObj === 'object' && devObj.size_str && devObj.size_str !== '') {
							sizeDisplay = ' (' + devObj.size_str + ')';
							var matchSz = devObj.size_str.match(/^([0-9.]+)([KMGTPE]?i?B?)$/i);
							if (matchSz) {
								var val = parseFloat(matchSz[1]);
								var u = matchSz[2].toLowerCase();
								if (u.indexOf('k') === 0) val *= 1024;
								else if (u.indexOf('m') === 0) val *= 1048576;
								else if (u.indexOf('g') === 0) val *= 1073741824;
								else if (u.indexOf('t') === 0) val *= 1099511627776;
								else if (u.indexOf('p') === 0) val *= 1125899906842624;
								totalSizeBytes += val;
							}
						}
						devsDiv.appendChild(E('div', { 'style': 'line-height: 1.5; white-space: nowrap;' }, pathDisplay + sizeDisplay));
					}
				} else {
					devsDiv.appendChild(E('span', {}, '-'));
				}

				var nameDisplay = arr.uuid;
				if (arr.label && arr.label !== "") {
					nameDisplay = E('div', {}, [
						E('div', { 'style': 'font-weight: bold;' }, arr.label),
						E('div', { 'style': 'font-size: 12px; opacity: 0.7;' }, arr.uuid)
					]);
				}

				var firstDev = null;
				if (arr.devices && arr.devices.length > 0) {
					firstDev = (typeof arr.devices[0] === 'string') ? arr.devices[0] : arr.devices[0].path;
				}

				var btnMountToggle;
				if (arr.mounted) {
					btnMountToggle = E('button', {
						'class': 'btn cbi-button cbi-button-action important',
						'click': ui.createHandlerFn(this, this.handleUmount, firstDev)
					}, _('Unmount'));
				} else {
					btnMountToggle = E('button', {
						'class': 'btn cbi-button cbi-button-action',
						'disabled': !firstDev ? true : undefined,
						'click': ui.createHandlerFn(this, this.handleMount, firstDev, arr.uuid)
					}, _('Mount'));
				}

				poolTable.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'vertical-align: middle;' }, nameDisplay),
					E('td', { 'class': 'td', 'style': 'vertical-align: middle;' }, totalSizeBytes > 0 ? formatSize(totalSizeBytes) : '-'),
					E('td', { 'class': 'td', 'style': 'vertical-align: middle;' }, devsDiv),
					E('td', { 'class': 'td', 'style': 'vertical-align: middle;' }, arr.mounted ? E('span', { 'style': 'color:#67c23a;font-weight:bold;' }, _('Mounted')) : E('span', { 'style': 'opacity: 0.6;' }, _('Not Mounted'))),
					E('td', { 'class': 'td center', 'style': 'vertical-align: middle;' }, [btnRemoved, btnMountToggle])
				]));
			}
		}

		container.appendChild(E('div', { 'class': 'cbi-section' }, [
			E('h3', { 'style': 'display: flex; justify-content: space-between; align-items: center;' }, [
				E('span', {}, _('BTRFS Pools')),
				E('button', {
					'class': 'btn cbi-button cbi-button-add',
					'click': ui.createHandlerFn(this, this.handleBtrfsCreateShow, disks)
				}, _('Create Pool'))
			]),
			E('div', { 'class': 'cbi-section-node' }, poolTable)
		]));

		return container;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
