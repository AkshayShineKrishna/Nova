# Nova Frontend Architecture — High-Level In-Depth Documentation

This document provides a highly detailed explanation of the Nova frontend application architecture, specifically describing the state management, Server-Sent Events (SSE) data parsing, and component workflows.

## 🏗 Organization & Directory Structure

Built using **React 19** and **Vite**, the application runs as a Single Page Application (SPA).

- **`src/main.jsx`**: The application's main entry point, securely wrapping the app in necessary provider contexts and mounting `App.jsx` to the DOM.
- **`src/App.jsx`**: The root controller component. It defines standard `useState` and `useEffect` hooks to poll `/auth/me` on load. Based on the response, it conditionally renders either the `<AuthPage />` or the `<Dashboard />`, creating a protected routing layer without the overhead of external router libraries.
- **`src/components/`**: 
  - **`Dashboard.jsx`**: A massive state-machine controlling interactions. It holds arrays of `messages`, `sessions`, the currently `activeSessionId`, and UI toggles (`isSidebarOpen`, `isStreaming`).
  - **`AuthPage.jsx`**: Manages the dual-state logic for "Login" versus "Registration", handling user inputs and dispatching them to the API.
  - **`SessionExpiredDialog.jsx`**: A global React Dialog triggered entirely by window-level CustomEvents (e.g., `session-expired`).
- **`src/services/api.js`**: Centralizing all side-effects and backend communication via the JS `fetch` API.
- **`src/styles/`**: Vanilla CSS modules mapped identically to the component filenames.

---

## ⚙️ Detailed Architectural Breakdowns

### 1. Robust Component State Management in Dashboard.jsx
The interaction in `Dashboard.jsx` is modeled carefully to prevent loading loops and de-synced states:
- **`sessions`**: Holds an array of previous session objects loaded from `apiListSessions`. It populates the left-hand sidebar navigation.
- **`messages`**: An array of `role` / `content` objects representing the chat timeline of the active session. If the user clicks a session from the sidebar, `messages` is cleared, `apiGetSession` fires, and repopulates the visual thread.
- **`optimistic updates`**: When deleting or renaming a session in the sidebar, the arrays are iterated, and elements are mutated visually before the HTTP response strictly confirms success, offering a snappier feel.

### 2. Silent Token Refresh Interceptor
Since cookies cannot be natively interrogated by the JS client, the frontend heavily delegates session tracking to HTTP network status codes:
1. All requests (in `api.js`) to protected routes are wrapped in a generic `fetchWithRefresh` asynchronous function, passing `credentials: "include"`.
2. Upon receiving an HTTP `401 Unauthorized` response, the interceptor effectively pauses the promise chain.
3. It performs a silent background `POST` to `/auth/refresh`. If this secondary request yields a `200 OK`, it executes the previously paused original fetch.
4. If `/auth/refresh` responds with a custom `token_expired` detail (specifically tracking when a refresh token has exceeded lifetimes or been invalidated), the wrapper emits a browser `window.dispatchEvent(new CustomEvent("session-expired"))`, breaking the loop and rendering `SessionExpiredDialog`.

### 3. Asynchronous Execution and Server-Sent Event (SSE) Parsing
When a user presses "Send" in the Dashboard, the prompt string is passed into the `apiAskStream` function, bypassing traditional JSON resolution mechanics.

#### Implementation specifics:
- An `AbortController` handles manual cancellation flows if the user leaves the session early.
- The function relies on the native built-in `body.getReader()` method to pull TCP chunks.
- A `TextDecoder()` translates binary byte vectors sequentially back to `utf-8` buffers.
- Since SSE pushes items like `data: {"type": "token", "token": "..."}\n\n`, it recursively cuts off the `\n\n` delimiters.
- The stream passes specific message structs matching `type: "session"`, `type: "token"`, `type: "source"`, checking them logically and calling `Dashboard` setter functions respectively (`onToken`, `onSource`, `onSession`).
- **Live Markdown Generation**: When `onToken` is fired, React batches state updates appending strings directly to the final `message[index]` item. `<ReactMarkdown>` subsequently interprets line breaks and elements progressively in real-time.
