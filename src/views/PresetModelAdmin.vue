<template>
  <div class="preset-model-admin" v-reveal="{ y: 12, duration: 0.36 }">
    <el-card class="box-card" v-reveal="{ y: 12, duration: 0.32 }">
      <template #header>
        <div class="card-header">
          <span style="font-weight: bold;">预设模型管理</span>
          <el-button type="primary" @click="showCreateDialog">+ 新增预设模型</el-button>
        </div>
      </template>

      <!-- 预设模型表格 -->
      <el-table :data="presetModels" stripe style="width: 100%" v-reveal="{ y: 10, duration: 0.28, delay: 0.06 }">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="provider" label="平台" width="100" />
        <el-table-column prop="modelName" label="模型ID" width="150" />
        <el-table-column prop="displayName" label="显示名称" width="150" />
        <el-table-column prop="baseUrl" label="API 地址" width="280" show-overflow-tooltip />
        <el-table-column prop="supportsWebSearch" label="支持搜索" width="100">
          <template #default="{ row }">
            <span v-if="row.supportsWebSearch">✓ 支持</span>
            <span v-else>✗ 不支持</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除此预设模型？" @confirm="deleteModel(row.id)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑/新增对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑预设模型' : '新增预设模型'" width="600px" class="preset-dialog-motion">
      <el-form ref="formRef" :model="form" label-width="120px">
        <el-form-item label="平台" prop="provider" required>
          <el-input v-model.trim="form.provider" disabled />
        </el-form-item>
        <el-form-item label="模型ID" prop="modelName" required>
          <el-input v-model.trim="form.modelName" placeholder="e.g., gpt-4o, qwen-plus, deepseek-chat" />
        </el-form-item>
        <el-form-item label="显示名称" prop="displayName" required>
          <el-input v-model.trim="form.displayName" placeholder="e.g., GPT-4o, Qwen Plus" />
        </el-form-item>
        <el-form-item label="API 地址" prop="baseUrl" required>
          <el-input v-model.trim="form.baseUrl" placeholder="e.g., https://api.openai.com/v1" />
        </el-form-item>
        <el-form-item label="支持网页搜索">
          <el-switch v-model="form.supportsWebSearch" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model.trim="form.description" type="textarea" rows="3" placeholder="模型描述" />
        </el-form-item>
        <el-form-item label="排序顺序">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveModel">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPresetModels, getPresetModel, createPresetModel, updatePresetModel, deletePresetModel } from '@/api/forumApi'

const presetModels = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = ref({
  provider: 'deepseek',
  modelName: '',
  displayName: '',
  baseUrl: '',
  supportsWebSearch: 0,
  description: '',
  sortOrder: 0,
  status: 1
})

// 加载预设模型列表
const loadPresetModels = async () => {
  try {
    const res = await listPresetModels()
    if (res.data.code === 200) {
      presetModels.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '加载预设模型失败')
    }
  } catch (error) {
    ElMessage.error('加载预设模型失败：' + error.message)
  }
}

// 显示新增对话框
const showCreateDialog = () => {
  isEdit.value = false
  form.value = {
    provider: 'deepseek',
    modelName: '',
    displayName: '',
    baseUrl: 'https://api.deepseek.com/v1',
    supportsWebSearch: 0,
    description: '',
    sortOrder: 0,
    status: 1
  }
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = async (row) => {
  isEdit.value = true
  form.value = { ...row, provider: 'deepseek' }
  dialogVisible.value = true
}

// 保存模型
const saveModel = async () => {
  form.value.provider = 'deepseek'
  if (!form.value.modelName || !form.value.displayName || !form.value.baseUrl) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    let res
    if (isEdit.value) {
      res = await updatePresetModel(form.value.id, form.value)
    } else {
      res = await createPresetModel(form.value)
    }
    
    if (res.data.code === 0) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      await loadPresetModels()
    } else {
      ElMessage.error(res.data.msg || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  }
}

// 删除模型
const deleteModel = async (id) => {
  try {
    const res = await deletePresetModel(id)
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      await loadPresetModels()
    } else {
      ElMessage.error(res.data.msg || '删除失败')
    }
  } catch (error) {
    ElMessage.error('删除失败：' + error.message)
  }
}

// 页面挂载时加载数据
onMounted(() => {
  loadPresetModels()
})
</script>

<style scoped>
.preset-model-admin {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preset-dialog-motion :deep(.el-dialog) {
  transform-origin: 50% 12%;
  animation: preset-dialog-pop 0.24s cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes preset-dialog-pop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
