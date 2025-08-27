#!/usr/bin/env node

/**
 * Download Face Recognition Models
 * Downloads pre-trained models for @vladmandic/face-api
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, 'models');
const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

// List of required model files (corrected names)
const modelFiles = [
  // SSD MobileNet v1 (face detection)
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
  
  // Face Landmark 68 Point Model
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  
  // Face Recognition Model
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
  
  // Face Expression Model
  'face_expression_model-weights_manifest.json',
  'face_expression_model.bin',
  
  // Age Gender Model
  'age_gender_model-weights_manifest.json',
  'age_gender_model.bin'
];

/**
 * Download a file from URL to local path
 */
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading: ${path.basename(filePath)}`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(filePath)}`);
        resolve();
      });
      
    }).on('error', (error) => {
      fs.unlink(filePath, () => {}); // Delete partial file
      reject(error);
    });
  });
}

/**
 * Main download function
 */
async function downloadModels() {
  console.log('🎯 Face Recognition Model Downloader');
  console.log('====================================\n');
  
  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log(`📁 Created models directory: ${modelsDir}\n`);
  } else {
    console.log(`📁 Using models directory: ${modelsDir}\n`);
  }
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  // Download each model file
  for (const fileName of modelFiles) {
    const filePath = path.join(modelsDir, fileName);
    const url = `${baseUrl}/${fileName}`;
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Skipped: ${fileName} (already exists)`);
      skipped++;
      continue;
    }
    
    try {
      await downloadFile(url, filePath);
      downloaded++;
      
      // Add small delay to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Failed to download ${fileName}:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Download Summary:');
  console.log(`✅ Downloaded: ${downloaded} files`);
  console.log(`⏭️  Skipped: ${skipped} files`);
  console.log(`❌ Failed: ${failed} files`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some downloads failed. You may need to retry or download manually.');
    process.exit(1);
  } else {
    console.log('\n🎉 All models downloaded successfully!');
    console.log('\n📋 Model files ready for face recognition:');
    console.log('   • Face Detection (SSD MobileNet v1)');
    console.log('   • 68-Point Facial Landmarks');
    console.log('   • Face Recognition Embeddings');
    console.log('   • Facial Expression Recognition');
    console.log('   • Age & Gender Estimation');
    
    console.log('\n🚀 You can now use the modern face recognition service!');
  }
}

// Check if running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  downloadModels().catch(console.error);
}

export { downloadModels };