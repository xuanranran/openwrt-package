'use strict';
'require view';
'require poll';
'require dom';
'require fs';
'require rpc';
'require uci';
'require ui';
'require form';

var TestTimeout = 240 * 1000; // 4 Minutes

return view.extend({
//	handleSaveApply: null,
//	handleSave: null,
//	handleReset: null,

	load: function() {
	return Promise.all([
		L.resolveDefault(fs.stat('/usr/bin/speedtest'), {}),
		L.resolveDefault(fs.read('/etc/speedtest/speedtest_result'), null),
		L.resolveDefault(fs.stat('/etc/speedtest/speedtest_result'), {}),
		uci.load('netspeedtest')
	]);
	},

	poll_status: function(nodes, res) {
		var has_ookla = res[0].path,
			result_content = res[1] ? res[1].trim().split("\n") : [];
		var ookla_stat = nodes.querySelector('#ookla_status'),
			result_stat = nodes.querySelector('#speedtest_result');
		if (has_ookla) {
			ookla_stat.style.color = 'green';
			dom.content(ookla_stat, [ _('Installed') ]);
		} else {
			ookla_stat.style.color = 'red';
			dom.content(ookla_stat, [ _('Not Installed') ]);
		};
		if (result_content.length) {
			if (result_content[0] == 'Testing') {
				result_stat.innerHTML = "<span style='color:green;font-weight:bold'>" +
					'&emsp;&emsp;' +
					"<img src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0iTGF5ZXJfMSIKICAgeD0iMHB4IgogICB5PSIwcHgiCiAgIHdpZHRoPSIxMDAiCiAgIGhlaWdodD0iMTMiCiAgIHZpZXdCb3g9IjAgMCAxMDAgMTMiCiAgIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDU4NCAxNDkiCiAgIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgIGlua3NjYXBlOnZlcnNpb249IjAuOTIuNCAoNWRhNjg5YzMxMywgMjAxOS0wMS0xNCkiCiAgIHNvZGlwb2RpOmRvY25hbWU9Ik9va2xhIGxvZ28uc3ZnIj48dGl0bGUKICAgICBpZD0idGl0bGU4NTciPlNwZWVkdGVzdC5uZXQgbG9nbzwvdGl0bGU+PG1ldGFkYXRhCiAgICAgaWQ9Im1ldGFkYXRhOCI+PHJkZjpSREY+PGNjOldvcmsKICAgICAgICAgcmRmOmFib3V0PSIiPjxkYzpmb3JtYXQ+aW1hZ2Uvc3ZnK3htbDwvZGM6Zm9ybWF0PjxkYzp0eXBlCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIgLz48ZGM6dGl0bGU+U3BlZWR0ZXN0Lm5ldCBsb2dvPC9kYzp0aXRsZT48Y2M6bGljZW5zZQogICAgICAgICAgIHJkZjpyZXNvdXJjZT0iaHR0cDovL3NjcmlwdHMuc2lsLm9yZy9PRkwiIC8+PC9jYzpXb3JrPjxjYzpMaWNlbnNlCiAgICAgICAgIHJkZjphYm91dD0iaHR0cDovL3NjcmlwdHMuc2lsLm9yZy9PRkwiPjxjYzpwZXJtaXRzCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vc2NyaXB0cy5zaWwub3JnL3B1Yi9PRkwvUmVwcm9kdWN0aW9uIiAvPjxjYzpwZXJtaXRzCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vc2NyaXB0cy5zaWwub3JnL3B1Yi9PRkwvRGlzdHJpYnV0aW9uIiAvPjxjYzpwZXJtaXRzCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vc2NyaXB0cy5zaWwub3JnL3B1Yi9PRkwvRW1iZWRkaW5nIiAvPjxjYzpwZXJtaXRzCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vc2NyaXB0cy5zaWwub3JnL3B1Yi9PRkwvRGVyaXZhdGl2ZVdvcmtzIiAvPjxjYzpyZXF1aXJlcwogICAgICAgICAgIHJkZjpyZXNvdXJjZT0iaHR0cDovL3NjcmlwdHMuc2lsLm9yZy9wdWIvT0ZML05vdGljZSIgLz48Y2M6cmVxdWlyZXMKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9zY3JpcHRzLnNpbC5vcmcvcHViL09GTC9BdHRyaWJ1dGlvbiIgLz48Y2M6cmVxdWlyZXMKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9zY3JpcHRzLnNpbC5vcmcvcHViL09GTC9TaGFyZUFsaWtlIiAvPjxjYzpyZXF1aXJlcwogICAgICAgICAgIHJkZjpyZXNvdXJjZT0iaHR0cDovL3NjcmlwdHMuc2lsLm9yZy9wdWIvT0ZML0Rlcml2YXRpdmVSZW5hbWluZyIgLz48Y2M6cmVxdWlyZXMKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9zY3JpcHRzLnNpbC5vcmcvcHViL09GTC9CdW5kbGluZ1doZW5TZWxsaW5nIiAvPjwvY2M6TGljZW5zZT48L3JkZjpSREY+PC9tZXRhZGF0YT48ZGVmcwogICAgIGlkPSJkZWZzNiIgLz48c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgb2JqZWN0dG9sZXJhbmNlPSIxIgogICAgIGdyaWR0b2xlcmFuY2U9IjEiCiAgICAgZ3VpZGV0b2xlcmFuY2U9IjEiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjEzNjYiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iNzA1IgogICAgIGlkPSJuYW1lZHZpZXc0IgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMSIKICAgICBpbmtzY2FwZTpjeD0iNzguNzM2OTkyIgogICAgIGlua3NjYXBlOmN5PSIxMi42MTIwODYiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9Ii04IgogICAgIGlua3NjYXBlOndpbmRvdy15PSItOCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9IkxheWVyXzEiPjxpbmtzY2FwZTpncmlkCiAgICAgICB0eXBlPSJ4eWdyaWQiCiAgICAgICBpZD0iZ3JpZDQxNjYiIC8+PC9zb2RpcG9kaTpuYW1lZHZpZXc+PGcKICAgICBpZD0ibGF5ZXIxMDMtMiIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLjc5MDMxMTM2LDAsMCwxLjA5NDU0OSwtNzkxMy42MjI5LC05MDMuMTU0OTcpIgogICAgIHN0eWxlPSJkaXNwbGF5OmlubGluZTtmaWxsOiMwMGZmMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmUiIC8+PHBhdGgKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgIHN0eWxlPSJmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjAuMDU0ODgwOTkiCiAgICAgZD0ibSA3LjQ0MjI3MzUsMC40MDkwNjMgYyAtMy44NzI5NTEyLDAgLTYuODg0Nzc3NjIsMy4xMzQ5NCAtNi44ODQ3Nzc2Miw2Ljk0NTg3NiAwLDEuNTk4Njg0IDAuNTUzMjYyMjIsMy4xOTcwNTUgMS41OTgxOTM1Miw0LjQyNjM4NiBMIDIuNTg1Nzg2MywxMi4yNzI1MjIgMy4zODQ4ODUzLDExLjQ3NDIzIDMuMDc3Nzg4OSwxMS4wNDMzMjYgQyAyLjIxNzI1MzUsOS45OTc4NDcgMS43ODY2OTE2LDguNzA3MjA3IDEuNzg2NjkxNiw3LjM1NDkzOSBjIDAsLTMuMTk2ODE4IDIuNTgyMzEzNywtNS43Nzg1ODMgNS43Nzg1ODIzLC01Ljc3ODU4MyAzLjE5NjI2ODEsMCA1Ljc3ODU4MjEsMi41ODE3NjUgNS43Nzg1ODIxLDUuNzc4NTgzIDAsMS4zNTIyNjggLTAuNDkyMjg1LDIuNjQyOTA4IC0xLjI5MTksMy42ODgzODcgbCAtMC4zMDYyOTUsMC40MzA5MDQgMC43OTkwOTcsMC43OTgyOTIgMC40MzAwOTgsLTAuNDkxMTk3IGMgMC44NjA1MzQsLTEuMjkwODAxIDEuNDEzMjkzLC0yLjgyNzcwMiAxLjQxMzI5MywtNC40MjYzODYgMCwtMy44MTA5MzYgLTMuMDcyOTI1LC02Ljk0NTg3NiAtNi45NDU4NzU1LC02Ljk0NTg3NiB6IE0gMjEuNTE4OTI2LDEuODIyMzU2IGMgLTEuOTY2OTM1LDAgLTMuMzgwNDg3LDEuMTY4NTkyIC0zLjM4MDQ4NywyLjgyODE5NCAwLDEuODQ0MDAxIDEuMTY3NjE4LDIuNDU4NjU1IDMuMjU3NDg4LDIuOTUwMzg5IDEuODQ0MDAxLDAuMzY4OCAyLjIxMzk5NywwLjc5OTA2MSAyLjIxMzk5NywxLjQ3NTE5NSAwLDAuNzM4MTQ5IC0wLjY3NzA2NCwxLjIyOTk5OSAtMS43MjE5OTgsMS4yMjk5OTkgLTEuMjI5MzM1LDAgLTIuMjEyNDg2LC0wLjQ5MjAzMiAtMy4xMzQ0ODcsLTEuMjkxMDk3IGwgLTEuMDQ1OTAxLDEuMjI5MTk1IGMgMS4xNjg0MTYsMS4wNDU0ODMgMi42NDQwODksMS41MzcwOTQgNC4xMTkyODksMS41MzcwOTQgMi4wMjg5NTIsMCAzLjUwMzQ4OCwtMS4xMDY2NDMgMy41MDM0ODgsLTIuOTUxMTkxIDAsLTEuNjU5NjAyIC0xLjA0NDg3NCwtMi4zOTY3NTQgLTMuMTM1MjkxLC0yLjg4ODQ4OCAtMS45MDU0NjgsLTAuNDMwMjY2IC0yLjMzNTM5LC0wLjc5OTQ5NSAtMi4zMzUzOSwtMS41MzcwOTYgMCwtMC42NzY2ODMgMC42MTQ3MjcsLTEuMTY4MDk3IDEuNTk4MTk0LC0xLjE2ODA5NyAwLjg2MDUzNCwwIDEuNzgyMjEsMC4zMDc4NjYgMi42NDMyOTIsMC45ODM5OTkgTCAyNS4wODUxMTksMy4wNTIzNTUgQyAyNC4xMDE2NTEsMi4yNTMyODggMjIuOTMyNjYxLDEuODIyMzU2IDIxLjUxODkyNiwxLjgyMjM1NiBaIG0gNS4yODY1ODQsMCB2IDkuNzc0MDY3IGggMS43MjExOTQgViA4LjQ2MTEzNCBoIDEuOTY3OTk4IGMgMi4xNTEzMzQsMCAzLjkzMzU4NCwtMS4xNjc2ODUgMy45MzM1ODQsLTMuMzgwNDg3IDAsLTEuOTY3NDg0IC0xLjQ3NTIxOCwtMy4yNTgyOTEgLTMuNzQ5NDg2LC0zLjI1ODI5MSB6IG0gOS4wOTg3NzQsMCB2IDkuODM1OTczIGggNy4zNzU5NzMgViAxMC4xMjEyMzEgSCAzNy42MjQ2NzYgViA3LjQ3NzkzOSBoIDQuOTE4Mzg3IFYgNS45NDE2NDYgSCAzNy42MjQ2NzYgViAzLjM1OTQ1MiBoIDUuNTk0NDg2IFYgMS44MjIzNTYgWiBtIDkuMTU5MDY5LDAgdiA5LjgzNTk3MyBIIDUyLjQzOTMzIFYgMTAuMTIxMjMxIEggNDYuNzgzNzQ1IFYgNy40Nzc5MzkgaCA0LjkxODM4OCBWIDUuOTQxNjQ2IEggNDYuNzgzNzQ1IFYgMy4zNTk0NTIgSCA1Mi4zNzgyMyBWIDEuODIyMzU2IFogbSA5LjA5Nzk3MywwIHYgOS44MzU5NzMgaCAzLjY4NzU4NyBjIDMuMDczODg1LDAgNS4yMjU0ODQsLTIuMTUxNTg0IDUuMjI1NDg0LC00LjkxNzU4NiAwLC0yLjc2NjU1IC0yLjE1MTU5OSwtNC45MTgzODcgLTUuMjI1NDg0LC00LjkxODM4NyB6IG0gOS44OTYyNjUsMCB2IDEuNTk4OTk5IGggMy4xMzYwOTUgdiA4LjIzNjk3NCBoIDEuNzIwMzkzIFYgMy40MjEzNTUgaCAzLjEzNTI5MiBWIDEuODIyMzU2IFogbSA5Ljc3NDg3NiwwIHYgOS44MzU5NzMgSCA4MS4yMDg0NCBWIDEwLjEyMTIzMSBIIDc1LjU1MzY2MSBWIDcuNDc3OTM5IGggNC45MTc1ODYgViA1Ljk0MTY0NiBIIDc1LjU1MzY2MSBWIDMuMzU5NDUyIGggNS41OTM2OCBWIDEuODIyMzU2IFogbSAxMi42MDE0NTcsMCBjIC0xLjk2NzQ4NCwwIC0zLjM4MTI4OSwxLjE2ODU5MiAtMy4zODEyODksMi44MjgxOTQgMCwxLjg0NDAwMSAxLjE2Nzg3LDIuNDU4NjU1IDMuMjU4MjkyLDIuOTUwMzg5IDEuODQzOTk4LDAuMzY4OCAyLjIxMzE5MywwLjc5OTA2MSAyLjIxMzE5MywxLjQ3NTE5NSAwLDAuNzM4MTQ5IC0wLjY3NjI2MywxLjIyOTk5OSAtMS43MjExOTQsMS4yMjk5OTkgLTEuMjI5ODgzLDAgLTIuMjEyNzQ0LC0wLjQ5MjAzMiAtMy4xMzUyOTIsLTEuMjkxMDk3IGwgLTEuMDQ1MDk2LDEuMjI5MTk1IGMgMS4xNjc4NjYsMS4wNDU0ODMgMi41ODIyNTMsMS41MzcxNjEgNC4xODAzODgsMS42NjAwOTYgMi4wMjg0MDEsMCAzLjUwMzQ4NywtMS4xMDYzOSAzLjUwMzQ4NywtMi45NTAzODkgMCwtMS42NjAxNSAtMS4wNDQ2MTksLTIuMzk4MzYxIC0zLjEzNDQ4OSwtMi44OTAwOTYgLTEuOTA1NDY3LC0wLjQzMDI2NyAtMi4zMzYxOTMsLTAuNzk4NjkyIC0yLjMzNjE5MywtMS41MzYyOTMgMCwtMC42NzYxMzMgMC42MTQ3MjcsLTEuMTY4MDk3IDEuNTk4MTkzLC0xLjE2ODA5NyAwLjg2MDUzNSwwIDEuNzgyNzU5LDAuMzA3MzE4IDIuNjQzMjkzLDAuOTg0IEwgODkuOTk5MzEzLDMuMDUyMzU1IEMgODkuMDE1ODQ3LDIuMjUzMjg4IDg3Ljg0NzY1OSwxLjgyMjM1NiA4Ni40MzM5MjQsMS44MjIzNTYgWiBtIDQuOTE3NTg2LDAgdiAxLjU5ODk5OSBoIDMuMTM1MjkyIHYgOC4yMzY5NzQgaCAxLjcyMTE5NiBWIDMuNDIxMzU1IGggMy4xMzUyODUgViAxLjgyMjM1NiBaIE0gMjguNTI2NzA0LDMuMzU5NDUyIEggMzAuNTU1OCBjIDEuMzUyMjY4LDAgMi4xNTEyOTIsMC42MTQ2OCAyLjE1MTI5MiwxLjc4MzA5NyAwLDEuMDQ0OTM0IC0wLjg2MDQ5MSwxLjc4MjI5MiAtMi4xNTEyOTIsMS43ODIyOTIgaCAtMi4wMjkwOTYgeiBtIDI3LjQxNjkxNSwwLjEyMzAwMSBoIDEuOTY3MTk2IGMgMi4wOTA0MTQsMCAzLjQ0MjM4OCwxLjQxMzkyMSAzLjQ0MjM4OCwzLjMxOTM4OSAwLDEuOTA1NDY3IC0xLjM1MTk3NCwzLjMxOTM4OSAtMy40NDIzODgsMy4zMTkzODkgSCA1NS45NDM2MTkgWiBNIDkuOTYyNTY1NCw0LjI4MTU1IDYuMDkwMDc5NSw3LjM1NDkzOSA3LjQ0MjI3MzUsOC43MDcxMzQgMTAuNTE1NjYyLDQuODM0NjQ4IFoiCiAgICAgaWQ9InBhdGgxNCIgLz48L3N2Zz4=' height='17' style='vertical-align:middle'/>" +
					'&emsp;' +
					_('Testing in progress...') +
				"</span>";
			};
			if (result_content[0].match(/https?:\S+/)) {
				result_stat.innerHTML = "<div style='max-width:500px'><a href='" + result_content[0] + "' target='_blank'><img src='" + result_content[0] + '.png' + "' style='max-width:100%;max-height:100%;vertical-align:middle'></a></div>";
			};
			if (result_content[0] == 'Test failed') {
				result_stat.innerHTML = "<span style='color:red;font-weight:bold'>" + _('Test failed.') + "</span>";
			}
		} else {
			result_stat.innerHTML = "<span style='color:red;font-weight:bold;display:none'>" + _('No result.') + "</span>";
		};
		return;
	},

	render: function(res) {
		var has_ookla = res[0].path,
			result_content = res[1] ? res[1].trim().split("\n") : [],
			result_mtime = res[2] ? res[2].mtime * 1000 : 0,
			date = new Date();

		var m, s, o;

		m = new form.Map('netspeedtest', _('Speedtest by Ookla'));

		s = m.section(form.TypedSection, '_result');
		s.anonymous = true;
		s.render = function (section_id) {
			if (result_content.length) {
				if (result_content[0] == 'Testing') {
					return E('div', { 'id': 'speedtest_result' }, [ E('span', { 'style': 'color:yellow;font-weight:bold' }, [
						E('img', { 'src': L.resource(['icons/loading.gif']), 'height': '20', 'style': 'vertical-align:middle' }, []),
						_('Testing in progress...')
					]) ])
				};
				if (result_content[0].match(/https?:\S+/)) {
					return E('div', { 'id': 'speedtest_result' }, [ E('div', { 'style': 'max-width:500px' }, [
						E('a', { 'href': result_content[0], 'target': '_blank' }, [
							E('img', { 'src': result_content[0] + '.png', 'style': 'max-width:100%;max-height:100%;vertical-align:middle' }, [])
					]) ]) ])
				};
				if (result_content[0] == 'Test failed') {
					return E('div', { 'id': 'speedtest_result' }, [ E('span', { 'style': 'color:red;font-weight:bold' }, [ _('Test failed.') ]) ])
				}
			} else {
				return E('div', { 'id': 'speedtest_result' }, [ E('span', { 'style': 'color:red;font-weight:bold;display:none' }, [ _('No result.') ]) ])
			}
		};

		s = m.section(form.NamedSection, 'config', 'speedtest', _('Internet Speedtest'));

		o = s.option(form.Button, '_start', _('Start Test'));
		o.inputtitle = _('Start Test');
		o.inputstyle = 'apply';
		if (result_content.length && result_content[0] == 'Testing' && (date.getTime() - result_mtime) < TestTimeout)
			o.readonly = true;
		o.onclick = function() {
			return fs.exec_direct('/usr/lib/netspeedtest/speedtest')
				.then(function(res) { return window.location = window.location.href.split('#')[0] })
				.catch(function(e) { ui.addNotification(null, E('p', e.message), 'error') });
		};

		o = s.option(form.DummyValue, '_ookla_status', _('Speedtest® CLI'));
		o.rawhtml = true;
		o.cfgvalue = function(s) {
			if (has_ookla) {
				return E('span', { 'id': 'ookla_status', 'style': 'color:green;font-weight:bold' }, [ _('Installed') ]);
			} else {
				return E('span', { 'id': 'ookla_status', 'style': 'color:red;font-weight:bold' }, [ _('Not Installed') ]);
			}
		};

		return m.render()
		.then(L.bind(function(m, nodes) {
			poll.add(L.bind(function() {
				return Promise.all([
					L.resolveDefault(fs.stat('/usr/bin/speedtest'), {}),
					L.resolveDefault(fs.read('/etc/speedtest/speedtest_result'), null)
				]).then(L.bind(this.poll_status, this, nodes));
			}, this), 5);
			return nodes;
		}, this, m));
	}
});
