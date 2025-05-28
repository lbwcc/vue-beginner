<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { themes, applyTheme } from './utils/theme';

onMounted(() => {
  // 默认应用第一个主题
  applyTheme(themes[0]);
});
</script>

<style lang="scss">
:root {
  --remark-text: #1976d2;
  --remark-empty: #bbb;
  --lunar-text: #888;
  --dialog-text: #222;
  --dialog-empty: #aaa;
  --main-text: #66462a;
  --bg-main: #f8f4ed;
  --header: #f9d770;
  --button: #ffe156;
  --button-text: #66462a;
  --button-hover: #f9d770;
  --button-active: #e9546b;
  --today-border: #e9546b;
  --today: #fff2e2;
  --marked: #ffe156;
  --marked-text: #b36d41;
  --holiday: #f8d0d6;
  --holiday-text: #e9546b;
  --holiday-border: #e9546b;
  --workday: #e9f1f6;
  --workday-text: #177cb0;
  --workday-border: #177cb0;
  --bg-cell: #f6e0b3;
  --enlarged: #fff2e2;
  --enlarged-border: #e9546b;
  --input-bg: #f8f4ed;
  --input-border: #f9d770;
  --input-focus: #e9546b;
  --remarked: #b2e5d6;
  --remarked-text: #1976d2;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--main-text, #2c3e50);
  min-height: 100%;
}
@media (max-width: 600px) {
  #app {
    font-size: 15px;
  }
  nav {
    padding: 12px;
  }
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
