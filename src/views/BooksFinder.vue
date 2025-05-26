<script setup>
import { ref } from 'vue'
import { getBooksByISBN } from "@/api/booksApi"
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const isbn = ref("")
const booksInfo = ref([])
const searchType = ref("")

async function findBooks() {
  // mock 数据（仅在网络异常时使用）
  const mockData = {
    [`ISBN:${isbn.value}`]: {
      url: "https://openlibrary.org/books/OL36627342M/恋爱中的女人",
      title: "恋爱中的女人",
      subtitle: "Women in Love",
      authors: [{ name: "D. H. Lawrence" }],
      publishers: [{ name: "Zhong yang bian yi chu ban she" }],
      publish_places: [{ name: "Bei jing" }],
      publish_date: "2010",
      subjects: [
        { name: "Romance", url: "https://openlibrary.org/subjects/romance" },
        { name: "Classic Literature", url: "https://openlibrary.org/subjects/classic_literature" }
      ],
      links: [
        { title: "Gutenberg e-text", url: "http://www.gutenberg.org/ebooks/4240" }
      ],
      cover: {
        medium: "https://covers.openlibrary.org/b/id/14316199-M.jpg"
      }
    }
  }
  let data, book
  try {
    const res = await getBooksByISBN(isbn.value)
    data = res.data
    const key = `ISBN:${isbn.value}`
    book = data[key]
    if (!book) throw new Error('no data')
    ElMessage.success("请求成功！")
  } catch (e) {
    // 网络异常或无数据时用 mock
    data = mockData
    book = data[`ISBN:${isbn.value}`]
    ElMessage.warning("使用mock数据")
  }
  if (book) {
    booksInfo.value = [
      {
        pictures: book.cover ? book.cover.medium : '',
        bookName: book.title || '',
        subtitle: book.subtitle || '',
        author: book.authors && book.authors.length ? book.authors.map(a => a.name).join(', ') : '',
        publisher: book.publishers && book.publishers.length ? book.publishers.map(p => p.name).join(', ') : '',
        publishPlace: book.publish_places && book.publish_places.length ? book.publish_places.map(p => p.name).join(', ') : '',
        publishDate: book.publish_date || '',
        subjects: book.subjects || [],
        links: book.links || [],
        openUrl: book.url || '',
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
  <div class="content">
    <button @click="$router.back()" class="back-btn">返回</button>
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
          :icon="Search"
        ></el-button>
      </template>
    </el-input>
    <div id="list" v-if="booksInfo.length">
      <div v-for="item in booksInfo" :key="item.isbn">
        <img :src="item.pictures" class="image" />
        <div style="padding: 14px; flex: 1;">
          <span style="font-size: 1.2em; font-weight: bold;">{{ item.bookName }}</span>
          <template v-if="item.subtitle">
            <div style="color: #888; font-size: 1em; margin-bottom: 4px;">{{ item.subtitle }}</div>
          </template>
          <div class="bottom clearfix">
            <time class="author">作者：{{ item.author }}</time>
          </div>
          <div v-if="item.publisher || item.publishPlace || item.publishDate" style="margin: 4px 0; color: #666; font-size: 0.95em;">
            <span v-if="item.publisher">出版社：{{ item.publisher }}</span>
            <span v-if="item.publishPlace" style="margin-left: 8px;">出版地：{{ item.publishPlace }}</span>
            <span v-if="item.publishDate" style="margin-left: 8px;">出版时间：{{ item.publishDate }}</span>
          </div>
          <div v-if="item.subjects && item.subjects.length" style="margin: 4px 0; font-size: 0.95em;">
            主题：
            <span v-for="(sub, idx) in item.subjects" :key="sub.name">
              <a :href="sub.url" target="_blank" style="color: #409eff; text-decoration: underline;">{{ sub.name }}</a><span v-if="idx < item.subjects.length - 1">, </span>
            </span>
          </div>
          <div v-if="item.links && item.links.length" style="margin: 4px 0; font-size: 0.95em;">
            相关链接：
            <span v-for="(link, idx) in item.links" :key="link.url">
              <a :href="link.url" target="_blank" style="color: #67c23a; text-decoration: underline;">{{ link.title }}</a><span v-if="idx < item.links.length - 1">, </span>
            </span>
          </div>
          <div v-if="item.openUrl" style="margin: 4px 0;">
            <a :href="item.openUrl" target="_blank" style="color: #e67e22; font-weight: bold;">查看详情 &gt;&gt;</a>
          </div>
        </div>
      </div>
    </div>
    <div v-else> 暂无数据 </div>
  </div>
</template>

<style lang="less" scoped>
.content{
  min-height: 98vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  overflow-x: hidden; /* 禁止左右滚动 */
}
.el-input-group {
  width: 100%;
  max-width: 500px;
  margin: 24px auto 32px auto;
  box-shadow: 0 2px 8px rgba(64,158,255,0.08);
  border-radius: 8px;
  background: #fff;
  padding: 12px 18px 12px 0;
  display: flex;
  align-items: center;
}
.el-input {
  font-size: 1.15em;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(64,158,255,0.06);
  border: 1.5px solid #d9ecff;
  background: #f4faff;
  transition: border 0.2s, box-shadow 0.2s;
  min-height: 48px;
  padding: 0 14px;
  color: #222;
}
.el-input:focus-within {
  border: 2px solid #409eff;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(64,158,255,0.12);
}
.el-input input::placeholder {
  color: #b3c0d1;
  opacity: 1;
  font-size: 1em;
}
.el-select {
  width: 100px;
  border-radius: 6px 0 0 6px;
  background: #f4faff;
}
.el-button {
  border-radius: 0 6px 6px 0;
  background: #409eff;
  color: #fff;
  font-weight: bold;
  transition: background 0.2s;
}
.el-button:hover {
  background: #66b1ff;
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
.back-btn {
  margin: 16px;
  padding: 6px 18px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}
.back-btn:hover {
  background: #66b1ff;
}
@media (max-width: 600px) {
  .el-input-group {
    width: 100%;
    max-width: 100vw;
    padding: 8px 0 8px 0;
  }
  .el-input {
    font-size: 1em;
    min-height: 40px;
    padding: 0 8px;
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