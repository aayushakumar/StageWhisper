# StageWhisper 
**A sleek, privacy-first teleprompter Chrome extension built for eye contact.**  
StageWhisper places your script **near the camera** with a beautiful **Notch Mode** (top-center strip), plus **Overlay**, **Side Panel**, and an optional **Floating Always-on-Top Strip** (Document PiP when available).

> “Stay on script. Stay on camera.”

---

## Demo (coming soon)
- 🎥 **30-sec product teaser**: _link_
- 🖼️ Screenshots:  
  - Notch Mode (top-center strip)  
  - Overlay Mode (on any webpage)  
  - Side Panel Editor (persistent control center)  
  - Floating Strip (always-on-top)

---

## Why StageWhisper
Most teleprompters pull your eyes away from the camera, feel clunky to control, or block your workflow.  
StageWhisper is designed around one core idea:

### **The best teleprompter is the one you don’t notice.**
- Near-camera reading → better eye contact  
- Keyboard-first control → no awkward mouse fumbling  
- Smooth motion + premium typography → feels “pro” instantly  
- Privacy-first → your scripts stay local by default

---

## Features
### Core prompting
- ✅ Smooth scrolling (WPM-based), low-jitter playback
- ✅ Play/Pause, speed up/down, rewind/forward
- ✅ Focus line highlight + next-line preview
- ✅ Bookmarks (jump points) + quick rewind

### Signature: Notch Mode
- ✅ Sleek **top-center strip** designed to sit visually under the webcam area  
- ✅ Drag-to-calibrate + snap-to-center
- ✅ “Panic hide” shortcut
- ✅ Optional click-through so you can still interact with the page behind

### Modes
- ✅ **Side Panel Mode**: script editor + controls (persistent)
- ✅ **Overlay Mode**: inject teleprompter on any webpage (Shadow DOM isolated)
- ⏳ **Floating Strip Mode**: always-on-top mini teleprompter (Document Picture-in-Picture where supported)

### Script workflow
- ✅ Script CRUD (create, rename, duplicate, delete with undo)
- ✅ Autosave + recovery
- ✅ Import/export (TXT / Markdown)
- ⏳ “Send selection to StageWhisper” via context menu

### Privacy & trust
- ✅ No tracking by default
- ✅ Local storage by default
- ✅ Minimal permissions approach

---

## Keyboard shortcuts (defaults)

- **Alt/Option + P** → Play / Pause  
- **Alt/Option + ↑ / ↓** → Speed up / down  
- **Alt/Option + ← / →** → Rewind / Forward  
- **Alt/Option + H** → Hide / Show (panic hide)  
- **Alt/Option + N** → Toggle Notch Mode  

---

## Tech overview
StageWhisper is built on **Chrome Extensions Manifest V3**.

### Architecture
- **Service Worker**: routing commands + session coordination
- **Side Panel**: editor, scripts list, settings, controls
- **Content Script Overlay**: injected UI on webpages (Shadow DOM to avoid CSS conflicts)
- **Floating Strip**: Document Picture-in-Picture UI (best-effort always-on-top)

### Design goals
- 60fps-feel scroll on modern machines  
- <50ms perceived response for controls  
- zero “UI fighting”: everything should feel frictionless  
