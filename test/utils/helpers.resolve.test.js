/* eslint no-empty-function: 0 */
const test = require("ava");
const path = require("path");
const { resolve } = require("../../utils/helpers");
const supportFolder = path.join(__dirname, "..", "support");


test("should return a list", t => {
    const result = resolve({});

    t.true(Array.isArray(result));
});


test("should pass inline functions to result", t => {
    function inlineHelper() {}
    const result = resolve({
        inline: inlineHelper
    });

    t.deepEqual(result[0], {
        id: "inline",
        filepath: false,
        helperFunction: inlineHelper
    });
});


test("should add helper function from file", t => {
    const sourceFilepath = path.join(supportFolder, "app", "src", "helpers", "a.helper.js");
    const result = resolve({
        helper: sourceFilepath
    });

    t.deepEqual(result[0], {
        id: "a",
        filepath: sourceFilepath,
        helperFunction: require(sourceFilepath)
    });
});


test("should add all functions within folder", t => {
    const basepath = path.join(supportFolder, "app", "src", "helpers");
    const result = resolve({
        helper: path.join(basepath, "*.js")
    });

    t.deepEqual(result[0], {
        id: "a",
        filepath: path.join(basepath, "a.helper.js"),
        helperFunction: require(path.join(basepath, "a.helper.js"))
    });

    t.deepEqual(result[1], {
        id: "b",
        filepath: path.join(basepath, "b.helper.js"),
        helperFunction: require(path.join(basepath, "b.helper.js"))
    });
});


test("should add all nested functions", t => {
    const basepath = path.join(supportFolder, "app", "src", "helpers");
    const result = resolve({
        helper: path.join(basepath, "**", "*.js")
    });

    t.deepEqual(result[0], {
        id: "a",
        filepath: path.join(basepath, "a.helper.js"),
        helperFunction: require(path.join(basepath, "a.helper.js"))
    });

    t.deepEqual(result[1], {
        id: "b",
        filepath: path.join(basepath, "b.helper.js"),
        helperFunction: require(path.join(basepath, "b.helper.js"))
    });

    t.deepEqual(result[2], {
        id: "a-nested",
        filepath: path.join(basepath, "nested", "a-nested.helper.js"),
        helperFunction: require(path.join(basepath, "nested", "a-nested.helper.js"))
    });
});
