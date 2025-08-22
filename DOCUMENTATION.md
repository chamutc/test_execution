# 📚 Resource Scheduler - Complete Documentation

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Features](#features)
3. [Quick Start](#quick-start)
4. [User Guide](#user-guide)
5. [Architecture](#architecture)
6. [API Reference](#api-reference)
7. [Data Models](#data-models)
8. [Testing](#testing)
9. [Configuration](#configuration)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 **Overview**

The Resource Scheduler is a comprehensive web-based application designed to manage test sessions, hardware resources, and scheduling for development teams. It provides intelligent scheduling algorithms, hardware inventory management, and multi-day timeline visualization.

### **Key Benefits**
- **Efficiency**: Automated scheduling reduces manual effort by 80%
- **Resource Optimization**: Intelligent hardware allocation maximizes utilization
- **Visibility**: Real-time dashboards provide complete project visibility
- **Scalability**: Handles hundreds of sessions and resources simultaneously
- **Flexibility**: Supports both manual and automated scheduling workflows

---

## ✨ **Features**

### **🎯 Core Functionality**
- **📊 Session Management**: Import, create, and manage test sessions with CSV support
- **🔧 Hardware Management**: Track platforms, debuggers, and hardware combinations
- **📅 Timeline Scheduling**: Visual 24-hour timeline with drag-and-drop scheduling
- **🤖 Auto-Scheduling**: Intelligent scheduling algorithms with priority optimization
- **📈 Analytics**: Real-time statistics and resource utilization tracking

### **🛠 Advanced Features**
- **🔄 Multi-Day Scheduling**: Continuous scheduling across multiple days
- **📦 Inventory Management**: Hardware quantity tracking and availability schedules
- **⚡ Real-Time Updates**: Live synchronization between all components
- **🎨 Modern UI**: Responsive design with intuitive navigation
- **📱 Mobile Support**: Works on desktop, tablet, and mobile devices

### **🚀 Automation Features**
- **CSV Import**: Bulk session import with automatic hardware creation
- **Auto-Scheduling**: Priority-based intelligent scheduling
- **Conflict Detection**: Automatic detection and resolution of scheduling conflicts
- **Resource Allocation**: Smart hardware assignment based on requirements
- **Time Calculation**: Automatic estimation based on test case complexity

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 14+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)
- 4GB RAM minimum, 8GB recommended
- 1GB free disk space

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd resource-scheduler

# Install dependencies
npm install

# Start the server
npm start

# Open browser to http://localhost:3000
```

### **First Steps**
1. **Import Sessions**: Go to Sessions page → Import CSV with your test data
2. **Manage Hardware**: Visit Hardware Management to configure platforms and debuggers
3. **Schedule Sessions**: Use Timeline page to manually schedule or auto-schedule sessions
4. **Monitor Progress**: View real-time statistics and resource utilization

### **Sample Data**
The application includes sample data to help you get started:
- **Sample CSV**: `sample.csv` with example session data
- **Default Hardware**: Pre-configured platforms and debuggers
- **Example Schedule**: Sample timeline with scheduled sessions

---

## 📖 **User Guide**

### **📋 Sessions Management**

#### **CSV Import Process**
1. **Prepare CSV File**: Ensure your CSV has all required columns
2. **Upload File**: Use drag-and-drop or file picker
3. **Validation**: System validates format and data
4. **Processing**: Sessions are created and hardware is auto-generated
5. **Review**: Check imported sessions and statistics

#### **Required CSV Columns**
- **Session**: Unique session name
- **Platform**: Hardware platform requirement
- **Debugger**: Debugger tool requirement
- **OS**: Operating system specification
- **Priority**: high, normal, or urgent
- **Num of normal test case**: Normal test case count or breakdown
- **Num of combo test case**: Combo test case count or breakdown
- **Status**: pending, scheduled, or completed

#### **CSV Format Examples**
```csv
Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status
Test Session 1,Platform_A,S32_DBG,Ubuntu 24.04,high,pass:5;fail:3;not_run:2,pass:1;fail:1;not_run:0,pending
Test Session 2,Platform_B,Segger,Windows 11,normal,10,1,pending
```

#### **Manual Session Creation**
- **Add Session Button**: Opens modal form for session creation
- **Required Fields**: Name, priority, estimated time
- **Optional Fields**: Platform, debugger, test case details
- **Hardware Detection**: Automatically determines if hardware is required
- **Time Calculation**: Estimates duration based on test cases

#### **Session Operations**
- **Edit**: Modify session details and requirements
- **Delete**: Remove sessions with confirmation
- **Export**: Download sessions as CSV file
- **Clear All**: Remove all sessions (with confirmation)
- **Status Updates**: Track progress through pending → scheduled → completed

### **📅 Timeline Scheduling**

#### **Timeline Interface**
- **24-Hour Grid**: Complete daily schedule visualization
- **Resource Columns**: Machines and hardware combinations
- **Time Slots**: 1-hour slots with visual indicators
- **Session Sidebar**: Draggable pending sessions
- **Date Navigation**: Previous/Next day, Today button, date picker

#### **Manual Scheduling**
1. **Drag Sessions**: Drag from sidebar to timeline slots
2. **Drop Validation**: System checks for conflicts and availability
3. **Resource Assignment**: Automatic hardware allocation
4. **Visual Feedback**: Color-coded status indicators
5. **Conflict Resolution**: Warnings for scheduling conflicts

#### **Auto-Scheduling Options**
- **Full Schedule**: Schedule all pending sessions optimally
- **Limited Schedule**: Schedule specific sessions or time ranges
- **Priority Modes**: High-priority first, balanced, or time-optimized
- **Hardware Optimization**: Maximize resource utilization
- **Multi-Day Support**: Continuous scheduling across multiple days

#### **Scheduling Algorithms**
- **Priority-Based**: High-priority sessions scheduled first
- **Resource-Aware**: Considers hardware availability and conflicts
- **Time-Optimized**: Minimizes total schedule duration
- **Load-Balanced**: Distributes sessions evenly across resources
- **Conflict-Free**: Ensures no overlapping resource assignments

#### **Multi-Day Navigation**
- **Day Controls**: Navigate between scheduled days
- **Continuous View**: Seamless multi-day scheduling
- **Day Indicators**: Current day highlighting and navigation state
- **Extended Schedules**: Handle schedules spanning weeks or months

### **🔧 Hardware Management**

#### **Hardware Combinations**
- **Platform + Debugger**: Define valid hardware combinations
- **Enable/Disable**: Control availability of combinations
- **Priority Settings**: Set combination priority levels
- **Description**: Add notes and specifications
- **Auto-Creation**: Combinations created from CSV import

#### **Inventory Management**
- **Total Quantity**: Maximum available hardware units
- **Available Quantity**: Currently available units
- **Allocated Quantity**: Units currently in use
- **Utilization Tracking**: Real-time usage statistics
- **Threshold Alerts**: Warnings for low availability

#### **Availability Schedules**
- **Weekly Schedules**: Define availability by day of week
- **Time Ranges**: Set start and end hours for availability
- **Multiple Schedules**: Different schedules for different hardware
- **Holiday Support**: Handle special dates and exceptions
- **Visual Calendar**: Interactive schedule management

#### **Hardware Analytics**
- **Utilization Rates**: Track hardware usage over time
- **Demand Analysis**: Identify high-demand resources
- **Capacity Planning**: Forecast future hardware needs
- **Cost Analysis**: Track resource costs and ROI
- **Performance Metrics**: Monitor scheduling efficiency

---

## 🏗 **Architecture**

### **System Overview**
The Resource Scheduler follows a modern web application architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Data Layer    │
│   (Browser)     │◄──►│   (Node.js)     │◄──►│   (JSON Files)  │
│                 │    │                 │    │                 │
│ • HTML/CSS/JS   │    │ • Express API   │    │ • Sessions      │
│ • Timeline UI   │    │ • Scheduling    │    │ • Hardware      │
│ • Drag & Drop   │    │ • CSV Processing│    │ • Schedule      │
│ • Real-time     │    │ • Socket.IO     │    │ • Machines      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Frontend Architecture**
```
public/
├── index.html                 # Main application page
├── hardware-management.html   # Hardware management interface
├── css/
│   ├── styles.css            # Main application styles
│   ├── tabs.css              # Tab navigation styles
│   └── timeline.css          # Timeline visualization styles
└── js/
    ├── app.js                # Main application controller
    ├── timelineManager.js    # Timeline and scheduling logic
    ├── comprehensiveHardwareManager.js  # Hardware management
    ├── csvHandler.js         # CSV import/export handling
    └── utils/
        └── timeCalculator.js # Time calculation utilities
```

### **Backend Architecture**
```
backend/
├── server.js                 # Express server and middleware
├── routes/                   # API endpoint definitions
│   ├── sessionRoutes.js     # Session CRUD operations
│   ├── hardwareRoutes.js    # Hardware management APIs
│   ├── csvRoutes.js         # CSV import/export APIs
│   ├── schedulingRoutes.js  # Scheduling algorithm APIs
│   └── machineRoutes.js     # Machine management APIs
├── services/                 # Business logic layer
│   ├── dataService.js       # Data persistence and retrieval
│   ├── schedulingService.js # Scheduling algorithms
│   ├── csvProcessor.js      # CSV parsing and validation
│   ├── hardwareService.js   # Hardware management logic
│   └── socketService.js     # Real-time communication
├── utils/                    # Utility functions
│   └── timeCalculator.js    # Time estimation algorithms
└── data/                     # JSON data storage
    ├── sessions.json        # Session data
    ├── hardware.json        # Hardware configurations
    ├── schedule.json        # Schedule assignments
    └── machines.json        # Machine definitions
```

### **Data Flow**
1. **User Input** → Frontend validation → API request
2. **API Processing** → Business logic → Data validation
3. **Data Storage** → JSON file updates → Response generation
4. **Real-time Updates** → Socket.IO broadcast → UI refresh
5. **Background Tasks** → Scheduling algorithms → Automatic updates

### **Component Interactions**
- **Session Manager** ↔ **Timeline Manager**: Session scheduling and display
- **Hardware Manager** ↔ **Scheduling Service**: Resource allocation
- **CSV Processor** ↔ **Data Service**: Bulk data import
- **Socket Service** ↔ **All Components**: Real-time synchronization

---

## 🔧 **API Reference**

### **Session Management APIs**

#### **Get All Sessions**
```http
GET /api/sessions
```
**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session_123",
      "name": "Test Session",
      "priority": "high",
      "status": "pending",
      "estimatedTime": 2.5,
      "requiresHardware": true
    }
  ]
}
```

#### **Create Session**
```http
POST /api/sessions
Content-Type: application/json

{
  "name": "New Test Session",
  "platform": "Platform_A",
  "debugger": "S32_DBG",
  "priority": "high",
  "estimatedTime": 3.0
}
```

#### **Update Session**
```http
PUT /api/sessions/:id
Content-Type: application/json

{
  "status": "scheduled",
  "priority": "urgent"
}
```

#### **Delete Session**
```http
DELETE /api/sessions/:id
```

#### **Get Sessions by Status**
```http
GET /api/sessions/status/:status
```

### **Hardware Management APIs**

#### **Get Hardware Combinations**
```http
GET /api/hardware/combinations
```

#### **Create Hardware Combination**
```http
POST /api/hardware/combinations
Content-Type: application/json

{
  "name": "Platform_A + S32_DBG",
  "platformId": "platform_123",
  "debuggerId": "debugger_123",
  "enabled": true
}
```

#### **Update Hardware Combination**
```http
PUT /api/hardware/combinations/:id
Content-Type: application/json

{
  "enabled": false,
  "priority": "low"
}
```

#### **Get Hardware Inventory**
```http
GET /api/hardware/inventory
```

#### **Update Inventory**
```http
PUT /api/hardware/inventory/:id
Content-Type: application/json

{
  "availableQuantity": 5,
  "totalQuantity": 10
}
```

### **Scheduling APIs**

#### **Auto-Schedule Sessions**
```http
POST /api/scheduling/auto
Content-Type: application/json

{
  "type": "full",
  "startDateTime": "2024-01-01T09:00:00Z",
  "optimizationMode": "priority",
  "enableMultiDay": true
}
```

#### **Manual Schedule Assignment**
```http
POST /api/scheduling/manual
Content-Type: application/json

{
  "sessionId": "session_123",
  "machineId": "machine_456",
  "timeSlot": "2024-01-01-09",
  "duration": 2
}
```

#### **Check Scheduling Conflicts**
```http
GET /api/scheduling/conflicts?date=2024-01-01
```

#### **Clear Schedule**
```http
DELETE /api/scheduling/clear
```

### **CSV Management APIs**

#### **Upload CSV File**
```http
POST /api/csv/upload
Content-Type: multipart/form-data

csvFile: [file]
```

#### **Download CSV Template**
```http
GET /api/csv/template
```

#### **Export Sessions as CSV**
```http
POST /api/csv/export
Content-Type: application/json

{
  "type": "sessions",
  "filters": {
    "status": "pending",
    "priority": "high"
  }
}
```

#### **Get Import History**
```http
GET /api/csv/history
```

### **Error Responses**
All APIs return consistent error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### **Common HTTP Status Codes**
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error)
- **404**: Not Found
- **409**: Conflict (scheduling conflict)
- **500**: Internal Server Error

---

## 📊 **Data Models**

### **Session Model**
```javascript
{
  id: "session_123",                    // Unique identifier
  name: "Test Session Name",            // Display name
  platform: "Platform_A",              // Required platform
  debugger: "S32_DBG",                 // Required debugger
  os: "Ubuntu 20.04",                  // Operating system
  priority: "high",                    // high, normal, urgent
  status: "pending",                   // pending, scheduled, completed
  estimatedTime: 2.5,                  // Duration in hours
  requiresHardware: true,              // Hardware requirement flag
  normalTestCases: {                   // Normal test case breakdown
    pass: 5,
    fail: 3,
    notRun: 2,
    total: 10
  },
  comboTestCases: {                    // Combo test case breakdown
    pass: 1,
    fail: 1,
    notRun: 0,
    total: 2
  },
  hardwareRequirements: {             // Hardware specifications
    platformId: "platform_123",
    debuggerId: "debugger_123"
  },
  createdAt: "2024-01-01T00:00:00Z",  // Creation timestamp
  updatedAt: "2024-01-01T00:00:00Z",  // Last update timestamp
  source: "csv",                       // csv, manual
  metadata: {                          // Additional session data
    description: "Session description",
    tags: ["regression", "smoke"],
    assignee: "developer@company.com"
  }
}
```

---

## 🚀 **Deployment**

### **Production Setup**
```bash
# Install production dependencies
npm ci --only=production

# Set environment variables
export NODE_ENV=production
export PORT=80
export DATA_DIR=/var/lib/resource-scheduler

# Create necessary directories
sudo mkdir -p /var/lib/resource-scheduler
sudo mkdir -p /var/log/resource-scheduler
sudo chown -R $USER:$USER /var/lib/resource-scheduler

# Start with PM2 (recommended)
npm install -g pm2
pm2 start backend/server.js --name "resource-scheduler"
pm2 startup
pm2 save

# Or start directly
npm start
```

### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  resource-scheduler:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/resource-scheduler
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File upload size limit
    client_max_body_size 50M;
}
```

### **Systemd Service**
```ini
# /etc/systemd/system/resource-scheduler.service
[Unit]
Description=Resource Scheduler Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/resource-scheduler
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATA_DIR=/var/lib/resource-scheduler

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=resource-scheduler

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/resource-scheduler

[Install]
WantedBy=multi-user.target
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **CSV Import Fails**
**Symptoms**: Import button doesn't work, error messages during upload
**Causes & Solutions**:
- **Invalid Format**: Ensure CSV has all required columns with correct headers
- **File Size**: Large files may timeout - increase `MAX_FILE_SIZE` setting
- **Encoding**: Use UTF-8 encoding for files with special characters
- **Data Validation**: Check for invalid priority values or missing required data
- **Server Memory**: Large imports may require more server memory

**Debug Steps**:
```bash
# Check server logs
tail -f logs/application.log

# Verify CSV format
head -n 5 your-file.csv

# Test with sample data
curl -X POST -F "csvFile=@sample.csv" http://localhost:3000/api/csv/upload
```

#### **Scheduling Conflicts**
**Symptoms**: Sessions won't schedule, conflict warnings, auto-schedule fails
**Causes & Solutions**:
- **Hardware Availability**: Verify hardware combinations are enabled and have inventory
- **Time Conflicts**: Check for overlapping time slots or insufficient duration
- **Resource Limits**: Ensure sufficient hardware inventory for concurrent sessions
- **Date Ranges**: Verify scheduling within valid date ranges and availability schedules

**Debug Steps**:
```bash
# Check hardware status
curl http://localhost:3000/api/hardware/combinations

# Verify inventory
curl http://localhost:3000/api/hardware/inventory

# Check conflicts
curl http://localhost:3000/api/scheduling/conflicts?date=2024-01-01
```

#### **Performance Issues**
**Symptoms**: Slow loading, timeouts, high memory usage
**Causes & Solutions**:
- **Large Datasets**: Implement pagination for large session lists
- **Memory Usage**: Monitor server memory with many concurrent users
- **Database Size**: Regular cleanup of old schedule data
- **Browser Cache**: Clear browser cache for UI issues
- **Network Latency**: Check network connectivity and server response times

**Performance Monitoring**:
```bash
# Monitor server resources
top -p $(pgrep node)

# Check memory usage
free -h

# Monitor disk space
df -h

# Check network connections
netstat -an | grep :3000
```

#### **Hardware Management Issues**
**Symptoms**: Hardware not appearing, inventory errors, availability problems
**Causes & Solutions**:
- **Data Corruption**: Check JSON data files for syntax errors
- **Permission Issues**: Ensure proper file permissions for data directory
- **Synchronization**: Verify real-time updates are working
- **Configuration**: Check hardware combination settings and availability schedules

**Debug Steps**:
```bash
# Validate JSON data
node -e "console.log(JSON.parse(require('fs').readFileSync('backend/data/hardware.json')))"

# Check file permissions
ls -la backend/data/

# Test API endpoints
curl http://localhost:3000/api/hardware/platforms
```

### **Debug Mode**
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm start

# Enable Node.js debugging
node --inspect backend/server.js

# Check server health
curl http://localhost:3000/health

# Monitor API requests in browser
# Open Developer Tools → Network tab
```

### **Log Analysis**
```bash
# View recent logs
tail -f logs/application.log

# Search for errors
grep -i error logs/application.log

# Filter by timestamp
grep "2024-01-01" logs/application.log

# Count error types
grep -i error logs/application.log | cut -d' ' -f4 | sort | uniq -c
```

---

## 📞 **Support & Contributing**

### **Getting Help**
- **Documentation**: Check this guide and inline code comments
- **Issues**: Report bugs via GitHub Issues with detailed reproduction steps
- **Questions**: Use GitHub Discussions for general questions
- **Email**: Contact development team for urgent production issues

### **Contributing Guidelines**
1. **Fork Repository**: Create your own fork of the project
2. **Create Branch**: Use descriptive branch names (feature/add-multi-day-support)
3. **Write Tests**: Include unit tests for all new functionality
4. **Update Documentation**: Keep documentation current with changes
5. **Submit PR**: Provide clear description of changes and rationale
6. **Code Review**: Address feedback and iterate as needed

### **Development Standards**
- **JavaScript**: ES6+ syntax, async/await preferred over callbacks
- **CSS**: BEM methodology for class naming, responsive design principles
- **Comments**: JSDoc for functions, inline comments for complex logic
- **Testing**: Minimum 80% code coverage for new features
- **Git**: Conventional commit messages, atomic commits

### **Release Process**
1. **Version Bump**: Update version in package.json
2. **Changelog**: Document all changes in CHANGELOG.md
3. **Testing**: Run full test suite and manual testing
4. **Documentation**: Update documentation for new features
5. **Tag Release**: Create git tag with version number
6. **Deploy**: Deploy to staging, then production after validation

---

## 📄 **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🎉 **Acknowledgments**

- **Technologies**: Built with Node.js, Express.js, and modern web standards
- **Design**: Responsive design using CSS Grid and Flexbox
- **Functionality**: Drag-and-drop with native HTML5 APIs
- **Real-time**: Live updates with efficient DOM manipulation
- **Community**: Thanks to all contributors and users

---

**🚀 Ready to optimize your test session scheduling!**

For the latest updates and detailed API documentation, visit our [GitHub repository](https://github.com/your-org/resource-scheduler).
