# ERPNext 运行 Shop Assistant 自定义 App 指南

这份文档用于把本仓库里的 Frappe 自定义 App 运行在 ERPNext 里。

当前自定义 App 路径：

```text
frappe_apps/shop_assistant
```

注意：不要直接对本仓库根目录执行 `bench get-app https://github.com/MolsonHuang/ShopAssistant.git`。因为 Frappe App 不在仓库根目录，而是在 `frappe_apps/shop_assistant` 子目录里。正确做法是先克隆仓库，再用本地路径安装这个子目录。

## 推荐服务器

推荐使用一台全新的 Linux 服务器：

- Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS
- 2 核 CPU 起步，推荐 4 核
- 4 GB 内存起步，推荐 8 GB
- 40 GB 磁盘起步
- 使用域名和 HTTPS，方便手机扫码、相机、文件上传

不推荐直接在 Windows 服务器裸机部署 ERPNext。Windows 更适合用 WSL2 或 Docker，但正式环境建议 Linux。

## 1. 安装 Frappe Bench

先按 Frappe 官方方式安装 Bench、MariaDB、Redis、Node、Yarn、wkhtmltopdf、Nginx、Supervisor 等依赖。

如果服务器是新机器，可以参考 Frappe 官方 Production Setup：

```text
https://docs.frappe.io/framework/v14/user/en/production-setup
```

Bench 基础命令参考：

```text
https://docs.frappe.io/framework/v15/user/en/tutorial/install-and-setup-bench
```

安装完成后确认：

```bash
bench --version
```

## 2. 初始化 bench

以下示例使用 ERPNext/Frappe v15：

```bash
bench init frappe-bench --frappe-branch version-15
cd frappe-bench
```

## 3. 创建 ERPNext 站点

把 `shop.example.com` 换成你的域名或站点名：

```bash
bench new-site shop.example.com
```

执行时会要求你输入 MariaDB root 密码，并设置 ERPNext 的 Administrator 密码。

## 4. 安装 ERPNext

```bash
bench get-app erpnext --branch version-15
bench --site shop.example.com install-app erpnext
```

## 5. 拉取本项目

建议把本项目放在 `/opt` 或你的用户目录：

```bash
cd /opt
sudo git clone https://github.com/MolsonHuang/ShopAssistant.git
sudo chown -R $USER:$USER /opt/ShopAssistant
```

如果你不用 `/opt`，也可以放在：

```bash
~/ShopAssistant
```

## 6. 安装 Shop Assistant 自定义 App

回到 bench 目录：

```bash
cd ~/frappe-bench
```

如果项目放在 `/opt/ShopAssistant`：

```bash
bench get-app /opt/ShopAssistant/frappe_apps/shop_assistant
bench --site shop.example.com install-app shop_assistant
bench --site shop.example.com migrate
bench build
```

如果项目放在用户目录：

```bash
bench get-app ~/ShopAssistant/frappe_apps/shop_assistant
bench --site shop.example.com install-app shop_assistant
bench --site shop.example.com migrate
bench build
```

## 7. 开发模式启动

如果只是测试，可以直接：

```bash
bench start
```

访问：

```text
http://服务器IP:8000
```

用户名：

```text
Administrator
```

密码是 `bench new-site` 时设置的 Administrator 密码。

## 8. 生产模式启动

正式服务器建议配置 Nginx 和 Supervisor：

```bash
sudo bench setup production $USER
```

然后：

```bash
sudo supervisorctl restart all
sudo service nginx reload
```

如果绑定域名，还需要配置 DNS，把域名解析到服务器 IP。

## 9. 安装后检查

进入 ERPNext 后，在搜索框里查这些 DocType：

- Shop Product
- Shop Order
- Shop Order Item
- Shop Table Template
- Shop Delivery Task
- Shop Delivery Task Item
- Shop Supplier Production Order
- Shop Role Profile

如果能搜到，说明自定义 App 已经安装成功。

也可以在服务器上执行：

```bash
bench --site shop.example.com list-apps
```

应该看到：

```text
frappe
erpnext
shop_assistant
```

## 10. 后续更新

更新本仓库：

```bash
cd /opt/ShopAssistant
git pull
```

更新 bench 里的自定义 App：

```bash
cd ~/frappe-bench
bench get-app /opt/ShopAssistant/frappe_apps/shop_assistant --overwrite
bench --site shop.example.com migrate
bench build
sudo supervisorctl restart all
```

如果 `bench get-app --overwrite` 不适合当前 bench 版本，也可以直接更新 bench 里的 app：

```bash
cd ~/frappe-bench/apps/shop_assistant
git pull
cd ~/frappe-bench
bench --site shop.example.com migrate
bench build
sudo supervisorctl restart all
```

## 11. 备份

正式使用后，必须备份 ERPNext 站点：

```bash
cd ~/frappe-bench
bench --site shop.example.com backup --with-files
```

备份文件通常在：

```text
~/frappe-bench/sites/shop.example.com/private/backups
```

## 12. 当前版本说明

当前 `shop_assistant` 是 ERPNext 自定义 App 的第一版骨架，已经包含业务 DocType、基础权限、A4 打印格式和部分 API。

它可以作为 ERPNext 里的业务模块安装运行，但电脑端类 Excel 页面、手机端卡片录入、扫码登录、复杂权限配置页面、拖拽批量照片分配、Excel 模板导入导出等功能还需要继续在 Frappe/ERPNext 前端里开发。

