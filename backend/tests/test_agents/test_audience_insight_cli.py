"""人群洞察 Pipeline CLI — 输入产品名称，通过 workflow 自动完成
   产品调研 + 市场分析 + 人群搜索（并行）→ 生成用户画像。"""

import json
import sys

import httpx

API_URL = "http://localhost:8005/api/v1/workflows/audience_insight_pipeline/run"


def main():
    product = None
    category = None

    if len(sys.argv) > 1:
        product = sys.argv[1]
    if len(sys.argv) > 2:
        category = sys.argv[2]

    if not product:
        product = input("请输入产品名称: ").strip()
    if not category:
        if sys.stdin.isatty():
            category = input("请输入品类 (如 手机/饮料/汽车，直接回车跳过): ").strip()
        else:
            category = ""

    if not product:
        print("产品名称不能为空")
        return

    if not category:
        category = ""

    print(f"\n正在通过并行 pipeline 调研 [{product}] ...\n")
    print(f"  product_research  (并行)")
    print(f"  market_analysis   (并行)")
    print(f"  audience_search   (并行)")
    print(f"  └─→ generate_persona\n")

    payload = {"input": {"product_name": product}}
    if category:
        payload["input"]["category"] = category

    with httpx.Client(timeout=600) as client:
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
            identity = pr.get("identity", pr)
            print(f"\n[产品调研]")
            print(f"  product_name: {identity.get('product_name', {}).get('value', '?')}")
            print(f"  brand: {identity.get('brand', {}).get('value', '?')}")
            print(f"  category: {identity.get('category', {}).get('value', '?')}")

        # 市场分析结果
        if "market_analysis" in outputs:
            ma = outputs["market_analysis"]
            result = ma.get("result", ma)
            print(f"\n[市场分析]")
            print(f"  industry: {result.get('industry', '?')}")

        # 人群搜索结果
        if "audience_search" in outputs:
            ad = outputs["audience_search"]
            print(f"\n[人群搜索]")
            print(f"  purchase_motivations: {len(ad.get('purchase_motivations', []))} 条")
            print(f"  decision_factors: {len(ad.get('decision_factors', []))} 条")

        # 用户画像
        if "generate_persona" in outputs:
            p = outputs["generate_persona"]
            print(f"\n[用户画像]")
            if p.get("profile_summary"):
                ps = p["profile_summary"]
                print(f"  profile: {ps.get('value', ps.get('quote', '?'))}")
            if p.get("purchase_motivation"):
                print(f"  purchase_motivation: {list(p['purchase_motivation'].keys())}")

        print(f"\n{'='*50}")
        print(f"workflow status: {data.get('status', '?')}")


if __name__ == "__main__":
    main()
