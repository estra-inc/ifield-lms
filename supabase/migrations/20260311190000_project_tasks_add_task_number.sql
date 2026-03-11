-- project_tasks に task_number カラムを追加
-- assignment 単位で連番を振り、削除されても欠番にならない（次の番号は MAX+1）

ALTER TABLE project_tasks ADD COLUMN task_number integer;

-- 既存タスクにも task_number を振る（assignment_id ごとに created_at 順で連番）
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY assignment_id ORDER BY created_at) AS rn
  FROM project_tasks
)
UPDATE project_tasks
SET task_number = numbered.rn
FROM numbered
WHERE project_tasks.id = numbered.id;

-- NOT NULL 制約を追加
ALTER TABLE project_tasks ALTER COLUMN task_number SET NOT NULL;

-- assignment_id + task_number のユニーク制約
ALTER TABLE project_tasks
  ADD CONSTRAINT project_tasks_assignment_task_number_unique
  UNIQUE (assignment_id, task_number);
