# GistHub - VS Code Extension

VS Code 插件，在编辑器中直接管理你的 GitHub Gist。

## 功能

- **多提供商支持**: 支持 GitHub
- **图形化界面**: 在侧边栏查看和管理所有 Gist
- **虚拟文件系统**: 通过 VS Code 虚拟文件系统直接编辑 Gist 文件
- **完整操作**: 支持创建、编辑、删除 Gist 和文件
- **上传功能**: 支持上传本地文件到 Gist
- **Token 管理**: 安全的 Token 存储和管理

## 安装

### 从 VS Code Marketplace 安装

在 VS Code 扩展商店搜索 "GistHub" 并安装。

### 手动安装

```bash
# 构建扩展
pnpm install
pnpm --filter gisthub-extension build

# 打包
cd packages/extension
pnpm vscode:prepublish
```

然后安装生成的 `.vsix` 文件。

## 使用

### 首次配置

1. 打开 GistHub 侧边栏 (活动栏上的 GistHub 图标)
2. 点击 "管理提供商" 添加你的 GitHub Token
3. 输入你的 Personal Access Token

### 常用操作

| 命令 | 描述 |
|------|------|
| `GistHub: 刷新` | 刷新 Gist 列表 |
| `GistHub: 创建 Gist` | 创建新的 Gist |
| `GistHub: 上传文件` | 上传文件到 Gist |
| `GistHub: 重命名 Gist` | 重命名 Gist |
| `GistHub: 删除 Gist` | 删除 Gist |
| `GistHub: 管理提供商` | 管理认证 Token |

### 配置选项

| 配置项 | 描述 |
|--------|------|
| `gisthub.githubApiProxy` | GitHub API 代理地址 |

## 开发

```bash
# 安装依赖
pnpm install

# 监听模式开发
pnpm --filter gisthub-extension watch

# 在 VS Code 中按 F5 启动调试
```

## 项目结构

```
extension/
├── src/
│   ├── api/                # API 调用 (GitHub API)
│   ├── commands/           # VS Code 命令
│   ├── providers/          # Gist 提供商实现
│   ├── services/           # 服务层
│   ├── store/              # 状态存储
│   ├── views/              # 视图组件
│   ├── extension.ts        # 插件入口
│   └── gistFileSystem.ts   # 虚拟文件系统
├── resources/              # 资源文件 (图标等)
└── package.json
```

## License

MIT License - 详见 [根目录 LICENSE](../../LICENSE)
