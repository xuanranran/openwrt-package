'use strict';
'require view';
'require poll';
'require dom';
'require fs';
'require rpc';
'require uci';
'require ui';
'require form';
'require request';

var TestTimeout = 240 * 1000; // 4 Minutes

return view.extend({
	handleSaveApply: null,
	handleSave: null,
	handleReset: null,

	load: function () {
		return Promise.all([
			L.resolveDefault(fs.stat('/usr/bin/speedtest'), {}),
			L.resolveDefault(fs.read('/etc/speedtest/speedtest_result'), null),
			L.resolveDefault(fs.stat('/etc/speedtest/speedtest_result'), {}),
			uci.load('netspeedtest')
		]);
	},

	poll_status: function (nodes, res) {
		var result_content = res[1] ? res[1].trim().split("\n") : [];
		var result_stat = nodes.querySelector('#speedtest_result');

		if (result_content.length) {
			if (result_content[0] == 'Testing') {
				result_stat.innerHTML = "<span style='color:green;font-weight:bold'>" +
					"&emsp;<img src='" + L.resource(['icons/loading.gif']) + "' height='17' style='vertical-align:middle'/>" +
					"&emsp;" + _('Testing in progress...') + "</span>";
			} else if (result_content[0].match(/https?:\S+/)) {
				result_stat.innerHTML = "<div style='max-width:500px'><a href='" + result_content[0] + "' target='_blank'><img src='" + result_content[0] + '.png' + "' style='max-width:100%;max-height:100%;vertical-align:middle'></a></div>";
			} else if (result_content[0] == 'Test failed') {
				result_stat.innerHTML = "<span style='color:red;font-weight:bold'>" + _('Test failed.') + "</span>";
			} else {
				result_stat.innerHTML = "<span style='color:red;font-weight:bold;display:none'>" + _('No result.') + "</span>";
			}
		} else {
			result_stat.innerHTML = "<span style='color:red;font-weight:bold;display:none'>" + _('No result.') + "</span>";
		}
	},

	render: function (res) {
		var result_content = res[1] ? res[1].trim().split("\n") : [],
			result_mtime = res[2] ? res[2].mtime * 1000 : 0,
			date = new Date();

		var m, s, o;

		var selectedServerId = '0'; // 默认服务器

		m = new form.Map('netspeedtest', _('Speedtest by Ookla'));

		s = m.section(form.TypedSection, '_result');
		s.anonymous = true;
		s.render = function () {
			if (result_content.length) {
				if (result_content[0] == 'Testing') {
					return E('div', { 'id': 'speedtest_result' }, [E('span', { 'style': 'color:yellow;font-weight:bold' }, [
						E('img', { 'src': L.resource(['icons/loading.svg']), 'height': '20', 'style': 'vertical-align:middle' }),
						'&emsp;',
						_('Testing in progress...')
					])]);
				}
				if (result_content[0].match(/https?:\S+/)) {
					return E('div', { 'id': 'speedtest_result' }, [
						E('div', { 'style': 'max-width:500px' }, [
							E('a', { 'href': result_content[0], 'target': '_blank' }, [
								E('img', { 'src': result_content[0] + '.png', 'style': 'max-width:100%;max-height:100%;vertical-align:middle' })
							])
						])
					]);
				}
				if (result_content[0] == 'Test failed') {
					return E('div', { 'id': 'speedtest_result' }, [
						E('span', { 'style': 'color:red;font-weight:bold' }, _('Test failed.'))
					]);
				}
			}
			return E('div', { 'id': 'speedtest_result' }, [
				E('span', { 'style': 'color:red;font-weight:bold;display:none' }, _('No result.'))
			]);
		};

		s = m.section(form.NamedSection, 'config', 'speedtest', _('Internet Speedtest'));

		// 测速节点下拉框
		var serverListValue = s.option(form.ListValue, '_server_id', _('Speedtest Node'));
		serverListValue.default = '0';
		serverListValue.value('0', _('Default'));
		serverListValue.widget = 'select';

		// 绑定选中事件
		serverListValue.onchange = function (ev) {
			selectedServerId = ev.target.value || '0';
		};

		// 获取节点按钮
		var fetchButton = s.option(form.Button, '_fetch_nodes', _('Fetch Nodes'));
		fetchButton.inputtitle = _('Fetch Nodes');
		fetchButton.inputstyle = 'button';

		fetchButton.onclick = function (ev) {
			ev.preventDefault();

			// 清除旧提示（成功或失败）
			var oldHint = document.getElementById('fetch-hint');
			if (oldHint)
				oldHint.remove();

			request.get('http://ip.cooluc.com/speedtest-cn.json').then(function (res) {
				var json;
				try {
					json = res.json();
				} catch (e) {
					var failHint = document.createElement('span');
					failHint.id = 'fetch-hint';
					failHint.style.color = 'red';
					failHint.style.marginLeft = '10px';
					failHint.textContent = _('JSON parse failed');
					ev.target.parentNode.appendChild(failHint);
					return;
				}

				var mapping = {
					'CM': '中国移动',
					'CU': '中国联通',
					'CT': '中国电信',
					'HK': '香港',
					'TW': '台湾',
					'JP': '日本',
					'US': '美国',
					'KR': '韩国',
					'SG': '新加坡'
				};

				var selectEl = document.getElementById('widget.cbid.netspeedtest.config._server_id');
				if (!selectEl) {
					var failHint = document.createElement('span');
					failHint.id = 'fetch-hint';
					failHint.style.color = 'red';
					failHint.style.marginLeft = '10px';
					failHint.textContent = _('Dropdown DOM node not found');
					ev.target.parentNode.appendChild(failHint);
					return;
				}

				selectEl.innerHTML = '';

				var defaultOpt = document.createElement('option');
				defaultOpt.value = '0';
				defaultOpt.textContent = _('Default');
				selectEl.appendChild(defaultOpt);

				Object.keys(json).forEach(function (key) {
					var isp = mapping[key] || key;
					json[key].forEach(function (item) {
						var opt = document.createElement('option');
						opt.value = String(item.server_id);
						opt.textContent = isp + ' - ' + item.city + ' - ' + item.supplier;
						selectEl.appendChild(opt);
					});
				});

				var successHint = document.createElement('span');
				successHint.id = 'fetch-hint';
				successHint.style.color = 'green';
				successHint.style.marginLeft = '10px';
				successHint.textContent = _('Nodes fetched successfully');
				ev.target.parentNode.appendChild(successHint);

			}).catch(function (e) {
				var failHint = document.createElement('span');
				failHint.id = 'fetch-hint';
				failHint.style.color = 'red';
				failHint.style.marginLeft = '10px';
				failHint.textContent = _('Node fetch failed: ') + e.message;
				ev.target.parentNode.appendChild(failHint);
			});
		};

		o = s.option(form.Button, '_start', _('SpeedTest'));
		o.inputtitle = _('Start Test');
		o.inputstyle = 'apply';
		if (result_content.length && result_content[0] == 'Testing' && (date.getTime() - result_mtime) < TestTimeout)
			o.readonly = true;

		o.onclick = function (ev) {
			ev.preventDefault();

			var selectEl = document.getElementById('widget.cbid.netspeedtest.config._server_id');
			var sid = selectEl ? selectEl.value : '0';

			return fs.exec_direct('/usr/lib/netspeedtest/speedtest', [sid])
				.then(function (res) {
					window.location = window.location.href.split('#')[0];
				})
				.catch(function (e) {
					ui.addNotification(null, E('p', e.message), 'error');
				});
		};

		return m.render().then(L.bind(function (m, nodes) {
			poll.add(L.bind(function () {
				return Promise.all([
					L.resolveDefault(fs.stat('/usr/bin/speedtest'), {}),
					L.resolveDefault(fs.read('/etc/speedtest/speedtest_result'), null)
				]).then(L.bind(this.poll_status, this, nodes));
			}, this), 5);
			return nodes;
		}, this, m));
	}
});
