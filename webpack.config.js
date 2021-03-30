const path = require('path')

module.exports = {
  target: 'webworker',
  entry: path.resolve(__dirname, 'src', 'index.js'),
  // necessary for cloudflare worker to be secure since dev mode uses eval()
  mode: 'production',
  devtool: 'none',
}
