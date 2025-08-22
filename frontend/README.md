# 🚀 Resource Scheduler - React Frontend

A modern React application for managing test sessions, machines, and hardware resources with real-time scheduling capabilities.

## ✨ Features

- **📋 Session Management**: Create, import, and manage test sessions with CSV support
- **📅 Timeline Scheduling**: Visual timeline with drag-and-drop scheduling
- **🖥️ Machine Management**: Monitor and manage test machines
- **🔧 Hardware Management**: Configure hardware combinations and inventory
- **⚡ Real-time Updates**: Live synchronization with Socket.IO
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🎨 Modern UI**: Material-UI components with custom theming

## 🛠 Tech Stack

- **React 18** - Latest React with Hooks
- **Material-UI (MUI)** - Professional UI components
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend server running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3001`

### Available Scripts

```bash
# Development
npm start          # Start development server
npm test           # Run tests
npm run build      # Build for production

# Linting and Formatting
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

## 📁 Project Structure

```
src/
├── components/           # Reusable components
│   ├── common/          # Shared components
│   ├── sessions/        # Session management
│   ├── timeline/        # Timeline scheduling
│   └── ...
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── services/            # API services
├── contexts/            # React contexts
└── App.js               # Main app component
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
REACT_APP_ENV=development
```

### API Integration

The app connects to the backend API running on port 3000. Make sure the backend server is running before starting the React app.

## 📋 Pages Overview

### Sessions Management (`/sessions`)
- CSV import with drag-and-drop
- Session table with filtering and search
- Add/edit/delete sessions
- Real-time statistics

### Timeline Scheduler (`/`)
- 24-hour timeline view
- Drag-and-drop scheduling
- Auto-scheduling algorithms
- Multi-day support

### Machine Management (`/machines`)
- Machine status monitoring
- CRUD operations
- Hardware specifications
- Status management

### Hardware Management (`/hardware`)
- Platform and debugger management
- Hardware combinations
- Inventory tracking
- Utilization monitoring

## 🎨 Theming

The app uses Material-UI theming with custom colors and components. Theme configuration is in `src/App.js`.

## 📡 Real-time Features

### Socket.IO Integration
- Automatic reconnection
- Connection status indicator
- Real-time data updates
- Event-driven architecture

## 🔍 State Management

### TanStack Query
- Server state caching
- Automatic refetching
- Optimistic updates
- Error handling

### React Context
- Socket connection state
- Notification system
- Global app state

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## 🚀 Deployment

### Production Build

```bash
# Create production build
npm run build

# Serve build locally
npx serve -s build
```

## 🐛 Troubleshooting

### Common Issues

**Connection Issues**
```bash
# Check if backend is running
curl http://localhost:3000/health

# Verify environment variables
echo $REACT_APP_API_URL
```

**Build Issues**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Documentation

- [React Documentation](https://reactjs.org/)
- [Material-UI Documentation](https://mui.com/)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Socket.IO Documentation](https://socket.io/)

---

**🎉 Happy coding with React Resource Scheduler!**
