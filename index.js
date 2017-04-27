const fs = require("fs-extra");
const chalk = require("chalk");
const partialUtils = require("./utils/partials");
const helperUtils = require("./utils/helpers");
const Handlebars = require("handlebars");
const glob = require("glob");
const path = require("path");
const log = require("./utils/log");


function getTargetFilepath(filepath, outputTemplate) {
    let outputFilepath;
    if (outputTemplate) {
        const fileName = path
          .basename(filepath)
          .replace(path.extname(filepath), "");
        outputFilepath = outputTemplate.replace("[name]", fileName);
    } else {
        outputFilepath = filepath.replace(path.extname(filepath), "");
    }
    
    return outputFilepath;
}


class HandlebarsPlugin {

    constructor(options) {
        this.options = Object.assign({
            entry: null,
            output: null,
            data: {},
            helpers: {},
            onBeforeSetup: Function.prototype,
            onBeforeAddPartials: Function.prototype,
            onBeforeCompile: Function.prototype,
            onBeforeRender: Function.prototype,
            onBeforeSave: Function.prototype,
            onDone: Function.prototype
        }, options);

        this.options.onBeforeSetup(Handlebars);
        this.data = this.options.data;
        this.fileDependencies = [];

        // register helpers
        const helperMap = helperUtils.resolve(this.options.helpers);
        helperMap.forEach((helper) => {
            helperUtils.register(Handlebars, helper.id, helper.helperFunction);
            this.addDependency(helper.filepath);
        });

        // register partials
        const partials = partialUtils.resolve(Handlebars, this.options.partials);
        this.options.onBeforeAddPartials(Handlebars, partials);
        partialUtils.addMap(Handlebars, partials);
        // watch all partials for changes
        this.addDependency.apply(this, Object.keys(partials).map((key) => partials[key]));
    }

    apply(compiler) {
        compiler.plugin("compile", () => this.compileAllEntryFiles());
        compiler.plugin("emit", (compiler, done) => { // eslint-disable-line no-shadow
            // add dependencies to watch. This might not be the correct place for that - but it works
            // webpack filters duplicates...
            compiler.fileDependencies = compiler.fileDependencies.concat(this.fileDependencies);
            done();
        });
    }

    readFile(filepath) {
        this.fileDependencies.push(filepath);
        return fs.readFileSync(filepath, "utf-8");
    }

    addDependency(...args) {
        this.fileDependencies.push.apply(this.fileDependencies, args.filter((filename) => filename));
    }

    compileAllEntryFiles() {
        glob(this.options.entry, (err, entryFilesArray) => {
            if (err) {
                throw err;
            }
            if (entryFilesArray.length === 0) {
                log(chalk.yellow(`no valid entry files found for ${this.options.entry} -- aborting`));
                return;
            }
            entryFilesArray.forEach((filepath) => this.compileEntryFile(filepath));
            // enforce new line after plugin has finished
            console.log();
        });
    }

    compileEntryFile(filepath) {
        const targetFilepath = getTargetFilepath(filepath, this.options.output);
        // fetch template content
        let templateContent = this.readFile(filepath, "utf-8");
        templateContent = this.options.onBeforeCompile(Handlebars, templateContent) || templateContent;
        // create template
        const template = Handlebars.compile(templateContent);
        const data = this.options.onBeforeRender(Handlebars, this.data) || this.data;
        // compile template
        let result = template(data);
        result = this.options.onBeforeSave(Handlebars, result, targetFilepath) || result;
        // write result to file
        fs.outputFileSync(targetFilepath, result, "utf-8");
        this.options.onDone(Handlebars, targetFilepath);
        log(chalk.grey(`created output '${targetFilepath.replace(`${process.cwd()}/`, "")}'`));
    }
}

// export Handlebars for easy access in helpers
HandlebarsPlugin.Handlebars = Handlebars;

module.exports = HandlebarsPlugin;
