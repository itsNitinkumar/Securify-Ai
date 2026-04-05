import { Outlet, Link } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              MyApp
            </Link>
            <div className="flex gap-6">
              <Link to="/" className="text-foreground hover:text-primary transition">
                Home
              </Link>
              <Link to="/users" className="text-foreground hover:text-primary transition">
                Users
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
