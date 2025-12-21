# TypeScript 类型检查响应速度优化

## 问题

修改代码后，红色波浪线没有快速消失，可能是因为：

1. TypeScript 服务器需要时间重新计算类型
2. 复杂的类型定义导致类型检查较慢
3. IDE 缓存问题

## 解决方案

### 1. 重启 TypeScript 服务器

在 VS Code 中：
- 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
- 输入 "TypeScript: Restart TS Server"
- 选择并执行

### 2. 已优化的配置

项目已包含以下优化配置（`.vscode/settings.json`）：

- **文件监听优化**：使用更快的文件系统事件监听
- **排除目录**：排除 `node_modules` 和 `dist` 目录，减少监听文件数量
- **TypeScript 服务器设置**：优化了文件监听策略

### 3. 类型定义优化

已优化类型定义，使其：
- 更简单：减少了复杂的条件类型嵌套
- 更快速：优先检查更具体的类型
- 更灵活：默认允许所有类型，避免过度严格的类型检查

### 4. 手动触发类型检查

如果类型检查仍然较慢，可以：

1. **保存文件**：保存文件会触发类型检查
2. **手动检查**：在命令面板中选择 "TypeScript: Restart TS Server"
3. **重新加载窗口**：`Cmd+R` (Mac) 或 `Ctrl+R` (Windows/Linux)

### 5. 检查 TypeScript 版本

确保使用最新版本的 TypeScript：

```bash
pnpm list typescript
```

如果版本过旧，更新它：

```bash
pnpm update typescript
```

## 类型检查功能

即使响应速度有所提升，类型检查功能仍然完整：

- ✅ **字段存在性检查**：不存在的字段会报错
- ✅ **类型匹配检查**：类型不匹配会报错
- ✅ **智能类型推断**：自动推断允许的字段类型

## 示例

```ts
import { generateSchema } from 'eslint-plugin-markdown-frontmatter'

interface Frontmatter {
  title: string
  date?: string
}

// ✅ 正确配置 - 类型检查通过
const schema = generateSchema<Frontmatter>({
  title: { type: 'string', required: true },
  date: { type: 'date', required: false },
})

// ❌ 错误配置 - 会立即显示类型错误
const errorSchema = generateSchema<Frontmatter>({
  title: { type: 'number', required: true }, // 类型错误
  invalid: { type: 'string', required: true }, // 字段不存在
})
```

## 如果问题仍然存在

1. 检查 VS Code 的 TypeScript 版本是否与项目一致
2. 清除 VS Code 缓存：删除 `.vscode` 文件夹中的缓存
3. 重启 VS Code
4. 检查是否有其他扩展干扰类型检查

