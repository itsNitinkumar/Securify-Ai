import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Link to="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
