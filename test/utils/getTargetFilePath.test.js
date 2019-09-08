const test = require("ava");
const getTargetFilePath = require("../../utils/getTargetFilepath");


test("should strip file extension for a missing output template", t => {
    const result = getTargetFilePath("/Users/User/project/app/src/nested/partial.hbs");

    t.is(result, "/Users/User/project/app/src/nested/partial");
});


test("should return output path", t => {
    const result = getTargetFilePath(
        "/Users/User/project/app/src/nested/partial.hbs",
        "/Users/User/project/build/index.html"
    );

    t.is(result, "/Users/User/project/build/index.html");
});


test("should replace template with filename", t => {
    const result = getTargetFilePath(
        "/Users/User/project/app/src/nested/partial.hbs",
        "/Users/User/project/build/[name].html"
    );

    t.is(result, "/Users/User/project/build/partial.html");
});


test("should return unix filepath", t => {
    const result = getTargetFilePath(
        "\\Users\\User\\project\\app\\src\\nested\\partial.hbs",
        "/Users/User/project/build/[name].html"
    );

    t.is(result, "/Users/User/project/build/partial.html");
});
