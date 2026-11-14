# eslint-plugin-markdown-frontmatter

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

用 schema 校验 Markdown frontmatter 的 ESLint 规则。

- **必填校验**：声明为 `required` 的字段缺失时报错
- **类型校验**：`string` / `number` / `boolean` / `array` / `object` / `date`
- **未知字段**（`strict`）：拼错的键也能抓到，并给出 `did you mean` 建议
- **报错位置精确**：类型错标在**字段值**上、缺字段标在开围栏 `---` 上、未知字段标在**键**上，编辑器里下划线位置与代码一致
- **schema 可来自 TS 类型**：`fromInterface()` 直接读 `.d.ts`，不用手抄字段表

## Install

```bash
pnpm i -D eslint-plugin-markdown-frontmatter @eslint/markdown
```

> 用 `@antfu/eslint-config` 的话 `@eslint/markdown` 已内置，只装插件即可。

## Quick Start

### 1. 开启 frontmatter 解析（最关键的一步）

`@eslint/markdown` 默认 **不解析** frontmatter（`frontmatter: false`）。不开这个选项，AST 里根本没有 `yaml` 节点，规则**永远不会触发**——表现为"配了但完全不报错"。

```js
// eslint.config.js
import markdown from '@eslint/markdown'
import frontmatter from 'eslint-plugin-markdown-frontmatter'

export default [
  {
    files: ['**/*.md'],
    language: 'markdown/gfm',
    // ⚠️ 必须显式开启，否则规则静默不生效
    languageOptions: {
      frontmatter: 'yaml',
    },
    plugins: {
      markdown,
      'markdown-frontmatter': frontmatter,
    },
    rules: {
      'markdown-frontmatter/format': ['error', {
        schema: {
          title: { required: true, type: 'string' },
          date: { required: false, type: 'date' },
        },
      }],
    },
  },
]
```

### 2. 准备 schema

