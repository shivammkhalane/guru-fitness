-- Backfill member_code only where missing or not in valid reception range (101–999).
-- Does not add columns; member_code already exists on members.

do $$
declare
  gym record;
  next_code integer;
  member_row record;
  candidate text;
begin
  for gym in select id from gyms loop
    next_code := 101;

    for member_row in
      select id, member_code
      from members
      where gym_id = gym.id
        and (
          member_code is null
          or member_code !~ '^\d{3}$'
          or (member_code ~ '^\d+$' and member_code::integer < 101)
          or (member_code ~ '^\d+$' and member_code::integer > 999)
        )
      order by created_at asc
    loop
      loop
        candidate := lpad(next_code::text, 3, '0');
        exit when not exists (
          select 1 from members m
          where m.gym_id = gym.id and m.member_code = candidate
        );
        next_code := next_code + 1;
        if next_code > 999 then
          raise exception 'No member codes left for gym %', gym.id;
        end if;
      end loop;

      update members set member_code = candidate, updated_at = now() where id = member_row.id;
      next_code := next_code + 1;
    end loop;
  end loop;
end $$;
