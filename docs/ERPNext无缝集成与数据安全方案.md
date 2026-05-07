# ERPNext 无缝集成与数据安全方案

这份方案说明 `shop_assistant` 自定义 App 如何接入 ERPNext，并通过定期备份和权限控制保证数据安全。

## 1. 总体原则

不要把 `shop_assistant` 做成 ERPNext 旁边的另一套系统。

正确方式是：

```text
ERPNext 标准模块
  ├─ Customer 客户
  ├─ Supplier 供应商
  ├─ Item 商品
  ├─ Quotation 报价单
  ├─ Sales Order 销售订单
  ├─ Delivery Note 送货单
  ├─ Sales Invoice 销售发票
  ├─ Payment Entry 收付款
  └─ Stock Ledger / Warehouse 库存

shop_assistant 自定义 App
  ├─ 补充你的行业字段
  ├─ 补充电脑端类 Excel 下单界面
  ├─ 补充手机端卡片录入
  ├─ 补充微信号绑定
  ├─ 补充条码、唛头、签字单、附件
  └─ 补充自定义导出、打印、权限范围
```

这样做的好处是：

- 客户、供应商、商品、库存、会计继续走 ERPNext 标准数据。
- 你的特殊流程放在自定义 App 中，不修改 ERPNext Core。
- 后续 ERPNext 升级时风险更低。
- ERPNext 的角色、权限、审计、备份、打印、导出都能继续复用。

## 2. DocType 对接关系

建议逐步把当前自定义 DocType 和 ERPNext 标准 DocType 关联起来。

| 你的需求 | ERPNext 标准对象 | shop_assistant 扩展 |
| --- | --- | --- |
| 客户资料 | Customer | 客户额外字段、微信绑定、送货偏好 |
| 供应商 | Supplier | 生产进度、交期、上报附件 |
| 商品库 | Item | 商品照片、客户货号、厂家货号、箱规、条码 |
| 报价单 | Quotation | 自定义 Excel/A4 模板、客户货号列表 |
| 正式订单 | Sales Order | 唛头、条码文件、备注、状态扇形图 |
| 送货 | Delivery Note | 送货任务、签字单、验货状态、返单 |
| 库存 | Warehouse / Stock Ledger | 货位、箱规、到仓状态 |
| 会计 | Sales Invoice / Payment Entry | 付款状态、应收统计 |
| 上游生产 | Purchase Order / Supplier Quotation | 生产单、时限、进度上报 |

第一阶段可以保留 `Shop Order`、`Shop Product` 等自定义表，让它们通过 Link 字段关联 ERPNext 标准对象。

第二阶段再做自动同步：

- 保存 `Shop Product` 时，同步或创建 ERPNext `Item`。
- 确认 `Shop Order` 时，生成 ERPNext `Quotation` 或 `Sales Order`。
- 创建送货任务时，生成或关联 ERPNext `Delivery Note`。
- 付款确认时，关联 ERPNext `Payment Entry`。

## 3. 安装方式

自定义 App 必须安装在 ERPNext 同一个 site 里。

示例：

```bash
cd ~/frappe-bench

bench get-app erpnext --branch version-15
bench --site erp.yourdomain.com install-app erpnext

git clone https://github.com/MolsonHuang/ShopAssistant.git /opt/ShopAssistant

bench get-app /opt/ShopAssistant/frappe_apps/shop_assistant
bench --site erp.yourdomain.com install-app shop_assistant
bench --site erp.yourdomain.com migrate
bench build
```

确认安装：

```bash
bench --site erp.yourdomain.com list-apps
```

应该看到：

```text
frappe
erpnext
shop_assistant
```

## 4. 权限如何无缝接入

权限应该以 ERPNext/Frappe 原生权限为主。

Frappe 本身有：

- User
- Role
- DocType Permissions
- Role Permission Manager
- User Permissions
- Role Profile
- Session / Cookie 登录

`shop_assistant` 只补充你的业务角色：

- Shop Boss
- Shop Sales
- Shop Warehouse
- Shop Delivery
- Shop Supplier
- Shop Accountant

推荐分工：

| 角色 | 能看什么 |
| --- | --- |
| Shop Boss | 全部订单、销售统计、会计、权限配置 |
| Shop Sales | 下单、订单列表、商品库、供应商生产单 |
| Shop Warehouse | 库存、货位、到仓、验货 |
| Shop Delivery | 今日送货、签字单、返单 |
| Shop Supplier | 生产单、交期、进度上报 |
| Shop Accountant | 订单金额、付款状态、应收统计 |

更细的限制用 `User Permissions` 做。

例如：

- 某个供应商只能看到自己的生产单。
- 某个业务员只能看到自己负责的客户。
- 某个送货员只能看到分配给自己的送货任务。

## 5. 微信号绑定方式

微信小程序不能直接“代替” ERPNext 用户系统。

正确流程：

