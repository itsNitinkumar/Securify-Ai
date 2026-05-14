import s3Service from './s3.service';

/**
 * Image URL Service
 * Converts S3 keys to signed URLs for secure access
 * 
 * IMPORTANT: Database should store S3 keys, NOT signed URLs
 * This service generates fresh signed URLs on each request
 */
class ImageUrlService {
  /**
   * Check if a string is an S3 key (not a URL)
   */
  private isS3Key(path: string): boolean {
    // S3 keys start with findings/, temp/, or similar
    // They do NOT start with http:// or https://
    return !path.startsWith('http://') && !path.startsWith('https://');
  }

  /**
   * Check if a string is an expired or soon-to-expire signed URL
   */
  private isSignedUrl(path: string): boolean {
    return path.includes('X-Amz-Signature') || path.includes('X-Amz-Credential');
  }

  /**
   * Extract S3 key from signed URL
   * Example: https://bucket.s3.amazonaws.com/findings/1/2/steps/3/image.png?X-Amz-...
   * Returns: findings/1/2/steps/3/image.png
   */
  private extractKeyFromSignedUrl(signedUrl: string): string | null {
    try {
      const url = new URL(signedUrl);
      // Remove leading slash and query parameters
      return url.pathname.substring(1);
    } catch {
      return null;
    }
  }

  /**
   * Convert image path to accessible URL
   * - If it's an S3 key → generate fresh signed URL
   * - If it's an expired signed URL → extract key and regenerate
   * - If it's a local path → convert to full URL (legacy support)
   */
  async getAccessibleUrl(imagePath: string | undefined, baseUrl: string = 'http://localhost:3000'): Promise<string | null> {
    if (!imagePath) return null;

    // Case 1: It's an S3 key (preferred format)
    if (this.isS3Key(imagePath)) {
      try {
        return await s3Service.getSignedUrl(imagePath, 3600); // 1 hour
      } catch (error) {
        console.error(`Failed to generate signed URL for key: ${imagePath}`, error);
        return null;
      }
    }

    // Case 2: It's a signed URL (needs regeneration)
    if (this.isSignedUrl(imagePath)) {
      console.warn(`Found signed URL in database (should be S3 key): ${imagePath.substring(0, 100)}...`);
      const key = this.extractKeyFromSignedUrl(imagePath);
      if (key) {
        try {
          return await s3Service.getSignedUrl(key, 3600);
        } catch (error) {
          console.error(`Failed to regenerate signed URL for key: ${key}`, error);
          // Return original URL as fallback (might still work if not expired)
          return imagePath;
        }
      }
      // Can't extract key, return original (might still work)
      return imagePath;
    }

    // Case 3: Local path (legacy support)
    if (imagePath.startsWith('/images/')) {
      return `${baseUrl}${imagePath}`;
    }

    // Case 4: Already a valid external URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Unknown format
    console.warn(`Unknown image path format: ${imagePath}`);
    return imagePath;
  }

  /**
   * Process steps array and convert all imageKeys to accessible URLs
   */
  async processStepsImages(
    steps: Array<{ stepNumber: number; description: string; imageKey?: string; caption?: string }> | undefined,
    baseUrl: string = 'http://localhost:3000'
  ): Promise<Array<{ stepNumber: number; description: string; imageKey?: string; caption?: string }>> {
    if (!steps || !Array.isArray(steps)) return [];

    return Promise.all(
      steps.map(async (step) => {
        if (!step.imageKey) return step;

        const accessibleUrl = await this.getAccessibleUrl(step.imageKey, baseUrl);
        return {
          ...step,
          imageKey: accessibleUrl || step.imageKey, // Fallback to original if conversion fails
        };
      })
    );
  }
}

export default new ImageUrlService();
