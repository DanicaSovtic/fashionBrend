-- Fajl: supabase/update_material_groups_names_simple.sql
-- Svrha: pojednostavljenje naziva grupa materijala u UI.
-- Ne dira smart ugovore niti sadržaj kataloga (material_catalog).

update material_groups
set name = 'Poliester'
where code = 'POLYESTER';

update material_groups
set name = 'Pamuk'
where code = 'COTTON';

update material_groups
set name = 'Viskoza'
where code = 'VISCOSE';

update material_groups
set name = 'Elastični materijali (likra)'
where code = 'ELASTANE';

update material_groups
set name = 'Saten'
where code = 'SATIN';

