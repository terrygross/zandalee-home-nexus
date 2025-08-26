from collections import deque
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from .utils import jsonl_append
from .shared import SHARED_CHAT_JSONL

def register_routes(app: FastAPI):
    """Register WebSocket routes on the FastAPI app."""
    
    _ws_conns = deque()
    
    @app.websocket("/ws")
    async def websocket_endpoint(ws: WebSocket):
        """
        Handle WebSocket connections for real-time chat.
        
        Parameters:
        - ws (WebSocket): WebSocket connection.
        """
        await ws.accept()
        _ws_conns.append(ws)
        try:
            while True:
                data = await ws.receive_json()
                text = (data.get("text") or "").strip()
                user_id = (data.get("userId") or "").strip()
                role = (data.get("role") or "user").strip()
                
                if text and user_id:
                    msg_id = f"{int(time.time())}-{user_id[:8]}"
                    msg = {
                        "id": msg_id,
                        "text": text,
                        "userId": user_id,
                        "role": role,
                        "created_at": int(time.time())
                    }
                    jsonl_append(SHARED_CHAT_JSONL, msg)
                    for conn in _ws_conns:
                        try:
                            await conn.send_json(msg)
                        except Exception:
                            _ws_conns.remove(conn)
        except WebSocketDisconnect:
            _ws_conns.remove(ws)

