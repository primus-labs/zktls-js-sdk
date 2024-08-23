// webpack.config.js  
const webpack = require('webpack');  
  
module.exports = {  
  // 其他配置...  
  plugins: [  
    new webpack.DefinePlugin({  
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)  
    })  
  ]  
};