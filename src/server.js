const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('LLM_API_KEY exists:', !!process.env.LLM_API_KEY);

const app = express();
app.use(express.json());
app.use(cors());

const users = [
    {
        id: 1,
        username: 'admin',
        password: '$2b$10$idKTNUDlRbKeWAWId0DQr.C1RioRvsq72ekVXMWsBbsf11E3BQ/Ma', // adminpass
        role: 'admin',
    },
    {
        id: 2,
        username: 'manager',
        password: '$2b$10$EIX5v6ZQ4w7j8s1V4x5J1OeD3a0d1G7c5XK8pZk9nYq6z5hXx2m6i', // managerpass
        role: 'manager',
    },
    {
        id: 3,
        username: 'user',
        password: '$2b$10$EIX5v6ZQ4w7j8s1V4x5J1OeD3a0d1G7c5XK8pZk9nYq6z5hXx2m6i', // userpass
        role: 'user',
    }
];

const conversations = [];

const rolePermissions = {
    admin: ['query_all_data', 'view_sensitive', 'manage_users'],
    manager: ['query_all_data', 'view_sensitive'],
    user: ['query_basic_data']
};

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ message: 'Invalid credentials. Invalid User.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials. Invalid Password.' });

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({ token });
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

const hasPermission = (user, requiredPermission) => {
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(requiredPermission);
};

app.get('/api/conversations', authenticateToken, (req, res) => {
    const userConversations = conversations.filter(c => c.userId === req.user.id);
    res.json(userConversations);
});

app.get('/api/conversations/:id', authenticateToken, (req, res) => {
    const conversation = conversations.find(
        c => c.id === req.params.id && c.userId === req.user.id
    );

    if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(conversation);
});

app.get('/api/conversations/:id/messages', authenticateToken, (req, res) => {
    const conversation = conversations.find(
        c => c.id === req.params.id && c.userId === req.user.id
    );

    if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json(conversation.messages || []);
});

app.post('/api/conversations', authenticateToken, (req, res) => {
    const { title } = req.body;

    const newConversation = {
        id: Date.now().toString(),
        title: title || 'New Conversation',
        messages: [],
        userId: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    conversations.push(newConversation);
    res.status(201).json(newConversation);
});

app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
    const { content } = req.body;
    const conversationId = req.params.id;

    const conversation = conversations.find(
        c => c.id === conversationId && c.userId === req.user.id
    );

    if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
    }

    const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date().toISOString()
    }

    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date().toISOString();

    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [{ role: 'user', content }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.LLM_API_KEY,
                    'anthropic-version': '2023-06-01'
                }
            }
        );

        const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.content[0].text,
            timestamp: new Date().toISOString()
        };

        conversation.messages.push(assistantMessage);
        conversation.updatedAt = new Date().toISOString();
        res.json({ 
            userMessage,
            assistantMessage
        });
    } catch (error) {
        console.error('Error calling LLM API:', error);
        res.status(500).json({ message: 'Error processing your query' });
    }
});

app.delete('/api/conversations/:id', authenticateToken, (req, res) => {
    const conversationIndex = conversations.findIndex(
        c => c.id === req.params.id && c.userId === req.user.id
    );

    if (conversationIndex === -1) {
        return res.status(404).json({ message: 'Conversation not found' });
    }

    conversations.splice(conversationIndex, 1);
    res.json({ message: 'Conversation deleted' });
});

app.post('/query', authenticateToken, async (req, res) => {
    const { prompt } = req.body;
    const user = req.user;

    const queryPermission = prompt.includes('sensitive') ? 'view_sensitive' : 'query_basic_data';

    if (!hasPermission(user, queryPermission)) {
        return res.status(403).json({
            message: 'You do not have permission to make this query'
        });
    }

    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt}]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.LLM_API_KEY,
                    'anthropic-version': '2023-06-01'
                }
            }
        );

        res.json({ response: response.data.content[0].text });
    } catch (error) {
        console.error('Error calling LLM API:', error);
        res.status(500).json({ message: 'Error processing your query' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});