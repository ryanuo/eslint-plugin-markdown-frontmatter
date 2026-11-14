import type { FieldType, SchemaConfig } from './schema'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'

export interface FromInterfaceOptions {
  /**
   * 覆盖或追加字段，优先级最高。
   *
   * 类型定义里 `date: string` 在 TS 层面只是字符串，但 frontmatter 语义上是日期
   * （YAML 不带引号的 `2023-05-30` 会被解析成 `Date` 对象），这类"类型系统看不出
   * 来的语义"用 overrides 显式声明：
   *
   * ```js
   * fromInterface('typings/global.d.ts', 'FrontmatterPostType', {
   *   overrides: { date: { required: true, type: 'date' } },
   * })
   * ```
   */
  overrides?: SchemaConfig
}

type TypeScript = typeof import('typescript')
type TsNode = import('typescript').Node

/**
 * 解析 TypeScript 需要 `typescript` 包。它体量大，不作为 dependencies 硬依赖，
 * 而是运行时按需从"当前项目"解析；拿不到时给出可执行的提示。
 */
function loadTypeScript(): TypeScript {
  const resolvers = [
    () => createRequire(`${process.cwd()}/package.json`),
    () => createRequire(import.meta.url),
  ]

  for (const resolveRequire of resolvers) {
    try {
      return resolveRequire()('typescript') as TypeScript
    }
    catch {}
  }

  throw new Error(
    '[markdown-frontmatter] `fromInterface()` 需要 typescript 包，请先安装：'
    + '`npm i -D typescript`（或 pnpm add -D typescript）。'
    + ' 也可以改用对象形式的 schema：`{ title: { required: true, type: \'string\' } }`。',
  )
}

/**
 * 把 TS 类型节点映射成 frontmatter 的字段类型。
 * 返回 null 表示"类型系统层面无法判断"，由调用方报错并建议用 overrides。
 */
function nodeToFieldType(ts: TypeScript, node: TsNode): FieldType | null {
  if (ts.isParenthesizedTypeNode(node))
    return nodeToFieldType(ts, node.type)

  // 字面量联合（'a' | 'b'）按字符串处理
  if (ts.isLiteralTypeNode(node))
    return 'string'

  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return 'string'
    case ts.SyntaxKind.NumberKeyword:
      return 'number'
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean'
  }

  if (ts.isArrayTypeNode(node) || ts.isTupleTypeNode(node))
    return 'array'

  if (ts.isTypeLiteralNode(node))
    return 'object'

  if (ts.isUnionTypeNode(node)) {
    const inner = node.types
      .filter(t => t.kind !== ts.SyntaxKind.UndefinedKeyword
        && t.kind !== ts.SyntaxKind.NullKeyword)
      .map(t => nodeToFieldType(ts, t))
      .filter((t): t is FieldType => t !== null)

    if (inner.length === 0)
      return null

    // `Date | string` → date（date 校验本身就接受可解析的字符串）
    if (inner.includes('date') && inner.every(t => t === 'date' || t === 'string'))
      return 'date'

    return inner[0]
  }

  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName.getText()

    if (name === 'Array' || name === 'ReadonlyArray')
      return 'array'
    if (name === 'Date')
      return 'date'
    if (name === 'Record')
      return 'object'

    // 自定义类型（如 `Tag[]` 的 `Tag`）无法判断结构
    return null
  }

  return null
}

/** `'foo-bar'` / `foo` 统一取裸字段名 */
function fieldNameOf(ts: TypeScript, node: TsNode): string {
  const name = (node as import('typescript').PropertySignature).name
  const text = name.getText()
  return text.replace(/^['"`]|['"`]$/g, '')
}

/**
 * 从 TypeScript 类型定义（`interface` 或 `type X = {...}`）生成 schema。
 *
 * - 字段是否必填 → 依据是否有 `?`
 * - 支持 `string` / `number` / `boolean` / `T[]` / `Array<T>` / `Record` / `Date` / 字面量联合
 * - 无法映射的类型会**显式抛错**，而不是静默跳过——静默跳过会让 `strict` 把它
 *   当成"未知字段"报错，反而更难排查
 *
 * @example
 * ```js
 * import { fromInterface } from 'eslint-plugin-markdown-frontmatter'
 *
 * const schema = fromInterface('typings/global.d.ts', 'FrontmatterPostType')
 * ```
 */
export function fromInterface(
  filePath: string,
  interfaceName: string,
  options: FromInterfaceOptions = {},
): SchemaConfig {
  const ts = loadTypeScript()
  const absolutePath = resolve(process.cwd(), filePath)
  const source = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )

  let members: readonly TsNode[] | null = null

  const visit = (node: TsNode): void => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      members = node.members
      return
    }

    if (
      ts.isTypeAliasDeclaration(node)
      && node.name.text === interfaceName
      && ts.isTypeLiteralNode(node.type)
    ) {
      members = node.type.members
      return
    }

    node.forEachChild(visit)
  }

  visit(source)

  if (!members) {
    throw new Error(
      `[markdown-frontmatter] 在 ${filePath} 中找不到 \`${interfaceName}\` 接口（或 \`type ${interfaceName} = { ... }\`）。`,
    )
  }

  const schema: SchemaConfig = {}

  for (const member of members as readonly TsNode[]) {
    if (!ts.isPropertySignature(member) || !member.name)
      continue

    const field = fieldNameOf(ts, member)
    const type = member.type ? nodeToFieldType(ts, member.type) : null

    if (!type) {
      throw new Error(
        `[markdown-frontmatter] 字段 \`${field}\` 的类型 \`${member.type?.getText() ?? 'any'}\` 无法自动映射。`
        + ` 请用 overrides 显式指定，例如：\`{ ${field}: 'string' }\`。`,
      )
    }

    schema[field] = { required: !member.questionToken, type }
  }

  return { ...schema, ...options.overrides }
}
