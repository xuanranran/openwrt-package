/**
 * OpenClash Common JavaScript Utilities
 * Shared functions used across multiple view templates.
 */

/**
 * Detects if an element has a dark background by analyzing its computed CSS.
 * Used by CodeMirror log editor to set dark mode attribute.
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} True if the background is dark
 */
function isDarkBackground(element) {
	var cachedTheme = localStorage.getItem('oc-theme');
	if (cachedTheme === 'dark') {
		return true;
	} else if (cachedTheme === 'light') {
		return false;
	}

	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return true;
	}

	var style = window.getComputedStyle(element);
	var bgColor = style.backgroundColor;
	var r, g, b;
	if (/rgb\(/.test(bgColor)) {
		var rgb = bgColor.match(/\d+/g);
		r = parseInt(rgb[0]);
		g = parseInt(rgb[1]);
		b = parseInt(rgb[2]);
	} else if (/#/.test(bgColor)) {
		if (bgColor.length === 4) {
			r = parseInt(bgColor[1] + bgColor[1], 16);
			g = parseInt(bgColor[2] + bgColor[2], 16);
			b = parseInt(bgColor[3] + bgColor[3], 16);
		} else {
			r = parseInt(bgColor.slice(1, 3), 16);
			g = parseInt(bgColor.slice(3, 5), 16);
			b = parseInt(bgColor.slice(5, 7), 16);
		}
	} else {
		return false;
	}
	var luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance < 128;
}

/**
 * Opens a URL in a new window. Used for external links (Wiki, GitHub, etc.).
 * @param {string} url - The URL to open
 * @returns {boolean} false to prevent default link behavior
 */
function winOpen(url) {
	var win = window.open(url);
	if (win == null) {
		window.location.href = url;
	}
	return false;
}

/* ================================================================
 * OpenClash Editor Shared Utilities
 * Used by config_editor.htm, config_merge_editor.htm, config_edit.htm
 * ================================================================ */

// Shared fullscreen and merge-diff toggle state
window._ocFullscreenActive = false;
window._ocMergeShowDifferences = true;
window._ocEditorHotkeysBound = false;

// CM6-ready callback queue (CM6 is loaded synchronously before templates, so this is a no-op passthrough)
window._cmWhenReady = function(cb) { cb(); };

/**
 * Initialize CodeMirror theme observer and dark mode detection.
 * First call: full setup (CM6 observer, initial theme, UI cleanup).
 * Subsequent calls (LuCI XHR navigation): re-apply dark mode only.
 */
function ocInitTheme() {
	if (window._ocThemeInited) {
		ocUpdateTheme();
		return;
	}
	window._ocThemeInited = true;
	// Defer to DOM ready: common.js loads in <head> before .oc elements exist.
	// On XHR navigation readyState is already complete, so execute immediately.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function() {
			ocUpdateTheme();
			ocHideEmptyCbiElements();
			ocCenterCbiActions();
		});
	} else {
		ocUpdateTheme();
		ocHideEmptyCbiElements();
		ocCenterCbiActions();
	}
}

/**
 * Apply dark/light mode to all .oc containers and notify CM6 editors.
 * Safe to call multiple times — used for runtime theme switching.
 */
function ocUpdateTheme() {
	var isDark = isDarkBackground(document.body);
	var ocEls = document.querySelectorAll('.oc');
	for (var i = 0; i < ocEls.length; i++) {
		if (isDark) {
			ocEls[i].setAttribute('data-darkmode', 'true');
		} else {
			ocEls[i].removeAttribute('data-darkmode');
		}
	}
	// Apply CM6 editor themes
	if (typeof CM6 !== 'undefined' && CM6.dispatchTheme) {
		var editors = document.querySelectorAll('.cm-editor');
		for (var j = 0; j < editors.length; j++) {
			var view = editors[j].cmView && editors[j].cmView.view;
			if (view) {
				try { CM6.dispatchTheme(view, isDark); } catch(e) {}
			}
		}
	}
	// Swap highlight.js theme CSS
	if (typeof CM6 !== 'undefined' && CM6.switchHljsTheme) {
		CM6.switchHljsTheme(isDark);
	}
}

/**
 * Hide empty cbi-section-table-titles, cbi-section-table-descr rows,
 * and cbi-section-descr blocks across all fieldsets on the page.
 */
function ocHideEmptyCbiElements() {
	var emptyEls = document.querySelectorAll('.cbi-section-table-titles, .cbi-section-table-descr, .cbi-section-descr');
	for (var i = 0; i < emptyEls.length; i++) {
		if (emptyEls[i].textContent.trim() === '') { emptyEls[i].style.display = 'none'; }
	}
}

/**
 * Center CBI action buttons (Commit/Apply/Create) and control elements
 * (proxy_mg/rule_mg) across all fieldsets on the page.
 */
function ocCenterCbiActions() {
	var ids = ['Commit', 'Apply', 'Create', 'Back', 'Load_Config',
		'Delete_Unused_Servers', 'Delete_Servers', 'Delete_Proxy_Provider', 'Delete_Groups',
		'proxy_mg', 'rule_mg', 'pro_mg'];
	for (var i = 0; i < ids.length; i++) {
		var els = document.querySelectorAll('[id$="-' + ids[i] + '"]');
		for (var j = 0; j < els.length; j++) {
			els[j].style.textAlign = 'center';
		}
	}
}

/**
 * Register global keyboard shortcuts for OpenClash editor pages:
 *   F11     – Toggle fullscreen on the active CM6 editor
 *   F10     – Toggle diff highlighting in merge view (when active)
 *   Escape  – Exit fullscreen
 * Safe to call multiple times — only registers once.
 */
function ocRegisterEditorHotkeys() {
	if (window._ocEditorHotkeysBound) return;
	window._ocEditorHotkeysBound = true;

	document.addEventListener('keydown', function(e) {
		// F11: toggle fullscreen
		if (e.key === 'F11') {
			e.preventDefault();
			if (window._ocFullscreenActive) {
				if (typeof CM6 !== 'undefined' && CM6.toggleFullscreen) {
					CM6.toggleFullscreen(document.getElementById('oc-fullscreen-active'));
				}
				window._ocFullscreenActive = false;
			} else {
				if (typeof CM6 !== 'undefined' && CM6.getActiveEditor && CM6.toggleFullscreen) {
					var target = CM6.getActiveEditor();
					window._ocFullscreenActive = CM6.toggleFullscreen(target);
				}
			}
			ocUpdateTheme();
			return;
		}

		// F10: toggle merge diff highlighting (only when merge view is active)
		if (e.key === 'F10' && window._mergeViewInstance && window._mergeViewInstance.reconfigure) {
			e.preventDefault();
			window._ocMergeShowDifferences = !window._ocMergeShowDifferences;
			window._mergeViewInstance.reconfigure({
				highlightChanges: window._ocMergeShowDifferences,
				gutter: window._ocMergeShowDifferences
			});
			if (window._mergeViewInstance.dom) {
				window._mergeViewInstance.dom.classList.toggle('oc-diff-hidden', !window._ocMergeShowDifferences);
			}
			return;
		}

		// Escape: exit fullscreen
		if (e.key === 'Escape' && window._ocFullscreenActive) {
			e.preventDefault();
			if (typeof CM6 !== 'undefined' && CM6.toggleFullscreen) {
				CM6.toggleFullscreen(document.getElementById('oc-fullscreen-active'));
			}
			window._ocFullscreenActive = false;
			ocUpdateTheme();
		}
	}, true);
}

ocInitTheme();
