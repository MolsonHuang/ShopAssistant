<template>
  <scroll-view class="page" scroll-y>
    <view class="toolbar">
      <button class="secondary" @click="scanBarcode">扫码查商品</button>
      <button class="secondary" @click="loadProducts">刷新列表</button>
    </view>

    <view class="panel">
      <text class="panel-title">{{ product.id ? '编辑商品' : '快速录入商品' }}</text>
      <view class="field">
        <text class="label">商品名称</text>
        <input v-model="product.name" placeholder="请输入商品名称" />
      </view>
      <view class="field">
        <text class="label">条形码</text>
        <input v-model="product.barcode" placeholder="扫码或手动输入条码" />
      </view>
      <view class="row">
        <view class="field half">
          <text class="label">价格</text>
          <input v-model.number="product.price" type="number" placeholder="0.00" />
        </view>
        <view class="field half">
          <text class="label">库存</text>
          <input v-model.number="product.stock" type="number" placeholder="0" />
        </view>
      </view>
      <view class="field">
        <text class="label">货位</text>
        <input v-model="product.location" placeholder="例如 A 区 3 架 2 层" />
      </view>
      <view class="field">
        <text class="label">图片地址</text>
        <input v-model="product.imageUrl" placeholder="可填写图片 URL，后续可接上传接口" />
      </view>
      <view class="field">
        <text class="label">详细信息</text>
        <textarea v-model="product.description" placeholder="规格、材质、包装、注意事项等" auto-height></textarea>
      </view>
      <button class="primary" @click="saveProduct">保存商品</button>
    </view>

    <view class="panel">
      <text class="panel-title">商品列表</text>
      <view v-if="!products.length" class="empty">暂无商品</view>
      <view v-for="item in products" :key="item.id" class="product" @click="editProduct(item)">
        <image v-if="item.imageUrl" class="thumb" :src="item.imageUrl" mode="aspectFill" />
        <view class="product-body">
          <text class="name">{{ item.name }}</text>
          <text class="meta">条码：{{ item.barcode || '未填写' }}</text>
          <text class="meta">库存：{{ item.stock || 0 }} / 价格：{{ item.price || 0 }}</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
const emptyProduct = () => ({
  id: null,
  name: '',
  barcode: '',
  price: 0,
  stock: 0,
  location: '',
  imageUrl: '',
  description: ''
});

export default {
  data() {
    return {
      product: emptyProduct(),
      products: []
    };
  },
  onShow() {
    this.loadProducts();
  },
  methods: {
    loadProducts() {
      this.$request({ url: '/products' })
        .then((data) => {
          this.products = data;
        })
        .catch(() => uni.showToast({ title: '获取商品失败', icon: 'none' }));
    },
    editProduct(item) {
      this.product = { ...emptyProduct(), ...item };
    },
    scanBarcode() {
      uni.scanCode({
        success: ({ result }) => {
          this.product.barcode = result;
          this.$request({ url: `/products/barcode/${encodeURIComponent(result)}` })
            .then((data) => {
              this.product = { ...emptyProduct(), ...data };
              uni.showToast({ title: '已找到商品', icon: 'success' });
            })
            .catch(() => uni.showToast({ title: '未找到，可直接录入', icon: 'none' }));
        },
        fail: () => uni.showToast({ title: '扫码取消或失败', icon: 'none' })
      });
    },
    saveProduct() {
      if (!this.product.name) {
        uni.showToast({ title: '请填写商品名称', icon: 'none' });
        return;
      }
      const method = this.product.id ? 'PUT' : 'POST';
      const url = this.product.id ? `/products/${this.product.id}` : '/products';
      this.$request({ url, method, data: this.product })
        .then(() => {
          uni.showToast({ title: '商品已保存', icon: 'success' });
          this.product = emptyProduct();
          this.loadProducts();
        })
        .catch(() => uni.showToast({ title: '保存失败，检查条码是否重复', icon: 'none' }));
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
.toolbar,
.row {
  display: flex;
  gap: 10px;
}
.toolbar {
  margin-bottom: 12px;
}
.panel {
  margin-bottom: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e7ecf2;
  border-radius: 8px;
}
.panel-title {
  display: block;
  margin-bottom: 14px;
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 700;
}
.field {
  margin-bottom: 12px;
}
.half {
  flex: 1;
}
.label {
  display: block;
  margin-bottom: 6px;
  color: #52616f;
  font-size: 13px;
}
input,
textarea {
  width: 100%;
  min-height: 42px;
  padding: 10px;
  border: 1px solid #d8e0e8;
  border-radius: 6px;
  background: #ffffff;
  box-sizing: border-box;
}
textarea {
  min-height: 86px;
}
button {
  border-radius: 6px;
  font-size: 14px;
}
.primary {
  background: #1769aa;
  color: #ffffff;
}
.secondary {
  flex: 1;
  background: #ffffff;
  color: #1769aa;
  border: 1px solid #b7c9db;
}
.product {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid #edf1f5;
}
.thumb {
  width: 58px;
  height: 58px;
  border-radius: 6px;
  background: #eef2f6;
}
.product-body {
  flex: 1;
}
.name,
.meta,
.empty {
  display: block;
}
.name {
  color: #1f2d3d;
  font-size: 15px;
  font-weight: 700;
}
.meta,
.empty {
  margin-top: 5px;
  color: #637381;
  font-size: 13px;
}
</style>
