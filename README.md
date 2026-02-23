# Sinan (司南) - Chat Navigator

**Your Compass for AI Conversations. 纵览千言，心有司南。**

Sinan is a Chrome extension designed to enhance your navigation experience within long AI chat interfaces. It generates a floating, interactive table of contents based on user messages, allowing you to quickly jump back to any point in the conversation.

## ✨ Features

- **Multi-Platform Support**: Works seamlessly with ChatGPT, Gemini, Doubao, Qwen, and Perplexity.
- **Smart Navigation**: Extracts user queries and creates a clickable sidebar for instant scrolling.
- **Glassmorphism UI**: A beautiful, translucent interface that adapts to both Dark and Light modes.
- **Scroll Spy**: Automatically highlights the current section as you read.
- **Minimized Mode**: Collapse the sidebar into a discreet bubble when not in use.

## 🎨 Icon Design Prompt

If you need to generate a matching icon, use the following prompt:

> app icon design, flat vector art, minimalist. solid deep dark charcoal grey background (almost black). a single, bold, capital letter "S" in the center. font style: modern geometric sans-serif, thick lines, pure white color. no shadows, no gradients, no effects. clean, professional brand logo, high contrast, 4k.

## 🚀 Installation

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
