const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const { ExpressPeerServer } = require('peer');

const { connectDB, getDB } = require('../App/app');
const userService = require('../App/user');
const groupService = require('../App/group');
const channelService = require('../App/channel');
const { join } = require('path');

const app = express();
const PORT = 3000;
//const PEER_PORT = 4000; // PeerJS server

app.use(cors());
//app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling'],  // 👈 prevent invalid WebSocket frame error
  pingTimeout: 60000,
  pingInterval: 25000
});

// PeerJS server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/'
});

app.use('/peerjs', peerServer);

// -------------------- MongoDB --------------------
let db;
connectDB()
  .then(() => {
    db = getDB();
    console.log('DB connected');
  })
  .catch(console.error);
  

  // -------------------- Helper Functions --------------------
  async function saveUser(user) {
    await db.collection('users').updateOne({ id: user.id }, { $set: user }, { upsert: true });
  }

  async function saveGroup(group) {
    await db.collection('groups').updateOne({ id: group.id }, { $set: group }, { upsert: true });
  }

  async function saveChannel(channel) {
    await db.collection('channels').updateOne({ id: channel.id }, { $set: channel }, { upsert: true });
  }

  async function saveJoinRequest(request) {
    await db.collection('joinRequests').updateOne(
      { userId: request.userId, groupId: request.groupId },
      { $set: request },
      { upsert: true }
    );
  }

