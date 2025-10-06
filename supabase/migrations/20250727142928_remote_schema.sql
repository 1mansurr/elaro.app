create table "public"."reminders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "session_id" uuid,
    "reminder_date" timestamp with time zone not null,
    "day_number" integer not null,
    "completed" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."reminders" enable row level security;

-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

create table "public"."study_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "course" text not null,
    "topic" text not null,
    "scheduled_date" timestamp with time zone not null,
    "color_label" text default 'green'::text,
    "spaced_repetition_enabled" boolean default false,
    "completed" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."study_sessions" enable row level security;

create table "public"."tasks_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "title" text not null,
    "type" text not null,
    "due_date" timestamp with time zone not null,
    "color_label" text default 'blue'::text,
    "repeat_pattern" text,
    "repeat_end_date" timestamp with time zone,
    "completed" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."tasks_events" enable row level security;

create table "public"."user_devices" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "push_token" text not null,
    "platform" text,
    "updated_at" timestamp with time zone default now()
);


create table "public"."users" (
    "id" uuid not null,
    "email" text,
    "is_subscribed_to_oddity" boolean default false,
    "timezone" text default 'UTC'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."users" enable row level security;

CREATE INDEX idx_reminders_date ON public.reminders USING btree (reminder_date);

CREATE INDEX idx_reminders_user_id ON public.reminders USING btree (user_id);

-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

CREATE INDEX idx_study_sessions_date ON public.study_sessions USING btree (scheduled_date);

CREATE INDEX idx_study_sessions_user_id ON public.study_sessions USING btree (user_id);

CREATE INDEX idx_tasks_events_date ON public.tasks_events USING btree (due_date);

CREATE INDEX idx_tasks_events_user_id ON public.tasks_events USING btree (user_id);

CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id);

-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

CREATE UNIQUE INDEX study_sessions_pkey ON public.study_sessions USING btree (id);

CREATE UNIQUE INDEX tasks_events_pkey ON public.tasks_events USING btree (id);

CREATE UNIQUE INDEX user_devices_pkey ON public.user_devices USING btree (id);

CREATE UNIQUE INDEX user_devices_user_id_platform_key ON public.user_devices USING btree (user_id, platform);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."reminders" add constraint "reminders_pkey" PRIMARY KEY using index "reminders_pkey";

-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

alter table "public"."study_sessions" add constraint "study_sessions_pkey" PRIMARY KEY using index "study_sessions_pkey";

alter table "public"."tasks_events" add constraint "tasks_events_pkey" PRIMARY KEY using index "tasks_events_pkey";

alter table "public"."user_devices" add constraint "user_devices_pkey" PRIMARY KEY using index "user_devices_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."reminders" add constraint "reminders_session_id_fkey" FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."reminders" validate constraint "reminders_session_id_fkey";

alter table "public"."reminders" add constraint "reminders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."reminders" validate constraint "reminders_user_id_fkey";

-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

alter table "public"."study_sessions" add constraint "study_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."study_sessions" validate constraint "study_sessions_user_id_fkey";

alter table "public"."tasks_events" add constraint "tasks_events_type_check" CHECK ((type = ANY (ARRAY['assignment'::text, 'exam'::text, 'lecture'::text, 'program'::text, 'other'::text]))) not valid;

alter table "public"."tasks_events" validate constraint "tasks_events_type_check";

alter table "public"."tasks_events" add constraint "tasks_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."tasks_events" validate constraint "tasks_events_user_id_fkey";

alter table "public"."user_devices" add constraint "user_devices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_devices" validate constraint "user_devices_user_id_fkey";

alter table "public"."user_devices" add constraint "user_devices_user_id_platform_key" UNIQUE using index "user_devices_user_id_platform_key";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."users" validate constraint "users_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- First, insert into the public.users table as before
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  -- Next, insert a new 7-day trial subscription for the user
  INSERT INTO public.subscriptions (user_id, subscription_tier, subscription_status, subscription_expires_at)
  VALUES (NEW.id, 'oddity', 'trialing', NOW() + INTERVAL '7 days');
  
  RETURN NEW;
END;
$function$
;

-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

grant delete on table "public"."reminders" to "anon";

grant insert on table "public"."reminders" to "anon";

grant references on table "public"."reminders" to "anon";

grant select on table "public"."reminders" to "anon";

grant trigger on table "public"."reminders" to "anon";

grant truncate on table "public"."reminders" to "anon";

grant update on table "public"."reminders" to "anon";

grant delete on table "public"."reminders" to "authenticated";

grant insert on table "public"."reminders" to "authenticated";

