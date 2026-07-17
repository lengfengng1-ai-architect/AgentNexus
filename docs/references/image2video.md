万相-参考生视频模型支持**多模态输入**（文本/图像/视频/音频），可将人物或物体作为主角，根据提示词生成自然生动的表演视频。

**快速入口：**[API参考](https://help.aliyun.com/zh/model-studio/wan-video-to-video-api-reference)**｜** [Prompt指南](https://help.aliyun.com/zh/model-studio/text-to-video-prompt)

## **快速开始**

| **输入提示词**：视频1抱着图2，在图3的椅子上弹奏一支舒缓的乡村民谣，并说道："今天的阳光真好。"图1手中拿着一束向日葵，路过视频1，把手中的花放到视频1旁边的桌子上，并说道："真好听，能不能再唱一遍"。 |   |   |   |   |   |
| --- | --- | --- | --- | --- | --- |
| **输入图像（图1）** > 参考人物 | **输入视频（视频1）** > 参考人物 | **输入图像（图2）** > 参考物体 | **输入图像（图3）** > 参考物体 | **输入图像（图4）** > 参考背景 | **输出视频（多镜头，有声视频）** |
| ![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/zh-CN/5068146771/p1067295.png) **输入参考音色**： | **输入参考音色**： | ![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/zh-CN/5068146771/p1067329.png) | ![wan-r2v-object4](https://help-static-aliyun-doc.aliyuncs.com/assets/img/zh-CN/9459060771/p1052555.png) | ![wan-r2v-backgroud5](https://help-static-aliyun-doc.aliyuncs.com/assets/img/zh-CN/9459060771/p1052556.png) |     |

在调用前，先[获取API Key](https://help.aliyun.com/zh/model-studio/get-api-key)，再[配置API Key到环境变量](https://help.aliyun.com/zh/model-studio/configure-api-key-through-environment-variables)。通过SDK进行调用，请[安装DashScope SDK](https://help.aliyun.com/zh/model-studio/install-sdk)。

## Python SDK

**重要**

请确保 DashScope Python SDK 版本**不低于** `**1.25.16**`，再运行以下代码。

若版本过低，可能会触发 "url error, please check url!" 等错误。请参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
# -*- coding: utf-8 -*-
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# 以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
dashscope.base_http_api_url = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1'

# 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx"
# 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

media = [
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3"
    },
    {
        "type": "reference_video",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png"
    }
]

print('please wait...')
rsp = VideoSynthesis.call(
    api_key=api_key,
    model="wan2.7-r2v-2026-06-12",
    media=media,
    resolution="720P",
    ratio="16:9",
    duration=10,
    prompt_extend=False,
    watermark=True,
    prompt="视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣，并说道：“今天的阳光真好。”图1手中拿着图2，路过视频1，把手中的图2放到视频1旁边的桌子上，并说道：“真好听，能不能再唱一遍”。",
)
print(rsp)
if rsp.status_code == HTTPStatus.OK:
    print("video_url:", rsp.output.video_url)
else:
    print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))
```

## Java SDK

**重要**

请确保 DashScope Java SDK 版本**不低于** `**2.22.14**`，再运行以下代码。

若版本过低，可能会触发 "url error, please check url!" 等错误。请参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.ArrayList;
import java.util.List;

public class Ref2Video {

    static {
        // 以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1";
    }

    // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey="sk-xxx"
    // 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void ref2video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
        final String prompt = "视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣，并说道：“今天的阳光真好。”图1手中拿着图2，路过视频1，把手中的图2放到视频1旁边的桌子上，并说道：“真好听，能不能再唱一遍”。";
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg")
                    .type("reference_image")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4")
                    .type("reference_video")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png")
                    .type("reference_image")
                    .build());
        }};
        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-r2v-2026-06-12")
                        .prompt(prompt)
                        .media(media)
                        .watermark(true)
                        .duration(10)
                        .resolution("720P")
                        .ratio("16:9")
                        .promptExtend(false)
                        .build();
        System.out.println("please wait...");
        VideoSynthesisResult result = vs.call(param);
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        try {
            ref2video();
        } catch (ApiException | NoApiKeyException | InputRequiredException e) {
            System.out.println(e.getMessage());
        }
        System.exit(0);
    }
}
```

## curl

**步骤1：创建任务获取任务ID**

```
curl --location 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    -H 'X-DashScope-Async: enable' \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
    "model": "wan2.7-r2v-2026-06-12",
    "input": {
        "prompt": "视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣，并说道：“今天的阳光真好。”图1手中拿着图2，路过视频1，把手中的图2放到视频1旁边的桌子上，并说道：“真好听，能不能再唱一遍”。 ",
        "media": [
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3"
            },
            {
                "type": "reference_video",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png"
            }
        ]
    },
    "parameters": {
        "resolution": "720P",
        "ratio": "16:9",
        "duration": 10,
        "prompt_extend": false,
        "watermark": true
    }
}'
```

**步骤2：根据任务ID获取结果**

将`{task_id}`完整替换为上一步接口返回的`task_id`的值。`task_id`查询有效期为24小时。

```
curl -X GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id} \
--header "Authorization: Bearer $DASHSCOPE_API_KEY"
```

## **适用范围**

