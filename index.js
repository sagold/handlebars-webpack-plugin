const fs = require("fs-extra");
const chalk = require("chalk");
const partialUtils = require("./utils/partials");
const helperUtils = require("./utils/helpers");
const _Handlebars = require("handlebars");
const glob = require("glob");
const path = require("path");
const log = require("./utils/log");
const getTargetFilepath = require("./utils/getTargetFilepath");
const sanitizePath = require("./utils/sanitizePath.js");
const getRootFolder = require("./utils/getRootFolder");
const _HtmlWebpackPlugin = require("safe-require")("html-webpack-plugin");

class HandlebarsPlugin {

    constructor(options = {}) {
        this.HB = HandlebarsPlugin.Handlebars.create();

        this.options = Object.assign({
            entry: null,
            output: null,
            data: {},
            helpers: {},
            htmlWebpackPlugin: null,
            // make filepath retrieval customizable
            getTargetFilepath,
            // make partial-id generator customizable
            getPartialId: partialUtils.getDefaultId,
            // lifecycle hooks
            onBeforeSetup: Function.prototype,
            onBeforeAddPartials: Function.prototype,
            onBeforeCompile: Function.prototype,
            onBeforeRender: Function.prototype,
            onBeforeSave: Function.prototype,
            onDone: Function.prototype
        }, options);

        // setup htmlWebpackPlugin default options and merge user configuration
        let htmlWebpackPluginOptions = options.htmlWebpackPlugin;
        if (htmlWebpackPluginOptions && htmlWebpackPluginOptions.toString() === "true") {
            htmlWebpackPluginOptions = { enabled: true };
        }

        this.options.htmlWebpackPlugin = Object.assign({
            enabled: false,
            prefix: "html",
            HtmlWebpackPlugin: _HtmlWebpackPlugin
        }, htmlWebpackPluginOptions);

        this.firstCompilation = true;
        this.options.onBeforeSetup(this.HB);
        this.fileDependencies = [];
        this.assetsToEmit = {};
        this.updateData();
        this.prevTimestamps = {};
        this.startTime = Date.now();
    }

    loadHelpers() {
        const helperMap = helperUtils.resolve(this.options.helpers);
        // remove helper, before adding them again
        helperUtils.unregister(this.HB, ...helperMap.map(helper => helper.id));
        helperMap.forEach(helper => {
            helperUtils.register(this.HB, helper.id, helper.helperFunction);
            if (helper.filepath) {
                this.addDependency(helper.filepath);
            }
        });
    }

    /**
     * Register all partials to Handlebars
     */
    loadPartials() {
        // register partials
        const partials = partialUtils.resolve(this.HB, this.options.partials, this.options.getPartialId);
        this.options.onBeforeAddPartials(this.HB, partials);
        partialUtils.addMap(this.HB, partials);
        // watch all partials for changes
        this.addDependency.apply(this, Object.keys(partials).map(key => partials[key]));
    }

    /**
     * Webpack plugin hook - main entry point
     * @param  {Compiler} compiler
     */
    apply(compiler) {
        if (helperUtils.getWebpackMajorVersion(compiler) < 5) {
            this.applyWebpackV4(compiler);
            return;
        }

        // COMPILE TEMPLATES
        const compile = (compilation, done) => {
            try {
                if (this.dependenciesUpdated(compiler) === false) {
                    return done();
                }
                this.loadPartials(); // Refresh partials
                this.loadHelpers(); // Refresh helpers
                this.compileAllEntryFiles(compilation, done); // build all html pages

            } catch (error) {
                compilation.errors.push(error);
            }

            return undefined;
        };

        // REGISTER FILE DEPENDENCIES TO WEBPACK
        const emitDependencies = (compilation, done) => {
            try {
                // resolve file paths for webpack-dev-server
                const resolvedDependencies = this.fileDependencies.map(file => path.resolve(file));
                // register dependencies at webpack
                compilation.fileDependencies.addAll(resolvedDependencies);
                // emit generated html pages (webpack-dev-server)
                this.emitGeneratedFiles(compilation);

            } catch (error) {
                compilation.errors.push(error);
            }

            return done();
        };

        const { enabled, HtmlWebpackPlugin } = this.options.htmlWebpackPlugin;
        // @feature html-webpack-plugin
        if (enabled && HtmlWebpackPlugin) {
            compiler.hooks.thisCompilation.tap("HtmlWebpackPluginHooks", compilation => {
                // html-webpack-plugin >= 4
                HtmlWebpackPlugin.getHooks(compilation).beforeEmit
                    .tapAsync("HandlebarsRenderPlugin", (data, cb) => cb(null, this.processHtml(data)));

                compilation.hooks.processAssets.tapAsync(
                    {
                        name: "HandlebarsRenderPlugin",
                        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
                    },
                    (_, done) => compile(compilation, () => emitDependencies(compilation, done))
                );
            });
            return;
        }

        // use standard compiler hooks
        compiler.hooks.thisCompilation.tap("HandlebarsRenderPlugin", compilation => {
            compilation.hooks.processAssets.tapAsync(
                {
                    name: "HandlebarsRenderPlugin",
                    stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
                },
                (_, done) => compile(compilation, () => emitDependencies(compilation, done))
            );
        });
    }

