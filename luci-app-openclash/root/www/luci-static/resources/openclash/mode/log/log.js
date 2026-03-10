// CodeMirror log mode
// Distributed under an MIT license: https://codemirror.net/5/LICENSE
// Supports log output with level and category highlighting

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("log", function(config, parserConfig) {

  return {
    startState: function(basecol) {
      return {
        basecol: basecol || 0,
        levelDone: false,
        categoryDone: false
      };
    },

    token: function(stream, state) {
      var ch;

      if (stream.sol()) {
        state.levelDone = false;
        state.categoryDone = false;
        state.othersDone = false;

        // Match timestamp: YYYY-MM-DD HH:MM:SS
        if (stream.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
          return "log-timestamp";
        }
      }

      if (stream.eatSpace()) return null;

      ch = stream.peek();

      // Match log level: [info] [warning] [error] [debug]
      if (!state.levelDone && ch === '[' && stream.match(/\[(?:info|warning|error|debug)\]/i)) {
        var level = stream.current().slice(1, -1).toLowerCase();
        state.levelDone = true;
        return "log-level-" + level;
      }
      
      // Match category tag: [TCP] [UDP] [DNS] etc - only after level is matched
      if (state.levelDone && !state.categoryDone && !state.othersDone && ch === '[' && stream.match(/\[[^\]]+\]/)) {
        state.categoryDone = true;
        return "log-category";
      }

      state.othersDone = true;
      
      // Special marker detection with early exit checks
      // Match 【...】 brackets
      if (stream.match(/【[^】]*】/)) {
        return "log-bracket";
      }
      
      // Tip markers
      if (ch === '提' && stream.match(/提示[：:]/)) {
        stream.skipToEnd();
        return "log-tip";
      }
      if (ch === 'T' && stream.match(/Tip[：:]/)) {
        stream.skipToEnd();
        return "log-tip";
      }
      
      // Watchdog markers
      if (ch === '守' && stream.match(/守护程序[：:]/)) {
        stream.skipToEnd();
        return "log-watchdog";
      }
      if (ch === 'W' && stream.match(/Watchdog[：:]/)) {
        stream.skipToEnd();
        return "log-watchdog";
      }
      
      // Warning markers
      if (ch === '警' && stream.match(/警告[：:]/)) {
        stream.skipToEnd();
        return "log-warn";
      }
      if (ch === 'W' && stream.match(/Warning[：:]/)) {
        stream.skipToEnd();
        return "log-warn";
      }
      
      // Error markers
      if (ch === '错' && stream.match(/错误[：:]/)) {
        stream.skipToEnd();
        return "log-error";
      }
      if (ch === 'E' && stream.match(/Error[：:]/)) {
        stream.skipToEnd();
        return "log-error";
      }
      
      // All other content is styled as string
      stream.eatWhile(/(?!【)\S/);
      return "log-string";
    }
  };
});

CodeMirror.defineMIME("text/x-log", "log");

});
