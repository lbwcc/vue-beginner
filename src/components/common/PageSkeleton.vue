<template>
  <div class="page-skeleton" role="status" aria-live="polite">
    <div class="skeleton-banner shimmer"></div>
    <div class="skeleton-grid">
      <div v-for="index in count" :key="index" class="skeleton-card shimmer"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    default: 6,
  },
})
</script>

<style scoped>
.page-skeleton {
  width: min(1120px, 100% - 32px);
  margin: 20px auto;
}

.skeleton-banner {
  height: 92px;
  border-radius: 18px;
  margin-bottom: 16px;
  background: linear-gradient(90deg, rgba(255, 225, 134, 0.25), rgba(255, 240, 209, 0.8), rgba(255, 225, 134, 0.25));
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.skeleton-card {
  height: 132px;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(222, 199, 158, 0.2), rgba(249, 239, 218, 0.9), rgba(222, 199, 158, 0.2));
}

.shimmer {
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