```text
微信 wx.login
  -> 获取 code
  -> 后端 code2Session 换 openid
  -> Shop Wechat Binding 查找 openid
  -> 找到 ERPNext User
  -> 按 ERPNext User 的角色返回页面权限
```

当前自定义 App 已新增：

```text
Shop Wechat Binding
shop_assistant.api.wechat.wechat_login
```

管理员绑定步骤：

1. 用户第一次打开小程序登录。
2. 系统自动生成一条 `Shop Wechat Binding`。
3. 老板或 System Manager 在 ERPNext 中打开这条记录。
4. 选择对应的 `ERPNext User`。
5. 勾选 `Enabled`。
6. 分配 `Shop Role Profile` 或 ERPNext Role。

这样微信号和 ERPNext 用户就绑定起来了。

## 6. 数据安全原则

ERPNext 的数据不只在数据库里。

必须同时备份：

- MariaDB 数据库
- public files
- private files
- site_config.json
- custom app 代码
- 自定义打印模板、脚本、配置

其中最重要的是：

```text
~/frappe-bench/sites/erp.yourdomain.com
~/frappe-bench/apps/shop_assistant
```

## 7. 手动备份命令

进入 bench 目录：

```bash
cd ~/frappe-bench
```

备份数据库和文件：

```bash
bench --site erp.yourdomain.com backup --with-files --compress
```

备份通常生成在：

```text
~/frappe-bench/sites/erp.yourdomain.com/private/backups
```

## 8. 自动定时备份

创建备份目录：

```bash
sudo mkdir -p /backup/erpnext
sudo chown -R $USER:$USER /backup/erpnext
```

创建脚本：

```bash
nano ~/backup_erpnext.sh
```

内容：

```bash
#!/usr/bin/env bash
set -euo pipefail

SITE="erp.yourdomain.com"
BENCH_DIR="$HOME/frappe-bench"
BACKUP_DIR="/backup/erpnext/$SITE"
DATE="$(date +%Y-%m-%d_%H-%M-%S)"

mkdir -p "$BACKUP_DIR"

cd "$BENCH_DIR"
bench --site "$SITE" backup --with-files --compress --backup-path "$BACKUP_DIR/$DATE"

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```

授权：

```bash
chmod +x ~/backup_erpnext.sh
```

加入 crontab：

```bash
crontab -e
```

每天凌晨 2 点备份：

```cron
0 2 * * * /home/你的用户名/backup_erpnext.sh >> /home/你的用户名/backup_erpnext.log 2>&1
```

## 9. 异地备份

本机备份不够安全。

至少再做一份异地备份：

- 阿里云 OSS
- 腾讯云 COS
- AWS S3
- Backblaze B2
- 另一台服务器
- NAS

推荐用 `rclone` 同步：

```bash
rclone sync /backup/erpnext remote:erpnext-backups --transfers 4 --checkers 8
```

可以加到备份脚本最后：

```bash
rclone sync /backup/erpnext remote:erpnext-backups
```

## 10. 推荐保留策略

建议：

- 每日备份，保留最近 30 天
- 每周备份，保留最近 12 周
- 每月备份，保留最近 12 个月
- 每次升级 ERPNext 或 shop_assistant 前，额外手动备份一次

升级前必须执行：

```bash
bench --site erp.yourdomain.com backup --with-files --compress
```

## 11. 恢复演练

备份没有做过恢复测试，就不能算真正安全。

建议每个月找一台测试服务器恢复一次。

恢复数据库：

```bash
bench --site test.yourdomain.com restore /path/to/database.sql.gz
```

恢复文件：

```bash
bench --site test.yourdomain.com restore /path/to/database.sql.gz \
  --with-public-files /path/to/public-files.tar \
  --with-private-files /path/to/private-files.tar
```

恢复后检查：

- 能不能登录
- 商品图片是否存在
- 订单附件是否存在
- 打印模板是否正常
- 权限是否正常
- 微信绑定是否还在

## 12. 服务器安全配置

正式服务器建议：

- 只开放 80、443、SSH 必要端口。
- SSH 禁止密码登录，使用密钥。
- ERPNext 必须使用 HTTPS。
- MariaDB、Redis 不暴露到公网。
- `site_config.json` 不提交到 Git。
- 微信 AppSecret 不提交到 Git。
- 定期更新系统安全补丁。
- 老板/System Manager 开启强密码。
- 离职人员立即禁用 ERPNext User 和微信绑定。

## 13. 数据库快照

如果使用云服务器，建议同时开启云盘快照。

快照不能替代 ERPNext 备份，但可以作为第二层保护。

推荐：

- 每天 1 次云盘快照
- 保留 7 到 15 天
- 重大升级前手动创建快照

## 14. 最推荐的安全组合

正式生产环境建议采用四层保护：

```text
第一层：ERPNext bench backup --with-files --compress
第二层：异地对象存储 rclone / OSS / COS / S3
第三层：云服务器磁盘快照
第四层：每月恢复演练
```

这样即使出现服务器损坏、误删除、升级失败、数据库损坏，也可以恢复。

