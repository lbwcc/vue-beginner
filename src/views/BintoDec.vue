<template>
  <div class="bintodec">
    <el-input
      id="bin"
      class="input"
      v-model="bin"
      placeholder="请输入八位以内的二进制数"
      @input="wacthBin"
      maxlenght="8"
      @keyup.enter.native="bintodec"
    ></el-input>
    <el-button  @click="bintodec" type="primary">=></el-button>
    <el-input disabled v-model="dec"></el-input>
  </div>
</template>

<script>
import { isValidBinary } from "../utils/util";
export default {
  data() {
    return {
      bin: "",
      dec: "",
    };
  },
  methods: {
    bintodec() {
      this.dec = parseInt(this.bin, 2);
    },
    wacthBin() {
      if (!isValidBinary(this.bin)) {
        this.bin = this.bin.replace(/[^01]/g, "");
        return this.$message.warning("请输入二进制数");
      }
    },
  },
  computed:{
    
  }
};
</script>

<style lang="less" scoped>
.bintodec{
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}
/deep/.el-input__inner {
  width: 100%;
  box-sizing: border-box;
}
/deep/.el-button--primary{
  width: 100%;
  box-sizing: border-box;
}
@media (max-width: 600px) {
  .bintodec {
    max-width: 100%;
    padding: 0 8px;
  }
  /deep/.el-input__inner, /deep/.el-button--primary {
    font-size: 16px;
    height: 40px;
  }
}
</style>
