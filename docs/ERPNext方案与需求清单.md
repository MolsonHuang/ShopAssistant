# ERPNext/Frappe 迁移方案与需求清单

## 目标

基于 ERPNext/Frappe 搭建一个店铺业务系统，不再把表格、权限、订单状态、导出格式等写死在代码里，而是尽量使用 ERPNext/Frappe 的 DocType、Role、Workflow、Print Format、File Attachment、Report、Workspace 等机制来配置和扩展。

推荐方式：不要直接修改 ERPNext 核心代码，而是创建一个独立自定义 App，例如 `shop_assistant`，通过自定义 DocType、Client Script、Server Script、Print Format、Workspace、Role Permission 和 Hook 嵌入你的业务。

## 你已经提出的完整需求

### 1. 多端使用

- 电脑端可以高效录入、编辑和管理订单。
- 手机端可以卡片式快速录入产品。
- 手机端支持拍照、扫码、查看送货任务、上传签字单。
- 未来希望支持微信小程序或微信扫码登录。

### 2. 商品库

- 商品库需要连接数据库。
- 商品需要包含：
  - 条形码
  - 客人货号
  - 厂家货号
  - 产品照片
  - 产品描述
  - 内装
  - 装箱数
  - 单件体积
  - 单件件数
  - 箱规
  - 毛重
  - 净重
  - 库存
  - 货物位置
- 商品库电脑端需要表格形式，并显示图片。
- 支持批量上传产品照片。
- 支持拖入上传图片和文件。
- 图片保存原图。
- 导出 Excel/PDF 时图片需要压缩，避免文件太大。
- 用户可以批量下载原始图片/附件。

### 3. 扫码录入

- 使用 ZXing 或类似扫码能力读取条形码。
- 扫码后按条码查询商品库。
- 如果商品存在：
  - 自动带出厂家货号、产品照片、产品描述、内装、装箱数、体积等基础信息。
  - 跳到件数、价格等敏感/定制字段填写。
- 如果商品不存在：
  - 支持现场填写信息、拍照。
  - 弹窗询问是否保存到商品库。
  - 或通过设置决定是否自动保存。
- 点击圆形按钮快速进入下一个产品录入。

### 4. 下订单/报价单

- 下订单界面和查看所有订单列表要分开。
- 下订单界面电脑端要像 Excel/合同模板一样：
  - 每个产品一行。
  - 表头看起来和合同模板一致。
  - 支持快速添加、删除、复制、插入、调整顺序。
  - 添加一行按钮放在表格底部。
  - 右键菜单支持插入行、复制行、删除行。
  - 左侧用拟物拖拽柄调整顺序。
  - 下订单时不显示后面的订单状态列。
- 手机端下订单使用卡片式：
  - 点击一个单项弹出卡片。
  - 填写信息后保存回表格。
- 订单字段包括：
  - 客户名称
  - 电话
  - 联系人
  - 付款方式
  - 公司地址
  - 送货地址
  - 下单时间
  - 送货时间
  - 订单备注
  - 正唛图片
  - 侧唛图片
  - 条码图片/条码文件
  - 附件
- 订单产品字段包括：
  - 客人货号
  - 厂家货号
  - 产品照片
  - 产品描述
  - 内装
  - 装箱数
  - 件数
  - 单价
  - 单件体积
  - 单件件数
  - 总体积
  - 总件数
  - 总金额
  - 箱规
  - 毛重
  - 净重
  - 送货状态
  - 验货状态
  - 到仓状态
  - 供货状态
- 公式：
  - 总金额 = 装箱数 × 件数 × 单价
  - 总体积 = 单件体积 × 件数
  - 总件数 = 装箱数 × 件数
- 如果没有单件体积：
  - 可以直接填写新体积。
  - 或打开体积计算器，输入长宽高，例如 `30 50 60` cm，自动计算 CBM。
- 总和栏要可定制，例如可以不显示总装箱数。
- 每列可以配置单位后缀，例如 `$`、`kg`、`g`、`m³`。
- 客人货号需要批量填写/按规律生成，例如上百或上千个货号自动生成。

### 5. 批量照片

- 批量照片导入后：
  - 如果表格没有内容，每张照片自动新增一行，代表一个产品。
  - 如果表格已有内容，弹出窗口，让用户选择每张照片插入到哪一行。
- 支持拖入图片。
- 支持批量照片与已有产品行匹配。

### 6. Excel/PDF 导出

