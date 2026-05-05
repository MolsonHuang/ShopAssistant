<template>
  <scroll-view class="page" scroll-y>
    <view class="header">
      <text class="title">店铺管理工作台</text>
      <text class="subtitle">商品、报价、库存、送货和供应商进度统一查看</text>
    </view>

    <view class="grid">
      <view class="card" @click="navigateTo('product-detail')">
        <text class="card-title">商品录入</text>
        <text class="card-desc">扫码查商品，快速补图片、价格、库存和详情</text>
      </view>
      <view class="card" @click="navigateTo('order')">
        <text class="card-title">报价订单</text>
        <text class="card-desc">记录客人信息、产品列表、标签和修改历史</text>
      </view>
      <view class="card" @click="navigateTo('warehouse')">
        <text class="card-title">库存仓库</text>
        <text class="card-desc">查看库存数量、条码和货物位置</text>
      </view>
      <view class="card" @click="navigateTo('delivery')">
        <text class="card-title">送货任务</text>
        <text class="card-desc">查看今日待送订单、地址并处理返单</text>
      </view>
    </view>
  </scroll-view>
</template>

<script>
export default {
  methods: {
    navigateTo(page) {
      uni.navigateTo({ url: `/pages/${page}/index` });
    }
  }
};
</script>

<style>
.page {
  min-height: 100vh;
  padding: 20px;
  background: #f4f6f8;
  box-sizing: border-box;
}
.header {
  margin-bottom: 18px;
}
.title {
  display: block;
  color: #17202a;
  font-size: 26px;
  font-weight: 700;
}
.subtitle {
  display: block;
  margin-top: 8px;
  color: #5d6d7e;
  font-size: 14px;
  line-height: 1.5;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.card {
  min-height: 118px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e6ebf1;
  border-radius: 8px;
  box-sizing: border-box;
}
.card-title {
  display: block;
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 700;
}
.card-desc {
  display: block;
  margin-top: 10px;
  color: #637381;
  font-size: 13px;
  line-height: 1.45;
}
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
