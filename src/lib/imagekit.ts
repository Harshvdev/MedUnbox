import ImageKit from 'imagekit'

/**
 * MedUnbox ImageKit integration (SERVER-SIDE ONLY)
 *
 * Original medical documents are uploaded to ImageKit with private access.
 * We never expose the private key to the browser. All uploads and signed URL
 * generation happen on the server.
 *
 * Docs: https://docs.imagekit.io/
 */

function getImageKit(): ImageKit {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error('ImageKit environment variables are not configured')
  }

  return new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  })
}

let ikInstance: ImageKit | null = null
function ik(): ImageKit {
  if (!ikInstance) ikInstance = getImageKit()
  return ikInstance
}

/**
 * Upload a file to ImageKit into the medunbox-documents folder (private).
 * Returns the fileId and a private URL. The URL is NOT publicly accessible.
 */
export async function uploadDocumentToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder: string,
  mimeType: string,
  opts: { uniqueFileName?: boolean } = {}
): Promise<{
  fileId: string
  url: string
  thumbnailUrl: string | null
  width?: number
  height?: number
  size: number
}> {
  const result = await ik().upload({
    file: fileBuffer,
    fileName,
    folder: `/medunbox-documents/${folder}`,
    isPrivateFile: true,
    useUniqueFileName: opts.uniqueFileName ?? true,
    overwriteFile: opts.uniqueFileName === false ? true : undefined,
    tags: ['medunbox', 'medical-record'],
    responseFields: ['isPrivateFile', 'tags', 'customCoordinates', 'height', 'width'],
  })

  return {
    fileId: result.fileId,
    url: result.url,
    thumbnailUrl: result.thumbnailUrl ?? null,
    width: result.width,
    height: result.height,
    size: result.size,
  }
}

/**
 * Generate a time-limited signed URL for a private document.
 * Doctors and patients access originals only through signed URLs.
 */
export function getSignedDocumentUrl(
  url: string,
  _path?: string,
  expireSeconds = 300
): string {
  // Use the original file URL (src) and sign it. Do NOT pass a custom path —
  // the path must match the actual file location in ImageKit.
  return ik().url({
    src: url,
    signed: true,
    expireSeconds,
  })
}

/**
 * Generate a signed URL by fileId (used when we only have the fileId).
 */
export function getSignedUrlByPath(
  filePath: string,
  expireSeconds = 300
): string {
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT!
  const fullUrl = `${urlEndpoint}${filePath}`
  return ik().url({
    src: fullUrl,
    signed: true,
    expireSeconds,
  })
}

/**
 * Delete a document from ImageKit (used when a patient removes a record).
 */
export async function deleteDocumentFromImageKit(fileId: string): Promise<void> {
  await ik().deleteFile(fileId)
}

/**
 * Generate an authentication token for client-side uploads (if needed).
 * This gives the browser a short-lived token scoped to ImageKit only.
 */
export function getUploadAuthParams(expireSeconds = 600) {
  const authParams = ik().getAuthenticationParameters()
  return {
    ...authParams,
    expire: expireSeconds,
  }
}
