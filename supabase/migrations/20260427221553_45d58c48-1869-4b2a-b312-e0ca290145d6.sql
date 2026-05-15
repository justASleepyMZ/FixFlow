-- Add face verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS face_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_image_url TEXT;

-- Create private bucket for face scans
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-scans', 'face-scans', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage only their own folder
CREATE POLICY "Users can view their own face scan"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own face scan"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'face-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own face scan"
ON storage.objects FOR UPDATE
USING (bucket_id = 'face-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own face scan"
ON storage.objects FOR DELETE
USING (bucket_id = 'face-scans' AND auth.uid()::text = (storage.foldername(name))[1]);