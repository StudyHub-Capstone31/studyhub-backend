# StudyHub Backend API

A RESTful API for StudyHub - a centralized academic resource sharing platform for university students, starting with KNUST.

## Table of Contents

- [StudyHub Backend API](#studyhub-backend-api)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Setup Instructions](#setup-instructions)
  - [Environment Variables](#environment-variables)
  - [API Documentation](#api-documentation)
  - [Database Models](#database-models)
  - [Endpoints](#endpoints)
    - [Authentication](#authentication)
    - [Resources](#resources)
    - [Forums](#forums)
    - [User](#user)
    - [Admin](#admin)
  - [Contributing](#contributing)

## Features

- User authentication and authorization
- Academic resource management
- Discussion forums
- File uploads and downloads
- User profiles and notifications
- Admin dashboard
- Search and filtering system

## Setup Instructions

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/studyhub-backend.git
   cd studyhub-backend
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with the variables listed in the Environment Variables section.

4. **Run the server**
   ```
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_EMAIL=your_smtp_email
SMTP_PASSWORD=your_smtp_password
FROM_EMAIL=noreply@studyhub.com
FROM_NAME=StudyHub
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running. It provides detailed information about all endpoints, request parameters, and response formats.

## Database Models

- **User**: Student, lecturer, alumni, or admin accounts
- **Resource**: Academic materials including lecture notes, past questions, e-books, etc.
- **Forum**: Discussion boards for academic topics
- **Post**: Individual messages within forums
- **Notification**: System and user-generated notifications

## Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify/:token` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/logout` - Logout user

### Resources
- `POST /api/resources` - Upload new resource
- `GET /api/resources` - Get all resources
- `GET /api/resources/:id` - Get resource by ID
- `PUT /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource
- `POST /api/resources/:id/rate` - Rate resource
- `GET /api/resources/:id/download` - Download resource
- `POST /api/resources/:id/save` - Save resource to user's collection

### Forums
- `POST /api/forums` - Create new forum
- `GET /api/forums` - Get all forums
- `GET /api/forums/:id` - Get forum by ID
- `PUT /api/forums/:id` - Update forum
- `DELETE /api/forums/:id` - Delete forum
- `POST /api/forums/:id/posts` - Create post in forum
- `GET /api/forums/:id/posts` - Get all posts in forum

### User
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `GET /api/users/resources` - Get user uploaded resources
- `GET /api/users/saved-resources` - Get user saved resources
- `GET /api/users/notifications` - Get user notifications

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/resources/pending` - Get pending resources
- `PUT /api/admin/resources/:id/approve` - Approve resource
- `PUT /api/admin/resources/:id/reject` - Reject resource
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request