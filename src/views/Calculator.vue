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

<script>
export default {
  data() {
    return {
      current: '0',
      prev: null,
      operator: null,
      waitingForOperand: false,
      error: false,
    };
  },
  computed: {
    displayValue() {
      if (this.error) return '错误';
      return this.current;
    },
  },
  methods: {
    inputNum(num) {
      if (this.error) return;
      if (this.waitingForOperand) {
        this.current = num;
        this.waitingForOperand = false;
      } else {
        if (this.current === '0') {
          this.current = num;
        } else {
          this.current += num;
        }
      }
    },
    inputDot() {
      if (this.error) return;
      if (this.waitingForOperand) {
        this.current = '0.';
        this.waitingForOperand = false;
        return;
      }
      if (!this.current.includes('.')) {
        this.current += '.';
      }
    },
    inputOperator(nextOperator) {
      if (this.error) return;
      const inputValue = parseFloat(this.current);
      if (this.operator && this.waitingForOperand) {
        this.operator = nextOperator;
        return;
      }
      if (this.prev == null) {
        this.prev = inputValue;
      } else if (this.operator) {
        const result = this.performCalc(this.prev, inputValue, this.operator);
        if (result === 'error') {
          this.error = true;
          this.current = '错误';
          return;
        }
        this.prev = result;
        this.current = String(result);
      }
      this.operator = nextOperator;
      this.waitingForOperand = true;
    },
    performCalc(a, b, op) {
      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? 'error' : a / b;
        default: return b;
      }
    },
    calculateResult() {
      if (this.error) return;
      if (this.operator && this.prev != null) {
        const inputValue = parseFloat(this.current);
        const result = this.performCalc(this.prev, inputValue, this.operator);
        if (result === 'error') {
          this.error = true;
          this.current = '错误';
          return;
        }
        this.current = String(result);
        this.prev = null;
        this.operator = null;
        this.waitingForOperand = false;
      }
    },
    clean() {
      this.current = '0';
      this.prev = null;
      this.operator = null;
      this.waitingForOperand = false;
      this.error = false;
    },
    backspace() {
      if (this.error) return;
      if (this.current.length > 1) {
        this.current = this.current.slice(0, -1);
      } else {
        this.current = '0';
      }
    },
    toggleSign() {
      if (this.error) return;
      if (this.current === '0') return;
      if (this.current.startsWith('-')) {
        this.current = this.current.slice(1);
      } else {
        this.current = '-' + this.current;
      }
    },
  },
};
</script>

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