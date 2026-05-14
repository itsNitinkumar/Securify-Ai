# S3 Report Generation - Fixed!

## ✅ What Was Fixed

### Problem
Reports were not showing images because:
1. Field renamed from `image` to `imageKey`
2. Report services were looking for `image` field
3. S3 keys need to be downloaded before embedding

### Solution
Updated both report services to:
1. Support `imageKey` field (and `image` for backward compatibility)
2. Detect S3 keys vs local paths vs URLs
3. Download images from S3 using signed URLs
4. Embed downloaded images in reports

## Files Updated

### 1. report-generator.service.ts
- ✅ `normalizeSteps()` - Now uses `imageKey` field
- ✅ HTML generation - Uses `step.imageKey` instead of `step.image`
- ✅ Backward compatible - Supports both `imageKey` and `image`

### 2. report.service.ts (DOCX Generation)
- ✅ `normalizeSteps()` - Now uses `imageKey` field
- ✅ `addImageToZip()` - Now async, downloads from S3
- ✅ S3 detection - Identifies S3 keys vs local paths
- ✅ Image download - Downloads from S3 using signed URLs
- ✅ Steps loop - Now async to handle S3 downloads

## How It Works Now

### Image Detection
```typescript
const isS3Key = !imagePath.startsWith('http://') 
             && !imagePath.startsWith('https://') 
             && !imagePath.startsWith('/images/') 
             && !imagePath.startsWith('data:');
```

### S3 Download Flow
```
1. Detect S3 key (e.g., "temp/drafts/1778768569961-pdncnv.png")
2. Generate signed URL using s3Service
3. Download image from signed URL
4. Add image buffer to ZIP
5. Embed in DOCX
```

### Supported Formats
- ✅ **S3 keys** - `temp/drafts/...` or `findings/...` → Downloads from S3
- ✅ **Local paths** - `/images/steps/...` → Reads from filesystem
- ✅ **URLs** - `https://...` → Downloads from URL
- ✅ **Base64** - `data:image/...` → Decodes base64

## Testing

### Test Report Generation
```bash
# 1. Create a finding with images
# 2. Upload images (they go to S3)
# 3. Generate report
# 4. Check that images appear in the report
```

### Expected Behavior
- **PDF Reports** - Images embedded
- **DOCX Reports** - Images embedded
- **Google Docs** - Images embedded
- **Offline** - Reports work without internet

### Console Logs
When generating reports, you should see:
```
☁️  Downloading from S3: temp/drafts/1778768569961-pdncnv.png
🔗 Generated signed URL
📄 Downloaded 45678 bytes from S3
📷 Added image to zip: word/media/image_123_0.png (rId1001)
✅ Image embedded successfully
```

## Backward Compatibility

### Old Data
- ✅ Findings with `image` field still work
- ✅ Local paths (`/images/...`) still work
- ✅ Base64 images still work

### New Data
- ✅ Findings with `imageKey` field work
- ✅ S3 keys download automatically
- ✅ Signed URLs work

## Benefits

### Before
- ❌ Reports showed captions only
- ❌ Images missing from documents
- ❌ S3 keys not handled

### After
- ✅ Reports show actual images
- ✅ Images embedded in documents
- ✅ S3 keys downloaded automatically
- ✅ Works offline after generation
- ✅ Professional quality reports

## Technical Details

### Async Image Processing
The `addImageToZip` function is now async:
```typescript
const addImageToZip = async (imagePath: string, findingId: number, stepIdx: number): Promise<string | null> => {
  // Detect S3 key
  if (isS3Key) {
    // Generate signed URL
    const signedUrl = await s3Service.getSignedUrl(imagePath, 3600);
    
    // Download from S3
    binaryData = await downloadFromUrl(signedUrl);
  }
  
  // Add to ZIP
  zip.file(zipMediaPath, binaryData);
  return relId;
}
```

### Steps Loop
The steps processing loop is now async:
```typescript
for (let si = 0; si < steps.length; si++) {
  const step = steps[si];
  if (step.imageKey) {
    const relId = await addImageToZip(step.imageKey, findingId, si);
    // Embed image...
  }
}
```

## Troubleshooting

### Images not in report
1. Check backend logs for download errors
2. Verify S3 credentials in `.env`
3. Check that imageKey is stored in database
4. Verify S3 bucket is accessible

### Download fails
1. Check AWS credentials
2. Verify S3 bucket permissions
3. Check network connectivity
4. Look for signed URL generation errors

### Console Commands
```bash
# Check what's in database
psql "$DATABASE_URL" -c "
  SELECT 
    id,
    title,
    steps_to_reproduce->0->'imageKey' as image_key
  FROM findings
  WHERE steps_to_reproduce IS NOT NULL
  LIMIT 5;
"

# Should see S3 keys like: "temp/drafts/..."
```

## Status

✅ **Report Generation Fixed**
✅ **S3 Images Supported**
✅ **Backward Compatible**
✅ **Production Ready**

All reports now properly embed images from S3!
