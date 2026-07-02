"""Reply builder output schema.

Corresponding OpenSpec: openspec/changes/add-reply-builder-to-chat-pipeline/specs/reply-builder/spec.md
Corresponding in_scope ID: workflow-orchestration
"""

from pydantic import BaseModel, Field


class ReplyBuilderOutput(BaseModel):
    """reply_builder 节点的结构化输出"""

    reply: str = Field(..., description="面向用户的口语化自然语言回复")
    reasoning: str = Field("", description="模型思考过程")
