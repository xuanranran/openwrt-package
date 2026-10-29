'use strict';
'require view';
'require form';
'require uci';

function isPossiblePrefix(v, candidates) {
	for (var i = 0; i < candidates.length; i++) {
		if (candidates[i].indexOf(v) === 0) return true;
	}
	return false;
}

function validateHost(value) {
	if (!value || value.trim() === '') return true;
	var v = value.trim();
	var candidates = ['::', '0.0.0.0', '127.0.0.1'];

	if (candidates.indexOf(v) !== -1) return true;
	if (isPossiblePrefix(v, candidates)) return true;

	return _('请输入有效的监听地址');
}

function validateProxy(value) {
	if (!value || value.trim() === '') return true;
	var v = value.trim();
	var schemes = ['http://', 'https://', 'socks5://'];

	if (/^(http|https|socks5):\/\/.+/.test(v)) return true;
	if (isPossiblePrefix(v, schemes)) return true;

	return _('输入有效的代理');
}

function validateDownloadProxy(value) {
	if (!value || value.trim() === '') return true;
	var v = value.trim();
	var schemes = ['http://', 'https://'];

	if (/^https?:\/\/.+/.test(v)) return true;
	if (isPossiblePrefix(v, schemes)) return true;

	return _('请输入有效的加速代理');
}

return view.extend({
	load: function() {
		return uci.load('substore');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('substore', _('Sub-Store'), null);

		s = m.section(form.NamedSection, 'config', 'substore', _('端口与网络'));
		s.anonymous = true;

		o = s.option(form.Value, 'frontend_port', _('服务端口'), _('前端和后端统一使用此端口'));
		o.default = '3001';
		o.datatype = 'port';

		o = s.option(form.Value, 'frontend_host', _('监听地址'), _('::（同时监听 IPv4/IPv6）、0.0.0.0（仅 IPv4）'));
		o.default = '::';
		o.placeholder = '::';
		o.validate = function(section_id, value) {
			return validateHost(value);
		};

		o = s.option(form.Value, 'backend_default_proxy', _('默认代理'), _('抓取订阅时使用的代理，支持 socks5://、http://、https://'));
		o.placeholder = 'http://127.0.0.1:7890';
		o.validate = function(section_id, value) {
			return validateProxy(value);
		};

		o = s.option(form.ListValue, 'download_method', _('更新方式'), _('点击"更新前端/后端"时使用的下载方式'));
		o.value('node', _('node-fetch'));
		o.value('wget', _('wget-ssl'));
		o.default = 'node';
		o.rmempty = false;

		o = s.option(form.Value, 'download_proxy', _('更新加速'), _('点击"更新前端/后端"时，用于加速下载资源的反代地址前缀。留空则直连 GitHub'));
		o.placeholder = 'https://ghfast.top/';
		o.validate = function(section_id, value) {
			return validateDownloadProxy(value);
		};

		o = s.option(form.Value, 'github_token', _('GitHub 令牌'), _('查询版本号时携带此令牌请求 GitHub API，留空则匿名请求'));
		o.password = true;
		o.placeholder = '';

		return m.render();
	}
});
