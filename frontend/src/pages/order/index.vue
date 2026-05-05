<template>
  <scroll-view class="page" scroll-y>
    <view class="panel">
      <text class="panel-title">{{ form.id ? '编辑报价/订单' : '新建报价/订单' }}</text>
      <view class="row">
        <view class="field half">
          <text class="label">类型</text>
          <picker :range="typeLabels" :value="typeIndex" @change="changeType">
            <view class="picker">{{ typeLabels[typeIndex] }}</view>
          </picker>
        </view>
        <view class="field half">
          <text class="label">客户姓名</text>
          <input v-model="form.customerName" placeholder="客户姓名" />
        </view>
      </view>
      <view class="row">
        <view class="field half">
          <text class="label">电话</text>
          <input v-model="form.customerPhone" placeholder="联系电话" />
        </view>
        <view class="field half">
          <text class="label">地址</text>
          <input v-model="form.customerAddress" placeholder="送货地址" />
        </view>
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea v-model="form.notes" placeholder="客户要求、交期、供应商说明等" auto-height></textarea>
      </view>

      <view class="items-head">
        <text class="panel-title small">产品列表</text>
        <button class="secondary compact" @click="addItem">添加产品</button>
      </view>
      <view v-for="(item, index) in form.items" :key="index" class="item">
        <view class="row">
          <view class="field half">
            <text class="label">条码</text>
            <input v-model="item.barcode" placeholder="条码" />
          </view>
          <button class="scan" @click="scanItem(index)">扫码</button>
        </view>
        <view class="row">
          <view class="field half">
            <text class="label">数量</text>
            <input v-model.number="item.quantity" type="number" placeholder="1" />
          </view>
          <view class="field half">
            <text class="label">单价</text>
            <input v-model.number="item.price" type="number" placeholder="0.00" />
          </view>
        </view>
        <view class="row">
          <view class="field half">
            <text class="label">标签/条码图</text>
            <input v-model="item.label" placeholder="图片或文件地址" />
          </view>
          <view class="field half">
            <text class="label">唛头</text>
            <input v-model="item.mark" placeholder="唛头信息" />
          </view>
        </view>
        <button class="danger compact" @click="removeItem(index)">删除此产品</button>
      </view>

      <view class="total">合计：{{ totalAmount }}</view>
      <button class="primary" @click="saveOrder">保存</button>
    </view>

    <view class="panel">
      <text class="panel-title">报价单 / 订单</text>
      <view v-if="!orders.length" class="empty">暂无记录</view>
      <view v-for="order in orders" :key="order.id" class="order">
        <view class="order-main" @click="editOrder(order)">
          <text class="name">{{ order.customerName || '未填写客户' }} · {{ order.type === 'quote' ? '报价单' : '订单' }}</text>
          <text class="meta">状态：{{ statusText(order.status) }} / {{ order.createdAt }}</text>
        </view>
        <button class="secondary compact" @click="showHistory(order.id)">历史</button>
        <button class="danger compact" @click="deleteOrder(order.id)">删除</button>
      </view>
    </view>
  </scroll-view>
</template>

<script>
const emptyItem = () => ({ productId: null, barcode: '', quantity: 1, price: 0, label: '', mark: '' });
const emptyForm = () => ({
  id: null,
  type: 'quote',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  notes: '',
  items: [emptyItem()]
});

