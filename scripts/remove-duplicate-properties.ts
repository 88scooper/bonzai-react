/**
 * Script to identify and remove duplicate properties for cooper.stuartc@gmail.com
 * 
 * This script will:
 * 1. Find all properties for the user
 * 2. Identify duplicates by comparing normalized address and nickname
 * 3. Keep the most recent property (by created_at) for each duplicate group
 * 4. Delete the older duplicates
 * 
 * Run with: npx tsx scripts/remove-duplicate-properties.ts
 */

// Set API base URL for Node.js environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Simple API client for Node.js script
class ScriptApiClient {
  private token: string | null = null;

  async login(email: string, password: string): Promise<{ success: boolean; data?: { token: string }; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.success && data.data?.token) {
      this.token = data.data.token;
    }
    return data;
  }

  async getProperties(): Promise<{ success: boolean; data?: { data: any[] }; error?: string }> {
    return this.request('/properties?page=1&limit=1000');
  }

  async deleteProperty(propertyId: string): Promise<{ success: boolean; error?: string }> {
    return this.request(`/properties/${propertyId}`, {
      method: 'DELETE',
    });
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    return await response.json();
  }
}

// Normalize address for comparison (remove extra spaces, convert to lowercase)
function normalizeAddress(address: string | null): string {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-z0-9\s]/g, ''); // Remove punctuation
}

// Normalize nickname for comparison
function normalizeNickname(nickname: string | null): string {
  if (!nickname) return '';
  return nickname
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if two properties are duplicates
function areDuplicates(prop1: any, prop2: any): boolean {
  const addr1 = normalizeAddress(prop1.address);
  const addr2 = normalizeAddress(prop2.address);
  const nick1 = normalizeNickname(prop1.nickname);
  const nick2 = normalizeNickname(prop2.nickname);

  // Match if addresses are similar (allowing for minor differences)
  const addressMatch = addr1 && addr2 && (
    addr1 === addr2 ||
    addr1.includes(addr2.substring(0, Math.min(20, addr2.length))) ||
    addr2.includes(addr1.substring(0, Math.min(20, addr1.length)))
  );

  // Match if nicknames are similar
  const nicknameMatch = nick1 && nick2 && (
    nick1 === nick2 ||
    nick1.includes(nick2) ||
    nick2.includes(nick1)
  );

  // Consider duplicates if either address or nickname matches
  return addressMatch || nicknameMatch;
}

async function main() {
  console.log('🔍 Starting duplicate property detection...\n');

  // Login
  const email = 'cooper.stuartc@gmail.com';
  const password = process.env.USER_PASSWORD || 'testpass';
  
  console.log(`📝 Logging in as ${email}...`);
  const apiClient = new ScriptApiClient();
  const loginResponse = await apiClient.login(email, password);
  if (!loginResponse.success || !loginResponse.data?.token) {
    throw new Error(`Login failed: ${loginResponse.error || 'Unknown error'}`);
  }
  console.log('✅ Logged in successfully\n');

  // Get all properties
  console.log('📋 Fetching all properties...');
  const propertiesResponse = await apiClient.getProperties();
  if (!propertiesResponse.success || !propertiesResponse.data?.data) {
    throw new Error('Failed to fetch properties');
  }

  const properties = propertiesResponse.data.data;
  console.log(`Found ${properties.length} total properties\n`);

  // Group properties by duplicates
  const duplicateGroups: Array<Array<any>> = [];
  const processed = new Set<string>();

  for (let i = 0; i < properties.length; i++) {
    if (processed.has(properties[i].id)) continue;

    const group = [properties[i]];
    processed.add(properties[i].id);

    for (let j = i + 1; j < properties.length; j++) {
      if (processed.has(properties[j].id)) continue;

      if (areDuplicates(properties[i], properties[j])) {
        group.push(properties[j]);
        processed.add(properties[j].id);
      }
    }

    if (group.length > 1) {
      duplicateGroups.push(group);
    }
  }

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate properties found!\n');
    return;
  }

  console.log(`🔍 Found ${duplicateGroups.length} duplicate group(s):\n`);

  // Process each duplicate group
  let totalDeleted = 0;
  for (const group of duplicateGroups) {
    // Sort by created_at (most recent first)
    group.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Most recent first
    });

    const keep = group[0];
    const toDelete = group.slice(1);

    console.log(`📦 Group: ${keep.nickname || keep.address || 'Unnamed'}`);
    console.log(`   ✅ Keeping: ${keep.id} (created: ${keep.created_at})`);
    
    for (const prop of toDelete) {
      console.log(`   🗑️  Deleting: ${prop.id} (created: ${prop.created_at})`);
      console.log(`      Address: ${prop.address || 'N/A'}`);
      console.log(`      Nickname: ${prop.nickname || 'N/A'}`);
      
      try {
        const deleteResponse = await apiClient.deleteProperty(prop.id);
        if (deleteResponse.success) {
          totalDeleted++;
          console.log(`      ✅ Deleted successfully`);
        } else {
          console.log(`      ❌ Failed to delete: ${deleteResponse.error}`);
        }
      } catch (error: any) {
        console.log(`      ❌ Error deleting: ${error.message}`);
      }
    }
    console.log('');
  }

  console.log(`🎉 Duplicate removal complete!`);
  console.log(`   Total duplicates found: ${duplicateGroups.length} groups`);
  console.log(`   Total properties deleted: ${totalDeleted}`);
}

main().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  process.exit(1);
});
