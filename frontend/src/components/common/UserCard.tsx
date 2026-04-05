import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { User } from '../../types';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (id: number) => void;
}

const UserCard = ({ user, onEdit, onDelete }: UserCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{user.email}</p>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)}>
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
