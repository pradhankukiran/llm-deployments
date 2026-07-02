"""Vercel Python serverless function that queries the Modal API directly using the SDK."""

from __future__ import annotations

import asyncio
import json
import os
import time
from http.server import BaseHTTPRequestHandler

import modal
from modal.client import _Client
from modal_proto import api_pb2


async def _fetch_telemetry() -> dict:
    client = await _Client.from_env()

    # 1. Apps
    apps_resp = await client.stub.AppList(api_pb2.AppListRequest())
    apps = []
    for a in apps_resp.apps:
        state_map = {1: "deploying", 2: "running", 3: "deployed", 4: "stopped", 5: "errored"}
        apps.append({
            "appId": a.app_id,
            "name": a.description or a.name,
            "state": state_map.get(a.state, "unknown"),
            "tasksCount": a.n_running_tasks,
            "createdAt": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(a.created_at)),
        })

    # 2. Containers (TaskList)
    containers = []
    try:
        task_resp = await client.stub.TaskList(api_pb2.TaskListRequest())
        for t in task_resp.tasks:
            containers.append({
                "Task ID": t.task_id,
                "App Name": t.app_description,
                "Started at": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(t.started_at)) if t.started_at else None,
            })
    except Exception:
        pass

    # 3. Volumes
    volumes = []
    try:
        vol_resp = await client.stub.VolumeList(api_pb2.VolumeListRequest())
        for v in vol_resp.volumes:
            volumes.append({
                "Name": v.label,
                "Created at": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(v.created_at)) if v.created_at else None,
            })
    except Exception:
        pass

    # 4. Profile
    profile = None
    token_id = os.environ.get("MODAL_TOKEN_ID", "")
    if token_id:
        profile = {"name": "vercel-runtime", "active": True, "workspace": token_id[:8] + "..."}

    return {
        "apps": apps,
        "containers": containers,
        "volumes": volumes,
        "secrets": [],
        "profile": profile,
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            data = asyncio.run(_fetch_telemetry())
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
