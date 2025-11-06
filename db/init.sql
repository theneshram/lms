create table if not exists courses (
  id serial primary key,
  title varchar(255) not null,
  code varchar(50) unique not null,
  created_at timestamp not null default now()
);
insert into courses (title, code) values
('Intro to Programming','CS101'),
('Data Structures','CS201')
on conflict (code) do nothing;
