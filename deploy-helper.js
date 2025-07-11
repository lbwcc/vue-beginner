#!/usr/bin/env node

/**
 * 简化的聊天应用部署助手
 * 帮助用户一步步完成部署
 */

const readline = require('readline')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function colorLog(color, message) {
  console.log(color + message + colors.reset)
}

function showHeader() {
  console.clear()
  colorLog(colors.cyan, '='.repeat(60))
  colorLog(colors.bright + colors.green, '🚀 Vue 聊天应用部署助手')
  colorLog(colors.cyan, '='.repeat(60))
  console.log()
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function checkPrerequisites() {
  colorLog(colors.yellow, '📋 检查部署前置条件...')
  console.log()

  // 检查 Git
  try {
    await runCommand('git --version')
    colorLog(colors.green, '✅ Git 已安装')
  } catch (error) {
    colorLog(colors.red, '❌ Git 未安装，请先安装 Git')
    return false
  }

  // 检查 Node.js
  try {
    await runCommand('node --version')
    colorLog(colors.green, '✅ Node.js 已安装')
  } catch (error) {
    colorLog(colors.red, '❌ Node.js 未安装，请先安装 Node.js')
    return false
  }

  // 检查项目文件
  const requiredFiles = ['package.json', 'vercel.json', 'Procfile']
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      colorLog(colors.green, `✅ ${file} 存在`)
    } else {
      colorLog(colors.red, `❌ ${file} 不存在`)
      return false
    }
  }

  console.log()
  return true
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ')
    const process = spawn(cmd, args)
    
    let output = ''
    process.stdout?.on('data', (data) => {
      output += data.toString()
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(`Command failed: ${command}`))
      }
    })
  })
}

async function deployToVercel() {
  colorLog(colors.blue, '🔧 开始 Vercel 部署流程...')
  console.log()

  // 检查是否安装了 Vercel CLI
  try {
    await runCommand('vercel --version')
    colorLog(colors.green, '✅ Vercel CLI 已安装')
  } catch (error) {
    colorLog(colors.yellow, '📦 正在安装 Vercel CLI...')
    try {
      await runCommand('npm install -g vercel')
      colorLog(colors.green, '✅ Vercel CLI 安装成功')
    } catch (installError) {
      colorLog(colors.red, '❌ Vercel CLI 安装失败')
      return false
    }
  }

  console.log()
  colorLog(colors.yellow, '🔑 请登录 Vercel 账号...')
  console.log('1. 如果没有账号，请先到 https://vercel.com 注册')
  console.log('2. 建议使用 GitHub 账号登录')
  console.log()

  const loginChoice = await askQuestion('是否现在登录 Vercel？(y/n): ')
  if (loginChoice.toLowerCase() === 'y') {
    try {
      spawn('vercel', ['login'], { stdio: 'inherit' })
      await askQuestion('登录完成后按回车继续...')
    } catch (error) {
      colorLog(colors.red, '❌ 登录失败')
      return false
    }
  }

  console.log()
  colorLog(colors.yellow, '🚀 开始部署到 Vercel...')
  console.log('注意：首次部署时 Vercel 会询问项目配置，请选择：')
  console.log('- Set up and deploy: Yes')
  console.log('- Project name: 可以使用默认或自定义')
  console.log('- Directory: 直接回车（使用当前目录）')
  console.log()

  const deployChoice = await askQuestion('是否现在开始部署？(y/n): ')
  if (deployChoice.toLowerCase() === 'y') {
    try {
      spawn('vercel', ['--prod'], { stdio: 'inherit' })
      console.log()
      colorLog(colors.green, '🎉 Vercel 部署完成！')
      console.log()
      colorLog(colors.cyan, '📝 请记录 Vercel 提供的域名，下一步需要更新前端配置')
      return true
    } catch (error) {
      colorLog(colors.red, '❌ 部署失败')
      return false
    }
  }

  return false
}

async function deployToHeroku() {
  colorLog(colors.blue, '🔧 开始 Heroku 部署流程...')
  console.log()

  // 检查是否安装了 Heroku CLI
  try {
    await runCommand('heroku --version')
    colorLog(colors.green, '✅ Heroku CLI 已安装')
  } catch (error) {
    colorLog(colors.red, '❌ Heroku CLI 未安装')
    console.log('请先安装 Heroku CLI:')
    console.log('访问: https://devcenter.heroku.com/articles/heroku-cli')
    return false
  }

  console.log()
  colorLog(colors.yellow, '🔑 请登录 Heroku 账号...')
  
  const loginChoice = await askQuestion('是否现在登录 Heroku？(y/n): ')
  if (loginChoice.toLowerCase() === 'y') {
    try {
      spawn('heroku', ['login'], { stdio: 'inherit' })
      await askQuestion('登录完成后按回车继续...')
    } catch (error) {
      colorLog(colors.red, '❌ 登录失败')
      return false
    }
  }

  console.log()
  const appName = await askQuestion('请输入 Heroku 应用名称（只能包含小写字母、数字和破折号）: ')
  
  try {
    colorLog(colors.yellow, `🏗️  正在创建 Heroku 应用: ${appName}`)
    await runCommand(`heroku create ${appName}`)
    colorLog(colors.green, '✅ Heroku 应用创建成功')

    colorLog(colors.yellow, '📤 正在推送代码到 Heroku...')
    await runCommand('git add .')
    await runCommand('git commit -m "Deploy to Heroku"')
    await runCommand('git push heroku main')
    
    colorLog(colors.green, '🎉 Heroku 部署完成！')
    console.log()
    colorLog(colors.cyan, `📝 你的应用地址: https://${appName}.herokuapp.com`)
    return true
  } catch (error) {
    colorLog(colors.red, '❌ 部署失败: ' + error.message)
    return false
  }
}

