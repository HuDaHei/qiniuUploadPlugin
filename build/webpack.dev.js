const path = require('path');
const {CleanWebpackPlugin}  = require('clean-webpack-plugin');
const nodeExternals = require('webpack-node-externals')
const config = {
    mode: 'production',
    target: 'node',
    entry: {
        index: path.resolve(__dirname, '../src/index.js')
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'index.js',
        libraryTarget: 'commonjs2',
    },
    externals: [
        nodeExternals()
    ],
    plugins: [
        new CleanWebpackPlugin(),
    ]
}
module.exports = config