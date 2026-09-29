# Minku Birthday — Netflix Style

Private-media birthday site for Minku.

## Private media
The site expects Supabase anonymous sign-in to be enabled and a SELECT policy for `storage.objects` limited to bucket `minku-private-media`.

SQL:

```sql
create policy "Minku website can read private media"
on storage.objects
for select
to authenticated
using (bucket_id = 'minku-private-media');
```

The front end uses the Supabase publishable key only. Do not put a secret/service-role key in the browser.

## Media mapping
- Main Netflix profile: `Photo 2.JPG.jpeg`
- Background music: any private MP4/MOV whose filename contains `music`, `song`, `audio`, or `sound`
- Other images become memory cards
- Other MP4/MOV/WebM files become episode cards

## Deploy
Upload all files to a new GitHub repository and let the included GitHub Actions workflow deploy GitHub Pages.
