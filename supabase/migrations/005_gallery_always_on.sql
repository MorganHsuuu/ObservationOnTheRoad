alter table events alter column gallery_public set default true;

update events
set gallery_public = true
where gallery_public is distinct from true;
