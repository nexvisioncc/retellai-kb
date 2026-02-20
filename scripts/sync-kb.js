#!/usr/bin/env node
/**
 * Sync Knowledge Base to Retell AI
 * 
 * This script:
 * 1. Reads config.yaml
 * 2. Creates/updates knowledge base in Retell
 * 3. Uploads source files
 * 4. Links KB to agent
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml');

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const AGENT_ID = process.env.AGENT_ID;

if (!RETELL_API_KEY) {
  console.error('❌ RETELL_API_KEY environment variable not set');
  process.exit(1);
}

if (!AGENT_ID) {
  console.error('❌ AGENT_ID environment variable not set');
  process.exit(1);
}

// Load configuration
const config = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
console.log('📋 Config loaded:', config.knowledge_base.name);

// API helper function
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'api.retellai.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${json.message || responseData}`));
          }
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Read source files
function readSourceFiles() {
  const sources = [];
  
  for (const source of config.sources) {
    if (source.type === 'file') {
      const filePath = path.join(process.cwd(), source.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        sources.push({
          type: 'text',
          name: path.basename(source.path, path.extname(source.path)),
          content: content
        });
        console.log(`📄 Loaded: ${source.path}`);
      } else {
        console.warn(`⚠️ File not found: ${source.path}`);
      }
    }
  }
  
  return sources;
}

// Create or update knowledge base
async function syncKnowledgeBase() {
  try {
    // Check if KB already exists
    console.log('🔍 Checking existing knowledge bases...');
    const kbs = await apiRequest('GET', '/list-knowledge-bases');
    
    let kbId = null;
    const existingKb = kbs.find(kb => kb.knowledge_base_name === config.knowledge_base.name);
    
    if (existingKb) {
      kbId = existingKb.knowledge_base_id;
      console.log(`✅ Found existing KB: ${kbId}`);
    } else {
      // Create new KB
      console.log('🆕 Creating new knowledge base...');
      const newKb = await apiRequest('POST', '/create-knowledge-base', {
        knowledge_base_name: config.knowledge_base.name,
        knowledge_base_description: config.knowledge_base.description
      });
      kbId = newKb.knowledge_base_id;
      console.log(`✅ Created KB: ${kbId}`);
    }

    // Read and add source files
    const sources = readSourceFiles();
    
    if (sources.length > 0) {
      console.log(`📤 Adding ${sources.length} sources to KB...`);
      
      for (const source of sources) {
        await apiRequest('POST', `/add-knowledge-base-sources/${kbId}`, {
          sources: [source]
        });
        console.log(`✅ Added: ${source.name}`);
      }
    }

    // Link KB to agent
    console.log('🔗 Linking KB to agent...');
    await apiRequest('PATCH', `/update-agent/${AGENT_ID}`, {
      knowledge_base_ids: [kbId]
    });
    console.log('✅ KB linked to agent');

    console.log('\n🎉 Knowledge Base sync complete!');
    console.log(`📊 KB ID: ${kbId}`);
    console.log(`🤖 Agent: ${AGENT_ID}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run sync
syncKnowledgeBase();
