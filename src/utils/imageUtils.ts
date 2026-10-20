/**
 * Converts Google Drive sharing links to direct image preview URLs.
 * Handles formats like:
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/uc?id=FILE_ID
 */
export function formatGoogleDriveImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return '';
  }

  const trimmed = url.trim();

  // If already a data URL or blob
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Extract ID from Google Drive URLs
  let fileId = '';
  const matchOpenId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchOpenId && matchOpenId[1]) {
    fileId = matchOpenId[1];
  } else {
    const matchFileD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFileD && matchFileD[1]) {
      fileId = matchFileD[1];
    }
  }

  if (fileId) {
    // googleusercontent thumbnail format works reliably without CORS/auth blockers
    return `https://lh3.googleusercontent.com/d/${fileId}=s500`;
  }

  return trimmed;
}

/**
 * Returns initials from a Thai or English name (e.g., "นางสาวธัญญรัศท์ สุภษร" -> "ธ.ส.")
 */
export function getInitials(name: string): string {
  if (!name) return 'ครู';
  // Strip common Thai titles
  const clean = name.replace(/^(นาย|นางสาว|นาง|สิบเอก|ดร\.|อาจารย์)/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
  }
  return clean.slice(0, 2) || 'ครู';
}
