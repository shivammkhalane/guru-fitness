INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('member-photos', 'member-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Gym members can read member photos" ON storage.objects;
CREATE POLICY "Gym members can read member photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'member-photos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.gym_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Gym members can upload member photos" ON storage.objects;
CREATE POLICY "Gym members can upload member photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'member-photos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN public.members AS member ON member.gym_id = profile.gym_id
    WHERE profile.id = auth.uid()
      AND profile.gym_id::text = (storage.foldername(name))[1]
      AND member.id::text = (storage.foldername(name))[2]
  )
);

DROP POLICY IF EXISTS "Gym members can update member photos" ON storage.objects;
CREATE POLICY "Gym members can update member photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'member-photos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN public.members AS member ON member.gym_id = profile.gym_id
    WHERE profile.id = auth.uid()
      AND profile.gym_id::text = (storage.foldername(name))[1]
      AND member.id::text = (storage.foldername(name))[2]
  )
)
WITH CHECK (
  bucket_id = 'member-photos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN public.members AS member ON member.gym_id = profile.gym_id
    WHERE profile.id = auth.uid()
      AND profile.gym_id::text = (storage.foldername(name))[1]
      AND member.id::text = (storage.foldername(name))[2]
  )
);

DROP POLICY IF EXISTS "Gym members can delete member photos" ON storage.objects;
CREATE POLICY "Gym members can delete member photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'member-photos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN public.members AS member ON member.gym_id = profile.gym_id
    WHERE profile.id = auth.uid()
      AND profile.gym_id::text = (storage.foldername(name))[1]
      AND member.id::text = (storage.foldername(name))[2]
  )
);