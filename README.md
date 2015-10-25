## Usage

In your webpack config register and setup the handlebars plugin

```javascript
var HandlebarsPlugin = require("handlebars-webpack-plugin");

var webpackConfig = {

    plugins: [

        new HandlebarsPlugin({

            // path to main hbs template
            entry: path.join(process.cwd(), "app", "src", "index.hbs"),
            // filepath to result
            output: path.join(process.cwd(), "build", "index.html"),
            // data passed to main hbs template: `main-template(data)`
            data: require("./app/data/data.json"),

            // globbed path to partials
            partials: [
                 path.join(process.cwd(), "app", "src", "components", "*", "*.hbs")
            ],

            // register custom helpers
            helpers: {
                nameOfHbsHelper: Function.prototype
            },

            // hooks
            onBeforeSetup: function (Handlebars) {},
            onBeforeAddPartials: function (Handlebars, partialsMap) {},
            onBeforeCompile: function (Handlebars, templateContent) {},
            onBeforeRender: function (Handlebars, data) {},
            onBeforeSave: function (Handlebars, resultHtml) {},
            onDone: function (Handlebars) {}
        })
    ]
}
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

