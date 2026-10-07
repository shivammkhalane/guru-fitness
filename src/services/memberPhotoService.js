import { isSupabaseReady, supabase } from './supabaseService'

export const MEMBER_PHOTO_BUCKET = 'member-photos'
export const MAX_MEMBER_PHOTO_BYTES = 10 * 1024 * 1024

const supportedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const compressMemberPhoto = async (file) => {
  if (!file || !supportedPhotoTypes.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WEBP profile photograph.')
  }
  if (file.size > MAX_MEMBER_PHOTO_BYTES) {
    throw new Error('Profile photographs must be 10 MB or smaller.')
  }

  const bitmap = await createImageBitmap(file)
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the profile photograph.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const compressedBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84))
  if (!compressedBlob) throw new Error('Could not compress the profile photograph.')
  return new File([compressedBlob], 'profile.jpg', { type: 'image/jpeg' })
}

export const uploadMemberPhoto = async (gymId, memberId, file) => {
  if (!isSupabaseReady || !supabase) throw new Error('Supabase Storage is not configured.')
  const compressedPhoto = await compressMemberPhoto(file)
  const objectPath = `${gymId}/${memberId}/profile.jpg`
  const { error } = await supabase.storage.from(MEMBER_PHOTO_BUCKET).upload(objectPath, compressedPhoto, {
    cacheControl: '3600',
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) throw error
  return objectPath
}

export const removeMemberPhoto = async (objectPath) => {
  if (!objectPath || !supabase) return
  const { error } = await supabase.storage.from(MEMBER_PHOTO_BUCKET).remove([objectPath])
  if (error) throw error
}

export const getMemberPhotoUrl = async (photoPath) => {
  if (!photoPath) return ''
  if (/^https?:\/\//i.test(photoPath)) return photoPath
  if (!isSupabaseReady || !supabase) throw new Error('Supabase Storage is not configured.')

  const { data, error } = await supabase.storage
    .from(MEMBER_PHOTO_BUCKET)
    .createSignedUrl(photoPath, 12 * 60 * 60)
  if (error) throw error
  return data.signedUrl
}