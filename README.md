<h1 align="center"><img src="./docs/hbs-wp-plugin.png" width="276" alt="handlebars webpack plugin"></h1>

> Server-side template rendering using [Handlebars](http://handlebarsjs.com/).


`npm install handlebars-webpack-plugin --save-dev`


## Usage

In your webpack config register and setup the handlebars plugin

```javascript
var path = require("path");
var HandlebarsPlugin = require("handlebars-webpack-plugin");

var webpackConfig = {

    plugins: [

        new HandlebarsPlugin({
            // path to hbs entry file(s)
            entry: path.join(process.cwd(), "app", "src", "*.hbs"),
            // output path and filename(s). This should lie within the webpacks output-folder
            // if ommited, the input filepath stripped of its extension will be used
            output: path.join(process.cwd(), "build", "[name].html"),
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
            onBeforeSetup: function (Handlebars) {},
            onBeforeAddPartials: function (Handlebars, partialsMap) {},
            onBeforeCompile: function (Handlebars, templateContent) {},
            onBeforeRender: function (Handlebars, data) {},
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

## Html Webpack Plugin

You can use this plugin to generate a `head.hbs` with the [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin)
and use this partial as an input for other handlebar templates.

```js
plugins: [
   new HtmlWebpackPlugin({
      title: 'Generic Head Title',
      // the output file name
      filename: path.join(__dirname, 'dist', 'partials', 'head.hbs'),
      // the head template you want to use
      template: path.join(__dirname, 'src', 'hbs', 'partials_generate', 'head.hbs'),
      inject: 'head'
    }),
    new HandlebarsPlugin({
      htmlWebpackPlugin: {
          /* options */
          // prefix: 'html' // default is 'html'
      },
      // path to hbs entry file(s)
      entry: path.join(process.cwd(), 'src', 'hbs', 'site', '*.hbs'),
      // output path and filename(s). This should lie within the webpacks output-folder
      // if ommited, the input filepath stripped of its extension will be used
      // data passed to main hbs template: `main-template(data)`
      output: path.join(process.cwd(), 'dist', "[name].html"),

      partials: [
          // the dist folder where the generated hbs file can be found
          path.join(process.cwd(), 'dist', '*', '*.hbs'),
          // other partials
          path.join(process.cwd(), 'src', 'hbs', '*', '*.hbs')
      ]
  })
]
```
