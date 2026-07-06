"""并行调研 Pipeline CLI — 测试产品调研、市场分析、人群搜索并行执行 + 用户画像生成。

用法:
    cd backend
    uv run python tests/test_agents/test_parallel_pipeline_cli.py "Nike" "运动鞋" "上海"
    uv run python tests/test_agents/test_parallel_pipeline_cli.py
"""

import asyncio
import json
import os
import sys
import time

# 确保可以从项目根目录导入
_this_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.join(_this_dir, "..", "..")
sys.path.insert(0, os.path.abspath(_backend_dir))


async def main():
    if len(sys.argv) >= 4:
        brand_name, category, city = sys.argv[1], sys.argv[2], sys.argv[3]
    elif len(sys.argv) == 2:
        brand_name = sys.argv[1]
        category = input("请输入品类 (如 运动鞋/饮料): ").strip() or "运动"
        city = input("请输入城市 (如 上海/北京): ").strip() or "上海"
    else:
        brand_name = input("请输入品牌名称: ").strip()
        category = input("请输入品类 (如 运动鞋/饮料): ").strip() or "运动"
        city = input("请输入城市 (如 上海/北京): ").strip() or "上海"

    if not brand_name:
        print("品牌名称不能为空")
        return

    brand_input = {"brand_name": brand_name, "category": category, "city": city}

    print(f"\n{'='*60}")
    print(f"并行调研 Pipeline")
    print(f"{'='*60}")
    print(f"  品牌: {brand_name}")
    print(f"  品类: {category}")
    print(f"  城市: {city}")
    print(f"{'='*60}\n")

    print("阶段 1: 并行调研 (product_research + market_research + audience_search)")
    print("  三个 Agent 同时开始...\n")

    from app.services.plan_generation_service import start_run

    t0 = time.time()
    parallel_done = set()

    async for event_str in start_run(brand_input):
        lines = event_str.strip().split("\n")
        event_type = ""
        data = {}
        for line in lines:
            if line.startswith("event: "):
                event_type = line[7:]
            elif line.startswith("data: "):
                try:
                    data = json.loads(line[6:])
                except json.JSONDecodeError:
                    pass

        node_id = data.get("node_id", "")
        elapsed = time.time() - t0

        if event_type == "node.start":
            label = data.get("label", node_id)
            marker = " ← 并行" if node_id in ("product_research", "market_research", "audience_search") else ""
            print(f"  [{elapsed:5.1f}s] ▶ {label}{marker}")

        elif event_type == "node.log":
            msg = data.get("message", "")
            print(f"  [{elapsed:5.1f}s]   {msg}")

        elif event_type == "node.complete":
            label = node_id
            keys = list(data.get("data", {}).keys())[:4]
            print(f"  [{elapsed:5.1f}s] ✓ {label} 完成 → {keys}")

            if node_id in ("product_research", "market_research", "audience_search"):
                parallel_done.add(node_id)
                if len(parallel_done) == 3:
                    print(f"\n  三个调研全部完成! 耗时 {elapsed:.1f}s")
                    print(f"\n阶段 2: 串行执行后续节点\n")

        elif event_type == "node.failed":
            error = data.get("error", "未知错误")
            print(f"  [{elapsed:5.1f}s] ✗ {node_id} 失败: {error}")
            print(f"\n Pipeline 中断!")
            return

        elif event_type == "workflow.complete":
            total = time.time() - t0
            print(f"\n{'='*60}")
            print(f"Pipeline 完成! 总耗时 {total:.1f}s")
            print(f"{'='*60}")

            outputs = data.get("outputs", {})
            print(f"\n各节点输出:")
            for k, v in outputs.items():
                if isinstance(v, dict):
                    keys = list(v.keys())[:5]
                    print(f"  {k}: {keys}")
                else:
                    print(f"  {k}: {type(v).__name__}")

    # 检查 mock_data 文件
    from pathlib import Path
    print(f"\nmock_data 文件检查:")
    checks = [
        ("product_info", brand_name),
        ("market_analysis", brand_name),
        ("audience_insight", brand_name),
        ("user_persona", brand_name),
    ]
    import re
    for folder, name in checks:
        safe = re.sub(r'[^\w一-鿿]+', "_", name).strip("_").lower()
        path = Path("mock_data") / folder / f"{safe}.json"
        if path.exists():
            size = path.stat().st_size
            print(f"  ✓ {folder}/{safe}.json ({size} bytes)")
        else:
            print(f"  ✗ {folder}/{safe}.json 不存在")


if __name__ == "__main__":
    asyncio.run(main())
