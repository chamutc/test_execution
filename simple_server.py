#!/usr/bin/env python3
"""
Simple HTTP server to serve the Jenkins Test Scheduler frontend
This is a fallback solution when Node.js is not available
"""

import http.server
import socketserver
import os
import webbrowser
from urllib.parse import urlparse

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="public", **kwargs)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        # Serve index.html for root path
        if self.path == '/':
            self.path = '/index.html'
        
        # Handle API calls (return mock data)
        if self.path.startswith('/api/'):
            self.handle_api_request()
            return
            
        # Handle socket.io requests
        if self.path.startswith('/socket.io/'):
            self.send_mock_socketio()
            return
            
        super().do_GET()
    
    def handle_api_request(self):
        """Handle API requests with mock data"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        # Mock API responses
        if '/api/csv/sessions' in self.path:
            mock_data = '{"success": true, "sessions": []}'
        elif '/api/hardware' in self.path:
            mock_data = '{"success": true, "hardware": {"debuggers": [], "platforms": []}}'
        elif '/api/machines' in self.path:
            mock_data = '{"success": true, "machines": []}'
        elif '/api/schedule' in self.path:
            mock_data = '{"success": true, "schedule": {"timeSlots": [], "assignments": []}}'
        else:
            mock_data = '{"success": false, "error": "Node.js backend not available"}'
        
        self.wfile.write(mock_data.encode())
    
    def send_mock_socketio(self):
        """Send mock socket.io response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/javascript')
        self.end_headers()
        
        # Mock socket.io client
        mock_socketio = '''
        window.io = function() {
            return {
                on: function(event, callback) {
                    console.log("Mock Socket.IO: Listening for", event);
                    if (event === 'connect') {
                        setTimeout(() => callback(), 100);
                    }
                },
                emit: function(event, data) {
                    console.log("Mock Socket.IO: Emitting", event, data);
                }
            };
        };
        '''
        self.wfile.write(mock_socketio.encode())

def start_server(port=3000):
    """Start the HTTP server"""
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"🚀 Jenkins Test Scheduler (Frontend Only)")
            print(f"📁 Serving files from: {os.path.abspath('public')}")
            print(f"🌐 Server running at: http://localhost:{port}")
            print(f"⚠️  Note: Backend functionality requires Node.js")
            print(f"📖 See README.md for full setup instructions")
            print(f"\n🔗 Opening browser...")
            
            # Try to open browser
            try:
                webbrowser.open(f'http://localhost:{port}')
            except:
                print("Could not open browser automatically")
            
            print(f"\n⏹️  Press Ctrl+C to stop the server")
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use")
            print(f"💡 Try a different port: python3 simple_server.py 3001")
        else:
            print(f"❌ Error starting server: {e}")
    except KeyboardInterrupt:
        print(f"\n👋 Server stopped")

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    start_server(port)