// -------------------- Socket.IO --------------------
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('error', (error) => console.error('Socket error:', error));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', socket.id, 'Reason:', reason));

  // -------------------- SOCKET HANDLERS --------------------

  //　CREATE GROUP
  socket.on('createGroup', async ({ name }) => {
    if (!name || !db) return;
    try {
      const result = await db.collection('groups').insertOne({ name, channels: [] });
      io.emit('groupCreated', result.ops[0] || { ...result, id: result.insertedId });
    } catch (err) {
      console.error(err);
    }
  });

  // JOIN GROUP
  socket.on('joinGroup', ({ groupId }) => {
    if (!groupId) return;
    socket.join(`group-${groupId}`);
    console.log(`${socket.id} joined group-${groupId}`);
  });
   
  // JOIN USER
  socket.on('joinUser', ({ userId }) => {
    if (userId) socket.join(`user-${userId}`);
  });

  // JOIN CHANNEL
  socket.on('joinChannel', async ({ channelId, userId }) => {
    if (!channelId || !userId || !db) return;
    socket.join(`channel-${channelId}`);
    socket.channelId = channelId;
    socket.userId = userId;
    console.log(`${socket.id} joined channel-${channelId}`);

    try {
      await db.collection('channels').updateOne(
        { id: channelId },
        { $addToSet: { members: userId } }
      );

      // Get full user info
      const joinedUser = await db.collection('users').findOne({ id: String(userId) });

      // ✅ Notify others in the same channel
      socket.broadcast.to(`channel-${channelId}`).emit('userJoined', { channelId, user:joinedUser });
    } catch (err) {
      console.error(err);
    }
  });

  // Start Video Chat with PeerJS
  socket.on('peerIdReady', ({ channelId, userId, peerId }) => {
    console.log(`Peer ID ready: ${peerId} from user ${userId}`);
    // broadcast to other users in the same channel
    socket.to(`channel-${channelId}`).emit('peerIdReady', { userId, peerId });
  });

  // User joins video
  socket.on('joinVideo', ({ channelId, userId }) => {
    console.log(`User ${userId} joined video chat in channel ${channelId}`);
    
    // Notify others in the same channel
    socket.to(`channel-${channelId}`).emit('userJoinedVideo', { userId });
  });

  // User leaves video
  socket.on('leaveVideo', ({ channelId, userId }) => {
    console.log(`User ${userId} left video chat in channel ${channelId}`);
    
    socket.to(`channel-${channelId}`).emit('userLeftVideo', { userId });
  });


  // LEAVE CHANNEL
  socket.on('leaveChannel', async ({ channelId, userId }) => {
    if (!channelId || !userId || !db) return;
    socket.leave(`channel-${channelId}`);
    console.log(`${socket.id} left channel-${channelId}`);

    try {
      await db.collection('channels').updateOne(
        { id: channelId },
        { $pull: { members: userId } }
      );

      // ✅ Notify others in the same channel
      socket.broadcast.to(`channel-${channelId}`).emit('userLeft', { channelId, userId });

    } catch (err) {
      console.error(err);
    }
  });

  
  // DISCONNECT
  socket.on('disconnect', () => {
    if (socket.channelId && socket.userId) {
      socket.to(`channel-${socket.channelId}`).emit('userLeft', {
        channelId: socket.channelId,
        userId: socket.userId
      });
    }
  });


  //SEND MESSAGES
  socket.on('sendMessage', async (message) => {
    try{ 
      const { channelId, senderId, content, type } = message;

      //  Find user profile to attach image
      if (!channelId || !senderId || !content || !type) {
        console.warn('Invalid message:', message);
        return;
      }

      // Get sender info
      const user = await db.collection('users').findOne({ id: senderId });
      const profileImg = user?.profileImg || '/assets/Icons/woman-img-1.png';

      const msgToSave = {
        channelId,
        senderId,
        senderName: user?.username || 'Unknown',
        content,
        type,                     // "text" or "image"
        timestamp: new Date(),
        profileImg
      };

      // Save to DB
      await db.collection('messages').insertOne(msgToSave);
      console.log('📩 Received message on server:', message.type, message.content?.slice(0, 50));

      // Broadcast to others in the same channel
      io.to(`channel-${channelId}`).emit('receiveMessage', msgToSave);

  } catch (err) {
    console.error('Error in sendMessage:', err);
  }
});

  //REQUEST JOIN GROUP
  socket.on('requestJoinGroup', async ({userId, groupId}) => {
    if (!userId || !groupId) return;
    try {
      const user = await db.collection('users').findOne({ id: String(userId) });
      const group = await db.collection('groups').findOne({ id: Number(groupId) });
      if (!user || !group) return;
      if ((user.groups || []).includes(Number(groupId))) {
        console.log("You're a member of this Group");
        return
      };

      const existingRequest = await db.collection('joinRequests').findOne({ userId: String(userId), groupId: Number(groupId) });
      if (existingRequest) {
        console.log("You've already sent request. Please wait a moment");
        return;
      }
      const newRequest = { userId: String(userId), groupId: Number(groupId) };
      await saveJoinRequest(newRequest);

      io.to(`group-${groupId}`).emit('groupRequest', newRequest);
      io.emit('groupRequest', newRequest);
    } catch (err) { 
      console.error(err); 
    }
  });

  //APPROVE REQUEST
  socket.on('approveRequest', async({ userId, groupId}) => {
    if(!userId || !groupId || !db) return
    try {
      await db.collection('users').updateOne(
        { id: String(userId) },
        { $addToSet: { groups: Number(groupId) }}
      );
      await db.collection('joinRequests').deleteOne({userId: String(userId), groupId: String(groupId) });

      io.to(`group-${groupId}`).emit('RequestApproved', userId);
      io.emit('requestApproved', userId);
    } catch (error){
      console.log(error)
    }
  });

  // REJECT REQUEST
  socket.on('rejectRequest', async ({ userId, groupId }) => {
    if (!userId || !groupId || !db) return;
    try {
      await db.collection('joinRequests').deleteOne({ userId: String(userId), groupId: Number(groupId) });
      io.to(`group-${groupId}`).emit('requestRejected', userId);
      io.emit('requestRejected', userId);
    } catch (err) { console.error(err); }
  });

  // ONLINE STATUS
  socket.on('updateStatus', async ({ userId, status }) => {
    await db.collection('users').updateOne(
      { id: Number(userId) },
      { $set: { status } }
    );
    io.emit('statusChanged', { userId, status });
  });

    // CREATE CHANNEL
    socket.on('createChannel', async ({ name, groupId }) => {
      if (!name || !groupId || !db) return;
      try {
        const existingChannels = await db.collection('channels').find({ groupId }).toArray();
        const nextId = existingChannels.length ? Math.max(...existingChannels.map(c => c.id)) + 1 : groupId * 100 + 1;
        const newChannel = { id: nextId, name, groupId, members: [], bannedUsers: [] };
        await saveChannel(newChannel);
  
        // Update group's channels array
        await db.collection('groups').updateOne(
          { id: groupId },
          { $addToSet: { channels: nextId } }
        );
  
        io.to(`group-${groupId}`).emit('channelCreated', newChannel);
      } catch (err) { console.error(err); }
    });

    // DELETE CHANNEL
    socket.on('deleteChannel', async ({ channelId, groupId }) => {
      if (!channelId || !groupId || !db) return;
      try {
        await db.collection('channels').deleteOne({ id: channelId });
        await db.collection('groups').updateOne(
          { id: groupId },
          { $pull: { channels: channelId } }
        );
        io.to(`group-${groupId}`).emit('channelDeleted', channelId);
      } catch (err) { console.error(err); }
    });


    // PROMOTE USER
    socket.on('promoteUser', async ({ userId, role, groupId }) => {
      if (!userId || !role || !groupId || !db) return;
      try {
        await db.collection('users').updateOne(
          { id: String(userId) },
          { $addToSet: { role } }
        );
        await db.collection('users').updateOne(
          { id: String(userId) },
          { $addToSet: { groups: Number(groupId) } }
        );
        io.to(`group-${groupId}`).emit('userPromoted', { userId, role, groupId });
      } catch (err) { console.error(err); }
    });

    //BAN USER
    socket.on('banUser', async ({ channelId, userId }) => {
      if(!channelId || !userId || !db) return;
      try {
        const channel = await db.collection('channels').findOne({id: channelId});
        if(!channel) return;
        
        await db.collection('channels').updateOne(
          {id: channelId},
          { $addToSet: { bannedUsers: userId }, $pull: { members: userId } }
        );

        io.to(`channel-${channelId}`).emit('userBanned', userId);
        io.to(`group-${channel.groupId}`).emit('userBannedFromChannel', { channelId, userId });
      } catch (error) {
        console.log(error)
      }
  });
});