export default {
  data() {
    return {
      form: emptyForm(),
      orders: [],
      typeLabels: ['报价单', '订单']
    };
  },
  computed: {
    typeIndex() {
      return this.form.type === 'order' ? 1 : 0;
    },
    totalAmount() {
      const total = this.form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
      return total.toFixed(2);
    }
  },
  onShow() {
    this.fetchOrders();
  },
  methods: {
    fetchOrders() {
      this.$request({ url: '/orders' })
        .then((data) => {
          this.orders = data;
        })
        .catch(() => uni.showToast({ title: '获取订单失败', icon: 'none' }));
    },
    changeType(event) {
      this.form.type = Number(event.detail.value) === 1 ? 'order' : 'quote';
    },
    addItem() {
      this.form.items.push(emptyItem());
    },
    removeItem(index) {
      if (this.form.items.length === 1) return;
      this.form.items.splice(index, 1);
    },
    scanItem(index) {
      uni.scanCode({
        success: ({ result }) => {
          this.form.items[index].barcode = result;
          this.$request({ url: `/products/barcode/${encodeURIComponent(result)}` })
            .then((product) => {
              this.form.items[index].productId = product.id;
              this.form.items[index].price = product.price || 0;
            })
            .catch(() => {});
        }
      });
    },
    saveOrder() {
      if (!this.form.customerName) {
        uni.showToast({ title: '请填写客户姓名', icon: 'none' });
        return;
      }
      const method = this.form.id ? 'PUT' : 'POST';
      const url = this.form.id ? `/orders/${this.form.id}` : '/orders';
      this.$request({ url, method, data: this.form })
        .then(() => {
          uni.showToast({ title: '已保存', icon: 'success' });
          this.form = emptyForm();
          this.fetchOrders();
        })
        .catch(() => uni.showToast({ title: '保存失败', icon: 'none' }));
    },
    editOrder(order) {
      this.$request({ url: `/orders/${order.id}` })
        .then((data) => {
          this.form = { ...emptyForm(), ...data, items: data.items && data.items.length ? data.items : [emptyItem()] };
        })
        .catch(() => uni.showToast({ title: '读取订单失败', icon: 'none' }));
    },
    deleteOrder(id) {
      this.$request({ url: `/orders/${id}`, method: 'DELETE' })
        .then(() => this.fetchOrders())
        .catch(() => uni.showToast({ title: '删除失败', icon: 'none' }));
    },
    showHistory(id) {
      this.$request({ url: `/orders/${id}/history` })
        .then((rows) => {
          const text = rows.map((row) => `${row.action} ${row.createdAt}`).join('\n') || '暂无历史';
          uni.showModal({ title: '编辑/删除记录', content: text, showCancel: false });
        })
        .catch(() => uni.showToast({ title: '读取历史失败', icon: 'none' }));
    },
    statusText(status) {
      return { pending: '待处理', delivering: '送货中', completed: '已完成', returned: '已返单' }[status] || status;
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
  margin-bottom: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e7ecf2;
  border-radius: 8px;
}
.panel-title,
.name,
.meta,
.label,
.empty,
.total {
  display: block;
}
.panel-title {
  margin-bottom: 14px;
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 700;
}
.small {
  margin-bottom: 0;
  font-size: 16px;
}
.row,
.items-head,
.order {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.field {
  margin-bottom: 12px;
}
.half,
.order-main {
  flex: 1;
}
.label {
  margin-bottom: 6px;
  color: #52616f;
  font-size: 13px;
}
input,
textarea,
.picker {
  width: 100%;
  min-height: 42px;
  padding: 10px;
  border: 1px solid #d8e0e8;
  border-radius: 6px;
  background: #ffffff;
  box-sizing: border-box;
}
textarea {
  min-height: 76px;
}
.item {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #edf1f5;
  border-radius: 8px;
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
  background: #ffffff;
  color: #1769aa;
  border: 1px solid #b7c9db;
}
.danger {
  background: #fff5f5;
  color: #b42318;
  border: 1px solid #f4b5b0;
}
.compact,
.scan {
  min-width: 74px;
  padding: 0 10px;
  line-height: 38px;
}
.scan {
  margin-top: 22px;
  background: #eef5fb;
  color: #1769aa;
}
.total {
  margin: 8px 0 12px;
  text-align: right;
  color: #1f2d3d;
  font-weight: 700;
}
.order {
  padding: 12px 0;
  border-top: 1px solid #edf1f5;
}
.name {
  color: #1f2d3d;
  font-size: 15px;
  font-weight: 700;
}
.meta,
.empty {
  margin-top: 6px;
  color: #637381;
  font-size: 13px;
}
@media (max-width: 640px) {
  .row,
  .order {
    flex-direction: column;
  }
  .compact,
  .scan {
    width: 100%;
  }
}
</style>
