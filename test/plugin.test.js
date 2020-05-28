const test = require("ava");
const path = require("path");
const sinon = require("sinon");
const Plugin = require("../index");

const srcFolder = path.join(__dirname, "support", "app", "src");


function isObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}


test("should create plugin without error", t => {
    const plugin = new Plugin();

    t.true(isObject(plugin));
});


test("should convert option:htmlWebpackPlugin to object", t => {
    const plugin = new Plugin({ htmlWebpackPlugin: true });

    t.true(isObject(plugin.options.htmlWebpackPlugin));
});


test("should load json data on init", t => {
    const plugin = new Plugin({ // eslint-disable-line no-unused-vars
        data: path.join(__dirname, "support", "data", "data.json")
    });

    t.deepEqual(plugin.data, { id: "data.json" });
});


test("should load all helpers", t => {
    const plugin = new Plugin({ // eslint-disable-line no-unused-vars
        helpers: {
            helperFromGlob: path.join(srcFolder, "helpers", "**", "*.helper.js")
        }
    });
    const handlebars = plugin.HB;
    const register = sinon.spy(handlebars, "registerHelper");
    handlebars.helpers = {};

    plugin.loadHelpers();

    t.is(register.callCount, 3, "expected to have three helpers registered");
    t.is(register.getCall(0).args[0], "a");
    t.is(register.getCall(1).args[0], "b");
    t.is(register.getCall(2).args[0], "a-nested");

    register.restore();
    handlebars.helpers = {};
});


test("should support inline helpers", t => {
    const plugin = new Plugin({ // eslint-disable-line no-unused-vars
        helpers: {
            random: function random() { return Math.random(); }
        }
    });
    const handlebars = plugin.HB;
    const register = sinon.spy(handlebars, "registerHelper");
    handlebars.helpers = {};

    plugin.loadHelpers();

    t.is(register.callCount, 1, "expected to have one helper registered");
    t.is(register.getCall(0).args[0], "random");
    t.is(typeof register.getCall(0).args[1], "function");

    register.restore();
    handlebars.helpers = {};
});


test("should load all partials", t => {
    const plugin = new Plugin({
        partials: [path.join(srcFolder, "partials", "**", "*.hbs")]
    });
    const handlebars = plugin.HB;
    const register = sinon.spy(handlebars, "registerPartial");

    plugin.loadPartials();

    t.is(register.callCount, 2, "expected to have two partials registered");
    t.is(register.getCall(0).args[0], "partials/a");
    t.is(register.getCall(1).args[0], "nested/a-nested");

    register.restore();
    handlebars.partials = {};
});


test("should run compileEntryFile for each entry file", async t => {
    const plugin = new Plugin({
        entry: path.join(srcFolder, "entries", "**", "*.hbs")
    });
    const compileEntryFile = sinon.stub(plugin, "compileEntryFile");
    const compilation = { errors: [], compiler: { outputPath: "/output" } };

    await new Promise(resolve => plugin.compileAllEntryFiles(compilation, resolve));

    t.is(compileEntryFile.callCount, 2, "Expected two entry files to be found");
    t.is(path.normalize(compileEntryFile.getCall(0).args[0]), path.join(srcFolder, "entries", "index.hbs"));
    t.is(path.normalize(compileEntryFile.getCall(1).args[0]), path.join(srcFolder, "entries", "nested", "nested.hbs"));

    compileEntryFile.restore();
});
