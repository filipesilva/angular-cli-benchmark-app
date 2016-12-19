# angular-cli-benchmark-app

This app is meant to serve as a barebones benchmark against which to compare Angular-CLI.

There is a node that accepts flags to create a webpack configuration.

Examples:
```
npm start # builds the project
npm start -- --serve # serves the project on http://localhost:4200
```

Available flags:
- `--serve` serves using `webpack-dev-server` instead of build
- `--sourcemap` adds `devtool: 'sourcemap'`
- `--vendor-chunk` adds a vendor chunk