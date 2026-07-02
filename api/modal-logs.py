"""Vercel Python serverless function that queries Modal app logs directly using the SDK."""

from __future__ import annotations

import asyncio
import json
import os
import time
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import modal
from modal.client import _Client
from modal_proto import api_pb2


async def _fetch_logs(name: str) -> dict:
    if not name:
        return {"error": "Name parameter is required"}

    client = await _Client.from_env()

    # Query Modal apps list to check active tasks count and retrieve app ID
    apps_resp = await client.stub.AppList(api_pb2.AppListRequest())
    
    matched_app = None
    for a in apps_resp.apps:
        app_name = a.description or a.name
        if app_name == name or a.app_id == name:
            matched_app = a
            break

    if not matched_app:
        return {
            "logs": [f'[system] App "{name}" not found in your deployed Modal applications.']
        }

    app_id = matched_app.app_id
    app_name = matched_app.description or matched_app.name
    tasks_count = matched_app.n_running_tasks
    state_map = {1: "deploying", 2: "running", 3: "deployed", 4: "stopped", 5: "errored"}
    app_state = state_map.get(matched_app.state, "unknown")

    if tasks_count == 0:
        return {
            "logs": [
                f"[system] App: {app_name} (ID: {app_id})",
                f"[system] Status: {app_state}",
                f"[system] Active Tasks: 0",
                f"[system] The model deployment is currently idle and autoscaled to zero.",
                f"[system] To trigger container startup, send a real request payload via the API Playground."
            ]
        }

    # Fetch logs from the stream
    logs = [f"[system] Fetching live container telemetry logs for {app_id}..."]
    try:
        request = api_pb2.AppGetLogsRequest(
            app_id=app_id,
            timeout=2,  # Short timeout to respond quickly
        )
        # Call the gRPC stream
        async for log_batch in client.stub.AppGetLogs.unary_stream(request):
            for item in log_batch.items:
                if item.data:
                    logs.append(item.data.strip())
            # Stop if the app completes
            if log_batch.app_done:
                break
    except Exception as e:
        logs.append(f"[system] Error streaming logs: {str(e)}")

    if len(logs) <= 1:
        # No new logs returned during the 2-second poll
        logs.append(f"[system] Connected to container {app_id} logs stream.")
        logs.append(f"[system] Container is running but has not output new logs in the last 2.0s.")

    return {"logs": logs}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed_path = urlparse(self.path)
            query = parse_qs(parsed_path.query)
            name = query.get("name", [""])[0]

            data = asyncio.run(_fetch_logs(name))
            body = json.dumps(data)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body.encode())
        except Exception as exc:
            body = json.dumps({"error": str(exc)})
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body.encode())
