<script setup>
import { ref, computed } from 'vue'

const current = ref('0')
const prev = ref(null)
const operator = ref(null)
const waitingForOperand = ref(false)
const error = ref(false)

const displayValue = computed(() => {
  if (error.value) return '错误'
  return current.value
})

function inputNum(num) {
  if (error.value) return
  if (waitingForOperand.value) {
    current.value = num
    waitingForOperand.value = false
  } else {
    if (current.value === '0') {
      current.value = num
    } else {
      current.value += num
    }
  }
}
function inputDot() {
  if (error.value) return
  if (waitingForOperand.value) {
    current.value = '0.'
    waitingForOperand.value = false
    return
  }
  if (!current.value.includes('.')) {
    current.value += '.'
  }
}
function inputOperator(nextOperator) {
  if (error.value) return
  const inputValue = parseFloat(current.value)
  if (operator.value && waitingForOperand.value) {
    operator.value = nextOperator
    return
  }
  if (prev.value == null) {
    prev.value = inputValue
  } else if (operator.value) {
    const result = performCalc(prev.value, inputValue, operator.value)
    if (result === 'error') {
      error.value = true
      current.value = '错误'
      return
    }
    prev.value = result
    current.value = String(result)
  }
  operator.value = nextOperator
  waitingForOperand.value = true
}
function performCalc(a, b, op) {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b === 0 ? 'error' : a / b
    default: return b
  }
}
function calculateResult() {
  if (error.value) return
  if (operator.value && prev.value != null) {
    const inputValue = parseFloat(current.value)
    const result = performCalc(prev.value, inputValue, operator.value)
    if (result === 'error') {
      error.value = true
      current.value = '错误'
      return
    }
    current.value = String(result)
    prev.value = null
    operator.value = null
    waitingForOperand.value = false
  }
}
function clean() {
  current.value = '0'
  prev.value = null
  operator.value = null
  waitingForOperand.value = false
  error.value = false
}
function backspace() {
  if (error.value) return
  if (current.value.length > 1) {
    current.value = current.value.slice(0, -1)
  } else {
    current.value = '0'
  }
}
function toggleSign() {
  if (error.value) return
  if (current.value === '0') return
  if (current.value.startsWith('-')) {
    current.value = current.value.slice(1)
  } else {
    current.value = '-' + current.value
  }
}
</script>

<template>
  <div id="main">
    <div id="box">
      <div id="result">
        <div>{{ displayValue }}</div>
      </div>
      <div id="operation">
        <div class="line">
          <el-button class="operation" @click="clean" round> C </el-button>
          <el-button class="operation" @click="backspace" round> ⌫ </el-button>
          <el-button class="operation" @click="toggleSign" round> ± </el-button>
          <el-button class="operation"  @click="inputOperator('/')" round> ÷ </el-button>
        </div>
        <div class="line">
          <el-button class="number" @click="inputNum('7')" round> 7 </el-button>
          <el-button class="number" @click="inputNum('8')" round> 8 </el-button>
          <el-button class="number" @click="inputNum('9')" round> 9 </el-button>
          <el-button class="operation"  @click="inputOperator('*')" round> × </el-button>
        </div>
        <div class="line">
          <el-button class="number" @click="inputNum('4')" round> 4 </el-button>
          <el-button class="number" @click="inputNum('5')" round> 5 </el-button>
          <el-button class="number" @click="inputNum('6')" round> 6 </el-button>
          <el-button class="operation" @click="inputOperator('-')" round> - </el-button>
        </div>
        <div class="line">
          <el-button class="number" @click="inputNum('1')" round> 1 </el-button>
          <el-button class="number" @click="inputNum('2')" round> 2 </el-button>
          <el-button class="number" @click="inputNum('3')" round> 3 </el-button>
          <el-button class="operation" @click="inputOperator('+')" round> + </el-button>
        </div>
        <div class="line">
          <el-button class="number zero" @click="inputNum('0')" round> 0 </el-button>
          <el-button class="number" @click="inputDot" round> . </el-button>
          <el-button class="operation equal" @click="calculateResult" round> = </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
#main {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f6fa;
}
#box {
  border-radius: 24px;
  min-height: 400px;
  height: auto;
  width: 90%;
  max-width: 350px;
  background: #fff;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px 24px 16px;
  box-sizing: border-box;
}
#result {
  border-radius: 12px;
  margin-top: 0;
  width: 100%;
  height: 80px;
  background: #222831;
  color: #fff;
  font-size: 36px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px;
  box-sizing: border-box;
  margin-bottom: 24px;
  word-break: break-all;
}
#operation {
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  justify-content: space-between;
}
.line {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 16px;
}
.number {
  font-size: 22px;
  width: 64px;
  height: 56px;
  background-color: #393e46;
  color: #fff;
  border: none;
  margin: 0 4px;
}
.number.zero {
  flex: 2;
  width: 136px;
}
.operation {
  font-size: 22px;
  width: 64px;
  height: 56px;
  background-color: #eeeeee;
  color: #ff9800;
  border: none;
  margin: 0 4px;
}
.operation.equal {
  background-color: #ff9800;
  color: #fff;
}
.number:active, .operation:active {
  filter: brightness(0.85);
  transform: scale(0.96);
  transition: filter 0.1s, transform 0.1s;
}
@media (max-width: 400px) {
  #box {
    width: 90vw;
    min-width: 0;
    max-width: 100vw;
    height: auto;
    padding: 8px;
  }
  #result {
    font-size: 24px;
    height: 56px;
    padding: 8px;
  }
  .number, .operation {
    width: 48px;
    height: 40px;
    font-size: 16px;
  }
  .number.zero {
    width: 104px;
  }
}
@media (max-width: 600px) {
  #main {
    padding: 0;
  }
  #box {
    width: 90vw;
    min-width: 0;
    max-width: 100vw;
    height: auto;
    padding: 8px 2vw 16px 2vw;
    box-shadow: none;
    border-radius: 0;
  }
  #result {
    font-size: 22px;
    height: 48px;
    padding: 6px;
    margin-bottom: 12px;
  }
  .number, .operation {
    width: 20vw;
    min-width: 0;
    height: 36px;
    font-size: 15px;
    margin: 0 2px;
  }
  .number.zero {
    width: 44vw;
  }
  .line {
    margin-bottom: 8px;
  }
}
</style>