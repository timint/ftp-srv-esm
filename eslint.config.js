// Flat config for ESLint (ESLint v9+)
import js from "@eslint/js";

const mochaGlobals = {
  after: "readonly",
  afterEach: "readonly",
  before: "readonly",
  beforeEach: "readonly",
  describe: "readonly",
  it: "readonly",
  xdescribe: "readonly",
  xit: "readonly",
  context: "readonly",
  suite: "readonly",
  test: "readonly",
  setup: "readonly",
  teardown: "readonly",
  suiteSetup: "readonly",
  suiteTeardown: "readonly",
  specify: "readonly",
};

const nodeGlobals = {
  process: "readonly",
  __dirname: "readonly",
  module: "writable",
  require: "readonly",
  exports: "writable",
  Buffer: "readonly",
  setImmediate: "readonly",
  clearImmediate: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  URL: "readonly",
};

const testGlobals = {
  expect: "readonly",
};

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...mochaGlobals,
        ...nodeGlobals,
        ...testGlobals,
      },
    },
  },
  {
    ignores: [
      "node_modules/*",
      "bower_components/*"
    ],
  },
];
