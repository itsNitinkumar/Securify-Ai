-- Remove delete_findings permission from reporter role
-- Reporters should not be able to delete findings per RBAC spec

DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE slug = 'reporter')
  AND permission_id = (SELECT id FROM permissions WHERE slug = 'delete_findings');
