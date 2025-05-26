<script setup>
// 不再直接引入 HomeView
</script>
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  min-height: 100%;
  background: #f5f6fa;
  .content {
    height: 100%;
  }
}
@media (max-width: 600px) {
  #app {
    font-size: 15px;
    padding: 0 2vw;
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
