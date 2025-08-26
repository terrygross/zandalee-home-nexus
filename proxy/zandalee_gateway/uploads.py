import os
import uuid
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import JSONResponse
from .config import DOCS_DIR, SHARED_DOCS_DIR
from .utils import dangerous_ext

def register_routes(app: FastAPI):
    """Register file upload and listing routes on the FastAPI app."""
    
    @app.post("/local/upload")
    async def local_upload(file: UploadFile = File(...)):
        """
        Upload a file to the documents directory.
        
        Parameters:
        - file (UploadFile): The file to upload.
        
        Returns:
        - dict: {ok, path} on success.
        """
        fname = file.filename or f"upload-{uuid.uuid4().hex[:8]}"
        if dangerous_ext(fname):
            return JSONResponse({"error": "file type not allowed"}, status_code=400)
        
        path = os.path.join(DOCS_DIR, fname)
        with open(path, "wb") as f:
            f.write(await file.read())
        return {"ok": True, "path": path}
    
    @app.get("/local/docs")
    async def local_docs():
        """
        List files in the documents directory.
        
        Returns:
        - List[dict]: Array of file metadata (name, size, mtime).
        """
        files = []
        for f in os.listdir(DOCS_DIR):
            path = os.path.join(DOCS_DIR, f)
            if os.path.isfile(path) and not dangerous_ext(f):
                stat = os.stat(path)
                files.append({
                    "name": f,
                    "size": stat.st_size,
                    "mtime": int(stat.st_mtime)
                })
        return files
    
    @app.post("/shared/upload")
    async def shared_upload(file: UploadFile = File(...)):
        """
        Upload a file to the shared documents directory.
        
        Parameters:
        - file (UploadFile): The file to upload.
        
        Returns:
        - dict: {ok, path} on success.
        """
        fname = file.filename or f"upload-{uuid.uuid4().hex[:8]}"
        if dangerous_ext(fname):
            return JSONResponse({"error": "file type not allowed"}, status_code=400)
        
        path = os.path.join(SHARED_DOCS_DIR, fname)
        with open(path, "wb") as f:
            f.write(await file.read())
        return {"ok": True, "path": path}
    
    @app.get("/shared/docs")
    async def shared_docs():
        """
        List files in the shared documents directory.
        
        Returns:
        - List[dict]: Array of file metadata (name, size, mtime).
        """
        files = []
        for f in os.listdir(SHARED_DOCS_DIR):
            path = os.path.join(SHARED_DOCS_DIR, f)
            if os.path.isfile(path) and not dangerous_ext(f):
                stat = os.stat(path)
                files.append({
                    "name": f,
                    "size": stat.st_size,
                    "mtime": int(stat.st_mtime)
                })
        return files