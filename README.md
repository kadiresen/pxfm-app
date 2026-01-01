# PXFM

A minimal internet radio player built with React, TypeScript, and Tauri.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Sass
- **Backend/Shell:** Tauri (Rust)
- **State Management:** React Context + Hooks
- **Icons:** Lucide React
- **Animations:** Framer Motion

## Getting Started

This project uses `pnpm`.

### Development

```bash
pnpm install
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

## Project Structure

- `src-tauri/`: Tauri (Rust) backend code
- `src/`: React frontend code (components, hooks, context)
- `api/`: API integration (Radio Browser)