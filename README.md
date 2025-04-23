# LLM Server

A secure, scalable server for enterprise LLM interactions with role-based access control. This application provides a unified interface for teams to interact with large language models while maintaining strict permission controls.

## Overview

The LLM Server acts as a centralized API gateway for interacting with various large language models. It handles user authentication, role-based access control, conversation storage, and acts as a secure proxy to LLM providers like Anthropic's Claude.

## Features

- **Secure Authentication**: JWT-based authentication system
- **Role-Based Access Control**: Granular permissions for different user roles
- **Conversation Management**: Store and retrieve conversation history
- **LLM Integration**: Seamless integration with Anthropic's Claude models
- **API Gateway**: RESTful API endpoints for client applications
- **Error Handling**: Robust error management and logging
- **Environment Configuration**: Flexible configuration via environment variables

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Anthropic API key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jdhettema/llm-server.git
   cd llm-server
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   JWT_SECRET=your_jwt_secret_here
   LLM_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## API Endpoints

### Authentication

- **POST /api/auth/register**: Register a new user
- **POST /api/auth/login**: Authenticate and receive JWT token

### Conversations

- **GET /api/conversations**: List all conversations for the authenticated user
- **POST /api/conversations**: Create a new conversation
- **GET /api/conversations/:id**: Get a specific conversation
- **DELETE /api/conversations/:id**: Delete a conversation

### LLM Interactions

- **POST /api/query**: Send a query to the LLM
- **GET /api/models**: List available LLM models

## User Roles and Permissions

- **admin**: Full access to all features
- **manager**: Can manage users and view analytics
- **user**: Basic access to create conversations and query LLMs

## LLM Integration

The server integrates with Anthropic's Claude API using their official SDK:

```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.LLM_API_KEY,
});

// Example query function
const queryLLM = async (prompt) => {
  const response = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }]
  });
  
  return response.content[0].text;
};
```

## Error Handling

The server implements centralized error handling:

```javascript
// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({ message });
});
```

## Security Considerations

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Validation of all user inputs
- **Rate Limiting**: Protection against excessive requests
- **Environment Variables**: Sensitive information stored in environment variables
- **CORS Configuration**: Controlled cross-origin resource sharing

## Deployment

1. **Build the application**:
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Start the production server**:
   ```bash
   npm start
   # or
   yarn start
   ```

3. **Docker Deployment**:
   ```bash
   docker build -t llm-server .
   docker run -p 3000:3000 llm-server
   ```

## Monitoring and Logging

The server includes comprehensive logging to track requests, errors, and system status. Configure logging levels via environment variables.

## Troubleshooting

- **Authentication Problems**: Check JWT secret and token expiration settings
- **LLM Integration Errors**: Validate Anthropic API key and model availability
- **Permission Denied Errors**: Confirm user roles and permissions are correctly configured

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.