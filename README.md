# Sinan (司南) - Chat Navigator

**Your Compass for AI Conversations. 纵览千言，心有司南。**

Sinan is a Chrome extension designed to enhance your navigation experience within long AI chat interfaces. It generates a floating, interactive table of contents based on user messages, allowing you to quickly jump back to any point in the conversation.

## ✨ Features

- **Multi-Platform Support**: Works seamlessly with ChatGPT, Gemini, Doubao, Qwen, and Perplexity.
- **Smart Navigation**: Extracts user queries and creates a clickable sidebar for instant scrolling.
- **Glassmorphism UI**: A beautiful, translucent interface that adapts to both Dark and Light modes.
- **Scroll Spy**: Automatically highlights the current section as you read.
- **Minimized Mode**: Collapse the sidebar into a discreet bubble when not in use.

## 🚀 Installation

**Recommended: Install from the Chrome Web Store**

For the best experience (easy setup + automatic updates), install Sinan directly from the Chrome Web Store:  
建议优先通过 Chrome Web Store 安装，流程更简单且可自动获取更新。  
[Sinan (司南) - Chrome Web Store](https://chromewebstore.google.com/detail/sinan-%E5%8F%B8%E5%8D%97/khififjmhndmolbpabmaidlkfpjdmejk?hl=en-US&utm_source=ext_sidebar)

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