-   各地域支持的模型有所差异，且资源相互独立。各地域支持的模型请参见[百炼控制台](https://bailian.console.aliyun.com/cn-beijing?tab=model#/model-market)。
    
-   调用时，确保**模型、Endpoint URL 和 API Key 均属于同一地域**，跨地域调用将会失败。
    

**说明**

本文的示例代码适用于**北京地域**。如使用其他地域，请参见[API参考](https://help.aliyun.com/zh/model-studio/wan-video-to-video-api-reference)。

## **核心能力（wan2.7模型）**

### **单图参考（多宫格图）**

**支持模型**：`wan2.7系列模型`。

**功能介绍**：输入一张多宫格图（故事板），模型自动识别多宫格布局，生成角色、场景和镜头一致的视频。建议单次**仅传入一张**多宫格图。

**参数设置**：

-   `media.type`：设置为`reference_image`（参考图像）。
    
-   `media.url`：多宫格图像的 URL 或 base64 编码字符串。
    
-   `prompt`：当参考素材有且仅有一张图片或一个视频，则可表述为“**参考图片**”或“**参考视频**”。
    

| **输入提示词**：参考图片 ，3D卡通冒险电影风，角色Q版但材质细腻，动作流畅，色彩鲜明，保持角色与森林场景一致，不要加入文字。氛围： 冒险、轻快、神秘、童趣。角色： 小男孩探险家：圆帽、背包、短斗篷。小伙伴：会飞的小机器人，圆形身体，蓝色发光眼。场景： 奇幻森林，巨大树根、蘑菇、藤蔓、藏宝洞口、阳光光束。分镜脚本： 1. 全景：奇幻森林里高大树木与光束交错，环境神秘明亮。 2. 中景：小男孩拨开藤蔓向前探路。 3. 中景：小机器人飞在他身边，用蓝光扫描前方。 4. 特写：一张旧藏宝图在男孩手里展开。 5. 近景：他露出兴奋表情，眼睛亮起来。 6. 动作镜头：两人跳过树根和小溪，继续深入森林。 7. 中景：藤蔓后方露出一个被苔藓覆盖的宝箱。 8. 特写：宝箱边缘闪出金色光芒。 9. 收束镜头：男孩和小机器人站在宝箱前惊喜对望，冒险感拉满。 |   |
| --- | --- |
| **输入多宫格图像** | **输出视频** |
| ![banana_storyboard](https://help-static-aliyun-doc.aliyuncs.com/assets/img/zh-CN/5068146771/p1067239.webp) |     |

| **输入提示词**：参考图片，韩漫风格，夜晚灯光柔和，人物表情细腻，场景统一，图中不要出现文字。氛围： 治愈、安静、微孤独、温柔。角色： 女主：打工结束的年轻女生，长外套，疲惫但温柔。店员少年：便利店夜班店员，清爽短发。场景： 深夜便利店，暖白灯，货架整齐，玻璃门外有细雨和街灯。分镜脚本： 1. 全景：深夜便利店在雨夜街角亮着暖白色灯光。 2. 中景：女主推门走进店里，肩上还带着夜雨湿气。 3. 近景：她疲惫地站在热饮柜前，轻轻发呆。 4. 中景：店员少年从收银台抬头看见她。 5. 特写：热饮柜的橙色灯光映在她手边。 6. 近景：女主拿起一罐热饮，神情稍微放松。 7. 近景：店员朝她露出温和而克制的笑并说：”今天也辛苦啦。” 8. 中景：女主回以浅浅笑意，疲惫感被冲淡。 9. 收束镜头：她捧着热饮站在店门前，看着雨夜，便利店灯光把背影映得很温柔。 |   |
| --- | --- |
| **输入多宫格图像** | **输出视频** |
| ![banana_storyboard_00000012](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) |     |

## Python SDK

> 请确保 DashScope Python SDK 版本不低于 `1.25.16`，可参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
# -*- coding: utf-8 -*-
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# 以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
dashscope.base_http_api_url = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1'

# 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx"
# 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

media = [
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png"
    }
]


def sample_sync_call():
    print('----sync call, please wait a moment----')
    rsp = VideoSynthesis.call(
        api_key=api_key,
        model="wan2.7-r2v-2026-06-12",
        media=media,
        resolution="720P",
        ratio="16:9",
        duration=10,
        prompt_extend=False,
        watermark=True,
        prompt="参考图片，3D卡通冒险电影风，角色Q版但材质细腻，动作流畅，色彩鲜明，保持角色与森林场景一致，不要加入文字。氛围： 冒险、轻快、神秘、童趣。角色： 小男孩探险家：圆帽、背包、短斗篷。小伙伴：会飞的小机器人，圆形身体，蓝色发光眼。场景： 奇幻森林，巨大树根、蘑菇、藤蔓、藏宝洞口、阳光光束。分镜脚本： 1. 全景：奇幻森林里高大树木与光束交错，环境神秘明亮。 2. 中景：小男孩拨开藤蔓向前探路。 3. 中景：小机器人飞在他身边，用蓝光扫描前方。 4. 特写：一张旧藏宝图在男孩手里展开。 5. 近景：他露出兴奋表情，眼睛亮起来。 6. 动作镜头：两人跳过树根和小溪，继续深入森林。 7. 中景：藤蔓后方露出一个被苔藓覆盖的宝箱。 8. 特写：宝箱边缘闪出金色光芒。 9. 收束镜头：男孩和小机器人站在宝箱前惊喜对望，冒险感拉满。",
    )
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))


if __name__ == '__main__':
    sample_sync_call()
```

## Java SDK

> 请确保 DashScope Java SDK 版本不低于 `2.22.14`，可参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.ArrayList;
import java.util.List;

public class Ref2Video {

    static {
        //  以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1";
    }

    // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey="sk-xxx"
    // 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void syncCall() {
        VideoSynthesis videoSynthesis = new VideoSynthesis();
        final String prompt = "参考图片，3D卡通冒险电影风，角色Q版但材质细腻，动作流畅，色彩鲜明，保持角色与森林场景一致，不要加入文字。氛围： 冒险、轻快、神秘、童趣。角色： 小男孩探险家：圆帽、背包、短斗篷。小伙伴：会飞的小机器人，圆形身体，蓝色发光眼。场景： 奇幻森林，巨大树根、蘑菇、藤蔓、藏宝洞口、阳光光束。分镜脚本： 1. 全景：奇幻森林里高大树木与光束交错，环境神秘明亮。 2. 中景：小男孩拨开藤蔓向前探路。 3. 中景：小机器人飞在他身边，用蓝光扫描前方。 4. 特写：一张旧藏宝图在男孩手里展开。 5. 近景：他露出兴奋表情，眼睛亮起来。 6. 动作镜头：两人跳过树根和小溪，继续深入森林。 7. 中景：藤蔓后方露出一个被苔藓覆盖的宝箱。 8. 特写：宝箱边缘闪出金色光芒。 9. 收束镜头：男孩和小机器人站在宝箱前惊喜对望，冒险感拉满。";
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png")
                    .type("reference_image")
                    .build());
        }};
        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-r2v-2026-06-12")
                        .prompt(prompt)
                        .media(media)
                        .watermark(true)
                        .duration(10)
                        .resolution("720P")
                        .ratio("16:9")
                        .promptExtend(false)
                        .build();
        VideoSynthesisResult result = null;
        try {
            System.out.println("---sync call, please wait a moment----");
            result = videoSynthesis.call(param);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        } catch (InputRequiredException e) {
            throw new RuntimeException(e);
        }
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        syncCall();
    }
}
```

## curl

**步骤1：创建任务获取任务ID**

```
curl --location 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    -H 'X-DashScope-Async: enable' \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
    "model": "wan2.7-r2v-2026-06-12",
    "input": {
        "prompt": "参考图片，3D卡通冒险电影风，角色Q版但材质细腻，动作流畅，色彩鲜明，保持角色与森林场景一致，不要加入文字。氛围： 冒险、轻快、神秘、童趣。角色： 小男孩探险家：圆帽、背包、短斗篷。小伙伴：会飞的小机器人，圆形身体，蓝色发光眼。场景： 奇幻森林，巨大树根、蘑菇、藤蔓、藏宝洞口、阳光光束。分镜脚本： 1. 全景：奇幻森林里高大树木与光束交错，环境神秘明亮。 2. 中景：小男孩拨开藤蔓向前探路。 3. 中景：小机器人飞在他身边，用蓝光扫描前方。 4. 特写：一张旧藏宝图在男孩手里展开。 5. 近景：他露出兴奋表情，眼睛亮起来。 6. 动作镜头：两人跳过树根和小溪，继续深入森林。 7. 中景：藤蔓后方露出一个被苔藓覆盖的宝箱。 8. 特写：宝箱边缘闪出金色光芒。 9. 收束镜头：男孩和小机器人站在宝箱前惊喜对望，冒险感拉满。",
        "media": [
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png"
            }
        ]
    },
    "parameters": {
        "resolution": "720P",
        "ratio": "16:9",
        "duration": 10,
        "prompt_extend": false,
        "watermark": true
    }
}'
```

