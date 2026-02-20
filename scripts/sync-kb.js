#!/usr/bin/env node
/**
 * Sync Knowledge Base to Retell AI
 * 
 * This script creates/updates knowledge base with text sources
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

// Read source files and convert to knowledge_base_texts format
function readSourceTexts() {
  const texts = [];
  
  for (const source of config.sources) {
    if (source.type === 'file') {
      const filePath = path.join(process.cwd(), source.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(source.path, path.extname(source.path));
        // Convert filename to title (e.g., "company-info" -> "Company Info")
        const title = filename
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        texts.push({
          title: title,
          text: content
        });
        console.log(`📄 Loaded: ${source.path} -> "${title}"`);
      } else {
        console.warn(`⚠️ File not found: ${source.path}`);
      }
    }
  }
  
  return texts;
}

// Create knowledge base with texts
function createKnowledgeBase(name, texts) {
  return new Promise((resolve, reject) => {
    // Build multipart form data
    const boundary = '----FormBoundary' + Date.now();
    const parts = [];
    
    // Add knowledge_base_name
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="knowledge_base_name"\r\n\r\n${name}\r\n`);
    
    // Add knowledge_base_texts as JSON
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="knowledge_base_texts"\r\n\r\n${JSON.stringify(texts)}\r\n`);
    
    // End boundary
    parts.push(`--${boundary}--\r\n`);
    
    const body = parts.join('');
    
    const options = {
      hostname: 'api.retellai.com',
      path: '/create-knowledge-base',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

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
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Update agent with knowledge base
function updateAgentKnowledgeBase(agentId, kbId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      knowledge_base_ids: [kbId]
    });
    
    const options = {
      hostname: 'api.retellai.com',
      path: `/update-agent/${agentId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

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
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Main sync function
async function syncKnowledgeBase() {
  try {
    // Read source texts
    const texts = readSourceTexts();
    
    if (texts.length === 0) {
      console.error('❌ No source files found');
      process.exit(1);
    }
    
    console.log(`📤 Creating knowledge base with ${texts.length} text sources...`);
    
    // Create knowledge base
    const kb = await createKnowledgeBase(config.knowledge_base.name, texts);
    console.log(`✅ Knowledge Base created: ${kb.knowledge_base_id}`);
    console.log(`   Status: ${kb.status}`);
    
    // Link to agent
    console.log('🔗 Linking KB to agent...');
    await updateAgentKnowledgeBase(AGENT_ID, kb.knowledge_base_id);
    console.log('✅ KB linked to agent');
    
    console.log('\n🎉 Knowledge Base sync complete!');
    console.log(`📊 KB ID: ${kb.knowledge_base_id}`);
    console.log(`🤖 Agent: ${AGENT_ID}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run sync
syncKnowledgeBase();
