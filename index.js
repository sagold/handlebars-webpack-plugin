const fs = require("fs-extra");
const chalk = require("chalk");
const partialUtils = require("./utils/partials");
const Handlebars = require("handlebars");
const glob = require("glob");
const path = require("path");
const log = require("./utils/log");


function getHelperId(filepath) {
    const id = filepath.match(/\/([^/]*).js$/).pop();
    return id.replace(/\.?helper\.?/, "");
}


function addHelper(Handlebars, id, fun) { // eslint-disable-line no-shadow
    log(chalk.grey(`registering helper ${id}`));
    Handlebars.registerHelper(id, fun);
}

class HandlebarsPlugin {

    constructor(options) {
        options = Object.assign({
            onBeforeSetup: Function.prototype,
            onBeforeAddPartials: Function.prototype,
            onBeforeCompile: Function.prototype,
            onBeforeRender: Function.prototype,
            onBeforeSave: Function.prototype,
            onDone: Function.prototype
        }, options);

        options.onBeforeSetup(Handlebars);

        this.options = options;
        this.outputFile = options.output;
        this.entryFile = options.entry;
        this.data = options.data || {};
        this.fileDependencies = [];

        // register helpers
        const helperQueries = options.helpers || {};
        Object.keys(helperQueries).forEach((helperId) => {
            let foundHelpers;

            // globbed paths
            if (typeof helperQueries[helperId] === "string") {
                foundHelpers = glob.sync(helperQueries[helperId]);
                foundHelpers.forEach((pathToHelper) => {
                    addHelper(Handlebars, getHelperId(pathToHelper), require(pathToHelper));
                    this.addDependency(pathToHelper);
                });

            // functions
            } else {
                addHelper(Handlebars, helperId, helperQueries[helperId]);
            }
        });
    }

    readFile(filepath) {
        this.fileDependencies.push(filepath);
        return fs.readFileSync(filepath, "utf-8");
    }

    addDependency(...args) {
        this.fileDependencies.push.apply(this.fileDependencies, args);
    }

    apply(compiler) {
        var self = this;
        var options = this.options;
        var data = this.data;
        var entryFile = this.entryFile;
        var outputFile = this.outputFile;

        compiler.plugin("compile", () => {
            // fetch paths to partials
            const partials = partialUtils.loadMap(Handlebars, options.partials);

            options.onBeforeAddPartials(Handlebars, partials);

            // register partials
            partialUtils.addMap(Handlebars, partials);
            // watch all partials for changes
            this.addDependency.apply(this, Object.keys(partials).map((key) => partials[key]));


            glob(entryFile, (err, entryFilesArray) => {
                if (err) {
                    console.log(err);
                    return false;
                }

                if (entryFilesArray.length === 0) {
                    log(chalk.red(`no valid entry files found for ${entryFile}`));
                    return false;
                }

                entryFilesArray.forEach((entryFileSingle) => {
                    let result;
                    let templateContent = self.readFile(entryFileSingle, "utf-8");
                    let fileName = path.basename(entryFileSingle);
                    const fileExt = path.extname(entryFileSingle);
                    fileName = fileName.replace(fileExt, "");

                    templateContent = options.onBeforeCompile(Handlebars, templateContent) || templateContent;

                    const template = Handlebars.compile(templateContent);

                    data = options.onBeforeRender(Handlebars, data) || data;
                    result = template(data);


                    const outputFileNew = outputFile.replace("[name]", fileName);
                    result = options.onBeforeSave(Handlebars, result, outputFileNew) || result;

                    fs.outputFileSync(outputFileNew, result, "utf-8");
                    log(chalk.grey(`created output '${outputFileNew.replace(`${process.cwd()}/`, "")}'`));


                    options.onDone(Handlebars, outputFileNew);
                });

                return true;
            });
        });

        compiler.plugin("emit", (compiler, done) => { // eslint-disable-line no-shadow
            // add dependencies to watch. This might not be the correct place for that - but it works
            // webpack filters duplicates...
            compiler.fileDependencies = compiler.fileDependencies.concat(self.fileDependencies);
            done();
        });
    }
}

// export Handlebars for easy access in helpers
HandlebarsPlugin.Handlebars = Handlebars;

module.exports = HandlebarsPlugin;