**步骤2：根据任务ID获取结果**

将`{task_id}`完整替换为上一步接口返回的`task_id`的值。`task_id`查询有效期为24小时。

```
curl -X GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id} \
--header "Authorization: Bearer $DASHSCOPE_API_KEY"
```

### **多主体参考+音色定制**

**支持模型**：`wan2.7系列模型`。

**功能介绍**：支持传入多个参考图像和参考视频作为主体素材，并可为每个主体独立指定音色，实现多角色同框互动与音色区分。

**参数设置**：

-   `media`：参考素材数组。
    
    -   `media.type`：支持 `reference_image`（参考图像）和 `reference_video`（参考视频）。**参考图像 + 参考视频 ≤ 5**。
        
    -   `media.url`：素材的 URL；图像还支持 base64 编码字符串。
        
    -   `media.reference_voice`（可选）：为主体指定音色的音频 URL，推荐与 `reference_image` 或 `reference_video` 搭配使用。
        
        **音频生效逻辑**：若 `reference_video` 本身包含音频且未指定 `reference_voice`，默认使用视频原声；若同时传入，`reference_voice` 将覆盖视频原声。
        
-   `prompt`：在提示词中指代参考素材，规则如下：
    
    -   使用“**图1、图2**”指代 `reference_image` 素材，使用“**视频1、视频2**”指代 `reference_video` 素材，英文提示词则写为“**Image 1**”、"**Video 1**”这类标识。
        
    -   按照`media`数组定义参考素材的引用顺序，图和视频分别计数。
        

| **输入提示词**：视频1抱着图2，在图3的椅子上弹奏一支舒缓的乡村民谣，并说道："今天的阳光真好。"图1手中拿着一束向日葵，路过视频1，把手中的花放到视频1旁边的桌子上，并说道："真好听，能不能再唱一遍"。 |   |   |   |   |   |
| --- | --- | --- | --- | --- | --- |
| **输入图像（图1）** > 参考人物 | **输入视频（视频1）** > 参考人物 | **输入图像（图2）** > 参考物体 | **输入图像（图3）** > 参考物体 | **输入图像（图4）** > 参考背景 | **输出视频（多镜头，有声视频）** |
| ![image](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) **输入参考音色**： | **输入参考音色**： | ![image](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) | ![wan-r2v-object4](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) | ![wan-r2v-backgroud5](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) |     |

| **输入提示词**：图2从画面左侧深处走来，随后切换到图2的特写，图1正靠在右侧图片3充满锈迹的墙壁上发呆。她注意到了脚步声，缓缓转头。 图1看到图2后，图1说：“你怎么还是来了？”图2回答：“我们谈谈吧。” |   |   |   |
| --- | --- | --- | --- |
| **输入图像（图1）** > 参考人物 | **输入图像（图2）** > 参考人物 | **输入图像（图3）** > 参考物体 | **输出视频（多镜头，有声视频）** |
| ![wan-r2v-voice-gril](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) **输入参考音色**： | ![wan-r2v-voice-boy](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) **输入参考音色：** | ![wan-r2v-voice-bg](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) |     |

## Python SDK

> 请确保 DashScope Python SDK 版本不低于 `1.25.16`，可参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
# -*- coding: utf-8 -*-
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# 以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
dashscope.base_http_api_url = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1'

# 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx"
# 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

media = [
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3"
    },
    {
        "type": "reference_video",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png"
    }
]


def sample_sync_call():
    print('----sync call, please wait a moment----')
    rsp = VideoSynthesis.call(
        api_key=api_key,
        model="wan2.7-r2v-2026-06-12",
        media=media,
        resolution="720P",
        ratio="16:9",
        duration=10,
        prompt_extend=False,
        watermark=True,
        prompt="视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣，并说道：“今天的阳光真好。”图1手中拿着图2，路过视频1，把手中的图2放到视频1旁边的桌子上，并说道：“真好听，能不能再唱一遍”。",
    )
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))


if __name__ == '__main__':
    sample_sync_call()
```

## Java SDK

> 请确保 DashScope Java SDK 版本不低于 `2.22.14`，可参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.ArrayList;
import java.util.List;

public class Ref2Video {

    static {
        //  以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1";
    }

    // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey="sk-xxx"
    // 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void syncCall() {
        VideoSynthesis videoSynthesis = new VideoSynthesis();
        final String prompt = "视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣，并说道：“今天的阳光真好。”图1手中拿着图2，路过视频1，把手中的图2放到视频1旁边的桌子上，并说道：“真好听，能不能再唱一遍”。";
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg")
                    .type("reference_image")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4")
                    .type("reference_video")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png")
                    .type("reference_image")
                    .build());
        }};
        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-r2v-2026-06-12")
                        .prompt(prompt)
                        .media(media)
                        .watermark(true)
                        .duration(10)
                        .resolution("720P")
                        .ratio("16:9")
                        .promptExtend(false)
                        .build();
        VideoSynthesisResult result = null;
        try {
            System.out.println("---sync call, please wait a moment----");
            result = videoSynthesis.call(param);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        } catch (InputRequiredException e) {
            throw new RuntimeException(e);
        }
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        syncCall();
    }
}
```

## curl

**步骤1：创建任务获取任务ID**

```
curl --location 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    -H 'X-DashScope-Async: enable' \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
    "model": "wan2.7-r2v-2026-06-12",
    "input": {
        "prompt": "视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣，并说道：“今天的阳光真好。”图1手中拿着图2，路过视频1，把手中的图2放到视频1旁边的桌子上，并说道：“真好听，能不能再唱一遍”。 ",
        "media": [
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3"
            },
            {
                "type": "reference_video",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png"
            }
        ]
    },
    "parameters": {
        "resolution": "720P",
        "ratio": "16:9",
        "duration": 10,
        "prompt_extend": false,
        "watermark": true
    }
}'
```

**步骤2：根据任务ID获取结果**

将`{task_id}`完整替换为上一步接口返回的`task_id`的值。`task_id`查询有效期为24小时。

```
curl -X GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id} \
--header "Authorization: Bearer $DASHSCOPE_API_KEY"
```

### **多主体参考+首帧控制**

**支持模型**：`wan2.7系列模型`。

**功能介绍**：在主体参考基础上加入首帧控制，让画面构图和内容走向更加可控。

