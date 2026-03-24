# Sinan (司南) - Chat Navigator

**Your Compass for AI Conversations. 纵览千言，心有司南。**

Sinan is your compass for web conversations. It turns your prompts into a floating sidebar index for instant navigation, so you can jump across long threads without endless scrolling. It adapts seamlessly to both light and dark modes.

## ✨ Features

- **Multi-Platform Support**: Works on ChatGPT, Claude, Gemini, Doubao, DeepSeek, Qwen, Perplexity, and Yuanbao.
- **Smart Navigation**: Extracts user queries and creates a clickable sidebar for instant scrolling.
- **Assistant TOC (On-Demand)**: For each user turn, Sinan can extract the paired assistant response outline from standard headings (`h1`~`h6`) and provide clickable jump links.
- **Markdown Export**: Enter export mode, multi-select turns, and download one high-fidelity Markdown file in conversation (DOM) order.
- **Glassmorphism UI**: A beautiful, translucent interface that adapts naturally to both light and dark modes.
- **Scroll Spy**: Automatically highlights the current section as you read.
- **Minimized Mode**: Collapse the sidebar into a discreet bubble when not in use.

## 📝 Markdown Export

Click `⇩` to enter export mode, select messages, then use `下载` to export or `取消` to exit.
Export result is a single `.md` file in conversation order, with rich markdown preserved.
Filename example: `sinan-chatgpt.com-20260225-1530-selected-3.md`.

## 🚀 Installation

**Recommended: Install from the Chrome Web Store**

For the best experience (easy setup + automatic updates), install Sinan directly from the Chrome Web Store:  
建议优先通过 Chrome Web Store 安装，流程更简单且可自动获取更新。  
[Sinan (司南) - Chrome Web Store](https://chromewebstore.google.com/detail/sinan-%E5%8F%B8%E5%8D%97/khififjmhndmolbpabmaidlkfpjdmejk?hl=en-US&utm_source=ext_sidebar)

Store listing copy reference: `docs/WEBSTORE_LISTING.md`

**Local development install (optional)**

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extension folder.

## 📦 Chrome Web Store Packaging

Use the build script instead of zipping the project root directly:

```bash
chmod +x scripts/check_remote_hosted_code.sh scripts/build_webstore_package.sh
./scripts/build_webstore_package.sh
```

It will:
- Copy only Git-tracked extension runtime files (`manifest.json`, `src/`, `assets/`) into `dist/webstore-package/`.
- Run a remote-hosted-code scan for MV3 compliance.
- Output upload artifact at `dist/sinan-webstore.zip`.