async function updateFrontendConfig(serverUrl) {
  colorLog(colors.blue, '🔧 更新前端配置...')
  console.log()

  const chatVuePath = path.join(__dirname, 'src', 'views', 'Chat.vue')
  
  if (!fs.existsSync(chatVuePath)) {
    colorLog(colors.red, '❌ 找不到 Chat.vue 文件')
    return false
  }

  try {
    let content = fs.readFileSync(chatVuePath, 'utf8')
    
    // 替换 Socket.IO 连接地址
    const oldPattern = /socket\.value = io\('http:\/\/localhost:3001'/g
    const newPattern = `socket.value = io('${serverUrl}'`
    
    content = content.replace(oldPattern, newPattern)
    
    fs.writeFileSync(chatVuePath, content, 'utf8')
    
    colorLog(colors.green, '✅ 前端配置更新成功')
    console.log(`已将服务器地址更新为: ${serverUrl}`)
    return true
  } catch (error) {
    colorLog(colors.red, '❌ 更新前端配置失败: ' + error.message)
    return false
  }
}

async function deployToGitHubPages() {
  colorLog(colors.blue, '🔧 部署前端到 GitHub Pages...')
  console.log()

  try {
    colorLog(colors.yellow, '📦 正在构建项目...')
    await runCommand('npm run build')
    colorLog(colors.green, '✅ 项目构建成功')

    colorLog(colors.yellow, '📤 正在部署到 GitHub Pages...')
    await runCommand('npm run deploy')
    colorLog(colors.green, '✅ GitHub Pages 部署成功')

    console.log()
    colorLog(colors.cyan, '🎉 前端部署完成！')
    colorLog(colors.cyan, '访问地址: https://lbwcc.github.io/vue-beginner/')
    return true
  } catch (error) {
    colorLog(colors.red, '❌ 部署失败: ' + error.message)
    return false
  }
}

async function main() {
  try {
    showHeader()

    // 检查前置条件
    const prerequisitesOk = await checkPrerequisites()
    if (!prerequisitesOk) {
      colorLog(colors.red, '❌ 前置条件检查失败，请解决上述问题后重试')
      process.exit(1)
    }

    colorLog(colors.green, '✅ 前置条件检查通过')
    console.log()

    // 选择部署平台
    console.log('请选择聊天服务器部署平台:')
    console.log('1. Vercel (推荐，免费额度大)')
    console.log('2. Heroku (经典平台)')
    console.log()

    const platform = await askQuestion('请输入选择 (1 或 2): ')
    
    let serverUrl = ''
    let deploySuccess = false

    if (platform === '1') {
      deploySuccess = await deployToVercel()
      if (deploySuccess) {
        serverUrl = await askQuestion('请输入 Vercel 提供的域名 (如 https://your-app.vercel.app): ')
      }
    } else if (platform === '2') {
      deploySuccess = await deployToHeroku()
      if (deploySuccess) {
        const appName = await askQuestion('请输入你的 Heroku 应用名称: ')
        serverUrl = `https://${appName}.herokuapp.com`
      }
    } else {
      colorLog(colors.red, '❌ 无效选择')
      process.exit(1)
    }

    if (!deploySuccess) {
      colorLog(colors.red, '❌ 服务器部署失败')
      process.exit(1)
    }

    // 更新前端配置
    const configSuccess = await updateFrontendConfig(serverUrl)
    if (!configSuccess) {
      colorLog(colors.red, '❌ 前端配置更新失败')
      process.exit(1)
    }

    // 部署前端到 GitHub Pages
    const frontendSuccess = await deployToGitHubPages()
    if (!frontendSuccess) {
      colorLog(colors.red, '❌ 前端部署失败')
      process.exit(1)
    }

    // 部署完成
    console.log()
    colorLog(colors.bright + colors.green, '🎉 部署完成！')
    console.log()
    colorLog(colors.cyan, '📋 部署信息:')
    console.log(`   聊天服务器: ${serverUrl}`)
    console.log(`   前端应用: https://lbwcc.github.io/vue-beginner/`)
    console.log()
    colorLog(colors.yellow, '💡 提示:')
    console.log('   - 请等待几分钟让部署生效')
    console.log('   - 如有问题，请检查各平台的部署日志')
    console.log('   - 聊天功能需要两个服务都正常运行')

  } catch (error) {
    colorLog(colors.red, '❌ 部署过程中出现错误: ' + error.message)
  } finally {
    rl.close()
  }
}

// 运行部署助手
main().catch(console.error)
