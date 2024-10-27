// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// In-memory storage for users and chat pairs
const users = {};  // { username: socket }
const chatPairs = {};  // { "username1-username2": [socket1, socket2] }

wss.on('connection', (socket) => {
    socket.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'register':
                // Register user if username is unique
                if (!users[data.username]) {
                    users[data.username] = socket;
                    socket.username = data.username;
                    socket.send(JSON.stringify({ type: 'register', success: true }));
                } else {
                    socket.send(JSON.stringify({ type: 'register', success: false, error: 'Username already taken' }));
                }
                break;

            case 'chat_request':
                // Check if other user exists
                const otherSocket = users[data.targetUsername];
                if (otherSocket) {
                    const pairKey = [data.username, data.targetUsername].sort().join('-');
                    chatPairs[pairKey] = [socket, otherSocket];

                    // Notify both users they are paired
                    socket.send(JSON.stringify({ type: 'chat_paired', success: true, target: data.targetUsername }));
                    otherSocket.send(JSON.stringify({ type: 'chat_paired', success: true, target: data.username }));
                } else {
                    socket.send(JSON.stringify({ type: 'chat_request', success: false, error: 'User not found' }));
                }
                break;

            case 'message':
                // Send message to the paired user
                const chatKey = [data.username, data.target].sort().join('-');
                const pair = chatPairs[chatKey];
                if (pair) {
                    const recipientSocket = pair.find(s => s.username === data.target);
                    if (recipientSocket) {
                        recipientSocket.send(JSON.stringify({ type: 'message', from: data.username, content: data.content }));
                    }
                }
                break;
        }
    });

    socket.on('close', () => {
        if (socket.username) {
            delete users[socket.username];
            // Clean up any chat pairs
            Object.keys(chatPairs).forEach(key => {
                if (chatPairs[key].includes(socket)) {
                    delete chatPairs[key];
                }
            });
        }
    });
});

console.log('WebSocket server running on ws://localhost:8080');
