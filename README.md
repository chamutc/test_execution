# Jenkins Test Scheduler Application

A comprehensive web-based Jenkins test scheduler application that manages test sessions, hardware resources, and machine allocation through CSV import and intelligent scheduling algorithms.

## Features

### Core Functionality
- **CSV-Driven Workflow**: Import test sessions via CSV files with automatic data processing
- **Hardware Management**: Dynamic inventory management with real-time usage tracking
- **Machine Management**: Auto-generation of machines based on OS types
- **Intelligent Scheduling**: Priority-based scheduling with hardware-aware allocation
- **Timeline Visualization**: Multiple view modes (Day/Night/Week) with resource allocation display
- **Real-time Updates**: Live synchronization across all connected clients via Socket.IO

### Key Capabilities
- **Time Calculation**: Precise estimation based on test case counts (5 min/normal, 120 min/combo)
- **Hardware Requirements**: Automatic detection when both debugger AND platform are present
- **Conflict Resolution**: Detection and handling of resource conflicts
- **Queue Management**: Sessions waiting for resource availability
- **Export/Import**: CSV export capabilities for sessions and hardware inventory

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, CSS Grid, Responsive Design
- **Data Storage**: JSON files for configuration persistence
- **File Processing**: CSV parsing with validation
- **Real-time Communication**: Socket.IO for live updates

## Project Structure

```
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── sample.csv                # Sample CSV data
├── backend/
│   ├── routes/               # API route handlers
│   │   ├── csvRoutes.js      # CSV upload and processing
│   │   ├── hardwareRoutes.js # Hardware CRUD operations
│   │   ├── machineRoutes.js  # Machine management
│   │   └── scheduleRoutes.js # Scheduling operations
│   ├── services/             # Business logic services
│   │   ├── csvProcessor.js   # CSV parsing and validation
│   │   ├── dataService.js    # JSON file storage
│   │   ├── hardwareService.js # Hardware management logic
│   │   ├── machineService.js # Machine management logic
│   │   ├── schedulingService.js # Intelligent scheduling
│   │   └── socketService.js  # Real-time communication
│   └── utils/
│       └── timeCalculator.js # Time estimation utilities
├── public/
│   ├── index.html            # Main application page
│   ├── css/                  # Stylesheets
│   │   ├── styles.css        # Main styles
│   │   ├── tabs.css          # Tab navigation styles
│   │   └── timeline.css      # Timeline visualization styles
│   └── js/                   # Client-side JavaScript
│       ├── app.js            # Main application logic
│       ├── csvHandler.js     # CSV upload handling
│       ├── hardwareManager.js # Hardware management UI
│       ├── machineManager.js # Machine management UI
│       ├── timelineManager.js # Timeline visualization
│       └── socketHandler.js  # Real-time communication
├── data/                     # JSON data storage (auto-created)
└── uploads/                  # Temporary CSV uploads (auto-created)
```

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation Steps

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### 1. CSV Import
- Navigate to the "CSV Import" tab
- Upload a CSV file with the required format:
  ```
  Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status
  ```
- The application will automatically:
  - Parse and validate the CSV data
  - Extract hardware requirements (debuggers and platforms)
  - Calculate estimated time for each session
  - Skip sessions with "completed" status

### 2. Hardware Management
- Go to the "Management" tab
- View auto-populated hardware from CSV imports
- Add, edit, or delete hardware items manually
- Monitor real-time usage and availability

### 3. Machine Management
- Configure machine types (OS types) with quantities
- Machines are auto-generated based on machine types
- View machine utilization and status

### 4. Timeline Scheduling
- Switch to the "Timeline" tab
- Choose view mode: Day (6AM-6PM), Night (6PM-8AM), or Week
- Use "Auto Schedule" for intelligent session allocation
- View resource allocation and conflicts
- Monitor queued sessions waiting for resources

## CSV Format Specification

### Required Columns
- **Session**: Test session name
- **Platform**: Hardware platform (optional)
- **Debugger**: Debug hardware (optional)
- **OS**: Operating system type
- **Priority**: urgent, high, or normal
- **Num of normal test case**: Format "pass/fail/not_run" (e.g., "0/5/10")
- **Num of combo test case**: Format "pass/fail/not_run" (e.g., "0/1/1")
- **Status**: pending, completed, etc.

### Sample Data
See `sample.csv` for example data format.

## Time Calculation Formula

- **Normal test cases**: 5 minutes per case
- **Combo test cases**: 120 minutes (2 hours) per case
- **Only failed + not_run cases are counted**
- **Result**: Precise hours to 2 decimal places (no rounding up)

Example: 10 not_run normal + 1 not_run combo = 10×5 + 1×120 = 170 minutes = 2.83 hours

## Hardware Requirements Logic

Hardware is required ONLY when BOTH debugger AND platform are present in the CSV:
- ✅ Platform_A + S32_DBG = Hardware required
- ❌ Platform_A + (empty) = No hardware required
- ❌ (empty) + S32_DBG = No hardware required

## API Endpoints

### CSV Operations
- `POST /api/csv/upload` - Upload and process CSV file
- `GET /api/csv/sessions` - Get all sessions
- `DELETE /api/csv/sessions` - Clear all sessions

### Hardware Management
- `GET /api/hardware` - Get hardware inventory
- `POST /api/hardware` - Add hardware item
- `PUT /api/hardware/:id` - Update hardware item
- `DELETE /api/hardware/:id` - Delete hardware item

### Machine Management
- `GET /api/machines` - Get all machines
- `GET /api/machines/types` - Get machine types
- `POST /api/machines/types` - Add machine type
- `POST /api/machines/regenerate` - Regenerate all machines

### Scheduling
- `GET /api/schedule` - Get current schedule
- `POST /api/schedule/auto` - Auto-schedule sessions
- `DELETE /api/schedule` - Clear schedule

## Real-time Features

The application uses Socket.IO for real-time updates:
- Live session updates when CSV is processed
- Real-time hardware availability changes
- Schedule updates across all connected clients
- Progress notifications for long-running operations

## Troubleshooting

### Common Issues

1. **Node.js Installation Issues**:
   - Ensure Node.js v14+ is installed
   - Check for ICU library conflicts on macOS
   - Try using nvm to manage Node.js versions

2. **CSV Upload Failures**:
   - Verify CSV format matches specification
   - Check file size (10MB limit)
   - Ensure all required columns are present

3. **Scheduling Conflicts**:
   - Check hardware availability
   - Verify machine capacity
   - Review time slot allocation

## Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Project Architecture
- **MVC Pattern**: Separation of concerns with routes, services, and utilities
- **Real-time Communication**: Socket.IO for live updates
- **Modular Frontend**: Component-based JavaScript architecture
- **Responsive Design**: Mobile-friendly CSS Grid layouts

## Contributing

1. Follow the existing code structure
2. Add comprehensive error handling
3. Include validation for all inputs
4. Update documentation for new features
5. Test with sample CSV data

## License

MIT License - see LICENSE file for details.
