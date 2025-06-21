#!/usr/bin/env python3
"""
Simple HTTP server for ESP32 Temperature Dashboard
Serves the dashboard files with proper CORS headers for Firebase access
"""

import http.server
import socketserver
import os
import sys

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

def main():
    port = 8080
    
    # Change to dashboard directory
    dashboard_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(dashboard_dir)
    
    print(f"🌡️  ESP32 Temperature Dashboard Server")
    print(f"📁 Serving from: {dashboard_dir}")
    print(f"🌐 Server running at: http://localhost:{port}")
    print(f"📊 Dashboard URL: http://localhost:{port}/index.html")
    print("Press Ctrl+C to stop the server")
    
    try:
        with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        sys.exit(0)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ Port {port} is already in use. Try a different port.")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    main()
