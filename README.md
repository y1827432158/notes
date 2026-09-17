# 算法刷题知识点

AcWing 刷题笔记站点。笔记是 Markdown，页面端实时渲染，没有任何构建步骤 —— 改完 `git push` 就上线。

在线地址：https://<你的用户名>.github.io/notes/

## 怎么加一条笔记

1. 在 `notes/` 下找到对应章节的 `.md`（或新建一个，比如 `05-二分.md`）
2. 按已有格式追加内容：一句话结论 + 最小代码 + 易错点
3. 如果是新文件，在 `notes/manifest.json` 的 `files` 里按顺序加一行文件名
4. `git add -A && git commit -m "add: xxx" && git push`

没写进 `manifest.json` 的文件不会出现在站点里。

## 本地预览

```bash
python -m http.server 8765
# 打开 http://127.0.0.1:8765
```

不能直接双击 `index.html` —— 浏览器禁止 `file://` 下读取其他文件，笔记会加载失败。

## 文件结构

```
index.html              页面骨架
assets/style.css        样式与主题（亮/暗）
assets/app.js           渲染、路由、搜索、目录树
assets/vendor/          第三方库（marked / highlight.js / KaTeX），已本地化，不依赖 CDN
notes/manifest.json     章节清单（决定顺序）
notes/*.md              笔记正文
build_docx.py           可选：把 notes/ 合并导出成桌面 Word 文档
```

## 写笔记时的两个约定

- **代码、类型名用反引号包起来**。表格里尤其重要：`unordered_map<K,int>` 不加反引号会被 Markdown 当成 HTML 标签直接吞掉。
- **小节标题以编号开头**（如 `## 2.1 xxx`）。站点用编号做锚点，URL 形如 `#/02-bit/2.1`，可以直接分享。

## 导出 Word（可选）

```bash
python build_docx.py
```

把 `notes/` 下所有章节合并，生成到桌面的 `算法刷题知识点.docx`。文档在 Word 里打开时无法覆盖写入，先关掉再跑。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动发布到 Pages（`.github/workflows/deploy.yml`）。
也可以在仓库 Settings → Pages 里改成分支部署：Source 选 `Deploy from a branch`，分支 `main` / 目录 `/ (root)`。
