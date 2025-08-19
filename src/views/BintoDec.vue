<template>
  <div class="content">
    <button @click="$router.back()" class="back-btn">返回</button>
    <div class="bintodec">
      <el-input
        id="bin"
        v-model="bin"
        placeholder="二进制 (0/1)"
        @input="onBinInput"
      ></el-input>

      <el-input
        id="oct"
        v-model="oct"
        placeholder="八进制 (0-7)"
        @input="onOctInput"
      ></el-input>

      <el-input
        id="dec"
        v-model="dec"
        placeholder="十进制 (0-9)"
        @input="onDecInput"
      ></el-input>

      <el-input
        id="hex"
        v-model="hex"
        placeholder="十六进制 (0-9, A-F)"
        @input="onHexInput"
      ></el-input>

      <el-button @click="clearAll" type="warning">清空</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const bin = ref('')
const oct = ref('')
const dec = ref('')
const hex = ref('')

function clearAll() {
  bin.value = ''
  oct.value = ''
  dec.value = ''
  hex.value = ''
}

function toNumber(str, base) {
  if (!str || str === '') return null
  const n = parseInt(str, base)
  return Number.isNaN(n) ? null : n
}

function updateAllFromNumber(n) {
  if (n === null) {
    bin.value = oct.value = dec.value = hex.value = ''
    return
  }
  bin.value = n.toString(2)
  oct.value = n.toString(8)
  dec.value = String(n)
  hex.value = n.toString(16).toUpperCase()
}

function sanitize(str, pattern) {
  return str.replace(pattern, '')
}

function onBinInput() {
  // keep only 0/1
  bin.value = sanitize(bin.value, /[^01]/g)
  if (!bin.value) { updateAllFromNumber(null); return }
  const n = toNumber(bin.value, 2)
  if (n === null) { ElMessage.warning('无效的二进制数'); updateAllFromNumber(null); return }
  updateAllFromNumber(n)
}

function onOctInput() {
  oct.value = sanitize(oct.value, /[^0-7]/g)
  if (!oct.value) { updateAllFromNumber(null); return }
  const n = toNumber(oct.value, 8)
  if (n === null) { ElMessage.warning('无效的八进制数'); updateAllFromNumber(null); return }
  updateAllFromNumber(n)
}

function onDecInput() {
  dec.value = sanitize(dec.value, /[^0-9]/g)
  if (!dec.value) { updateAllFromNumber(null); return }
  const n = toNumber(dec.value, 10)
  if (n === null) { ElMessage.warning('无效的十进制数'); updateAllFromNumber(null); return }
  updateAllFromNumber(n)
}

function onHexInput() {
  // allow 0-9, a-f, A-F
  hex.value = hex.value.toUpperCase()
  hex.value = sanitize(hex.value, /[^0-9A-F]/g)
  if (!hex.value) { updateAllFromNumber(null); return }
  const n = toNumber(hex.value, 16)
  if (n === null) { ElMessage.warning('无效的十六进制数'); updateAllFromNumber(null); return }
  updateAllFromNumber(n)
}
</script>

<style lang="less" scoped>
.content {
  min-height: 98vh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}
.back-btn {
  margin: 16px;
  padding: 6px 18px;
  background: var(--button, #409eff);
  color: var(--button-text, #fff);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}
.back-btn:hover {
  background: var(--button-hover, #66b1ff);
}
.bintodec{
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 0;
}
.el-input__inner { width: 100%; box-sizing: border-box }
.el-button--warning { width: 100%; box-sizing: border-box }
.content {
  min-height: 98vh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}
.back-btn {
  margin: 16px;
  padding: 6px 18px;
  background: var(--button, #409eff);
  color: var(--button-text, #fff);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}
.back-btn:hover {
  background: var(--button-hover, #66b1ff);
}
.bintodec{
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}
.deep .el-input__inner {
  width: 100%;
  box-sizing: border-box;
}
.deep .el-button--primary{
  width: 100%;
  box-sizing: border-box;
}
@media (max-width: 600px) {
  .bintodec {
    max-width: 90%;
    padding: 0 8px;
  }
  .deep .el-input__inner, .deep .el-button--primary {
    font-size: 16px;
    height: 40px;
  }
}
</style>
