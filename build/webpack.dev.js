const path = require('path');
const qiniuUploadPlugin = require('./plugins/qiniuUploadPlugin.js');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const config = {
    mode: 'development',
    entry: {
        index: path.resolve(__dirname, '../src/index.js')
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: "[name].[hash].bundle.js"
    },
    plugins: [
        new qiniuUploadPlugin({}),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname,'../src/index.html'),
            filename: 'index.html',
            title: '哈哈'
        })
    ]
}
module.exports = config