const request = require('supertest');
const { expect } = require('chai');
const app = require('../server/server');

describe('Server Routes', function() {
  let testUserId;
  let testGroupId;
  let testChannelId;

  // REGISTER
  it('POST /api/register should create a new user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'test', email: 'test@example.com', password: '123456' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('user');
    expect(res.body.user).to.have.property('username', 'test');

    testUserId = res.body.user.id; // save userId for later tests
  });

  // LOGIN
  it('POST /api/login should login user', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'test', password: '123456' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('username', 'test');
  });

  // GET ALL USERS
  it('GET /api/users should return users array', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  // GET SINGLE USER
  it('GET /api/users/:id should return a single user', async () => {
    const res = await request(app).get(`/api/users/${testUserId}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', testUserId);
  });

  // CREATE GROUP
  it('POST /api/groups should create a new group', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Test Group', createdBy: 'test' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id');
    testGroupId = res.body.id;
  });

  // GET ALL GROUPS
  it('GET /api/groups should return all groups', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  // GET SINGLE GROUP
  it('GET /api/groups/:id should return a single group', async () => {
    const res = await request(app).get(`/api/groups/${testGroupId}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', testGroupId);
  });

  // CREATE CHANNEL IN GROUP
  it('POST /api/groups/:id/channels should create a channel', async () => {
    const res = await request(app)
      .post(`/api/groups/${testGroupId}/channels`)
      .send({ name: 'general' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id');
    testChannelId = res.body.id;
  });

  // GET CHANNELS BY GROUP
  it('GET /api/groups/:id/channels should return channels', async () => {
    const res = await request(app).get(`/api/groups/${testGroupId}/channels`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.some(c => c.id === testChannelId)).to.be.true;
  });

  // UPDATE USER STATUS
  it('POST /api/users/:id/status should update status', async () => {
    const res = await request(app)
      .post(`/api/users/${testUserId}/status`)
      .send({ status: 'online' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('status', 'online');
  });

  // GET ALL CHANNELS
  it('GET /api/channels should return all channels', async () => {
    const res = await request(app).get('/api/channels');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

    // SEND MESSAGE
    it('POST /api/channels/:channelId/messages should send message', async () => {
        const res = await request(app)
            .post(`/api/channels/${testChannelId}/messages`)  // use testChannelId
            .send({
            senderId: testUserId,
            senderName: 'test',
            content: 'Hello!',
            type: 'text'
            });
        expect(res.status).to.equal(200);
    });
  
  // GET MESSAGES
  it('GET /api/channels/:channelId/messages should return messages', async () => {
    const res = await request(app).get(`/api/channels/${testChannelId}/messages`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.some(m => m.content === 'Hello!')).to.be.true;
  });

  // DELETE CHANNEL
  it('DELETE /api/groups/:groupId/channels/:channelId should delete channel', async () => {
    const res = await request(app).delete(`/api/groups/${testGroupId}/channels/${testChannelId}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ok', true);
  });

  // DELETE USER
  it('DELETE /api/users/:id should delete user', async () => {
    const res = await request(app).delete(`/api/users/${testUserId}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ok', true);
  });

  // DELETE GROUP
  it('DELETE /api/groups/:id should delete group', async () => {
    const res = await request(app).delete(`/api/groups/${testGroupId}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ok', true);
  });
});
