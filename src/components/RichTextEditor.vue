<template>
  <div class="rich-text-editor-wrapper">
    <div class="editor-toolbar" ref="toolbarRef"></div>
    <div class="editor-container">
      <div class="editor-main" ref="editorRef"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { createEditor, createToolbar } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  height: {
    type: String,
    default: '300px'
  }
})

const emit = defineEmits(['update:modelValue'])

const toolbarRef = ref(null)
const editorRef = ref(null)
let editor = null
let destroyed = false

onMounted(() => {
  destroyed = false
  const editorConfig = {
    placeholder: props.placeholder,
    maxLength: 5000,
    autoFocus: false,
    onChange: (editor) => {
      const html = editor.getHtml()
      emit('update:modelValue', html)
    }
  }

  editor = createEditor({
    selector: editorRef.value,
    config: editorConfig,
    mode: 'default'
  })

  const toolbarConfig = {
    toolbarKeys: [
      'bold',
      'underline',
      'italic',
      'color',
      'bgColor',
      '|',
      'headerSelect',
      'fontFamily',
      'fontSize',
      '|',
      'bulletedList',
      'numberedList',
      'indent',
      'delIndent',
      '|',
      'justifyLeft',
      'justifyRight',
      'justifyCenter',
      'justifyJustify',
      '|',
      'insertLink',
      'insertImage',
      '|',
      'blockquote',
      'lineHeight',
      'insertTable',
      '|',
      'undo',
      'redo'
    ]
  }

  createToolbar({
    editor,
    selector: toolbarRef.value,
    config: toolbarConfig,
    mode: 'default'
  })

  // 设置初始值
  if (props.modelValue) {
    editor.setHtml(props.modelValue)
  }
})

onBeforeUnmount(() => {
  destroyed = true
  if (editor) {
    editor.destroy()
    editor = null
  }
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (!editor || destroyed || newVal === undefined) {
      return
    }
    if (typeof editor.getHtml !== 'function' || typeof editor.setHtml !== 'function') {
      return
    }
      const currentHtml = editor.getHtml()
      if (currentHtml !== newVal) {
        editor.setHtml(newVal ?? '')
      }
  }
)
</script>

<style scoped>
.rich-text-editor-wrapper {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.editor-toolbar {
  border-bottom: 1px solid #ccc;
  background-color: #f9f9f9;
}

:deep(.w-e-toolbar) {
  border-bottom: none;
  background-color: transparent;
}

:deep(.w-e-toolbar-left) {
  padding: 5px;
}

:deep(.w-e-menu) {
  margin: 2px;
}

.editor-container {
  display: flex;
  flex-direction: column;
}

.editor-main {
  min-height: v-bind(height);
  overflow-y: auto;
  padding: 10px;
}

:deep(.w-e-text-container) {
  flex: 1;
}

:deep(.w-e-text) {
  padding: 10px;
  min-height: v-bind(height);
}

:deep(.w-e-image-container) {
  max-width: 100%;
}
</style>
