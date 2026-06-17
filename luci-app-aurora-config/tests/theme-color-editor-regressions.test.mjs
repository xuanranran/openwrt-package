import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const themePath = resolve("htdocs/luci-static/resources/view/aurora/theme.js");

async function themeSource() {
  return readFile(themePath, "utf8");
}

function sourceBlock(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} exists`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `${end} exists after ${start}`);
  return source.slice(startIndex, endIndex);
}

test("color editor validates only the edited color field", async () => {
  const source = await themeSource();
  const editorBlock = sourceBlock(
    source,
    "const createColorEditor =",
    "const renderColorField =",
  );

  assert.match(editorBlock, /const updateField = \(mode, key, result, options = \{\}\)/);
  assert.match(editorBlock, /const shouldValidate = options\.validateKeys\?\.has\(key\) \?\? false/);
  assert.match(editorBlock, /if \(shouldValidate\) triggerValidation\(field\)/);
  assert.match(editorBlock, /const affectedKeysFor = \(key\) =>/);
  assert.match(editorBlock, /schedule\(mode, token\.key, \{ validate: true \}\)/);
});

test("native color picker does not bubble LuCI change events", async () => {
  const source = await themeSource();
  const pickerBlock = sourceBlock(
    source,
    'picker.addEventListener("change"',
    "editor.register",
  );

  assert.match(pickerBlock, /input\.value = picker\.value/);
  assert.match(pickerBlock, /input\.dispatchEvent\(new Event\("input"\)\)/);
  assert.doesNotMatch(pickerBlock, /new Event\("change"/);
  assert.doesNotMatch(pickerBlock, /bubbles:\s*true/);
});

test("pending color validation keeps the last stable validity", async () => {
  const source = await themeSource();
  const validateBlock = sourceBlock(
    source,
    "const validate = (mode, key, value) =>",
    "const attach =",
  );

  assert.match(
    validateBlock,
    /if \(state\.pending\)\s*return state\.valid \|\| state\.error == null \? true : state\.error/,
  );
});

test("derived color fields can be cleared from UCI", async () => {
  const source = await themeSource();
  const addColorInputsBlock = sourceBlock(
    source,
    "const addColorInputs =",
    "const createColorSections =",
  );

  assert.doesNotMatch(addColorInputsBlock, /if\s*\(\s*token\.derived\s*\)\s*return/);
  assert.doesNotMatch(addColorInputsBlock, /if\s*\(\s*token\.derived\s*\)\s*\{[\s\S]*?return;[\s\S]*?\}/);
  assert.match(
    addColorInputsBlock,
    /if\s*\(\s*trimmed\s*\)[\s\S]*uci\.set[\s\S]*else[\s\S]*uci\.unset/,
  );
  assert.match(addColorInputsBlock, /option\.remove = \(sectionId\) => \{[\s\S]*uci\.unset/);
});

test("saving waits for pending color resolution before writing UCI", async () => {
  const source = await themeSource();
  const editorBlock = sourceBlock(
    source,
    "const createColorEditor =",
    "const renderColorField =",
  );
  const saveBlock = sourceBlock(
    source,
    "const runSavePipeline = function",
    "return view.extend",
  );

  assert.match(editorBlock, /const flush = \(\) => \{/);
  assert.match(editorBlock, /flush,/);
  assert.match(saveBlock, /this\.colorEditor\?\.flush\?\.\(\)/);
  assert.match(saveBlock, /persistDerivedTokens\(this\.colorEditor\)/);
});

test("preset selector stays compact without helper prompt text", async () => {
  const source = await themeSource();
  const optionsBlock = sourceBlock(
    source,
    "const buildPresetOptions =",
    "const FONT_DEFAULT_STACKS =",
  );
  const toolbarBlock = sourceBlock(
    source,
    "const buildPresetToolbarNode =",
    "const headerBar =",
  );

  assert.doesNotMatch(optionsBlock, /description:/);
  assert.doesNotMatch(toolbarBlock, /selectedPresetDescription/);
  assert.doesNotMatch(toolbarBlock, /presetHelp/);
});
