# Wispnote

A real-time, collaborative, and privacy-focused markdown notes application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io.

## Features

- **Real-Time Collaboration**: Chat and collaborate with multiple anonymous users instantly via Socket.io.
- **Custom URLs (Slugs)**: Choose your own simple, memorable URL for your notes (e.g. `wispnote.com/my-secret-note`).
- **Self-Destructing Notes**: Set precise expiry dates using a datetime picker. Notes are automatically wiped from the database using MongoDB TTL indices.
- **Password Protection**: Lock your notes with a secure password (encrypted via bcrypt).
- **Markdown & Raw Modes**: View notes as rendered Markdown or in raw plain text format.
- **Secure & Rate-Limited**: Built-in request rate limiting and payload sanitization for enhanced security.

## Tech Stack

- **Frontend**: React, Vite, React Router, DOMPurify, Marked
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (Mongoose)

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account or local MongoDB instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vbv0507/wispnote.git
   cd wispnote
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory based on `.env.example`:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   FRONTEND_URL=http://localhost:5173
   ```
   Start the backend development server:
   ```bash
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
   Start the frontend development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## Known Limitations
- Current real-time functionality utilizes simple sequential user assignment ("User 1", "User 2") which shifts if users drop connection.
- No CRDT/Operational Transformation for conflict resolution in heavy simultaneous text-editing (messages operate asynchronously).

## License

This project is licensed under the MIT License.