    applyWebpackV4(compiler) {
        // COMPILE TEMPLATES
        const compile = (compilation, done) => {
            try {
                if (this.dependenciesUpdatedLegacy(compilation) === false) {
                    return done();
                }
                this.loadPartials(); // Refresh partials
                this.loadHelpers(); // Refresh helpers
                this.compileAllEntryFiles(compilation, done); // build all html pages

            } catch (error) {
                compilation.errors.push(error);
            }

            return undefined; // consistent return;
        };

        // REGISTER FILE DEPENDENCIES TO WEBPACK
        const emitDependencies = (compilation, done) => {
            try {
                // resolve file paths for webpack-dev-server
                const resolvedDependencies = this.fileDependencies.map(file => path.resolve(file));
                // register dependencies
                resolvedDependencies.forEach(compilation.fileDependencies.add, compilation.fileDependencies);
                // emit generated html pages (webpack-dev-server)
                this.emitGeneratedFiles(compilation);
                return done();

            } catch (error) {
                compilation.errors.push(error);
            }

            return undefined; // consistent return;
        };

        // @feature html-webpack-plugin
        const { enabled, HtmlWebpackPlugin } = this.options.htmlWebpackPlugin;
        if (enabled && HtmlWebpackPlugin) {
            compiler.hooks.thisCompilation.tap("HtmlWebpackPluginHooks", compilation => {
                // html-webpack-plugin >= 4
                HtmlWebpackPlugin.getHooks(compilation).beforeEmit
                    .tapAsync("HandlebarsRenderPlugin", (data, cb) => cb(null, this.processHtml(data)));

                compiler.hooks.emit.tapAsync("HandlebarsRenderPlugin", (_, done) => {
                    compile(compilation, () => emitDependencies(compilation, done));
                });
            });
            return;
        }

        // use standard compiler hooks
        compiler.hooks.thisCompilation.tap("HandlebarsRenderPlugin", () => {
            compiler.hooks.make.tapAsync("HandlebarsRenderPlugin", compile);
            compiler.hooks.emit.tapAsync("HandlebarsRenderPlugin", emitDependencies);
        });
    }

    processHtml(data) {
        const { prefix } = this.options.htmlWebpackPlugin;
        // @todo used a new partial helper to check for an existing partial
        // @todo use generate id for consistent name replacements
        this.HB.registerPartial(
            `${prefix}/${sanitizePath(data.outputName.replace(/\.[^.]*$/, ""))}`,
            data.html
        );

        try {
            // @improve hacky filepath retrieval
            // add source file to file dependencies, to watch for changes in webpack-dev-server
            const sourceFile = data.plugin.options.template.split("!").pop();
            this.addDependency(sourceFile);
        } catch (e) {
            log(chalk.red(e));
        }

        return data;
    }

    /**
     * Returns contents of a dependent file
     * @param  {String} filepath
     * @return {String} filecontents
     */
    readFile(filepath) {
        this.addDependency(filepath);
        return fs.readFileSync(filepath, "utf-8");
    }

    /**
     * Registers a file as a dependency
     * @param {...[String]} args    - list of filepaths
     */
    addDependency(...args) {
        if (!args) {
            return;
        }
        args.forEach(filename => {
            filename = sanitizePath(filename);
            if (filename && !this.fileDependencies.includes(filename)) {
                this.fileDependencies.push(filename);
            }
        });
    }

    /**
     * Check if dependencies have been modified (webpack < 5)
     * @param  {Object} compilation     - webpack compilation
     * @return {Boolean} true, if a handlebars file or helper has been updated
     */
    dependenciesUpdatedLegacy(compilation) {
        // NOTE: fileTimestamps will be an `object` or `Map` depending on the webpack version
        const fileTimestamps = compilation.fileTimestamps;
        const fileNames = fileTimestamps.has ? Array.from(fileTimestamps.keys()) : Object.keys(fileTimestamps);

        const changedFiles = fileNames.filter(watchfile => {
            const prevTimestamp = this.prevTimestamps[watchfile];
            const nextTimestamp = fileTimestamps.has ? fileTimestamps.get(watchfile) : fileTimestamps[watchfile];
            this.prevTimestamps[watchfile] = nextTimestamp;
            return (prevTimestamp || this.startTime) < (nextTimestamp || Infinity);
        });

        // diff may be zero on initial build, thus also rebuild if there are no changes
        return changedFiles.length === 0 || this.containsOwnDependency(changedFiles);
    }

