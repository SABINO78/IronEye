# 🏋️‍♂️ IronEye - AI-Powered Gym Equipment Identifier

[![Google Play](https://shields.io)](#) 
[![License: MIT](https://shields.io)](https://opensource.org)
[![Development: AI-Assisted](https://shields.io)](#)

**IronEye** is an MVP mobile application designed to instantly identify gym equipment using Computer Vision. Built as a hands-on exploration of AI engineering and software architecture, the app allows users to point their camera at any gym machine and receive an immediate structural and functional breakdown.

---

## 🚀 Key Features

- **Computer Vision Recognition:** Uses multimodal LLMs to identify gym machinery from a single photograph in ~2 seconds.
- **Strict JSON Schema Enforcement:** The backend forces structured JSON responses from the AI via system prompts and few-shot examples, eliminating unstable text parsing.
- **Manual Fallback:** Users can manually type the equipment name if camera conditions are sub-optimal, triggering the same analytical breakdown.
- **Secure Backend Architecture:** AI keys and core logic are isolated on the backend; the client never exposes sensitive credentials.
- **Monetization Ready:** Implements a freemium model with a limited daily scan tier managed via RevenueCat.

---

## 🛠️ Tech Stack & Architecture

This project follows a classic, decoupled client-server architecture built for fast shipping and scalability:

- **Frontend:** React Native (Expo)
- **Backend:** Flask (Python) hosted on Render
- **Database:** Supabase (PostgreSQL)
- **AI Engine:** Claude API (Anthropic) via backend environment variables
- **In-App Purchases:** RevenueCat

---

## 🧠 AI Engineering & Development Process

This project was built using **AI-Assisted Development (Vibe Coding)** techniques. The development focused heavily on system architecture, API security, and prompt engineering, leveraging advanced AI tools to accelerate the frontend syntax and UI creation.

### Prompt Strategy:
To ensure deterministic outputs for the UI, the backend uses:
1. **System Prompts:** Forcing a strict JSON schema output.
2. **Few-Shot Prompting:** Providing explicit examples of correct inputs/outputs to guide the vision model's understanding of edge-case gym equipment.

---

## 🚧 Current Status & Known Issues

IronEye is currently in **Closed Testing** on Google Play (14 days, 13 testers framework). 

- **Google OAuth:** Authentication via Google is currently facing integration issues and is being refactored. Email/Password auth remains the stable default.
- **Next Steps:** Transitioning the backend architecture to support AI Agents and tool-use tasks for dynamic workouts.

---

## 📦 Installation & Setup (Local Development)

### Backend (Flask):
1. Clone the repository and navigate to the backend folder.
2. Create a virtual environment and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` ficheiro and add your `ANTHROPIC_API_KEY` and Supabase credentials.
4. Run the server:
   ```bash
   python app.py
   ```

### Frontend (React Native / Expo):
1. Navigate to the frontend folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Developed with ⚡ by [Luís Sabino](https://linkedin.com)
