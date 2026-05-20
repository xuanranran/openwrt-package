'use strict';
'require rpc';
'require ui';
'require dom';
'require poll';

const callGetAllUsers = rpc.declare({
	object: 'appfilter',
	method: 'get_all_users',
	params: ['flag', 'page']
});

const callGetDevVisitTime = rpc.declare({
	object: 'appfilter',
	method: 'dev_visit_time',
	params: ['mac']
});

const callGetDevVisitList = rpc.declare({
	object: 'appfilter',
	method: 'dev_visit_list',
	params: ['mac']
});

const callSetNickname = rpc.declare({
	object: 'appfilter',
	method: 'set_nickname',
	params: ['mac', 'nickname']
});

return L.view.extend({
	userListData: { list: [] },
	currentMac: null,
	echartsInstance: null,

	load() {
		// dynamic load css
		if (!document.getElementById('oaf-css')) {
			const link = document.createElement('link');
			link.id = 'oaf-css';
			link.rel = 'stylesheet';
			link.href = L.resource('view/oaf/css/common.css');
			document.head.appendChild(link);
		}

		// dynamic load echarts
		return new Promise((resolve) => {
			if (window.echarts) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = L.resource('view/oaf/js/echarts.min.js');
			script.onload = () => resolve();
			script.onerror = () => resolve();
			document.head.appendChild(script);
		});
	},

	render() {
		const view = this;

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('User List')),
			E('div', { 'class': 'cbi-map-descr' }, _('View online devices, application statistics, and manage user remarks.')),
			E('div', { 'style': 'max-height: 750px; overflow-y: auto; padding-right: 20px;' }, [
				E('div', { 'class': 'cbi-section cbi-tblsection' }, [
					E('table', { 'class': 'table cbi-section-table', 'id': 'user_status_table', 'style': 'table-layout: fixed; width: 100%;' }, [
						E('tr', { 'class': 'tr table-titles' }, [
							E('th', { 'class': 'th', 'style': 'width: 25%;' }, _('Device Info')),
							E('th', { 'class': 'th', 'style': 'width: 15%;' }, _('IP Address')),
							E('th', { 'class': 'th', 'style': 'width: 20%;' }, _('Common App(TOP5)')),
							E('th', { 'class': 'th', 'style': 'width: 15%;' }, _('Active App')),
							E('th', { 'class': 'th', 'style': 'width: 25%;' }, _('Current URL')),
							E('th', { 'class': 'th', 'style': 'width: 15%;' }, _('Online Status')),
							E('th', { 'class': 'th', 'style': 'width: 20%;' }, _('Actions'))
						]),
						E('tr', { 'class': 'tr', 'id': 'loading_row' }, [
							E('td', { 'class': 'td', 'colspan': '7' }, [
								E('em', {}, _('Collecting data...'))
							])
						])
					])
				])
			])
		]);

		// poll users data
		poll.add(() => {
			return callGetAllUsers(3, 0).then((data) => {
				if (data && data.data) {
					view.userListData = data.data;
					view.updateUserList(data.data);
				}
			});
		}, 3);

		callGetAllUsers(3, 0).then((data) => {
			if (data && data.data) {
				view.userListData = data.data;
				view.updateUserList(data.data);
			}
		});

		return container;
	},

	updateUserList(data) {
		const tb = document.getElementById('user_status_table');
		if (!tb) return;

		// clear table rows
		while (tb.rows.length > 1) {
			tb.deleteRow(1);
		}

		const userList = data.list || [];
		if (userList.length === 0) {
			const tr = tb.insertRow(-1);
			const td = tr.insertCell(-1);
			td.colSpan = 7;
			td.className = 'td text-center';
			td.innerHTML = `<em>${_('No online devices found')}</em>`;
			return;
		}

		userList.forEach(user => {
			const nickname = user.nickname || "";
			const hostname = user.hostname || "";
			const displayName = nickname || hostname || "--";

			const tr = tb.insertRow(-1);
			tr.className = 'tr';
			if (user.online != 1) {
				tr.style.color = '#A9A9A9';
			}

			const cellDev = tr.insertCell(-1);
			cellDev.className = 'td';
			cellDev.innerHTML = `
				<div style="display: flex; align-items: center;">
					<div>
						<div style="font-weight: bold;">${displayName}</div>
						<div style="font-size: 11px; color: #666;">${user.mac}</div>
					</div>
				</div>
			`;

			const cellIp = tr.insertCell(-1);
			cellIp.className = 'td';
			cellIp.textContent = user.ip || '--';

			const cellApps = tr.insertCell(-1);
			cellApps.className = 'td';
			const applist = Array.isArray(user.applist) ? user.applist : [];
			if (applist.length === 0) {
				cellApps.textContent = '--';
			} else {
				const appListHtml = applist.map(app => {
					const iconSrc = app.icon === 0 ? L.resource('app_icons/default.png') : L.resource(`app_icons/${app.id}.png`);
					return `<img src="${iconSrc}" alt="${app.name}" title="${app.name}" style="width: 20px; height: 20px; border-radius: 4px; margin-right: 6px; vertical-align: middle;">`;
				}).join('');
				cellApps.innerHTML = appListHtml;
			}

			const cellActiveApp = tr.insertCell(-1);
			cellActiveApp.className = 'td';
			cellActiveApp.textContent = user.app || '--';

			const cellUrl = tr.insertCell(-1);
			cellUrl.className = 'td';
			const currentUrl = user.url || '--';
			let displayUrl = currentUrl;
			if (currentUrl !== '--' && currentUrl.length > 25) {
				displayUrl = currentUrl.substring(0, 12) + '...' + currentUrl.substring(currentUrl.length - 12);
			}
			cellUrl.innerHTML = `<span title="${currentUrl}">${displayUrl}</span>`;

			const cellOnline = tr.insertCell(-1);
			cellOnline.className = 'td';
			if (user.online == 1) {
				cellOnline.innerHTML = `<span style="color: green; font-weight: bold;">${_('Online')}</span>`;
			} else {
				cellOnline.textContent = _('Offline');
			}

			const cellActions = tr.insertCell(-1);
			cellActions.className = 'td';

			const mac = user.mac;

			const btnDetails = E('button', {
				'type': 'button',
				'class': 'cbi-button cbi-button-action',
				'style': 'margin-right: 5px;',
				'click': () => this.showDetails(mac)
			}, _('Details'));

			const btnRemark = E('button', {
				'type': 'button',
				'class': 'cbi-button cbi-button-neutral',
				'click': () => this.showModifyNickname(mac)
			}, _('Remark'));

			dom.append(cellActions, [btnDetails, btnRemark]);
		});
	},

	showDetails(mac) {
		const view = this;
		view.currentMac = mac;

		let displayName = mac;
		if (this.userListData && this.userListData.list) {
			const device = this.userListData.list.find(user => user.mac === mac);
			if (device) {
				displayName = device.nickname || device.hostname || mac;
				if (displayName !== mac) {
					displayName = `${displayName} (${mac})`;
				}
			}
		}

		const tabList = E('ul', { 'class': 'cbi-tabmenu' }, [
			E('li', {
				'class': 'cbi-tab',
				'click': (ev) => view.switchTab('tab2', ev.currentTarget)
			}, E('a', { 'href': '#' }, _('App Statistics'))),
			E('li', {
				'class': 'cbi-tab-disabled',
				'click': (ev) => view.switchTab('tab3', ev.currentTarget)
			}, E('a', { 'href': '#' }, _('Access Records')))
		]);

		const tab2 = E('div', { 'id': 'tab2', 'class': 'tab-body', 'style': 'display: block; flex: 1;' }, [
			E('div', { 'class': 'pie-chart', 'style': 'width: 100%;' }, [
				E('div', { 'id': 'app_time_chart', 'style': 'width: 100%; height: 350px;' })
			])
		]);

		const tab3 = E('div', { 'id': 'tab3', 'class': 'tab-body', 'style': 'display: none; flex: 1; overflow-y: auto;' }, [
			E('div', { 'style': 'max-height: 350px; overflow-y: auto; padding-right: 10px;' }, [
				E('table', { 'class': 'table cbi-section-table', 'id': 'visit_list_table' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th' }, _('App Name')),
						E('th', { 'class': 'th' }, _('Start Access Time')),
						E('th', { 'class': 'th' }, _('Last Access Time')),
						E('th', { 'class': 'th' }, _('Duration')),
						E('th', { 'class': 'th' }, _('Filter Status'))
					]),
					E('tr', { 'class': 'tr', 'id': 'records_loading_row' }, [
						E('td', { 'class': 'td', 'colspan': '5' }, [
							E('em', {}, _('Collecting data...'))
						])
					])
				])
			])
		]);

		ui.showModal(`${_('Device Details')}: ${displayName}`, [
			tabList,
			tab2,
			tab3,
			E('div', { 'class': 'right', 'style': 'margin-top: auto; padding-top: 15px;' }, [
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': () => ui.hideModal()
				}, _('Close'))
			])
		]);

		const modalEl = document.querySelector('.modal[role="dialog"], .ui-modal, .modal');
		if (modalEl) {
			modalEl.style.maxWidth = '800px';
			modalEl.style.maxHeight = '550px';
			modalEl.style.display = 'flex';
			modalEl.style.flexDirection = 'column';
		}

		// get visit time data
		callGetDevVisitTime(mac).then((data) => {
			view.displayAppVisitView((data && data.list) ? data.list : []);
		});

		callGetDevVisitList(mac).then((data) => {
			view.renderVisitListTable(data || { list: [] });
		});
	},

	showModifyNickname(mac) {
		const view = this;
		view.currentMac = mac;

		let currentNickname = '';
		if (view.userListData && view.userListData.list) {
			const device = view.userListData.list.find(user => user.mac === mac);
			if (device) {
				currentNickname = device.nickname || '';
			}
		}

		const input = E('input', {
			'type': 'text',
			'class': 'cbi-input-text',
			'style': 'width: 100%;',
			'value': currentNickname,
			'placeholder': _('Enter nickname or remark')
		});

		ui.showModal(_('Modify Remark'), [
			E('div', { 'class': 'cbi-map' }, [
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('MAC Address') + ':'),
					E('div', { 'class': 'cbi-value-field', 'style': 'font-weight: bold;' }, mac)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Remark') + ':'),
					E('div', { 'class': 'cbi-value-field' }, input)
				])
			]),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': () => ui.hideModal()
				}, _('Cancel')),
				' ',
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'click': () => view.submitNicknameChange(input)
				}, _('OK'))
			])
		]);
	},

	validateNickname(nickname) {
		const invalidChars = /[\s'"]/;
		return !invalidChars.test(nickname) && nickname.length <= 32;
	},

	submitNicknameChange(input) {
		const view = this;
		const mac = view.currentMac;
		const nickname = input.value.trim();

		if (nickname !== '' && !view.validateNickname(nickname)) {
			ui.addNotification(null, E('p', {}, _('Please enter a valid remark (no spaces, quotes, and max 32 characters).')), 'danger');
			return;
		}

		callSetNickname(mac, nickname).then(() => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Settings saved successfully.')), 'info');
			callGetAllUsers(3, 0).then((data) => {
				if (data && data.data) {
					view.userListData = data.data;
					view.updateUserList(data.data);
				}
			});
		}).catch((err) => {
			ui.addNotification(null, E('p', {}, _('Failed to update remark: ') + err.message), 'danger');
		});
	},

	switchTab(tabId, tabItem) {
		const modal = document.querySelector('.ui-modal') || document.body;
		const tab2 = modal.querySelector('#tab2');
		const tab3 = modal.querySelector('#tab3');
		const tabItems = modal.querySelectorAll('.cbi-tab, .cbi-tab-disabled');

		tabItems.forEach(item => {
			item.className = 'cbi-tab-disabled';
		});
		tabItem.className = 'cbi-tab';

		if (tabId === 'tab2') {
			if (tab2) tab2.style.display = 'block';
			if (tab3) tab3.style.display = 'none';
			if (this.echartsInstance) {
				setTimeout(() => {
					this.echartsInstance.resize();
				}, 100);
			}
		} else {
			if (tab2) tab2.style.display = 'none';
			if (tab3) tab3.style.display = 'block';
		}
	},

	getDisplayTime(total_time) {
		const hour = Math.floor(total_time / 3600);
		const seconds = total_time % 3600;
		let min = Math.floor(seconds / 60);
		const seconds2 = seconds % 60;
		
		if (hour > 0) {
			return `${hour}${_('h')}${min}${_('m')}`;
		} else {
			if (min === 0 && seconds2 !== 0) {
				min = 1;
			}
			return `${min}${_('m')}`;
		}
	},

	renderVisitListTable(data) {
		const tb = document.getElementById('visit_list_table');
		if (!tb) return;

		while (tb.rows.length > 1) {
			tb.deleteRow(1);
		}

		const visitList = data.list || [];
		if (visitList.length === 0) {
			const tr = tb.insertRow(-1);
			const td = tr.insertCell(-1);
			td.colSpan = 5;
			td.className = 'td text-center';
			td.innerHTML = `<em>${_('No access records found')}</em>`;
			return;
		}

		visitList.forEach(visit => {
			const filterStatus = visit.act == 1 ? 
				`<span style="color: red; font-weight: bold;">${_('Filtered')}</span>` : 
				`<span style="color: green; font-weight: bold;">${_('Unfiltered')}</span>`;

			const tr = tb.insertRow(-1);
			tr.className = 'tr';

			const iconSrc = visit.icon === 0 ? L.resource('app_icons/default.png') : L.resource(`app_icons/${visit.id}.png`);
			
			const cellApp = tr.insertCell(-1);
			cellApp.className = 'td';
			cellApp.innerHTML = `
				<div style="height: 24px; display: flex; align-items: center;">
					<img src="${iconSrc}" alt="${visit.name}" title="${visit.name}" style="width: 20px; height: 20px; border-radius: 4px; margin-right: 8px; vertical-align: middle;">
					<span>${visit.name}</span>
				</div>
			`;

			const cellStart = tr.insertCell(-1);
			cellStart.className = 'td';
			cellStart.textContent = new Date(visit.ft * 1000).toLocaleString();

			const cellLast = tr.insertCell(-1);
			cellLast.className = 'td';
			cellLast.textContent = new Date(visit.lt * 1000).toLocaleString();

			const cellDuration = tr.insertCell(-1);
			cellDuration.className = 'td';
			if (visit.act == 1) {
				cellDuration.textContent = '-';
			} else {
				cellDuration.textContent = this.getDisplayTime(visit.tt);
			}

			const cellFilter = tr.insertCell(-1);
			cellFilter.className = 'td';
			cellFilter.innerHTML = filterStatus;
		});
	},

	displayAppVisitView(data) {
		const view = this;
		const chartElement = document.getElementById('app_time_chart');
		if (!chartElement) {
			console.error("Chart element not found");
			return;
		}

		if (view.echartsInstance) {
			view.echartsInstance.dispose();
		}

		view.echartsInstance = echarts.init(chartElement, null, { renderer: 'svg' });
		if (!data || data.length === 0) {
			view.echartsInstance.setOption({
				title: {
					text: _('App Time Statistics'),
					left: 'center',
					top: 'center',
					textStyle: {
						color: '#999',
						fontSize: 14,
						fontWeight: 'normal'
					}
				}
			});
			return;
		}

		let totalTime = 0;
		const appStatArray = [];

		data.forEach(item => {
			const t = item.t;
			const name = item.name;
			const displayTime = view.getDisplayTime(t);
			totalTime += t;

			appStatArray.push({
				value: t,
				legendname: name,
				name: `${name}  ${displayTime}`
			});
		});

		const total_time_str = view.getDisplayTime(totalTime);
		const option = {
			title: [
				{
					text: _("App Time Statistics"),
					textStyle: {
						fontSize: 16
					},
					left: "2%"
				},
				{
					text: '',
					subtext: total_time_str,
					textStyle: {
						fontSize: 15
					},
					subtextStyle: {
						fontSize: 15
					},
					textAlign: "center",
					x: '34.5%',
					y: '44%',
				}
			],
			tooltip: {
				trigger: 'item',
				formatter(parms) {
					const timeStr = view.getDisplayTime(parms.data.value);
					return `${parms.seriesName}<br/>` +
						`${parms.marker} ${parms.data.legendname}<br/>` +
						`${_("Visit Time")}: ${timeStr}<br/>` +
						`${_("Percentage")}: ${parms.percent}%`;
				}
			},
			legend: {
				type: "scroll",
				orient: 'vertical',
				left: '75%',
				align: 'left',
				top: 'middle',
				textStyle: {
					color: '#8C8C8C'
				},
				height: 250
			},
			series: [
				{
					name: _("Visit Time"),
					type: 'pie',
					radius: ['58%', '70%'],
					center: ['35%', '50%'], 
					clockwise: false,
					avoidLabelOverlap: true,
					itemStyle: {
						borderRadius: 1,
						borderColor: "#fff",
						borderWidth: 1,
					},
					label: {
						show: true,
						position: 'outside',
						formatter(parms) {
							return parms.data.legendname;
						}
					},
					labelLine: {
						show: true,
						length: 8,
						length2: 7,
						smooth: true,
					},
					data: appStatArray
				}
			]
		};

		view.echartsInstance.setOption(option);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
