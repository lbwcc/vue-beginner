<template>
  <div class="rich-text-viewer">
    <!-- V2 格式：文本块 + 图片分段渲染，图片使用 el-image 支持缩略图和点击预览原图 -->
    <template v-if="v2Sections">
      <template v-for="(section, idx) in v2Sections" :key="idx">
        <div v-if="section.type === 'html'" class="rich-text-content" v-html="section.html" />
        <div v-else-if="section.type === 'image'" class="post-image-block">
          <el-image
            :src="section.thumbnailUrl"
            :preview-src-list="v2ImageUrls"
            :initial-index="section.imageIndex"
            preview-teleported
            fit="contain"
            style="max-width:100%; height:auto; display:block; margin:8px 0; cursor:pointer;"
          />
        </div>
      </template>
    </template>
    <!-- 非 V2 格式降级 -->
    <div v-else class="rich-text-content" v-html="sanitizedHtml" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElImage } from 'element-plus'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { parsePostMixedV2 } from '@/utils/postContent'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
  plainText: {
    type: Boolean,
    default: false,
  },
})

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 's', 'del', 'code', 'pre',
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'div', 'span',
  'img', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'sup', 'sub',
]

const ALLOWED_ATTR = ['href', 'target', 'src', 'alt', 'width', 'height', 'style', 'class']

const sanitizeHtml = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}

const escapeRawHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// V2 格式：分段，返回 {type:'html', html} | {type:'image', url, thumbnailUrl, imageIndex}
// 非 V2 返回 null
const v2Sections = computed(() => {
  if (!props.content || props.plainText) return null
  const content = String(props.content)
  const v2 = parsePostMixedV2(content)
  if (!v2) return null

  const sections = []
  if (v2.textBlocks.length) {
    const html = sanitizeHtml(v2.textBlocks.map(t => String(marked.parse(t))).join(''))
    if (html) sections.push({ type: 'html', html })
  }
  let imageIdx = 0
  for (const img of v2.imageItems) {
    sections.push({
      type: 'image',
      url: img.url,
      thumbnailUrl: img.thumbnailUrl || img.url,
      imageIndex: imageIdx++,
    })
  }
  return sections.length ? sections : null
})

// V2 格式所有原图 URL，供 el-image preview-src-list 使用
const v2ImageUrls = computed(() => {
  if (!v2Sections.value) return []
  return v2Sections.value.filter(s => s.type === 'image').map(s => s.url)
})

// 非 V2 降级渲染
const sanitizedHtml = computed(() => {
  if (!props.content) return ''

  const content = String(props.content)

  if (props.plainText) {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
  }

  if (parsePostMixedV2(content)) return '' // V2 由 v2Sections 处理

  const rendered = String(marked.parse(escapeRawHtml(content)))
  return sanitizeHtml(rendered)
})
</script>

<style scoped>
.rich-text-viewer {
  width: 100%;
}

:deep(.rich-text-content) {
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  line-height: 1.6;
  color: inherit;
}

:deep(.rich-text-content p) {
  margin: 0.5em 0;
}

:deep(.rich-text-content h1),
:deep(.rich-text-content h2),
:deep(.rich-text-content h3),
:deep(.rich-text-content h4),
:deep(.rich-text-content h5),
:deep(.rich-text-content h6) {
  margin: 0.8em 0 0.4em 0;
  font-weight: bold;
}

:deep(.rich-text-content h1) {
  font-size: 2em;
}

:deep(.rich-text-content h2) {
  font-size: 1.6em;
}

:deep(.rich-text-content h3) {
  font-size: 1.3em;
}

:deep(.rich-text-content ul),
:deep(.rich-text-content ol) {
  margin: 0.5em 0;
  padding-left: 2em;
}

:deep(.rich-text-content li) {
  margin: 0.3em 0;
}

:deep(.rich-text-content blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin: 0.5em 0;
  color: #666;
}

:deep(.rich-text-content code) {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

:deep(.rich-text-content pre) {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 3px;
  overflow-x: auto;
  margin: 0.5em 0;
}

:deep(.rich-text-content img) {
  max-width: 100%;
  height: auto;
  margin: 0.5em 0;
}

:deep(.rich-text-content a) {
  color: #409eff;
  text-decoration: none;
}

:deep(.rich-text-content a:hover) {
  text-decoration: underline;
}

:deep(.rich-text-content table) {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
  border: 1px solid #ddd;
}

:deep(.rich-text-content th) {
  border: 1px solid #ddd;
  padding: 0.5em;
  background-color: #f5f5f5;
  font-weight: bold;
}

:deep(.rich-text-content td) {
  border: 1px solid #ddd;
  padding: 0.5em;
}
</style>
