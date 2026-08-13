from __future__ import annotations

import asyncio
import logging
import shlex
import sys
from typing import Optional

from agents.mcp import MCPServer, MCPServerSse, MCPServerStdio

from config import settings

logger = logging.getLogger(__name__)

_mcp_client: Optional[MCPServer] = None
_connected = False
_connect_lock = asyncio.Lock()


def _build_client() -> MCPServer:
    """Build an SSE or stdio Fetch MCP client depending on FETCH_MCP_URL.

    An http(s) value connects to an already-running server; anything else is
    treated as a command line for a stdio server spawned as a child process.
    """
    target = settings.fetch_mcp_url.strip()

    if target.startswith(("http://", "https://")):
        logger.info("Using SSE Fetch MCP server at %s", target)
        return MCPServerSse(name="fetch", params={"url": target})

    command, *args = shlex.split(target)
    # "python" on PATH may not be the venv interpreter that has mcp_server_fetch.
    if command in ("python", "python3"):
        command = sys.executable
    logger.info("Spawning stdio Fetch MCP server: %s %s", command, " ".join(args))
    return MCPServerStdio(
        name="fetch",
        params={"command": command, "args": args},
        cache_tools_list=True,
    )


def get_mcp_client() -> MCPServer:
    """Return the singleton Fetch MCP client."""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = _build_client()
    return _mcp_client


async def connect_mcp() -> bool:
    """Open the MCP session. Returns True if connected.

    Failure is non-fatal: the app still starts so upload validation works and
    search failures surface as per-tier warnings instead of a dead server.
    """
    global _connected
    if _connected:
        return True
    async with _connect_lock:
        if _connected:
            return True
        try:
            await get_mcp_client().connect()
        except Exception as exc:
            logger.warning(
                "Could not connect to Fetch MCP (%s: %s). Job searches will fail "
                "until it is reachable.",
                type(exc).__name__,
                exc,
            )
            return False
        _connected = True
        logger.info("Fetch MCP client connected.")
        return True


def is_connected() -> bool:
    """True once connect_mcp has opened a session."""
    return _connected


async def close_mcp() -> None:
    global _mcp_client, _connected
    if _mcp_client is not None and _connected:
        try:
            await _mcp_client.cleanup()
        except Exception as exc:
            logger.warning("Error while closing Fetch MCP client: %s", exc)
    _mcp_client = None
    _connected = False
