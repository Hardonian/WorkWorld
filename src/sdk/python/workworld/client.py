"""
Official WorkWorld Python Client (Pillar 7, Item 064).
Communicates with the WorkWorld REST API v1.
"""

from typing import Dict, Any, Optional, List
import urllib.request
import urllib.error
import json

class EpisodeObservation:
    def __init__(self, data: Dict[str, Any]):
        self.raw = data
        self.scenario_id: str = data.get("scenarioId", "")
        self.title: str = data.get("episodeTitle", "")
        self.day: int = data.get("day", 0)
        self.clock_minute: int = data.get("clockMinute", 0)
        self.status: str = data.get("status", "active")
        self.inventory: Dict[str, int] = data.get("inventory", {})

class ActionResult:
    def __init__(self, ok: bool, feedback: str, observation: Optional[EpisodeObservation], errors: List[str]):
        self.ok = ok
        self.feedback = feedback
        self.observation = observation
        self.errors = errors

class GradeResult:
    def __init__(self, data: Dict[str, Any]):
        self.raw = data
        self.outcome: str = data.get("outcome", "fail")
        self.composite_score: float = float(data.get("compositeScore", 0.0))

class WorkWorldClient:
    def __init__(self, base_url: str = "http://localhost:3100", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                return json.loads(err_body)
            except Exception:
                raise RuntimeError(f"HTTP {e.code}: {err_body}")

    def create_episode(self, scenario_id: str, condition: str = "agent") -> Dict[str, Any]:
        return self._request("POST", "/api/v1/episodes", {
            "scenarioId": scenario_id,
            "condition": condition,
        })

    def get_state(self, episode_id: str) -> EpisodeObservation:
        res = self._request("GET", f"/api/v1/episodes?id={episode_id}")
        return EpisodeObservation(res.get("observation", {}))

    def execute_action(self, episode_id: str, action_payload: Dict[str, Any]) -> ActionResult:
        res = self._request("POST", "/api/v1/actions", {
            "episodeId": episode_id,
            **action_payload,
        })
        errors = [e.get("message", "") for e in res.get("errors", [])]
        obs = EpisodeObservation(res["observation"]) if "observation" in res else None
        return ActionResult(
            ok=bool(res.get("ok", False)),
            feedback=res.get("feedback", ""),
            observation=obs,
            errors=errors,
        )

    def grade_episode(self, episode_id: str) -> GradeResult:
        res = self._request("POST", "/api/v1/evaluations", {"episodeId": episode_id})
        return GradeResult(res.get("evaluation", {}))
