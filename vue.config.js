module.exports = {
    publicPath: process.env.NODE_ENV === 'production' ? '/lbwcc.github.io/vue-beginner/' : '/',
    devServer: {
        // 仅本地开发环境有效，生产环境（如 GitHub Pages）不会生效
        // 部署后请直接在前端请求 openlibrary.org 的 API，不要用 /findBooks 代理路径
        host: 'localhost',
        port: 8080,
        open: false,
        webSocketServer: false,
        proxy: {
            '/findBooks': {
                target: 'https://openlibrary.org',
                pathRewrite: { '^/findBooks': '/api/books' },
                changeOrigin: true,
            }
        }
    }
}