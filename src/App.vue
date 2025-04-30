<script setup>
import HomeView from "./views/HomeView.vue";
</script>
<template>
  <div id="app">
    <HomeView />
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  min-height: 100vh;
  background: #f5f6fa;
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