    /**
     * Check if dependencies have been modified
     * @param  {Object} compiler
     * @return {Boolean} true, if a handlebars file or helper has been updated
     */
    dependenciesUpdated(compiler) {
        const modifiedFiles = compiler.modifiedFiles; // Set containing paths of modified files

        if (modifiedFiles == null) { // First run
            return true;
        }

        const fileDependencies = this.fileDependencies;

        for (let i = 0; i < fileDependencies.length; i++) {
            // path.resolve because paths in fileDependencies have '/' separators while paths
            // in modifiedFiles have '\' separators (on windows)
            if (modifiedFiles.has(path.resolve(fileDependencies[i]))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  {Array} list     - list of changed files as absolute paths
     * @return {Boolean} true, if a file is a dependency of this handlebars build
     */
    containsOwnDependency(list) {
        for (let i = 0; i < list.length; i += 1) {
            const filepath = sanitizePath(list[i]);
            if (this.fileDependencies.includes(filepath)) {
                return true;
            }
        }
        return false;
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
     * @param  {Object} compilation
     */
    emitGeneratedFiles(compilation) {
        Object.keys(this.assetsToEmit).forEach(filename => {
            compilation.assets[filename] = this.assetsToEmit[filename];
        });

        console.log("emit", this.assetsToEmit);
    }

    /**
     * (Re)load input data for hbs rendering
     */
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
     * @param  {Object} compilation  - webpack compilation
     * @param  {Function} done
     */
    compileAllEntryFiles(compilation, done) {

        this.updateData();

        glob(this.options.entry, (globError, entryFilesArray) => {
            if (globError) {
                compilation.errors.push(globError);
                done();
                return;
            }

            try {
                if (entryFilesArray.length === 0) {
                    log(chalk.yellow(`no valid entry files found for ${this.options.entry} -- aborting`));
                    return;
                }
                entryFilesArray.forEach(sourcePath => {
                    try {
                        this.compileEntryFile(sourcePath, compilation.compiler.outputPath, compilation);
                    } catch (error) {
                        compilation.errors.push(new Error(`${sourcePath}: ${error.message}\n${error.stack}`));
                    }
                });
            } catch (error) {
                compilation.errors.push(error);
            }

            // enforce new line after plugin has finished
            console.log();

            done();
        });
    }

    /**
     * Generates the html file for the given filepath
     * @param  {String} sourcePath  - filepath to handelebars template
     * @param  {String} outputPath  - webpack output path for build results
     * @param  {Object} compilation  - webpack compilation instance
     */
    compileEntryFile(sourcePath, outputPath, compilation) {
        outputPath = sanitizePath(outputPath);

        let rootFolderName = path.dirname(sourcePath);
        if (this.options.output.includes("[path]")) {
            rootFolderName = getRootFolder(sourcePath, this.options.entry);
        }
        if (rootFolderName === false) {
            compilation.errors.push(new Error(`${sourcePath}: is ignored`));
            return;
        }

        let targetFilepath = this.options.getTargetFilepath(sourcePath, this.options.output, rootFolderName);
        targetFilepath = sanitizePath(targetFilepath);
        // fetch template content
        let templateContent = this.readFile(sourcePath, "utf-8");
        templateContent = this.options.onBeforeCompile(this.HB, templateContent) || templateContent;
        // create template
        const template = this.HB.compile(templateContent);
        const data = this.options.onBeforeRender(this.HB, this.data, sourcePath) || this.data;
        // compile template
        let result = template(data);
        result = this.options.onBeforeSave(this.HB, result, targetFilepath) || result;

        if (targetFilepath.includes(outputPath)) {
            // change the destination path relative to webpacks output folder and emit it via webpack
            targetFilepath = targetFilepath.replace(outputPath, "").replace(/^\/*/, "");
            this.assetsToEmit[targetFilepath] = {
                source: () => result,
                size: () => result.length
            };

        } else {
            // @legacy: if the filepath lies outside the actual webpack destination folder, simply write that file.
            // There is no wds-support here, because of watched assets being emitted again
            fs.outputFileSync(targetFilepath, result, "utf-8");
        }

        this.options.onDone(this.HB, targetFilepath);
        log(chalk.grey(`created output '${targetFilepath.replace(`${process.cwd()}/`, "")}'`));
    }
}

// export Handlebars for easy access in helpers
HandlebarsPlugin.Handlebars = _Handlebars;

module.exports = HandlebarsPlugin;
