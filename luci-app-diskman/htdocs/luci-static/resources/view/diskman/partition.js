'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

const callGetDiskInfo = rpc.declare({
	object: 'luci.diskman',
	method: 'get_disk_info',
	expect: { '': {} }
});

const callGetSmartRaw = rpc.declare({
	object: 'luci.diskman',
	method: 'get_smart_raw',
	params: ['device'],
	expect: { '': {} }
});

const callEjectDisk = rpc.declare({
	object: 'luci.diskman',
	method: 'eject_disk',
	params: ['device'],
	expect: { '': {} }
});

const callPartDel = rpc.declare({
	object: 'luci.diskman',
	method: 'part_del',
	params: ['device', 'part_num'],
	expect: { '': {} }
});

const callPartAdd = rpc.declare({
	object: 'luci.diskman',
	method: 'part_add',
	params: ['device', 'type', 'start', 'end'],
	expect: { '': {} }
});

const callFormatDevice = rpc.declare({
	object: 'luci.diskman',
	method: 'format_device',
	params: ['device', 'fstype'],
	expect: { '': {} }
});

const callUmountDevice = rpc.declare({
	object: 'luci.diskman',
	method: 'umount_device',
	params: ['device'],
	expect: { '': {} }
});

const callMountDevice = rpc.declare({
	object: 'luci.diskman',
	method: 'mount_device',
	params: ['device', 'target', 'options'],
	expect: { '': {} }
});

const callCheckTask = rpc.declare({
	object: 'luci.diskman',
	method: 'check_task',
	params: ['task_id'],
	expect: { '': {} }
});