直接写对象，或者从 TS 类型生成（见 [schema 从哪来](#schema-从哪来)）。

### 3. 重启编辑器里的 ESLint

改完配置后，VS Code 命令面板执行 **`ESLint: Restart ESLint Server`**。不重启的话编辑器仍用旧配置缓存，会出现"命令行报错、编辑器不报"的情况。

## 配合 `@antfu/eslint-config`

```js
// eslint.config.js
import antfu from '@antfu/eslint-config'
import frontmatter from 'eslint-plugin-markdown-frontmatter'

export default antfu(
  { /* 你的 antfu 选项 */ },

  // antfu 不会帮你开启 frontmatter 解析，必须自己加
  {
    files: ['pages/**/*.md'],
    languageOptions: { frontmatter: 'yaml' },
    plugins: { 'markdown-frontmatter': frontmatter },
  },
  {
    files: ['pages/**/*.md'],
    rules: {
      'markdown-frontmatter/format': ['error', {
        schema: { title: { required: true, type: 'string' } },
        strict: true,
      }],
    },
  },
)
```

按目录区分要求也很常见。下面是一份完整可复制的配置：schema 从 TS 接口生成，文章强制 `date`，列表页 `posts/index.md` 除外。

```js
// eslint.config.js
import antfu from '@antfu/eslint-config'
import frontmatter, { fromInterface } from 'eslint-plugin-markdown-frontmatter'

// 字段来自 typings/global.d.ts 的 FrontmatterPostType
const postSchema = fromInterface('typings/global.d.ts', 'FrontmatterPostType', {
  overrides: { date: { required: true, type: 'date' } },
})

// 页面（首页 / nav 导航）复用同一份，只放宽 date 和 description
const pageSchema = {
  ...postSchema,
  date: 'date',
  description: 'string',
}

export default antfu(
  { /* 你的 antfu 选项 */ },

  {
    files: ['pages/**/*.md'],
    languageOptions: { frontmatter: 'yaml' },
    plugins: { 'markdown-frontmatter': frontmatter },
  },
  {
    files: ['pages/**/*.md'],
    rules: {
      'markdown-frontmatter/format': ['error', { schema: pageSchema, strict: true }],
    },
  },
  {
    // 文章额外要求 date，列表页除外
    files: ['pages/**/posts/**/*.md'],
    ignores: ['pages/**/posts/index.md'],
    rules: {
      'markdown-frontmatter/format': ['error', { schema: postSchema, strict: true }],
    },
  },
)
```

## 报错长什么样

```text
pages/zh/posts/hello.md
  1:1  error  Frontmatter must contain a `title` field                    markdown-frontmatter/format
  2:8  error  Field `title` must be of type `string`, but got `number`   markdown-frontmatter/format
  4:1  error  Unknown frontmatter field `catess`, did you mean `cate`?   markdown-frontmatter/format
```

| 问题 | 标在哪 |
| --- | --- |
| 必填字段缺失 | 开围栏 `---`（`1:1`，3 个字符宽） |
| 类型不匹配 | 字段**值**上（`title: 123` 精确标红 `123`；值不存在时退化为标键） |
| 未知字段（`strict`） | 字段**键**上（`catess` 正好 6 个字符） |

行/列已按 1 基对齐到 Markdown 文件，VS Code 里标红位置与源码一致。**0.0.4 及更早版本有定位 bug（零宽区间 + 列偏移），升级到 0.0.5+ 才准。**

## schema 从哪来

### 方式一：直接写对象

字段名 → 类型字符串，或 `{ type, required }`。

```js
/** @type {import('eslint-plugin-markdown-frontmatter').SchemaConfig} */
const schema = {
  title: { required: true, type: 'string' }, // 只有必填项需要展开
  cate: 'string',
  date: 'date',
  tags: 'array',
  titleStyle: 'object',
}
```

> 字符串简写**不代表必填**。`'string'` 只约束类型，字段不写也不会报；要校验存在性必须用 `{ required: true, type: '...' }`。

适合：字段少（< 5 个）、或字段结构跟 TS 类型对不上。

### 方式二：`createSchema()`，用数组表示可选

```js
import { createSchema } from 'eslint-plugin-markdown-frontmatter'

const schema = createSchema({
  title: 'string', // 裸字符串 → required: true
  cate: ['string'], // 套一层数组 → required: false
  date: ['date'],
})
```

> ⚠️ 默认值方向与方式一**正好相反**：这里不写 `[]` 就是必填。两种写法别混用，容易看错。

### 方式三：`generateSchema<T>()`，编译期校验映射关系

```ts
import { generateSchema } from 'eslint-plugin-markdown-frontmatter'

interface Frontmatter {
  title: string
  cate?: string
  tags?: string[]
}

export const schema = generateSchema<Frontmatter>({
  title: 'string',
  cate: 'string',
  tags: 'array',
  // 类型不匹配、字段名拼错都会在编译期报错
})
```

适合：TS 项目，想保留一层"手写映射"但希望有类型约束。注意它**仍需手写字段表**，只是多了编译期检查。

### 方式四：`fromInterface()`，直接读 TS 类型（推荐）

不用抄字段表，字段增删只改类型定义：

```ts
// typings/global.d.ts
interface FrontmatterPostType {
  title: string // 无 ? → required: true
  description: string
  date: string
  tags?: string[] // 有 ? → required: false
  titleStyle?: { fontFamily?: string, opacity?: number }
}
```

```js
import { fromInterface } from 'eslint-plugin-markdown-frontmatter'

const postSchema = fromInterface('typings/global.d.ts', 'FrontmatterPostType', {
  // 类型系统看不出的语义用 overrides 补：date 在 TS 里只是 string，
  // 但 YAML 里不带引号的 2023-05-30 会被解析成 Date 对象
  overrides: { date: { required: true, type: 'date' } },
})

export default [{ rules: { 'markdown-frontmatter/format': ['error', { schema: postSchema }] } }]
```

- **依赖 `typescript`**：运行时从当前项目解析，拿不到会提示 `npm i -D typescript`
- 只用 `ts.createSourceFile` 解析语法树、**不做类型检查**，所以项目自身有 TS 报错也能用
- 支持 `interface` 和 `type X = { ... }`；支持 `string` / `number` / `boolean` / `T[]` / `Array<T>` / `Record` / `Date` / 字面量联合 / `Date | string`
- 无法映射的类型（如自定义 `Tag`）会**直接抛错**并提示用 `overrides` 指定，不会静默跳过
- 改类型定义即生效，不需要额外的生成步骤

### 方式五：`fromJsonSchema()`，吃标准 JSON Schema

类型定义复杂时（继承、泛型、跨文件引用），交给成熟工具生成 JSON Schema，插件只做最后一步映射：

```bash
# TS 接口 → JSON Schema；周下载 150 万，支持继承 / 泛型 / 交叉类型
npx ts-json-schema-generator \
  --path 'typings/**/*.d.ts' \
  --type FrontmatterPostType \
  --no-top-ref \
  --no-type-check > frontmatter.schema.json
```

```js
import { fromJsonSchema } from 'eslint-plugin-markdown-frontmatter'
import schema from './frontmatter.schema.json' with { type: 'json' }

const frontmatterSchema = fromJsonSchema(schema)

export default [{ rules: { 'markdown-frontmatter/format': ['error', { schema: frontmatterSchema }] } }]
```

能吃这些工具的产物：`ts-json-schema-generator`、`typescript-json-schema`、`zod`（`z.toJSONSchema()`）、`typebox`。

支持顶层 `$ref`（`#/definitions/X`、`#/$defs/X`）、`format: date` / `date-time`、`anyOf` / `oneOf` / `allOf`、`enum`。

> `--no-type-check` 用于跳过项目自身的 TS 报错；如果你的项目 TS 是干净的，可以去掉。

### 怎么选

| 情况 | 用哪个 |
| --- | --- |
| 已有 TS 接口，字段定义简单 | `fromInterface()` |
| 类型定义复杂（继承 / 泛型 / 跨文件） | `fromJsonSchema()` + `ts-json-schema-generator` |
| 用 zod 定义数据结构 | `fromJsonSchema()` + `z.toJSONSchema()` |
| 字段很少、或要临时试 | 直接写对象 |
| 想要编译期检查映射关系 | `generateSchema<T>()` |

## Options

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `schema` | `object` | `{ title: { required: true, type: 'string' } }` | 字段名 → 类型字符串，或 `{ type, required }` |
| `strict` | `boolean` | `false` | 开启后 schema 未声明的字段也报错，并给拼写建议 |

### 字段类型

| type | 说明 |
| --- | --- |
| `string` / `number` / `boolean` | 基础标量 |
| `array` | YAML 序列，`[a, b]` 或 `- a` 均可 |
| `object` | YAML 映射 |
| `date` | `Date` 对象，或 `Date.parse` 可解析的字符串（如 `2023-05-30 16:47:08`） |

### `strict`

```js
export default [{
  rules: {
    'markdown-frontmatter/format': ['error', {
      schema: { title: 'string', cate: 'string' },
      strict: true, // 拼错字段名也能被抓到
    }],
  },
}]
```

开启后，frontmatter 里出现 schema 未声明的键就报错；用 Levenshtein 距离找最近的已知字段，命中阈值时提示 `did you mean`，否则只报 `Unknown frontmatter field`。

配了 `strict` 就必须把**所有**会出现的字段写进 schema，否则正常字段会被当成未知字段报错。

## API

```js
import {
  createSchema, // (fields) => SchemaConfig
  fromInterface, // (filePath, interfaceName, options?) => SchemaConfig
  fromJsonSchema, // (jsonSchema, options?) => SchemaConfig
  generateSchema, // <T>(fields) => SchemaConfig
} from 'eslint-plugin-markdown-frontmatter'
```

### `fromInterface(filePath, interfaceName, options?)`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `filePath` | `string` | 相对 `process.cwd()` 的路径，如 `typings/global.d.ts` |
| `interfaceName` | `string` | 接口或类型别名名，如 `FrontmatterPostType` |
| `options.overrides` | `SchemaConfig` | 覆盖或追加字段，优先级最高 |

### `fromJsonSchema(jsonSchema, options?)`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `jsonSchema` | `object` | 标准 JSON Schema，顶层可以是 object 或 `{ $ref }` |
| `options.overrides` | `SchemaConfig` | 覆盖或追加字段，优先级最高 |

## 常见问题

**配了却完全不报错 / 编辑器不标红**

1. `languageOptions.frontmatter: 'yaml'` 开了吗？不开规则不会触发
2. 文件是否命中 `files` 且确实有 frontmatter？
3. 改完配置有没有 `ESLint: Restart ESLint Server`？

**标红位置对不上（偏左一格、或者只出现一个看不见的光标位）**

0.0.4 及更早版本的已知 bug（零宽区间 + 列偏移），升级到 0.0.5+。

**拼错的字段名不报错**

schema 之外的键默认放行，需要开 `strict: true`。

**`fromInterface` 报找不到 typescript**

```bash
pnpm i -D typescript
```

插件会从当前项目解析 `typescript`，作为可选依赖处理（不打包进产物）。

**某个字段提示"类型无法自动映射"**

TS 里的自定义类型（如 `Tag`）无法判断结构，用 `overrides` 显式指定：

```js
fromInterface('typings/global.d.ts', 'FrontmatterPostType', {
  overrides: { tags: 'array' },
})
```

**`date` 字段明明是 `string`，为什么还要 override 成 `date`？**

YAML 里不加引号的 `2023-05-30` 会被解析成 `Date` 对象，而 TS 类型里它只是 `string`。用 `type: 'date'` 才能同时接受两种写法；否则会误报类型错误。

## License

[MIT](./LICENSE) License © [ryanuo](https://github.com/ryanuo)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/eslint-plugin-markdown-frontmatter?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/eslint-plugin-markdown-frontmatter
[npm-downloads-src]: https://img.shields.io/npm/dm/eslint-plugin-markdown-frontmatter?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/eslint-plugin-markdown-frontmatter
[bundle-src]: https://img.shields.io/bundlephobia/minzip/eslint-plugin-markdown-frontmatter?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=eslint-plugin-markdown-frontmatter
[license-src]: https://img.shields.io/github/license/ryanuo/eslint-plugin-markdown-frontmatter.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/ryanuo/eslint-plugin-markdown-frontmatter/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/eslint-plugin-markdown-frontmatter
