# 🔧 Resource Scheduler - API Reference

## 📋 **Overview**

This document provides comprehensive API documentation for the Resource Scheduler application. All endpoints return JSON responses and follow RESTful conventions.

**Base URL**: `http://localhost:3000/api`

**Authentication**: Currently no authentication required (add as needed)

**Content-Type**: `application/json` for all POST/PUT requests

---

## 📊 **Session Management APIs**

### **Get All Sessions**
```http
GET /api/sessions
```

**Description**: Retrieve all sessions in the system

**Response**:
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session_123",
      "name": "Test Session 1",
      "platform": "Platform_A",
      "debugger": "S32_DBG",
      "os": "Ubuntu 20.04",
      "priority": "high",
      "status": "pending",
      "estimatedTime": 2.5,
      "requiresHardware": true,
      "normalTestCases": {
        "pass": 5,
        "fail": 3,
        "notRun": 2,
        "total": 10
      },
      "comboTestCases": {
        "pass": 1,
        "fail": 1,
        "notRun": 0,
        "total": 2
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "source": "csv"
    }
  ],
  "count": 1
}
```

### **Get Session by ID**
```http
GET /api/sessions/:id
```

**Parameters**:
- `id` (string): Session ID

**Response**: Single session object or 404 if not found

### **Create Session**
```http
POST /api/sessions
```

**Request Body**:
```json
{
  "name": "New Test Session",
  "platform": "Platform_A",
  "debugger": "S32_DBG",
  "os": "Ubuntu 20.04",
  "priority": "high",
  "estimatedTime": 3.0,
  "normalTestCases": {
    "pass": 0,
    "fail": 5,
    "notRun": 5,
    "total": 10
  },
  "comboTestCases": {
    "pass": 0,
    "fail": 1,
    "notRun": 1,
    "total": 2
  }
}
```

**Response**:
```json
{
  "success": true,
  "session": {
    "id": "session_456",
    "name": "New Test Session",
    // ... other session properties
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

### **Update Session**
```http
PUT /api/sessions/:id
```

**Request Body**: Partial session object with fields to update

**Response**: Updated session object

### **Delete Session**
```http
DELETE /api/sessions/:id
```

**Response**:
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

### **Get Sessions by Status**
```http
GET /api/sessions/status/:status
```

**Parameters**:
- `status` (string): pending, scheduled, completed

**Response**: Array of sessions with matching status

### **Get Sessions by Priority**
```http
GET /api/sessions/priority/:priority
```

**Parameters**:
- `priority` (string): urgent, high, normal, low

**Response**: Array of sessions with matching priority

---

## 🔧 **Hardware Management APIs**

### **Platforms**

#### **Get All Platforms**
```http
GET /api/hardware/platforms
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "platform_123",
      "name": "Platform_A",
      "type": "hardware",
      "quantityInStock": 5,
      "status": "active",
      "specifications": {
        "cpu": "ARM Cortex-A78",
        "memory": "8GB DDR4"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### **Create Platform**
```http
POST /api/hardware/platforms
```

**Request Body**:
```json
{
  "name": "New Platform",
  "type": "hardware",
  "quantityInStock": 3,
  "specifications": {
    "cpu": "Intel i7",
    "memory": "16GB DDR4"
  }
}
```

#### **Update Platform**
```http
PUT /api/hardware/platforms/:id
```

#### **Delete Platform**
```http
DELETE /api/hardware/platforms/:id
```

### **Debuggers**

#### **Get All Debuggers**
```http
GET /api/hardware/debuggers
```

#### **Create Debugger**
```http
POST /api/hardware/debuggers
```

**Request Body**:
```json
{
  "name": "New Debugger",
  "type": "hardware",
  "quantityInStock": 2,
  "supportedPlatforms": ["Platform_A", "Platform_B"]
}
```

#### **Update Debugger**
```http
PUT /api/hardware/debuggers/:id
```

#### **Delete Debugger**
```http
DELETE /api/hardware/debuggers/:id
```

### **Hardware Combinations**

#### **Get All Combinations**
```http
GET /api/hardware/combinations
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "combo_123",
      "name": "Platform_A + S32_DBG",
      "platformId": "platform_123",
      "debuggerId": "debugger_123",
      "enabled": true,
      "priority": "normal",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### **Create Combination**
```http
POST /api/hardware/combinations
```

**Request Body**:
```json
{
  "name": "Platform_B + J-Link",
  "platformId": "platform_456",
  "debuggerId": "debugger_789",
  "enabled": true,
  "priority": "high"
}
```

#### **Update Combination**
```http
PUT /api/hardware/combinations/:id
```

**Request Body**:
```json
{
  "enabled": false,
  "priority": "low"
}
```

#### **Delete Combination**
```http
DELETE /api/hardware/combinations/:id
```

### **Hardware Inventory**

#### **Get All Inventory**
```http
GET /api/hardware/inventory
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "inventory_123",
      "hardwareCombinationId": "combo_123",
      "totalQuantity": 10,
      "availableQuantity": 8,
      "allocatedQuantity": 2,
      "status": "active",
      "lastUpdated": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### **Update Inventory**
```http
PUT /api/hardware/inventory/:id
```

**Request Body**:
```json
{
  "totalQuantity": 12,
  "availableQuantity": 10
}
```

### **Hardware Availability**

#### **Get Availability Schedules**
```http
GET /api/hardware/availability
```

#### **Update Availability**
```http
PUT /api/hardware/availability/:id
```

**Request Body**:
```json
{
  "enabled": true,
  "startHour": 8,
  "endHour": 18
}
```

---

## 📅 **Scheduling APIs**

### **Auto-Schedule Sessions**
```http
POST /api/scheduling/auto
```

**Request Body**:
```json
{
  "type": "full",
  "startDateTime": "2024-01-01T09:00:00Z",
  "optimizationMode": "priority",
  "allowOvertime": false,
  "prioritizeHardware": true,
  "enableMultiDay": true,
  "sessionIds": ["session_123", "session_456"]
}
```

**Parameters**:
- `type`: "full" or "limited"
- `optimizationMode`: "priority", "time", "balanced"
- `allowOvertime`: boolean
- `prioritizeHardware`: boolean
- `enableMultiDay`: boolean
- `sessionIds`: array (for limited scheduling)

**Response**:
```json
{
  "success": true,
  "schedule": {
    "assignments": [
      {
        "id": "assignment_123",
        "sessionId": "session_123",
        "machineId": "machine_456",
        "hardwareCombinationId": "combo_789",
        "timeSlot": "2024-01-01-09",
        "duration": 2,
        "status": "scheduled"
      }
    ]
  },
  "statistics": {
    "totalSessions": 10,
    "scheduledSessions": 8,
    "unscheduledSessions": 2,
    "totalDays": 2,
    "utilizationRate": 0.75
  }
}
```

### **Manual Schedule Assignment**
```http
POST /api/scheduling/manual
```

**Request Body**:
```json
{
  "sessionId": "session_123",
  "machineId": "machine_456",
  "timeSlot": "2024-01-01-09",
  "duration": 2,
  "hardwareCombinationId": "combo_789"
}
```

### **Check Scheduling Conflicts**
```http
GET /api/scheduling/conflicts
```

**Query Parameters**:
- `date`: YYYY-MM-DD format
- `sessionId`: specific session ID
- `machineId`: specific machine ID

**Response**:
```json
{
  "success": true,
  "conflicts": [
    {
      "type": "hardware_conflict",
      "timeSlot": "2024-01-01-10",
      "conflictingSessions": ["session_123", "session_456"],
      "resource": "combo_789"
    }
  ]
}
```

### **Clear Schedule**
```http
DELETE /api/scheduling/clear
```

**Query Parameters**:
- `date`: Clear specific date (optional)
- `sessionId`: Clear specific session (optional)

---

## 📁 **CSV Management APIs**

### **Upload CSV File**
```http
POST /api/csv/upload
```

**Content-Type**: `multipart/form-data`

**Form Data**:
- `csvFile`: File upload

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalSessions": 25,
    "sessionsWithHardware": 20,
    "sessionsWithoutHardware": 5,
    "uniquePlatforms": 5,
    "uniqueDebuggers": 3,
    "priorityBreakdown": {
      "urgent": 2,
      "high": 8,
      "normal": 15
    }
  },
  "importId": "import_123",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Download CSV Template**
```http
GET /api/csv/template
```

**Response**: CSV file download with proper headers

### **Export Sessions as CSV**
```http
POST /api/csv/export
```

**Request Body**:
```json
{
  "type": "sessions",
  "filters": {
    "status": "pending",
    "priority": "high",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  },
  "includeFields": ["name", "platform", "debugger", "priority", "status"]
}
```

**Response**: CSV file download

### **Get Import History**
```http
GET /api/csv/history
```

**Response**:
```json
{
  "success": true,
  "imports": [
    {
      "id": "import_123",
      "filename": "sessions_2024.csv",
      "timestamp": "2024-01-01T12:00:00Z",
      "sessionsImported": 25,
      "status": "completed"
    }
  ]
}
```

---

## 🖥 **Machine Management APIs**

### **Get All Machines**
```http
GET /api/machines
```

### **Create Machine**
```http
POST /api/machines
```

**Request Body**:
```json
{
  "name": "Test Machine 3",
  "type": "physical",
  "os": "Ubuntu 22.04",
  "capabilities": ["testing", "debugging"],
  "specifications": {
    "cpu": "Intel i7-12700K",
    "memory": "32GB DDR4",
    "storage": "1TB NVMe"
  }
}
```

### **Update Machine**
```http
PUT /api/machines/:id
```

### **Delete Machine**
```http
DELETE /api/machines/:id
```

### **Get Available Machines**
```http
GET /api/machines/available
```

---

## ❌ **Error Responses**

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details",
    "value": "invalid value"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Common Error Codes**
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Scheduling or resource conflict
- `INSUFFICIENT_RESOURCES`: Not enough hardware available
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `INVALID_FORMAT`: CSV format validation failed
- `INTERNAL_ERROR`: Server error

### **HTTP Status Codes**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `409`: Conflict
- `422`: Unprocessable Entity
- `500`: Internal Server Error

---

## 🔍 **Query Parameters**

### **Pagination**
```http
GET /api/sessions?page=1&limit=20&sort=createdAt&order=desc
```

### **Filtering**
```http
GET /api/sessions?status=pending&priority=high&platform=Platform_A
```

### **Search**
```http
GET /api/sessions?search=test&fields=name,description
```

---

## 📊 **Response Formats**

### **Success Response**
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2024-01-01T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### **List Response**
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

**📚 For complete documentation, see [DOCUMENTATION.md](DOCUMENTATION.md)**
