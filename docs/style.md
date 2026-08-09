
## Luming 预置的 css 缩写

| 缩写 | 说明   | 对应 CSS 属性      | 后继数值字符串              |
| ---- | ------ | ------------------ | --------------------------- |
| `bg` | 背景色 | `background-color` | css 颜色代码                |
| `rd` | 圆角   | `border-radius`    | 如果没有单位，会自动添加 px |

没有 `bd` 缩写，因为 Luming 在预览模式下会自动为每个主体添加边框以便于区分主体的层级关系，如果用户需要自定义边框样式，可以直接使用 CSS 样式修饰语法，例如：`A: border 1px solid #000;`。

## Luming 预置的样式类

`tab` / `card` / `label` 三个预置类会展开为具体的 CSS 属性。它们可以与 `bg`、`rd` 等缩写组合使用，后定义的属性会覆盖预置类的同名属性。

### `:tab;` — 标签/胶囊

```css
{
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 9999px;
    background-color: #f1f5f9;
    color: #334155;
}
```

### `:card;` — 卡片

```css
{
    display: block;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### `:label;` — 标签文字

```css
{
    display: inline-block;
    padding: 2px 8px;
    border: 1px solid #c7d2fe;
    border-radius: 4px;
    background-color: #eef2ff;
    color: #3730a3;
    font-size: 12px;
}
```
