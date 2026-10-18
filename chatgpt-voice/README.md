# ChatGPT 语音 IP 规则

直接读取 [OpenAI 官方语音 IP 清单](https://openai.com/chatgpt-voice.json)，生成与本仓库其他 `.list` 相同风格的 Mihomo classical 文本规则。不依赖第三方规则服务。

## 订阅

规则地址：

```text
https://raw.githubusercontent.com/KevinChen222/rule-/main/chatgpt-voice/ChatGPTVoice.list
```

合并到现有 Mihomo 配置中，并将示例策略组 `AI` 替换为你使用的代理策略组名称：

```yaml
rule-providers:
  ChatGPTVoice:
    type: http
    behavior: classical
    format: text
    interval: 86400
    url: https://raw.githubusercontent.com/KevinChen222/rule-/main/chatgpt-voice/ChatGPTVoice.list
    path: ./ruleset/ChatGPTVoice.list

rules:
  # 放在 IP 分流段、可能提前接走这些地址的宽泛 IP 规则及最终 MATCH 之前。
  - RULE-SET,ChatGPTVoice,AI
```

不要重复声明已有的 `rule-providers:` 或 `rules:`，只添加对应条目。

本规则只包含官方公布的语音媒体 IP，不能替代 OpenAI 域名规则。根据 [OpenAI 网络说明](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps)，语音优先使用 UDP 3478，也可使用 TCP 443；所选代理节点和客户端需要支持相应流量。IP 规则不限制端口，因此也覆盖这些地址的 TCP 连接。

## 更新

- GitHub Actions 每天台北时间 **04:17**（UTC 20:17）检查官方清单，也支持 Actions 页面手动运行。
- 定时任务由 GitHub 调度，实际启动可能延迟；长期没有活动的公共仓库也可能被 GitHub 暂停定时任务。
- 首次添加或修改本目录及工作流时，在默认分支自动执行检查和同步；PR 只做离线检查。
- 只有生成内容改变才提交 `ChatGPTVoice.list` 和 `source.json`，不修改仓库其他规则。
- 下载失败、空清单、非法 CIDR、非公网地址、地址族不符等会让任务失败并保留原规则，不发布空列表。
- `SOURCE-UPDATED` 是官方数据生成时间，不是每日检查时间；地址不变时没有新提交属于正常情况。

`source.json` 是官方 JSON 经校验、排序、去重后的快照，保留官方生成时间和 IP 范围，方便审查。

## 本地运行

仅使用 Python 3.11+ 标准库，不需要安装依赖：

```sh
# 联网同步官方数据
python chatgpt-voice/update.py

# 离线核对快照与生成规则是否一致
python chatgpt-voice/update.py --check

# 运行离线测试
python -m unittest discover -s chatgpt-voice -p 'test_*.py' -v

# 从已下载的官方 JSON 生成
python chatgpt-voice/update.py --source /path/to/chatgpt-voice.json
```

脚本独立实现，更新方式参考 mmm1h/clashconfig 的官方清单同步思路。
