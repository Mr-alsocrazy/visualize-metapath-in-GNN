const { defineConfig } = require('@vue/cli-service')
const TerserPlugin = require("terser-webpack-plugin")

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  configureWebpack: {
    optimization: {
      minimize: false,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: true,//移除所有console相关代码；
              drop_debugger: true,//移除自动断点功能；
              pure_funcs: ["console.log", "console.error"],//配置移除指定的指令，如console.log,alert等
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        })
      ]
    }
  }
})
