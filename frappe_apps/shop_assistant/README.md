# Shop Assistant Frappe App

`shop_assistant` 是为店铺订单、商品、送货、导出和权限定制的 Frappe/ERPNext 自定义 App。

推荐用法：安装 ERPNext 后，把这个 App 作为自定义 App 安装到同一个 bench 里，不直接修改 ERPNext Core。

## 安装方式

在 Frappe Bench 环境中：

```bash
cd frappe-bench
bench get-app /path/to/ShopAssistant/frappe_apps/shop_assistant
bench --site your-site.local install-app shop_assistant
bench --site your-site.local migrate
```

## 已包含

- Shop Product：商品库
- Shop Order：店铺订单主表
- Shop Order Item：订单产品明细子表
- Shop Table Template：通用表格配置
- Shop Delivery Task：送货任务
- Shop Delivery Task Item：送货明细子表
- Shop Supplier Production Order：供应商生产单
- Shop Role Profile：自定义角色权限配置
- Shop Order A4：A4 打印格式骨架
- API：按条码查商品、读取/保存表格模板

## 后续重点

- 电脑端类 Excel 表格页面
- 手机端卡片录入页面
- 拖入图片、批量图片分配、货号批量生成
- Excel 模板导出
- 微信扫码登录
- 与 ERPNext Item、Sales Order、Delivery Note、Payment Entry 逐步打通
