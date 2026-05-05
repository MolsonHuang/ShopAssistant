# 跨平台店铺管理系统

这是一个面向 Android、iOS、微信小程序和电脑浏览器的店铺管理工具基础版本。当前版本包含商品录入、扫码查商品、报价/订单、库存、送货任务、图片上传、SQLite 本地数据库、Excel 合同导出和 A4 PDF 导出。

## 项目结构

- `frontend/`：uni-app 前端，可运行 H5，也可打包微信小程序和 APP。
- `backend/`：Node.js + Express + Node 内置 SQLite 后端 API。

## 运行前准备

先安装 Node.js 18 或更新版本。当前电脑环境里没有检测到 `node` 命令，所以需要先安装 Node.js 并重新打开终端。

## 电脑浏览器运行

1. 安装后端依赖并启动 API：

```bash
cd backend
npm install
npm run dev
```

2. 打开新的终端，安装前端依赖并启动 H5：

```bash
cd frontend
npm install
npm run dev:h5
```

3. 在电脑浏览器打开：

```text
http://localhost:8080
```

## 手机浏览器运行

1. 让电脑和手机连接同一个 Wi-Fi。
2. 在电脑上查看局域网 IP：

```powershell
ipconfig
```

3. 后端启动后会监听 `0.0.0.0:3000`，前端 H5 会自动按访问前端时的主机名连接后端。
4. 假设电脑 IP 是 `192.168.1.20`，手机浏览器打开：

```text
http://192.168.1.20:8080
```

如果手机打不开，通常是 Windows 防火墙未放行 Node.js 或 3000/8080 端口。

当前也提供了一个不需要前端编译的网页入口，后端启动后直接打开：

```text
http://localhost:3000/app/
```

手机访问：

```text
http://电脑局域网IP:3000/app/
```

## 数据与导出

- SQLite 数据库：`backend/shop.db`
- 上传原图和附件：`backend/uploads/`
- Excel/PDF 导出缓存：`backend/exports/`
- Excel 合同模板：`backend/templates/contract-template.xlsx`

订单支持的导出字段包括：客人货号、厂家货号、产品照片、产品描述、内装、装箱数、件数、单价、单件体积、单件件数、总体积、总件数、总金额，以及客户名称、电话、联系人、付款方式、公司地址、送货地址、下单时间、送货时间、正唛、侧唛和条码文件。

## 微信小程序和 APP

- 微信小程序：

```bash
cd frontend
npm run build:mp-weixin
```

- APP：

```bash
cd frontend
npm run build:app
```

打包小程序或 APP 时，`frontend/src/utils/request.js` 里的非 H5 地址需要改成你的服务器或电脑局域网 IP，例如 `http://192.168.1.20:3000/api`。正式上线时建议换成 HTTPS 域名。

## 已覆盖功能

- 商品：新增、编辑、图片地址、详细信息、条码查询、库存和货位。
- 扫码：商品页和订单产品项支持 `uni.scanCode`。
- 报价/订单：客户信息、产品列表、条码、标签、唛头、合计金额。
- 留痕：订单新增、编辑、删除、状态变更会写入 `order_history`。
- 老板视图：后端提供销售和库存概览接口。
- 送货人员：查看未完成订单，支持开始送货、完成、返单。
- 仓库人员：查看库存、条码、货位并搜索。