// -------------------- REST API --------------------

  // LOGIN
  app.post('/api/login', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'DB not ready' });
    const { username, password } = req.body;

    const user = await db.collection('users').findOne({
      username: username.trim(),
      password: String(password).trim()
    });
    //console.log('Found user:', user);

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(user);
  });

  // REGISTER 
  app.post('/api/register', async (req, res) => {
    if(!db) return res.status(500).json({ error: 'DB not ready' });

    try {
      const { username, email, password, profileImg, status } = req.body;
      if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

      const exist = await db.collection('users').findOne({ $or: [{ username }, { email }] });
      if (exist) return res.status(400).json({ error: 'User already exists' });


      // Assign numeric id: get max id in users collection
      const lastUser = await db.collection('users').find().sort({ id: -1 }).limit(1).toArray();
      const nextId = lastUser.length > 0 ? String(Number(lastUser[0].id) + 1) : "1";

      const userToInsert = {
        id: nextId,       // numeric id
        username,
        email,
        password,
        role: ['USER'],
        groups: [],
        profileImg: profileImg || '/assets/Icons/woman-img-1.png',
        status: 'offline'  
      };

      await db.collection('users').insertOne(userToInsert);

      res.json({ message: 'User registered successfully', user: userToInsert });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }

});  


// GET ALL USERS
app.get('/api/users', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not ready' });
  const users = await db.collection('users').find().toArray();
  res.json(users);
})

