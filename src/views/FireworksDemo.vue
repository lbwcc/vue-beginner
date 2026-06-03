<template>
  <div class="fireworks-demo tool-page" v-reveal="{ y: 12, duration: 0.34 }">
    <FireworksOptimized />
  </div>
</template>

<script>
import FireworksOptimized from '@/components/FireworksOptimized.vue';

export default {
  name: 'FireworksDemo',
  components: {
    FireworksOptimized
  }
}
</script>

<style scoped>
.fireworks-demo {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
}
</style>
