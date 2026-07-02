## Context

在营销方案生成流程中，产品调研 Agent 回答"产品是什么"，人群洞察 Agent 回答"谁会买它"。两者独立调用但有关联——人群洞察 Agent 依赖于产品名称（及可选的产品调研结果）作为输入。

输出分两层：
1. **人群调研原始数据**（mock_data/audience_insight/）——从网上搜到的人群信息原文提炼
2. **用户画像**（mock_data/user_persona/）——综合多个来源生成的偏产品画像

## Goals / Non-Goals

**Goals:**
- 实现人群信息调研（搜索→提取→保存到 audience_insight/）
- 实现用户画像生成（综合产品+市场+人群数据→保存到 user_persona/）
- 提供 REST API 端点
- 数据分层存储

**Non-Goals:**
- 不涉及真实用户隐私数据（只从公开报告/文章提取）
- 不涉及平台自有用户数据
- 不生成营销方案（只产出用户画像素材）

## Data Model

### 人群调研原始数据（AudienceRawData）

```python
class PurchaseMotivation(BaseModel):
    motivation: str
    source: str

class DecisionFactor(BaseModel):
    factor: str
    source: str

class UsageScenario(BaseModel):
    scenario: str
    source: str

class UserDescription(BaseModel):
    text: str
    source: str

class AudienceRawData(BaseModel):
    demographics: dict = Field(default_factory=dict)
    purchase_motivations: list[PurchaseMotivation] = Field(default_factory=list)
    decision_factors: list[DecisionFactor] = Field(default_factory=list)
    usage_scenarios: list[UsageScenario] = Field(default_factory=list)
    descriptions: list[UserDescription] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
```

### 用户画像（UserPersona）

```python
class SourcedStr(BaseModel):
    value: str | None = None
    sources: list[str] = Field(default_factory=list)
    method: str = "extracted"  # quoted/extracted/inferred
    quote: str | None = None

class FeaturePreference(BaseModel):
    feature: str
    importance: str
    evidence: list[str] = Field(default_factory=list)

class UserPersona(BaseModel):
    profile_summary: SourcedStr
    typical_user: SourcedStr
    demographics: dict = Field(...)  # 含 SourcedStr
    purchase_motivation: dict = Field(...)
    product_usage: dict = Field(...)
    lifestyle: dict = Field(...)
    product_fit: dict = Field(...)
```

## Agent 流程

```
用户输入 "iPhone 16"
      │
      ▼
┌──────────────────────────────────────────────┐
│ Step 1: 搜索并提取人群数据                     │
│  WebSearch("iPhone 16 用户画像/用户群体/报告") │
│  → 提取到 AudienceRawData                     │
│  → 存入 mock_data/audience_insight/           │
└──────────────────┬───────────────────────────┘
                   ▼
┌──────────────────────────────────────────────┐
│ Step 2: 生成用户画像                          │
│  综合产品调研结果 + 人群调研数据                │
│  → LLM 生成 UserPersona                       │
│  → 存入 mock_data/user_persona/               │
└──────────────────┬───────────────────────────┘
                   ▼
             返回完整结果
```

## Decisions

### 1. 两层结构（原始数据 + 画像分离）
- **选择**：人群调研原始数据放 audience_insight/，用户画像放 user_persona/
- **理由**：原始数据可以复用（多个产品共享同类人群），画像需要综合更多信息
- **替代方案**：合并为一个文件——失去灵活性

### 2. 独立 API 端点
- **选择**：POST /api/v1/audience-insight
- **理由**：与产品调研 Agent 独立调用

## Risks

| Risk | Mitigation |
|------|-----------|
| 中文产品的人群报告搜索结果有限 | 中英文混合搜索 |
| inferred 方法可能被误用于编造数据 | 要求 inferred 必须注明推断依据来源 |