**参数设置**：

-   `media`：参考素材数组。
    
    -   `media.type`：支持 `first_frame`、`reference_image`（参考图像）和 `reference_video`（参考视频）。
        
        首帧图像最多1张，参考图像和参考视频至少传入1个，**参考图像 + 参考视频 ≤ 5**。
        
    -   `media.url`：素材的 URL；图像还支持 base64 编码字符串。
        
-   `prompt`：在提示词中指代参考素材，规则如下：
    
    -   使用“**图1、图2**”指代 `reference_image` 素材，使用“**视频1、视频2**”指代 `reference_video` 素材，英文提示词则写为“**Image 1**”、"**Video 1**”这类标识。
        
    -   按照`media`数组定义参考素材的引用顺序，图和视频分别计数。
        
    -   首帧无需在提示词中引用。
        

| **输入提示词**：俯拍在一个蓝色的星球上，镜头逐渐推进到星球上面给到图1特写，他拿着图2，一边吃着图2，一边说：“怎么没人找我来玩呀？” |   |   |   |
| --- | --- | --- | --- |
| **输入首帧** > 参考首帧 | **输入图像（图1）** > 参考主体 | **输入图像（图2）** > 参考物体 | **输出视频** > 以首帧的宽高比生成视频 |
| ![wan2](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) | ![wan2](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) | ![wan2](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) |     |

## Python SDK

> 请确保 DashScope Python SDK 版本不低于 `1.25.16`，可参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
# -*- coding: utf-8 -*-
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# 以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
dashscope.base_http_api_url = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1'

# 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx"
# 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

media = [
    {
        "type": "first_frame",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/ixwovg/wan2.7-r2v-first-frame.webp"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/fkltfw/wan2.7-r2v-image-qq.webp"
    },
    {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/kxkbsv/wan2.7-r2v-image-ob.webp"
    }
]


def sample_sync_call():
    print('----sync call, please wait a moment----')
    rsp = VideoSynthesis.call(
        api_key=api_key,
        model="wan2.7-r2v-2026-06-12",
        media=media,
        resolution="720P",
        duration=10,
        prompt_extend=False,
        watermark=True,
        prompt="俯拍在一个蓝色的星球上，镜头逐渐推进到星球上面给到图1特写，他拿着图2，一边吃着图2，一边说：“怎么没人找我来玩呀？”",
    )
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))


if __name__ == '__main__':
    sample_sync_call()
```

## Java SDK

> 请确保 DashScope Java SDK 版本不低于 `2.22.14`，可参考[安装SDK](https://help.aliyun.com/zh/model-studio/install-sdk)进行更新。

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.ArrayList;
import java.util.List;

public class Ref2Video {

    static {
        //  以下为华北2（北京）地域的URL。请将 {WorkspaceId} 替换为您的百炼业务空间ID，各地域的URL不同，获取URL：https://help.aliyun.com/zh/model-studio/video-reference-api-reference
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1";
    }

    // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey="sk-xxx"
    // 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void syncCall() {
        VideoSynthesis videoSynthesis = new VideoSynthesis();
        final String prompt = "俯拍在一个蓝色的星球上，镜头逐渐推进到星球上面给到图1特写，他拿着图2，一边吃着图2，一边说：“怎么没人找我来玩呀？”";
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/ixwovg/wan2.7-r2v-first-frame.webp")
                    .type("first_frame")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/fkltfw/wan2.7-r2v-image-qq.webp")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/kxkbsv/wan2.7-r2v-image-ob.webp")
                    .type("reference_image")
                    .build());
        }};
        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-r2v-2026-06-12")
                        .prompt(prompt)
                        .media(media)
                        .watermark(true)
                        .duration(10)
                        .resolution("720P")
                        .promptExtend(false)
                        .build();
        VideoSynthesisResult result = null;
        try {
            System.out.println("---sync call, please wait a moment----");
            result = videoSynthesis.call(param);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        } catch (InputRequiredException e) {
            throw new RuntimeException(e);
        }
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        syncCall();
    }
}
```

## curl

**步骤1：创建任务获取任务ID**

```
curl --location 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    -H 'X-DashScope-Async: enable' \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
    "model": "wan2.7-r2v-2026-06-12",
    "input": {
        "prompt": "俯拍在一个蓝色的星球上，镜头逐渐推进到星球上面给到图1特写，他拿着图2，一边吃着图2，一边说：“怎么没人找我来玩呀？” ",
        "media": [
            {
                "type": "first_frame",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/ixwovg/wan2.7-r2v-first-frame.webp"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/fkltfw/wan2.7-r2v-image-qq.webp"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/kxkbsv/wan2.7-r2v-image-ob.webp"
            }
        ]
    },
    "parameters": {
        "resolution": "720P",
        "duration": 10,
        "prompt_extend": false,
        "watermark": true
    }
}'
```

**步骤2：根据任务ID获取结果**

将`{task_id}`完整替换为上一步接口返回的`task_id`的值。`task_id`查询有效期为24小时。

```
curl -X GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id} \
--header "Authorization: Bearer $DASHSCOPE_API_KEY"
```

## 如何输入参考素材

## wan2.7系列模型

参考图像、视频和音频均传入`media`数组。

### **输入图像**

-   **首帧数量**：首帧（`media.type=first_frame`）最多1张。
    
-   **参考图像数量：**参考图像（`media.type=reference_image`）最多5张，同时满足**参考图像 + 参考视频 ≤ 5**。
    
