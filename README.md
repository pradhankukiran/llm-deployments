# LLM Deployments

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Orange Boosted](https://img.shields.io/badge/Orange_Boosted-f16e00?style=flat-square&logo=orange&logoColor=black)](https://github.com/Orange-OpenSource/Orange-Boosted-Bootstrap)
[![Modal](https://img.shields.io/badge/Modal-000000?style=flat-square&logo=square&logoColor=white)](https://modal.com/)

A professional serverless operations dashboard designed to monitor and manage large language models and generation pipelines deployed on the Modal platform. Built with Next.js App Router and styled according to the Orange Boosted Bootstrap design system.

---

## Architecture Overview

This project serves as an interactive portfolio dashboard linking a Next.js frontend directly with the Modal serverless platform through a server-side Node.js CLI wrapper.

* **Live Deployment Matrix**: Reads your active Modal control plane configuration directly by parsing the output of the Modal CLI command-line utilities.
* **Telemetry Log Viewer**: Interrogates Modal's logging streams to fetch live telemetry readouts from running GPU/CPU tasks and reports idle states when containers are autoscaled to zero.
* **API Sandbox Console**: An interactive sandbox where you can transmit prompt payloads to your live models (such as Qwen-36B or Gemma-12B) and stream responses in real-time. Includes an authorization key field for Bearer-secured endpoints.

---

## Tech Stack

* **Core Framework**: Next.js (App Router, Turbopack)
* **Programming Language**: TypeScript
* **Design System**: Orange Boosted Bootstrap (Boosted)
* **Inference Platform**: Modal (vLLM, SGLang, and Custom ASGI Apps)
* **Backend Communication**: Child Process execution (Local CLI wrapper) & server-side streaming API Proxy

---

## Getting Started

### Prerequisites

1. Install Node.js (v18.0.0 or higher).
2. Configure the Modal CLI on your local development machine:
   ```bash
   pip install modal
   modal setup
   ```
3. Verify your Modal profile is active (default configuration is loaded from `~/.modal.toml`).

### Local Development Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Building for Production

Compile the production-ready build:
```bash
npm run build
```

---

## Authentication & Production Deployments

When running locally, the API routes authenticate using your system-wide profile credentials found in `~/.modal.toml`. 

To host the dashboard in production (e.g., on Vercel or Netlify), configure these environment variables in your deployment dashboard:

* `MODAL_TOKEN_ID`: Your Modal API Token ID.
* `MODAL_TOKEN_SECRET`: Your Modal API Token Secret.

The underlying Modal SDK will intercept these variables to authorize all telemetry and control plane queries.
