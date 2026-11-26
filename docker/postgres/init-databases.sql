-- Runs once on first container init (empty data volume).
-- App DB is created by POSTGRES_DB=bracket_dev; add the pytest DB here.
CREATE DATABASE bracket_test OWNER bracket_dev;