-   **输入方式**：
    
    -   公网URL：支持 HTTP 或 HTTPS 协议。示例：https://xxxx/xxx.png。
        
    -   临时URL：支持OSS协议，必须通过[上传文件获取临时 URL](https://help.aliyun.com/zh/model-studio/get-temporary-file-url)。示例：oss://dashscope-instant/xxx/xxx.png。
        
    -   Base64 编码字符串：遵循 `data:{MIME_type};base64,{base64_data}` 的格式，其中：
        
        -   {base64\_data}：图像文件经过 Base64 编码后的字符串。
            
        -   {MIME\_type}：图像的媒体类型，需与文件格式对应。
            
            | **图像格式** | **MIME Type** |
            | --- | --- |
            | JPEG | image/jpeg |
            | JPG | image/jpeg |
            | PNG | image/png |
            | BMP | image/bmp |
            | WEBP | image/webp |
            

### **输入视频**

-   **参考视频数量**：参考视频（`media.type=reference_video`）最多5个，同时满足**参考图像 + 参考视频 ≤ 5**。
    
-   **输入方式**：
    
    -   公网URL：支持 HTTP 或 HTTPS 协议。示例：https://xxxx/xxx.mp4。
        
    -   临时URL：支持OSS协议，必须通过[上传文件获取临时 URL](https://help.aliyun.com/zh/model-studio/get-temporary-file-url)。示例：oss://dashscope-instant/xxx/xxx.mp4。
        

### **输入音频**

-   **使用限制**：参考音色（`media.reference_voice`）只能与 `reference_image` 或 `reference_video` 搭配使用，为对应主体角色指定音色。
    
-   **输入方式**：
    
    -   公网URL：支持 HTTP 或 HTTPS 协议。示例：https://xxxx/xxx.mp3。
        
    -   临时URL：支持OSS协议，必须通过[上传文件获取临时 URL](https://help.aliyun.com/zh/model-studio/get-temporary-file-url)。示例：oss://dashscope-instant/xxx/xxx.mp3。
        

## **输出视频**

-   **视频个数**：1个。
    
-   **视频规格**：格式为MP4。详细规格请参见[支持的模型](#06f39eafa2dwt)。
    
-   **视频URL有效期**：**24小时**。
    
-   **视频尺寸**：
    
    -   **wan2.7系列模型**：通过 `resolution` 控制分辨率档位（720P/1080P），通过 `ratio` 控制宽高比（16:9、9:16、1:1、4:3、3:4）。
        
        -   传入首帧图像时：`ratio` 参数被忽略，输出视频的宽高比与首帧图像近似。
            
        -   未传入首帧图像时：由 `ratio` 参数指定宽高比，默认为 16:9。
            

## **计费与限流**

-   模型免费额度和计费单价请参见[万相-参考生视频](https://help.aliyun.com/zh/model-studio/model-pricing#5c3d28ad8a4x8)。
    
-   模型限流请参见[万相系列](https://help.aliyun.com/zh/model-studio/rate-limit#a729d7b6bar7y)。
    
-   计费说明：
    
    -   输入图像不计费，输入视频和输出视频按 **视频秒数** 计费。
        
    -   模型调用失败或处理错误不产生任何费用，也不消耗[新人免费额度](https://help.aliyun.com/zh/model-studio/new-free-quota)。
        
-   计费公式**：**`**总计费时长（秒） = 输入视频计费时长（秒） + 输出视频时长（秒）**`。
    
    ## wan2.7系列模型
    
    **输入视频计费时长**：上限 5 秒。`单个视频截断上限 = 5秒 ÷ 输入参考视频数量（参考图像和首帧图像均不计入）`，每个视频按 `min(实际时长, 截断上限)` 计费，多个视频累加。
    
    -   1 个参考视频：单个视频截断上限 5秒。
        
    -   2 个参考视频：单个视频截断上限 2.5秒。
        
    -   3 个参考视频：单个视频截断上限 1.65秒。
        
    -   4 个参考视频：单个视频截断上限 1.25秒。
        
    -   5 个参考视频：单个视频截断上限 1秒。
        
    -   **示例**：若输入2个参考视频+1张图像，图像不计入，按2个参考视频计算截断上限为2.5秒，`输入计费时长=min(视频1时长，2.5s)+ min(视频2时长，2.5s)`。
        
    
    **输出视频计费时长**：模型成功生成的视频秒数。
    
    ## wan2.6系列模型
    
    **输入视频计费时长**：上限 5 秒。`单个视频截断上限 = 5秒 ÷ 参考素材总数（参考图像 + 参考视频，首帧图像不计入）`，每个视频按 `min(实际时长, 截断上限)` 计费，多个视频累加。
    
    -   1 个参考素材：单个视频截断上限 5秒。
        
    -   2 个参考素材：单个视频截断上限 2.5秒。
        
    -   3 个参考素材：单个视频截断上限 1.65秒。
        
    -   4 个参考素材：单个视频截断上限 1.25秒。
        
    -   5 个参考素材：单个视频截断上限 1秒。
        
    
    **更多示例：输入视频计费时长计算**
    
    -   **输入1个参考素材：单视频截断上限为5秒。**
        
        -   若为视频：`输入计费时长=min(视频时长，5s)`。
            
        -   若为图像：免费。
            
    -   **输入2个参考素材：单视频截断上限为2.5秒。**
        
        -   若1个视频+1张图像：`输入计费时长=min(视频1时长，2.5s)`。
            
        -   若2个参考视频：`输入计费时长=min(视频1时长，2.5s)+ min(视频2时长，2.5s)`。
            
    -   **输入3个参考素材：单视频截断上限为1.65秒。**
        
        -   若1个视频+2张图像：`输入计费时长=min(视频1时长，1.65s)`。
            
        -   若3个参考视频：`输入计费时长=min(视频1时长，1.65s)+ min(视频2时长，1.65s)+min(视频3时长，1.65s)`。
            
    -   **输入4个参考素材：单视频截断上限为1.25秒。**
        
        -   若2个视频+2张图像：`输入计费时长=min(视频1时长，1.25s)+ min(视频2时长，1.25s)`。
            
        -   若3个视频+1张图像：`输入计费时长=min(视频1时长，1.25s)+ min(视频2时长，1.25s)+min(视频3时长，1.25s)`。
            
    -   **输入5个参考素材：单视频截断上限为1秒。**
        
        -   若1个视频+4张图像：`输入计费时长=min(视频1时长，1s)`。
            
        -   若3个视频+2张图像：`输入计费时长=min(视频1时长，1s)+ min(视频2时长，1s)+min(视频3时长，1s)`。
            
    
    **输出视频计费时长**：模型成功生成的视频秒数。
    

## **API文档**

[参考生视频API参考](https://help.aliyun.com/zh/model-studio/wan-video-to-video-api-reference)

## **常见问题**

#### **Q：如何在提示词中引用参考素材？**

A：引用方式取决于所使用的模型和功能：

## wan2.7系列模型

-   参考图像通过“**图1、图2**”这类标识指代，参考视频通过“**视频1、视频2**”这类标识指代。英文提示词则写为“**Image 1**”、"**Video 1**”这类标识。
    
-   图和视频分别计数。顺序与 `media` 数组中同类型素材的顺序一致。
    
-   若参考素材有且仅有一张图片或一个视频，可简化为“参考图片”或“参考视频”。
    
-   首帧图像通常无需在提示词中引用。
    

```
{
    "input": {
        "prompt": "视频1在弹吉他，图1手中拿着一束花，路过视频1",
        "media": [
            {
                "type": "first_frame",
                "url":  "https://example.com/scene.jpg"
            },
            {
                "type": "reference_video",
                "url":  "https://example.com/girl.mp4"           // 视频1
            },
            {
                "type": "reference_image",
                "url": "https://example.com/boy.png"             // 图1
            }
        ]
    }
}
```

#### **Q：reference\_voice 可以与首帧图像搭配使用吗？**

A：**不推荐**。`media.reference_voice` 推荐与 `reference_image`（参考图像）或 `reference_video`（参考视频）搭配使用，用于为对应主体指定音色。

/\*表格图片设置为块元素（独占一行），居中展示，鼠标放在图片上可以点击查看原图\*/ .unionContainer .markdown-body .image.break{ margin: 0px; display: inline-block; vertical-align: middle }

/\* 让引用上下间距调小，避免内容显示过于稀疏 \*/ .unionContainer .markdown-body blockquote { margin: 4px 0; } .aliyun-docs-content table.qwen blockquote { border-left: none; /\* 添加这一行来移除表格里的引用文字的左侧边框 \*/ padding: 0px; /\* 左侧内边距 \*/ margin: 0px; font-size: 14px } .aliyun-docs-content table.flagship tr:first-child td { background: linear-gradient(to right, #60a5fa, #2563eb) !important; color: white !important; }

/\* 1. 全局设置：让引用上下间距调小 \*/ .unionContainer .markdown-body blockquote { margin: 4px 0; } /\* 2. wan-video 表格内引用样式优化 \*/ .aliyun-docs-content table.wan-video blockquote { border-left: none; padding: 0px; margin: 0px; font-size: 14px; } /\* 3. wan-video 表格核心样式修改 \*/ /\* 第一步：去除表格外层所有的边框 \*/ .aliyun-docs-content table.wan-video { border: none !important; border-collapse: collapse !important; /\* 确保边框合并，防止双重边框 \*/ } /\* 第二步：针对表头容器、表体容器、每一行，强制去除上、左、右边框 \*/ /\* 这能解决“顶部横线仍然存在”的问题，因为有时边框是加在 tr 上的 \*/ .aliyun-docs-content table.wan-video thead, .aliyun-docs-content table.wan-video tbody, .aliyun-docs-content table.wan-video tr { border-top: none !important; border-left: none !important; border-right: none !important; } /\* 第三步：针对单元格（表头 th 和 内容 td） \*/ .aliyun-docs-content table.wan-video th, .aliyun-docs-content table.wan-video td { /\* 去除上边框：这会去掉表格最顶部的线，以及每一行单元格顶部的重叠线 \*/ border-top: none !important; /\* 去除左右边框：去掉竖线 \*/ border-left: none !important; border-right: none !important; /\* 确保保留下边框：这是唯一的横线来源 \*/ /\* 这里使用默认继承的颜色，如果线条消失，可手动指定颜色，如: 1px solid #e3e4e6 \*/ } /\* 4. 其他样式（如旗舰版表格）保持不变 \*/ .aliyun-docs-content table.flagship tr:first-child td { background: linear-gradient(to right, #60a5fa, #2563eb) !important; color: white !important; }



HappyHorse-参考生视频模型支持传入**多张参考图像**，通过**文本提示词**描述场景，将图像中的主体角色融合生成一段流畅的视频。

## 适用范围

为确保调用成功，请务必保证**模型、Endpoint URL 和 API Key 均属于同一地域**。跨地域调用将会失败。

-   [**选择模型**](https://bailian.console.aliyun.com/cn-beijing?tab=model#/model-market/all)：确认模型所属的地域。
    
-   **选择 URL**：选择对应的地域 Endpoint URL，支持HTTP URL或 DashScope SDK URL。
    
-   **配置 API Key**：选择地域并[获取API Key](https://help.aliyun.com/zh/model-studio/get-api-key)，再[配置API Key到环境变量](https://help.aliyun.com/zh/model-studio/configure-api-key-through-environment-variables)。
    

**说明**

本文的示例代码适用于**华北2（北京）地域**。

**重要**

百炼为华北2（北京）、新加坡地域推出了业务空间专属域名，**能够为推理请求提供卓越的性能和更高的稳定性**，建议迁移至新域名：

-   华北2（北京）地域：从 `https://dashscope.aliyuncs.com` 迁移至 `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   新加坡地域：从 `https://dashscope-intl.aliyuncs.com` 迁移至 `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

其中 `{WorkspaceId}` 为您的业务空间 ID，可在百炼控制台的**业务空间详情**页面查看。现有域名仍可正常使用。

## HTTP调用

由于参考生视频任务耗时较长（通常为1-5分钟），API采用异步调用。整个流程包含 **"创建任务 -> 轮询获取"** 两个核心步骤，具体如下：

### **步骤1：创建任务获取任务ID**

## **华北2（北京）**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

调用时请将`WorkspaceId`替换为真实的[Workspace ID](https://help.aliyun.com/zh/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu)。

## **新加坡**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

调用时请将`WorkspaceId`替换为真实的[Workspace ID](https://help.aliyun.com/zh/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu)。

## **美国（弗吉尼亚）**

`POST https://dashscope-us.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **德国（法兰克福）**

`POST https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

调用时请将`WorkspaceId`替换为真实的[Workspace ID](https://help.aliyun.com/zh/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu)。

**说明**

-   创建成功后，使用接口返回的 `task_id` 查询结果，task\_id 有效期为 24 小时。**请勿重复创建任务**，轮询获取即可。
    
-   新手指引请参见[Postman](https://help.aliyun.com/zh/model-studio/first-call-to-image-and-video-api)。
    

| #### 请求参数 | ## 参考生视频（多图像） ``` curl --location 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "happyhorse-1.1-r2v", "input": { "prompt": "[Image 1]中身着红色旗袍的女性，镜头先以侧面中景勾勒旗袍修身剪裁与S型曲线，随即切换至低角度仰拍，捕捉她轻抬玉手展开[Image 2]中的折扇的同时，[Image 3]中的流苏耳坠随头部转动轻盈摆动的细节，最后推近至面部特写，定格在她指尖轻点扇骨、眼波流转间的含蓄风情，多视角全方位展现东方韵味。", "media": [ { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/mvzfud/hh-v2v-girl.jpg" }, { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/fvuihk/hh-v2v2-folding-fan.jpg" }, { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/imerii/hh-v2v-earrings.jpg" } ] }, "parameters": { "resolution": "720P", "ratio": "16:9", "duration": 5 } }' ``` |
| --- | --- |
| ##### 请求头（Headers） |
| **Content-Type** `*string*` **（必选）** 请求内容类型。此参数必须设置为`application/json`。 |
| **Authorization** `*string*`**（必选）** 请求身份认证。接口使用阿里云百炼API Key进行身份认证。示例值：Bearer sk-xxxx。 |
| **X-DashScope-Async** `*string*` **（必选）** 异步处理配置参数。HTTP请求只支持异步，**必须设置为**`**enable**`。 **重要** 缺少此请求头将报错：“current user api does not support synchronous calls”。 |
| ##### 请求体（Request Body） |
| **model** `*string*` **（必选）** 模型名称。 可选值： - `happyhorse-1.1-r2v` - `happyhorse-1.0-r2v` |
| **input** `*object*` **（必选）** 输入的基本信息，包括参考图像和提示词。 **属性** **prompt** `*string*` **（必选）** 文本提示词。用来描述生成视频中期望包含的元素和视觉特点。 支持任何语言输入，长度不超过5000个非中文字符或2500个中文字符，超过部分会自动截断。 **参考指代**：在prompt中通过“**\\[Image 1\\]、\\[Image 2\\]**”标识指代`media`数组中对应位置的参考图像，顺序与`media`数组顺序一致。使用时需要指明参考图中的具体对象，例如“\\[Image 1\\]中身着红色旗袍的女性”。 **media** `*array*` **（必选）** 媒体素材列表，用于指定参考图像。 数组的每个元素为一个媒体对象，包含 `type`和 `url`字段。 - 按照数组顺序定义`prompt`中角色引用的顺序。 - 数组中的第 1 个`reference_image`对应 **\\[Image 1\\]**，第 2 个对应 **\\[Image 2\\]**，以此类推。 **元素属性** **type** `*string*` **（必选）** 媒体素材类型。固定值为： - `reference_image`：参考图像。 素材限制： - 参考图像数量：1～9张。 **url** `*string*` **（必选）** 参考图像URL或 Base64 编码数据。 图像限制： - 格式：JPEG、JPG、PNG、WEBP。 - 分辨率：短边不低于400像素，推荐720P以上清晰图。避免传入过小、模糊或压缩过度的图像，影响效果。 - 文件大小：不超过20MB。 支持输入的格式： 1. 公网URL： - 支持 HTTP 或 HTTPS 协议。 - 示例值：https://xxx/xxx.jpg。 2. Base64 编码图像后的字符串： - 数据格式：`data:{MIME_type};base64,{base64_data}`。 - 示例值：data:image/png;base64,GDU7MtCZzEbTbmRZ......（示例已截断，仅做演示）。 **Base64编码数据格式** 格式： `data:{MIME_type};base64,{base64_data}` 。 - {base64\\_data}：图像文件经过 Base64 编码后的字符串。 - {MIME\\_type}：图像的媒体类型，需与文件格式对应。 \\| 图像格式 \\| MIME Type \\| \\| --- \\| --- \\| \\| JPEG \\| image/jpeg \\| \\| JPG \\| image/jpeg \\| \\| PNG \\| image/png \\| \\| WEBP \\| image/webp \\| |
| **parameters** `*object*` （可选） 视频生成参数。如设置视频分辨率、宽高比、时长等。 **属性** **resolution** `*string*` （可选） 生成视频的分辨率档位。 可选值： - `1080P`：默认值。 - `720P` **ratio** `*string*` （可选） 生成视频的宽高比。 可选值： - `16:9`：默认值。 - `9:16` - `3:4` - `4:3` - `4:5` - `5:4` - `1:1` - `9:21` - `21:9` **duration** `*integer*` （可选） 生成视频的时长，单位为秒。 取值范围：`3~15`之间的整数。 默认值：`5`。 **watermark** `*boolean*` （可选） 是否在生成的视频上添加水印标识。水印位于视频右下角，文案固定为“Happy Horse”。 - `true`：默认值，添加水印。 - `false`：不添加水印。 **seed** `*integer*` （可选） 随机数种子，取值范围为`[0, 2147483647]`。 未指定时，系统自动生成随机种子。若需提升生成结果的可复现性，建议固定seed值。 请注意，由于模型生成具有概率性，即使使用相同 seed，也不能保证每次生成结果完全一致。 |

| #### 响应参数 | ### 成功响应 请保存 task\\_id，用于查询任务状态与结果。 ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### 异常响应 创建任务失败，请参见[错误码](https://help.aliyun.com/zh/model-studio/error-code)进行解决。 ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` 任务输出信息。 **属性** **task\\_id** `*string*` 任务ID。查询有效期24小时。 **task\\_status** `*string*` 任务状态。 **枚举值** - PENDING：任务排队中 - RUNNING：任务处理中 - SUCCEEDED：任务执行成功 - FAILED：任务执行失败 - CANCELED：任务已取消 - UNKNOWN：任务不存在或状态未知 |
| **request\\_id** `*string*` 请求唯一标识。可用于请求明细溯源和问题排查。 |
| **code** `*string*` 请求失败的错误码。请求成功时不会返回此参数，详情请参见[错误码](https://help.aliyun.com/zh/model-studio/error-code)。 |     |
| **message** `*string*` 请求失败的详细信息。请求成功时不会返回此参数，详情请参见[错误码](https://help.aliyun.com/zh/model-studio/error-code)。 |     |

### **步骤2：根据任务ID查询结果**

## **华北2（北京）**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

调用时请将`WorkspaceId`替换为真实的[Workspace ID](https://help.aliyun.com/zh/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu)。

## **新加坡**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

调用时请将`WorkspaceId`替换为真实的[Workspace ID](https://help.aliyun.com/zh/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu)。

## **美国（弗吉尼亚）**

`GET https://dashscope-us.aliyuncs.com/api/v1/tasks/{task_id}`

## **德国（法兰克福）**

`GET https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

调用时请将`WorkspaceId`替换为真实的[Workspace ID](https://help.aliyun.com/zh/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu)。

**说明**

-   **轮询建议**：视频生成过程约需数分钟，建议采用**轮询**机制，并设置合理的查询间隔（如 15 秒）来获取结果。
    
-   **任务状态流转**：PENDING（排队中）→ RUNNING（处理中）→ SUCCEEDED（成功）/ FAILED（失败）。
    
-   **task\_id 有效期**：**24小时**，超时后将无法查询结果，接口将返回任务状态为`UNKNOWN`。
    
-   **RPS 限制**：查询接口默认RPS为20。如需更高频查询或事件通知，建议[配置异步任务回调](https://help.aliyun.com/zh/model-studio/async-task-api)。
    
-   **更多操作**：如需批量查询、取消任务等操作，请参见[管理异步任务](https://help.aliyun.com/zh/model-studio/manage-asynchronous-tasks#f26499d72adsl)。
    

| #### 请求参数 | ## 查询任务结果 将`{task_id}`完整替换为上一步接口返回的`task_id`的值。`task_id`查询有效期为24小时。 ``` curl -X GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **请求头（Headers）** |
| **Authorization** `*string*`**（必选）** 请求身份认证。接口使用阿里云百炼API Key进行身份认证。示例值：Bearer sk-xxxx。 |
| ##### **URL路径参数（Path parameters）** |
| **task\\_id** `*string*`**（必选）** 任务ID。 |

| #### **响应参数** | #### **任务执行成功** 视频URL仅保留24小时，超时后会被自动清除，请及时保存生成的视频。 ``` { "request_id": "35137489-2862-96cb-b6f2-xxxxxx", "output": { "task_id": "1469cfc3-3004-4d9e-ab10-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2026-04-25 15:03:25.848", "scheduled_time": "2026-04-25 15:03:25.884", "end_time": "2026-04-25 15:04:05.882", "orig_prompt": "[Image 1]中身着红色旗袍的女性，镜头先以侧面中景勾勒旗袍修身剪裁与S型曲线，随即切换至低角度仰拍，捕捉她轻抬玉手展开[Image 2]中的折扇的同时，[Image 3]中的流苏耳坠随头部转动轻盈摆动的细节，最后推近至面部特写，定格在她指尖轻点扇骨、眼波流转间的含蓄风情，多视角全方位展现东方韵味。", "video_url": "https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxxx.mp4" }, "usage": { "duration": 5, "input_video_duration": 0, "output_video_duration": 5, "video_count": 1, "SR": 720, "ratio": "16:9" } } ``` ## 任务执行失败 若任务执行失败，task\\_status将置为 FAILED，并提供错误码和信息。请参见[错误码](https://help.aliyun.com/zh/model-studio/error-code)进行解决。 ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The resolution is not valid xxxxxx" } } ``` ## 任务查询过期 task\\_id查询有效期为 24 小时，超时后将无法查询，返回以下报错信息。 ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` 任务输出信息。 **属性** **task\\_id** `*string*` 任务ID。查询有效期24小时。 **task\\_status** `*string*` 任务状态。 **枚举值** - PENDING：任务排队中 - RUNNING：任务处理中 - SUCCEEDED：任务执行成功 - FAILED：任务执行失败 - CANCELED：任务已取消 - UNKNOWN：任务不存在或状态未知 **轮询过程中的状态流转：** - PENDING（排队中） → RUNNING（处理中）→ SUCCEEDED（成功）/ FAILED（失败）。 - 初次查询状态通常为 PENDING（排队中）或 RUNNING（处理中）。 - 当状态变为 SUCCEEDED 时，响应中将包含生成的视频URL。 - 若状态为 FAILED，请检查错误信息并重试。 - 若状态为 CANCELED，表示任务已取消，如需继续请重新提交任务。 - 若状态为 UNKNOWN，表示任务不存在或状态未知，可能在 task\\_id 不存在或超过 24 小时有效期后出现。 **submit\\_time** `*string*` 任务提交时间。格式为 YYYY-MM-DD HH:mm:ss.SSS。 **scheduled\\_time** `*string*` 任务执行时间。格式为 YYYY-MM-DD HH:mm:ss.SSS。 **end\\_time** `*string*` 任务完成时间。格式为 YYYY-MM-DD HH:mm:ss.SSS。 **video\\_url** `*string*` 视频URL。仅在 task\\_status 为 SUCCEEDED 时返回。 链接有效期24小时，可通过此URL下载视频。视频格式为MP4（H.264 编码）。 **orig\\_prompt** `*string*` 原始输入的prompt，对应请求参数`prompt`。 **code** `*string*` 请求失败的错误码。请求成功时不会返回此参数，详情请参见[错误码](https://help.aliyun.com/zh/model-studio/error-code)。 **message** `*string*` 请求失败的详细信息。请求成功时不会返回此参数，详情请参见[错误码](https://help.aliyun.com/zh/model-studio/error-code)。 |
| **usage** `*object*` 输出信息统计。只对成功的结果计数。 **属性** **duration** `*integer*` 生成视频的总视频时长，用于计费。 **input\\_video\\_duration** `*integer*` 输入视频的总时长，单位为秒。参考生视频中固定为0。 **output\\_video\\_duration** `*integer*` 输出视频的总时长，单位为秒。 **ratio** `*string*` 生成视频的宽高比。 **SR** `*integer*` 生成视频的分辨率档位。 **video\\_count** `*integer*` 生成视频的数量。固定为1。 |     |
| **request\\_id** `*string*` 请求唯一标识。可用于请求明细溯源和问题排查。 |     |

## **错误码**

如果模型调用失败并返回报错信息，请参见[错误码](https://help.aliyun.com/zh/model-studio/error-code)进行解决。

.table-wrapper { overflow: visible !important; } /\* 调整 table 宽度 \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* 支持吸顶 \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\*代码块字体\*\*/ /\* 减少表格中的代码块 margin，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* 减少表格中的代码块字号，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* 减少表格中的代码块字号，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference 表格 \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* 让表格显示成类似钉钉文档的分栏卡片 \*/ table.help-table-card td { border: 10px solid #FFF !important; background: #F4F6F9; padding: 16px !important; vertical-align: top; } /\* 减少表格中的代码块 margin，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* 减少表格中的代码块字号，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* 减少表格中的代码块字号，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\* 表格中的引用上下间距调小，避免内容显示过于稀疏 \*/ .unionContainer .markdown-body table blockquote { margin: 4px 0 0 0; }

/\* ========================================= \*/ /\* 新增样式：带边框的表格 (api-table-border) \*/ /\* ========================================= \*/ /\* 1. 表格容器核心设置 \*/ .aliyun-docs-content table.api-table-border { border: 1px solid #d8d8d8 !important; /\* 表格外边框 \*/ border-collapse: collapse !important; /\* 合并边框，防止双线 \*/ width: 100% !important; /\* 宽度占满 \*/ margin: 10px 0 !important; /\* 上下间距 \*/ background-color: #fff !important; /\* 背景色 \*/ box-sizing: border-box !important; } /\* 2. 表头、表体、行设置 \*/ /\* 确保行本身没有干扰边框 \*/ .aliyun-docs-content table.api-table-border thead, .aliyun-docs-content table.api-table-border tbody, .aliyun-docs-content table.api-table-border tr { border: none !important; background-color: transparent !important; } /\* 3. 单元格设置 (th 和 td) \*/ /\* 这是边框显示的关键位置 \*/ .aliyun-docs-content table.api-table-border th, .aliyun-docs-content table.api-table-border td { border: 1px solid #d8d8d8 !important; /\* 单元格四周边框 \*/ padding: 8px 12px !important; /\* 内边距 \*/ text-align: left !important; /\* 文字左对齐 \*/ vertical-align: middle !important; /\* 垂直居中 \*/ color: #6e6e80 !important; /\* 文字颜色 \*/ font-size: 14px !important; /\* 字体大小 \*/ line-height: 1.5 !important; } /\* 4. 表头特殊样式 \*/ .aliyun-docs-content table.api-table-border th { background-color: #f9fafb !important; /\* 表头背景色 \*/ color: #181818 !important; /\* 表头文字颜色 \*/ font-weight: 600 !important; /\* 表头加粗 \*/ } /\* 5. 鼠标悬停效果 (可选) \*/ .aliyun-docs-content table.api-table-border tbody tr:hover td { background-color: #fcfcfc !important; /\* 悬停时背景微变 \*/ } /\* 6. 兼容原有 api-reference 可能存在的冲突 \*/ /\* 如果原有样式针对 td:first-child 等特殊选择器有干扰，这里强制覆盖 \*/ .aliyun-docs-content table.api-table-border tr td:first-child { border-bottom: 1px solid #d8d8d8 !important; margin: 0 !important; } .aliyun-docs-content table.api-table-border tr:last-child td:first-child { border-bottom: 1px solid #d8d8d8 !important; /\* 保持底部边框 \*/ }