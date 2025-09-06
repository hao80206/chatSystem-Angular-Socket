// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = 3000;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// -------------------- In-memory data + persistence --------------------
let data = {
  users: [],
  groups: [],
  channels: [],
  joinRequests: [], // { userId: '1', groupId: 2 }
  messages: {} // Store messages by channelId
};

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function initializeDummy() {
  data.users = [
    { id: '1', username: 'Alice', email: 'alice@mail.com', password: '123', role: ['USER'], groups: [1,2,5,7] },
    { id: '2', username: 'Bob', email: 'bob@mail.com', password: '123', role: ['USER'], groups: [2,3,6,7] },
    { id: '3', username: 'Kevin', email: 'kevin@mail.com', password: '123', role: ['USER'], groups: [1,4,6,7] },
    { id: '4', username: 'Taylor', email: 'taylor@mail.com', password: '123', role: ['USER'], groups: [1,2,3,4] },
    { id: '5', username: 'Stella', email: 'stella@mail.com', password: '123', role: ['GROUP_ADMIN'], groups: [1,3,4]},
    { id: '6', username: 'Super', email: 'super@mail.com', password: '123', role: ['SUPER_ADMIN'], groups: [1,2,3,4,5,6,7] }
  ];

  data.groups = [
    { id: 1, name: 'Group1 - Tulip', createdBy: 'Super', channels: [101,102,103,104,105,106,107] },
    { id: 2, name: 'Group2 - Calendula', createdBy: 'Super', channels: [201,202,203,204,205,206] },
    { id: 3, name: 'Group3 - Lavender', createdBy: 'Super', channels: [301,302,303,304,305] },
    { id: 4, name: 'Group4 - Lily', createdBy: 'Super', channels: [401,402,403,404,405] },
    { id: 5, name: 'Group5 - Marigold', createdBy: 'Super', channels: [501,502,503,504,505] },
    { id: 6, name: 'Group6 - Rose', createdBy: 'Super', channels: [601,602,603,604,605] },
    { id: 7, name: 'Group7 - Jasmine', createdBy: 'Super', channels: [701,702,703,704,705] }
  ];

  data.channels = [
    { id: 101, groupId: 1, name: 'General', members: [], bannedUsers: [] },
    { id: 102, groupId: 1, name: 'News', members: [], bannedUsers: [] },
    { id: 103, groupId: 1, name: 'Trip', members: [], bannedUsers: [] },
    { id: 104, groupId: 1, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 105, groupId: 1, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 106, groupId: 1, name: 'Cooking', members: [], bannedUsers: [] },
    { id: 107, groupId: 1, name: 'Exercise', members: [], bannedUsers: [] },
    { id: 201, groupId: 2, name: 'News', members: [], bannedUsers: [] },
    { id: 202, groupId: 2, name: 'Games', members: [], bannedUsers: [] },
    { id: 203, groupId: 2, name: 'Trip', members: [], bannedUsers: [] },
    { id: 204, groupId: 2, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 205, groupId: 2, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 206, groupId: 2, name: 'Cooking', members: [], bannedUsers: [] },
    { id: 301, groupId: 3, name: 'News', members: [], bannedUsers: [] },
    { id: 302, groupId: 3, name: 'General', members: [], bannedUsers: [] },
    { id: 303, groupId: 3, name: 'Trip', members: [], bannedUsers: [] },
    { id: 304, groupId: 3, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 305, groupId: 3, name: 'Games', members: [], bannedUsers: [] },
    { id: 401, groupId: 4, name: 'General', members: [], bannedUsers: [] },
    { id: 402, groupId: 4, name: 'WorldHeritage', members: [], bannedUsers: [] },
    { id: 403, groupId: 4, name: 'Cosmetics', members: [], bannedUsers: [] },
    { id: 404, groupId: 4, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 405, groupId: 4, name: 'Mystery', members: [], bannedUsers: [] },
    { id: 501, groupId: 5, name: 'News', members: [], bannedUsers: [] },
    { id: 502, groupId: 5, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 503, groupId: 5, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 504, groupId: 5, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 505, groupId: 5, name: 'Games', members: [], bannedUsers: [] },
    { id: 601, groupId: 6, name: 'News', members: [], bannedUsers: [] },
    { id: 602, groupId: 6, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 603, groupId: 6, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 604, groupId: 6, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 605, groupId: 6, name: 'Cooking', members: [], bannedUsers: [] },
    { id: 701, groupId: 7, name: 'General', members: [], bannedUsers: [] },
    { id: 702, groupId: 7, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 703, groupId: 7, name: 'WorldHeritage', members: [], bannedUsers: [] },
    { id: 704, groupId: 7, name: 'Trip', members: [], bannedUsers: [] },
    { id: 705, groupId: 7, name: 'Mystery', members: [], bannedUsers: [] }
  ];

  data.joinRequests = [];
  data.messages = {};
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE);
      data = JSON.parse(raw);
      console.log('Loaded data.json');
    } else {
      initializeDummy();
      saveData();
      console.log('Initialized dummy data and saved to data.json');
    }
  } catch (err) {
    console.error('Error loading data.json. Reinitializing.', err);
    initializeDummy();
    saveData();
  }
}

