import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

class GoogleDriveService {
  private drive: any;

  constructor() {
    // Initialize Google Drive API
    if (config.googleDrive.clientId && config.googleDrive.clientSecret) {
      const auth = new google.auth.OAuth2(
        config.googleDrive.clientId,
        config.googleDrive.clientSecret,
        config.googleDrive.redirectUri
      );

      // Set credentials if refresh token is available
      if (config.googleDrive.refreshToken) {
        auth.setCredentials({
          refresh_token: config.googleDrive.refreshToken,
        });
      }

      this.drive = google.drive({ version: 'v3', auth });
    }
  }

  // Upload file to Google Drive
  async uploadFile(filePath: string, fileName: string, mimeType: string): Promise<string | null> {
    if (!this.drive) {
      console.warn('Google Drive not configured');
      return null;
    }

    try {
      const fileMetadata = {
        name: fileName,
      };

      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      console.log('✅ File uploaded to Google Drive:', response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error('❌ Google Drive upload failed:', error.message);
      return null;
    }
  }

  // Share file with email
  async shareFile(fileId: string, email: string, role: string = 'reader'): Promise<boolean> {
    if (!this.drive) {
      console.warn('Google Drive not configured');
      return false;
    }

    try {
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          type: 'user',
          role: role, // reader, writer, commenter
          emailAddress: email,
        },
        sendNotificationEmail: true,
      });

      console.log(`✅ File shared with ${email}`);
      return true;
    } catch (error: any) {
      console.error('❌ Google Drive share failed:', error.message);
      return false;
    }
  }

  // Make file publicly accessible
  async makePublic(fileId: string): Promise<boolean> {
    if (!this.drive) {
      console.warn('Google Drive not configured');
      return false;
    }

    try {
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          type: 'anyone',
          role: 'reader',
        },
      });

      console.log('✅ File made public');
      return true;
    } catch (error: any) {
      console.error('❌ Google Drive make public failed:', error.message);
      return false;
    }
  }

  // Get file link
  async getFileLink(fileId: string): Promise<string | null> {
    if (!this.drive) {
      console.warn('Google Drive not configured');
      return null;
    }

    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'webViewLink',
      });

      return response.data.webViewLink;
    } catch (error: any) {
      console.error('❌ Google Drive get link failed:', error.message);
      return null;
    }
  }

  // Delete file
  async deleteFile(fileId: string): Promise<boolean> {
    if (!this.drive) {
      console.warn('Google Drive not configured');
      return false;
    }

    try {
      await this.drive.files.delete({
        fileId: fileId,
      });

      console.log('✅ File deleted from Google Drive');
      return true;
    } catch (error: any) {
      console.error('❌ Google Drive delete failed:', error.message);
      return false;
    }
  }

  // Check if configured
  isConfigured(): boolean {
    return !!this.drive;
  }
}

export default new GoogleDriveService();
