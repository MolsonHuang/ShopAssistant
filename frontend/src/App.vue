<template>
  <view class="app-container">
    <slot />
  </view>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
.app-container {
  display: flex;
  min-height: 100vh;
  background: #f4f6fb;
}
</style>
