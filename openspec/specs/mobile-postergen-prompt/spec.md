---
capability: mobile-postergen-prompt
name: 移动端产品海报 prompt 模板
description: 移动端工作台①对话屏的产品海报快捷填充模板
---

## Purpose

提供移动端工作台①对话屏快捷工具栏中"产品海报"按钮的 prompt 模板行为：将结构化海报 prompt 模板填入输入框，用户替换占位参数后发送。

## Requirements

### Requirement: 系统 SHALL 提供产品海报 prompt 模板快捷填充

用户点击"产品海报"按钮时，系统 SHALL 将结构化海报 prompt 模板填入输入框。

#### Scenario: 填入海报模板
- **WHEN** 用户点击"产品海报"按钮
- **THEN** 输入框 SHALL 更新为：`帮我生成一张【产品名】的产品海报图片，颜色/材质为【颜色/材质】，背景为【背景】，光线为【光线】`

#### Scenario: 模板可编辑
- **WHEN** 模板填入后用户修改 `【产品名】` 为实际产品名称
- **AND** 用户点击发送
- **THEN** 后端 SHALL 通过 intent recognition 识别为 `text_to_image` 意图