grant references on table "public"."reminders" to "authenticated";

grant select on table "public"."reminders" to "authenticated";

grant trigger on table "public"."reminders" to "authenticated";

grant truncate on table "public"."reminders" to "authenticated";

grant update on table "public"."reminders" to "authenticated";

grant delete on table "public"."reminders" to "service_role";

grant insert on table "public"."reminders" to "service_role";

grant references on table "public"."reminders" to "service_role";

grant select on table "public"."reminders" to "service_role";

grant trigger on table "public"."reminders" to "service_role";

grant truncate on table "public"."reminders" to "service_role";

grant update on table "public"."reminders" to "service_role";

-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

grant delete on table "public"."study_sessions" to "anon";

grant insert on table "public"."study_sessions" to "anon";

grant references on table "public"."study_sessions" to "anon";

grant select on table "public"."study_sessions" to "anon";

grant trigger on table "public"."study_sessions" to "anon";

grant truncate on table "public"."study_sessions" to "anon";

grant update on table "public"."study_sessions" to "anon";

grant delete on table "public"."study_sessions" to "authenticated";

grant insert on table "public"."study_sessions" to "authenticated";

grant references on table "public"."study_sessions" to "authenticated";

grant select on table "public"."study_sessions" to "authenticated";

grant trigger on table "public"."study_sessions" to "authenticated";

grant truncate on table "public"."study_sessions" to "authenticated";

grant update on table "public"."study_sessions" to "authenticated";

grant delete on table "public"."study_sessions" to "service_role";

grant insert on table "public"."study_sessions" to "service_role";

grant references on table "public"."study_sessions" to "service_role";

grant select on table "public"."study_sessions" to "service_role";

grant trigger on table "public"."study_sessions" to "service_role";

grant truncate on table "public"."study_sessions" to "service_role";

grant update on table "public"."study_sessions" to "service_role";

grant delete on table "public"."tasks_events" to "anon";

grant insert on table "public"."tasks_events" to "anon";

grant references on table "public"."tasks_events" to "anon";

grant select on table "public"."tasks_events" to "anon";

grant trigger on table "public"."tasks_events" to "anon";

grant truncate on table "public"."tasks_events" to "anon";

grant update on table "public"."tasks_events" to "anon";

grant delete on table "public"."tasks_events" to "authenticated";

grant insert on table "public"."tasks_events" to "authenticated";

grant references on table "public"."tasks_events" to "authenticated";

grant select on table "public"."tasks_events" to "authenticated";

grant trigger on table "public"."tasks_events" to "authenticated";

grant truncate on table "public"."tasks_events" to "authenticated";

grant update on table "public"."tasks_events" to "authenticated";

grant delete on table "public"."tasks_events" to "service_role";

grant insert on table "public"."tasks_events" to "service_role";

grant references on table "public"."tasks_events" to "service_role";

grant select on table "public"."tasks_events" to "service_role";

grant trigger on table "public"."tasks_events" to "service_role";

grant truncate on table "public"."tasks_events" to "service_role";

grant update on table "public"."tasks_events" to "service_role";

grant delete on table "public"."user_devices" to "anon";

grant insert on table "public"."user_devices" to "anon";

grant references on table "public"."user_devices" to "anon";

grant select on table "public"."user_devices" to "anon";

grant trigger on table "public"."user_devices" to "anon";

grant truncate on table "public"."user_devices" to "anon";

grant update on table "public"."user_devices" to "anon";

grant delete on table "public"."user_devices" to "authenticated";

grant insert on table "public"."user_devices" to "authenticated";

grant references on table "public"."user_devices" to "authenticated";

grant select on table "public"."user_devices" to "authenticated";

grant trigger on table "public"."user_devices" to "authenticated";

grant truncate on table "public"."user_devices" to "authenticated";

grant update on table "public"."user_devices" to "authenticated";

grant delete on table "public"."user_devices" to "service_role";

grant insert on table "public"."user_devices" to "service_role";

grant references on table "public"."user_devices" to "service_role";

grant select on table "public"."user_devices" to "service_role";

grant trigger on table "public"."user_devices" to "service_role";

grant truncate on table "public"."user_devices" to "service_role";

grant update on table "public"."user_devices" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "Users can manage own reminders"
on "public"."reminders"
as permissive
for all
to public
using ((auth.uid() = user_id));


-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

create policy "Users can manage own sessions"
on "public"."study_sessions"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can manage own tasks"
on "public"."tasks_events"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can insert own profile"
on "public"."users"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can view own profile"
on "public"."users"
as permissive
for all
to public
using ((auth.uid() = id));