const formatSize = bytes => {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

return view.extend({
	load() {
		return callGetDiskInfo();
	},

	handleReturn() {
		window.location.href = L.url('admin/system/diskman');
	},

	showSmartInfo(diskPath, diskName) {
		ui.showModal(_('Reading SMART info...'), [
			E('p', { 'class': 'spinning' }, _('Please wait...'))
		]);

		callGetSmartRaw(diskPath).then(res => {
			const out = res.output || _('No information returned');
			const pre = E('pre', {
				'style': 'max-height: 500px; overflow-y: auto; padding: 10px; font-size: 12px; border-radius: 4px;'
			}, out);

			ui.showModal(_('SMART Info - ') + diskName, [
				pre,
				E('div', { 'class': 'right', 'style': 'margin-top:15px;' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-neutral',
						'click': ui.hideModal
					}, _('Close'))
				])
			]);
		}).catch(e => {
			ui.hideModal();
			ui.addNotification(null, E('p', _('Failed to read SMART info: ') + e.message), 'danger');
		});
	},

	handleEject(diskPath) {
		if (!confirm(_('Are you sure you want to eject disk %s?\nAll mounted partitions on this disk will be unmounted!').format(diskPath)))
			return;

		ui.showModal(_('Processing...'), [
			E('p', { 'class': 'spinning' }, _('Ejecting disk...'))
		]);

		callEjectDisk(diskPath).then(res => {
			ui.hideModal();
			if (res && res.code === 0) {
				ui.addNotification(null, E('p', _('Disk ejected successfully. You can now safely remove the device.')), 'success');
				setTimeout(() => {
					window.location.href = L.url('admin/system/diskman');
				}, 2000);
			} else {
				ui.addNotification(null, E('p', _('Eject failed: ') + (res.error || '')), 'danger');
			}
		}).catch(e => {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleDelete(diskPath, partNum, partName) {
		if (!confirm(_('Are you sure you want to delete partition %s? This action is irreversible and data will be permanently lost!').format(partName)))
			return;

		ui.showModal(_('Processing...'), [
			E('p', { 'class': 'spinning' }, _('Deleting partition, do not power off...'))
		]);

		callPartDel(diskPath, String(partNum)).then(res => {
			ui.hideModal();
			const out = (res.output || '').trim();
			if (res && res.code === 0 && !/Warning|Error/i.test(out)) {
				location.reload();
			} else {
				ui.addNotification(null, E('p', _('Operation refused or error occurred: ') + (res.error || out)), 'danger');
			}
		}).catch(e => {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleUmount(partPath, mountPoint) {
		if (!confirm(_('Are you sure you want to force unmount %s?\nIf the device is being read or written to, unmounting may fail.').format(mountPoint)))
			return;

		ui.showModal(_('Unmounting...'), [
			E('p', { 'class': 'spinning' }, _('Attempting to unmount device, please wait...'))
		]);

		callUmountDevice(partPath).then(res => {
			ui.hideModal();
			if (res && res.code === 0) {
				location.reload();
			} else {
				ui.addNotification(null, E('p', _('Unmount failed (device may be busy): ') + (res.error || '')), 'danger');
			}
		}).catch(e => {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleMount(partPath, partName) {
		const targetInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': '/mnt/' + partName, 'placeholder': '/mnt/' + partName });
		const optionsInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': _('defaults') });

		const modalContent = [
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Device')),
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
					'click': ui.createHandlerFn(this, () => {
						let target = targetInput.value.trim();
						const options = optionsInput.value.trim();
						if (!target) target = targetInput.placeholder;

						ui.showModal(_('Mounting...'), [
							E('p', { 'class': 'spinning' }, _('Mounting device, please wait...'))
						]);

						callMountDevice(partPath, target, options).then(res => {
							ui.hideModal();
							if (res && res.code === 0) {
								location.reload();
							} else {
								let errOut = res.error || '';
								if (res.output) errOut += ' (' + res.output + ')';
								ui.addNotification(null, E('p', _('Mount failed: ') + errOut), 'danger');
							}
						}).catch(e => {
							ui.hideModal();
							ui.addNotification(null, E('p', e.message), 'danger');
						});
					})
				}, _('Mount')),
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'style': 'margin-left: 5px;',
					'click': ui.hideModal
				}, _('Cancel'))
			])
		];
		ui.showModal(_('Mount Partition: ') + partName, modalContent);
	},

	handleCreate(disk, startNode, endNode, maxUsableSector) {
		const secArr = (disk.sector_size || '512/512').split('/');
		const logicalSectorSize = parseInt(secArr[0], 10) || 512;

		let startSector = parseInt(startNode.value, 10);

		// 自动对齐起始扇区到 2048 扇区（向上取整）
		if (startSector % 2048 !== 0) {
			startSector = Math.ceil(startSector / 2048) * 2048;
		}

		const endVal = endNode.value;
		let endSector = startSector;
		const inputStr = String(endVal).trim().toLowerCase();

		if (inputStr.startsWith('+')) {
			let val = parseFloat(inputStr.substring(1)), mult = 1;
			if (inputStr.endsWith('k'))
				mult = 1024 / logicalSectorSize;
			else if (inputStr.endsWith('m'))
				mult = 1024 * 1024 / logicalSectorSize;
			else if (inputStr.endsWith('g'))
				mult = 1024 * 1024 * 1024 / logicalSectorSize;
			else if (inputStr.endsWith('t'))
				mult = 1024 * 1024 * 1024 * 1024 / logicalSectorSize;

			endSector = Math.floor(startSector + val * mult) - 1;
		} else {
			endSector = parseInt(inputStr, 10);
		}

		// 自动对齐结束扇区，使其满足 (endSector + 1) % 2048 === 0（向下取整）
		if ((endSector + 1) % 2048 !== 0) {
			endSector = Math.floor((endSector + 1) / 2048) * 2048 - 1;
		}

		// 不允许超过磁盘最大可用扇区（避免 GPT 备份头报错）
		if (endSector > maxUsableSector) {
			endSector = maxUsableSector;
			// 检查对齐
			if ((endSector + 1) % 2048 !== 0) {
				endSector = Math.floor((endSector + 1) / 2048) * 2048 - 1;
			}
		}

		if (isNaN(startSector) || isNaN(endSector) || startSector > endSector) {
			ui.addNotification(null, E('p', _('Invalid sector range input!')), 'danger');
			return;
		}

		ui.showModal(_('Processing...'), [
			E('p', { 'class': 'spinning' }, _('Partitioning disk space, do not power off...'))
		]);

		callPartAdd(disk.path, 'primary', String(startSector), String(endSector)).then(res => {
			ui.hideModal();
			const out = (res.output || '').trim();
			if (res && res.code === 0 && !/Warning|Error/i.test(out)) {
				location.reload();
			} else {
				ui.addNotification(null, E('p', _('Operation refused or error occurred: ') + (res.error || out)), 'danger');
			}
		}).catch(e => {
			ui.hideModal();
			ui.addNotification(null, E('p', e.message), 'danger');
		});
	},

	handleFormat(partPath, partName, supportedFS) {
		const select = E('select', { 'class': 'cbi-input-select' });
		for (let i = 0; i < supportedFS.length; i++) {
			select.appendChild(E('option', { 'value': supportedFS[i] }, supportedFS[i]));
		}

		const modalContent = [
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('File System')),
				E('div', { 'class': 'cbi-value-field' }, select)
			]),
			E('div', { 'class': 'right', 'style': 'margin-top: 15px;' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-action important',
					'click': ui.createHandlerFn(this, () => {
						const fstype = select.value;
						if (!fstype) return;

						if (!confirm(_('Are you sure you want to format %s as %s?\nAll existing data on this partition will be erased!').format(partName, fstype)))
							return;

						ui.showModal(_('Formatting...'), [
							E('p', { 'class': 'spinning' }, _('Formatting disk, please wait...')),
							E('pre', { 'id': 'format-task-output', 'style': 'max-height: 200px; overflow-y: auto; font-size: 12px; margin-top: 10px; display: none;' }, '')
						]);

						callFormatDevice(partPath, String(fstype)).then(res => {
							if (res && res.background) {
								const checkTask = () => {
									callCheckTask(res.task_id).then(taskRes => {
										if (taskRes.status === 'running') {
											const logEl = document.getElementById('format-task-output');
											if (logEl && taskRes.output) {
												logEl.style.display = 'block';
												logEl.textContent = taskRes.output;
												logEl.scrollTop = logEl.scrollHeight;
											}
											setTimeout(checkTask, 2000);
										} else if (taskRes.status === 'completed') {
											ui.hideModal();
											ui.addNotification(null, E('p', _('Formatting completed successfully.')), 'success');
											setTimeout(() => { location.reload(); }, 1000);
										} else {
											ui.hideModal();
											ui.addNotification(null, E('p', _('Formatting failed: ') + (taskRes.error || '')), 'danger');
										}
									}).catch(e => {
										ui.hideModal();
										ui.addNotification(null, E('p', _('Task check failed: ') + e.message), 'danger');
									});
								};
								setTimeout(checkTask, 2000);
							} else if (res && res.code === 0) {
								ui.hideModal();
								location.reload();
							} else {
								ui.hideModal();
								ui.addNotification(null, E('p', _('Formatting failed: ') + (res.error || '')), 'danger');
							}
						}).catch(e => {
							ui.hideModal();
							ui.addNotification(null, E('p', e.message), 'danger');
						});
					})
				}, _('Format')),
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'style': 'margin-left: 5px;',
					'click': ui.hideModal
				}, _('Cancel'))
			])
		];
		ui.showModal(_('Format Partition: ') + partName, modalContent);
	},

	render(res) {
		const disks = res.disks || [];
		const supportedFS = res.supported_fs || [];
		const pathArray = window.location.pathname.split('/');
		const targetDevName = pathArray[pathArray.length - 1];
		let disk = null;

		for (let i = 0; i < disks.length; i++) {
			if (disks[i].name === targetDevName) {
				disk = disks[i];
				break;
			}
		}

		if (!disk) {
			return E('div', { 'class': 'cbi-map' }, [
				E('div', { 'class': 'alert-message warning' }, _('Cannot find specified disk device: ') + targetDevName),
				E('button', {
					'class': 'btn cbi-button',
					'click': ui.createHandlerFn(this, this.handleReturn)
				}, _('Back to Overview'))
			]);
		}

		// 获取逻辑扇区大小
		const secArr = (disk.sector_size || '512/512').split('/');
		const SECTOR_SIZE = parseInt(secArr[0], 10) || 512;

		// 计算磁盘最大可用扇区 (防止破坏 GPT 的末尾备份分区表)
		const totalSectors = Math.floor(disk.size / SECTOR_SIZE);
		let maxUsableSector = totalSectors - 1;
		if (String(disk.ptable).toUpperCase() === 'GPT') {
			const gptReservedSectors = Math.ceil(16384 / SECTOR_SIZE) + 1;
			maxUsableSector = totalSectors - 1 - gptReservedSectors;
		}

		const css = `
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
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.dkm-card-actions {
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.dkm-card-body {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 20px;
				margin-bottom: 10px;
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
				font-weight: 500;
			}
			.theme-dark .dkm-item-value {
				color: #eee;
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

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Partition Management')),
			E('div', { 'class': 'cbi-map-descr' }, _('Partition disks via LuCI.')),
		]);

		let healthDisplay = disk.health;
		if (disk.health !== '-') {
			const isPassed = /PASS|OK/i.test(disk.health);
			healthDisplay = E('button', {
				'style': isPassed ? 'color: #67c23a; font-weight: bold; background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline;' : 'color: #f56c6c; font-weight: bold; background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline;',
				'title': _('Click to view full SMART info'),
				'click': ui.createHandlerFn(this, this.showSmartInfo, disk.path, disk.name)
			}, disk.health);
		}

		const btnEject = E('button', {
			'class': 'btn cbi-button cbi-button-remove',
			'click': ui.createHandlerFn(this, this.handleEject, disk.path)
		}, _('Eject'));

		const infoCard = E('div', { 'class': 'cbi-section dkm-card' }, [
			E('div', { 'class': 'cbi-section-node dkm-card-inner' }, [
				E('div', { 'class': 'dkm-card-header' }, [
					E('div', { 'class': 'dkm-card-title' }, [
						E('svg', { 'width': '24', 'height': '24', 'viewBox': '0 0 24 24', 'fill': 'none', 'stroke': 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'style': 'opacity: 0.6;' }, [
							E('line', { 'x1': '22', 'y1': '12', 'x2': '2', 'y2': '12' }),
							E('path', { 'd': 'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' }),
							E('line', { 'x1': '6', 'y1': '16', 'x2': '6.01', 'y2': '16' }),
							E('line', { 'x1': '10', 'y1': '16', 'x2': '10.01', 'y2': '16' })
						]),
						E('span', {}, disk.model + ' (' + disk.path + ')')
					]),
					E('div', { 'class': 'dkm-card-actions' }, [btnEject])
				]),
				E('div', { 'class': 'dkm-card-body' }, [
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Size')), E('div', { 'class': 'dkm-item-value' }, formatSize(disk.size))]),
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Serial Number')), E('div', { 'class': 'dkm-item-value' }, disk.serial)]),
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Partition Table')), E('div', { 'class': 'dkm-item-value' }, disk.ptable)]),
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Sector/Physical Size')), E('div', { 'class': 'dkm-item-value' }, disk.sector_size || '512/512')]),
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Health Status')), E('div', { 'class': 'dkm-item-value' }, healthDisplay)]),
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('Temperature')), E('div', { 'class': 'dkm-item-value' }, disk.temp)]),
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('NVMe/SATA Version')), E('div', { 'class': 'dkm-item-value' }, disk.sata_ver)]),
					E('div', { 'class': 'dkm-item' }, [E('div', { 'class': 'dkm-item-label' }, _('RPM')), E('div', { 'class': 'dkm-item-value' }, disk.rpm)])
				])
			])
		]);

		container.appendChild(E('h3', _('Device Info')));
		container.appendChild(infoCard);

		const partTable = E('table', { 'class': 'table cbi-section-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('Name')),
				E('th', { 'class': 'th' }, _('Start Sector')),
				E('th', { 'class': 'th' }, _('End Sector')),
				E('th', { 'class': 'th' }, _('Size')),
				E('th', { 'class': 'th' }, _('Type')),
				E('th', { 'class': 'th' }, _('Used')),
				E('th', { 'class': 'th' }, _('Free Space')),
				E('th', { 'class': 'th' }, _('Usage')),
				E('th', { 'class': 'th' }, _('Mount Point')),
				E('th', { 'class': 'th center' }, _('File System')),
				E('th', { 'class': 'th center' }, _('Actions'))
			])
		]);

		disk.partitions.sort((a, b) => a.start - b.start);

		let currentSector = 2048; // parted 默认最优起始扇区为 2048 (1MB对齐)

		for (let j = 0; j < disk.partitions.length; j++) {
			const p = disk.partitions[j];
			const pStartSector = p.start / SECTOR_SIZE;
			const pEndSector = (p.start + p.size) / SECTOR_SIZE - 1;

			// 如果两个分区中间存在空闲间隙，则渲染 "新建" 行
			if (pStartSector > currentSector) {
				let freeStart = currentSector;
				if (freeStart % 2048 !== 0) {
					freeStart = Math.ceil(freeStart / 2048) * 2048;
				}
				let freeEnd = pStartSector - 1;
				if ((freeEnd + 1) % 2048 !== 0) {
					freeEnd = Math.floor((freeEnd + 1) / 2048) * 2048 - 1;
				}
				const freeSize = (freeEnd - freeStart + 1) * SECTOR_SIZE;

				if (freeSize >= 1048576) {
					const startInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': freeStart, 'style': 'width: 120px;' });
					const endInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': freeEnd, 'style': 'width: 120px;' });

					partTable.appendChild(E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, startInput),
						E('td', { 'class': 'td' }, endInput),
						E('td', { 'class': 'td' }, formatSize(freeSize)),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, 'Free Space'),
						E('td', { 'class': 'td center' }, '-'),
						E('td', { 'class': 'td center' }, E('button', {
							'class': 'btn cbi-button cbi-button-apply',
							'click': ui.createHandlerFn(this, this.handleCreate, disk, startInput, endInput, maxUsableSector)
						}, _('New')))
					]));
				}
			}

			const isMounted = (p.mount && p.mount !== "");
			let mountDisplay;

			if (isMounted) {
				const btnUmount = E('button', {
					'class': 'btn cbi-button cbi-button-remove',
					'style': 'margin-left: 6px;',
					'title': _('Force unmount this partition'),
					'click': ui.createHandlerFn(this, this.handleUmount, p.path, p.mount)
				}, _('Unmount'));

				mountDisplay = E('span', { 'style': 'display: flex; align-items: center;' }, [
					E('span', {}, p.mount),
					btnUmount
				]);
			} else {
				mountDisplay = '-';
				if (p.fs_type !== 'unknown' && p.fs_type !== 'swap' && p.fs_type !== '') {
					const btnMount = E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'title': _('Mount this partition'),
						'click': ui.createHandlerFn(this, this.handleMount, p.path, p.name)
					}, _('Mount'));

					mountDisplay = btnMount;
				}
			}

			const pUsed = (p.used != null) ? formatSize(p.used) : '-';
			const pFree = (p.free != null) ? formatSize(p.free) : '-';
			const pUsage = p.usage || '-';

			const fsBtnClass = (p.fs_type === 'unknown') ? 'btn cbi-button cbi-button-remove' : 'btn cbi-button cbi-button-reset';
			const fsLabelText = (p.fs_type === 'unknown') ? _('Format') : p.fs_type;

			const fsBtn = E('button', {
				'class': fsBtnClass,
				'disabled': isMounted ? 'disabled' : null,
				'title': isMounted ? _('Partition is mounted, unmount to format') : _('Click to format this partition'),
				'click': isMounted ? null : ui.createHandlerFn(this, this.handleFormat, p.path, p.name, supportedFS)
			}, fsLabelText);

			const partNumStr = p.name.replace(disk.name, '').replace(/^p/, '');
			const partNum = parseInt(partNumStr, 10);

			const btnDel = E('button', {
				'class': 'btn cbi-button cbi-button-remove',
				'disabled': isMounted ? 'disabled' : null,
				'title': isMounted ? _('Partition is mounted, unmount to delete') : _('Delete this partition'),
				'click': isMounted ? null : ui.createHandlerFn(this, this.handleDelete, disk.path, partNum, p.name)
			}, _('Delete'));

			partTable.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, p.name),
				E('td', { 'class': 'td' }, pStartSector),
				E('td', { 'class': 'td' }, pEndSector),
				E('td', { 'class': 'td' }, formatSize(p.size)),
				E('td', { 'class': 'td' }, 'primary'),
				E('td', { 'class': 'td' }, pUsed),
				E('td', { 'class': 'td' }, pFree),
				E('td', { 'class': 'td' }, pUsage),
				E('td', { 'class': 'td' }, mountDisplay),
				E('td', { 'class': 'td center' }, fsBtn),
				E('td', { 'class': 'td center' }, btnDel)
			]));

			currentSector = pEndSector + 1;
		}

		// 检查磁盘尾部的剩余空间
		if (maxUsableSector > currentSector) {
			let endFreeStart = currentSector;
			if (endFreeStart % 2048 !== 0) {
				endFreeStart = Math.ceil(endFreeStart / 2048) * 2048;
			}
			let endFreeEnd = maxUsableSector; // 截断到安全范围，避免越界导致 parted 报错
			if ((endFreeEnd + 1) % 2048 !== 0) {
				endFreeEnd = Math.floor((endFreeEnd + 1) / 2048) * 2048 - 1;
			}
			const endFreeSize = (endFreeEnd - endFreeStart + 1) * SECTOR_SIZE;

			if (endFreeSize >= 1048576) {
				const startInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': endFreeStart, 'style': 'width: 120px;' });
				const endInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': endFreeEnd, 'style': 'width: 120px;' });

				partTable.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, '-'),
					E('td', { 'class': 'td' }, startInput),
					E('td', { 'class': 'td' }, endInput),
					E('td', { 'class': 'td' }, formatSize(endFreeSize)),
					E('td', { 'class': 'td' }, '-'),
					E('td', { 'class': 'td' }, '-'),
					E('td', { 'class': 'td' }, '-'),
					E('td', { 'class': 'td' }, '-'),
					E('td', { 'class': 'td' }, 'Free Space'),
					E('td', { 'class': 'td center' }, '-'),
					E('td', { 'class': 'td center' }, E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, this.handleCreate, disk, startInput, endInput, maxUsableSector)
					}, _('New')))
				]));
			}
		}

		container.appendChild(E('div', { 'class': 'cbi-section dkm-card' }, [
			E('div', { 'class': 'cbi-section-node dkm-card-inner', 'style': 'padding: 0;' }, [
				E('div', { 'class': 'dkm-card-header', 'style': 'padding: 20px 20px 10px 20px; margin-bottom: 0; border-bottom: none;' }, [
					E('div', { 'class': 'dkm-card-title' }, _('Partition Info')),
					E('div', { 'style': 'font-size: 0.85rem; color: #666;' }, _('Default 2048 sector alignment; Supports +size{K,M,G,T} for relative end sector (e.g., +500M, +10G, +1T)'))
				]),
				E('div', { 'style': 'overflow-x: auto;' }, partTable)
			])
		]));

		container.appendChild(E('div', { 'class': 'cbi-page-actions' }, [
			E('button', {
				'class': 'btn cbi-button cbi-button-neutral',
				'click': ui.createHandlerFn(this, this.handleReturn)
			}, _('Back to Overview'))
		]));

		return container;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
