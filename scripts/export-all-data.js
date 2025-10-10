#!/usr/bin/env node

/**
 * Script to export all user data via the admin-export-all-data Edge Function
 * 
 * Usage:
 * 1. Set up your Supabase credentials in .env or environment variables
 * 2. Get your JWT token by signing in as an admin user
 * 3. Run: node scripts/export-all-data.js <your-jwt-token>
 * 
 * Example:
 * node scripts/export-all-data.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Error: JWT token is required');
  console.log('Usage: node scripts/export-all-data.js <your-jwt-token>');
  console.log('');
  console.log('To get your JWT token:');
  console.log('1. Sign in to your app as an admin user');
  console.log('2. Open browser dev tools → Application → Local Storage');
  console.log('3. Look for supabase.auth.token or similar key');
  console.log('4. Copy the JWT value');
  process.exit(1);
}

const jwtToken = args[0];

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing Supabase configuration');
  console.log('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

// Function to make HTTPS request
function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Main export function
async function exportAllData() {
  try {
    console.log('🚀 Starting data export...');
    
    const url = `${SUPABASE_URL}/functions/v1/admin-export-all-data`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    };
    
    console.log('📡 Calling admin export function...');
    const response = await makeRequest(url, options);
    
    if (response.status === 200) {
      console.log('✅ Export successful!');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `data-export-${timestamp}.json`;
      const filepath = path.join(process.cwd(), 'exports', filename);
      
      // Create exports directory if it doesn't exist
      const exportsDir = path.dirname(filepath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      
      // Write data to file
      fs.writeFileSync(filepath, JSON.stringify(response.data, null, 2));
      
      console.log(`📄 Data exported to: ${filepath}`);
      console.log(`📊 Export contains:`);
      console.log(`   - Users: ${response.data.users?.length || 0}`);
      console.log(`   - Courses: ${response.data.courses?.length || 0}`);
      console.log(`   - Assignments: ${response.data.assignments?.length || 0}`);
      console.log(`   - Lectures: ${response.data.lectures?.length || 0}`);
      console.log(`   - Study Sessions: ${response.data.studySessions?.length || 0}`);
      console.log(`   - Reminders: ${response.data.reminders?.length || 0}`);
      console.log(`   - Exported at: ${response.data.exportedAt}`);
      
    } else {
      console.error('❌ Export failed:');
      console.error(`Status: ${response.status}`);
      console.error('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error during export:', error.message);
  }
}

// Run the export
exportAllData();
