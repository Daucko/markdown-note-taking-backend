# Markdown Note-Taking Backend

A robust, secure, and feature-rich backend API for a Markdown note-taking application. Built with Node.js, Express, and MongoDB, this backend supports user authentication, note management, folder and tag organization, and more.

## Features
- User registration, login, and email verification
- JWT-based authentication and session management
- Create, read, update, and delete notes with Markdown support
- Folder and tag management (CRUD, reordering, autocomplete)
- Note version history and duplication
- Pin, favorite, and archive notes
- Secure password hashing and rate limiting
- CORS, Helmet, and other security best practices

## Tech Stack
- Node.js
- Express.js
- MongoDB & Mongoose
- JWT for authentication
- Nodemailer for email
- Marked & DOMPurify for Markdown rendering

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (local or cloud)

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd markdown-note-taking-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and set the following variables:
   ```env
   PORT=5000
   DATABASE_URI=mongodb://localhost:27017/markdown-notes
   ACCESS_TOKEN=<your_jwt_secret>
   REFRESH_TOKEN=<your_refresh_secret>
   EMAIL=<your_gmail_address>
   EMAIL_PASSWORD=<your_gmail_app_password>
   BASE_URL=http://localhost:5000
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## API Documentation

The full API documentation (with example requests and responses) is available on Postman:
[Postman Collection](https://documenter.getpostman.com/view/29258774/2sB2xFgTXg)

### Main Endpoints
- `/api/auth` - User authentication (register, login, verify email)
- `/api/notes` - Notes CRUD, pin, favorite, archive, versioning
- `/api/folders` - Folder CRUD, reorder
- `/api/tags` - Tag CRUD, autocomplete, get notes by tag

### Example: Create a Note
```http
POST /api/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Meeting Notes",
  "content": "# Agenda\n- Discuss project milestones",
  "tags": ["<tagId1>", "<tagId2>"],
  "folder": "<folderId>"
}
```

## Security
- All sensitive routes require JWT authentication.
- Rate limiting and helmet are used for security.
- Passwords are hashed with bcrypt.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
