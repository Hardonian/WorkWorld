"""
WorkWorld Python SDK (Pillar 7, Item 064).
Type-safe client library for driving WorkWorld simulations in Python evaluation harnesses.
"""

from .client import WorkWorldClient, EpisodeObservation, ActionResult, GradeResult

__all__ = ["WorkWorldClient", "EpisodeObservation", "ActionResult", "GradeResult"]
__version__ = "0.1.0"
