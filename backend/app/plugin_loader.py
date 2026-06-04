from pathlib import Path
from typing import Dict
import json
import time
from .schema_validator import validate_disease_schema


class PluginLoader:
    """
    Load and cache disease plugin metadata with hot-reload support.
    
    Plugins are loaded from plugin_name/metadata.json and validated
    against DiseaseSchema. Caching is used for performance with
    file-based cache invalidation.
    """
    
    def __init__(self, plugins_dir: Path = Path("plugins")):
        self.plugins_dir = plugins_dir
        self._cache = {}
        self._last_modified = {}

    def load_plugin(self, plugin_name: str, force_reload: bool = False) -> Dict:
        """
        Load plugin metadata from disk or cache.
        
        Args:
            plugin_name: Name of the plugin directory
            force_reload: Ignore cache and reload from disk
            
        Returns:
            Validated plugin metadata as dictionary
            
        Raises:
            FileNotFoundError: If plugin metadata.json not found
            ValueError: If metadata fails schema validation
        """
        plugin_path = self.plugins_dir / plugin_name / "metadata.json"
        
        if not plugin_path.exists():
            raise FileNotFoundError(f"Plugin {plugin_name} not found at {plugin_path}")

        # Hot Reload logic - check if file has been modified
        current_mtime = plugin_path.stat().st_mtime
        cache_key = plugin_name

        if (force_reload or 
            cache_key not in self._cache or 
            self._last_modified.get(cache_key) != current_mtime):
            
            with open(plugin_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Validate against DiseaseSchema
            validated = validate_disease_schema(data)
            
            # Convert Pydantic model to dict, excluding None values
            plugin_dict = validated.model_dump(exclude_none=True)

            # Cache the result
            self._cache[cache_key] = plugin_dict
            self._last_modified[cache_key] = current_mtime
            
            print(f"🔄 Plugin '{plugin_name}' loaded at {time.strftime('%H:%M:%S')}")

        return self._cache[cache_key]

    def list_plugins(self):
        """List all available plugins in plugins directory"""
        return [p.name for p in self.plugins_dir.iterdir() if p.is_dir()]

    def clear_cache(self):
        """Clear all cached plugins"""
        self._cache.clear()
        self._last_modified.clear()
