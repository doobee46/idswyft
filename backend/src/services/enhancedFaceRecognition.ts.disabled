import sharp from 'sharp';
import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';
import fs from 'fs/promises';
import path from 'path';

interface FaceDetectionResult {
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  imageInfo: {
    width: number;
    height: number;
    channels: number;
  };
}

interface FaceComparisonResult {
  similarity: number;
  confidence: number;
  isMatch: boolean;
  analysis: {
    structuralSimilarity: number;
    histogramSimilarity: number;
    edgeSimilarity: number;
    textureSimilarity: number;
  };
}

export class EnhancedFaceRecognitionService {
  private storageService: StorageService;
  
  // Enhanced thresholds for better accuracy
  private readonly FACE_MATCH_THRESHOLD = 0.65; // More strict threshold
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.75;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.60;
  
  constructor() {
    this.storageService = new StorageService();
    console.log('🔧 Enhanced Face Recognition Service initialized');
  }

  /**
   * Compare faces in two images using multiple analysis methods
   */
  async compareFaces(imagePath1: string, imagePath2: string): Promise<number> {
    console.log('🔧 Starting enhanced face comparison...');
    console.log(`   📸 Image 1: ${path.basename(imagePath1)}`);
    console.log(`   📸 Image 2: ${path.basename(imagePath2)}`);

    try {
      // Download and process both images
      const [image1Data, image2Data] = await Promise.all([
        this.processImageForComparison(imagePath1),
        this.processImageForComparison(imagePath2)
      ]);

      if (!image1Data || !image2Data) {
        console.log('❌ Failed to process one or both images');
        return 0.0;
      }

      // Extract face regions from both images
      const [face1Region, face2Region] = await Promise.all([
        this.extractMainFaceRegion(image1Data),
        this.extractMainFaceRegion(image2Data)
      ]);

      if (!face1Region || !face2Region) {
        console.log('❌ Could not extract face regions from images');
        return 0.0;
      }

      // Perform detailed face comparison
      const comparisonResult = await this.performDetailedComparison(face1Region, face2Region);

      console.log(`🔧 Enhanced Face Comparison Results:`);
      console.log(`   📊 Structural Similarity: ${comparisonResult.analysis.structuralSimilarity.toFixed(3)}`);
      console.log(`   📈 Histogram Similarity: ${comparisonResult.analysis.histogramSimilarity.toFixed(3)}`);
      console.log(`   🔍 Edge Similarity: ${comparisonResult.analysis.edgeSimilarity.toFixed(3)}`);
      console.log(`   🎨 Texture Similarity: ${comparisonResult.analysis.textureSimilarity.toFixed(3)}`);
      console.log(`   📏 Overall Similarity: ${comparisonResult.similarity.toFixed(3)}`);
      console.log(`   🎯 Match: ${comparisonResult.isMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   🔒 Confidence: ${comparisonResult.confidence.toFixed(3)}`);

      logger.info('Enhanced face comparison completed', {
        imagePath1,
        imagePath2,
        similarity: comparisonResult.similarity,
        confidence: comparisonResult.confidence,
        isMatch: comparisonResult.isMatch,
        analysis: comparisonResult.analysis
      });

      return comparisonResult.similarity;

    } catch (error) {
      console.error('❌ Enhanced face comparison failed:', error);
      logger.error('Enhanced face comparison failed:', error);
      return 0.0;
    }
  }

  /**
   * Process image for face comparison
   */
  private async processImageForComparison(imagePath: string): Promise<sharp.Sharp | null> {
    try {
      const imageBuffer = await this.storageService.downloadFile(imagePath);
      
      // Process image with Sharp - normalize size and enhance
      const processedImage = sharp(imageBuffer)
        .resize(512, 512, { 
          fit: 'inside',
          withoutEnlargement: false 
        })
        .normalize() // Enhance contrast
        .sharpen() // Enhance edges
        .ensureAlpha(0); // Remove alpha channel if present

      console.log(`✅ Processed image: ${path.basename(imagePath)}`);
      return processedImage;

    } catch (error) {
      console.error(`❌ Error processing image ${imagePath}:`, error);
      return null;
    }
  }

