# backend/app/plugin_loader.py
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class PluginLoader:
    def __init__(self):
        self.plugins_dir = Path("plugins")
        self._cache = {}

    def load_plugin(self, plugin_id: str) -> Optional[Dict]:
        if plugin_id in self._cache:
            return self._cache[plugin_id]

        path = self.plugins_dir / plugin_id / "metadata.json"
        if not path.exists():
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            self._cache[plugin_id] = metadata
            return metadata
        except Exception as e:
            logger.error(f"Load plugin error {plugin_id}: {e}")
            return None

    def list_diseases(self) -> List[str]:
        if not self.plugins_dir.exists():
            return []
        return [d.name for d in self.plugins_dir.iterdir() if d.is_dir() and (d / "metadata.json").exists()]

# Global
_plugin_loader = None

def get_plugin_loader():
    global _plugin_loader
    if _plugin_loader is None:
        _plugin_loader = PluginLoader()
    return _plugin_loader

def get_plugin(plugin_id: str):
    return get_plugin_loader().load_plugin(plugin_id)

def get_all_plugins():
    return get_plugin_loader().list_diseases()