<h1 align="center"><img src="./docs/hbs-wp-plugin.png" width="276" alt="handlebars webpack plugin"></h1>

> Server-side template rendering using [Handlebars](http://handlebarsjs.com/).


`npm install handlebars-webpack-plugin --save-dev`


## Usage

In your webpack config register and setup the handlebars plugin

```javascript
const path = require("path");
const HandlebarsPlugin = require("handlebars-webpack-plugin");

const webpackConfig = {

  plugins: [

    new HandlebarsPlugin({
      // path to hbs entry file(s). Also supports nested directories if write path.join(process.cwd(), "app", "src", "**", "*.hbs"),
      entry: path.join(process.cwd(), "app", "src", "*.hbs"),
      // output path and filename(s). This should lie within the webpacks output-folder
      // if ommited, the input filepath stripped of its extension will be used
      output: path.join(process.cwd(), "build", "[name].html"),
      // you can also add a [path] variable, which will emit the files with their relative path, like
      // output: path.join(process.cwd(), "build", [path], "[name].html"),
      
      // data passed to main hbs template: `main-template(data)`
      data: require("./app/data/project.json"),
      // or add it as filepath to rebuild data on change using webpack-dev-server
      data: path.join(__dirname, "app/data/project.json"),

      // globbed path to partials, where folder/filename is unique
      partials: [
        path.join(process.cwd(), "app", "src", "components", "*", "*.hbs")
      ],

      // register custom helpers. May be either a function or a glob-pattern
      helpers: {
        nameOfHbsHelper: Function.prototype,
        projectHelpers: path.join(process.cwd(), "app", "helpers", "*.helper.js")
      },

      // hooks
      // getTargetFilepath: function (filepath, outputTemplate) {},
      // getPartialId: function (filePath) {}
      onBeforeSetup: function (Handlebars) {},
      onBeforeAddPartials: function (Handlebars, partialsMap) {},
      onBeforeCompile: function (Handlebars, templateContent) {},
      onBeforeRender: function (Handlebars, data, filename) {},
      onBeforeSave: function (Handlebars, resultHtml, filename) {},
      onDone: function (Handlebars, filename) {}
    })
  ]
};
```

Partial ids are registered by `parentFolder/filename` (without file extensions)

Use handlebars in your main and partials like, i.e.

```hbs
<body>
  {{> partialFolder/partialName}}

  {{> header/header title="page title"}}

  {{> partial/content}}
</body>
```


## Options

### target filepaths

Per default, the generated filepath of the html-results is defined by the `output`-property in the plugin-options. To changed the output folder and name, you can pass your custom filepath-helper to the plugin-options like

```javascript
{
    /**
     * Modify the default output path of each entry-template
     * @param {String} filepath     - the source of the template
     * @param {String} outputTemplate - the filepath template defined in `output`
     * @param {String} rootFolder   - the filepaths rootFolder
     * @return {String} final path, where the rendered html-file should be saved
     */
    getTargetFilepath: function getTargetFilepath(filepath, outputTemplate, rootFolder) {
        const fileName = path.basename(filepath).replace(path.extname(filepath), "");
        return outputTemplate.replace("[name]", fileName);
    };
}
```

You can find the default implementation in [utils/getTargetFilepath](./utils/getTargetFilepath.js).


### partial ids

Per default, partials are identified with `folder/filename` in a hbs-template. e.g. a file in `app/partials/page/header.hbs` will be registered under `page/header` and can be included with

```hbs
{{> page/header title="page title"}}
```

To change the partial's id you can pass a custom partial-generator to the plugin-options like

```javascript
{
    /**
     * Modify the hbs partial-id created for a loaded partial
     * @param {String} filePath   - filePath to the loaded partial
     * @return {String} hbs-partialId, per default folder/partialName is used
     */
    getPartialId: function (filePath) {
        return filePath.match(/\/([^/]+\/[^/]+)\.[^.]+$/).pop();
    }
}
```



### Html Webpack Plugin

> Use the [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) to generate partials, that are
> dynamically registered to the handlebars-webpack-plugin

- the `HtmlWebpackPlugin` should be placed before the HandlebarsWebpackPlugin
- multiple HtmlWebpackPlugins may be used
- per default, the partials get registered to `html/<outputfilename>`, i.e. a filename `/dist/partials/head.hbs` will be registered as `html/head` to handlebars


```js
plugins: [
   new HtmlWebpackPlugin({
    title: "Generic Head Title",
    // the template you want to use
    template: path.join(__dirname, "src", "generatedpartial", "head.hbs"),
    // the output file name
    filename: path.join(__dirname, "dist", "partials", "head.hbs"),
    inject: "head"
  }),

  new HandlebarsWebpackPlugin({

    htmlWebpackPlugin: {
      enabled: true, // register all partials from html-webpack-plugin, defaults to `false`
      prefix: "html", // where to look for htmlWebpackPlugin output. default is "html"
      HtmlWebpackPlugin // optionally: pass in HtmlWebpackPlugin if it cannot be resolved
    },

    entry: path.join(process.cwd(), "src", "hbs", "*.hbs"),
    output: path.join(process.cwd(), "dist", "[name].html"),

    partials: [
      path.join(process.cwd(), "html",/* <-- this should match htmlWebpackPlugin.prefix */ "*", "*.hbs"),
      path.join(process.cwd(), "src", "hbs", "*", "*.hbs")
    ]
  })
]
```


## Utilities

### Merging input-data

In case you have several json-files that need to be passed to handlebars-compilation, you can build this within your webpack-configuration file. A simple helper can be found in [utils/mergeJSON.js](./utils/mergeJSON.js), 
which finds all json files and build a dataObject with `{ <filename>: <data> }`. Example:

```js
const mergeJSON = require('handlebars-webpack-plugin/utils/mergeJSON');
const projectData = mergeJSON(path.join(__dirname, "data/**/*.json"));
// ...
new HandlebarsPlugin({
    // ...
    data: projectData
});
```

For custom merge behaviour you can add your own merge-helper, following the implementation from [utils/mergeJSON.js](./utils/mergeJSON.js).


## Contributors

<a href="https://github.com/TheReincarnator">
    <img width="80" height="80" style="max-width:100%;"
        title="TheReincarnator" src="https://avatars0.githubusercontent.com/u/840370?s=460&v=4">
</a>

<a href="https://github.com/muuki88">
    <img width="80" height="80" style="max-width:100%;"
        title="muuki88" src="https://avatars2.githubusercontent.com/u/647727?s=460&v=4">
</a>

<a href="https://github.com/emilchristensen">
    <img width="80" height="80" style="max-width:100%;"
        title="emilchristensen" src="https://avatars3.githubusercontent.com/u/575486?s=460&v=4">
</a>

<a href="https://github.com/alisonailea">
    <img width="80" height="80" style="max-width:100%;"
        title="alisonailea" src="https://avatars2.githubusercontent.com/u/3362490?s=460&v=4">
</a>

<a href="https://github.com/vredondoGL">
    <img width="80" height="80" style="max-width:100%;"
        title="vredondoGL" src="https://avatars3.githubusercontent.com/u/35344609?s=460&v=4">
</a>

<a href="https://github.com/mkungla">
    <img width="80" height="80" style="max-width:100%;"
        title="mkungla" src="https://avatars2.githubusercontent.com/u/15878458?s=460&v=4">
</a>

<a href="https://github.com/bywo">
    <img width="80" height="80" style="max-width:100%;"
        title="bywo" src="https://avatars2.githubusercontent.com/u/1434481?s=460&v=4">
</a>

<a href="https://github.com/baldurh">
    <img width="80" height="80" style="max-width:100%;"
        title="baldurh" src="https://avatars3.githubusercontent.com/u/1823617?s=460&v=4">
</a>

<a href="https://github.com/DannyDelott">
    <img width="80" height="80" style="max-width:100%;"
        title="DannyDelott" src="https://avatars3.githubusercontent.com/u/4524175?s=460&v=4">
</a>

<a href="https://github.com/amandabouveng">
    <img width="80" height="80" style="max-width:100%;"
        title="amandabouveng" src="https://avatars2.githubusercontent.com/u/15197360?s=460&v=4">
</a>

<a href="https://github.com/patrikniebur">
    <img width="80" height="80" style="max-width:100%;"
        title="patrikniebur" src="https://avatars0.githubusercontent.com/u/6452693?s=460&v=4">
</a>

<a href="https://github.com/mitchheddles">
    <img width="80" height="80" style="max-width:100%;"
        title="mitchheddles" src="https://avatars2.githubusercontent.com/u/20656128?s=460&v=4">
</a>

<a href="https://github.com/maratfakhreev">
    <img width="80" height="80" style="max-width:100%;"
        title="maratfakhreev" src="https://avatars0.githubusercontent.com/u/1300497?s=400&v=4">
</a>

<a href="https://github.com/DKvistgaard">
    <img width="80" height="80" style="max-width:100%;"
        title="DKvistgaard" src="https://avatars1.githubusercontent.com/u/1705203?s=460&v=4">
</a>

<a href="https://github.com/raypatterson">
    <img width="80" height="80" style="max-width:100%;"
        title="raypatterson" src="https://avatars1.githubusercontent.com/u/1051626?s=460&v=4">
</a>

<a href="https://github.com/queenvictoria">
    <img width="80" height="80" style="max-width:100%;"
        title="queenvictoria" src="https://avatars1.githubusercontent.com/u/694770?s=460&v=4">
</a>

<a href="https://github.com/abachi">
    <img width="80" height="80" style="max-width:100%;"
        title="abachi" src="https://avatars1.githubusercontent.com/u/12300606?s=460&v=4">
</a>

<a href="https://github.com/rustyy">
    <img width="80" height="80" style="max-width:100%;"
        title="rustyy" src="https://avatars2.githubusercontent.com/u/1225568?s=460&v=4">
</a>

<a href="https://github.com/JeremyTCD">
    <img width="80" height="80" style="max-width:100%;"
        title="JeremyTCD" src="https://avatars0.githubusercontent.com/u/11733898?s=400&u=3494b06385965675883fa2f1efe03fc4eb8aa5bb&v=4">
</a>


