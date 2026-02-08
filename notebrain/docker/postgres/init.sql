-- ============================================================
-- NoteBrain PostgreSQL Initialization Script
-- Runs automatically on first container start
-- ============================================================

-- Enable pgvector extension (vector similarity search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm (fuzzy text matching, useful for search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp (UUID generation functions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions
DO $$
BEGIN
  RAISE NOTICE 'Installed extensions:';
  RAISE NOTICE '  vector version: %', (SELECT extversion FROM pg_extension WHERE extname = 'vector');
  RAISE NOTICE '  pg_trgm version: %', (SELECT extversion FROM pg_extension WHERE extname = 'pg_trgm');
  RAISE NOTICE '  uuid-ossp version: %', (SELECT extversion FROM pg_extension WHERE extname = 'uuid-ossp');
  RAISE NOTICE 'NoteBrain database initialized successfully!';
END $$;