- 上传并保存合同模板。
- 根据模板把数据库里的订单数据导出为指定格式 Excel。
- 导出的 Excel 要是 A4 纸大小订单。
- 导出的 PDF 也要符合 A4 格式。
- Excel 中价格、金额、体积等需要保留公式，而不是只写死数值。
- PDF 中文不能乱码。
- 导出格式不能写死，要能通过前端配置不同表格格式。
- 不同客户/不同要求不应每次改系统参数或代码。

### 7. 通用表格生成器

- 表格列应该由前端配置：
  - 字段 key
  - 中文表头
  - 英文/副标题
  - 宽度
  - 高度/行高
  - 输入类型
  - 是否只读
  - 是否公式列
  - 公式
  - 是否参与合计
  - 单位后缀
  - 是否显示在下单、浏览、导出等场景
- 表格宽度要可变或自适应。
- 配置可以保存，后续复用。
- 表格配置应该同时影响：
  - 前端录入界面
  - Excel 导出
  - PDF/打印格式

### 8. 订单列表与搜索

- 订单列表和下订单分开。
- 订单列表可以查看所有订单。
- 订单列表可以显示每个订单各产品状态。
- 订单界面能看到：
  - 哪些货已经送过
  - 哪些没送过
  - 哪些已到仓
  - 哪些验货通过
  - 哪些验货不通过
  - 哪些无法供货
- 订单状态需要颜色或图标。
- 订单状态需要小扇形图/进度图。
- 搜索功能：
  - 能根据任意字段搜索订单。
  - 能根据任意字段搜索商品。
  - 能跳转到对应订单或商品。

### 9. 送货与仓库

- 库存管理和送货界面分开。
- 送货界面支持：
  - 卡片式查看今日需要送的货。
  - 查看订单信息、地址等。
  - 填写准确箱规、毛重、净重。
  - 上传签字单等附件。
  - 标记本次送了哪些货。
  - 标记验货通过/未通过。
  - 标记已到仓/未到仓。
  - 标记无法供货。
  - 返还订单/返单。
- 送货界面需要可切换：
  - 日历视图
  - 列表视图
- 列表视图支持排序：
  - 按下单顺序
  - 按订单顺序
  - 按送货时间

### 10. 库存管理

- 仓库人员可以快速查看库存信息。
- 可以查看货物位置。
- 可以整理库存。
- 可以更新箱规、毛净重、库存、货位等。

### 11. 供应商/生产单

- 上游供应商可以查看店铺下发的生产单。
- 可以查看时限。
- 可以上报生产进度。
- 业务员可以布单给上游供应商。
- 可以下发任务给送货人。

### 12. 权限与角色

- 权限要根据角色赋予。
- 老板可以看全部。
- 仓管只能看仓库/送货/库存相关页面。
- 跟单/业务只能看订单列表、仓库、送货等指定范围。
- 会计只能看会计和订单金额相关页面。
- 角色和权限范围需要可自定义。
- 权限配置不能导致用户切不回老板或设置页。
- 后续需要微信扫码登录，并按账号绑定角色。

### 13. 会计系统

- 统计订单金额。
- 统计是否付款。
- 统计已付款、未付款、部分付款。
- 统计已收金额、未收金额。
- 可能需要和订单状态、客户、日期范围关联。

### 14. 前端布局

- 电脑端：
  - 功能栏放左边。
  - 用户选择项目后显示对应页面。
  - 下订单是表格。
  - 商品库是表格。
- 手机端：
  - 功能栏缩成顶部按钮。
  - 点击展开所有页面。
  - 下订单是卡片式。
  - 送货是卡片式。

## 用 ERPNext/Frappe 承载这些需求的建议架构

### 1. 不改 ERPNext Core，新增自定义 App

建议创建：

```text
shop_assistant
```

里面放你的自定义 DocType、页面、报表、打印格式、权限、脚本和 API。

理由：

- ERPNext 本身升级频繁，直接改 core 以后很难升级。
- Frappe 支持通过自定义 App 扩展 DocType、权限、工作流、页面和打印格式。
- 你的业务变化快，做成配置和自定义 App 更合适。

### 2. 建议 DocType

#### Shop Product

对应你的商品库。

字段：

- barcode
- customer_item_no
- factory_item_no
- image
- description
- inner_pack
- carton_qty
- cbm_per_carton
- unit_pieces
- length_cm
- width_cm
- height_cm
- gross_weight
- net_weight
- stock_qty
- warehouse_location
- supplier

可映射 ERPNext：

- Item
- Item Barcode
- Item Price
- Stock Ledger
- Warehouse

如果你想快速落地，可以先做独立 `Shop Product`，后续再和 ERPNext `Item` 打通。

#### Shop Order

对应订单/报价单主表。

字段：

