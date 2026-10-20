-- PostgreSQL 16 : schéma minimal pour la tranche verticale UC06.
-- Contraintes métier critiques doublées par les vérifications transactionnelles.

CREATE TABLE campaigns (
  id uuid PRIMARY KEY,
  title text NOT NULL
);
CREATE TABLE teachers (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE students (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE teacher_capacities (
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  max_pfa integer NOT NULL CHECK (max_pfa >= 0),
  PRIMARY KEY (teacher_id, campaign_id)
);
CREATE TABLE pfa_groups (
  id uuid PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  name text NOT NULL
);
CREATE TABLE group_members (
  group_id uuid NOT NULL REFERENCES pfa_groups(id),
  student_id uuid NOT NULL REFERENCES students(id),
  confirmed_at timestamptz NULL,
  PRIMARY KEY (group_id, student_id)
);
CREATE TABLE subjects (
  id uuid PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  title text NOT NULL,
  is_available boolean NOT NULL DEFAULT true
);
CREATE TABLE applications (
  id uuid PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  group_id uuid NOT NULL REFERENCES pfa_groups(id),
  subject_id uuid NULL REFERENCES subjects(id),
  project_title text NOT NULL,
  status text NOT NULL DEFAULT 'EN_ATTENTE',
  CONSTRAINT ck_application_status CHECK
    (status IN ('EN_ATTENTE','PRESELECTIONNEE','FAVORABLE','REFUSEE','AFFECTEE'))
);
CREATE TABLE assignments (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL UNIQUE REFERENCES applications(id),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  group_id uuid NOT NULL REFERENCES pfa_groups(id),
  subject_id uuid NULL UNIQUE REFERENCES subjects(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE assignment_members (
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  PRIMARY KEY (assignment_id, student_id),
  CONSTRAINT uq_student_campaign_assignment UNIQUE (campaign_id, student_id)
);

CREATE INDEX idx_assignments_teacher_campaign ON assignments(teacher_id, campaign_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_applications_teacher_campaign ON applications(teacher_id, campaign_id);
