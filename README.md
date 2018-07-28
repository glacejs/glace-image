[![Build Status](https://travis-ci.org/glacejs/glace-image.svg?branch=master)](https://travis-ci.org/glacejs/glace-image)
 | [Source Code](https://github.com/glacejs/glace-image)
 | [Release Notes](tutorial-release-notes.html)

## GlaceJS Image plugin

Provides steps for [GlaceJS](https://glacejs.github.io/glace-core/) framework to process images and screenshots.

## Features

- Image capture via [selenium](http://webdriver.io/api/protocol/screenshot.html)
- Image capture via [html2canvas](https://html2canvas.hertzen.com/)
- Image capture via [system](https://github.com/schipiga/node-desktop-screenshot) screenshot
- Images comparision mechanism via [pixelmatch](https://www.npmjs.com/package/pixelmatch)
- Search image inside image via own [pixel-by-pixel](https://github.com/glacejs/glace-image/blob/master/lib/image.js) algorithm

## How to install

```
npm i glace-image
```

## How to use

```javascript
var glaceImage = require("glace-image");
glaceImage.Steps;
glaceImage.config;
```

If plugin is used as a part of `GlaceJS` it will be loaded automatically.

## API

- [config](GlaceConfig.html)
- [steps](ImageSteps.html)

## Test examples

See [integration tests](https://github.com/glacejs/glace-js/blob/master/tests/e2e/testImage.js) in order to explore examples.

## Tests and quality

- Project tests report is <a href="allure-report/index.html" target="_blank">here</a>
- Code coverage report is <a href="tests-cover/lcov-report/index.html" target="_blank">here</a>
