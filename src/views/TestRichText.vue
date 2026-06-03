<template>
  <AppShell title="富文本测试" eyebrow="" subtitle="" active-section="forum">
    <div class="test-container" v-reveal="{ y: 12, duration: 0.36 }">
      <h2 v-reveal="{ y: 10, duration: 0.3 }">混合格式 (Markdown + 图片)</h2>
      <div class="test-card" v-reveal="{ y: 12, duration: 0.32, scroll: true, start: 'top 95%' }">
        <h3>测试内容 1：电影推荐</h3>
        <RichTextViewer :content="movieContent" />
      </div>

      <div class="test-card" v-reveal="{ y: 12, duration: 0.32, scroll: true, start: 'top 95%' }">
        <h3>测试内容 2：简单 Markdown</h3>
        <RichTextViewer :content="simpleMarkdownContent" />
      </div>

      <div class="test-card" v-reveal="{ y: 12, duration: 0.32, scroll: true, start: 'top 95%' }">
        <h3>测试内容 3：纯 HTML</h3>
        <RichTextViewer :content="htmlContent" />
      </div>

      <div class="test-card" v-reveal="{ y: 12, duration: 0.32, scroll: true, start: 'top 95%' }">
        <h3>测试内容 4：纯文本</h3>
        <RichTextViewer :content="plainTextContent" />
      </div>
    </div>
  </AppShell>
</template>

<script setup>
import AppShell from '@/components/AppShell.vue'
import RichTextViewer from '@/components/RichTextViewer.vue'

// 电影推荐内容（用户提供的格式）
const movieContent = `#POST_MIXED_V2#[
{"type":"image","url":"https://image.tmdb.org/t/p/original/9cjIGRQL1m4E87ErKTuXx1J7k2G.jpg","width":"100%"},
{"type":"text","content":"## 电影信息\n\n- **片名**：肖申克的救赎（The Shawshank Redemption）\n- **导演**：弗兰克·德拉邦特\n- **上映年份**：1994年\n- **片长**：142分钟\n- **类型**：剧情 / 犯罪\n\n---\n\n## 剧情梗概（无剧透）\n\n20世纪40年代末，银行家安迪·杜弗兰因被指控枪杀妻子及其情人，被判终身监禁，关进了缅因州的肖申克监狱。在这个充满暴力与腐败的钢铁牢笼中，安迪结识了在监狱里混迹多年的老囚犯瑞德。安迪凭借自己的金融知识在监狱中站稳了脚跟，但他内心深处从未放弃对自由的渴望……\n\n---\n\n## 为什么值得一看\n\n- **IMDb Top 250 排名第1**——自2008年以来长期占据榜首，被誉为史上最伟大的电影\n- **奥斯卡金像奖7项提名**（最佳影片、最佳男主等）\n- **豆瓣评分9.7**，位居豆瓣电影 Top 250 第1名\n- 激励了全球无数观众，被誉为「男人必看的电影」\n- 关于希望、友谊与救赎的永恒经典"}
]`

// 简单的 Markdown 内容
const simpleMarkdownContent = `#POST_MIXED_V2#[
{"type":"text","content":"# 欢迎使用富文本编辑器\n\n## 主要特性\n\n1. **支持 Markdown**\n2. 支持图片展示\n3. 自动渲染格式化内容\n4. XSS 防护\n\n### 代码示例\n\n\`\`\`javascript\nconst hello = () => {\n  console.log('Hello, World!');\n};\n\`\`\`\n\n### 列表示例\n\n- 项目 1\n- 项目 2\n- 项目 3\n\n> 引用内容：这是一条引用，可以用来突出重要信息。"}
]`

// 纯 HTML 内容
const htmlContent = `<h2>HTML 格式内容</h2>
<p>这是一段 <strong>HTML 格式</strong>的内容。</p>
<ul>
  <li>支持列表</li>
  <li>支持链接</li>
  <li>支持图片</li>
</ul>
<p><a href="https://example.com">点击这里</a></p>`

// 纯文本内容
const plainTextContent = '这是一段纯文本内容，没有任何格式标记。\n\n支持换行显示。'
</script>

<style scoped>
.test-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.test-card {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.test-card h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #409eff;
  padding-bottom: 10px;
}
</style>
