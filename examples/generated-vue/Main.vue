<script setup lang="ts">
import Tabs from './Tabs.vue';
import Content from './Content.vue';
</script>

<template>
  <section class="Main">
    <div style="display:flex; flex-direction:column; gap:8px;">
      <Tabs />
      <Content />
    </Div>
  </section>
</template>

<style scoped>
.Main {
  background-color: #fda;
  width: 70%;
}
</style>