- order_no
- customer
- customer_name
- phone
- contact_person
- payment_method
- company_address
- delivery_address
- order_date
- delivery_date
- notes
- front_mark_image
- side_mark_image
- barcode_file
- payment_status
- paid_amount
- attachments

可映射 ERPNext：

- Sales Order
- Quotation
- Customer
- Address
- Contact
- Payment Entry

#### Shop Order Item

订单子表。

字段：

- customer_item_no
- factory_item_no
- product_image
- product_description
- inner_pack
- carton_qty
- cartons
- unit_price
- amount
- cbm_per_carton
- total_cbm
- total_pieces
- unit_suffix
- delivery_status
- inspection_status
- warehouse_status
- supply_status
- delivered_cartons
- gross_weight
- net_weight
- signature_file
- delivery_notes

公式：

- amount = carton_qty × cartons × unit_price
- total_cbm = cbm_per_carton × cartons
- total_pieces = carton_qty × cartons

#### Shop Table Template

通用表格模板。

字段：

- template_name
- target_doctype
- scenario
  - order_entry
  - order_view
  - product_list
  - export_excel
  - print_pdf
- columns_json
- totals_json
- row_height
- page_setup_json
- enabled

#### Shop Role Profile

角色权限配置。

字段：

- role_name
- pages_json
- doctypes_json
- actions_json

#### Shop Delivery Task

送货任务。

字段：

- order
- delivery_date
- delivery_person
- status
- items child table
- signature_attachment
- notes

可映射 ERPNext：

- Delivery Note
- Delivery Trip

#### Shop Supplier Production Order

供应商生产单。

字段：

- supplier
- order
- deadline
- status
- progress_percent
- progress_notes
- attachments

可映射 ERPNext：

- Purchase Order
- Supplier
- Supplier Quotation

### 3. 权限设计

用 Frappe/ERPNext 的：

- Role
- Role Permission Manager
- User Permission
- Workflow
- Workspace

建议默认角色：

- Boss
- Sales
- Merchandiser
- Warehouse User
- Delivery User
- Supplier User
- Accountant

每个角色配置：

- 可见 Workspace
- 可见 DocType
- 可执行 Action
- 可导出/打印/删除/提交/取消

### 4. 页面设计

#### 电脑端 Workspace

- 下订单
- 订单列表
- 商品库
- 库存管理
- 送货仓库
- 供应商生产
- 会计统计
- 设置

#### 手机端

Frappe 自带响应式界面，但你的手机卡片式录入最好做自定义 Page：

- mobile_order_entry
- mobile_delivery_task
- mobile_product_capture

### 5. Excel/PDF 导出

ERPNext/Frappe 推荐方式：

- Print Format：做 PDF/打印模板。
- Jinja Template：控制打印格式。
- File Attachment：保存附件。
- 自定义 Python API：生成 Excel。

对于你的 Excel 模板：

- 保存 Excel 模板为附件或文件。
- 读取 `Shop Table Template` 配置。
- 按 columns_json 填充字段。
- 按 formula 配置写 Excel 公式。
- 图片压缩后嵌入。
- 原图仍保留在 File 中。

### 6. 分阶段实施路线

#### 第一阶段：ERPNext 基础安装与自定义 App

- 搭建 Frappe Bench。
- 安装 ERPNext。
- 创建 `shop_assistant` App。
- 创建基础 Workspace。
- 创建角色。

#### 第二阶段：核心 DocType

- Shop Product
- Shop Order
- Shop Order Item
- Shop Table Template
- Shop Delivery Task
- Shop Role Profile

#### 第三阶段：表格生成器

- 配置列。
- 配置宽度/后缀/公式/合计。
- 电脑端表格录入。
- 手机端卡片录入。
- 拖入图片。
- 批量照片分配。
- 批量货号生成。

#### 第四阶段：导出系统

- Excel 模板上传。
- Excel 导出公式。
- PDF Print Format。
- 图片压缩。
- 附件下载。

#### 第五阶段：库存/送货/供应商

- 库存位置和箱规维护。
- 送货任务。
- 签字单上传。
- 验货状态。
- 供应商生产进度。

#### 第六阶段：权限/微信登录/会计

- 自定义角色权限配置页面。
- 微信扫码登录。
- 会计统计。
- 付款状态。
- 收款报表。

## 结论

基于 ERPNext/Frappe 是可行的，而且比继续从零写更适合你的长期需求。

但是推荐路线不是 fork 后直接改 ERPNext，而是：

```text
ERPNext Core + 自定义 shop_assistant App
```

这样既能利用 ERPNext 的库存、会计、权限、附件、打印和工作流能力，又能保持你的订单表格、手机卡片、批量照片、定制导出等特殊业务独立可维护。
