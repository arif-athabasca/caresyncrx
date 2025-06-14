# Speech-to-Text Troubleshooting Guide

This guide helps resolve common issues with the speech recognition functionality in CareSyncRx.

## Quick Solutions

### 1. Browser Compatibility
**Supported Browsers:**
- ✅ Chrome/Chromium (Recommended)
- ✅ Microsoft Edge  
- ✅ Safari (macOS/iOS)
- ❌ Firefox (Limited support)

**Recommended:** Use Chrome for the best speech recognition experience.

### 2. Enable HTTPS for Development
Speech recognition requires HTTPS or localhost with microphone permissions.

**Option A: Use PowerShell Script (Recommended)**
```powershell
.\Start-CareSyncRx-Speech.ps1 -WithSpeech
```

**Option B: Manual HTTPS**
```bash
# Install local-ssl-proxy globally
npm install -g local-ssl-proxy

# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start HTTPS proxy
local-ssl-proxy --source 3001 --target 3000
```

**Option C: Set Environment Variable**
```bash
set HTTPS=true && npm run dev:speech
```

### 3. Browser Permissions

**Chrome/Edge:**
1. Click the lock icon in the address bar
2. Set "Microphone" to "Allow"
3. Refresh the page

**Safari:**
1. Go to Safari > Settings > Websites > Microphone  
2. Set localhost to "Allow"
3. Refresh the page

### 4. Common Error Messages

| Error | Solution |
|-------|----------|
| "Microphone access denied" | Grant microphone permissions in browser settings |
| "Speech recognition requires HTTPS" | Use HTTPS development server (see option 2) |
| "Not supported in this browser" | Switch to Chrome or Edge |
| "Service not allowed" | Enable HTTPS or check security settings |
| "Audio capture failed" | Check microphone hardware and drivers |

## Advanced Troubleshooting

### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages starting with 🎤
4. Share any error messages with support

### Test Microphone Access
```javascript
// Run in browser console to test microphone
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Microphone access granted');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Microphone access failed:', err));
```

### Verify Speech API Support
```javascript
// Run in browser console
const hasAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
console.log('Speech Recognition API supported:', hasAPI);
```

## Development Setup

### Environment Variables
Create `.env.local` file:
```
HTTPS=true
HTTPS_PORT=3001
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Browser Security Settings

**Chrome Flags for Development:**
- Open `chrome://flags/`
- Enable "Experimental Web Platform features"
- Enable "Insecure origins treated as secure" 
- Add `http://localhost:3000` to the list

**Edge Settings:**
- Similar to Chrome, access via `edge://flags/`

## Production Deployment

For production deployment, ensure:
1. ✅ Valid SSL certificate
2. ✅ HTTPS enabled  
3. ✅ Proper CSP headers for microphone access
4. ✅ Privacy policy mentions voice data

## Support

If issues persist:
1. Check this troubleshooting guide
2. Review browser console errors
3. Test with different browsers
4. Contact development team with:
   - Browser type and version
   - Error messages from console
   - Steps to reproduce the issue

---

**Last Updated:** June 2025  
**Version:** 1.0.0
