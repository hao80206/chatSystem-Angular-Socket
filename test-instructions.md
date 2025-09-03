# Quick Test Instructions

## 1. Restart Both Services

**Server (Terminal 1):**
```bash
cd serverSide
node server/server.js
```

**Client (Terminal 2):**
```bash
cd clientSide
ng serve
```

## 2. Test with Two Browser Tabs

**Tab 1 - Admin:**
- URL: http://localhost:4200
- Login: `Super` / `123`

**Tab 2 - Normal User:**
- URL: http://localhost:4200  
- Login: `Alice` / `123`

## 3. Test Real-time Functions

1. **Both users go to Group 1 → General channel**
2. **Send messages** - should appear in both tabs instantly
3. **Admin bans Alice** - should work immediately
4. **Create new channel** - should appear in both tabs
5. **Delete channel** - should disappear from both tabs

## 4. Check Console

- **Server console**: Should show socket connections and events
- **Browser console**: Should show no errors
- **No duplicate groups/channels** should be created

## 5. Expected Results

✅ **Real-time messaging works**
✅ **Ban function works**  
✅ **No duplicate groups/channels**
✅ **Register button works**
✅ **Single socket connection per user**
✅ **Admin controls work properly**

## Troubleshooting

If issues persist:
1. Check browser console for errors
2. Check server console for socket events
3. Clear browser cache and reload
4. Restart both services 