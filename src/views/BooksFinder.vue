<script setup>
import { ref } from 'vue'
import { getBooksByISBN } from "@/api/booksApi"
import { ElMessage } from 'element-plus'

const isbn = ref("")
const booksInfo = ref([])
const searchType = ref("")

async function findBooks() {
  const res = await getBooksByISBN(isbn.value)
  const data = res.data
  const key = `ISBN:${isbn.value}`
  if (data && data[key]) {
    const book = data[key]
    ElMessage.success("请求成功！")
    booksInfo.value = [
      {
        pictures: book.cover ? book.cover.medium || book.cover.large || book.cover.small : '',
        bookName: book.title || '',
        author: book.authors && book.authors.length ? book.authors.map(a => a.name).join(', ') : '',
        isbn: isbn.value
      }
    ]
  } else {
    booksInfo.value = []
    ElMessage.warning("未找到相关图书信息")
  }
}
</script>

<template>
  <div>
    <H1>图书查询</H1>
    <el-input
      id="input"
      placeholder="请输入内容"
      v-model="isbn"
      class="input-with-select"
    >
      <template #prepend>
        <el-select v-model="searchType" placeholder="ISBN">
          <!-- <el-option label="作者名" value="AN"></el-option>
          <el-option label="书籍名" value="BN"></el-option> -->
        </el-select>
      </template>
      <template #append>
        <el-button
          @click="findBooks"
          icon="el-icon-search"
        ></el-button>
      </template>
    </el-input>
    <div id="list" v-if="booksInfo.length">
      <div v-for="item in booksInfo" :key="item.isbn">
          <img :src="item.pictures" class="image" />
          <div style="padding: 14px">
            <span>{{ item.bookName }}</span>
            <div class="bottom clearfix">
              <time class="author">{{ item.author }}</time>
            </div>
          </div>
      </div>
    </div>
    <div v-else> 暂无数据 </div>
  </div>
</template>

<style lang="less" scoped>
.el-input-group {
  width: 100%;
  max-width: 500px;
}
.el-select {
  width: 100px;
}
#list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
#list > div {
  width: 100%;
  max-width: 500px;
  box-sizing: border-box;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  display: flex;
  align-items: flex-start;
}
.image {
  width: 100px;
  height: auto;
  max-width: 30vw;
  object-fit: contain;
  border-radius: 4px;
  margin: 8px;
}
@media (max-width: 600px) {
  .el-input-group {
    width: 100%;
    max-width: 100vw;
  }
  #list > div {
    max-width: 100vw;
    flex-direction: column;
    align-items: center;
  }
  .image {
    max-width: 80vw;
    width: 80vw;
  }
}
</style>