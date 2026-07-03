"""产品信息调研 CLI — 输入产品名称，流式查看调研进度和结果。"""

import json
import sys

import httpx

API_URL = "http://localhost:8002/api/v1/product-info/stream"


def main():
    if len(sys.argv) > 1:
        product = " ".join(sys.argv[1:])
    else:
        product = input("请输入产品名称: ").strip()

    if not product:
        print("产品名称不能为空")
        return

    print(f"\n正在调研 [{product}] ...\n")

    with httpx.Client(timeout=180) as client:
        with client.stream("POST", API_URL, json={"product_name": product}) as resp:
            # SSE: data: event: XXX / data: data: {...} / data: / data: (空行)
            # 我们需要提取 data: data: {...} 中的 {...}
            for line in resp.iter_lines():
                if line.startswith("data: data: "):
                    payload = line[12:]  # 去掉 "data: data: "
                    try:
                        data = json.loads(payload)
                        if "step" in data:
                            print(f"  {data['message']}")
                        elif "product_info" in data:
                            info = data["product_info"]["basic"]
                            name = info["product_name"]["value"]
                            sources = info["product_name"]["sources"]
                            print(f"\n调研完成! 产品: {name}")
                            print(f"信息来源 ({len(sources)} 个页面):")
                            for s in sources:
                                print(f"  - {s}")
                            print(f"\n来自缓存: {data.get('from_cache', False)}")
                    except json.JSONDecodeError:
                        pass


if __name__ == "__main__":
    main()
