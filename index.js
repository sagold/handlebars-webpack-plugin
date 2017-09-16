const fs = require("fs-extra");
const chalk = require("chalk");
const partialUtils = require("./utils/partials");
const helperUtils = require("./utils/helpers");
const Handlebars = require("handlebars");
const glob = require("glob");
const path = require("path");
const log = require("./utils/log");


/**
 * Returns the target filepath of a handlebars template
 * @param  {String} filepath            - input filepath
 * @param  {String} [outputTemplate]    - template for output filename.
 *                                          If ommited, the same filename stripped of its extension will be used
 * @return {String} target filepath
 */
function getTargetFilepath(filepath, outputTemplate) {
    if (outputTemplate == null) {
        return filepath.replace(path.extname(filepath), "");
    }

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
        this.fileDependencies = [];
        this.assetsToEmit = {};
        this.updateData();

        // register helpers
        const helperMap = helperUtils.resolve(this.options.helpers);
        helperMap.forEach((helper) => {
            helperUtils.register(Handlebars, helper.id, helper.helperFunction);
            this.addDependency(helper.filepath);
        });
    }

    /**
     * Register all partials to Handlebars
     */
    loadPartials() {
        // register partials
        const partials = partialUtils.resolve(Handlebars, this.options.partials);
        this.options.onBeforeAddPartials(Handlebars, partials);
        partialUtils.addMap(Handlebars, partials);
        // watch all partials for changes
        this.addDependency.apply(this, Object.keys(partials).map((key) => partials[key]));
    }

    /**
     * Webpack plugin hook - main entry point
     * @param  {Compiler} compiler
     */
    apply(compiler) {

        // COMPILE TEMPLATES
        compiler.plugin("make", (compilation, done) => {
            log(chalk.gray("start compilation"));
            this.loadPartials(); // Refresh partials
            this.compileAllEntryFiles(done); // build all html pages
        });

        // REGISTER FILE DEPENDENCIES TO WEBPACK
        compiler.plugin("emit", (compilation, done) => {
            // add dependencies to watch. This might not be the correct place for that - but it works
            // webpack filters duplicates...
            compilation.fileDependencies = compilation.fileDependencies.concat(this.fileDependencies);
            // emit generated html pages (webpack-dev-server)
            this.emitGeneratedFiles(compilation);
            done();
        });
    }

    /**
     * Returns contents of a dependent file
     * @param  {String} filepath
     * @return {String} filecontents
     */
    readFile(filepath) {
        this.fileDependencies.push(filepath);
        return fs.readFileSync(filepath, "utf-8");
    }

    /**
     * Registers a file as a dependency
     * @param {...[String]} args    - list of filepaths
     */
    addDependency(...args) {
        this.fileDependencies.push.apply(this.fileDependencies, args.filter((filename) => filename));
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
     * Notifies webpack-dev-server of generated files
     * @param  {Compilation} compilation
     */
    emitGeneratedFiles(compilation) {
        Object.keys(this.assetsToEmit).forEach((filename) => {
            compilation.assets[filename] = this.assetsToEmit[filename];
        });
    }

    updateData() {
        if (this.options.data && typeof this.options.data === "string") {
            try {
                const dataFromFile = JSON.parse(this.readFile(this.options.data));
                this.addDependency(this.options.data);
                this.data = dataFromFile;
            } catch (e) {
                console.error(`Tried to read ${this.options.data} as json-file and failed. Using it as data source...`);
                this.data = this.options.data;
            }
        } else {
            this.data = this.options.data;
        }
    }

    /**
     * @async
     * Generates all given handlebars templates
     * @param  {Function} done
     */
    compileAllEntryFiles(done) {

        this.updateData();

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

            done();
        });
    }

    /**
     * Generates the html file for the given filepath
     * @param  {String} filepath    - filepath to handelebars template
     */
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
