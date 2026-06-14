-- migrate:up

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'manager'
  AND p.slug = 'view_users'
ON CONFLICT DO NOTHING;

-- migrate:down

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.slug = 'manager'
  AND p.slug = 'view_users';
