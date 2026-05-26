/**
 * 微信小程序 CI 上传脚本
 *
 * 使用 miniprogram-ci 自动上传小程序代码到微信平台。
 * 运行前需要在 GitHub Secrets 中配置：
 *   WECHAT_APPID      - 小程序 AppID
 *   WECHAT_PRIVATE_KEY - 上传密钥文件内容（从微信管理后台生成）
 */
const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')

const appid = process.env.WECHAT_APPID
const privateKeyPath = process.env.WECHAT_PRIVATE_KEY_PATH
const version = process.env.VERSION
const desc = process.env.DESC || '自动部署'

if (!appid) {
  console.error('❌ 缺少 WECHAT_APPID 环境变量')
  process.exit(1)
}
if (!privateKeyPath || !fs.existsSync(privateKeyPath)) {
  console.error('❌ 缺少上传密钥文件')
  process.exit(1)
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: path.join(__dirname, '../../miniprogram'),
  privateKeyPath,
  ignores: ['node_modules/**/*', '.git/**/*'],
})

async function main() {
  console.log(`📦 上传小程序: ${appid}`)
  console.log(`📌 版本: ${version}`)
  console.log(`📝 描述: ${desc}`)

  const uploadResult = await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      es7: true,
      minify: true,
      autoPrefixWXSS: true,
    },
    onProgressUpdate(progress) {
      if (progress.status === ' uploading') {
        process.stdout.write('.')
      }
    },
  })

  console.log('')
  console.log('✅ 上传成功!')
  console.log(`   子包信息: ${JSON.stringify(uploadResult.subPackageInfo)}`)
}

main().catch((err) => {
  console.error('❌ 上传失败:', err.message)
  process.exit(1)
})