loadData();

// -------------------- Socket.IO --------------------
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Handle socket errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('createGroup', (req) => {
    if (!req || !req.name) return;
    const newId = data.groups.length ? Math.max(...data.groups.map(g => g.id)) + 1 : 1;
    const newGroup = { id: newId, name: req.name, channels: [] };
    data.groups.push(newGroup);
    saveData();
    io.emit('groupCreated', newGroup);
  });

  socket.on('joinGroup', (payload) => {
    try {
      let groupId;
      if (typeof payload === 'object') groupId = payload.groupId;
      else groupId = payload;
      if (groupId !== undefined && groupId !== null) {
        socket.join(`group-${groupId}`);
        console.log(`${socket.id} joined group-${groupId}`);
      }
    } catch (error) {
      console.error('Error in joinGroup:', error);
    }
  });

  socket.on('joinUser', ({ userId }) => {
    if (userId) socket.join(`user-${userId}`);
  });

  socket.on('joinChannel', ({ channelId, userId }) => {
    try {
      if (channelId && userId) {
        socket.join(`channel_${channelId}`);
        console.log(`${socket.id} joined channel_${channelId}`);
        
        // Add user to channel members if not already there
        const channel = data.channels.find(c => c.id === channelId);
        if (channel && !channel.members.includes(userId)) {
          channel.members.push(userId);
          saveData();
        }
      }
    } catch (error) {
      console.error('Error in joinChannel:', error);
    }
  });

  socket.on('leaveChannel', ({ channelId, userId }) => {
    try {
      if (channelId && userId) {
        socket.leave(`channel_${channelId}`);
        console.log(`${socket.id} left channel_${channelId}`);
        
        // Remove user from channel members
        const channel = data.channels.find(c => c.id === channelId);
        if (channel) {
          channel.members = channel.members.filter(id => id !== userId);
          saveData();
        }
      }
    } catch (error) {
      console.error('Error in leaveChannel:', error);
    }
  });

  socket.on('sendMessage', (message) => {
    try {
      if (!message.channelId || !message.user || !message.text) return;
      
      // Initialize data.messages if it doesn't exist
      if (!data.messages) {
        data.messages = {};
      }
      
      // Store message in data
      if (!data.messages[message.channelId]) {
        data.messages[message.channelId] = [];
      }
      data.messages[message.channelId].push({
        user: message.user,
        text: message.text,
        timestamp: message.timestamp || new Date()
      });
      
      // Broadcast message to all users in the channel
      io.to(`channel_${message.channelId}`).emit('receiveMessage', {
        user: message.user,
        text: message.text,
        timestamp: message.timestamp || new Date()
      });
      
      console.log(`Message sent in channel ${message.channelId}: ${message.user}: ${message.text}`);
    } catch (error) {
      console.error('Error handling sendMessage:', error);
    }
  });

  socket.on('requestJoinGroup', (req) => {
    try {
    if (!req || !req.userId || !req.groupId) return;
      const userId = String(req.userId);
      const groupId = Number(req.groupId);
      const user = data.users.find(u => u.id === userId);
      const group = data.groups.find(g => g.id === groupId);
      if (!user || !group) return;
      if(user.role.includes('GROUP_ADMIN') || user.role.includes('SUPER_ADMIN') )return;
      if((user.groups || []).includes(groupId)) return;
      if(!data.joinRequests) data.joinRequests = [];
      const exist = data.joinRequests.find(r => r.userId === userId && r.groupId === groupId);
      if(exist) return;
      data.joinRequests.push({ userId, groupId });
      saveData();
      io.to(`group-${req.groupId}`).emit('groupRequest', { userId, groupId });
      io.emit('groupRequest', { userId, groupId });
    } catch (error) {
      console.error('Error handling requestJoinGroup:', error);
    }
  });

  socket.on('approveRequest', (req) => {
    const idx = data.joinRequests.findIndex(r => r.userId === String(req.userId) && r.groupId === Number(req.groupId));
    if (idx !== -1) {
      const user = data.users.find(u => u.id === String(req.userId));
      if (user && !user.groups.includes(Number(req.groupId))) user.groups.push(Number(req.groupId));
      data.joinRequests.splice(idx, 1);
      saveData();
      io.to(`group-${req.groupId}`).emit('requestApproved', req.userId);
      io.emit('requestApproved', req.userId);
    }
  });

  socket.on('rejectRequest', (req) => {
    const idx = data.joinRequests.findIndex(r => r.userId === String(req.userId) && r.groupId === Number(req.groupId));
    if (idx !== -1) {
      data.joinRequests.splice(idx, 1);
      saveData();
      io.to(`group-${req.groupId}`).emit('requestRejected', req.userId);
      io.emit('requestRejected', req.userId);
    }
  });

  socket.on('createChannel', (channel) => {
    if (!channel || !channel.groupId) return;
    io.to(`group-${channel.groupId}`).emit('channelCreated', channel);
  });

  socket.on('deleteChannel', ({ channelId, groupId }) => {
    io.to(`group-${groupId}`).emit('channelDeleted', channelId);
  });

  socket.on('promoteUser', (payload) => {
    const { userId, role, groupId } = payload;
    const user = data.users.find(u => u.id === String(userId));
    if (user && !user.role.includes(role)) {
      user.role.push(role);
      saveData();
    }
    io.to(`group-${groupId}`).emit('userPromoted', payload);
  });

  socket.on('banUser', ({ channelId, userId }) => {
    // Find the channel and update the data structure
    const channel = data.channels.find(c => c.id === channelId);
    if (channel) {
      // Add user to banned list
      if (!channel.bannedUsers.includes(userId)) {
        channel.bannedUsers.push(userId);
      }
      // Remove user from members
      channel.members = channel.members.filter(id => id !== userId);
      saveData();
      
      // Broadcast ban event to channel
      io.to(`channel_${channelId}`).emit('userBanned', userId);
      
      // Also broadcast to group for admin notifications
      io.to(`group-${channel.groupId}`).emit('userBannedFromChannel', { channelId, userId });
      
      console.log(`User ${userId} banned from channel ${channelId}`);
    }
  });
});