  /**
   * Extract the main face region using simple detection
   */
  private async extractMainFaceRegion(image: sharp.Sharp): Promise<Buffer | null> {
    try {
      // Get image metadata
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        console.log('❌ Could not get image dimensions');
        return null;
      }

      // For now, assume face is in the center region (common for ID photos and selfies)
      // This is a simplified approach - in production you'd want proper face detection
      const centerX = Math.floor(metadata.width * 0.5);
      const centerY = Math.floor(metadata.height * 0.4); // Slightly higher than center for faces
      const faceSize = Math.min(metadata.width, metadata.height) * 0.7;
      
      const left = Math.max(0, centerX - faceSize / 2);
      const top = Math.max(0, centerY - faceSize / 2);
      const width = Math.min(faceSize, metadata.width - left);
      const height = Math.min(faceSize, metadata.height - top);

      // Extract face region and normalize
      const faceRegion = await image
        .extract({ 
          left: Math.floor(left), 
          top: Math.floor(top), 
          width: Math.floor(width), 
          height: Math.floor(height) 
        })
        .resize(256, 256, { fit: 'fill' }) // Normalize face size
        .raw()
        .toBuffer();

      console.log(`✅ Extracted face region: ${Math.floor(width)}x${Math.floor(height)} → 256x256`);
      return faceRegion;

    } catch (error) {
      console.error('❌ Error extracting face region:', error);
      return null;
    }
  }

  /**
   * Perform detailed comparison of two face regions
   */
  private async performDetailedComparison(face1: Buffer, face2: Buffer): Promise<FaceComparisonResult> {
    // Convert buffers to arrays for analysis
    const face1Array = new Uint8Array(face1);
    const face2Array = new Uint8Array(face2);

    if (face1Array.length !== face2Array.length) {
      throw new Error('Face regions must be the same size for comparison');
    }

    // 1. Structural Similarity (pixel-by-pixel comparison)
    const structuralSimilarity = this.calculateStructuralSimilarity(face1Array, face2Array);

    // 2. Histogram Similarity (color/brightness distribution)
    const histogramSimilarity = this.calculateHistogramSimilarity(face1Array, face2Array);

    // 3. Edge Similarity (facial features comparison)
    const edgeSimilarity = this.calculateEdgeSimilarity(face1Array, face2Array);

    // 4. Texture Similarity (skin texture patterns)
    const textureSimilarity = this.calculateTextureSimilarity(face1Array, face2Array);

    // Weighted combination of all similarity measures
    const weights = {
      structural: 0.30,
      histogram: 0.25,
      edge: 0.25,
      texture: 0.20
    };

    const overallSimilarity = 
      (structuralSimilarity * weights.structural) +
      (histogramSimilarity * weights.histogram) +
      (edgeSimilarity * weights.edge) +
      (textureSimilarity * weights.texture);

    // Determine confidence based on consistency across metrics
    const metrics = [structuralSimilarity, histogramSimilarity, edgeSimilarity, textureSimilarity];
    const avgMetric = metrics.reduce((a, b) => a + b) / metrics.length;
    const variance = metrics.reduce((acc, val) => acc + Math.pow(val - avgMetric, 2), 0) / metrics.length;
    const confidence = Math.max(0.3, Math.min(0.95, 1.0 - variance));

    const isMatch = overallSimilarity >= this.FACE_MATCH_THRESHOLD;

    return {
      similarity: Math.max(0, Math.min(1, overallSimilarity)),
      confidence,
      isMatch,
      analysis: {
        structuralSimilarity,
        histogramSimilarity,
        edgeSimilarity,
        textureSimilarity
      }
    };
  }

  /**
   * Calculate structural similarity between two images
   */
  private calculateStructuralSimilarity(image1: Uint8Array, image2: Uint8Array): number {
    let totalDiff = 0;
    let maxPossibleDiff = 0;

    for (let i = 0; i < image1.length; i += 3) {
      // Calculate difference for each RGB channel
      const r1 = image1[i], g1 = image1[i + 1], b1 = image1[i + 2];
      const r2 = image2[i], g2 = image2[i + 1], b2 = image2[i + 2];

      const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) + 
        Math.pow(g1 - g2, 2) + 
        Math.pow(b1 - b2, 2)
      );

      totalDiff += diff;
      maxPossibleDiff += Math.sqrt(255 * 255 * 3); // Max possible difference per pixel
    }

    return Math.max(0, 1 - (totalDiff / maxPossibleDiff));
  }

  /**
   * Calculate histogram similarity (brightness/color distribution)
   */
  private calculateHistogramSimilarity(image1: Uint8Array, image2: Uint8Array): number {
    const hist1 = new Array(256).fill(0);
    const hist2 = new Array(256).fill(0);

    // Build histograms for both images (grayscale)
    for (let i = 0; i < image1.length; i += 3) {
      const gray1 = Math.floor((image1[i] + image1[i + 1] + image1[i + 2]) / 3);
      const gray2 = Math.floor((image2[i] + image2[i + 1] + image2[i + 2]) / 3);
      
      hist1[gray1]++;
      hist2[gray2]++;
    }

    // Normalize histograms
    const totalPixels = image1.length / 3;
    for (let i = 0; i < 256; i++) {
      hist1[i] /= totalPixels;
      hist2[i] /= totalPixels;
    }

    // Calculate histogram intersection
    let intersection = 0;
    for (let i = 0; i < 256; i++) {
      intersection += Math.min(hist1[i], hist2[i]);
    }

    return intersection;
  }

  /**
   * Calculate edge similarity (facial features)
   */
  private calculateEdgeSimilarity(image1: Uint8Array, image2: Uint8Array): number {
    const edges1 = this.detectEdges(image1);
    const edges2 = this.detectEdges(image2);

    // Compare edge patterns
    let matchingEdges = 0;
    let totalEdges = 0;

    for (let i = 0; i < edges1.length; i++) {
      if (edges1[i] > 50 || edges2[i] > 50) { // Significant edges
        totalEdges++;
        if (Math.abs(edges1[i] - edges2[i]) < 30) {
          matchingEdges++;
        }
      }
    }

    return totalEdges > 0 ? matchingEdges / totalEdges : 0;
  }

  /**
   * Simple edge detection using gradient
   */
  private detectEdges(imageArray: Uint8Array): Uint8Array {
    const width = 256, height = 256;
    const edges = new Uint8Array(imageArray.length / 3);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 3;
        const edgeIdx = y * width + x;

        // Convert to grayscale
        const gray = Math.floor((imageArray[idx] + imageArray[idx + 1] + imageArray[idx + 2]) / 3);

        // Simple gradient calculation (Sobel-like)
        const gxIdx = ((y) * width + (x + 1)) * 3;
        const gyIdx = ((y + 1) * width + x) * 3;
        
        const grayX = Math.floor((imageArray[gxIdx] + imageArray[gxIdx + 1] + imageArray[gxIdx + 2]) / 3);
        const grayY = Math.floor((imageArray[gyIdx] + imageArray[gyIdx + 1] + imageArray[gyIdx + 2]) / 3);

        const gx = grayX - gray;
        const gy = grayY - gray;
        const magnitude = Math.sqrt(gx * gx + gy * gy);

        edges[edgeIdx] = Math.min(255, magnitude);
      }
    }

    return edges;
  }

  /**
   * Calculate texture similarity
   */
  private calculateTextureSimilarity(image1: Uint8Array, image2: Uint8Array): number {
    // Local binary pattern approximation
    const texture1 = this.extractTextureFeatures(image1);
    const texture2 = this.extractTextureFeatures(image2);

    let similarity = 0;
    for (let i = 0; i < texture1.length; i++) {
      similarity += 1 - Math.abs(texture1[i] - texture2[i]);
    }

    return similarity / texture1.length;
  }

  /**
   * Extract simple texture features
   */
  private extractTextureFeatures(imageArray: Uint8Array): number[] {
    const width = 256, height = 256;
    const features: number[] = [];

    // Calculate variance in local patches
    const patchSize = 8;
    for (let y = 0; y < height - patchSize; y += patchSize) {
      for (let x = 0; x < width - patchSize; x += patchSize) {
        let sum = 0;
        let count = 0;

        // Calculate mean in patch
        for (let py = 0; py < patchSize; py++) {
          for (let px = 0; px < patchSize; px++) {
            const idx = ((y + py) * width + (x + px)) * 3;
            const gray = (imageArray[idx] + imageArray[idx + 1] + imageArray[idx + 2]) / 3;
            sum += gray;
            count++;
          }
        }

        const mean = sum / count;

        // Calculate variance in patch
        let variance = 0;
        for (let py = 0; py < patchSize; py++) {
          for (let px = 0; px < patchSize; px++) {
            const idx = ((y + py) * width + (x + px)) * 3;
            const gray = (imageArray[idx] + imageArray[idx + 1] + imageArray[idx + 2]) / 3;
            variance += Math.pow(gray - mean, 2);
          }
        }

        features.push(variance / count / 255); // Normalized variance
      }
    }

    return features;
  }

  /**
   * Detect liveness using multiple image quality indicators
   */
  async detectLiveness(imagePath: string): Promise<number> {
    console.log('🔧 Starting enhanced liveness detection...');
    console.log(`   📸 Image: ${path.basename(imagePath)}`);

    try {
      const imageBuffer = await this.storageService.downloadFile(imagePath);
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        console.log('❌ Could not get image metadata');
        return 0.0;
      }

      // Extract image data for analysis
      const rawData = await image.raw().toBuffer();
      const pixels = new Uint8Array(rawData);

      let livenessScore = 0.0;
      let factorCount = 0;

      // Factor 1: Image resolution quality
      const resolutionScore = this.assessImageResolution(metadata.width, metadata.height);
      livenessScore += resolutionScore * 0.15;
      factorCount += 0.15;
      console.log(`   📏 Resolution Score: ${resolutionScore.toFixed(3)} (weight: 0.15)`);

      // Factor 2: Color depth and richness
      const colorScore = this.assessColorRichness(pixels);
      livenessScore += colorScore * 0.20;
      factorCount += 0.20;
      console.log(`   🎨 Color Richness Score: ${colorScore.toFixed(3)} (weight: 0.20)`);

      // Factor 3: Natural lighting variations
      const lightingScore = this.assessLightingNaturalness(pixels);
      livenessScore += lightingScore * 0.25;
      factorCount += 0.25;
      console.log(`   💡 Lighting Naturalness: ${lightingScore.toFixed(3)} (weight: 0.25)`);

      // Factor 4: Texture complexity
      const textureScore = this.assessTextureComplexity(pixels);
      livenessScore += textureScore * 0.20;
      factorCount += 0.20;
      console.log(`   🎭 Texture Complexity: ${textureScore.toFixed(3)} (weight: 0.20)`);

      // Factor 5: Edge sharpness (anti-screen detection)
      const sharpnessScore = this.assessEdgeSharpness(pixels);
      livenessScore += sharpnessScore * 0.20;
      factorCount += 0.20;
      console.log(`   🔪 Edge Sharpness: ${sharpnessScore.toFixed(3)} (weight: 0.20)`);

      // Normalize and finalize score
      const finalScore = factorCount > 0 ? livenessScore / factorCount : 0;
      const clampedScore = Math.max(0, Math.min(1, finalScore));

      console.log(`🔧 Enhanced Liveness Detection Results:`);
      console.log(`   📊 Total Weighted Score: ${livenessScore.toFixed(3)} / ${factorCount.toFixed(2)}`);
      console.log(`   🎯 Final Liveness Score: ${clampedScore.toFixed(3)}`);
      console.log(`   ✅ Assessment: ${clampedScore > 0.6 ? 'LIKELY LIVE' : 'SUSPICIOUS'}`);

      logger.info('Enhanced liveness detection completed', {
        imagePath,
        resolutionScore,
        colorScore,
        lightingScore,
        textureScore,
        sharpnessScore,
        finalScore: clampedScore
      });

      return clampedScore;

    } catch (error) {
      console.error('❌ Enhanced liveness detection failed:', error);
      logger.error('Enhanced liveness detection failed:', error);
      return 0.0;
    }
  }

  private assessImageResolution(width: number, height: number): number {
    const totalPixels = width * height;
    // Good quality selfies/photos typically have decent resolution
    const minGoodPixels = 300 * 300; // 90k pixels
    const excellentPixels = 800 * 800; // 640k pixels

    if (totalPixels < minGoodPixels) {
      return 0.2; // Very low quality
    } else if (totalPixels > excellentPixels) {
      return 0.9; // High quality
    } else {
      // Linear interpolation between min and excellent
      return 0.2 + (0.7 * (totalPixels - minGoodPixels) / (excellentPixels - minGoodPixels));
    }
  }

  private assessColorRichness(pixels: Uint8Array): number {
    const colorMap = new Map<string, number>();
    
    // Sample pixels and count unique colors
    for (let i = 0; i < pixels.length; i += 12) { // Sample every 4th pixel
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const colorKey = `${r},${g},${b}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    const uniqueColors = colorMap.size;
    const totalSamples = pixels.length / 12;
    
    // Rich natural images should have many colors
    const colorRichness = Math.min(1.0, uniqueColors / (totalSamples * 0.3));
    
    return colorRichness;
  }

  private assessLightingNaturalness(pixels: Uint8Array): number {
    // Calculate lighting variation across the image
    const regions = 16; // 4x4 grid
    const regionSize = Math.sqrt(pixels.length / 3 / regions);
    const regionBrightness: number[] = [];

    for (let region = 0; region < regions; region++) {
      let brightness = 0;
      let count = 0;

      // Sample pixels in this region
      for (let i = region * regionSize * 3; i < (region + 1) * regionSize * 3 && i < pixels.length; i += 3) {
        brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        count++;
      }

      if (count > 0) {
        regionBrightness.push(brightness / count);
      }
    }

    if (regionBrightness.length < 2) return 0.5;

    // Calculate standard deviation of brightness across regions
    const mean = regionBrightness.reduce((a, b) => a + b) / regionBrightness.length;
    const variance = regionBrightness.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / regionBrightness.length;
    const stdDev = Math.sqrt(variance);

    // Natural lighting should have some variation but not extreme
    const normalizedStdDev = stdDev / 255;
    
    if (normalizedStdDev < 0.05) {
      return 0.3; // Too uniform (printed image)
    } else if (normalizedStdDev > 0.3) {
      return 0.4; // Too varied (artificial)
    } else {
      return 0.8; // Good natural variation
    }
  }

  private assessTextureComplexity(pixels: Uint8Array): number {
    // Use a simplified Local Binary Pattern approach
    let complexityScore = 0;
    let sampleCount = 0;
    const step = 100; // Sample every 100 pixels for performance

    for (let i = step * 3; i < pixels.length - step * 3; i += step * 3) {
      const center = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      const neighbors = [
        (pixels[i - step * 3] + pixels[i - step * 3 + 1] + pixels[i - step * 3 + 2]) / 3,
        (pixels[i + step * 3] + pixels[i + step * 3 + 1] + pixels[i + step * 3 + 2]) / 3
      ];

      let pattern = 0;
      neighbors.forEach((neighbor, idx) => {
        if (neighbor > center) pattern += Math.pow(2, idx);
      });

      complexityScore += pattern > 0 ? 1 : 0;
      sampleCount++;
    }

    return sampleCount > 0 ? complexityScore / sampleCount : 0.5;
  }

  private assessEdgeSharpness(pixels: Uint8Array): number {
    const width = Math.sqrt(pixels.length / 3);
    let totalEdgeStrength = 0;
    let edgeCount = 0;

    for (let i = 0; i < pixels.length - 6; i += 3) {
      if (i % (width * 3) === 0) continue; // Skip row boundaries

      const current = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      const next = (pixels[i + 3] + pixels[i + 4] + pixels[i + 5]) / 3;
      
      const edgeStrength = Math.abs(current - next);
      if (edgeStrength > 10) { // Only count significant edges
        totalEdgeStrength += edgeStrength;
        edgeCount++;
      }
    }

    if (edgeCount === 0) return 0.3; // No edges detected

    const avgEdgeStrength = totalEdgeStrength / edgeCount;
    
    // Sharp natural images should have strong edges
    return Math.min(1.0, avgEdgeStrength / 100);
  }
}