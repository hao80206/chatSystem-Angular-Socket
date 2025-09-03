# Chat System Testing Guide

## Prerequisites
1. Make sure both server and client are running
2. Server should be on port 3000
3. Client should be on port 4200 (default Angular port)

## Starting the System

### 1. Start the Server
```bash
cd serverSide
node server/server.js
```
You should see: "Server running on http://localhost:3000"

### 2. Start the Client
```bash
cd clientSide
ng serve
```
You should see: "Compiled successfully" and the app running on http://localhost:4200

## Testing with Two Tabs

### Tab 1: Admin User (Super Admin)
1. Open http://localhost:4200 in first tab
2. Login with:
   - Username: `Super`
   - Password: `123`
3. You should see all groups and have full admin privileges

### Tab 2: Normal User
1. Open http://localhost:4200 in second tab
2. Login with:
   - Username: `Alice`
   - Password: `123`
3. You should see only the groups you're a member of

## Testing Real-time Functions

### 1. Test Message Sending
1. In Tab 1 (Admin): Navigate to Group 1 → General channel
2. In Tab 2 (Alice): Navigate to Group 1 → General channel
3. Send a message from either tab
4. Verify the message appears in real-time in both tabs

### 2. Test Ban User Function
1. In Tab 1 (Admin): Go to Group 1 → General channel
2. In Tab 2 (Alice): Go to Group 1 → General channel
3. In Tab 1: Use the "Ban" button next to Alice's name
4. Verify Alice gets banned and redirected to dashboard
5. Verify Alice can no longer access the channel

### 3. Test Join Group Request
1. In Tab 2 (Alice): Try to join a group you're not in
2. In Tab 1 (Admin): Check for pending join requests
3. Approve/reject the request
4. Verify the result in both tabs

### 4. Test Channel Creation/Deletion
1. In Tab 1 (Admin): Create a new channel in any group
2. Verify it appears in Tab 2 in real-time
3. Delete the channel
4. Verify it's removed from Tab 2

## Expected Behavior

### Real-time Updates
- Messages should appear instantly in both tabs
- User bans should be immediate
- Channel changes should be reflected in real-time
- Join requests should update both admin and user views

### Admin Functions
- Super Admin can manage all groups
- Group Admin can manage their groups only
- Normal users cannot access admin functions

### Error Handling
- Banned users should be redirected to dashboard
- Invalid actions should show appropriate error messages
- Socket disconnections should be handled gracefully

## Troubleshooting

### If messages don't appear:
1. Check browser console for errors
2. Verify socket connection in both tabs
3. Check server console for socket events

### If ban doesn't work:
1. Verify user has admin role
2. Check server console for ban events
3. Verify channel membership

### If real-time updates don't work:
1. Check socket connection status
2. Verify both tabs are connected to same server
3. Check for CORS issues

## Test Users Available

| Username | Password | Role | Groups |
|----------|----------|------|---------|
| Super | 123 | SUPER_ADMIN | All groups |
| Stella | 123 | GROUP_ADMIN | 1,3,4 |
| Alice | 123 | USER | 1,2,5,7 |
| Bob | 123 | USER | 2,3,6,7 |
| Kevin | 123 | USER | 1,4,6,7 |
| Taylor | 123 | USER | 1,2,3,4 |

## Socket Events to Monitor

In server console, you should see:
- Socket connections/disconnections
- Join/leave channel events
- Message sending events
- Ban user events
- Group management events 