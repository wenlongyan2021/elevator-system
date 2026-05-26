/**
 * 微信小程序 CI 配置
 *
 * 使用方式：
 *   1. 在微信小程序管理后台 -> 开发 -> 开发设置 中生成上传密钥
 *   2. 下载 private key 文件
 *   3. 将密钥内容添加为 GitHub Secret: WECHAT_PRIVATE_KEY
 *   4. 将 AppID 添加为 GitHub Secret: WECHAT_APPID
 */
module.exports = {
  appid: process.env.WECHAT_APPID,
  projectPath: __dirname,
  privateKeyPath: process.env.WECHAT_PRIVATE_KEY_PATH,
  type: 'miniProgram',
  ignores: ['node_modules/**/*', '.git/**/*'],
}
