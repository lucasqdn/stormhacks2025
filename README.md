# stormhacks2025

Camera-powered language learning app built at StormHacks 2025. The app uses your phone camera to detect everyday objects with YOLOv8, translates the label into your target language, and speaks it aloud. It’s split into an Expo React Native frontend and a FastAPI backend with Ultralytics YOLO and googletrans.

## Who it's for

- Language learners (beginner to intermediate) who want quick, contextual vocabulary practice
- Travelers who need fast, in-the-moment translations of everyday objects
- Visual learners, kids, and parents looking for an engaging way to build word associations
- Educators and hobbyists exploring computer vision + language learning workflows

## Why we built it

- Learning sticks better when it’s tied to your surroundings—turn any object into a micro lesson
- Reduce friction: one tap to detect, translate, and hear pronunciation—no typing or searching
- Explore a practical full-stack ML pipeline for mobile: camera → backend model → translation → TTS feedback
- Built at StormHacks 2025 to showcase a polished, accessible UI paired with a lightweight, CPU-only backend deploy

## What you get

- Full-screen camera with a clean, “liquid glass” UI and white shutter button
- One-tap capture → object detected on the backend → translated text returned
- Text-to-speech playback (Expo Speech) for quick pronunciation
- In-app settings to change the target language and API endpoint (e.g., switch between local and cloud)

## Tech overview

- Frontend: Expo SDK 54 (React Native 0.81), packages: expo-camera, expo-speech, expo-av, expo-blur, expo-linear-gradient, axios
- Backend: FastAPI + Ultralytics YOLOv8 with CPU-only PyTorch, googletrans for translation
- Endpoints:
  - POST /process-image → returns detected word translated to both source and target languages
  - POST /identify → simpler compatibility endpoint returning { word, translation }
  - GET /health → simple health/version check

## Project structure

```
stormhacks2025/
├─ frontend/                 # Expo app
│  ├─ screens/               # Camera & test screens
│  ├─ services/api.js        # Backend endpoints and API calls
│  └─ utils/tts.js           # Text-to-speech helpers
└─ backend/                  # FastAPI service
	 ├─ main.py                # Endpoints & translation glue
	 └─ model/
			├─ yolov8.py           # YOLO model wrapper (loads yolov8n.pt once)
			└─ yolov8n.pt          # Local YOLOv8n weights
```

## Quick start (5 minutes)

You can run backend and frontend locally on macOS and test in the iOS Simulator.

1. Backend (FastAPI)

```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- The repo includes a CPU-only PyTorch index in requirements for faster installs.
- The YOLO weights file model/yolov8n.pt is checked in; if you replace it, keep the same path.

2. Frontend (Expo)

Open a second terminal:

```
cd frontend
npm install
npm run ios
```

- This launches Metro and boots the iOS Simulator. Alternatively: `npm start` and press `i`.
- In the app, open the settings “gear” and set Process Endpoint to your local server: `http://127.0.0.1:8000/process-image`.
  - On iOS Simulator, `localhost` and `127.0.0.1` refer to your Mac host. For a physical device on Wi‑Fi, use your Mac’s LAN IP (e.g., `http://192.168.1.10:8000/process-image`).

Capture a photo with the white shutter. You should hear the translated word spoken back.

## API reference

### POST /process-image

Detect an object and translate it into two languages (source and target). This is the main endpoint used by the app.

Request body (JSON):

```
{
	"src_lang": "en",          // language code for a description in the source language
	"dest_lang": "es",         // language code for the target translation
	"image": "<base64>"        // base64-encoded image
}
```

Response (JSON):

```
{
	"src_lang_description": "bottle",
	"dest_lang_description": "botella"
}
```

Curl example (macOS):

```
IMG64=$(base64 -i path/to/photo.jpg | tr -d '\n')
curl -s \
	-H 'Content-Type: application/json' \
	-d "{\"src_lang\":\"en\",\"dest_lang\":\"fr\",\"image\":\"$IMG64\"}" \
	http://127.0.0.1:8000/process-image | jq .
```

### POST /identify

Compatibility endpoint that returns a single translation.

Request:

```
{
	"image_base64": "<base64>",
	"target_lang": "ja"
}
```

Response:

```
{ "word": "bottle", "translation": "ボトル" }
```

### GET /health

Health check with version string.

```
curl http://127.0.0.1:8000/health
```

## Development notes

### Frontend (Expo)

- Key libs: expo-camera, expo-speech, expo-av, expo-blur, expo-linear-gradient
- Scripts in `frontend/package.json`:
  - `npm run ios` → Start Metro and open iOS Simulator
  - `npm run android` → Start Metro and open Android (if available)
  - `npm run web` → Web preview (needs CORS and camera permissions in browser)
- The process endpoint can be changed at runtime via the settings modal, or statically in `frontend/services/api.js`.

### Backend (FastAPI + YOLOv8)

- Ultralytics YOLOv8 loads once at import from `backend/model/yolov8n.pt` to avoid network downloads at runtime.
- PyTorch is pinned to a CPU-only wheel via an extra index for faster and more reliable deploys.
- Translations use `googletrans==4.0.2`. Some variants return a coroutine; the code guards by awaiting when necessary.

## Deploying the backend (Render)

Typical settings when deploying to Render (or similar):

- Build: `pip install -r backend/requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Root directory: `backend`

If you update the code, redeploy so Render picks up the latest version. Verify with `/health` and check logs if you see 500s.

## Troubleshooting

- iOS Simulator can’t call the backend

  - Use `http://127.0.0.1:8000` in the app settings when the backend runs on your Mac.
  - For a physical device, use your Mac’s LAN IP and ensure both are on the same network.

- Torch install is slow

  - Requirements already use the CPU wheel index for PyTorch. The first install still downloads a large wheel; subsequent installs are cached.

- YOLO model errors or empty detections

  - Make sure `backend/model/yolov8n.pt` exists. You can swap it with other YOLOv8 weights, but keep the file path or update `model/yolov8.py` accordingly.

- Web build can’t reach the backend (CORS)

  - Native iOS/Android apps don’t need CORS, but web does. If you want to use the web target, add FastAPI CORS middleware to allow your dev origin.

- 500 on `/process-image` with a googletrans coroutine error
  - The backend code already guards this by awaiting coroutine results. If you still see it in production, redeploy and confirm `GET /health` shows the latest version.

## Acknowledgements

- Ultralytics YOLOv8 (object detection)
- googletrans (translation)
- Expo + React Native (mobile frontend)

## License

No license specified. Add one if you plan to reuse or publish.
