import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import db
from api import r


@asynccontextmanager
async def lifespan(_):
    db.init()
    yield


app = FastAPI(title="PRAGYA API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_methods=["*"], allow_headers=["*"],
                   allow_origins=os.getenv("PRAGYA_CORS", "http://localhost:5173,http://127.0.0.1:5173").split(","))
app.include_router(r)
