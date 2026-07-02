"""人群洞察 Pipeline CLI — 输入产品名称，通过 workflow 自动完成
   产品调研 + 市场分析 + 人群搜索（并行）→ 生成用户画像。"""

import json
import sys

import httpx

API_URL = "http://localhost:8005/api/v1/workflows/audience_insight_pipeline/run"


def main():
    if len(sys.argv) > 1:
        product = " ".join(sys.argv[1:])
    else:
        product = input("请输入产品名称: ").strip()

    if not product:
        print("产品名称不能为空")
        return

    category = input("请输入品类 (如 手机/饮料/汽车，直接回车跳过): ").strip()

    print(f"\n正在通过并行 pipeline 调研 [{product}] ...\n")
    print(f"  产品调研   ← 并行")
    print(f"  市场分析   ← 并行")
    print(f"  人群搜索   ← 并行")
    print(f"  └─→ 用户画像\n")

    payload = {"input": {"product_name": product}}
    if category:
        payload["input"]["category"] = category

    with httpx.Client(timeout=300) as client:
        resp = client.post(API_URL, json=payload)

        if resp.status_code != 200:
            print(f"请求失败: {resp.status_code}")
            print(resp.text[:500])
            return

        data = resp.json()
        outputs = data.get("outputs", {})

        print(f"\n{'='*50}")

        # 产品调研结果
        if "product_research" in outputs:
            pr = outputs["product_research"]
            identity = pr.get("basic", pr).get("identity", pr)
            print(f"\n[产品调研]")
            print(f"  产品名称: {identity.get('product_name', {}).get('value', '?')}")
            print(f"  品牌: {identity.get('brand', {}).get('value', '?')}")
            print(f"  品类: {identity.get('category', {}).get('value', '?')}")

        # 市场分析结果
        if "market_analysis" in outputs:
            ma = outputs["market_analysis"]
            result = ma.get("result", ma)
            print(f"\n[市场分析]")
            print(f"  行业: {result.get('industry', '?')}")
            report = result.get("full_report", "")
            if report:
                print(f"  报告预览: {report[:100]}...")

        # 人群搜索结果
        if "audience_search" in outputs:
            ad = outputs["audience_search"]
            print(f"\n[人群搜索]")
            print(f"  购买动机: {len(ad.get('purchase_motivations', []))} 条")
            print(f"  决策因素: {len(ad.get('decision_factors', []))} 条")
            print(f"  使用场景: {len(ad.get('usage_scenarios', []))} 条")

        # 用户画像
        if "generate_persona" in outputs:
            p = outputs["generate_persona"]
            print(f"\n[用户画像]")
            if p.get("profile_summary"):
                ps = p["profile_summary"]
                print(f"  摘要: {ps.get('value', ps.get('quote', '?'))}")
                print(f"  method: {ps.get('method', '')}")
            if p.get("demographics"):
                print(f"  人口画像: {p['demographics']}")
            if p.get("purchase_motivation"):
                print(f"  购买动机: {list(p['purchase_motivation'].keys())}")

        # 来源信息
        sources_found = []
        if "audience_search" in outputs:
            ad = outputs["audience_search"]
            sources_found = ad.get("sources", [])
        if sources_found:
            print(f"\n信息来源 ({len(sources_found)} 个页面):")
            for s in sources_found:
                print(f"  - {s}")

        print(f"\n{'='*50}")
        print(f"工作流状态: {data.get('status', '?')}")


if __name__ == "__main__":
    main()
