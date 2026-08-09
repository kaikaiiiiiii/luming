<script setup lang="ts">
import MyForm from './MyForm.vue';
import Preview from './Preview.vue';
</script>

<template>
  <section class="Content">
    <div style="display:flex; flex-direction:column; gap:8px;">
      <MyForm />
      <Preview />
    </div>
  </section>
</template>

<style scoped>
.Content {

}
</style>