// -------------------- REST API --------------------
// Prefix: /api

// LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const u = data.users.find(x => x.username === username && x.password === password);
  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(u);
});

// REGISTER new user
app.post('/api/register', (req, res) => {
  try {
    console.log('Register request received:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    });
    
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      console.log('Missing fields:', { username: !!username, email: !!email, password: !!password });
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = data.users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      console.log('User already exists:', { username, email });
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Calculate new user ID
    const newUserId = data.users.length > 0 ? Math.max(...data.users.map(u => Number(u.id))) + 1 : 1;
    
    // Create new user with USER role
    const newUser = {
      id: String(newUserId),
      username: username,
      email: email,
      password: password,
      role: ['USER'],
      groups: []
    };
    
    data.users.push(newUser);
    
    // Create join requests for all existing groups
    if (data.groups && data.groups.length > 0) {
      data.groups.forEach(group => {
        const existingRequest = data.joinRequests.find(r => r.userId === String(newUserId) && r.groupId === group.id);
        if (!existingRequest) {
          data.joinRequests.push({ userId: String(newUserId), groupId: group.id });
          console.log(`Creating join request for group: ${group.id} user: ${newUserId}`);
        }
      });
    }
    
    saveData();
    console.log('User registered successfully:', { username, id: newUserId });
    
    // Return the created user data (without password)
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      groups: newUser.groups
    };
    
    res.json({ 
      message: 'User registered successfully', 
      user: userResponse 
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET users
app.get('/api/users', (req, res) => res.json(data.users));
app.get('/api/users/:id', (req, res) => {
  const u = data.users.find(x => x.id === String(req.params.id));
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u);
});

// DELETE user (delete account)
app.delete('/api/users/:id', (req, res) => {
  const id = String(req.params.id);
  const idx = data.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  // remove user
  data.users.splice(idx, 1);
  // remove user's join requests
  data.joinRequests = data.joinRequests.filter(r => r.userId !== id);
  // remove from channels and groups membership
  data.channels.forEach(ch => {
    ch.members = (ch.members || []).filter(m => String(m) !== id);
    ch.bannedUsers = (ch.bannedUsers || []).filter(b => String(b) !== id);
  });
  data.users.forEach(u => {
    u.groups = (u.groups || []).filter(gid => gid !== undefined); // no action unless needed
  });
  saveData();
  io.emit('userDeleted', id);
  res.json({ ok: true });
});

// GROUPS
app.get('/api/groups', (req, res) => res.json(data.groups));
app.get('/api/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  const g = data.groups.find(x => x.id === id);
  if (!g) return res.status(404).json({ error: 'Group not found' });
  res.json(g);
});

// Create group
app.post('/api/groups', (req, res) => {
  try {
    const { name, createdBy } = req.body;
    
    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Group name and creator are required' });
    }

    console.log('Creating group:', { name, createdBy });
    
    // Find the creator user
    const creator = data.users.find(u => u.username === createdBy);
    if (!creator) {
      return res.status(400).json({ error: 'Creator user not found' });
    }

    // Calculate new group ID - ensure it's sequential
    let newId = 1;
    if (data.groups && data.groups.length > 0) {
      newId = Math.max(...data.groups.map(g => g.id)) + 1;
    }
    
    const newGroup = {
      id: newId,
      name: name,
      createdBy: createdBy,
      channels: []
    };
    
    data.groups.push(newGroup);
    
    // Add creator to the group
    if (!creator.groups.includes(newId)) {
      creator.groups.push(newId);
    }
    
    // If creator is not already a GROUP_ADMIN, promote them
    if (!creator.role.includes('GROUP_ADMIN')) {
      creator.role.push('GROUP_ADMIN');
    }
    
    console.log('Creator added to group:', { username: creator.username, groupId: newId });
    
    // Add ALL SUPER_ADMIN users to the new group automatically
    const superAdmins = data.users.filter(u => u.role.includes('SUPER_ADMIN'));
    superAdmins.forEach(superAdmin => {
      if (!superAdmin.groups.includes(newId)) {
        superAdmin.groups.push(newId);
        console.log(`Super admin ${superAdmin.username} added to group ${newId}`);
        // Emit event for real-time updates
        io.emit('userAddedToGroup', { userId: superAdmin.id, groupId: newId });
      }
    });
    
    // Add creator to the group if not already there
    if (!creator.groups.includes(newId)) {
      creator.groups.push(newId);
      console.log(`Creator ${creator.username} added to group ${newId}`);
      // Emit event for real-time updates
      io.emit('userAddedToGroup', { userId: creator.id, groupId: newId });
    }
    
    // Create join requests for all normal users (USER role only)
    const normalUsers = data.users.filter(u => u.role.includes('USER') && !u.role.includes('GROUP_ADMIN') && !u.role.includes('SUPER_ADMIN'));
    normalUsers.forEach(user => {
      const existingRequest = data.joinRequests.find(r => r.userId === user.id && r.groupId === newId);
      if (!existingRequest) {
        data.joinRequests.push({ userId: user.id, groupId: newId });
      }
    });
    
    saveData();
    console.log('Group created successfully:', newGroup);
    
    // Emit socket event
    io.emit('groupCreated', newGroup);
    
    res.json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modify group (change name or createdBy)
app.put('/api/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  const g = data.groups.find(x => x.id === id);
  if (!g) return res.status(404).json({ error: 'Group not found' });
  const { name, createdBy } = req.body;
  if (name) g.name = name;
  if (createdBy !== undefined) g.createdBy = createdBy;
  saveData();
  io.emit('groupModified', g);
  io.to(`group-${id}`).emit('groupModified', g);
  res.json(g);
});

// Delete group
app.delete('/api/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = data.groups.findIndex(g => g.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Group not found' });

  // remove channels belonging to group
  data.channels = data.channels.filter(c => c.groupId !== id);

  // remove group from users' groups arrays
  data.users.forEach(u => {
    u.groups = (u.groups || []).filter(gid => gid !== id);
  });

  // remove join requests for this group
  data.joinRequests = data.joinRequests.filter(r => r.groupId !== id);

  data.groups.splice(idx, 1);
  saveData();

  io.emit('groupDeleted', id);
  io.to(`group-${id}`).emit('groupDeleted', id);
  res.json({ ok: true });
});

// CHANNELS by group and create channel inside group
app.get('/api/groups/:id/channels', (req, res) => {
  const groupId = Number(req.params.id);
  res.json(data.channels.filter(c => c.groupId === groupId));
});

app.post('/api/groups/:id/channels', (req, res) => {
  try {
    const groupId = Number(req.params.id);
    console.log('Creating channel for group:', groupId, 'Request body:', req.body);
    
    const group = data.groups.find(g => g.id === groupId);
    if (!group) {
      console.error('Group not found:', groupId);
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Channel name is required' });
    }
    
    // Calculate next ID based on group ID (100-199 for group 1, 200-299 for group 2, etc.)
    let nextId = groupId * 100 + 1; // Start with group ID * 100 + 1
    
    // Find the highest existing channel ID for this group
    const existingChannels = data.channels.filter(c => c.groupId === groupId);
    if (existingChannels.length > 0) {
      const maxId = Math.max(...existingChannels.map(c => c.id));
      nextId = maxId + 1;
    }
    
    const newChannel = { id: nextId, groupId, name, members: [], bannedUsers: [] };
    
    console.log('Creating new channel:', newChannel);
    
    // Initialize channels array if it doesn't exist
    if (!data.channels) {
      data.channels = [];
    }
    
    data.channels.push(newChannel);
    group.channels = group.channels || [];
    group.channels.push(nextId);
    saveData();
    
    io.to(`group-${groupId}`).emit('channelCreated', newChannel);
    res.json(newChannel);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// delete channel
app.delete('/api/groups/:groupId/channels/:channelId', (req, res) => {
  const groupId = Number(req.params.groupId);
  const channelId = Number(req.params.channelId);
  data.channels = data.channels.filter(c => c.id !== channelId);
  const group = data.groups.find(g => g.id === groupId);
  if (group) group.channels = (group.channels || []).filter(id => id !== channelId);
  saveData();
  io.to(`group-${groupId}`).emit('channelDeleted', channelId);
  res.json({ ok: true });
});

// JOIN-REQUESTS (REST)
app.get('/api/join-requests', (req, res) => {
  try {
    console.log('Getting all join requests');
    
    // Initialize joinRequests if it doesn't exist
    if (!data.joinRequests) {
      data.joinRequests = [];
    }
    
    res.json(data.joinRequests);
  } catch (error) {
    console.error('Error getting all join requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/groups/:id/join-requests', (req, res) => {
  try {
    const groupId = Number(req.params.id);
    console.log('Getting join requests for group:', groupId);
    
    // Initialize joinRequests if it doesn't exist
    if (!data.joinRequests) {
      data.joinRequests = [];
    }
    
    const requests = data.joinRequests.filter(r => r.groupId === groupId);
    console.log('Found join requests:', requests);
    res.json(requests);
  } catch (error) {
    console.error('Error getting join requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/groups/:id/join-requests', (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const { userId } = req.body || {};
    
    console.log('Creating join request for group:', groupId, 'user:', userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required in request body' });
    }
    
    // Check if user exists
    const user = data.users.find(u => u.id === String(userId));
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    // Check if group exists
    const group = data.groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(400).json({ error: 'Group not found' });
    }
    
    // Prevent SUPER_ADMIN and GROUP_ADMIN from having pending requests
    if (user.role.includes('SUPER_ADMIN') || user.role.includes('GROUP_ADMIN')) {
      return res.status(400).json({ error: 'Admins cannot have pending join requests' });
    }
    
    // Check if user is already in the group
    if (user.groups.includes(groupId)) {
      return res.status(400).json({ error: 'User is already in the group' });
    }
    
    // Initialize joinRequests if it doesn't exist
    if (!data.joinRequests) {
      data.joinRequests = [];
    }
    
    // Check if request already exists
    const existingRequest = data.joinRequests.find(r => r.userId === String(userId) && r.groupId === groupId);
    if (existingRequest) {
      return res.status(400).json({ error: 'Join request already exists' });
    }
    
    const newRequest = { userId: String(userId), groupId: groupId };
    data.joinRequests.push(newRequest);
    saveData();
    
    console.log('Join request created:', newRequest);
    res.json(newRequest);
  } catch (error) {
    console.error('Error creating join request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/groups/:id/join-requests/:userId/approve', (req, res) => {
  const groupId = Number(req.params.id);
  const userId = String(req.params.userId);
  const idx = data.joinRequests.findIndex(r => r.userId === userId && r.groupId === groupId);
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });
  const user = data.users.find(u => u.id === userId);
  if (user && !user.groups.includes(groupId)) user.groups.push(groupId);
  data.joinRequests.splice(idx, 1);
  saveData();
  io.to(`group-${groupId}`).emit('requestApproved', userId);
  res.json({ ok: true });
});

app.post('/api/groups/:id/join-requests/:userId/reject', (req, res) => {
  const groupId = Number(req.params.id);
  const userId = String(req.params.userId);
  const idx = data.joinRequests.findIndex(r => r.userId === userId && r.groupId === groupId);
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });
  data.joinRequests.splice(idx, 1);
  saveData();
  io.to(`group-${groupId}`).emit('requestRejected', userId);
  res.json({ ok: true });
});

// PROMOTE user via REST
app.post('/api/groups/:id/users/:userId/promote', (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const userId = req.params.userId;
    const { role } = req.body;
    
    console.log('Promoting user:', { groupId, userId, role });
    
    if (!role || !['GROUP_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Valid role (GROUP_ADMIN or SUPER_ADMIN) is required' });
    }
    
    // Find the user
    const user = data.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find the group
    const group = data.groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Add the role if not already present
    if (!user.role.includes(role)) {
      user.role.push(role);
    }
    
    // Add user to the group if not already there
    if (!user.groups.includes(groupId)) {
      user.groups.push(groupId);
    }
    
    // Remove any pending join requests for this user and group
    data.joinRequests = data.joinRequests.filter(r => !(r.userId === userId && r.groupId === groupId));
    
    saveData();
    
    console.log('User promoted successfully:', { userId, role, groupId });
    
    // Emit socket event for real-time updates
    io.emit('userPromoted', { userId, role, groupId });
    
    res.json({ 
      message: 'User promoted successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        groups: user.groups
      }
    });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// users of a group
app.get('/api/groups/:id/users', (req, res) => {
  const gid = Number(req.params.id);
  res.json(data.users.filter(u => (u.groups || []).includes(gid)));
});

// generic channels endpoint
app.get('/api/channels', (req, res) => res.json(data.channels));

// Get messages for a specific channel
app.get('/api/channels/:channelId/messages', (req, res) => {
  try {
    const channelId = Number(req.params.channelId);
    
    // Check if data.messages exists, if not initialize it
    if (!data.messages) {
      data.messages = {};
    }
    
    const messages = data.messages[channelId] || [];
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages for channel:', req.params.channelId, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- Start --------------------
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
