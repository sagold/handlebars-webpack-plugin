const fs = require("fs-extra");
const chalk = require("chalk");
const partialUtils = require("./utils/partials");
const helperUtils = require("./utils/helpers");
const Handlebars = require("handlebars");
const glob = require("glob");
const path = require("path");
const log = require("./utils/log");


function getTargetFilepath(filepath, outputTemplate) {
    const fileName = path
        .basename(filepath)
        .replace(path.extname(filepath), "");

    return outputTemplate.replace("[name]", fileName);
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
            this.emitGeneratedFiles(compiler);
            done();
        });
    }

    readFile(filepath) {
        this.fileDependencies.push(filepath);
        return fs.readFileSync(filepath, "utf-8");
    }

    /**
     * Register generated html files to support serving file with webpack-dev-server
     * @param  {String} filepath    - target filepath, where the file is created
     * @param  {String} content     - file contents
     */
    registerGeneratedFile(filepath, content) {
        this.assetsToEmit[path.basename(filepath)] = {
            source: () => content,
            size: () => content.length
        };
    }

    /**
     * Resets list of generated files
     */
    clearGeneratedFiles() {
        this.assetsToEmit = {};
    }

    /**
     * On emit
     * Notifies webpack-dev-server of generated files
     * @param  {Compilation} compilation
     */
    emitGeneratedFiles(compilation) {
        Object.keys(this.assetsToEmit).forEach((filename) => {
            compilation.assets[filename] = this.assetsToEmit[filename];
        });
    }

    addDependency(...args) {
        this.fileDependencies.push.apply(this.fileDependencies, args.filter((filename) => filename));
    }

    compileAllEntryFiles() {
        this.clearGeneratedFiles(); // reset emitted files, because we created them here again

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
        // notify webpack about newly filepath file (wds)
        this.registerGeneratedFile(targetFilepath, result);

        log(chalk.grey(`created output '${targetFilepath.replace(`${process.cwd()}/`, "")}'`));
    }
}

// export Handlebars for easy access in helpers
HandlebarsPlugin.Handlebars = Handlebars;

module.exports = HandlebarsPlugin;
