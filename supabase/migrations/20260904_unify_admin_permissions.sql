-- Unify La Forêt Enchantée administration behind public.app_admins.
-- Public reads stay unchanged; writes and private admin reads require is_app_admin().

revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- Audios
drop policy if exists audios_write_auth on public.audios;
create policy audios_insert_admin on public.audios for insert to authenticated with check (public.is_app_admin());
create policy audios_update_admin on public.audios for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy audios_delete_admin on public.audios for delete to authenticated using (public.is_app_admin());

-- Categories
drop policy if exists categories_write_auth on public.categories;
create policy categories_insert_admin on public.categories for insert to authenticated with check (public.is_app_admin());
create policy categories_update_admin on public.categories for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy categories_delete_admin on public.categories for delete to authenticated using (public.is_app_admin());

-- Subcategories
drop policy if exists subcategories_write_auth on public.subcategories;
create policy subcategories_insert_admin on public.subcategories for insert to authenticated with check (public.is_app_admin());
create policy subcategories_update_admin on public.subcategories for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy subcategories_delete_admin on public.subcategories for delete to authenticated using (public.is_app_admin());

-- Blog categories
drop policy if exists blog_cats_write_auth on public.blog_categories;
create policy blog_cats_insert_admin on public.blog_categories for insert to authenticated with check (public.is_app_admin());
create policy blog_cats_update_admin on public.blog_categories for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy blog_cats_delete_admin on public.blog_categories for delete to authenticated using (public.is_app_admin());

-- Articles: published content remains public; admins can additionally read drafts.
drop policy if exists articles_all_auth on public.articles;
create policy articles_select_admin on public.articles for select to authenticated using (public.is_app_admin());
create policy articles_insert_admin on public.articles for insert to authenticated with check (public.is_app_admin());
create policy articles_update_admin on public.articles for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy articles_delete_admin on public.articles for delete to authenticated using (public.is_app_admin());

-- Storage: public SELECT policies remain unchanged.
drop policy if exists audios_write_auth on storage.objects;
drop policy if exists audios_update_auth on storage.objects;
drop policy if exists audios_delete_auth on storage.objects;
create policy audios_insert_admin on storage.objects for insert to authenticated with check (bucket_id='audios' and public.is_app_admin());
create policy audios_update_admin on storage.objects for update to authenticated using (bucket_id='audios' and public.is_app_admin()) with check (bucket_id='audios' and public.is_app_admin());
create policy audios_delete_admin on storage.objects for delete to authenticated using (bucket_id='audios' and public.is_app_admin());

drop policy if exists images_write_auth on storage.objects;
drop policy if exists images_update_auth on storage.objects;
drop policy if exists images_delete_auth on storage.objects;
create policy images_insert_admin on storage.objects for insert to authenticated with check (bucket_id='images' and public.is_app_admin());
create policy images_update_admin on storage.objects for update to authenticated using (bucket_id='images' and public.is_app_admin()) with check (bucket_id='images' and public.is_app_admin());
create policy images_delete_admin on storage.objects for delete to authenticated using (bucket_id='images' and public.is_app_admin());

drop policy if exists blog_images_write on storage.objects;
drop policy if exists blog_images_delete on storage.objects;
create policy blog_images_insert_admin on storage.objects for insert to authenticated with check (bucket_id='blog-images' and public.is_app_admin());
create policy blog_images_delete_admin on storage.objects for delete to authenticated using (bucket_id='blog-images' and public.is_app_admin());
