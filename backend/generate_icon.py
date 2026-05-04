"""One-off script to generate the Cosmos app icon using Gemini Nano Banana."""
import asyncio
import base64
import os
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv(Path(__file__).parent / ".env")

PROMPT = (
    "Square app icon, 1:1 aspect ratio. Hyper-realistic night sky scene: deep "
    "midnight-blue gradient background (dark navy fading to almost black), "
    "scattered warm-toned stars (soft gold, amber, pale peach and off-white "
    "glows) with realistic bokeh and subtle lens-flare starbursts, a gently "
    "visible milky-way dust cloud in the background, and three or four bright "
    "streaking shooting stars with short gold-to-white trails crossing the "
    "frame diagonally. In the exact geometric center of the icon, place a "
    "single clean, minimalist emblem consisting of THREE gold 4-pointed "
    "sparkle stars arranged in a tight triangular cluster (one large star on "
    "top, two smaller stars at the bottom-left and bottom-right). The emblem "
    "should glow softly with a warm gold halo and be clearly readable at small "
    "sizes. Absolutely no text, no letters, no words, no 'Cosmos', no "
    "watermark. Cinematic, luxurious, premium feel. Solid square, no rounded "
    "corners, no border, edge-to-edge."
)

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id="cosmos-icon", system_message="You generate app icons.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    print("Model text:", (text or "")[:120])
    if not images:
        raise SystemExit("No image returned")
    out = Path("/app/frontend/assets/images/icon.png")
    out.write_bytes(base64.b64decode(images[0]["data"]))
    print(f"Wrote {out} ({out.stat().st_size} bytes)")

if __name__ == "__main__":
    asyncio.run(main())
