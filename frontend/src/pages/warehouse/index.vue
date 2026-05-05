<template>
  <scroll-view class="page" scroll-y>
    <view class="panel">
      <view class="topbar">
        <text class="panel-title">库存概览</text>
        <button class="secondary compact" @click="fetchInventory">刷新</button>
      </view>
      <input v-model="keyword" class="search" placeholder="按商品名或条码搜索" />
      <view v-if="!filteredInventory.length" class="empty">暂无库存</view>
      <view v-for="item in filteredInventory" :key="item.id" class="row">
        <view>
          <text class="name">{{ item.name }}</text>
          <text class="meta">条码：{{ item.barcode || '未填写' }}</text>
          <text class="meta">货位：{{ item.location || '待补充' }}</text>
        </view>
        <text class="stock">库存 {{ item.stock || 0 }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script>
export default {
  data() {
    return {
      inventory: [],
      keyword: ''
    };
  },
  computed: {
    filteredInventory() {
      const keyword = this.keyword.trim().toLowerCase();
      if (!keyword) return this.inventory;
      return this.inventory.filter((item) => `${item.name || ''}${item.barcode || ''}`.toLowerCase().includes(keyword));
    }
  },
  onShow() {
    this.fetchInventory();
  },
  methods: {
    fetchInventory() {
      this.$request({ url: '/dashboard/inventory' })
        .then((data) => {
          this.inventory = data;
        })
        .catch(() => uni.showToast({ title: '获取库存失败', icon: 'none' }));
    }
  }
};
</script>

<style>
.page {
  min-height: 100vh;
  padding: 16px;
  background: #f4f6f8;
  box-sizing: border-box;
}
.panel {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e7ecf2;
  border-radius: 8px;
}
.topbar,
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.panel-title,
.name,
.meta,
.stock,
.empty {
  display: block;
}
.panel-title {
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 700;
}
.search {
  width: 100%;
  min-height: 42px;
  margin: 14px 0 6px;
  padding: 10px;
  border: 1px solid #d8e0e8;
  border-radius: 6px;
  box-sizing: border-box;
}
.row {
  padding: 14px 0;
  border-top: 1px solid #edf1f5;
}
.name {
  color: #1f2d3d;
  font-weight: 700;
}
.meta,
.empty {
  margin-top: 6px;
  color: #637381;
  font-size: 13px;
}
.stock {
  min-width: 86px;
  color: #1769aa;
  font-weight: 700;
  text-align: right;
}
.secondary {
  background: #ffffff;
  color: #1769aa;
  border: 1px solid #b7c9db;
  border-radius: 6px;
}
.compact {
  min-width: 74px;
  padding: 0 10px;
  font-size: 14px;
  line-height: 38px;
}
</style>
