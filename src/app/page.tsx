"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface LocalAppConfig {
  appName: string;
  repoId?: string;
  volumeName?: string;
  gpu?: string;
  timeout?: string;
  localPath: string;
}

interface EnrichedApp {
  appId: string;
  name: string;
  state: string;
  tasksCount: number;
  createdAt: string;
  localConfig?: LocalAppConfig;
}

export default function Dashboard() {
  const [apps, setApps] = useState<EnrichedApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<EnrichedApp | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [prompt, setPrompt] = useState("Explain the difference between serverless functions and long-running container systems.");
  const [responseStream, setResponseStream] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeTab, setActiveTab] = useState<"deployments" | "playground" | "metrics">("deployments");
  const [terminalSearch, setTerminalSearch] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  // Fetch apps on mount
  useEffect(() => {
    fetchApps();
  }, []);
  // Scroll terminal container to bottom when logs change (without scrolling the browser page)
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [logs]);
  const fetchApps = async () => {
    setLoadingApps(true);
    try {
      const res = await fetch("/api/apps");
      const data = await res.json();
      setApps(data);
      // Auto-select the first app
      if (data && data.length > 0) {
        const defaultApp = data.find((a: EnrichedApp) => a.name === "gemma-4-12B-OBLITERATED") || data[0];
        setSelectedApp(defaultApp);
        fetchLogs(defaultApp.name);
      }
    } catch (err) {
      console.error("Error fetching apps:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchLogs = async (appName: string) => {
    setLoadingLogs(true);
    setLogs([]);

    try {
      const res = await fetch(`/api/logs?name=${encodeURIComponent(appName)}`);
      const data = await res.json();
      
      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
      
    } catch (err) {
      console.error("Error fetching logs:", err);
      setLogs(["[error] Failed to fetch log stream from Modal API."]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSelectApp = (app: EnrichedApp) => {
    setSelectedApp(app);
    fetchLogs(app.name);
  };

  // Send actual request to Modal API via server-side Next.js route proxy
  const handleTestAPI = async () => {
    if (!selectedApp) return;

    setIsQuerying(true);
    setResponseStream("");

    // Direct Live API Request
    try {
      const appNameLower = selectedApp.name.toLowerCase();
      let url = `https://pradhankukiran--${appNameLower}-api.modal.run/v1/chat/completions`;
      
      // Custom mapping paths for specific apps
      if (selectedApp.name === "vox-populi") {
        url = `https://pradhankukiran--${appNameLower}-api.modal.run/synthesize`;
      } else if (selectedApp.name === "ideogram-4-fp8") {
        url = `https://pradhankukiran--${appNameLower}-api.modal.run/generate`;
      }

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // Format payload body
      let requestBody: any = null;
      try {
        requestBody = JSON.parse(prompt);
      } catch (e) {
        requestBody = {
          model: selectedApp.name,
          messages: [{ role: "user", content: prompt }],
          stream: true
        };
      }

      const response = await fetch("/api/inference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          method: "POST",
          headers,
          body: requestBody
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.details || `Error status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No readable stream returned from API");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value);
        setResponseStream((prev) => prev + chunkText);
      }

    } catch (err: any) {
      console.error("API request failed:", err);
      setResponseStream(`HTTP/1.1 500 API Connection Failed
Error-Details: ${err.message}

Ensure your Modal endpoint is running and is not scaled down.
If your endpoint requires an API key, please enter it in the Authorization Key field.`);
    } finally {
      setIsQuerying(false);
    }
  };

  // Helper to color log lines
  const getLogClass = (line: string) => {
    if (!line || typeof line !== "string") return "log-line";
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("[system]")) return "log-line log-system";
    if (lowerLine.includes("[container]")) return "log-line log-container";
    if (lowerLine.includes("[sglang]")) return "log-line log-sglang";
    if (lowerLine.includes("[uvicorn]")) return "log-line log-uvicorn";
    if (lowerLine.includes("[vllm]")) return "log-line log-vllm";
    if (lowerLine.includes("[ideogram]")) return "log-line log-ideogram";
    return "log-line";
  };

  // Filter logs if searching
  const filteredLogs = logs.filter(line => 
    line && typeof line === "string" && line.toLowerCase().includes(terminalSearch.toLowerCase())
  );

  return (
    <div>
      {/* Main Grid Layout */}
      <main className="container-fluid px-4 py-4">
        
        {/* Telemetry Highlight Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card glass-card orange-border-left h-100">
              <div className="card-body p-3">
                <span className="text-secondary text-sm text-uppercase font-monospace">ACTIVE DEPLOYMENTS</span>
                <h2 className="display-4 fw-bold mt-1 text-dark" style={{ minHeight: "56px" }}>{apps.length || 5}</h2>
                <div className="progress bg-dark progress-sm mt-2" style={{ height: "4px" }}>
                  <div className="progress-bar bg-primary" role="progressbar" style={{ width: "100%", backgroundColor: "#f16e00" }}></div>
                </div>
                <div className="text-muted mt-2 d-block text-sm">100% serverless environments</div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card glass-card h-100" style={{ borderLeft: "4px solid #32c832" }}>
              <div className="card-body p-3">
                <span className="text-secondary text-sm text-uppercase font-monospace">RUNNING CONTAINERS</span>
                <h2 className="display-4 fw-bold mt-1 text-success" style={{ minHeight: "56px" }}>
                  {apps.reduce((acc, app) => acc + app.tasksCount, 0)}
                </h2>
                <div className="progress bg-dark progress-sm mt-2" style={{ height: "4px" }}>
                  <div className="progress-bar bg-success" role="progressbar" style={{ width: "0%" }}></div>
                </div>
                <div className="text-muted mt-2 d-block text-sm">Auto-scaled to zero when idle</div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card glass-card h-100" style={{ borderLeft: "4px solid #ffd200" }}>
              <div className="card-body p-3">
                <span className="text-secondary text-sm text-uppercase font-monospace">PROVISIONED GPUS</span>
                <h2 className="display-5 fw-bold mt-1 text-dark" style={{ minHeight: "56px", lineHeight: "1.1" }}>H100 / L40S</h2>
                <div className="progress bg-dark progress-sm mt-2" style={{ height: "4px" }}>
                  <div className="progress-bar" role="progressbar" style={{ width: "60%", backgroundColor: "#e5b800" }}></div>
                </div>
                <div className="text-muted mt-2 d-block text-sm">Dedicated hardware bindings active</div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card glass-card h-100" style={{ borderLeft: "4px solid #527edb" }}>
              <div className="card-body p-3">
                <span className="text-secondary text-sm text-uppercase font-monospace">ACTIVE VOLUMES</span>
                <h2 className="display-4 fw-bold mt-1 text-info" style={{ minHeight: "56px" }}>2</h2>
                <div className="progress bg-dark progress-sm mt-2" style={{ height: "4px" }}>
                  <div className="progress-bar bg-info" role="progressbar" style={{ width: "100%" }}></div>
                </div>
                <div className="text-muted mt-2 d-block text-sm">High performance caching stores</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ul className="nav nav-underline mb-4" id="dashboardTabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link font-monospace py-3 px-4 ${activeTab === "deployments" ? "active" : ""}`} 
              onClick={() => setActiveTab("deployments")}
            >
              DEPLOYMENT MATRIX
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link font-monospace py-3 px-4 ${activeTab === "playground" ? "active" : ""}`} 
              onClick={() => setActiveTab("playground")}
            >
              API PLAYGROUND
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link font-monospace py-3 px-4 ${activeTab === "metrics" ? "active" : ""}`} 
              onClick={() => setActiveTab("metrics")}
            >
              INFRASTRUCTURE METRICS
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        {activeTab === "deployments" && (
          <div className="row g-4">
            
            {/* Deployments Matrix list */}
            <div className="col-lg-6">
              <h3 className="h5 text-dark mb-3 font-monospace">ACTIVE DEPLOYMENT REPOSITORY</h3>
              
              {loadingApps ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" style={{ color: "#f16e00" }}>
                    <span className="visually-hidden">Loading deployment matrix...</span>
                  </div>
                  <p className="mt-2 text-secondary">Interrogating Modal control plane...</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {apps.map((app) => (
                    <div 
                      key={app.appId} 
                      onClick={() => handleSelectApp(app)}
                      className={`card glass-card cursor-pointer ${selectedApp?.appId === app.appId ? "selected-card" : ""}`}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`status-dot ${app.tasksCount > 0 ? "status-dot-active" : "status-dot-idle"}`}></span>
                              <h4 className="h5 mb-0 text-dark font-monospace fw-bold">{app.name}</h4>
                            </div>
                            <span className="text-secondary font-monospace text-xs d-block mt-1">ID: {app.appId}</span>
                          </div>
                          <span className="badge bg-light border border-secondary font-monospace text-secondary">
                            {app.state}
                          </span>
                        </div>

                        <div className="row mt-3 g-2 text-sm font-monospace">
                          <div className="col-6">
                            <span className="text-secondary text-xs d-block">PROVISIONED HARDWARE</span>
                            <span className="text-dark">{app.localConfig?.gpu || "None (CPU)"}</span>
                          </div>
                          <div className="col-6">
                            <span className="text-secondary text-xs d-block">LIFECYCLE TIMEOUT</span>
                            <span className="text-dark">{app.localConfig?.timeout || "5 mins"}</span>
                          </div>
                        </div>

                        {app.localConfig?.repoId && (
                          <div className="mt-2 text-sm font-monospace bg-light p-2 rounded">
                            <span className="text-secondary text-xs d-block">MODEL TARGET</span>
                            <span className="orange-highlight-text text-xs">{app.localConfig.repoId}</span>
                          </div>
                        )}

                        <div className="d-flex gap-2 mt-3 pt-2 border-top border-light">
                          <button 
                            className="btn btn-sm btn-outline-secondary font-monospace py-1 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectApp(app);
                            }}
                          >
                            Telemetry Logs
                          </button>
                          <button 
                            className="btn btn-sm btn-primary font-monospace py-1 px-3"
                            style={{ backgroundColor: "#f16e00", borderColor: "#f16e00" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                              setActiveTab("playground");
                            }}
                          >
                            Playground
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logs console viewer */}
            <div className="col-lg-6">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h5 text-dark mb-0 font-monospace">
                  LOG CONSOLE: <span className="orange-highlight">{selectedApp?.name || "Select App"}</span>
                </h3>
                <input 
                  type="text" 
                  placeholder="Filter logs..." 
                  className="form-control form-control-sm bg-white text-dark border-secondary font-monospace"
                  style={{ width: "160px" }}
                  value={terminalSearch}
                  onChange={(e) => setTerminalSearch(e.target.value)}
                />
              </div>

              <div className="terminal-window">
                <div className="terminal-header">
                  <div className="terminal-buttons">
                    <span className="terminal-btn terminal-btn-red"></span>
                    <span className="terminal-btn terminal-btn-yellow"></span>
                    <span className="terminal-btn terminal-btn-green"></span>
                  </div>
                  <span className="terminal-title">modal logs --app {selectedApp?.appId || "null"}</span>
                  <button 
                    className="btn btn-link btn-sm text-secondary p-0 font-monospace"
                    onClick={() => selectedApp && fetchLogs(selectedApp.name)}
                    style={{ textDecoration: "none" }}
                  >
                    Refresh
                  </button>
                </div>
                
                <div ref={terminalBodyRef} className="terminal-body" style={{ minHeight: "340px", maxHeight: "400px" }}>
                  {filteredLogs.length === 0 ? (
                    <div className="text-secondary text-center py-5">
                      {loadingLogs ? "Connecting to logs socket..." : "No logs available. Select an app or clear filters."}
                    </div>
                  ) : (
                    filteredLogs.map((line, i) => (
                      <div key={i} className={getLogClass(line)}>
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Local codebase link detail */}
              {selectedApp?.localConfig && (
                <div className="card bg-light border-secondary mt-4">
                  <div className="card-body p-3">
                    <h5 className="h6 text-dark font-monospace orange-highlight mb-2">Codebase Configuration</h5>
                    <div className="text-sm font-monospace text-secondary">
                      <div className="mb-1">
                        File Path: <span className="text-dark">/home/kiran/Projects/{selectedApp.name}/modal_app.py</span>
                      </div>
                      {selectedApp.localConfig.volumeName && (
                        <div className="mb-1">
                          Modal Volume: <span className="text-dark">{selectedApp.localConfig.volumeName}</span>
                        </div>
                      )}
                      <div>
                        Target Host: <span className="text-dark">https://pradhankukiran--{selectedApp.name.toLowerCase()}-api.modal.run</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* API Playground Tab */}
        {activeTab === "playground" && (
          <div className="row g-4">
            <div className="col-lg-5">
              <h3 className="h5 text-dark mb-3 font-monospace">API SANDBOX CONSOLE</h3>
              
              <div className="card glass-card">
                <div className="card-body p-4">
                  <div className="mb-3">
                    <label className="form-label text-secondary text-xs font-monospace d-block">SELECT ENDPOINT</label>
                    <select 
                      className="form-select bg-white text-dark border-secondary font-monospace"
                      value={selectedApp?.appId || ""}
                      onChange={(e) => {
                        const matched = apps.find(a => a.appId === e.target.value);
                        if (matched) setSelectedApp(matched);
                      }}
                    >
                      {apps.map(a => (
                        <option key={a.appId} value={a.appId}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3 font-monospace bg-light p-2 rounded border border-secondary">
                    <span className="text-secondary text-xs d-block">ENDPOINT URL</span>
                    <span className="orange-highlight-text text-xs word-break">
                      {selectedApp?.name === "vox-populi"
                        ? `https://pradhankukiran--vox-populi-api.modal.run/synthesize`
                        : selectedApp?.name === "ideogram-4-fp8"
                        ? `https://pradhankukiran--ideogram-4-fp8-api.modal.run/generate`
                        : `https://pradhankukiran--${selectedApp?.name.toLowerCase()}-api.modal.run/v1/chat/completions`}
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary text-xs font-monospace">AUTHORIZATION KEY (BEARER TOKEN)</label>
                    <input 
                      type="password" 
                      placeholder="Enter API key if required..." 
                      className="form-control bg-white text-dark border-secondary font-monospace"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary text-xs font-monospace">PROMPT / REQUEST BODY</label>
                    <textarea 
                      className="form-control bg-white text-dark border-secondary font-monospace" 
                      rows={4}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    ></textarea>
                  </div>

                  <button 
                    className="btn btn-primary w-100 font-monospace py-2"
                    style={{ backgroundColor: "#f16e00", borderColor: "#f16e00" }}
                    onClick={handleTestAPI}
                    disabled={isQuerying || !selectedApp}
                  >
                    {isQuerying ? "TRANSMITTING PAYLOAD..." : "SEND TEST REQUEST"}
                  </button>
                </div>
              </div>
            </div>

             <div className="col-lg-7">
               <h3 className="h5 text-dark mb-3 font-monospace">RESPONSE STREAM OUTPUT</h3>
               
               <div className="terminal-window h-100">
                 <div className="terminal-header">
                   <div className="terminal-buttons">
                     <span className="terminal-btn terminal-btn-red"></span>
                     <span className="terminal-btn terminal-btn-yellow"></span>
                     <span className="terminal-btn terminal-btn-green"></span>
                   </div>
                   <span className="terminal-title">curl response stream</span>
                   <button 
                     className="btn btn-link btn-sm text-secondary p-0 font-monospace"
                     style={{ textDecoration: "none" }}
                     onClick={() => setResponseStream("")}
                   >
                     Clear
                   </button>
                 </div>
                 
                 <div className="terminal-body bg-black" style={{ minHeight: "360px", maxHeight: "420px", color: "#a5f3fc" }}>
                   {responseStream ? (
                     <pre className="mb-0 font-monospace text-xs" style={{ whiteSpace: "pre-wrap" }}>{responseStream}</pre>
                   ) : (
                     <div className="text-secondary text-center py-5">
                       {isQuerying ? "Opening stream connection..." : "Send a request payload on the left to see streaming token output."}
                     </div>
                   )}
                 </div>
               </div>
             </div>
           </div>
         )}
 
         {/* Infrastructure Metrics Tab */}
         {activeTab === "metrics" && (
           <div className="row g-4">
             <div className="col-md-6">
               <div className="card glass-card">
                 <div className="card-body p-4">
                   <h4 className="h5 text-dark font-monospace orange-highlight mb-3">GPU Compute Inventory</h4>
                   <div className="table-responsive">
                     <table className="table table-sm table-hover border-secondary font-monospace text-sm">
                       <thead>
                         <tr className="text-secondary border-bottom border-secondary">
                           <th>GPU Type</th>
                           <th>VRAM</th>
                           <th>Active Nodes</th>
                           <th>Target Models</th>
                         </tr>
                       </thead>
                       <tbody>
                         <tr className="border-bottom border-light">
                           <td className="text-dark">NVIDIA H100</td>
                           <td className="text-dark">80GB HBM3</td>
                           <td className="text-dark">0 / 1</td>
                           <td className="text-dark">`ideogram-4-fp8`</td>
                         </tr>
                         <tr className="border-bottom border-light">
                           <td className="text-dark">NVIDIA L40S</td>
                           <td className="text-dark">48GB GDDR6</td>
                           <td className="text-dark">0 / 1</td>
                           <td className="text-dark">`gemma-4-12B-OBLITERATED`</td>
                         </tr>
                         <tr className="border-bottom border-light">
                           <td className="text-dark">NVIDIA A100</td>
                           <td className="text-dark">40GB HBM2</td>
                           <td className="text-dark">0 / 1</td>
                           <td className="text-dark">`qwen36-27b-llama`</td>
                         </tr>
                         <tr className="border-bottom border-light">
                           <td className="text-dark">Shared CPU</td>
                           <td className="text-dark">Dynamic</td>
                           <td className="text-dark">0 / 2</td>
                           <td className="text-dark">`vox-populi`, `phc-companion`</td>
                         </tr>
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>
             </div>
 
             <div className="col-md-6">
               <div className="card glass-card">
                 <div className="card-body p-4">
                   <h4 className="h5 text-dark font-monospace orange-highlight mb-3">Serverless Auto-scaling Settings</h4>
                   <p className="text-secondary text-sm">
                     Each model handles cold starts dynamically. The current configurations extracted from your codebase settings:
                   </p>
                   <ul className="list-group font-monospace text-sm">
                     <li className="list-group-item bg-transparent text-dark border-secondary">
                       <strong className="orange-highlight-text">gemma-4-12B:</strong> Min containers = 0, Max = 1, Idle Scale-down = 10 minutes
                     </li>
                     <li className="list-group-item bg-transparent text-dark border-secondary">
                       <strong className="orange-highlight-text">ideogram-4-fp8:</strong> Min containers = 0, Max = 1, Idle Scale-down = 5 minutes
                     </li>
                     <li className="list-group-item bg-transparent text-dark border-secondary">
                       <strong className="orange-highlight-text">vLLM Inference:</strong> Auto-scales to 0 inside 2 minutes of idle time.
                     </li>
                   </ul>
                 </div>
               </div>
             </div>
           </div>
         )}

      </main>

    </div>
  );
}
