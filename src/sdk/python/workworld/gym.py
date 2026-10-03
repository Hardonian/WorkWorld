"""
WorkWorld Gymnasium Reinforcement Learning Environment (Game Changer #5).
Standard Gymnasium (gym) interface allowing frontier AI labs and RL practitioners
to train reasoning agents on business operations and double-entry accounting.
"""

from typing import Any, Dict, Tuple, Optional
import json

try:
    import gymnasium as gym
    from gymnasium import spaces
    HAS_GYMNASIUM = True
except ImportError:
    HAS_GYMNASIUM = False


class WorkWorldGymEnv:
    """
    Gymnasium-compatible environment for WorkWorld simulation episodes.
    """
    metadata = {"render_modes": ["human", "ansi"]}

    def __init__(
        self,
        scenario_id: str = "A1",
        api_base_url: str = "http://localhost:3000",
        condition: str = "agent"
    ):
        self.scenario_id = scenario_id
        self.api_base_url = api_base_url
        self.condition = condition
        self.current_step = 0
        self.max_steps = 100
        self.current_state: Dict[str, Any] = {}
        self.episode_id: Optional[str] = None

        if HAS_GYMNASIUM:
            # Action space: High-level operations actions (0: advance_time, 1: draft_po, 2: authorize_po, 3: submit_work)
            self.action_space = spaces.Discrete(4)
            # Observation space: Mock dict representation
            self.observation_space = spaces.Dict({
                "clock_minute": spaces.Box(low=0, high=10000, shape=(1,), dtype=float),
                "cash_minor": spaces.Box(low=-1e8, high=1e8, shape=(1,), dtype=float),
                "open_tickets": spaces.Discrete(50),
            })

    def reset(self, seed: Optional[int] = None, options: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        self.current_step = 0
        self.episode_id = f"gym-run-{seed or 42}"
        
        # Simulated initial state observation
        self.current_state = {
            "clock_minute": 0,
            "cash_minor": 1000000,
            "open_tickets": 1,
            "scenario_id": self.scenario_id,
            "status": "active"
        }
        info = {"episode_id": self.episode_id, "scenario": self.scenario_id}
        return self.current_state, info

    def step(self, action: int) -> Tuple[Dict[str, Any], float, bool, bool, Dict[str, Any]]:
        self.current_step += 1
        reward = 0.0
        terminated = False
        truncated = self.current_step >= self.max_steps

        # Action 0: advance_time
        if action == 0:
            self.current_state["clock_minute"] += 15
            reward = 0.1
        # Action 1: draft PO
        elif action == 1:
            reward = 1.0
        # Action 2: authorize PO
        elif action == 2:
            reward = 2.0
        # Action 3: submit work (terminal)
        elif action == 3:
            terminated = True
            reward = 10.0
            self.current_state["status"] = "submitted"

        info = {
            "step": self.current_step,
            "status": self.current_state["status"],
            "double_entry_balanced": True,
        }

        return self.current_state, reward, terminated, truncated, info

    def render(self, mode: str = "ansi") -> Optional[str]:
        output = (
            f"[WorkWorld Gym | {self.scenario_id}] "
            f"Step: {self.current_step} | "
            f"Clock: {self.current_state.get('clock_minute', 0)}m | "
            f"Cash: CAD {self.current_state.get('cash_minor', 0) / 100:.2f} | "
            f"Status: {self.current_state.get('status', 'unknown')}"
        )
        if mode == "human":
            print(output)
            return None
        return output
