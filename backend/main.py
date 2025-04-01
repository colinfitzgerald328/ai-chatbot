from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import anthropic
import os
import asyncio
import json
import httpx
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from google import genai

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

# Add these environment variables to your .env file
# OPENAI_API_KEY=your_openai_key
# GEMINI_API_KEY=your_gemini_key

# Add this near the top of the file, after imports
MEDIA_TYPE_TEXT_PLAIN = "text/plain"


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "claude"  # Default to Claude


SYSTEM_PROMPT = """You are a friendly AI assistant designed to provide helpful information to users on a wide range of topics. Your primary goals are to:

1. Provide accurate, evidence-based information in clear, accessible language 📚💡
2. Clearly communicate the limits of your capabilities and knowledge 🚫🤔
3. Never provide definitive professional advice or replace expert consultation 🙅‍♂️👨‍⚕️
4. Encourage users to consult qualified professionals for specific concerns 👩‍💼👍
5. Prioritize user safety and well-being in all interactions 🛡️❤️
6. Respect user privacy and confidentiality 🤐🔒
7. Cite reputable sources when appropriate 📖✅
8. Use plain language to explain complex concepts 🗣️👥
9. Show empathy while maintaining professional boundaries 🤗👔
10. Recognize urgent situations and direct users to seek immediate help when appropriate 🚨⚠️

When uncertain about specific information, acknowledge limitations rather than speculating. For questions outside your expertise or requiring personalized advice, consistently recommend consultation with qualified professionals.

Remember to frequently use emojis in your responses to maintain a friendly and approachable tone with users! 😊👋
"""


@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        model = request.model.lower()
        anthropic_messages = [
            {"role": msg.role, "content": msg.content} for msg in request.messages
        ]

        if model == "claude":
            return await handle_claude_stream(anthropic_messages)
        elif model == "gpt":
            return await handle_gpt_stream(anthropic_messages)
        elif model == "gemini":
            return await handle_gemini_stream(anthropic_messages)
        else:
            # Default to Claude if model is not recognized
            return await handle_claude_stream(anthropic_messages)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# Claude streaming handler
async def handle_claude_stream(messages):
    async def generate_response():
        # Filter out empty messages except for the last one if it's from the assistant
        filtered_messages = []
        for i, msg in enumerate(messages):
            # Skip messages with empty content unless it's the last message and from the assistant
            if not msg.get('content') and not (i == len(messages) - 1 and msg.get('role') == 'assistant'):
                continue
            filtered_messages.append(msg)
            
        with client.messages.stream(
            model="claude-3-7-sonnet-20250219",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=filtered_messages,
        ) as stream:
            for text in stream.text_stream:
                yield text
                # Add a small delay to avoid overwhelming the client
                await asyncio.sleep(0.01)

    return StreamingResponse(generate_response(), media_type=MEDIA_TYPE_TEXT_PLAIN)


# GPT streaming handler
async def handle_gpt_stream(messages):
    async def generate_response():
        # Initialize OpenAI client
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Format messages for OpenAI
        openai_messages = [
            {"role": msg["role"], "content": msg["content"]} for msg in messages
        ]

        # Add system message for GPT
        openai_messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

        # Create streaming response
        stream = await client.chat.completions.create(
            model="gpt-4o", messages=openai_messages, stream=True
        )

        # Process the stream
        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content

    return StreamingResponse(generate_response(), media_type=MEDIA_TYPE_TEXT_PLAIN)


# Gemini streaming handler
async def handle_gemini_stream(messages):
    async def generate_response():
        # Initialize Gemini client
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        # Format messages for Gemini API
        gemini_messages = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            content = msg["content"]
            gemini_messages.append({"role": role, "parts": [{"text": content}]})

        # Add system prompt as a prefix to the first user message
        if gemini_messages and gemini_messages[0]["role"] == "user":
            gemini_messages[0]["parts"][0]["text"] = (
                f"System instruction: {SYSTEM_PROMPT}\n\n"
                f"User: {gemini_messages[0]['parts'][0]['text']}"
            )

        # Create streaming response
        response = client.models.generate_content_stream(
            model="gemini-2.5-pro-exp-03-25", contents=gemini_messages
        )

        # Process the stream
        for chunk in response:
            if chunk.text:
                yield chunk.text

    return StreamingResponse(generate_response(), media_type=MEDIA_TYPE_TEXT_PLAIN)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