// GET SINGLE USER
app.get('/api/users/:id', async (req, res) => {
  const id = String(req.params.id);
  const user = await db.collection('users').findOne({id});
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// DELETE USER
app.delete('/api/users/:id', async (req, res) => {
  const id = String(req.params.id);
  await db.collection('users').deleteOne({ id });
  await db.collection('joinRequests').deleteMany({ userId: id });
  await db.collection('channels').updateMany({}, { $pull: { members: id, bannedUsers: id } });
  io.emit('userDeleted', id);
  res.json({ ok: true });
});

// ---------- GROUPS -----------//

// GET GROUPS
app.get('/api/groups', async (req, res) => {
  const groups = await db.collection('groups').find().toArray();
  res.json(groups);
})

//GET SINGLE GROUP
app.get('/api/groups/:id', async (req, res) => {
  const id = Number(req.params.id);
  const group = await db.collection('groups').findOne({id});
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

// Create GROUP
app.post('/api/groups', async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    if (!name || !createdBy) return res.status(400).json({ error: 'Name and creator required' });

    const creator = await db.collection('users').findOne({ username: createdBy });
    if (!creator) return res.status(400).json({ error: 'Creator not found' });

    const maxGroup = await db.collection('groups').find().sort({ id: -1 }).limit(1).toArray();
    const newId = maxGroup.length ? maxGroup[0].id + 1 : 1;

    const newGroup = { id: newId, name, createdBy, channels: [] };
    await db.collection('groups').insertOne(newGroup);

    // Add creator as GROUP_ADMIN
    await db.collection('users').updateOne(
      { id: creator.id },
      { $addToSet: { groups: newId, role: "GROUP_ADMIN" }}
    );

    // Add join requests for normal users
    const normalUsers = await db.collection('users').find({ role: 'USER' }).toArray();
    for (const user of normalUsers) {
      await saveJoinRequest({ userId: user.id, groupId: newId });
    }

    io.emit('groupCreated', newGroup);
    res.json(newGroup);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});


// MODIFY GROUP (change name or createdBy)
app.put('/api/groups/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, createdBy } = req.body;
  try {
    const group = await db.collection('groups').findOne( {id} );
    if(!group) return res.status(404).json({ error: 'Group not found' });

    const update = {}
    if (name) update.name = name;
    if (createdBy !== undefined) update.createdBy = createdBy;

    await db.collection('groups').updateOne({ id }, { $set: update });
    const updatedGroup = { ...group, ...update };

    io.emit('groupModified', updatedGroup);
    io.to(`group-${id}`).emit('groupModified', updatedGroup);
    res.json(updatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE GROUP
app.delete('/api/groups/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const group = await db.collection('groups').findOne({ id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Remove channels belonging to group
    await db.collection('channels').deleteMany({ groupId: id });

    // Remove group from users' groups arrays
    await db.collection('users').updateMany(
      { groups: id },
      { $pull: { groups: id } }
    );

    // Remove join requests for this group
    await db.collection('joinRequests').deleteMany({ groupId: id });

    // Delete group
    await db.collection('groups').deleteOne({ id });

    io.emit('groupDeleted', id);
    io.to(`group-${id}`).emit('groupDeleted', id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// REMOVE USER FROM GROUP
app.post('/api/groups/:groupId/users/:userId/remove', async (req, res) => {
  const groupId = Number(req.params.groupId);
  const userId = req.params.userId;

  try {
    // Remove group from user's groups array
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.collection('users').updateOne(
      { id: userId },
      { $pull: { groups: groupId } }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Remove user error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// --------- CHANNELS ----------- //

// Get channels by group
app.get('/api/groups/:id/channels', async (req, res) => {
  const groupId = Number(req.params.id);
  try {
    const channels = await db.collection('channels').find({ groupId }).toArray();
    res.json(channels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE CHANNEL INSIDE GROUP 
app.post('/api/groups/:id/channels', async (req, res) => {
  const groupId = Number(req.params.id);
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  try {
    const group = await db.collection('groups').findOne({ id: groupId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Check if a channel with the same name already exists in this group
    const existing = await db.collection('channels').findOne({ groupId, name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Channel name has to be unique' });
    }

    // Get max channel id for this group
    const existingChannels = await db.collection('channels').find({ groupId }).toArray();
    const nextId = existingChannels.length
      ? Math.max(...existingChannels.map(c => c.id)) + 1
      : groupId * 100 + 1; 

    const newChannel = {
      id: nextId,
      groupId,
      name: name.trim(),
      members: [],
      bannedUsers: [],
    };

    await db.collection('channels').insertOne(newChannel);

    // Add channel ID to group's "channels" array
    await db.collection('groups').updateOne(
      { id: groupId },
      { $addToSet: { channels: nextId } }
    );

    io.to(`group-${groupId}`).emit('channelCreated', newChannel);
    res.json(newChannel);
  } catch (err) {
    console.error('❌ Create channel error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// UPDARE USER STATUS
app.post('/api/users/:id/status', async (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const result = await db.collection('users').updateOne(
      { id: userId },
      { $set: { status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


  // DELETE CHANNEL
  app.delete('/api/groups/:groupId/channels/:channelId', async (req, res) => {
    const groupId = Number(req.params.groupId);
    const channelId = Number(req.params.channelId);
  
    try {
      // Delete the channel document
      const result = await db.collection('channels').deleteOne({ id: channelId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }
  
      // Remove channel reference from group's channel list
      await db.collection('groups').updateOne(
        { id: groupId },
        { $pull: { channels: channelId } }
      );
  
      io.to(`group-${groupId}`).emit('channelDeleted', channelId);
      res.json({ ok: true });
    } catch (err) {
      console.error('❌ Delete channel error:', err);
      res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

// -------------------- JOIN REQUESTS -------------------- //

  //GET JOIN REQUESTS
  app.get('/api/join-requests', async (req, res) => {
    try {
      const requests = await db.collection('joinRequests').find().toArray();
      res.json(requests);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  //GET JOIN REQUESTS BY GROUP
  app.get('/api/groups/:id/join-requests', async (req, res) => {
    const groupId = Number(req.params.id);
    try {
      const requests = await db.collection('joinRequests').find({ groupId }).toArray();
      res.json(requests);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // CREATE JOIN REQUESTS
  app.post('/api/groups/:id/join-requests', async (req, res) => {
    const groupId = Number(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
  
    try {
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) return res.status(400).json({ error: 'User not found' });
  
      const group = await db.collection('groups').findOne({ id: groupId });
      if (!group) return res.status(400).json({ error: 'Group not found' });
  
      const existing = await db.collection('joinRequests').findOne({ userId, groupId });
      if (existing) return res.status(400).json({ error: 'Join request already exists' });
  
      const newRequest = {userId, groupId };
      await db.collection('joinRequests').insertOne(newRequest);
      console.log('Sent join request to:', groupId)
      res.json(newRequest);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // APPROVE JOIN REQUESTS
  app.post('/api/groups/:id/join-requests/:userId/approve', async (req, res) => {
    const groupId = Number(req.params.id);
    const userId = String(req.params.userId); // assume stored as string in joinRequests
    try {
      const request = await db.collection('joinRequests').findOne({ userId, groupId });
      if (!request) return res.status(404).json({ error: 'Join request not found' });
  
      // Add group to user's groups array
      await db.collection('users').updateOne(
        { id: String(userId) }, 
        { $addToSet: { groups: groupId } }
      );
  
      // Remove the join request
      await db.collection('joinRequests').deleteOne({ userId, groupId });
  
      // Emit socket to notify frontend
      io.to(`group-${groupId}`).emit('requestApproved', { userId, groupId });
  
      res.json({ ok: true, userId, groupId });
    } catch (err) {
      console.error('❌ Approve join request error:', err);
      res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  //REJECT JOIN REQUESTS
  app.post('/api/groups/:id/join-requests/:userId/reject', async (req, res) => {
    const groupId = Number(req.params.id);
    const userId = String(req.params.userId);
  
    try {
      const request = await db.collection('joinRequests').findOne({ userId, groupId });
      if (!request) return res.status(404).json({ error: 'Request not found' });
  
      await db.collection('joinRequests').deleteOne({ userId, groupId });
      io.to(`group-${groupId}`).emit('requestRejected', userId);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// -------------------- PROMOTE USER -------------------- //

app.post('/api/groups/:id/users/:userId/promote', async (req, res) => {
  const groupId = Number(req.params.id);
  const userId = String(req.params.userId);
  const { role } = req.body;

  if (!role || !['GROUP_ADMIN', 'SUPER_ADMIN'].includes(role))
    return res.status(400).json({ error: 'Valid role required' });

  try {
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const group = await db.collection('groups').findOne({ id: groupId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    await db.collection('users').updateOne(
      { id: userId },
      { $addToSet: { role, groups: groupId } }
    );

    await db.collection('joinRequests').deleteMany({ userId, groupId });

    io.emit('userPromoted', { userId, role, groupId });
    res.json({ message: 'User promoted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- USERS IN GROUP --------------------
app.get('/api/groups/:id/users', async (req, res) => {
  const groupId = Number(req.params.id);
  try {
    const users = await db.collection('users').find({ groups: groupId }).toArray();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- CHANNELS & MESSAGES --------------------

// Get all channels
app.get('/api/channels', async (req, res) => {
  try {
    const channels = await db.collection('channels').find().toArray();
    res.json(channels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific channel
app.get('/api/channels/:channelId', (req, res) => {
  const channelId = Number(req.params.channelId);
  const channel = db.collection('channels').findOne( {channelId})
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json(channel);
});

// Get mesages for channels
app.get('/api/channels/:channelId/messages', async (req, res) => {
  try {
    const channelId = Number(req.params.channelId);
    const messages = await db.collection('messages').find({ channelId }).toArray();

    // Attach profileImg to each message
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const user = await db.collection('users').findOne({ id: msg.senderId });
        return {
          ...msg,
          profileImg: user?.profileImg || '/assets/Icons/woman-img-1.png',
          senderName: user?.username || msg.senderName
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send new messages
app.post('/api/channels/:channelId/messages', async (req, res) => {

  console.log('POST /api/channels/:channelId/messages - headers content-type:', req.headers['content-type']);
  console.log('body keys:', Object.keys(req.body));
  console.log('type:', req.body.type, 'content length:', req.body.content ? req.body.content.length : 0);

  const channelId = Number(req.params.channelId);
  const { senderId, senderName, content, type } = req.body;

  if (!senderId || !senderName || !content) {
    return res.status(400).json({ error: 'Invalid message data' });
  }

  // Fetch user to attach profileImg
  const user = await db.collection('users').findOne({ id: senderId });
  const profileImg = user?.profileImg || '/assets/Icons/woman-img-1.png';

  const message = {
    channelId,
    senderId,
    senderName,
    content,
    type,   // "text" or "image"
    timestamp: new Date(),
    profileImg  // attach profile image
  };

  try {
    const result = await db.collection('messages').insertOne(message);
    const savedMessage = { ...message, _id: result.insertedId };

    // emit via socket.io for real-time updates
    io.to(`channel-${channelId}`).emit('receiveMessage', savedMessage);

    res.json(savedMessage);
  } catch (err) {
    console.error('Failed to save message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- Start --------------------
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`✅ PeerJS available at http://localhost:${PORT}/peerjs`);
});

