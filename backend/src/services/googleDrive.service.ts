import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

class GoogleDriveService {
  private drive: any;
  private auth: any;

  constructor() {
    // Initialize Google Drive API
    // Requires GOOGLE_APPLICATION_CREDENTIALS environment variable
    // or service account key file
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      console.warn('Google Drive not configured:', error);
    }
  }

  // Upload file to Google Drive
  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    folderId?: string
  ): Promise<string | null> {
    if (!this.drive) {
      console.warn('Google Drive not configured');
      return null;
    }

    try {
      const fileMetadata: any = {
        name: fileName,
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      console.log('File uploaded to Google Drive:', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      return null;
    }
  }

  // Get file link
  async getFileLink(fileId: string): Promise<string | null> {
    if (!this.drive) {
      return null;
    }

    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'webViewLink',
      });

      return response.data.webViewLink;
    } catch (error) {
      console.error('Error getting file link:', error);
      return null;
    }
  }

  // Delete file from Google Drive
  async deleteFile(fileId: string): Promise<boolean> {
    if (!this.drive) {
      return false;
    }

    try {
      await this.drive.files.delete({
        fileId: fileId,
      });

      console.log('File deleted from Google Drive:', fileId);
      return true;
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      return false;
    }
  }

  // Create folder
  async createFolder(folderName: string, parentFolderId?: string): Promise<string | null> {
    if (!this.drive) {
      return null;
    }

    try {
      const fileMetadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating folder:', error);
      return null;
    }
  }

  // Share file (make public or share with specific email)
  async shareFile(fileId: string, email?: string): Promise<boolean> {
    if (!this.drive) {
      return false;
    }

    try {
      const permission: any = {
        type: email ? 'user' : 'anyone',
        role: 'reader',
      };

      if (email) {
        permission.emailAddress = email;
      }

      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: permission,
      });

      return true;
    } catch (error) {
      console.error('Error sharing file:', error);
      return false;
    }
  }
}

export default new GoogleDriveService();
