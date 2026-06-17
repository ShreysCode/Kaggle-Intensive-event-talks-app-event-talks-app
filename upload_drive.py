#!/usr/bin/env python3
"""
Google Drive File Uploader

This script uploads a local file to Google Drive using the Google Drive API v3.
It uses Google Application Default Credentials (ADC) for authentication.

Prerequisites:
    pip install google-auth google-api-python-client

Usage:
    python3 upload_drive.py --file path/to/local/file.txt --name remote_name.txt --folder folder_id
"""

import argparse
import os
import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

def upload_file(local_path, remote_name=None, folder_id=None):
    """Uploads a file to Google Drive.

    Args:
        local_path (str): The path to the local file to upload.
        remote_name (str, optional): The name of the file on Google Drive. 
                                     Defaults to the local file's name.
        folder_id (str, optional): The ID of the parent folder to upload to.

    Returns:
        str: The ID of the uploaded file, or None if the upload failed.
    """
    if not os.path.exists(local_path):
        print(f"Error: Local file '{local_path}' does not exist.")
        return None

    # Default the remote filename to the local filename if not provided
    if not remote_name:
        remote_name = os.path.basename(local_path)

    # Load credentials using Application Default Credentials
    print("Loading Google authentication credentials...")
    try:
        creds, project = google.auth.default(
            scopes=['https://www.googleapis.com/auth/drive.file']
        )
    except Exception as e:
        print(f"Authentication setup error: {e}")
        print("Please ensure your Google Application Default Credentials (ADC) are configured.")
        print("Run: gcloud auth application-default login")
        return None

    try:
        # Build the Drive API service
        service = build('drive', 'v3', credentials=creds)

        # Configure file metadata
        file_metadata = {'name': remote_name}
        if folder_id:
            file_metadata['parents'] = [folder_id]

        # Setup the media upload
        # MediaFileUpload handles chunked uploading automatically for larger files
        media = MediaFileUpload(local_path, resumable=True)

        print(f"Uploading '{local_path}' to Google Drive as '{remote_name}'...")
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()

        file_id = file.get('id')
        print(f"Successfully uploaded! File ID: {file_id}")
        return file_id

    except HttpError as error:
        print(f"An API error occurred: {error}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during upload: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Upload a file to Google Drive using Drive API v3.")
    parser.add_argument(
        "-f", "--file", 
        required=True, 
        help="Path to the local file to upload."
    )
    parser.add_argument(
        "-n", "--name", 
        help="Optional name to rename the file in Google Drive."
    )
    parser.add_argument(
        "-d", "--folder", 
        help="Optional Google Drive Folder ID to upload into."
    )

    args = parser.parse_args()
    upload_file(args.file, args.name, args.folder)

if __name__ == '__main__':
    main()
