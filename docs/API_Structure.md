# AI API 结构（占位）

## 统一入口

`POST /api/ai`

请求体：

```json
{
  "scriptId": "string",
  "scope": "dm | roles | clues | truth | global",
  "action": "generate | improve | audit",
  "mode": "light | standard",
  "instruction": "string",
  "current": {
    "dmBackground": "string",
    "dmFlow": "string",
    "truth": "string",
    "roles": [{ "name": "string", "contentMd": "string", "taskMd": "string" }],
    "clues": [{ "title": "string", "contentMd": "string", "triggerMd": "string" }]
  }
}
```

响应体：

```json
{
  "ok": true,
  "result": {
    "summary": "string",
    "warnings": ["string"],
    "changes": [
      { "target": "dmBackground | dmFlow | truth | roles | clues", "action": "replace | append", "value": {} }
    ]
  },
  "context": {
    "Global_Context": {},
    "Sector_Specific_Rules": ["string"],
    "User_Instruction": "string"
  },
  "systemPrompt": ""
}
```

> 说明：`systemPrompt` 预留为空，后续可由运营填入系统提示词。

---

## 真相锁定

`GET /api/scripts/{id}/truth-lock`

返回：

```json
{
  "locked": true,
  "truthLock": { "lockedAt": 0, "truth": "string" }
}
```

`POST /api/scripts/{id}/truth-lock`

请求体：

```json
{ "truth": "string" }
```

返回：

```json
{ "ok": true }
```
