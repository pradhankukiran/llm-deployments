import { NextResponse } from "next/server";

const mockLogs: Record<string, string[]> = {
  "gemma-4-12B-OBLITERATED": [
    "[system] Pulling image lmsysorg/sglang:dev-cu12-gemma-4-12B...",
    "[system] Image pulled successfully. Initializing container on GPU L40S...",
    "[container] INFO:   Starting model download from Hugging Face: OBLITERATUS/Gemma-4-12B-OBLITERATED",
    "[container] INFO:   HF_HUB_ENABLE_HF_TRANSFER = 1 (High performance download active)",
    "[container] Downloading safety_evaluation_config.json: [====================] 100% (2.1kB/2.1kB)",
    "[container] Downloading model.safetensors.index.json:  [====================] 100% (34.2kB/34.2kB)",
    "[container] Downloading model-00001-of-00004.safetensors: [========------------] 42% (5.2GB/12.4GB) - 120MB/s",
    "[container] Downloading model-00001-of-00004.safetensors: [====================] 100% (12.4GB/12.4GB) - 138MB/s",
    "[container] Downloading model-00002-of-00004.safetensors: [====================] 100% (11.8GB/11.8GB) - 142MB/s",
    "[container] Downloading model-00003-of-00004.safetensors: [====================] 100% (12.1GB/12.1GB) - 135MB/s",
    "[container] Downloading model-00004-of-00004.safetensors: [====================] 100% (4.8GB/4.8GB) - 140MB/s",
    "[container] Model snapshot downloaded successfully to Modal volume: gemma-4-12b-obliterated-models",
    "[container] Starting SGLang launch server...",
    "[container] Command: python3 -m sglang.launch_server --model-path /models/gemma-4-12B-OBLITERATED --served-model-name gemma-4-12B-OBLITERATED --host 0.0.0.0 --port 30000 --dtype bfloat16 --load-format safetensors --context-length 131072 --mem-fraction-static 0.82 --chat-template /models/gemma-4-12B-OBLITERATED/chat_template.jinja --log-level warning --log-level-http warning",
    "[sglang] [INFO]  Initializing model...",
    "[sglang] [INFO]  Using L40S GPU accelerator. Memory allocated successfully.",
    "[sglang] [INFO]  Warmup completed. Model weights loaded.",
    "[sglang] [INFO]  Server started at http://0.0.0.0:30000",
    "[system]  Web server mapped. Endpoint active at https://pradhankukiran--gemma-4-12b-obliterated-api.modal.run",
    "[system]  Ready to serve chat completion requests."
  ],
  "ideogram-4-fp8": [
    "[system] Building image from nvidia/cuda:12.9.1-cudnn-devel-ubuntu24.04...",
    "[system] Installing apt packages: git, libgl1, libglib2.0-0...",
    "[system] Installing pip dependencies: fastapi, huggingface_hub, pydantic, uvicorn...",
    "[system] Installing git package: git+https://github.com/ideogram-oss/ideogram4.git...",
    "[system] Image build complete. Spinning up H100 GPU container...",
    "[container] INFO:   HF_HOME = /models/hf-cache",
    "[container] INFO:   HF_XET_HIGH_PERFORMANCE = 1",
    "[container] INFO:   Downloading model snapshot ideogram-ai/ideogram-4-fp8...",
    "[container] Downloading transformer/diffusion_pytorch_model.safetensors: [=========-----------] 48% (4.8GB/10.0GB) - 210MB/s",
    "[container] Downloading transformer/diffusion_pytorch_model.safetensors: [====================] 100% (10.0GB/10.0GB) - 225MB/s",
    "[container] Downloading VAE weights: [====================] 100% (160MB/160MB)",
    "[container] Model snapshot loaded. Volumes committed.",
    "[container] Starting ASGI web app wrapper (FastAPI)...",
    "[uvicorn] INFO:     Started server process [12]",
    "[uvicorn] INFO:     Waiting for application startup.",
    "[ideogram] Loading Ideogram-4-FP8 weights onto H100 GPU...",
    "[ideogram] VAE loaded on GPU. Transformer loaded on GPU.",
    "[uvicorn] INFO:     Application startup complete.",
    "[uvicorn] INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)",
    "[system]   Web server mapped. Endpoint active at https://pradhankukiran--ideogram-4-fp8-api.modal.run"
  ],
  "qwen36-27b-llama": [
    "[system] Spinning up container on default A100 GPU...",
    "[container] Initializing Qwen36-27B-Llama model weights...",
    "[container] Loading config.json...",
    "[container] Loading model.safetensors...",
    "[container] Model loaded in 14.5 seconds.",
    "[container] Initializing vLLM engine v0.4.2...",
    "[vllm] INFO: Semantics: greedy decoding enabled.",
    "[vllm] INFO: Capturing cudagraphs (this might take a minute)...",
    "[vllm] INFO: Graph capture completed in 22 seconds.",
    "[vllm] INFO: Serving at port 8000...",
    "[system] Application active."
  ],
  "vox-populi": [
    "[system] Pulling CPU-optimized python image...",
    "[container] Initializing Vox Populi Text-to-Speech service...",
    "[container] Loading voice models: en-US-Emma, en-US-Brian...",
    "[container] TTS synthesizer initialized.",
    "[container] Warmup phrase synthezised in 0.8s.",
    "[container] Web server listening on port 8000.",
    "[system] Deployment active at https://pradhankukiran--vox-populi.modal.run"
  ],
  "phc-ai-health-companion": [
    "[system] Initializing app in workspace environment...",
    "[container] PHC AI Companion: Loading prompt templates...",
    "[container] Loading clinical safety filter configurations...",
    "[container] Initializing vector index database connectors...",
    "[container] Connectors active. Ping to db: 4ms.",
    "[container] Port 8000 opened for FastAPI application.",
    "[system] Deployment active at https://pradhankukiran--phc-ai-health-companion.modal.run"
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "";

  if (!name) {
    return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
  }

  // Get matching logs or return fallback default logs
  const logs = mockLogs[name] || [
    `[system] Initializing app: ${name}`,
    `[system] Loading default configuration from environment`,
    `[container] Worker processes started.`,
    `[system] Deployment active. Ready to process requests.`
  ];

  return NextResponse.json({ logs });
}
