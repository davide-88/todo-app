CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- updatedAt auto-update trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Text length safety net (validation happens at API layer, DB is last resort)
ALTER TABLE todos ADD CONSTRAINT todos_chk_text_length CHECK (length(text) <= 500);

-- Index for cursor pagination performance
CREATE INDEX idx_todos_created_at ON todos(created_at DESC);
