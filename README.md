# three.js

## 免费模型下载

https://sketchfab.com/

## 模型查看器

https://github.com/donmccurdy/three-gltf-viewer/tree/main

https://gltf-viewer.donmccurdy.com/

## 中文字体乱码

可以通过一些开源字体获得免费的中文字体，例如 Google Fonts 上的 Noto Sans SC，但通常它们并不直接提供`.json`格式。你需要自行转换这些字体为`three.js`所需的`.json`格式。

下面是一些步骤指南，以获得并转换 Noto Sans SC 字体：

1. **下载字体**:

   访问 [Google Fonts - Noto Sans SC](https://fonts.google.com/specimen/Noto+Sans+SC) ，下载所需的字体风格，通常为`.ttf`格式。

2. **转换字体**:

   使用 [facetype.js](http://gero3.github.io/facetype.js/) 将下载的`.ttf`文件转换为`.json`格式。上传你的`.ttf`文件并将生成的`.json`内容保存到本地。

3. **在`three.js`中使用字体**:

   与之前的步骤类似，使用`FontLoader`加载并使用新的`.json`字体文件。

记住，虽然这些字体是开源和免费的，但在商业项目中使用之前，最好还是查看其许可证条款，确保你有权这样使用。
