-- Add certificate_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Create certificates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for certificates bucket
CREATE POLICY "Certificates are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

CREATE POLICY "Users can upload their own certificate"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own certificate"
ON storage.objects FOR UPDATE
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own certificate"
ON storage.objects FOR DELETE
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);