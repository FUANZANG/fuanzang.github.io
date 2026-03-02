# 动态表单渲染

## 核心概念

### JSON Schema 驱动

+ 用 JSON 描述表单结构（字段类型、校验规则、布局）
+ 运行时根据 schema 渲染出真实表单
+ 好处：后端可配置、前端零代码、跨端复用

### 配置化 vs 代码化

+ 配置化：JSON/YAML → 表单（低代码平台常用）
+ 代码化：JSX/模板 → 表单（传统开发）
+ 混合：核心配置化，复杂字段自定义组件

## 架构设计

### 核心模块

```
┌──────────────────────────────────┐
│         Form Renderer            │
│  ┌────────┐  ┌────────┐         │
│  │ Schema │  │ Widget │         │
│  │ Parser │→ │ Registry│        │
│  └───┬────┘  └───┬────┘         │
│      └─────┬─────┘              │
│       ┌────▼────┐               │
│       │ Layout  │               │
│       │ Engine  │               │
│       └─────────┘               │
└──────────────────────────────────┘
```

### Schema 结构示例

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "姓名",
      "minLength": 2
    },
    "age": {
      "type": "number",
      "title": "年龄",
      "minimum": 0
    },
    "hobby": {
      "type": "array",
      "title": "爱好",
      "items": {
        "type": "string",
        "enum": ["reading", "sports", "music"]
      }
    }
  },
  "required": ["name"]
}
```

## 关键技术点

### 字段类型映射

+ `string` → Input / Textarea / Select
+ `number` → InputNumber / Slider
+ `boolean` → Switch / Checkbox
+ `array` → 动态列表 / 多选
+ `object` → 嵌套表单 / 分组

### 联动逻辑

+ 字段可见性：`visibleIf` / `hidden` 表达式
+ 字段禁用：`disabled` 条件
+ 值联动：A 字段变化 → B 字段 options 更新
+ 实现：依赖收集 + 响应式更新

  ```js
  // 联动配置示例
  {
    "city": {
      "type": "string",
      "title": "城市",
      "enum": ["beijing", "shanghai"],
      "visibleIf": {
        "country": "china"
      }
    }
  }
  ```

### 校验体系

+ Schema 内置校验：type / min / max / pattern / enum
+ 自定义校验函数
+ 异步校验（服务端验证）
+ 联动校验：A 字段变化 → 重新校验 B

  ```js
  // 自定义校验
  {
    "password": {
      "type": "string",
      "title": "密码",
      "validator": (value, formData) => {
        if (value !== formData.confirmPassword) {
          return '两次密码不一致'
        }
        return null
      }
    }
  }
  ```

### 布局系统

+ 栅格布局（row / col）
+ 分组/折叠（fieldset / collapse）
+ 步骤表单（wizard）
+ 响应式布局（移动端适配）

  ```json
  {
    "layout": {
      "type": "grid",
      "columns": 2,
      "items": [
        { "field": "name", "span": 1 },
        { "field": "age", "span": 1 },
        { "field": "address", "span": 2 }
      ]
    }
  }
  ```

## 常用库

| 库 | 特点 |
|---|---|
| **Formily** | 阿里出品，JSON Schema + React/Vue，功能最全 |
| **form-render** | 阿里 XRender，JSON Schema → Ant Design 表单 |
| **vue-form-create** | Vue 3 可视化表单设计器 |
| **react-jsonschema-form** | React 生态，JSON Schema 标准实现 |
| **Formio** | 全栈方案，前后端 + 拖拽设计器 |
| **amis** | 百度出品，低代码前端框架 |

## 进阶场景

### 动态增删字段

+ 动态列表（array 类型字段）
+ 条件字段（满足条件才渲染）
+ 运行时修改 schema

  ```js
  // 动态添加字段
  formSchema.properties.newField = {
    type: 'string',
    title: '新字段'
  }
  // 触发重新渲染
  ```

### 自定义组件注册

+ Widget Registry 机制
+ 全局注册 / 局部覆盖
+ 组件 props 透传

  ```js
  // 注册自定义组件
  formEngine.registerWidget('custom-date', {
    component: CustomDatePicker,
    // 默认 props
    defaultProps: {
      format: 'YYYY-MM-DD'
    }
  })
  ```

### 数据转换

+ 表单值 ↔ 提交值格式转换
+ 日期格式化、枚举映射
+ 嵌套对象扁平化

  ```js
  // 值转换示例
  {
    "transform": {
      "submit": (formData) => ({
        ...formData,
        birthday: dayjs(formData.birthday).format('YYYY-MM-DD')
      }),
      "init": (serverData) => ({
        ...serverData,
        birthday: dayjs(serverData.birthday)
      })
    }
  }
  ```

### 性能优化

+ 大表单虚拟滚动
+ 字段懒渲染（visible 时才挂载）
+ 校验防抖

### 表单设计器（可视化）

+ 拖拽生成 schema
+ 属性面板配置字段
+ 预览 + 导出 schema JSON
+ 常用：formily-designer / vue-form-create

## 选型建议

| 场景 | 推荐方案 |
|---|---|
| Vue + Ant Design | form-render |
| Vue + 复杂联动 | Formily |
| React 生态 | react-jsonschema-form |
| 低代码平台 | amis / Formio |
| 轻量定制 | 自己实现（Schema Parser + Widget Registry） |
