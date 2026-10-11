import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function getCloudinaryConfig(): CloudinaryConfig | null {
  // Check direct variables
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  // Check CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      const urlApiKey = parsed.username;
      const urlApiSecret = parsed.password;
      const urlCloudName = parsed.hostname;
      if (urlApiKey && urlApiSecret && urlCloudName) {
        return {
          cloudName: urlCloudName,
          apiKey: urlApiKey,
          apiSecret: urlApiSecret,
        };
      }
    } catch {
      // ignore parse error
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const config = getCloudinaryConfig();
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cloudinary credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables. You can also enter any public image URL directly.',
          configured: false,
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'No image file was provided in the upload request.' },
        { status: 400 }
      );
    }

    // Verify file type
    const mimeType = file.type || '';
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file must be a valid image (JPEG, PNG, WEBP, GIF).' },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'threads_pipeline';

    // Signature calculation: params sorted alphabetically + apiSecret
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    // Build Cloudinary upload request
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('api_key', config.apiKey);
    uploadData.append('timestamp', timestamp.toString());
    uploadData.append('folder', folder);
    uploadData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadData,
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || 'Failed to upload image to Cloudinary.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.secure_url || result.url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected image upload error.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
