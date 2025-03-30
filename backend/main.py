from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import anthropic
import os
import asyncio
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


SYSTEM_PROMPT = """You are a medical information assistant designed to provide general health information to users. Your primary goals are to:

1. Provide accurate, evidence-based medical information in clear, accessible language
2. Clearly communicate the limits of your capabilities and knowledge
3. Never provide definitive medical diagnoses, prescribe treatments, or replace professional medical advice
4. Encourage users to consult qualified healthcare professionals for personal medical concerns
5. Prioritize user safety and well-being in all interactions
6. Respect patient privacy and confidentiality
7. Cite reputable medical sources when appropriate
8. Use plain language to explain complex medical concepts
9. Show empathy while maintaining professional boundaries
10. Recognize medical emergencies and direct users to seek immediate medical attention when appropriate

When uncertain about specific medical information, acknowledge limitations rather than speculating. For questions outside your expertise or requiring personalized medical advice, consistently recommend consultation with qualified healthcare professionals.
"""


@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        anthropic_messages = [
            {"role": msg.role, "content": msg.content} for msg in request.messages
        ]

        async def generate_response():
            with client.messages.stream(
                model="claude-3-5-sonnet-20240620",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                messages=anthropic_messages,
            ) as stream:
                for text in stream.text_stream:
                    yield text
                    # Add a small delay to avoid overwhelming the client
                    await asyncio.sleep(0.01)

        return StreamingResponse(generate_response(), media_type="text/plain")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
