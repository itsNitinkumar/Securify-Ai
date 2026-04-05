import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const HomePage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-foreground">Welcome to MyApp</h1>
      <Card className="p-6">
        <p className="text-muted-foreground mb-4">
          This is a production-ready full-stack application with:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Node.js + Express + PostgreSQL backend</li>
          <li>React + TypeScript + Tailwind CSS frontend</li>
          <li>Redux Toolkit for state management</li>
          <li>shadcn/ui components</li>
        </ul>
        <Button className="mt-6">Get Started</Button>
      </Card>
    </div>
  );
};

export default HomePage;
