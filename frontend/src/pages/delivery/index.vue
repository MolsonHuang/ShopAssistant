<template>
  <scroll-view class="page" scroll-y>
    <view class="panel">
      <view class="topbar">
        <text class="panel-title">今日送货</text>
        <button class="secondary compact" @click="fetchTasks">刷新</button>
      </view>
      <view v-if="!tasks.length" class="empty">暂无待送订单</view>
      <view v-for="task in tasks" :key="task.id" class="task">
        <text class="name">{{ task.customerName || '未填写客户' }}</text>
        <text class="meta">电话：{{ task.customerPhone || '未填写' }}</text>
        <text class="meta">地址：{{ task.customerAddress || '未填写' }}</text>
        <text class="meta">状态：{{ statusText(task.status) }}</text>
        <view class="actions">
          <button class="secondary compact" @click="setStatus(task.id, 'delivering')">开始送货</button>
          <button class="primary compact" @click="setStatus(task.id, 'completed')">完成</button>
          <button class="danger compact" @click="setStatus(task.id, 'returned')">返单</button>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
export default {
  data() {
    return {
      tasks: []
    };
  },
  onShow() {
    this.fetchTasks();
  },
  methods: {
    fetchTasks() {
      this.$request({ url: '/orders' })
        .then((data) => {
          this.tasks = data.filter((order) => order.status !== 'completed');
        })
        .catch(() => uni.showToast({ title: '获取送货任务失败', icon: 'none' }));
    },
    setStatus(id, status) {
      this.$request({ url: `/orders/${id}/status`, method: 'POST', data: { status } })
        .then(() => this.fetchTasks())
        .catch(() => uni.showToast({ title: '更新状态失败', icon: 'none' }));
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
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e7ecf2;
  border-radius: 8px;
}
.topbar,
.actions {
  display: flex;
  gap: 10px;
  justify-content: space-between;
}
.panel-title,
.name,
.meta,
.empty {
  display: block;
}
.panel-title {
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 700;
}
.task {
  padding: 14px 0;
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
.actions {
  margin-top: 12px;
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
.compact {
  min-width: 74px;
  padding: 0 10px;
  line-height: 38px;
}
@media (max-width: 640px) {
  .actions {
    flex-direction: column;
  }
}
</style>
