# Contributing to QwikAsk

So, you want to help make QwikAsk even faster/lazier? You're my kind of person. 🤝

## Prerequisites

Before you start hacking, make sure you have the following installed:

- **Node.js** (v18 or later)
- **Rust** (latest stable)
- **Yarn** (because we like it)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) (C++ build tools, WebView2, etc.)

## Getting Started

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/qwik-ask.git
    cd qwik-ask
    ```

2.  **Install dependencies**
    ```bash
    yarn install
    ```

3.  **Run in development mode**
    ```bash
    yarn tauri dev
    ```
    This will fire up the Vite dev server and the Tauri window. Hot reload is active for frontend changes.

## Project Structure

- `src/` - The Vue 3 frontend.
    - `features/` - Feature-based architecture (chat, settings).
    - `shared/` - Reusable components and composables.
- `src-tauri/` - The Rust backend.
    - `src/` - Rust commands and system tray logic.
    - `tauri.conf.json` - Tauri configuration.

## Contribution Guidelines

1.  **Keep it clean.** Use Prettier and ESLint.
2.  **Keep it fast.** If your PR adds 200ms to startup time, I will cry.
3.  **Keep it lazy.** If a feature requires 5 clicks, can we do it in 1?

## Building for Production

To build the installer for your OS:

```bash
yarn tauri build
```

The artifacts will be in `src-tauri/target/release/bundle/`.

## Questions?

Open an issue. I usually check them when I'm avoiding other work. 😉
