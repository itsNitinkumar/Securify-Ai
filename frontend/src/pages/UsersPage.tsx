import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchUsers } from '../store/slices/userSlice';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

const UsersPage = () => {
  const dispatch = useAppDispatch();
  const { users, loading, error } = useAppSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Users</h1>
        <Button>Add User</Button>
      </div>
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <h3 className="font-semibold text-lg">{user.name}</h3>
            <p className="text-muted-foreground">{user.email}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UsersPage;
